import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import type {Detection} from '../../core/domain/model';
import {analyzeYoloFrame,captureRenderedFrame,loadYoloBrowser} from './yolo-browser';
import type {YoloFrame,YoloFamily} from './yolo-browser';
import {ppeColor,ppeFindings} from './ppe-model';
import {MIN_RAW_YOLO_CONFIDENCE,filterDetectionsForDisplay,classesInDetections} from './detection-filter';
import type {ScenarioKey} from './simulation-engine';
import {validYoloFrameSource} from './yolo-telemetry';
import type {YoloTelemetryEvent,YoloFrameSource} from './yolo-telemetry';
import {FrameAnalysisCycle,frameBoxPixels} from './frame-analysis-cycle';
import {evidencePngName,saveEvidencePng} from './yolo-evidence';
import {segmentByContrast} from './chromatic-segmentation';
import type {ChromaticMask} from './chromatic-segmentation';
import {captureWaitMs,shouldPauseCapture} from './inference-scheduler';
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
function drawFrame(frame:YoloFrame,dest:HTMLCanvasElement,family:YoloFamily,mask:ChromaticMask|null=null){
 dest.width=frame.width;dest.height=frame.height;
 const ctx=dest.getContext('2d');
 if(!ctx)throw Error('No se pudo dibujar el fotograma analizado.');
 ctx.drawImage(frame.source,0,0,frame.width,frame.height);
 if(mask){
  const overlay=document.createElement('canvas');
  overlay.width=frame.width;overlay.height=frame.height;
  const layer=overlay.getContext('2d');
  if(!layer)throw Error('No se pudo dibujar la máscara cromática.');
  const buffer=layer.createImageData(frame.width,frame.height);
  for(let i=0;i<mask.binary.length;i++)if(mask.binary[i]){
   const j=i*4;
   buffer.data[j]=255;buffer.data[j+1]=169;buffer.data[j+2]=75;buffer.data[j+3]=95;
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
const explainError=(error:unknown)=>{
 const info=error instanceof Error?error.message:String(error);
 return info.length>230?info.slice(0,230)+'…':info;
};
export function YoloBrowserPanel({getSource,getFrameSource,scenarioName,scenarioId,paused,onTelemetry}:Props){
 const [phase,setPhase]=useState<Phase>('idle');
 const [message,setMessage]=useState('El modelo solo se descarga cuando presionas Iniciar YOLO.');
 const [confidence,setConfidence]=useState(.35);
 const [capturePace,setCapturePace]=useState<CapturePace>('balanced');
 const [showChromaticMask,setShowChromaticMask]=useState(false);
 const [maskContrast,setMaskContrast]=useState(70);
 const [maskStats,setMaskStats]=useState<ChromaticMask|null>(null);
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
  setMessage('Preparando el motor de inferencia…');
  times.current=[];setSampleCount(0);setObservedFps(null);
  lastAnalyzed.current=null;lastEvidenceSource.current=null;setExportMessage('');setMaskStats(null);setMaskError('');
  setDetections([]);setInferenceMs(null);setLastFrameAt(null);
  if(preview.current){const ctx=preview.current.getContext('2d');ctx?.clearRect(0,0,preview.current.width,preview.current.height);}
  try{
   const session=model?.family===family?model:await loadYoloBrowser(text=>{
    if(generation.current===token)setMessage(text);
   },family);
   if(generation.current!==token)return;
   setModel(session);setMessage('Modelo '+(family==='ppe'?'EPP industrial':'COCO')+
    ' cargado. Analizando píxeles sin leer el estado del simulador…');
   setPhase('running');
   onTelemetry({type:'status',phase:'running',model:family});
  }catch(e){
   if(generation.current!==token)return;
   startLocked.current=false;
   setPhase('failed');
   onTelemetry({type:'status',phase:'failed',model:family,error:explainError(e)});
   setError(explainError(e));
   setMessage('No fue posible inicializar el modelo YOLO.');
  }
 },[phase,model,family,onTelemetry]);
 const stop=useCallback(()=>{
  generation.current++;startLocked.current=false;cycle.current.reset();failedCanvas.current=null;failedSource.current=null;
  setPhase('stopped');
  onTelemetry({type:'status',phase:'stopped',model:family});
  setMessage('Inferencia detenida. No se están procesando más fotogramas.');
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
  setObservedFps(null);setInferenceMs(null);setLastFrameAt(null);
  setMessage('Seleccionado '+(next==='ppe'?'YOLOv8s EPP (44,8 MB)':'YOLOv8n COCO (13 MB)')+
   '. Presiona Iniciar YOLO real para cargarlo.');
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
     setInferenceMs(result.inferenceMs);
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
      'YOLOv8s EPP examinó los píxeles de la imagen. Las alertas requieren revisión humana.':
      'YOLOv8n COCO analizó el último fotograma. No evalúa equipos de protección.');
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
    if(!cancelled)await delay(captureWaitMs(capturePace,spent));
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
  if(!frame||!preview.current){setMaskStats(null);return;}
  try{
   let mask:ChromaticMask|null=null;
   if(showChromaticMask){
    const ctx=frame.source.getContext('2d',{willReadFrequently:true});
    if(!ctx)throw Error('No se pudieron consultar los píxeles del fotograma.');
    const rgba=ctx.getImageData(0,0,frame.width,frame.height).data;
    mask=segmentByContrast(rgba,frame.width,frame.height,
     visibleDetections.map(d=>d.box),maskContrast);
   }
   drawFrame({...frame,detections:visibleDetections},preview.current,family,mask);
   setMaskStats(mask);setMaskError('');
  }catch(e){setMaskStats(null);setMaskError(explainError(e));}
 },[visibleDetections,family,showChromaticMask,maskContrast]);
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
 async function exportEvidence(){
  const analyzed=lastAnalyzed.current;
  const metadata=lastEvidenceSource.current;
  const run=lastCompletedRun.current;
  if(!analyzed||!metadata||!run||run.phase!=='completed'){
   setExportMessage('No hay un fotograma YOLO completo para exportar.');
   return;
  }
  try{
   // Reconstruir la evidencia desde las detecciones retenidas originales:
   // los controles de confianza y clase SOLO afectan la vista.
   const output=document.createElement('canvas');
   drawFrame(analyzed,output,run.run.model);
   await saveEvidencePng(output,evidencePngName(metadata,run.run.frameId,
    run.run.capturedAtMs));
   setExportMessage('Evidencia PNG generada con las predicciones originales de YOLO.');
  }catch(e){setExportMessage('No fue posible exportar: '+explainError(e));}
 }
 const personCount=visibleDetections.filter(d=>d.classId==='person').length;
 const ppe=family==='ppe'?ppeFindings(detections):null;
 return <section className="browser-yolo-panel" aria-label="YOLO real en el navegador">
   <div className="browser-yolo-heading">
    <div><span className="eyebrow">INFERENCIA REAL • ONNX / WASM</span>
      <h3>{family==='ppe'?'YOLOv8s — Equipos de protección':'YOLOv8n — Objetos generales'}</h3>
      <p>YOLO examina automáticamente fotogramas de la simulación 3D mientras está en marcha.
      Las cajas provienen del modelo, nunca de las posiciones programadas.</p></div>
    <span className={'browser-yolo-phase '+(phase==='running'?'is-live':'')} role="status">
     {phase==='running'?'● YOLO EJECUTÁNDOSE':phase==='loading'?'CARGANDO MODELO':
      phase==='retrying'?'REINTENTANDO FOTOGRAMA':
      phase==='failed'?'ERROR DE MODELO':'YOLO DETENIDO'}</span>
   </div>
   <div className="browser-yolo-selectors browser-yolo-simulation-only">
    <div className="browser-yolo-picker">
     <span>DETECTOR YOLO</span>
     <div role="group" aria-label="Seleccionar modelo YOLO para la simulación">
      <button type="button" aria-pressed={family==='coco'} onClick={()=>selectFamily('coco')}>
       General · 80 clases
      </button>
      {scenarioId==='safety'&&<button type="button" aria-pressed={family==='ppe'}
       onClick={()=>selectFamily('ppe')}>EPP industrial · 14 clases</button>}
     </div>
    </div>
    <div className="browser-yolo-source-locked">
     <strong>FUENTE EXCLUSIVA</strong>
     <span>Escenario 3D en ejecución</span>
     <small>Los fotogramas se capturan automáticamente. No se cargan archivos.</small>
    </div>
   </div>
   {family==='ppe'&&<p className="browser-yolo-modelnote">
    Modelo industrial especializado: descarga bajo demanda de 44,8 MB, licencia AGPL-3.0.
    Detecta cascos, chalecos, personas y algunas ausencias de EPP.
    No es un sistema certificado ni puede confirmar cumplimiento a partir de detecciones vacías.
   </p>}
   <div className="browser-yolo-actions">
    {phase!=='running'&&phase!=='loading'&&phase!=='retrying'&&
      <button type="button" className="primary" onClick={()=>void start()}>
       {model?'▶ Reanudar YOLO real':'◉ Iniciar YOLO real'}
      </button>}
    {(phase==='running'||phase==='loading'||phase==='retrying')&&
      <button type="button" onClick={stop}>Ⅱ Detener inferencia</button>}
    {phase==='failed'&&model&&failedCanvas.current&&
      <button type="button" onClick={()=>void retryFailedFrame()}>
       Reintentar último fotograma
      </button>}
    {sampleCount>0&&lastAnalyzed.current&&lastEvidenceSource.current&&
      <button type="button" className="browser-yolo-export" onClick={()=>void exportEvidence()}>
       ▣ Exportar evidencia YOLO (PNG)
      </button>}
    <label htmlFor="yolo-confidence">Confianza visual mínima
      <strong>{Math.round(confidence*100)} %</strong>
    </label>
    <input id="yolo-confidence" type="range" min="15" max="85" step="5"
     value={Math.round(confidence*100)}
     onChange={e=>setConfidence(Number(e.target.value)/100)}/>
    <label htmlFor="yolo-capture-pace">Cadencia de captura</label>
    <select id="yolo-capture-pace" value={capturePace}
     onChange={e=>setCapturePace(e.target.value as CapturePace)}>
     <option value="balanced">Equilibrada (750 ms)</option>
     <option value="fast">Ágil (350 ms)</option>
     <option value="efficient">Ahorro (1500 ms)</option>
    </select>
    <label htmlFor="yolo-class-filter">Clase visible</label>
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
      value={maskContrast} onChange={e=>setMaskContrast(Number(e.target.value))}/></>}
    {showChromaticMask&&sampleCount>0&&maskStats&&<p className="browser-yolo-mask-summary" role="status">
     Área cromática resaltada: <b>{maskStats.coveragePercent.toFixed(1)} %</b> del fotograma
     {' · '}<b>{maskStats.selectedPixels.toLocaleString('es-PE')}</b> píxeles
     {' · '}{maskStats.regions.length} regiones YOLO evaluadas
    </p>}
    {maskError&&<p className="browser-yolo-error" role="alert">{maskError}</p>}
    <small>La máscara se calcula por contraste RGB dentro de las cajas YOLO. Es una aproximación visual, no segmentación semántica ni una máscara del modelo YOLO.</small>
   </div>
   <p className="browser-yolo-modelnote">La cadencia es el intervalo mínimo objetivo entre capturas; el tiempo real depende del equipo. Al ocultar la pestaña se suspenden nuevas capturas.
    Los filtros cambian solo las cajas visibles.
    Las inferencias originales, desde {Math.round(MIN_RAW_YOLO_CONFIDENCE*100)} % de confianza, se conservan para el monitor y la sesión.
   </p>
   <p className="browser-yolo-status" role="status">{message}</p>
   {exportMessage&&<p className="browser-yolo-export-status" role="status">{exportMessage}</p>}
   {lastRun&&<p className="browser-yolo-run" aria-label="Ejecución correlacionada del fotograma">
    {lastRun.phase==='completed'?'ANÁLISIS COMPLETADO':'ANÁLISIS FALLIDO'}
    {' · '}Frame #{lastRun.run.frameId}
    {' · '}Intento {lastRun.run.attempt}
    {' · '}Origen: simulación 3D
    {lastEvidenceSource.current&&lastRun.phase==='completed'&&
     <> · Cámara: {lastEvidenceSource.current.camera}
      {' · '}Segundo de escena: {(lastEvidenceSource.current.elapsedMs/1000).toFixed(1)}</>}
    {lastRun.durationMs!==null&&' · '+Math.round(lastRun.durationMs)+' ms de ciclo'}
   </p>}
   {error&&<p className="browser-yolo-error" role="alert">{error}</p>}
   <div className="browser-yolo-result">
    <div className="browser-yolo-preview">
     <div className="browser-yolo-subhead"><strong>ÚLTIMO FOTOGRAMA ANALIZADO</strong>
       <span>YOLO · simulación 3D</span></div>
     <div className="browser-yolo-preview-frame">
      <canvas ref={preview} width={960} height={550} role="img"
       aria-label={'Fotograma de '+scenarioName+' con las cajas realmente inferidas por YOLO'} />
      {sampleCount===0&&<p className="browser-yolo-placeholder">
       {phase==='loading'?'Preparando red neuronal…':
        'Inicia YOLO para analizar los fotogramas de la simulación.'}
      </p>}
     </div>
     <p>Las cajas provienen exactamente del fotograma de la escena procesado por YOLO,
      sin consultar las posiciones internas del simulador.</p>
    </div>
    <div className="browser-yolo-summary">
     <span className="eyebrow">LECTURA DEL MODELO</span>
     <div className="browser-yolo-kpis">
      <div><span>Detecciones visibles</span><strong>{sampleCount?visibleDetections.length:'—'}</strong></div>
      <div><span>Personas</span><strong>{sampleCount?personCount:'—'}</strong></div>
      <div><span>Inferencia</span><strong>{inferenceMs===null?'—':Math.round(inferenceMs)+' ms'}</strong></div>
      <div><span>FPS inferidos</span><strong>{observedFps===null?'—':observedFps.toFixed(1)}</strong></div>
     </div>
     {ppe&&sampleCount>0&&<div className="browser-ppe-summary">
       <div><span>EPP observado</span><strong>{ppe.worn.length}</strong></div>
       <div><span>Señales para revisión</span>
        <strong className={ppe.requiresReview?'is-review':''}>{ppe.review.length}</strong></div>
       {ppe.review.length>0&&<p role="status">El modelo encontró indicios de EPP ausente:
        {ppe.review.map(e=>' '+e.label).join(', ')}. Confirmar visualmente antes de decidir.</p>}
       {ppe.review.length===0&&<p>No se emitieron señales explícitas de incumplimiento.
        Esto NO certifica que las personas lleven casco o chaleco.</p>}
      </div>}
     <p className="browser-yolo-count">Predicciones originales retenidas: <b>{sampleCount?detections.length:'—'}</b> · Visibles: <b>{sampleCount?visibleDetections.length:'—'}</b>.</p>
     <p className="browser-yolo-count">Fotogramas procesados: <b>{sampleCount}</b>
      {lastFrameAt&&<> · último: <b>{new Date(lastFrameAt).toLocaleTimeString('es-PE')}</b></>}</p>
     {sampleCount>0&&detections.length>0&&visibleDetections.length===0&&
      <p className="browser-yolo-empty">Hay predicciones YOLO, pero ninguna cumple los filtros visuales actuales.</p>}
     {sampleCount>0&&detections.length===0&&<p className="browser-yolo-empty">
      Ningún objeto superó el umbral. Un modelo entrenado en fotografías puede no reconocer
      modelos 3D estilizados. No se añadirán detecciones artificiales.
     </p>}
     {visibleDetections.length>0&&<div className="browser-yolo-classes">
      {visibleDetections.slice(0,8).map(d=><div key={d.id}>
       <span>{d.label}</span><strong>{Math.round(d.confidence*100)} %</strong></div>)}
     </div>}
     <p className="browser-yolo-limit"><b>Limitaciones:</b>
      {family==='ppe'?
       ' El detector EPP no valida el cumplimiento automáticamente; sus indicios de ausencia deben revisarse. No reconoce todas las prendas ni se ha evaluado en nuestra escena 3D estilizada. La clase «sin mascarilla» no se usa para alertar.':
       ' El detector COCO no reconoce cascos, chalecos, montacargas específicos ni defectos industriales.'}
       No se usa para sanciones ni para seguridad certificada.
     </p>
    </div>
   </div>
 </section>;
}
