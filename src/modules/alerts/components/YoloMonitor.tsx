import {useEffect,useState} from 'react';
import {detectedClasses,modelScope,observedCaptureFps,observedYoloFps,observationAgeSeconds,reviewSignals} from '../../detections/services/yolo-telemetry';
import type {YoloTelemetry} from '../../detections/services/yolo-telemetry';
import type {ScenarioKey} from '../../scenarios/services/simulation-engine';
import {evaluateOperationalRules} from '../../patterns/services/operational-rule-engine';

interface Props {readonly telemetry:YoloTelemetry;readonly scenario:ScenarioKey;readonly paused:boolean}
const number=(n:number)=>n.toLocaleString('es-PE',{maximumFractionDigits:1});
const statusText:Record<YoloTelemetry['phase'],string>={
 idle:'SIN INICIAR',loading:'PREPARANDO',running:'ANALIZANDO',
 retrying:'REINTENTANDO',stopped:'DETENIDO',failed:'ERROR DE ANÁLISIS'
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
 const rules=evaluateOperationalRules(scenario,telemetry);
 const ruleLabel:Record<string,string>={
  review:'Revisión humana necesaria',observed:'Observación informativa',
  'no-evidence':'Sin fotogramas analizados','no-signal':'Sin indicios repetidos',
  unavailable:'Sin modelo especializado'
 };
 const fps=observedYoloFps(telemetry.observations);
 const review=reviewSignals(telemetry.model,last?.detections??[]);
 const activeVisible=telemetry.phase==='running'?telemetry.activeReview:[];
 const ageSeconds=observationAgeSeconds(last,now);
 const stale=telemetry.phase==='running'&&!paused&&ageSeconds!==null&&
  ageSeconds>5;
 const maxCount=Math.max(1,...telemetry.observations.map(o=>o.detections.length));
 return <div className="yolo-monitor" aria-label="Resultados del reconocimiento">
   <div className="yolo-monitor-header">
    <span className="yolo-monitor-eyebrow">RESULTADOS DE LA ESCENA</span>
    <h3>Objetos detectados</h3>
    <span className={'yolo-monitor-status '+(telemetry.phase==='running'?'is-active':'')}>
     {paused&&telemetry.phase==='running'?'SIMULACIÓN PAUSADA':statusText[telemetry.phase]}
    </span>
   </div>
   <p className="yolo-monitor-source">Escena 3D · <strong>{telemetry.model==='ppe'?'Equipos de protección':'Objetos generales'}</strong></p>
   <div className="yolo-monitor-kpis">
    <div className="yolo-monitor-kpi primary"><span>Objetos detectados</span>
      <strong>{last?last.detections.length:'—'}</strong>
      <small>{last?'Último fotograma procesado':'Sin análisis todavía'}</small></div>
    <div className="yolo-monitor-kpi"><span>Personas detectadas</span>
      <strong>{last?last.detections.filter(d=>d.classId==='person').length:'—'}</strong>
      <small>En la última imagen</small></div>
    <div className="yolo-monitor-kpi"><span>Tiempo de análisis</span>
      <strong>{last?number(last.inferenceMs)+' ms':'—'}</strong>
      <small>Última imagen</small></div>
    <div className="yolo-monitor-kpi"><span>Análisis por segundo</span>
      <strong>{fps===null?'—':number(fps)}</strong>
      <small>Ritmo de reconocimiento</small></div>
    <div className="yolo-monitor-kpi"><span>Imágenes recibidas/s</span>
      <strong>{captureFps===null?'—':number(captureFps)}</strong>
      <small>Imágenes tomadas para analizar</small></div>
    <div className="yolo-monitor-kpi"><span>Último resultado hace</span>
      <strong>{ageSeconds===null?'—':number(ageSeconds)+' s'}</strong>
      <small>Segundos transcurridos</small></div>
    
   </div>
   <section className="yolo-monitor-trend" aria-label="Historial medido de objetos detectados">
    <div className="yolo-monitor-sectionhead"><h4>Detecciones recientes</h4>
     <span>{telemetry.observations.length} recientes · última imagen #{last?.frameNumber??0}</span></div>
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
     <p className="yolo-monitor-empty">Inicia el reconocimiento para ver los resultados.</p>}
   </section>
   {telemetry.model==='ppe'&&<section className="yolo-monitor-ppe">
     <div className="yolo-monitor-sectionhead"><h4>Señales de protección personal</h4>
      <strong className={review>0?'is-review':''}>{last?review:'—'}</strong></div>
     <p>{!last?'Aún no hay observaciones.':
       review>0?'Se han señalado posibles faltas de protección. Revisa la imagen.':
       'No se detectaron faltas de protección en la última imagen. Esto no garantiza cumplimiento.'}</p>
   </section>}
   {telemetry.model==='ppe'&&<section className="yolo-monitor-review" aria-label="Observaciones de seguridad para revisar">
    <div className="yolo-monitor-sectionhead">
     <h4>Señales repetidas para revisión</h4>
     <strong className={activeVisible.length?'is-review':''}>
      {last?activeVisible.length:'—'}
     </strong>
    </div>
    <p className="yolo-monitor-review-explain">
     Se muestran observaciones repetidas que requieren una revisión visual.
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
   <section className="yolo-monitor-rules" aria-label="Reglas operativas verificables">
    <div className="yolo-monitor-sectionhead"><h4>Observaciones del escenario</h4>
     </div>
    {rules.map(rule=><div className={'yolo-rule-card is-'+rule.status} key={rule.id}>
     <div><strong>{rule.title}</strong><span>{ruleLabel[rule.status]}</span></div>
     <p>{rule.description}</p>
     <small>{rule.status==='unavailable'?'La regla no puede ejecutarse con este detector.':
      'Imágenes recientes: '+rule.observedFrames+' · Coincidencias: '+rule.supportingFrames}</small>
    </div>)}
    <p className="yolo-monitor-review-disclaimer">
     Estas observaciones no confirman riesgos ni infracciones. Es necesaria una revisión humana.
    </p>
   </section>
   <section className="yolo-monitor-classes">
    <div className="yolo-monitor-sectionhead"><h4>Clases reconocidas</h4>
     <span>Último fotograma</span></div>
    {classes.length?classes.slice(0,7).map(c=><div className="yolo-monitor-class" key={c.id}>
     <span>{c.label}</span><strong>{c.count}</strong>
     <small>{Math.round(c.meanConfidence*100)} % confianza*</small>
    </div>):<p className="yolo-monitor-empty">{last?
      'El detector no superó el umbral para ninguna clase.':
      'Aquí verás los objetos identificados.'}</p>}
   </section>
   {stale&&<p className="yolo-monitor-stale" role="status">
    No hay una detección nueva desde hace varios segundos. La última lectura puede estar desactualizada.
   </p>}
   {telemetry.error&&<p className="yolo-monitor-error" role="alert">No se pudo completar el reconocimiento. Intenta nuevamente.</p>}
   <p className="yolo-monitor-caveat">{modelScope(scenario,telemetry.model)}</p>
   <p className="yolo-monitor-note">*La confianza del detector no es precisión medida. Los conteos corresponden únicamente a la última imagen analizada.</p>
  </div>;
}
