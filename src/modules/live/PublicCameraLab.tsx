import {useCallback,useEffect,useRef,useState} from 'react';
import type {Detection} from '../../core/domain/model';
import {analyzeYoloFrame,captureRenderedFrame,loadYoloBrowser} from './yolo-browser';
import type {LoadedYolo} from './yolo-browser';
import {frameBoxPixels} from './frame-analysis-cycle';

import {PUBLIC_CAMERA_SOURCES} from './public-camera-sources';
import type {PublicCameraSource} from './public-camera-sources';

type Phase='inactive'|'loading'|'ready'|'processing'|'failed';
const POLL_INTERVAL=180_000;
function annotate(source:HTMLCanvasElement,output:HTMLCanvasElement,items:readonly Detection[]){
 output.width=source.width;output.height=source.height;
 const ctx=output.getContext('2d');
 if(!ctx)return;
 ctx.drawImage(source,0,0);
 const line=Math.max(2,source.width/420);
 for(const item of items){
  const r=frameBoxPixels(item.box,source.width,source.height);
  ctx.strokeStyle=item.classId==='person'?'#6cf4d0':'#ffd078';
  ctx.lineWidth=line;ctx.strokeRect(r.x,r.y,r.width,r.height);
  const label=item.label+' · '+Math.round(item.confidence*100)+'%';
  ctx.font='700 '+Math.max(11,Math.round(source.width/38))+'px sans-serif';
  const w=Math.min(source.width,ctx.measureText(label).width+18),h=24;
  const x=Math.max(0,Math.min(source.width-w,r.x));
  const y=Math.max(0,r.y-h);
  ctx.fillStyle='#082337ef';ctx.fillRect(x,y,w,h);
  ctx.fillStyle='#e9fff5';ctx.fillText(label,x+8,y+17);
 }
}
async function sha256(blob:Blob):Promise<string>{
 const digest=await crypto.subtle.digest('SHA-256',await blob.arrayBuffer());
 return Array.from(new Uint8Array(digest)).map(n=>n.toString(16).padStart(2,'0')).join('');
}
export function PublicCameraLab(){
 const [cameraId,setCameraId]=useState(PUBLIC_CAMERA_SOURCES[0].id);
 const [frameError,setFrameError]=useState('');
 const [phase,setPhase]=useState<Phase>('inactive');
 const [lastRefresh,setLastRefresh]=useState('');
 const [sourceStatus,setSourceStatus]=useState('Esperando fotografía');
 const [updateCount,setUpdateCount]=useState(0);
 const [frameCount,setFrameCount]=useState(0);
 const [inferenceMs,setInferenceMs]=useState<number|null>(null);
 const [detections,setDetections]=useState<readonly Detection[]>([]);
 const [minConfidence,setMinConfidence]=useState(.35);
 const minConfidenceRef=useRef(.35);minConfidenceRef.current=minConfidence;
 const [running,setRunning]=useState(false);
 const [modelInfo,setModelInfo]=useState('El modelo YOLO se descarga solo cuando lo solicitas.');
 const [busy,setBusy]=useState(false);
 const [refreshNonce,setRefreshNonce]=useState(0);
 const source=useRef<HTMLCanvasElement>(null);
 const result=useRef<HTMLCanvasElement>(null);
 const currentModel=useRef<LoadedYolo|null>(null);
 const latestHash=useRef<string>('');
 const requestGeneration=useRef(0);
 const runningRef=useRef(false);
 const alive=useRef(true);
 const camera:PublicCameraSource|undefined=PUBLIC_CAMERA_SOURCES.find(item=>item.id===cameraId);
 useEffect(()=>{
  alive.current=true;
  return()=>{alive.current=false;requestGeneration.current++;};
 },[]);
 const redraw=useCallback((items:readonly Detection[])=>{
  if(source.current&&result.current&&source.current.width>1)
   annotate(source.current,result.current,items);
 },[]);
 const infer=useCallback(async(model:LoadedYolo,token:number)=>{
  if(!source.current||source.current.width<2)return;
  try{
   setPhase('processing');setModelInfo('YOLO analiza los píxeles de una fotografía pública…');
   const snapshot=captureRenderedFrame(source.current);
   const output=await analyzeYoloFrame(model,snapshot,.22);
   if(token!==requestGeneration.current||!alive.current)return;
   setDetections(output.detections);
   setInferenceMs(Math.round(output.inferenceMs));
   setFrameCount(value=>value+1);
   setPhase('ready');
   setModelInfo('Inferencia real completada; resultados del fotograma mostrado.');
   redraw(output.detections.filter(item=>item.confidence>=minConfidenceRef.current));
  }catch(error){
   if(token!==requestGeneration.current||!alive.current)return;
   setPhase('failed');
   setModelInfo(error instanceof Error?error.message:'Error al ejecutar YOLO.');
  }
 },[redraw]);
 useEffect(()=>{
  if(!camera)return;
  requestGeneration.current++;
  let live=true;const abort=new AbortController();
  const update=async()=>{
   if(!live||abort.signal.aborted)return;
   const token=++requestGeneration.current;
   setBusy(true);setFrameError('');setSourceStatus('Consultando fuente pública de TfL…');
   try{
    const response=await fetch(camera.imagePath,{
     signal:abort.signal,cache:'no-store'});
    if(!response.ok){
     throw Error('La cámara no respondió (HTTP '+response.status+'). Selecciona otra fuente o reintenta.');
    }
    const blob=await response.blob();
    const signature=new Uint8Array(await blob.slice(0,3).arrayBuffer());
    if(blob.size<100||blob.size>2_000_000||
       signature[0]!==255||signature[1]!==216||signature[2]!==255)
     throw Error('TfL no entregó una imagen JPEG válida.');
    const hash=await sha256(blob);
    if(!live||token!==requestGeneration.current)return;
    const changed=hash!==latestHash.current;
    if(changed){
     const bitmap=await createImageBitmap(blob);
     if(!live||token!==requestGeneration.current){bitmap.close();return;}
     const canvas=source.current,context=canvas?.getContext('2d');
     if(!canvas||!context){bitmap.close();throw Error('No se puede preparar el visor de la cámara.');}
     canvas.width=bitmap.width;canvas.height=bitmap.height;
     context.drawImage(bitmap,0,0);bitmap.close();
     latestHash.current=hash;
     setDetections([]);setInferenceMs(null);redraw([]);
     if(runningRef.current&&currentModel.current)await infer(currentModel.current,token);
    }
    if(live&&token===requestGeneration.current){
     setLastRefresh(new Date().toLocaleTimeString('es-PE',{hour12:false}));
     setSourceStatus(changed?'Fotografía pública recibida':'La cámara aún muestra el mismo fotograma');
     setUpdateCount(n=>n+Number(changed));
     setFrameError('');
    }
   }catch(error){
    if(live&&!abort.signal.aborted&&token===requestGeneration.current){
     setFrameError(error instanceof Error?error.message:'No se pudo leer la imagen pública.');
     setSourceStatus('Fuente temporalmente no disponible · última imagen sin actualizar');
    }
   }finally{if(live&&token===requestGeneration.current)setBusy(false);}
  };
  void update();
  const interval=window.setInterval(()=>{if(!document.hidden)void update();},POLL_INTERVAL);
  return()=>{live=false;abort.abort();window.clearInterval(interval);requestGeneration.current++;};
 },[cameraId,refreshNonce,redraw,infer]);
 useEffect(()=>{
  latestHash.current='';
  setDetections([]);setInferenceMs(null);setFrameCount(0);
  setLastRefresh('');setSourceStatus('Esperando fotografía');
  redraw([]);
 },[cameraId,redraw]);
 const startYolo=async()=>{
  if(!source.current||source.current.width<2)return;
  setPhase('loading');setModelInfo('Descargando YOLOv8n COCO (ONNX/WASM)…');
  const token=++requestGeneration.current;
  try{
   const model=await loadYoloBrowser(message=>{
    if(alive.current&&token===requestGeneration.current)setModelInfo(message);
   },'coco');
   if(!alive.current||token!==requestGeneration.current)return;
   currentModel.current=model;runningRef.current=true;setRunning(true);
   await infer(model,token);
  }catch(error){
   if(token!==requestGeneration.current||!alive.current)return;
   runningRef.current=false;setRunning(false);setPhase('failed');
   setModelInfo(error instanceof Error?error.message:'No fue posible iniciar YOLO.');
  }
 };
 const stopYolo=()=>{
  requestGeneration.current++;runningRef.current=false;setRunning(false);setPhase('inactive');
  setModelInfo('Análisis detenido. La fotografía pública puede seguir actualizándose.');
 };
 const visible=detections.filter(d=>d.confidence>=minConfidence);
 useEffect(()=>{redraw(visible);},[minConfidence,detections,redraw]);
 const exportFrame=()=>{
  if(!result.current||result.current.width<2)return;
  result.current.toBlob(blob=>{
   if(!blob)return;
   const url=URL.createObjectURL(blob);
   const a=document.createElement('a');a.href=url;
   a.download='vision-ai-tfl-'+(cameraId||'camara')+'-'+Date.now()+'.png';
   document.body.appendChild(a);a.click();a.remove();
   setTimeout(()=>URL.revokeObjectURL(url),1000);
  },'image/png');
 };
 return <section className="public-camera-lab" aria-label="Análisis de cámaras públicas TfL">
  <div className="public-camera-header">
   <div><span className="public-camera-eyebrow">FUENTE REAL · CÁMARA PÚBLICA CON LICENCIA</span>
    <h2>Cámaras públicas + YOLO</h2>
    <p>Fotografías de vías urbanas de Transport for London. Detección local de vehículos
    y personas; sin cámara del dispositivo, sin Render y sin inferencia en servidor.</p></div>
   <span className="public-camera-pill">TF LONDON / OPEN DATA</span>
  </div>
  <div className="public-camera-toolbar">
   <label htmlFor="public-camera-source">Seleccionar cámara pública
    <select id="public-camera-source" value={cameraId}
     onChange={event=>setCameraId(event.target.value)}>
     {PUBLIC_CAMERA_SOURCES.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}
    </select></label>
   <button type="button" onClick={()=>setRefreshNonce(n=>n+1)} disabled={busy||!cameraId}>
    {busy?'Consultando…':'Actualizar fotografía'}</button>
   <span className="public-camera-refresh">Actualización programada: cada 3 minutos</span>
  </div>
  <div className="public-camera-layout">
   <div className="public-camera-viewer">
    <div className="public-camera-frame-top">
     <strong>{camera?.name??'Sin cámara seleccionada'}</strong>
     <span>{sourceStatus}</span>
    </div>
    <div className="public-camera-frame">
     <canvas ref={source} hidden aria-hidden="true"/>
     <canvas ref={result} role="img" aria-label="Fotograma público de tráfico con detecciones YOLO si se inició el modelo"/>
     {!lastRefresh&&<div className="public-camera-empty">
      {frameError?'La cámara seleccionada no está disponible':'Esperando el primer fotograma público…'}
     </div>}
    </div>
    {frameError&&<p className="public-camera-alert" role="alert">{frameError}</p>}
    <div className="public-camera-attribution">
     <span>Powered by TfL Open Data · Contains OS data © Crown copyright and database rights 2016</span>
     <a href="https://tfl.gov.uk/corporate/terms-and-conditions/transport-data-service"
      target="_blank" rel="noopener noreferrer">Licencia y condiciones</a>
    </div>
    <p className="public-camera-disclaimer">No es transmisión continua: el proveedor actualiza
     imágenes periódicamente y puede detenerlas. Hora mostrada: última consulta a TfL, no
     hora certificada de captura. No usar para reconocimiento facial ni sanciones.</p>
   </div>
   <aside className="public-camera-analysis">
    <span className="public-camera-eyebrow">MOTOR DE VISIÓN</span>
    <h3>Detección YOLO real</h3>
    <p>El modelo ONNX detecta clases generales directamente sobre el fotograma
     recibido. No se generan predicciones sintéticas.</p>
    <div className="public-camera-actions">
     {!running?<button className="primary" onClick={()=>void startYolo()}
      disabled={phase==='loading'||!lastRefresh}>Iniciar YOLO</button>:
      <button onClick={stopYolo}>Detener YOLO</button>}
     <button onClick={exportFrame} disabled={!lastRefresh}>Guardar evidencia PNG</button>
    </div>
    <p role="status" className="public-camera-engine-state">{modelInfo}</p>
    <label className="public-camera-range" htmlFor="public-camera-confidence">
     Confianza mínima: {Math.round(minConfidence*100)} %
     <input id="public-camera-confidence" type="range" min="10" max="90"
      value={Math.round(minConfidence*100)}
      onChange={event=>setMinConfidence(Number(event.target.value)/100)}/>
    </label>
    <div className="public-camera-metrics">
     <div><span>Imágenes nuevas recibidas</span><strong>{updateCount}</strong></div>
     <div><span>Inferencias realizadas</span><strong>{frameCount}</strong></div>
     <div><span>Objetos detectados</span><strong>{running&&frameCount?visible.length:'—'}</strong></div>
     <div><span>Tiempo YOLO</span><strong>{inferenceMs===null?'—':inferenceMs+' ms'}</strong></div>
     <div><span>Última consulta</span><strong>{lastRefresh||'—'}</strong></div>
    </div>
    <h4>Resultados del último fotograma</h4>
    {running&&frameCount&&visible.length?
     <ul className="public-camera-detections">
      {visible.map((d,index)=><li key={index}><span>{d.label}</span>
       <strong>{Math.round(d.confidence*100)} %</strong></li>)}
     </ul>:<p className="public-camera-muted">{running&&frameCount?
      'YOLO no identificó objetos que superen el umbral actual.':
      'Inicia YOLO para obtener detecciones comprobables.'}</p>}
    <p className="public-camera-limits">Aplicable a movilidad urbana, logística de transporte
     y ocupación visible. No comprueba EPP industrial ni defectos de fabricación.</p>
   </aside>
  </div>
 </section>;
}
