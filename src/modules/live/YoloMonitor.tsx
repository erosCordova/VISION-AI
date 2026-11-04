import {detectedClasses,modelScope,observedYoloFps,reviewSignals} from './yolo-telemetry';
import type {YoloTelemetry} from './yolo-telemetry';
import type {ScenarioKey} from './simulation-engine';

interface Props {readonly telemetry:YoloTelemetry;readonly scenario:ScenarioKey;readonly paused:boolean}
const number=(n:number)=>n.toLocaleString('es-PE',{maximumFractionDigits:1});
const statusText:Record<YoloTelemetry['phase'],string>={
 idle:'SIN INICIAR',loading:'CARGANDO MODELO',running:'INFERENCIA ACTIVA',
 stopped:'INFERENCIA DETENIDA',failed:'ERROR DEL DETECTOR'
};
export function YoloMonitor({telemetry,scenario,paused}:Props){
 const last=telemetry.observations.at(-1)??null;
 const classes=detectedClasses(last?.detections??[]);
 const fps=observedYoloFps(telemetry.observations);
 const review=reviewSignals(telemetry.model,last?.detections??[]);
 const stale=telemetry.phase==='running'&&!paused&&last!==null&&
  Date.now()-last.capturedAtMs>5000;
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
   </div>
   <section className="yolo-monitor-trend" aria-label="Historial medido de objetos detectados">
    <div className="yolo-monitor-sectionhead"><h4>Lecturas del modelo</h4>
     <span>{telemetry.observations.length} recientes · {last?.frameNumber??0} totales</span></div>
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
