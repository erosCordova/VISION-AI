import {useEffect,useMemo,useState} from 'react';
import type {LiveObservation} from '../../../core/domain/live-observation';
import {useLiveObservationRepository} from '../../../shared/live-observation-context';
export function LiveObservationsDashboard({onHistory,onAnalyze}:{
 readonly onHistory:()=>void;readonly onAnalyze:()=>void
}){
 const liveRepository=useLiveObservationRepository();
 const [rows,setRows]=useState<readonly LiveObservation[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 useEffect(()=>{
  let active=true;
  const reload=()=>{void liveRepository.list().then(data=>{
   if(active){setRows(data);setError('');}
  }).catch(e=>{if(active)setError(e instanceof Error?e.message:String(e));})
  .finally(()=>{if(active)setLoading(false);});};
  reload();window.addEventListener('vision-ai-live-updated',reload);
  return()=>{active=false;window.removeEventListener('vision-ai-live-updated',reload);};
 },[liveRepository]);
 const stats=useMemo(()=>{
  const tally=new Map<string,number>();
  let count=0,totalMs=0;
  for(const r of rows){
   totalMs+=r.inferenceMs;
   for(const d of r.detections){count++;tally.set(d.label,(tally.get(d.label)??0)+1);}
  }
  return {count,mean:rows.length?totalMs/rows.length:null,
   classes:[...tally.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5)};
 },[rows]);
 return <section className="live-dashboard" aria-label="Indicadores de cámaras reales">
  <div className="live-dashboard-top"><div><span className="live-traffic-eyebrow">ANÁLISIS DE CÁMARAS</span>
   <h2>Actividad guardada en directo</h2><p>Resultados reales que guardaste en este navegador.</p></div>
   <button onClick={onHistory}>Ver historial</button></div>
  {error&&<p role="alert">{error}</p>}
  <div className="live-dashboard-metrics">
   <div><span>Observaciones guardadas</span><strong>{loading?'—':rows.length}</strong></div>
   <div><span>Detecciones conservadas</span><strong>{loading?'—':stats.count}</strong></div>
   <div><span>Tiempo medio de análisis</span><strong>{loading?'—':stats.mean===null?'—':stats.mean.toFixed(0)+' ms'}</strong></div>
   <div><span>Último análisis guardado</span><strong className="live-dashboard-date">{!rows.length?'—':new Date(rows[0].savedAt).toLocaleDateString('es-PE')}</strong></div>
  </div>
  <div className="live-dashboard-details">
   <div><h3>Detecciones frecuentes</h3>
    {stats.classes.length?<ul>{stats.classes.map(([label,count])=>
     <li key={label}><span>{label}</span><b>{count}</b></li>)}</ul>:
     <p>No hay detecciones guardadas todavía.</p>}
   </div>
   <div><h3>Últimas observaciones</h3>
    {rows.length?<ul>{rows.slice(0,4).map(row=><li key={row.id}>
     <span>{row.cameraName}</span><b>{row.detections.length} objetos</b></li>)}</ul>:
     <><p>Inicia una cámara, analiza el video y guarda el resultado cuando quieras.</p>
      <button onClick={onAnalyze}>Abrir cámaras</button></>}
   </div>
  </div>
 </section>;
}
