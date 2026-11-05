import {useEffect,useMemo,useState} from 'react';
import type {SimulationSessionRepository} from '../../../core/ports/simulation-session-repository';
import type {SimulationSession} from '../../../core/domain/simulation-session';
import {REVIEW_DECISIONS} from '../../../core/domain/review-closure';
import type {ReviewClosure,ReviewDecision} from '../../../core/domain/review-closure';
import {validateReproducibility} from '../../scenarios/services/simulation-session-model';
import {collectReviewItems} from '../services/review-state';

type Status='all'|'open'|'closed';
type Scenario='all'|'safety'|'quality'|'retail'|'warehouse';
const DATE_FORMAT={dateStyle:'short',timeStyle:'short'} as const;
const labels:Record<string,string>={
 safety:'Seguridad industrial',quality:'Manufactura',retail:'Retail',warehouse:'Logística'
};
export function OperationsPanel({repository,onHistory}:{
 readonly repository:SimulationSessionRepository;readonly onHistory:()=>void
}){
 const [sessions,setSessions]=useState<readonly SimulationSession[]>([]);
 const [closures,setClosures]=useState<readonly ReviewClosure[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [status,setStatus]=useState<Status>('all');
 const [scenario,setScenario]=useState<Scenario>('all');
 const [busy,setBusy]=useState<string|null>(null);
 const [decisionById,setDecisionById]=useState<Record<string,ReviewDecision>>({});
 const [noteById,setNoteById]=useState<Record<string,string>>({});
 useEffect(()=>{
  let mounted=true;
  const refresh=async()=>{
   try{
    const [all,reviews]=await Promise.all([repository.list(),repository.listReviewClosures()]);
    const valid=all.filter(x=>{try{validateReproducibility(x);return true;}catch{return false;}});
    if(mounted){setSessions(valid);setClosures(reviews);setError('');}
   }catch(e){if(mounted)setError(e instanceof Error?e.message:String(e));}
   finally{if(mounted)setLoading(false);}
  };
  void refresh();
  const onSessions=()=>{void refresh();};
  window.addEventListener('vision-ai-sessions-updated',onSessions);
  return()=>{mounted=false;window.removeEventListener('vision-ai-sessions-updated',onSessions);};
 },[repository]);
 const all=useMemo(()=>collectReviewItems(sessions,closures),[sessions,closures]);
 const pending=all.filter(x=>x.status==='open').length;
 const reviewed=all.length-pending;
 const filtered=all.filter(x=>(status==='all'||x.status===status)&&
  (scenario==='all'||x.scenarioId===scenario));
 async function close(sessionId:string,eventId:string,id:string){
  if(busy!==null)return;
  setBusy(id);setError('');setNotice('');
  try{
   const choice=decisionById[id]??'inconclusive';
   const note=(noteById[id]??'').trim();
   const changed=await repository.closeReview(sessionId,eventId,choice,note);
   const updated=await repository.listReviewClosures();
   setClosures(updated);
   setNotice(changed?'Decisión registrada. La evidencia original permanece intacta.':
    'Este indicio ya estaba revisado; no se ha contado de nuevo.');
   window.dispatchEvent(new Event('vision-ai-reviews-updated'));
  }catch(e){setError(e instanceof Error?e.message:String(e));}
  finally{setBusy(null);}
 }
 return <section className="panel operations-review" aria-label="Revisión de observaciones de seguridad">
  <div className="panel-heading"><div>
   <h2>Revisión de observaciones</h2>
   <p>Posibles faltas de protección · revisión manual</p>
  </div><span className="status">{loading?'Leyendo…':all.length+' indicios'}</span></div>
  <div className="operations-review-stats" aria-live="polite">
   <div><span>Sin revisar</span><strong>{loading?'—':pending}</strong></div>
   <div><span>Revisados</span><strong>{loading?'—':reviewed}</strong></div>
   <div><span>Total de indicios</span><strong>{loading?'—':all.length}</strong></div>
  </div>
  <div className="operations-review-filters">
   <label>Estado
    <select aria-label="Filtrar indicios por estado" value={status}
     onChange={e=>setStatus(e.target.value as Status)}>
     <option value="all">Todos</option><option value="open">Sin revisar</option>
     <option value="closed">Revisados</option>
    </select>
   </label>
   <label>Escenario
    <select aria-label="Filtrar indicios por escenario" value={scenario}
     onChange={e=>setScenario(e.target.value as Scenario)}>
     <option value="all">Todos los escenarios</option>
     {Object.entries(labels).map(([id,label])=><option key={id} value={id}>{label}</option>)}
    </select>
   </label>
   <button type="button" onClick={onHistory}>Consultar historial</button>
  </div>
  {error&&<p className="session-history-error" role="alert">{error}</p>}
  {notice&&<p className="session-history-notice" role="status">{notice}</p>}
  {loading?<p className="operations-review-empty">Leyendo las revisiones guardadas…</p>:
   filtered.length===0?<div className="operations-review-empty">
    <h3>{all.length===0?'No hay indicios guardados':'No hay indicios con estos filtros'}</h3>
    <p>Las observaciones aparecen aquí cuando guardas un análisis con señales repetidas de falta de protección.</p>
   </div>:
   <div className="operations-review-list">
    {filtered.map(item=><article className="operations-review-item" key={item.id}>
     <div className="operations-review-main">
      <div className="operations-review-top"><strong>{item.label}</strong>
       <span className={'operations-review-state '+(item.status==='closed'?'is-closed':'is-open')}>
        {item.status==='closed'?'Revisado':'Sin revisar'}</span></div>
      <p>{labels[item.scenarioId]} · sesión {item.sessionId.slice(0,8)}</p>
      <div className="operations-review-meta">
       <span>{new Date(item.evidenceAt).toLocaleString('es-PE',DATE_FORMAT)}</span>
       <span>Fotograma #{item.frameNumber}</span>
       <span>{item.supportingFrames} lecturas</span>
       <span>Confianza máxima {Math.round(item.confidence*100)} %</span>
      </div>
      {item.closedAt&&<div className="operations-review-decision">
       <small>Revisado el {new Date(item.closedAt).toLocaleString('es-PE',DATE_FORMAT)}</small>
       <strong>{item.decisionLabel}</strong>
       {item.note&&<p>Nota local: {item.note}</p>}
      </div>}
     </div>
     {item.status==='open'?
      <div className="operations-review-decision-form">
       <label>Resultado de la revisión humana
        <select aria-label={'Resultado de revisión '+item.eventId}
         value={decisionById[item.id]??'inconclusive'}
         onChange={e=>setDecisionById(previous=>({...previous,
          [item.id]:e.target.value as ReviewDecision}))}>
         <option value="inconclusive">{REVIEW_DECISIONS.inconclusive}</option>
         <option value="follow_up">{REVIEW_DECISIONS.follow_up}</option>
         <option value="dismissed">{REVIEW_DECISIONS.dismissed}</option>
        </select>
       </label>
       <label>Nota opcional (máximo 240 caracteres)
        <textarea aria-label={'Nota de revisión '+item.eventId} maxLength={240}
         value={noteById[item.id]??''} placeholder="Hechos observados, sin datos personales"
         onChange={e=>setNoteById(previous=>({...previous,[item.id]:e.target.value}))}/>
       </label>
       <button type="button" disabled={busy!==null}
        onClick={()=>void close(item.sessionId,item.eventId,item.id)}>
        {busy===item.id?'Guardando…':'Marcar como revisado'}
       </button>
      </div>:
      <span className="operations-review-done">Decisión conservada</span>}
    </article>)}
   </div>}
  <p className="operations-review-disclaimer">
   Cada decisión es una acción humana local; no confirma incumplimientos ni
   identifica personas. No escribas datos personales en las notas.
   Las detecciones originales no se modifican. Los estados se guardan
   únicamente en este navegador.
  </p>
 </section>;
}
