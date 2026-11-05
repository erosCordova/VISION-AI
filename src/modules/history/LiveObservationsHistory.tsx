import {useEffect,useMemo,useState} from 'react';
import type {LiveObservation} from '../../core/domain/live-observation';
import {listLiveObservations,deleteLiveObservation} from '../../infrastructure/persistence/live-observation-store';
import {downloadLiveCsv} from './live-observation-export';

const PAGE_SIZE=6;
export function LiveObservationsHistory({onAnalyze}:{readonly onAnalyze:()=>void}){
 const [records,setRecords]=useState<readonly LiveObservation[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [search,setSearch]=useState('');
 const [cameraId,setCameraId]=useState('');
 const [period,setPeriod]=useState('all');
 const [page,setPage]=useState(1);
 const [selected,setSelected]=useState<string|null>(null);
 const [pending,setPending]=useState<string|null>(null);
 useEffect(()=>{
  let mounted=true;
  const reload=()=>{
   void listLiveObservations().then(rows=>{if(mounted){setRecords(rows);setError('');}})
    .catch(e=>{if(mounted)setError(e instanceof Error?e.message:String(e));})
    .finally(()=>{if(mounted)setLoading(false);});
  };
  reload();
  window.addEventListener('vision-ai-live-updated',reload);
  return()=>{mounted=false;window.removeEventListener('vision-ai-live-updated',reload);};
 },[]);
 const cameras=useMemo(()=>[...new Map<string,string>(records.map(r=>[r.cameraId,r.cameraName] as const)).entries()], [records]);
 const filtered=useMemo(()=>{
  const time=Date.now(),cutoff=period==='day'?time-86400000:period==='week'?time-604800000:0;
  const q=search.trim().toLocaleLowerCase('es');
  return records.filter(r=>(!cameraId||r.cameraId===cameraId)&&
   (!cutoff||Date.parse(r.savedAt)>=cutoff)&&
   (!q||r.cameraName.toLocaleLowerCase('es').includes(q)||
    r.detections.some(d=>d.label.toLocaleLowerCase('es').includes(q))));
 },[records,search,cameraId,period]);
 const countPages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
 const shown=filtered.slice((Math.min(page,countPages)-1)*PAGE_SIZE,Math.min(page,countPages)*PAGE_SIZE);
 const detail=records.find(r=>r.id===selected);
 async function remove(id:string){
  try{
   await deleteLiveObservation(id);
   setSelected(null);setPending(null);
   setNotice('Observación eliminada de este navegador.');
  }catch(e){setError(e instanceof Error?e.message:String(e));}
 }
 function exportFiltered(){
  try{downloadLiveCsv(filtered);setNotice('Informe CSV descargado: '+filtered.length+' observaciones.');}
  catch(e){setError(e instanceof Error?e.message:String(e));}
 }
 return <section className="live-history" aria-label="Historial de cámaras reales">
  <header className="live-history-heading">
   <div><span className="live-traffic-eyebrow">CÁMARAS EN DIRECTO</span>
    <h2>Análisis guardados de cámaras</h2>
    <p>Observaciones que guardaste. No conservamos grabaciones ni imágenes del video.</p></div>
   <span className="live-history-total">{loading?'Cargando…':records.length+' guardados'}</span>
  </header>
  <div className="live-history-filters">
   <label>Buscar personas, vehículos o cámara
    <input type="search" value={search} placeholder="Buscar detección…" onChange={e=>{setSearch(e.target.value);setPage(1);}}/>
   </label>
   <label>Cámara
    <select value={cameraId} onChange={e=>{setCameraId(e.target.value);setPage(1);}}>
     <option value="">Todas</option>
     {cameras.map(([id,name])=><option key={id} value={id}>{name}</option>)}
    </select>
   </label>
   <label>Periodo
    <select value={period} onChange={e=>{setPeriod(e.target.value);setPage(1);}}>
     <option value="all">Todo el historial</option><option value="day">Últimas 24 horas</option>
     <option value="week">Últimos 7 días</option>
    </select>
   </label>
   <button type="button" onClick={exportFiltered} disabled={!filtered.length}>Exportar CSV</button>
  </div>
  {error&&<p className="live-traffic-error" role="alert">{error}</p>}
  {notice&&<p role="status" className="live-history-notice">{notice}</p>}
  {!loading&&records.length===0?<div className="live-history-empty">
   <p>Aún no guardaste ningún análisis de cámaras.</p>
   <button type="button" onClick={onAnalyze}>Abrir cámaras en directo</button>
  </div>:<div className="live-history-table-wrap">
   <table className="live-history-table"><thead><tr><th>Fecha</th><th>Cámara</th>
    <th>Detecciones</th><th>Tiempo</th><th>Acciones</th></tr></thead><tbody>
    {shown.map(r=><tr key={r.id}>
     <td><time dateTime={r.savedAt}>{new Date(r.savedAt).toLocaleString('es-PE')}</time></td>
     <td>{r.cameraName}</td><td>{r.detections.length}</td><td>{Math.round(r.inferenceMs)} ms</td>
     <td><div className="live-history-row-actions">
      <button type="button" onClick={()=>setSelected(v=>v===r.id?null:r.id)}>Detalle</button>
      <button type="button" onClick={()=>setPending(r.id)}>Eliminar</button>
     </div></td>
    </tr>)}
    {shown.length===0&&<tr><td colSpan={5}>No hay observaciones con estos filtros.</td></tr>}
   </tbody></table>
  </div>}
  {filtered.length>PAGE_SIZE&&<div className="live-history-pagination">
   <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>Anterior</button>
   <span>Página {Math.min(page,countPages)} de {countPages}</span>
   <button disabled={page>=countPages} onClick={()=>setPage(p=>Math.min(countPages,p+1))}>Siguiente</button>
  </div>}
  {detail&&<section className="live-history-detail">
   <div className="live-history-detail-head"><h3>Detalle del análisis</h3>
    <button onClick={()=>setSelected(null)}>Cerrar</button></div>
   <dl><dt>Cámara</dt><dd>{detail.cameraName}</dd>
    <dt>Hora del análisis</dt><dd>{new Date(detail.observedAt).toLocaleString('es-PE')}</dd>
    <dt>Origen</dt><dd>Video público en directo</dd>
    <dt>Reconocimiento</dt><dd>YOLO · {detail.detections.length} detecciones</dd>
    <dt>Tiempo</dt><dd>{Math.round(detail.inferenceMs)} ms</dd>
   </dl>
   {detail.detections.length===0?<p>No se encontraron objetos en este fotograma.</p>:
    <ul>{detail.detections.map((d,i)=><li key={d.id+'-'+i}><span>{d.label}</span>
     <strong>{(d.confidence*100).toFixed(1)} %</strong></li>)}</ul>}
   <p>Se conservan datos de detección, no la imagen ni la hora de captura certificada por la cámara.</p>
  </section>}
  {pending&&<section className="live-history-confirm" role="group" aria-label="Confirmar eliminación">
   <p>¿Eliminar esta observación guardada? Esta acción no se puede deshacer.</p>
   <button onClick={()=>setPending(null)}>Cancelar</button>
   <button className="danger" onClick={()=>void remove(pending)}>Sí, eliminar</button>
  </section>}
 </section>;
}
