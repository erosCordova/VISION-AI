import {SESSION_SCHEMA,validateSimulationSession} from '../../core/domain/simulation-session';
import type {SimulationSession} from '../../core/domain/simulation-session';
import type {SimulationSessionRepository} from '../../core/ports/simulation-session-repository';
const DB_NAME='vision-ai-simulation-sessions';
const STORE='sessions';
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
  const req=indexedDB.open(DB_NAME,SESSION_SCHEMA);
  req.onupgradeneeded=()=>{
   const db=req.result;
   if(!db.objectStoreNames.contains(STORE)){
    const store=db.createObjectStore(STORE,{keyPath:'id'});
    store.createIndex('savedAt','savedAt',{unique:false});
   }
  };
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error||Error('No se pudo abrir el historial local.'));
  req.onblocked=()=>reject(Error('Otra pestaña bloquea la actualización del historial. Ciérrala y reintenta.'));
 });
}
export async function listSimulationSessions():Promise<SimulationSession[]>{
 const db=await database();
 try{
  const tx=db.transaction(STORE,'readonly');
  const done=transactionDone(tx);
  const result=await requestValue(tx.objectStore(STORE).getAll());
  await done;
  for(const record of result)validateSimulationSession(record);
  return (result as SimulationSession[]).sort((a,b)=>b.savedAt.localeCompare(a.savedAt));
 }finally{db.close();}
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
export async function deleteSimulationSession(id:string):Promise<void>{
 if(!id)throw Error('Identificador de sesión vacío.');
 const db=await database();
 try{
  const tx=db.transaction(STORE,'readwrite');
  const done=transactionDone(tx);
  tx.objectStore(STORE).delete(id);
  await done;
 }finally{db.close();}
}

export const simulationSessionRepository:SimulationSessionRepository={
 save:saveSimulationSession,
 list:listSimulationSessions,
 remove:deleteSimulationSession
};
