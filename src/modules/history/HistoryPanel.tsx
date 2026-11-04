import {useEffect,useMemo,useState} from 'react';
import type {SimulationSessionRepository} from '../../core/ports/simulation-session-repository';
import {validateReproducibility} from '../live/simulation-session-model';
import type {SimulationSession} from '../../core/domain/simulation-session';

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
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [query,setQuery]=useState('');
 const [scenario,setScenario]=useState('');
 const [mode,setMode]=useState('');
 const [page,setPage]=useState(1);
 const [selected,setSelected]=useState<string|null>(null);
 const [pendingDelete,setPendingDelete]=useState<string|null>(null);
 const [notice,setNotice]=useState('');
 useEffect(()=>{
  let alive=true;
  const load=async()=>{
   try{
    const inspection=await sessionRepository.inspect();
    const valid:SimulationSession[]=[];
    const corrupt=[...inspection.corruptIds];
    for(const record of inspection.records){
     try{validateReproducibility(record);valid.push(record);}
     catch{corrupt.push(record.id);}
    }
    if(alive){setRecords(valid);setCorruptIds([...new Set(corrupt)]);setError('');}
   }catch(e){
    if(alive)setError(e instanceof Error?e.message:String(e));
   }finally{if(alive)setLoading(false);}
  };
  void load();
  const refresh=()=>{void load();};
  window.addEventListener('vision-ai-sessions-updated',refresh);
  return()=>{alive=false;window.removeEventListener('vision-ai-sessions-updated',refresh);};
 },[sessionRepository]);
 const filtered=useMemo(()=>records.filter(r=>{
  const search=query.trim().toLowerCase();
  return (!search||(r.id+' '+r.scenarioName+' '+r.mode).toLowerCase().includes(search))&&
   (!scenario||r.scenarioId===scenario)&&(!mode||r.mode===mode);
 }),[records,query,scenario,mode]);
 const pages=Math.max(1,Math.ceil(filtered.length/perPage));
 const currentPage=Math.min(page,pages);
 const rows=filtered.slice((currentPage-1)*perPage,currentPage*perPage);
 const details=records.find(item=>item.id===selected)??null;
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
 function clearFilters(){setQuery('');setScenario('');setMode('');setPage(1);}
 return <section className="panel history-panel" aria-label="Historial persistente de simulaciones">
  <div className="panel-heading"><div><h2>Sesiones guardadas de las simulaciones</h2>
   <p>IndexedDB local · sin videos ni fotogramas almacenados</p></div>
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
     <option value="yolo">YOLO real</option>
    </select>
   </label>
   <button type="button" disabled={!query&&!scenario&&!mode} onClick={clearFilters}>Limpiar filtros</button>
  </div>
  {error&&<p className="session-history-error" role="alert">{error}</p>}
  {notice&&<p className="session-history-notice" role="status">{notice}</p>}
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
       {r.mode==='yolo'?'YOLO real':'Simulación visual'}</span></td>
     <td className="session-history-actions">
      <button type="button" aria-expanded={selected===r.id} onClick={()=>setSelected(v=>v===r.id?null:r.id)}>
       {selected===r.id?'Cerrar':'Ver detalle'}</button>
      <button type="button" onClick={()=>setPendingDelete(r.id)}>Eliminar</button>
     </td>
    </tr>)}
    {!loading&&!rows.length&&<tr><td colSpan={5}>
     <div className="history-empty"><span aria-hidden="true">◷</span>
      <h3>{filtered.length===0&&(query||scenario||mode)?'No hay coincidencias':
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
    <dt>Origen</dt><dd>{details.mode==='yolo'?'Detecciones YOLO del simulador':'Eventos sintéticos de la simulación'}</dd>
    <dt>Tiempo simulado</dt><dd>{formatElapsed(details.source.elapsedMs)}</dd>
    <dt>Visualización</dt><dd>{details.source.graphics==='human'?'Personajes GLB':'Modo ligero'} · {details.source.camera}</dd>
    <dt>Versión de la fuente</dt><dd>{details.source.sceneVersion}</dd>
    <dt>Huella reproducible</dt><dd><code>{details.source.fingerprint}</code></dd>
    <dt>Objetos geométricos</dt><dd>{details.source.syntheticObjectCount} · referencia simulada, no YOLO</dd>
    {details.inference&&<>
     <dt>Modelo</dt><dd>{details.inference.modelLabel}</dd>
     <dt>Fotograma analizado</dt><dd>#{details.inference.frameNumber} · {new Date(details.inference.observedAtMs).toLocaleTimeString('es-PE')}</dd>
     <dt>Detecciones reales</dt><dd>{details.inference.detections.length}</dd>
     <dt>Latencia ONNX</dt><dd>{Math.round(details.inference.inferenceMs)} ms</dd>
     <dt>Clases reconocidas</dt><dd>{details.inference.detections.length?
      details.inference.detections.map(d=>d.label+' ('+Math.round(d.confidence*100)+'%)').join(' · '):
      'Ninguna detección sobre el umbral'}</dd>
     <dt>Indicios EPP</dt><dd>{details.inference.reviewLog.length} señales de revisión, no infracciones confirmadas</dd>
    </>}
   </dl>
   <p>Esta sesión conserva metadatos y resultados, no la imagen exacta ni una grabación.
    La huella identifica el estado determinista del escenario, no certifica los píxeles de una inferencia YOLO.</p>
  </section>}
  {pendingDelete&&<div className="session-history-confirm" role="group" aria-label="Confirmar eliminación">
   <p>¿Eliminar permanentemente este registro del navegador? Esta acción no se puede deshacer.</p>
   <button type="button" onClick={()=>setPendingDelete(null)}>Cancelar</button>
   <button type="button" className="session-history-delete"
    onClick={()=>void remove(pendingDelete)}>Confirmar eliminación</button>
  </div>}
 </section>;
}
