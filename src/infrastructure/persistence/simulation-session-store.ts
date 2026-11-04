import {validateSimulationSession} from '../../core/domain/simulation-session';
import type {SimulationSession} from '../../core/domain/simulation-session';
import type {SimulationSessionInspection,SimulationSessionRepository} from '../../core/ports/simulation-session-repository';
import {validateReviewClosure,validateReviewDecision} from '../../core/domain/review-closure';
import type {ReviewClosure,ReviewDecision} from '../../core/domain/review-closure';
const DB_NAME='vision-ai-simulation-sessions';
/** Migración de esquema físico: v1 -> v2 añade índice de escenario, sin alterar registros. */
const DB_VERSION=3;
const STORE='sessions';
const REVIEW_STORE='reviewClosures';
const MAX_SESSIONS=100;
const asError=(error:unknown)=>error instanceof Error?error:new Error(String(error));
/** Non-cryptographic deterministic signature: detects accidental scene/version mismatch. */
function requestValue<T>(request:IDBRequest<T>):Promise<T>{
 return new Promise((resolve,reject)=>{
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(request.error||Error('Error de acceso a IndexedDB.'));
 });
}
function transactionDone(tx:IDBTransaction):Promise<void>{
 return new Promise((resolve,reject)=>{
  tx.oncomplete=()=>resolve();
  tx.onerror=()=>reject(tx.error||Error('Error de escritura de IndexedDB.'));
  tx.onabort=()=>reject(tx.error||Error('Escritura cancelada: almacenamiento no confirmado.'));
 });
}
async function database():Promise<IDBDatabase>{
 if(typeof indexedDB==='undefined')throw Error('Este navegador no permite almacenamiento local IndexedDB.');
 return new Promise((resolve,reject)=>{
  const req=indexedDB.open(DB_NAME,DB_VERSION);
  req.onupgradeneeded=()=>{
   const db=req.result;
   // Migración aditiva: nunca se borra la colección ni se modifican los datos v1.
   const store=db.objectStoreNames.contains(STORE)?
    req.transaction!.objectStore(STORE):db.createObjectStore(STORE,{keyPath:'id'});
   if(!store.indexNames.contains('savedAt'))
    store.createIndex('savedAt','savedAt',{unique:false});
   if(!store.indexNames.contains('scenarioId'))
    store.createIndex('scenarioId','scenarioId',{unique:false});
   if(!db.objectStoreNames.contains(REVIEW_STORE)){
    const reviews=db.createObjectStore(REVIEW_STORE,{keyPath:['sessionId','eventId']});
    reviews.createIndex('sessionId','sessionId',{unique:false});
   }
  };
  let blocked=false;
  req.onsuccess=()=>{
   if(blocked){req.result.close();return;}
   resolve(req.result);
  };
  req.onerror=()=>reject(req.error?.name==='VersionError'?
   Error('La versión del historial es más reciente que esta aplicación. No se modificaron los datos.'):
   req.error||Error('No se pudo abrir el historial local.'));
  req.onblocked=()=>{
   blocked=true;
   reject(Error('Otra pestaña bloquea la actualización del historial. Ciérrala y reintenta.'));
  };
 });
}
/**
 * Revisa todos los registros sin modificarlos: los corruptos se aíslan de la
 * consulta normal, pero siguen en IndexedDB hasta que el usuario decida eliminarlos.
 */
export async function inspectSimulationSessions():Promise<SimulationSessionInspection>{
 const db=await database();
 try{
  const tx=db.transaction(STORE,'readonly');
  const done=transactionDone(tx);
  const result=await requestValue(tx.objectStore(STORE).getAll());
  await done;
  const records:SimulationSession[]=[];
  const corruptIds:string[]=[];
  for(const item of result){
   try{
    validateSimulationSession(item);
    records.push(item);
   }catch{
    const raw=item as {id?:unknown}|null;
    corruptIds.push(raw&&typeof raw.id==='string'?raw.id:'ID no disponible');
   }
  }
  return {records:records.sort((a,b)=>b.savedAt.localeCompare(a.savedAt)),
   corruptIds};
 }finally{db.close();}
}
export async function listSimulationSessions():Promise<SimulationSession[]>{
 const check=await inspectSimulationSessions();
 return [...check.records];
}
export async function saveSimulationSession(record:SimulationSession):Promise<void>{
 validateSimulationSession(record);
 const db=await database();
 try{
  const tx=db.transaction(STORE,'readwrite');
  const done=transactionDone(tx);
  const store=tx.objectStore(STORE);
  const count=await requestValue(store.count());
  if(count>=MAX_SESSIONS){
   tx.abort();
   await done.catch(()=>{});
   throw Error('Se alcanzó el límite de 100 sesiones. Elimina una anterior y reintenta.');
  }
  const existing=await requestValue(store.getKey(record.id));
  if(existing!==undefined){
   tx.abort();await done.catch(()=>{});
   throw Error('Identificador duplicado. No se sobrescribió el registro existente.');
  }
  store.add(record);
  await done; // No afirmar éxito antes de confirmar la transacción completa.
 }catch(error){
  const err=asError(error);
  if(err.name==='QuotaExceededError')throw Error('Espacio local insuficiente. No se guardó la sesión.');
  throw err;
 }finally{db.close();}
}
/** Consulta de revisiones humanas separadas de la evidencia YOLO inmutable. */
export async function listReviewClosures():Promise<ReviewClosure[]>{
 const db=await database();
 try{
  const tx=db.transaction(REVIEW_STORE,'readonly');
  const done=transactionDone(tx);
  const result=await requestValue(tx.objectStore(REVIEW_STORE).getAll());
  await done;
  for(const row of result)validateReviewClosure(row);
  return result as ReviewClosure[];
 }finally{db.close();}
}
/** Cierre atómico e idempotente: valida sesión e indicio antes de escribir. */
export async function closeReview(sessionId:string,eventId:string,
 decision:ReviewDecision='reviewed',note=''):Promise<boolean>{
 if(!sessionId||!eventId)throw Error('Selecciona un indicio válido para revisar.');
 if(typeof note!=='string')throw Error('Nota de revisión inválida.');
 const cleanNote=note.trim();
 validateReviewDecision(decision,cleanNote);
 const db=await database();
 try{
  const tx=db.transaction([STORE,REVIEW_STORE],'readwrite');
  const done=transactionDone(tx);
  const sessions=tx.objectStore(STORE),reviews=tx.objectStore(REVIEW_STORE);
  try{
   const session=await requestValue(sessions.get(sessionId));
   if(!session)throw Error('La sesión ya no existe.');
   validateSimulationSession(session);
   if(!session.inference?.reviewLog.some(x=>x.id===eventId))
    throw Error('El indicio no pertenece a esta sesión.');
   const existing=await requestValue(reviews.get([sessionId,eventId]));
   if(existing){await done;return false;}
   reviews.add({sessionId,eventId,closedAt:new Date().toISOString(),decision,
    ...(cleanNote?{note:cleanNote}:{})} satisfies ReviewClosure);
   await done;
   return true;
  }catch(e){
   try{tx.abort();}catch{/* ya finalizada */}
   await done.catch(()=>{});
   throw e;
  }
 }finally{db.close();}
}
export async function deleteSimulationSession(id:string):Promise<void>{
 if(!id)throw Error('Identificador de sesión vacío.');
 const db=await database();
 try{
  const tx=db.transaction([STORE,REVIEW_STORE],'readwrite');
  const done=transactionDone(tx);
  tx.objectStore(STORE).delete(id);
  const cursor=tx.objectStore(REVIEW_STORE).index('sessionId').openCursor(IDBKeyRange.only(id));
  cursor.onsuccess=()=>{
   const item=cursor.result;
   if(item){item.delete();item.continue();}
  };
  await done;
 }finally{db.close();}
}

export const simulationSessionRepository:SimulationSessionRepository={
 inspect:inspectSimulationSessions,
 listReviewClosures,
 closeReview,
 save:saveSimulationSession,
 list:listSimulationSessions,
 remove:deleteSimulationSession
};
