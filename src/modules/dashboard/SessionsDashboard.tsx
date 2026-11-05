import {useEffect,useMemo,useState} from 'react';
import type {SimulationSessionRepository} from '../../core/ports/simulation-session-repository';
import type {SimulationSession} from '../../core/domain/simulation-session';
import type {ReviewClosure} from '../../core/domain/review-closure';
import {validateReproducibility} from '../live/simulation-session-model';
import {calculateDashboard,DEFAULT_DASHBOARD_FILTER} from './dashboard-metrics';
import type {DashboardFilter} from './dashboard-metrics';

const LABELS:Record<string,string>={
 safety:'Seguridad Industrial',quality:'Manufactura',
 retail:'Retail',warehouse:'Logística'
};
export function SessionsDashboard({repository,onHistory,onOperations}:{
 readonly repository:SimulationSessionRepository;
 readonly onHistory:()=>void;readonly onOperations:()=>void
}){
 const [filter,setFilter]=useState<DashboardFilter>(DEFAULT_DASHBOARD_FILTER);
 const [records,setRecords]=useState<readonly SimulationSession[]>([]);
 const [closures,setClosures]=useState<readonly ReviewClosure[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 useEffect(()=>{
  let active=true;
  const load=async()=>{
   try{
    const [all,reviews]=await Promise.all([repository.list(),repository.listReviewClosures()]);
    const valid=all.filter(r=>{
     try{validateReproducibility(r);return true;}catch{return false;}
    });
    if(active){setRecords(valid);setClosures(reviews);setError('');}
   }catch(e){if(active)setError(e instanceof Error?e.message:String(e));}
   finally{if(active)setLoading(false);}
  };
  void load();
  const reloadReviews=()=>{void repository.listReviewClosures().then(reviews=>{
   if(active)setClosures(reviews);
  }).catch(e=>{if(active)setError(e instanceof Error?e.message:String(e));});};
  window.addEventListener('vision-ai-sessions-updated',load);
  window.addEventListener('vision-ai-reviews-updated',reloadReviews);
  return()=>{active=false;
   window.removeEventListener('vision-ai-sessions-updated',load);
   window.removeEventListener('vision-ai-reviews-updated',reloadReviews);
  };
 },[repository]);
 const result=useMemo(()=>calculateDashboard(records,filter,new Date(),closures),[records,filter,closures]);
 const maxByScenario=Math.max(1,...result.byScenario.map(x=>x.count));
 const maxByDate=Math.max(1,...result.byDay.map(x=>x.count));
 return <section className="saved-dashboard" aria-label="Indicadores de sesiones guardadas">
  <div className="section-heading">
   <div><h2>Indicadores del historial</h2>
    <p>Solo se incluyen las sesiones que guardaste en este navegador</p></div>
   <span>HISTORIAL LOCAL</span>
  </div>
  <div className="saved-dashboard-filters">
   <label>Escenario
    <select aria-label="Escenario de indicadores" value={filter.scenario}
     onChange={e=>setFilter(v=>({...v,scenario:e.target.value as DashboardFilter['scenario']}))}>
     <option value="all">Todos</option>
     {Object.entries(LABELS).map(([id,label])=><option value={id} key={id}>{label}</option>)}
    </select>
   </label>
   <label>Origen
    <select aria-label="Origen de indicadores" value={filter.mode}
     onChange={e=>setFilter(v=>({...v,mode:e.target.value as DashboardFilter['mode']}))}>
     <option value="all">Todas las sesiones</option>
     <option value="synthetic">Simulación visual</option>
     <option value="yolo">Detecciones YOLO</option>
    </select>
   </label>
   <label>Periodo
    <select aria-label="Periodo de indicadores" value={filter.period}
     onChange={e=>setFilter(v=>({...v,period:e.target.value as DashboardFilter['period']}))}>
     <option value="all">Todos los registros</option>
     <option value="day">Últimas 24 horas</option>
     <option value="week">Últimos 7 días</option>
    </select>
   </label>
  </div>
  {error&&<p className="session-history-error" role="alert">{error}</p>}
  <div className="saved-dashboard-metrics" aria-live="polite">
   <div><span>Sesiones guardadas</span><strong>{loading?'—':result.sessions}</strong><small>Simulación + YOLO</small></div>
   <div><span>Sesiones YOLO</span><strong>{loading?'—':result.yoloSessions}</strong><small>Con inferencia ejecutada</small></div>
   <div><span>Detecciones conservadas</span><strong>{loading?'—':result.detections}</strong><small>Último fotograma de cada sesión</small></div>
   <div><span>Latencia media YOLO</span><strong>{result.meanInferenceMs===null?'—':result.meanInferenceMs.toFixed(1)+' ms'}</strong><small>{result.yoloSessions} sesiones con medida</small></div>
  </div>
  <div className="saved-dashboard-details">
   <div className="saved-dashboard-plot">
    <h3>Sesiones por escenario</h3>
    {result.sessions===0?<p className="saved-dashboard-empty">{loading?'Leyendo historial…':
      'No existen sesiones para estos filtros. Abre una simulación y pulsa «Guardar sesión».'}</p>:
     result.byScenario.map(row=><div className="saved-dashboard-bar" key={row.id}>
      <span>{LABELS[row.id]}</span>
      <div aria-label={row.count+' sesiones'}><i style={{width:row.count/maxByScenario*100+'%'}}/></div>
      <strong>{row.count}</strong>
     </div>)}
   </div>
   <div className="saved-dashboard-breakdown">
    <h3>Hallazgos guardados</h3>
    <dl>
     <dt>Indicios EPP · total</dt><dd>{loading?'—':result.reviewEvents}</dd>
     <dt>Sin revisar</dt><dd className="dashboard-open-reviews">{loading?'—':result.openReviews}</dd>
     <dt>Revisados</dt><dd className="dashboard-closed-reviews">{loading?'—':result.closedReviews}</dd>
     <dt>Confianza media YOLO</dt>
     <dd>{result.meanConfidence===null?'—':(result.meanConfidence*100).toFixed(1)+' %'}</dd>
     <dt>Última sesión guardada</dt>
     <dd>{result.lastSavedAt?
      new Date(result.lastSavedAt).toLocaleString('es-PE',{dateStyle:'short',timeStyle:'short'}):
      'Sin datos'}</dd>
    </dl>
    {result.byClass.length>0&&<div className="saved-dashboard-classes">
     <span>Clases detectadas en sesiones guardadas</span>
     {result.byClass.slice(0,4).map(row=><div key={row.id}>
      <span>{row.label}</span><b>{row.count}</b></div>)}
    </div>}
    <button type="button" onClick={onHistory}>Abrir historial de sesiones</button>
   </div>
  </div>
  <div className="saved-dashboard-activity">
   <section className="saved-dashboard-timeline" aria-label="Sesiones por fecha">
    <h3>Evolución de sesiones guardadas</h3>
    <p>Hasta 10 fechas recientes con actividad, agrupadas por día UTC.</p>
    {result.byDay.length>0?result.byDay.slice(-10).map(entry=>
     <div className="saved-dashboard-day" key={entry.date}>
      <time dateTime={entry.date}>{entry.date}</time>
      <div><i style={{width:entry.count/maxByDate*100+'%'}}/></div>
      <strong>{entry.count}</strong>
     </div>):
     <p className="saved-dashboard-empty">Sin sesiones para el periodo seleccionado.</p>}
   </section>
   <section className="saved-dashboard-recent" aria-label="Indicios YOLO recientes">
    <div className="saved-dashboard-recent-title"><h3>Indicios EPP recientes</h3>
     <button type="button" onClick={onOperations}>Abrir Operaciones</button></div>
    {result.recentReviews.length>0?result.recentReviews.map(item=>
     <div className="saved-dashboard-recent-row" key={item.id}>
      <div><strong>{item.label}</strong>
       <small>{item.scenarioName} · {new Date(item.evidenceAt).toLocaleString('es-PE')}</small></div>
      <span className={item.status==='closed'?'is-closed':''}>
       {item.status==='closed'?'Revisado':'Pendiente'}</span>
     </div>):
     <p className="saved-dashboard-empty">No hay indicios YOLO en las sesiones del filtro.</p>}
   </section>
  </div>
  <p className="saved-dashboard-caveat">
   Los datos provienen exclusivamente de sesiones guardadas y revisiones locales, no de todos los fotogramas procesados.
   La confianza del modelo no es una medida de exactitud, y las señales EPP no confirman infracciones.
   Sin datos, los indicadores no muestran porcentajes inventados.
  </p>
 </section>;
}
