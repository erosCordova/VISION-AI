import {useEffect,useMemo,useState} from 'react';
import {LiveObservationsHistory} from './LiveObservationsHistory';
import type {SimulationSessionRepository} from '../../core/ports/simulation-session-repository';
import {validateReproducibility} from '../live/simulation-session-model';
import type {SimulationSession} from '../../core/domain/simulation-session';
import type {ReviewClosure} from '../../core/domain/review-closure';
import {buildHistoryCsv,buildHistoryAuditReport,downloadLocalReport,
 filterHistoryRecords,historyReportMetrics,linkedReviews} from './session-reports';
import type {HistoryPeriod,HistoryReportKind,HistoryReviewState} from './session-reports';

const SCENARIOS=[
 {id:'safety',label:'Seguridad industrial'},
 {id:'quality',label:'Control de calidad'},
 {id:'retail',label:'Retail'},
 {id:'warehouse',label:'Almacén inteligente'}
];
const perPage=8;
function timeLabel(date:string):string{
 return new Date(date).toLocaleString('es-PE',{dateStyle:'medium',timeStyle:'short'});
}
const formatElapsed=(ms:number)=>Math.floor(ms/60000).toString().padStart(2,'0')+':'+
 Math.floor(ms%60000/1000).toString().padStart(2,'0');
export function HistoryPanel({onAnalyze,sessionRepository}:{onAnalyze:()=>void;sessionRepository:SimulationSessionRepository}){
 const [records,setRecords]=useState<readonly SimulationSession[]>([]);
 const [corruptIds,setCorruptIds]=useState<readonly string[]>([]);
 const [closures,setClosures]=useState<readonly ReviewClosure[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [query,setQuery]=useState('');
 const [scenario,setScenario]=useState('');
 const [mode,setMode]=useState('');
 const [period,setPeriod]=useState<HistoryPeriod>('all');
 const [reviewStatus,setReviewStatus]=useState<HistoryReviewState>('all');
 const [page,setPage]=useState(1);
 const [selected,setSelected]=useState<string|null>(null);
 const [pendingDelete,setPendingDelete]=useState<string|null>(null);
 const [notice,setNotice]=useState('');
 useEffect(()=>{
  let alive=true;
  const load=async()=>{
   try{
    const [inspection,reviews]=await Promise.all([
     sessionRepository.inspect(),sessionRepository.listReviewClosures()]);
    const valid:SimulationSession[]=[];
    const corrupt=[...inspection.corruptIds];
    for(const record of inspection.records){
     try{validateReproducibility(record);valid.push(record);}
     catch{corrupt.push(record.id);}
    }
    if(alive){setRecords(valid);setClosures(reviews);setCorruptIds([...new Set(corrupt)]);setError('');}
   }catch(e){
    if(alive)setError(e instanceof Error?e.message:String(e));
   }finally{if(alive)setLoading(false);}
  };
  void load();
  const refresh=()=>{void load();};
  window.addEventListener('vision-ai-sessions-updated',refresh);
  window.addEventListener('vision-ai-reviews-updated',refresh);
  return()=>{alive=false;
   window.removeEventListener('vision-ai-sessions-updated',refresh);
   window.removeEventListener('vision-ai-reviews-updated',refresh);
  };
 },[sessionRepository]);
 const filtered=useMemo(()=>filterHistoryRecords(records,closures,{
  search:query,scenario,mode,period,review:reviewStatus
 }),[records,closures,query,scenario,mode,period,reviewStatus]);
 const metrics=useMemo(()=>historyReportMetrics(filtered,closures),[filtered,closures]);
 const hasFilters=Boolean(query||scenario||mode||period!=='all'||reviewStatus!=='all');
 const pages=Math.max(1,Math.ceil(filtered.length/perPage));
 const currentPage=Math.min(page,pages);
 const rows=filtered.slice((currentPage-1)*perPage,currentPage*perPage);
 const details=records.find(item=>item.id===selected)??null;
 const detailReviews=useMemo(()=>details?linkedReviews([details],closures):[],[details,closures]);
 const timestamp=new Date().toISOString().slice(0,10);
 function exportCsv(kind:HistoryReportKind){
  if(!filtered.length)return;
  try{
   downloadLocalReport(buildHistoryCsv(kind,filtered,closures),
    'vision-ai-'+kind+'-'+timestamp+'.csv');
   setNotice('CSV '+kind+' generado desde '+filtered.length+' sesiones filtradas.');
   setError('');
  }catch(e){setError(e instanceof Error?e.message:String(e));}
 }
 function exportAudit(){
  if(!filtered.length)return;
  try{
   downloadLocalReport(buildHistoryAuditReport(filtered,closures),
    'vision-ai-auditoria-'+timestamp+'.json','application/json;charset=utf-8');
   setNotice('Auditoría JSON generada solo con sesiones filtradas.');
   setError('');
  }catch(e){setError(e instanceof Error?e.message:String(e));}
 }
 async function remove(id:string){
  try{
   await sessionRepository.remove(id);
   setRecords(current=>current.filter(item=>item.id!==id));
   setCorruptIds(current=>current.filter(item=>item!==id));
   setSelected(v=>v===id?null:v);
   setPendingDelete(null);
   setNotice('Sesión eliminada del navegador.');setError('');
   window.dispatchEvent(new Event('vision-ai-sessions-updated'));
  }catch(e){
   setError(e instanceof Error?e.message:String(e));
  }
 }
 function clearFilters(){setQuery('');setScenario('');setMode('');
  setPeriod('all');setReviewStatus('all');setPage(1);}
 return <><LiveObservationsHistory onAnalyze={onAnalyze}/><section className="panel history-panel" aria-label="Historial persistente de simulaciones">
  <div className="panel-heading"><div><h2>Sesiones guardadas de las simulaciones</h2>
   <p>Resultados guardados en este navegador, sin grabaciones</p></div>
   <span className="status">{loading?'Cargando':records.length+' registros'}</span>
  </div>
  <div className="history-filters">
   <label>Buscar sesión
    <input type="search" value={query} placeholder="Identificador o escenario"
     onChange={e=>{setQuery(e.target.value);setPage(1);}}/>
   </label>
   <label>Escenario
    <select value={scenario} onChange={e=>{setScenario(e.target.value);setPage(1);}}>
     <option value="">Todos los escenarios</option>
     {SCENARIOS.map(s=><option key={s.id} value={s.id}>{s.label}</option>)}
    </select>
   </label>
   <label>Origen
    <select value={mode} onChange={e=>{setMode(e.target.value);setPage(1);}}>
     <option value="">Todos</option><option value="synthetic">Simulación</option>
     <option value="yolo">Reconocimiento de objetos</option>
    </select>
   </label>
   <label>Periodo
    <select aria-label="Periodo del historial" value={period}
     onChange={e=>{setPeriod(e.target.value as HistoryPeriod);setPage(1);}}>
     <option value="all">Todas las fechas</option>
     <option value="day">Últimas 24 horas</option>
     <option value="week">Últimos 7 días</option>
    </select>
   </label>
   <label>Revisión humana
    <select aria-label="Estado de revisión del historial" value={reviewStatus}
     onChange={e=>{setReviewStatus(e.target.value as HistoryReviewState);setPage(1);}}>
     <option value="all">Cualquier estado</option>
     <option value="open">Pendiente de revisión</option>
     <option value="closed">Revisado</option>
    </select>
   </label>
   <button type="button" disabled={!hasFilters} onClick={clearFilters}>Limpiar filtros</button>
  </div>
  {error&&<p className="session-history-error" role="alert">{error}</p>}
  {notice&&<p className="session-history-notice" role="status">{notice}</p>}
  <section className="history-report-summary" aria-label="Informe del historial filtrado">
   <div className="history-report-heading"><div>
    <span>INFORMES GUARDADOS</span><h3>Informe de sesiones y evidencias</h3>
    <p>Resultados guardados · sin imágenes ni videos</p>
   </div><small>{filtered.length} de {records.length} sesiones visibles</small></div>
   <div className="history-report-stats" aria-live="polite">
    <div><span>Sesiones</span><strong>{loading?'—':metrics.total}</strong></div>
    <div><span>Sesiones analizadas</span><strong>{loading?'—':metrics.yolo}</strong></div>
    <div><span>Objetos detectados</span><strong>{loading?'—':metrics.detections}</strong></div>
    <div><span>Por revisar</span><strong>{loading?'—':metrics.open}</strong></div>
    <div><span>Revisadas</span><strong>{loading?'—':metrics.closed}</strong></div>
    <div><span>Latencia media</span><strong>{metrics.meanInferenceMs===null?'—':metrics.meanInferenceMs.toFixed(1)+' ms'}</strong></div>
   </div>
   <div className="history-report-actions" aria-label="Exportaciones del historial">
    <button type="button" disabled={loading||!filtered.length} onClick={()=>exportCsv('sessions')}>
     Exportar sesiones CSV</button>
    <button type="button" disabled={loading||!filtered.length} onClick={()=>exportCsv('detections')}>
     Exportar detecciones CSV</button>
    <button type="button" disabled={loading||!filtered.length} onClick={()=>exportCsv('reviews')}>
     Exportar revisiones CSV</button>
    <button type="button" disabled={loading||!filtered.length} onClick={exportAudit}>
     Exportar auditoría JSON</button>
    <button type="button" disabled={loading||!filtered.length} onClick={()=>window.print()}>
     Imprimir informe</button>
   </div>
   <p className="history-report-caveat">Las exportaciones respetan los filtros.
    Puede haber cero objetos detectados. La confianza no equivale a precisión
    y una revisión humana no confirma infracciones.</p>
  </section>
  <section className="history-print-report" aria-label="Versión imprimible del informe">
   <h2>VISION-AI · Informe local de sesiones</h2>
   <p>Emisión: {timestamp} · Origen: este navegador · {metrics.total} sesiones filtradas</p>
   <p>Sesiones analizadas: {metrics.yolo} · Detecciones: {metrics.detections} ·
    Por revisar: {metrics.open} · Revisadas: {metrics.closed}</p>
   <table><thead><tr><th>Escenario</th><th>Sesiones</th></tr></thead>
    <tbody>{metrics.byScenario.map(item=><tr key={item.id}>
     <td>{SCENARIOS.find(s=>s.id===item.id)?.label}</td><td>{item.count}</td>
    </tr>)}</tbody></table>
   <h3>Registros incluidos</h3>
   <table><thead><tr><th>ID sesión</th><th>Escenario</th><th>Origen</th>
    <th>Guardado UTC</th><th>Detecciones</th></tr></thead>
    <tbody>{filtered.map(item=><tr key={item.id}>
     <td>{item.id}</td><td>{item.scenarioName}</td><td>{item.mode}</td>
     <td>{item.savedAt}</td><td>{item.inference?.detections.length??0}</td>
    </tr>)}</tbody></table>
   <p>Reporte informativo local; no almacena fotogramas, no mide exactitud,
    no declara infracciones ni fabrica detecciones. La huella de escena
    no acredita los píxeles originales del detector.</p>
  </section>
  {corruptIds.length>0&&<section className="session-history-integrity" role="alert"
   aria-label="Registros dañados o incompatibles">
   <h3>{corruptIds.length} registro(s) en revisión</h3>
   <p>Se han aislado entradas dañadas o incompatibles sin eliminarlas. Las sesiones válidas
    continúan disponibles. Puedes conservarlas o eliminar cada registro de forma expresa.</p>
   <div className="session-history-corrupt-list">
    {corruptIds.map(id=><div key={id}>
     <code>{id.length>24?id.slice(0,24)+'…':id}</code>
     <button type="button" onClick={()=>setPendingDelete(id)}>Revisar eliminación</button>
    </div>)}
   </div>
  </section>}
  <div className="table-scroll"><table>
   <caption>Registros guardados en este navegador, sin capturas de video</caption>
   <thead><tr><th scope="col">Sesión</th><th scope="col">Escenario</th>
    <th scope="col">Fecha</th><th scope="col">Origen</th><th scope="col">Acciones</th></tr></thead>
   <tbody>
    {rows.map(r=><tr key={r.id}>
     <td><code title={r.id}>{r.id.slice(0,8)}</code></td>
     <td>{r.scenarioName}</td>
     <td>{timeLabel(r.savedAt)}</td>
     <td><span className={'session-history-mode '+(r.mode==='yolo'?'is-yolo':'')}>
       {r.mode==='yolo'?'Reconocimiento de objetos':'Simulación visual'}</span></td>
     <td className="session-history-actions">
      <button type="button" aria-expanded={selected===r.id} onClick={()=>setSelected(v=>v===r.id?null:r.id)}>
       {selected===r.id?'Cerrar':'Ver detalle'}</button>
      <button type="button" onClick={()=>setPendingDelete(r.id)}>Eliminar</button>
     </td>
    </tr>)}
    {!loading&&!rows.length&&<tr><td colSpan={5}>
     <div className="history-empty"><span aria-hidden="true">◷</span>
      <h3>{filtered.length===0&&hasFilters?'No hay coincidencias':
       'Aún no has guardado sesiones'}</h3>
      <p>Abre un escenario 3D y utiliza «Guardar sesión». No es necesario cargar archivos.</p>
      <button type="button" onClick={onAnalyze}>Abrir simulaciones</button>
     </div>
    </td></tr>}
    {loading&&<tr><td colSpan={5}>Leyendo historial local…</td></tr>}
   </tbody>
  </table></div>
  <nav className="pagination" aria-label="Páginas del historial">
   <span aria-live="polite">{filtered.length} resultados</span>
   <button type="button" disabled={currentPage<=1} onClick={()=>setPage(p=>p-1)}>Anterior</button>
   <span>Página {currentPage} de {pages}</span>
   <button type="button" disabled={currentPage>=pages} onClick={()=>setPage(p=>p+1)}>Siguiente</button>
  </nav>
  {details&&<section className="session-history-detail" aria-label="Detalles de la sesión guardada">
   <div className="panel-heading"><h3>Detalle de la sesión {details.id.slice(0,8)}</h3>
    <button type="button" onClick={()=>setSelected(null)}>Cerrar detalle</button></div>
   <dl>
    <dt>Escenario</dt><dd>{details.scenarioName}</dd>
    <dt>Origen</dt><dd>{details.mode==='yolo'?'Objetos reconocidos en escena 3D':'Resultados de la escena virtual'}</dd>
    <dt>Tiempo simulado</dt><dd>{formatElapsed(details.source.elapsedMs)}</dd>
    <dt>Visualización</dt><dd>{details.source.graphics==='human'?'Personajes GLB':'Modo ligero'} · {details.source.camera}</dd>
    {details.inference&&<>
     <dt>Tipo de reconocimiento</dt><dd>{details.inference.model==='ppe'?'Protección personal':'Objetos generales'}</dd>
     <dt>Fotograma analizado</dt><dd>#{details.inference.frameNumber} · {new Date(details.inference.observedAtMs).toLocaleTimeString('es-PE')}</dd>
     <dt>Detecciones reales</dt><dd>{details.inference.detections.length}</dd>
     <dt>Tiempo de análisis</dt><dd>{Math.round(details.inference.inferenceMs)} ms</dd>
     <dt>Clases reconocidas</dt><dd>{details.inference.detections.length?
      details.inference.detections.map(d=>d.label+' ('+Math.round(d.confidence*100)+'%)').join(' · '):
      'Ninguna detección sobre el umbral'}</dd>
     <dt>Observaciones de protección</dt><dd>{details.inference.reviewLog.length} señales de revisión, no infracciones confirmadas</dd>
     <dt>Revisión humana</dt><dd>{detailReviews.length?detailReviews.map(item=>
      <div className="history-review-item" key={item.id}><strong>{item.label}</strong>
       <span>{item.decisionLabel??'Pendiente'}</span>
       {item.note&&<small>Nota local: {item.note}</small>}
      </div>):'Sin indicios para revisar'}</dd>
    </>}
   </dl>
   <div className="history-detail-export">
    <button type="button" onClick={()=>{
     try{downloadLocalReport(buildHistoryCsv('sessions',[details],closures),
       'vision-ai-sesion-'+timestamp+'.csv');
      setNotice('CSV individual generado.');setError('');
     }catch(e){setError(e instanceof Error?e.message:String(e));}
    }}>Exportar detalle CSV</button>
    <button type="button" onClick={()=>{
     try{downloadLocalReport(buildHistoryAuditReport([details],closures),
       'vision-ai-detalle-'+timestamp+'.json','application/json;charset=utf-8');
      setNotice('Auditoría individual generada.');setError('');
     }catch(e){setError(e instanceof Error?e.message:String(e));}
    }}>Exportar detalle JSON</button>
   </div>
   <p>Esta sesión conserva metadatos y resultados, no la imagen exacta ni una grabación.
    Se conservaron los resultados y la información de la sesión, no la imagen original.</p>
  </section>}
  {pendingDelete&&<div className="session-history-confirm" role="group" aria-label="Confirmar eliminación">
   <p>¿Eliminar permanentemente este registro del navegador? Esta acción no se puede deshacer.</p>
   <button type="button" onClick={()=>setPendingDelete(null)}>Cancelar</button>
   <button type="button" className="session-history-delete"
    onClick={()=>void remove(pendingDelete)}>Confirmar eliminación</button>
  </div>}
 </section></>;
}
