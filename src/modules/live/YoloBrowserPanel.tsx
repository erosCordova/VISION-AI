import {useCallback,useEffect,useRef,useState} from 'react';
import type {Detection} from '../../core/domain/model';
import {analyzeYoloFrame,captureRenderedFrame,loadYoloBrowser} from './yolo-browser';
import type {YoloFrame,YoloFamily} from './yolo-browser';
import {ppeColor,ppeFindings} from './ppe-model';
import type {ScenarioKey} from './simulation-engine';
type Model=Awaited<ReturnType<typeof loadYoloBrowser>>;
type Phase='idle'|'loading'|'running'|'stopped'|'failed';
interface Props {
 readonly getSource:()=>HTMLCanvasElement|null;
 readonly scenarioName:string;
 readonly scenarioId:ScenarioKey;
 readonly paused:boolean;
}
/** El usuario controla descargas e inferencias. Muestra el fotograma EXACTO asociado a cada resultado. */
function drawFrame(frame:YoloFrame,dest:HTMLCanvasElement,family:YoloFamily){
 dest.width=frame.width;dest.height=frame.height;
 const ctx=dest.getContext('2d');
 if(!ctx)throw Error('No se pudo dibujar el fotograma analizado.');
 ctx.drawImage(frame.source,0,0,frame.width,frame.height);
 const thickness=Math.max(2,frame.width/450);
 for(const detection of frame.detections){
  const {x,y,width,height}=detection.box;
  const px=x*frame.width,py=y*frame.height;
  const pw=width*frame.width,ph=height*frame.height;
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
export function YoloBrowserPanel({getSource,scenarioName,scenarioId,paused}:Props){
 const [phase,setPhase]=useState<Phase>('idle');
 const [message,setMessage]=useState('El modelo solo se descarga cuando presionas Iniciar YOLO.');
 const [confidence,setConfidence]=useState(.35);
 const [model,setModel]=useState<Model|null>(null);
 const [family,setFamily]=useState<YoloFamily>(scenarioId==='safety'?'ppe':'coco');
 const [detections,setDetections]=useState<readonly Detection[]>([]);
 const [sampleCount,setSampleCount]=useState(0);
 const [inferenceMs,setInferenceMs]=useState<number|null>(null);
 const [observedFps,setObservedFps]=useState<number|null>(null);
 const [lastFrameAt,setLastFrameAt]=useState<number|null>(null);
 const preview=useRef<HTMLCanvasElement>(null);
 const generation=useRef(0);
 const times=useRef<number[]>([]);
 const [error,setError]=useState('');
 const start=useCallback(async()=>{
  if(phase==='loading'||phase==='running')return;
  const token=++generation.current;
  setPhase('loading');setError('');
  setMessage('Preparando el motor de inferencia…');
  times.current=[];setSampleCount(0);setObservedFps(null);
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
  }catch(e){
   if(generation.current!==token)return;
   setPhase('failed');
   setError(explainError(e));
   setMessage('No fue posible inicializar el modelo YOLO.');
  }
 },[phase,model,family]);
 const stop=useCallback(()=>{
  generation.current++;
  setPhase('stopped');
  setMessage('Inferencia detenida. No se están procesando más fotogramas.');
 },[]);
 function selectFamily(next:YoloFamily){
  if(next===family)return;
  generation.current++;
  setPhase('idle');setModel(null);setFamily(next);
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
    if(paused&&times.current.length>0){await delay(450);continue;}
    const begin=performance.now();
    try{
     const source=getSource();
     if(!source||source.width<2||source.height<2){
      await delay(350);continue;
     }
     const frame=captureRenderedFrame(source);
     const result=await analyzeYoloFrame(model,frame,confidence);
     if(cancelled||generation.current!==token)return;
     if(preview.current)drawFrame(result,preview.current,model.family);
     setDetections(result.detections);
     setInferenceMs(result.inferenceMs);
     setLastFrameAt(Date.now());
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
     if(cancelled||generation.current!==token)return;
     setPhase('failed');setError(explainError(e));
     setMessage('El motor no pudo interpretar el fotograma.');
     return;
    }
    const spent=performance.now()-begin;
    if(!cancelled)await delay(Math.max(100,750-spent));
   }
  };
  void loop();
  return ()=>{cancelled=true;};
 },[phase,model,getSource,confidence,paused,family]);
 useEffect(()=>()=>{generation.current++;},[]);
 const personCount=detections.filter(d=>d.classId==='person').length;
 const ppe=family==='ppe'?ppeFindings(detections):null;
 return <section className="browser-yolo-panel" aria-label="YOLO real en el navegador">
   <div className="browser-yolo-heading">
    <div><span className="eyebrow">INFERENCIA REAL • ONNX / WASM</span>
      <h3>{family==='ppe'?'YOLOv8s — Equipos de protección':'YOLOv8n — Objetos generales'}</h3>
      <p>YOLO examina automáticamente fotogramas de la simulación 3D mientras está en marcha.
      Las cajas provienen del modelo, nunca de las posiciones programadas.</p></div>
    <span className={'browser-yolo-phase '+(phase==='running'?'is-live':'')} role="status">
     {phase==='running'?'● YOLO EJECUTÁNDOSE':phase==='loading'?'CARGANDO MODELO':
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
    {phase!=='running'&&phase!=='loading'&&
      <button type="button" className="primary" onClick={()=>void start()}>
       {model?'▶ Reanudar YOLO real':'◉ Iniciar YOLO real'}
      </button>}
    {(phase==='running'||phase==='loading')&&
      <button type="button" onClick={stop}>Ⅱ Detener inferencia</button>}
    <label htmlFor="yolo-confidence">Confianza mínima
      <strong>{Math.round(confidence*100)} %</strong>
    </label>
    <input id="yolo-confidence" type="range" min="15" max="85" step="5"
     value={Math.round(confidence*100)}
     onChange={e=>setConfidence(Number(e.target.value)/100)}/>
   </div>
   <p className="browser-yolo-status" role="status">{message}</p>
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
      <div><span>Detecciones</span><strong>{sampleCount?detections.length:'—'}</strong></div>
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
     <p className="browser-yolo-count">Fotogramas procesados: <b>{sampleCount}</b>
      {lastFrameAt&&<> · último: <b>{new Date(lastFrameAt).toLocaleTimeString('es-PE')}</b></>}</p>
     {sampleCount>0&&detections.length===0&&<p className="browser-yolo-empty">
      Ningún objeto superó el umbral. Un modelo entrenado en fotografías puede no reconocer
      modelos 3D estilizados. No se añadirán detecciones artificiales.
     </p>}
     {detections.length>0&&<div className="browser-yolo-classes">
      {detections.slice(0,8).map(d=><div key={d.id}>
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
