import {useEffect,useState} from 'react';
import {detectedClasses,modelScope,observedCaptureFps,observedYoloFps,observationAgeSeconds,reviewSignals} from './yolo-telemetry';
import type {YoloTelemetry} from './yolo-telemetry';
import type {ScenarioKey} from './simulation-engine';

interface Props {readonly telemetry:YoloTelemetry;readonly scenario:ScenarioKey;readonly paused:boolean}
const number=(n:number)=>n.toLocaleString('es-PE',{maximumFractionDigits:1});
const statusText:Record<YoloTelemetry['phase'],string>={
 idle:'SIN INICIAR',loading:'CARGANDO MODELO',running:'INFERENCIA ACTIVA',
 retrying:'REINTENTANDO FOTOGRAMA',stopped:'INFERENCIA DETENIDA',failed:'ERROR DEL DETECTOR'
};
export function YoloMonitor({telemetry,scenario,paused}:Props){
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{
  const refresh=window.setInterval(()=>setNow(Date.now()),1000);
  return()=>window.clearInterval(refresh);
 },[]);
 const captureFps=observedCaptureFps(telemetry.captureTimestamps);
 const last=telemetry.observations.at(-1)??null;
 const classes=detectedClasses(last?.detections??[]);
 const fps=observedYoloFps(telemetry.observations);
 const review=reviewSignals(telemetry.model,last?.detections??[]);
 const activeVisible=telemetry.phase==='running'?telemetry.activeReview:[];
 const ageSeconds=observationAgeSeconds(last,now);
 const stale=telemetry.phase==='running'&&!paused&&ageSeconds!==null&&
  ageSeconds>5;
 const maxCount=Math.max(1,...telemetry.observations.map(o=>o.detections.length));
 return <div className="yolo-monitor" aria-label="Monitoreo de inferencia YOLO real">
   <div className="yolo-monitor-header">
    <span className="yolo-monitor-eyebrow">RESULTADOS DEL MODELO NEURONAL</span>
    <h3>Monitor YOLO</h3>
    <span className={'yolo-monitor-status '+(telemetry.phase==='running'?'is-active':'')}>
     {paused&&telemetry.phase==='running'?'SIMULACIÓN PAUSADA':statusText[telemetry.phase]}
    </span>
   </div>
   <p className="yolo-monitor-source">Fuente: <strong>fotogramas de la simulación 3D</strong>.
    Detector: <strong>{telemetry.model==='ppe'?'YOLO EPP industrial':'YOLO COCO general'}</strong>.
   </p>
   <div className="yolo-monitor-kpis">
    <div className="yolo-monitor-kpi primary"><span>Objetos detectados</span>
      <strong>{last?last.detections.length:'—'}</strong>
      <small>{last?'Último fotograma procesado':'Sin inferencias realizadas'}</small></div>
    <div className="yolo-monitor-kpi"><span>Personas detectadas</span>
      <strong>{last?last.detections.filter(d=>d.classId==='person').length:'—'}</strong>
      <small>Clase YOLO «persona»</small></div>
    <div className="yolo-monitor-kpi"><span>Tiempo de inferencia</span>
      <strong>{last?number(last.inferenceMs)+' ms':'—'}</strong>
      <small>Solo ejecución del modelo</small></div>
    <div className="yolo-monitor-kpi"><span>FPS del detector</span>
      <strong>{fps===null?'—':number(fps)}</strong>
      <small>No son FPS del renderizador</small></div>
    <div className="yolo-monitor-kpi"><span>FPS de capturas</span>
      <strong>{captureFps===null?'—':number(captureFps)}</strong>
      <small>Capturas enviadas a YOLO, no FPS WebGL</small></div>
    <div className="yolo-monitor-kpi"><span>Antigüedad de lectura</span>
      <strong>{ageSeconds===null?'—':number(ageSeconds)+' s'}</strong>
      <small>Tiempo desde la última inferencia terminada</small></div>
    <div className="yolo-monitor-kpi"><span>Capturas omitidas</span>
      <strong>{telemetry.phase==='idle'?'—':telemetry.skippedCaptures}</strong>
      <small>Intentos sin canvas disponible, no frames WebGL</small></div>
    <div className="yolo-monitor-kpi"><span>Sesión YOLO local</span>
      <strong>{telemetry.phase==='running'?'1':'0'}</strong>
      <small>Activa solo en este navegador</small></div>
   </div>
   <section className="yolo-monitor-trend" aria-label="Historial medido de objetos detectados">
    <div className="yolo-monitor-sectionhead"><h4>Lecturas del modelo</h4>
     <span>{telemetry.observations.length} recientes · último frame #{last?.frameNumber??0}</span></div>
    {telemetry.observations.length>0?
     <svg viewBox="0 0 320 106" preserveAspectRatio="none" role="img"
       aria-label={'Detecciones reales por fotograma procesado: '+telemetry.observations.map(o=>o.detections.length).join(', ')}>
      {[0,.5,1].map(p=><line key={p} x1="0" x2="320" y1={95-p*85} y2={95-p*85}
       stroke="#4b7480" strokeWidth="1" strokeDasharray="3 5" opacity=".6"/>)}
      {telemetry.observations.map((entry,index)=>{
       const width=320/Math.max(30,telemetry.observations.length);
       const h=Math.max(2,(entry.detections.length/maxCount)*80);
       return <rect key={entry.frameNumber} x={(index+1)*width-1} y={95-h}
        width={Math.max(3,width-3)} height={h} rx="1.5" fill="#69e9c2" opacity=".9"/>;
      })}
      <text x="3" y="10" fill="#abd2c6" fontSize="10">Máx. {maxCount} objetos</text>
      <text x="317" y="104" textAnchor="end" fill="#8db9b4" fontSize="9">último fotograma</text>
     </svg>:
     <p className="yolo-monitor-empty">Inicia YOLO para obtener mediciones. No hay cifras estimadas.</p>}
   </section>
   {telemetry.model==='ppe'&&<section className="yolo-monitor-ppe">
     <div className="yolo-monitor-sectionhead"><h4>Señales EPP detectadas</h4>
      <strong className={review>0?'is-review':''}>{last?review:'—'}</strong></div>
     <p>{!last?'Aún no hay predicciones de EPP.':
       review>0?'El modelo marcó clases explícitas de posible ausencia de EPP. Requieren revisión humana.':
       'Ninguna predicción explícita de ausencia de EPP en el último fotograma. No certifica cumplimiento.'}</p>
   </section>}
   {telemetry.model==='ppe'&&<section className="yolo-monitor-review" aria-label="Alertas de revisión basadas en YOLO">
    <div className="yolo-monitor-sectionhead">
     <h4>Señales repetidas para revisión</h4>
     <strong className={activeVisible.length?'is-review':''}>
      {last?activeVisible.length:'—'}
     </strong>
    </div>
    <p className="yolo-monitor-review-explain">
     Se emite una señal cuando la misma clase de posible ausencia de EPP aparece en al menos
     2 de los últimos 3 fotogramas, con confianza mínima del 55 % y dentro de 30 segundos.
    </p>
    {activeVisible.length>0&&<div className="yolo-monitor-review-active" role="status">
     {activeVisible.map(item=><div key={item.classId}>
      <span>● {item.label}</span>
      <small>{item.supportingFrames} fotogramas · hasta {Math.round(item.maxConfidence*100)} % confianza</small>
     </div>)}
    </div>}
    {telemetry.reviewLog.length>0?
     <div className="yolo-monitor-review-log">
      <span className="yolo-monitor-log-heading">Historial de indicios del detector</span>
      {[...telemetry.reviewLog].reverse().slice(0,5).map(event=><div key={event.id}>
       <time dateTime={new Date(event.observedAtMs).toISOString()}>
        {new Date(event.observedAtMs).toLocaleTimeString('es-PE',{hour12:false})}
       </time>
       <span>{event.label}</span>
       <small>Lectura #{event.frameNumber}</small>
      </div>)}
     </div>:
     <p className="yolo-monitor-empty">Aún no hay señales repetidas. La ausencia de señales
      no demuestra cumplimiento de las normas de seguridad.</p>}
    <p className="yolo-monitor-review-disclaimer">La repetición confirma solo la presencia de
     predicciones de la misma clase, no que correspondan a una persona concreta ni que
     exista una infracción. Se requiere revisión humana.</p>
   </section>}
   <section className="yolo-monitor-classes">
    <div className="yolo-monitor-sectionhead"><h4>Clases reconocidas</h4>
     <span>Último fotograma</span></div>
    {classes.length?classes.slice(0,7).map(c=><div className="yolo-monitor-class" key={c.id}>
     <span>{c.label}</span><strong>{c.count}</strong>
     <small>{Math.round(c.meanConfidence*100)} % confianza*</small>
    </div>):<p className="yolo-monitor-empty">{last?
      'El detector no superó el umbral para ninguna clase.':
      'Se mostrarán únicamente las clases que YOLO reconozca.'}</p>}
   </section>
   {stale&&<p className="yolo-monitor-stale" role="status">
    No hay una detección nueva desde hace varios segundos. La última lectura puede estar desactualizada.
   </p>}
   {telemetry.error&&<p className="yolo-monitor-error" role="alert">{telemetry.error}</p>}
   <p className="yolo-monitor-caveat">{modelScope(scenario,telemetry.model)}</p>
   <p className="yolo-monitor-note">*La confianza del detector no es precisión medida. Los conteos
    provienen del último fotograma inferido; no se mezclan con eventos ni posiciones programadas.</p>
  </div>;
}
