import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import type {Detection} from '../../core/domain/model';
import {analyzeYoloFrame,captureRenderedFrame,loadYoloBrowser} from './yolo-browser';
import type {YoloFrame,YoloFamily,YoloPipelineTimings} from './yolo-browser';
import {ppeColor,ppeFindings} from './ppe-model';
import {MIN_RAW_YOLO_CONFIDENCE,filterDetectionsForDisplay,classesInDetections} from './detection-filter';
import type {ScenarioKey} from './simulation-engine';
import {validYoloFrameSource} from './yolo-telemetry';
import type {YoloTelemetryEvent,YoloFrameSource} from './yolo-telemetry';
import {FrameAnalysisCycle,frameBoxPixels} from './frame-analysis-cycle';
import {evidencePngName,chromaticMaskPngName,saveEvidencePng} from './yolo-evidence';
import {segmentByContrast,chromaticMaskPixels,chromaticMaskBoundary} from './chromatic-segmentation';
import type {ChromaticMask} from './chromatic-segmentation';
import {captureWaitMs,shouldPauseCapture,AdaptiveCapturePacer} from './inference-scheduler';
import type {CapturePace} from './inference-scheduler';
import type {FrameAnalysisAttempt,FrameAnalysisOutcome} from './frame-analysis-cycle';
type Model=Awaited<ReturnType<typeof loadYoloBrowser>>;
type Phase='idle'|'loading'|'running'|'retrying'|'stopped'|'failed';
interface Props {
 readonly getSource:()=>HTMLCanvasElement|null;
 readonly getFrameSource:()=>YoloFrameSource;
 readonly scenarioName:string;
 readonly scenarioId:ScenarioKey;
 readonly paused:boolean;
 readonly onTelemetry:(event:YoloTelemetryEvent)=>void;
}
/** El usuario controla descargas e inferencias. Muestra el fotograma EXACTO asociado a cada resultado. */
function drawFrame(frame:YoloFrame,dest:HTMLCanvasElement,family:YoloFamily,
 mask:ChromaticMask|null=null,maskStyle:'overlay'|'silhouette'|'contour'='overlay'){
 dest.width=frame.width;dest.height=frame.height;
 const ctx=dest.getContext('2d');
 if(!ctx)throw Error('No se pudo dibujar el fotograma analizado.');
 if(mask&&maskStyle==='silhouette'){
  ctx.fillStyle='#0a1420';ctx.fillRect(0,0,frame.width,frame.height);
 }else ctx.drawImage(frame.source,0,0,frame.width,frame.height);
 if(mask){
  const boundary=maskStyle==='contour'?chromaticMaskBoundary(mask).binary:null;
  const overlay=document.createElement('canvas');
  overlay.width=frame.width;overlay.height=frame.height;
  const layer=overlay.getContext('2d');
  if(!layer)throw Error('No se pudo dibujar la máscara cromática.');
  const buffer=layer.createImageData(frame.width,frame.height);
  for(let i=0;i<mask.binary.length;i++)if((boundary??mask.binary)[i]===1){
   const j=i*4;
   buffer.data[j]=maskStyle==='silhouette'?138:maskStyle==='contour'?255:255;
   buffer.data[j+1]=maskStyle==='silhouette'?244:maskStyle==='contour'?232:169;
   buffer.data[j+2]=maskStyle==='silhouette'?207:maskStyle==='contour'?122:75;
   buffer.data[j+3]=maskStyle==='silhouette'||maskStyle==='contour'?255:95;
  }
  layer.putImageData(buffer,0,0);ctx.drawImage(overlay,0,0);
 }
 const thickness=Math.max(2,frame.width/450);
 for(const detection of frame.detections){
  const {x:px,y:py,width:pw,height:ph}=frameBoxPixels(
   detection.box,frame.width,frame.height);
  const color=family==='ppe'?ppeColor(detection.classId):detection.classId==='person'?'#5cf3c7':'#ffca78';
  ctx.strokeStyle=color;ctx.lineWidth=thickness;ctx.strokeRect(px,py,pw,ph);
  const text=detection.label+'  '+Math.round(detection.confidence*100)+'%';
  ctx.font='700 '+Math.max(11,Math.round(frame.width/65))+'px sans-serif';
  const tw=ctx.measureText(text).width+14,hh=Math.max(20,frame.width/42);
  const tx=Math.min(frame.width-tw,Math.max(0,px));
  const ty=py>hh?py-hh:py;
  ctx.fillStyle='#0a1e2de9';ctx.fillRect(tx,ty,tw,hh);
  ctx.fillStyle=color;ctx.fillRect(tx,ty,3,hh);
  ctx.fillStyle='#effff8';ctx.textBaseline='middle';ctx.fillText(text,tx+9,ty+hh/2);
 }
}
const delay=(ms:number)=>new Promise<void>(resolve=>setTimeout(resolve,ms));
const explainError=(_error:unknown)=>'No se pudo completar el reconocimiento. Comprueba la conexión y vuelve a intentarlo.';
export function YoloBrowserPanel({getSource,getFrameSource,scenarioName,scenarioId,paused,onTelemetry}:Props){
 const [phase,setPhase]=useState<Phase>('idle');
 const [message,setMessage]=useState('Presiona Iniciar reconocimiento para analizar la escena.');
 const [confidence,setConfidence]=useState(.35);
 const [capturePace,setCapturePace]=useState<CapturePace>('balanced');
 const adaptive=useRef(new AdaptiveCapturePacer());
 const [pipeline,setPipeline]=useState<YoloPipelineTimings|null>(null);
 const [autoInterval,setAutoInterval]=useState<number|null>(null);
 const [showChromaticMask,setShowChromaticMask]=useState(false);
 const [maskContrast,setMaskContrast]=useState(70);
 const [maskMinPixels,setMaskMinPixels]=useState(4);
 const [maskStyle,setMaskStyle]=useState<'overlay'|'silhouette'|'contour'>('overlay');
 const [maskStats,setMaskStats]=useState<ChromaticMask|null>(null);
 const boundaryStats=useMemo(()=>maskStats?chromaticMaskBoundary(maskStats):null,[maskStats]);
 const maskSource=useRef<HTMLCanvasElement|null>(null);
 const [maskError,setMaskError]=useState('');
 const [classFilter,setClassFilter]=useState('all');
 const [model,setModel]=useState<Model|null>(null);
 const [family,setFamily]=useState<YoloFamily>(scenarioId==='safety'?'ppe':'coco');
 const [detections,setDetections]=useState<readonly Detection[]>([]);
 const [sampleCount,setSampleCount]=useState(0);
 const [inferenceMs,setInferenceMs]=useState<number|null>(null);
 const [observedFps,setObservedFps]=useState<number|null>(null);
 const [lastFrameAt,setLastFrameAt]=useState<number|null>(null);
 const preview=useRef<HTMLCanvasElement>(null);
 const lastAnalyzed=useRef<YoloFrame|null>(null);
 const generation=useRef(0);
 const startLocked=useRef(false);
 const cycle=useRef(new FrameAnalysisCycle());
 const failedCanvas=useRef<HTMLCanvasElement|null>(null);
 const failedSource=useRef<YoloFrameSource|null>(null);
 const [lastRun,setLastRun]=useState<FrameAnalysisOutcome|null>(null);
 const lastCompletedRun=useRef<FrameAnalysisOutcome|null>(null);
 const times=useRef<number[]>([]);
 const [error,setError]=useState('');
 const [exportMessage,setExportMessage]=useState('');
 const lastEvidenceSource=useRef<YoloFrameSource|null>(null);
 const start=useCallback(async()=>{
  if(startLocked.current||phase==='loading'||phase==='running'||phase==='retrying')return;
  startLocked.current=true;
  const token=++generation.current;
  cycle.current.reset();failedCanvas.current=null;failedSource.current=null;setLastRun(null);lastCompletedRun.current=null;
  setPhase('loading');setError('');
  onTelemetry({type:'status',phase:'loading',model:family});
  setMessage('Preparando el reconocimiento…');
  times.current=[];adaptive.current.reset();setAutoInterval(null);setPipeline(null);
  setSampleCount(0);setObservedFps(null);
  lastAnalyzed.current=null;lastEvidenceSource.current=null;setExportMessage('');setMaskStats(null);setMaskError('');
  setDetections([]);setInferenceMs(null);setLastFrameAt(null);
  if(preview.current){const ctx=preview.current.getContext('2d');ctx?.clearRect(0,0,preview.current.width,preview.current.height);}
  try{
   const session=model?.family===family?model:await loadYoloBrowser(()=>{
    if(generation.current===token)setMessage('Preparando el reconocimiento…');
   },family);
   if(generation.current!==token)return;
   setModel(session);setMessage('Reconocimiento iniciado. Analizando la escena…');
   setPhase('running');
   onTelemetry({type:'status',phase:'running',model:family});
  }catch(e){
   if(generation.current!==token)return;
   startLocked.current=false;
   setPhase('failed');
   onTelemetry({type:'status',phase:'failed',model:family,error:explainError(e)});
   setError(explainError(e));
   setMessage('No se pudo iniciar el reconocimiento.');
  }
 },[phase,model,family,onTelemetry]);
 const stop=useCallback(()=>{
  generation.current++;startLocked.current=false;cycle.current.reset();failedCanvas.current=null;failedSource.current=null;
  setPhase('stopped');
  onTelemetry({type:'status',phase:'stopped',model:family});
  setMessage('Reconocimiento detenido.');
 },[onTelemetry,family]);
 function selectFamily(next:YoloFamily){
  if(next===family)return;
  generation.current++;startLocked.current=false;cycle.current.reset();failedCanvas.current=null;failedSource.current=null;setLastRun(null);lastCompletedRun.current=null;
  setPhase('idle');setModel(null);setFamily(next);
  onTelemetry({type:'status',phase:'idle',model:next});
  lastAnalyzed.current=null;lastEvidenceSource.current=null;setExportMessage('');setMaskStats(null);setMaskError('');
  setClassFilter('all');
  if(preview.current)preview.current.getContext('2d')?.clearRect(0,0,preview.current.width,preview.current.height);
  setError('');setDetections([]);setSampleCount(0);
  adaptive.current.reset();setAutoInterval(null);setPipeline(null);
  setObservedFps(null);setInferenceMs(null);setLastFrameAt(null);
  setMessage('Seleccionado '+(next==='ppe'?'Equipos de protección':'Objetos generales')+'. Presiona Iniciar reconocimiento.');
 }
 useEffect(()=>{
  if(phase!=='running'||!model)return;
  let cancelled=false;
  const token=generation.current;
  const loop=async()=>{
   while(!cancelled&&generation.current===token){
    if(shouldPauseCapture(paused,document.hidden)){await delay(450);continue;}
    const begin=performance.now();
    let job:FrameAnalysisAttempt|null=null;
    let frame:HTMLCanvasElement|null=null;
    let frameSource:YoloFrameSource|null=null;
    try{
     const source=getSource();
     if(!source||source.width<2||source.height<2){
      onTelemetry({type:'capture-skip',model:model.family});
      await delay(350);continue;
     }
     frame=captureRenderedFrame(source);
     frameSource=getFrameSource();
     if(frameSource.scenarioId!==scenarioId||!validYoloFrameSource(frameSource))
      throw Error('Estado de captura de la simulación inválido.');
     const captureAt=Date.now();
     job=cycle.current.begin(scenarioId,model.family,frame.width,frame.height,captureAt);
     if(!job){await delay(120);continue;}
     onTelemetry({type:'capture',model:model.family,capturedAtMs:captureAt});
     const result=await analyzeYoloFrame(model,frame,MIN_RAW_YOLO_CONFIDENCE);
     if(cancelled||generation.current!==token){cycle.current.discard(job);return;}
     const accepted=cycle.current.complete(job,result.detections,Date.now());
     if(!accepted)return;
     setLastRun(accepted);lastCompletedRun.current=accepted;failedCanvas.current=null;failedSource.current=null;
     lastAnalyzed.current=result;
     lastEvidenceSource.current=frameSource;
     setDetections(result.detections);
     setInferenceMs(result.inferenceMs);setPipeline(result.timings??null);
     const capturedAtMs=job.capturedAtMs;
     const completedAtMs=Date.now();
     setLastFrameAt(capturedAtMs);
     onTelemetry({type:'frame',observation:{frameNumber:job.frameId,
       capturedAtMs,completedAtMs,inferenceMs:result.inferenceMs,detections:result.detections,
       model:model.family,source:frameSource??undefined}});
     const now=performance.now();
     times.current=[...times.current.filter(t=>t>now-10_000),now].slice(-20);
     const stamps=times.current;
     setObservedFps(stamps.length>=2?
      1000*(stamps.length-1)/(stamps[stamps.length-1]-stamps[0]):null);
     setSampleCount(value=>value+1);
     setMessage(family==='ppe'?
      'Protección personal analizada. Revisa visualmente las observaciones.':
      'Imagen analizada. Este modo no evalúa equipos de protección.');
    }catch(e){
     if(cancelled||generation.current!==token){
      if(job)cycle.current.discard(job);
      return;
     }
     if(job){
      const failed=cycle.current.fail(job,e,Date.now());
      if(failed)setLastRun(failed);
      failedCanvas.current=frame;
      failedSource.current=frameSource;
     }
     startLocked.current=false;
     setPhase('failed');setError(explainError(e));
     onTelemetry({type:'status',phase:'failed',model:family,error:explainError(e)});
     setMessage('El motor no pudo interpretar el fotograma.');
     return;
    }
    const spent=performance.now()-begin;
    adaptive.current.observe(spent);
    if(!cancelled){
     if(capturePace==='auto')setAutoInterval(adaptive.current.intervalMs);
     await delay(captureWaitMs(capturePace,spent,adaptive.current.estimateMs));
    }
   }
  };
  void loop();
  return ()=>{cancelled=true;};
 },[phase,model,getSource,getFrameSource,paused,family,onTelemetry,scenarioId,capturePace]);
 useEffect(()=>{onTelemetry({type:'status',phase:'idle',model:family});
  return ()=>{generation.current++;startLocked.current=false;cycle.current.reset();failedCanvas.current=null;failedSource.current=null;};
  // One status reset per mounted detector instance; state changes send events explicitly.
 },[onTelemetry]);
 const visibleDetections=useMemo(()=>filterDetectionsForDisplay(detections,{
  minConfidence:confidence,classId:classFilter==='all'?null:classFilter
 }),[detections,confidence,classFilter]);
 const availableClasses=useMemo(()=>classesInDetections(detections),[detections]);
 useEffect(()=>{
  const frame=lastAnalyzed.current;
  if(!frame||!preview.current){maskSource.current=null;setMaskStats(null);return;}
  try{
   let mask:ChromaticMask|null=null;
   if(showChromaticMask){
    const ctx=frame.source.getContext('2d',{willReadFrequently:true});
    if(!ctx)throw Error('No se pudieron consultar los píxeles del fotograma.');
    const rgba=ctx.getImageData(0,0,frame.width,frame.height).data;
    mask=segmentByContrast(rgba,frame.width,frame.height,
     visibleDetections.map(d=>d.box),maskContrast,maskMinPixels);
   }
   drawFrame({...frame,detections:visibleDetections},preview.current,family,mask,maskStyle);
   maskSource.current=mask?frame.source:null;
   setMaskStats(mask);setMaskError('');
  }catch(e){maskSource.current=null;setMaskStats(null);setMaskError(explainError(e));}
 },[visibleDetections,family,showChromaticMask,maskContrast,maskMinPixels,maskStyle]);
 async function retryFailedFrame(){
  const previous=failedCanvas.current;
  const previousSource=failedSource.current;
  if(phase!=='failed'||!model||!previous||!previousSource)return;
  const job=cycle.current.retry(Date.now());
  if(!job)return;
  const token=generation.current;
  setPhase('retrying');setError('');
  onTelemetry({type:'status',phase:'retrying',model:family});
  setMessage('Reintentando el mismo fotograma de la simulación…');
  try{
   const result=await analyzeYoloFrame(model,previous,MIN_RAW_YOLO_CONFIDENCE);
   if(generation.current!==token){cycle.current.discard(job);return;}
   const accepted=cycle.current.complete(job,result.detections,Date.now());
   if(!accepted)return;
   setLastRun(accepted);lastCompletedRun.current=accepted;failedCanvas.current=null;failedSource.current=null;
   lastAnalyzed.current=result;
   lastEvidenceSource.current=previousSource;
   setDetections(result.detections);setInferenceMs(result.inferenceMs);
   setPipeline(result.timings??null);
   const capturedAtMs=job.capturedAtMs;
   const completedAtMs=Date.now();
   setLastFrameAt(capturedAtMs);
   onTelemetry({type:'status',phase:'running',model:family});
   onTelemetry({type:'frame',observation:{
    frameNumber:job.frameId,capturedAtMs,completedAtMs,
    inferenceMs:result.inferenceMs,detections:result.detections,model:family,
    source:previousSource
   }});
   onTelemetry({type:'status',phase:'stopped',model:family});
   setSampleCount(count=>count+1);
   setPhase('stopped');
   setMessage('Fotograma reintentado correctamente. Resultado disponible para guardar.');
  }catch(e){
   if(generation.current!==token){cycle.current.discard(job);return;}
   const failed=cycle.current.fail(job,e,Date.now());
   if(failed)setLastRun(failed);
   setPhase('failed');setError(explainError(e));
   onTelemetry({type:'status',phase:'failed',model:family,error:explainError(e)});
   setMessage('El reintento no pudo analizar el fotograma guardado en memoria.');
  }
 }
 async function exportMask(){
  const mask=maskStats,source=lastEvidenceSource.current,frame=lastAnalyzed.current,
   completed=lastCompletedRun.current;
  if(!mask||!source||!frame||!completed||maskSource.current!==frame.source){
   setExportMessage('Activa el resaltado de regiones después de analizar una imagen.');
   return;
  }
  try{
   const output=document.createElement('canvas');
   output.width=mask.width;output.height=mask.height;
   const ctx=output.getContext('2d');
   if(!ctx)throw Error('El navegador no pudo crear el PNG de máscara.');
   const image=ctx.createImageData(mask.width,mask.height);
   image.data.set(chromaticMaskPixels(mask));
   ctx.putImageData(image,0,0);
   await saveEvidencePng(output,chromaticMaskPngName(source,
    completed.run.frameId,completed.run.capturedAtMs));
   setExportMessage('Máscara cromática PNG exportada sobre fondo transparente.');
  }catch(e){setExportMessage('No se pudo exportar la máscara: '+explainError(e));}
 }
 async function exportEvidence(){
  const analyzed=lastAnalyzed.current;
  const metadata=lastEvidenceSource.current;
  const run=lastCompletedRun.current;
  if(!analyzed||!metadata||!run||run.phase!=='completed'){
   setExportMessage('Primero analiza una imagen para poder exportarla.');
   return;
  }
  try{
   // Reconstruir la evidencia desde las detecciones retenidas originales:
   // los controles de confianza y clase SOLO afectan la vista.
   const output=document.createElement('canvas');
   drawFrame(analyzed,output,run.run.model);
   await saveEvidencePng(output,evidencePngName(metadata,run.run.frameId,
    run.run.capturedAtMs));
   setExportMessage('Imagen con detecciones guardada.');
  }catch(e){setExportMessage('No fue posible exportar: '+explainError(e));}
 }
 const personCount=visibleDetections.filter(d=>d.classId==='person').length;
 const ppe=family==='ppe'?ppeFindings(detections):null;
 return <section className="browser-yolo-panel" aria-label="Reconocimiento de objetos en el escenario">
   <div className="browser-yolo-heading">
    <div><span className="eyebrow">RECONOCIMIENTO DE OBJETOS</span>
      <h3>{family==='ppe'?'Equipos de protección':'Objetos generales'}</h3>
      <p>Reconoce objetos visibles en la escena y muestra los resultados sobre la imagen.</p></div>
    <span className={'browser-yolo-phase '+(phase==='running'?'is-live':'')} role="status">
     {phase==='running'?'● RECONOCIENDO':phase==='loading'?'PREPARANDO':
      phase==='retrying'?'REINTENTANDO':
      phase==='failed'?'NO DISPONIBLE':'DETENIDO'}</span>
   </div>
   <div className="browser-yolo-selectors browser-yolo-simulation-only">
    <div className="browser-yolo-picker">
     <span>TIPO DE RECONOCIMIENTO</span>
     <div role="group" aria-label="Seleccionar tipo de reconocimiento">
      <button type="button" aria-pressed={family==='coco'} onClick={()=>selectFamily('coco')}>
       Objetos generales
      </button>
      {scenarioId==='safety'&&<button type="button" aria-pressed={family==='ppe'}
       onClick={()=>selectFamily('ppe')}>Equipos de protección</button>}
     </div>
    </div>
    <div className="browser-yolo-source-locked">
     <strong>ESCENA SELECCIONADA</strong>
     <span>Escenario 3D en ejecución</span>
     <small>El análisis utiliza la escena que estás viendo.</small>
    </div>
   </div>
   {family==='ppe'&&<p className="browser-yolo-modelnote">
    Identifica personas y equipos de protección visibles. Los resultados requieren revisión visual.
   </p>}
   <div className="browser-yolo-actions">
    {phase!=='running'&&phase!=='loading'&&phase!=='retrying'&&
      <button type="button" className="primary" onClick={()=>void start()}>
       {model?'▶ Reanudar reconocimiento':'◉ Iniciar reconocimiento'}
      </button>}
    {(phase==='running'||phase==='loading'||phase==='retrying')&&
      <button type="button" onClick={stop}>Ⅱ Detener reconocimiento</button>}
    {phase==='failed'&&model&&failedCanvas.current&&
      <button type="button" onClick={()=>void retryFailedFrame()}>
       Reintentar imagen
      </button>}
    {sampleCount>0&&lastAnalyzed.current&&lastEvidenceSource.current&&
      <button type="button" className="browser-yolo-export" onClick={()=>void exportEvidence()}>
       ▣ Descargar imagen con detecciones
      </button>}
    <label htmlFor="yolo-confidence">Confianza visual mínima
      <strong>{Math.round(confidence*100)} %</strong>
    </label>
    <input id="yolo-confidence" type="range" min="15" max="85" step="5"
     value={Math.round(confidence*100)}
     onChange={e=>setConfidence(Number(e.target.value)/100)}/>
    <label htmlFor="yolo-capture-pace">Velocidad de análisis</label>
    <select id="yolo-capture-pace" value={capturePace}
     onChange={e=>setCapturePace(e.target.value as CapturePace)}>
     <option value="balanced">Equilibrada (750 ms)</option>
     <option value="auto">Adaptativa (según duración real)</option>
     <option value="fast">Ágil (350 ms)</option>
     <option value="efficient">Ahorro (1500 ms)</option>
    </select>
    {capturePace==='auto'&&<small className="browser-yolo-adaptive" role="status">
     Pausa entre análisis: {autoInterval??750} ms.
    </small>}
    <label htmlFor="yolo-class-filter">Mostrar objetos</label>
    <select id="yolo-class-filter" value={classFilter} onChange={e=>setClassFilter(e.target.value)}>
     <option value="all">Todas las clases</option>
     {availableClasses.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}
     {classFilter!=='all'&&!availableClasses.some(item=>item.id===classFilter)&&
      <option value={classFilter}>{classFilter} (sin detecciones nuevas)</option>}
    </select>
   </div>
   <div className="browser-yolo-mask-options">
    <label htmlFor="yolo-chromatic-mask">
     <input id="yolo-chromatic-mask" type="checkbox" checked={showChromaticMask}
      onChange={e=>setShowChromaticMask(e.target.checked)}/>
     Superponer máscara cromática aproximada</label>
    {showChromaticMask&&<><label htmlFor="yolo-mask-contrast">Diferencia de color mínima: {maskContrast}</label>
     <input id="yolo-mask-contrast" type="range" min="20" max="160" step="10"
      value={maskContrast} onChange={e=>setMaskContrast(Number(e.target.value))}/>
     <label htmlFor="yolo-mask-cleanup">Quitar manchas menores que</label>
     <select id="yolo-mask-cleanup" value={maskMinPixels}
      onChange={e=>setMaskMinPixels(Number(e.target.value))}>
      <option value={1}>Sin limpieza</option>
      <option value={4}>4 píxeles</option>
      <option value={16}>16 píxeles</option>
      <option value={64}>64 píxeles</option>
     </select>
     <label htmlFor="yolo-mask-style">Visualización</label>
     <select id="yolo-mask-style" value={maskStyle}
      onChange={e=>setMaskStyle(e.target.value as 'overlay'|'silhouette'|'contour')}>
      <option value="overlay">Sobre imagen 3D</option>
      <option value="silhouette">Silueta sobre fondo oscuro</option>
      <option value="contour">Contornos sobre imagen 3D</option>
     </select></>}
    {showChromaticMask&&sampleCount>0&&maskStats&&<p className="browser-yolo-mask-summary" role="status">
     Área cromática resaltada: <b>{maskStats.coveragePercent.toFixed(1)} %</b> del fotograma
     {' · '}<b>{maskStats.selectedPixels.toLocaleString('es-PE')}</b> píxeles
     {' · '}{maskStats.regions.length} regiones examinadas
     {boundaryStats&&<> · Bordes: {boundaryStats.boundaryPixels.toLocaleString('es-PE')} píxeles de contorno
      {' · '}Perímetro estimado: {boundaryStats.perimeterEdges.toLocaleString('es-PE')} lados de píxel</>}
    </p>}
    {showChromaticMask&&maskStats&&lastEvidenceSource.current&&
     <button type="button" className="browser-yolo-mask-export" onClick={()=>void exportMask()}>
      ▣ Exportar máscara cromática PNG
     </button>}
    {showChromaticMask&&maskStats&&maskStats.regions.length>0&&
     <div className="browser-yolo-mask-regions" aria-label="Áreas cromáticas de las regiones detectadas">
      {maskStats.regions.slice(0,6).map(region=><div className="browser-yolo-mask-region"
       key={region.index}>
       <span>{visibleDetections[region.index]?.label??'Región '+(region.index+1)}</span>
       <div className="browser-yolo-mask-bar" aria-hidden="true"><span
        style={{width:Math.min(100,region.coveragePercent)+'%'}}/></div>
       <strong>{region.coveragePercent.toFixed(1)} %</strong>
      </div>)}
     </div>}
    {maskError&&<p className="browser-yolo-error" role="alert">{maskError}</p>}
    <small>El resaltado de regiones es aproximado y se basa en diferencias de color.</small>
   </div>
   <p className="browser-yolo-modelnote">Los filtros cambian lo que ves, sin alterar los resultados del análisis. Al ocultar la página, el reconocimiento se pausa.
   </p>
   <p className="browser-yolo-status" role="status">{message}</p>
   {exportMessage&&<p className="browser-yolo-export-status" role="status">{exportMessage}</p>}
   {lastRun&&<p className="browser-yolo-run" aria-label="Estado del último análisis"
    data-frame-id={lastRun.run.frameId} data-attempt={lastRun.run.attempt} data-origin="simulation-3d">
    {lastRun.phase==='completed'?'ANÁLISIS COMPLETADO':'ANÁLISIS FALLIDO'}
    {' · '}Imagen #{lastRun.run.frameId}
   </p>}
   {error&&<p className="browser-yolo-error" role="alert">{error}</p>}
   <div className="browser-yolo-result">
    <div className="browser-yolo-preview">
     <div className="browser-yolo-subhead"><strong>ÚLTIMO FOTOGRAMA ANALIZADO</strong>
       <span>Escena 3D</span></div>
     <div className="browser-yolo-preview-frame">
      <canvas ref={preview} width={960} height={550} role="img"
       aria-label={'Imagen de '+scenarioName+' con los objetos reconocidos'} />
      {sampleCount===0&&<p className="browser-yolo-placeholder">
       {phase==='loading'?'Preparando red neuronal…':
        'Inicia el reconocimiento para analizar la escena.'}
      </p>}
     </div>
     <p>Los objetos reconocidos aparecen resaltados sobre la imagen analizada.</p>
    </div>
    <div className="browser-yolo-summary">
     <span className="eyebrow">RESULTADOS DEL ANÁLISIS</span>
     <div className="browser-yolo-kpis">
      <div><span>Detecciones visibles</span><strong>{sampleCount?visibleDetections.length:'—'}</strong></div>
      <div><span>Personas</span><strong>{sampleCount?personCount:'—'}</strong></div>
      <div><span>Tiempo de análisis</span><strong>{inferenceMs===null?'—':Math.round(inferenceMs)+' ms'}</strong></div>
      <div><span>Análisis por segundo</span><strong>{observedFps===null?'—':observedFps.toFixed(1)}</strong></div>
     </div>
     {pipeline&&<details className="browser-yolo-profile"
       aria-label="Detalles del tiempo de análisis">
       <summary>Detalles de tiempo</summary>
       <h4>Duración del último análisis</h4>
       <div><span>Preparación</span><strong>{pipeline.preprocessMs.toFixed(1)} ms</strong></div>
       <div><span>Reconocimiento</span><strong>{pipeline.runMs.toFixed(1)} ms</strong></div>
       <div><span>Resultados</span><strong>{pipeline.postprocessMs.toFixed(1)} ms</strong></div>
       <div className="browser-yolo-profile-total"><span>Tiempo total</span>
        <strong>{pipeline.totalMs.toFixed(1)} ms</strong></div>
       <p>Valores medidos durante el análisis. No representan un porcentaje de acierto.</p>
      </details>}
     {ppe&&sampleCount>0&&<div className="browser-ppe-summary">
       <div><span>Protección observada</span><strong>{ppe.worn.length}</strong></div>
       <div><span>Señales para revisión</span>
        <strong className={ppe.requiresReview?'is-review':''}>{ppe.review.length}</strong></div>
       {ppe.review.length>0&&<p role="status">Se identificaron posibles faltas de protección:
        {ppe.review.map(e=>' '+e.label).join(', ')}. Confirmar visualmente antes de decidir.</p>}
       {ppe.review.length===0&&<p>No se emitieron señales explícitas de incumplimiento.
        Esto NO certifica que las personas lleven casco o chaleco.</p>}
      </div>}
     <p className="browser-yolo-count browser-yolo-count-evidence">Objetos encontrados: <b>{sampleCount?detections.length:'—'}</b> · Mostrados: <b>{sampleCount?visibleDetections.length:'—'}</b>.</p>
     <p className="browser-yolo-count browser-yolo-count-frames">Imágenes analizadas: <b>{sampleCount}</b>
      {lastFrameAt&&<> · último: <b>{new Date(lastFrameAt).toLocaleTimeString('es-PE')}</b></>}</p>
     {sampleCount>0&&detections.length>0&&visibleDetections.length===0&&
      <p className="browser-yolo-empty">Hay objetos reconocidos, pero ninguno cumple los filtros actuales.</p>}
     {sampleCount>0&&detections.length===0&&<p className="browser-yolo-empty">
      No se reconocieron objetos con la confianza seleccionada. Prueba otra vista o reduce el umbral.
     </p>}
     {visibleDetections.length>0&&<div className="browser-yolo-classes">
      {visibleDetections.slice(0,8).map(d=><div key={d.id}>
       <span>{d.label}</span><strong>{Math.round(d.confidence*100)} %</strong></div>)}
     </div>}
     <p className="browser-yolo-limit"><b>Limitaciones:</b>
      {family==='ppe'?
       ' El reconocimiento de protección no garantiza que se cumplan las medidas de seguridad. Revisa siempre las observaciones. La clase «sin mascarilla» no se usa para alertar.':
       ' Este tipo de reconocimiento no permite verificar protección personal ni defectos industriales.'}
       No se usa para sanciones ni para seguridad certificada.
     </p>
    </div>
   </div>
 </section>;
}
