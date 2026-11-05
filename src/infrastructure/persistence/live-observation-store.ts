import type {LiveObservation} from '../../core/domain/live-observation';
import {validateLiveObservation} from '../../core/domain/live-observation';
import type {LiveObservationRepository} from '../../core/ports/live-observation-repository';

const NAME='vision-ai-live-observations';
const STORE='observations';
const MAX_RECORDS=100;
const errorMessage=(e:unknown)=>e instanceof Error?e.message:String(e);

function request<T>(r:IDBRequest<T>):Promise<T>{
 return new Promise((resolve,reject)=>{
  r.onsuccess=()=>resolve(r.result);
  r.onerror=()=>reject(r.error??Error('No se pudo leer el historial.'));
 });
}
function completed(tx:IDBTransaction):Promise<void>{
 return new Promise((resolve,reject)=>{
  tx.oncomplete=()=>resolve();
  tx.onabort=()=>reject(tx.error??Error('No se confirmó el guardado.'));
  tx.onerror=()=>reject(tx.error??Error('Error al guardar en el navegador.'));
 });
}
async function open():Promise<IDBDatabase>{
 if(typeof indexedDB==='undefined')throw Error('Tu navegador no permite guardar observaciones localmente.');
 return new Promise((resolve,reject)=>{
  const q=indexedDB.open(NAME,1);
  q.onupgradeneeded=()=>{
   const db=q.result;
   if(!db.objectStoreNames.contains(STORE)){
    const s=db.createObjectStore(STORE,{keyPath:'id'});
    s.createIndex('savedAt','savedAt');
   }
  };
  q.onsuccess=()=>resolve(q.result);
  q.onerror=()=>reject(q.error??Error('No se pudo abrir el historial de cámaras.'));
  q.onblocked=()=>reject(Error('Otra pestaña mantiene abierto el historial. Cierra esa pestaña y reintenta.'));
 });
}
function inform(){window.dispatchEvent(new Event('vision-ai-live-updated'));}
export async function listLiveObservations():Promise<LiveObservation[]>{
 const db=await open();
 try{
  const tx=db.transaction(STORE,'readonly'),done=completed(tx);
  const raw=await request(tx.objectStore(STORE).getAll());await done;
  const valid:LiveObservation[]=[];
  for(const item of raw){validateLiveObservation(item);valid.push(item);}
  return valid.sort((a,b)=>b.savedAt.localeCompare(a.savedAt));
 }finally{db.close();}
}
export async function saveLiveObservation(record:LiveObservation):Promise<void>{
 validateLiveObservation(record);
 const db=await open();
 try{
  const tx=db.transaction(STORE,'readwrite'),done=completed(tx),s=tx.objectStore(STORE);
  const count=await request(s.count());
  if(count>=MAX_RECORDS){
   tx.abort();await done.catch(()=>{});
   throw Error('Hay 100 observaciones guardadas. Elimina una anterior para continuar.');
  }
  const existing=await request(s.getKey(record.id));
  if(existing!==undefined){tx.abort();await done.catch(()=>{});throw Error('Este análisis ya está guardado.');}
  s.add(record);
  await done;
  inform();
 }catch(e){
  if(e instanceof DOMException&&e.name==='QuotaExceededError')
   throw Error('El navegador no tiene espacio para guardar esta observación.');
  throw Error(errorMessage(e));
 }finally{db.close();}
}
export async function deleteLiveObservation(id:string):Promise<void>{
 if(!id)throw Error('Selecciona una observación válida.');
 const db=await open();
 try{
  const tx=db.transaction(STORE,'readwrite'),done=completed(tx);
  tx.objectStore(STORE).delete(id);
  await done;inform();
 }finally{db.close();}
}
export async function eraseLiveObservations():Promise<number>{
 const db=await open();
 try{
  const tx=db.transaction(STORE,'readwrite'),done=completed(tx),s=tx.objectStore(STORE);
  const count=await request(s.count());
  s.clear();await done;inform();return count;
 }finally{db.close();}
}
export async function purgeLiveObservations(days:30|90|180,now=Date.now()):Promise<number>{
 const threshold=now-days*86400000;
 const db=await open();
 try{
  const tx=db.transaction(STORE,'readwrite'),done=completed(tx),s=tx.objectStore(STORE);
  const records=await request(s.getAll());
  let count=0;
  for(const raw of records){
   validateLiveObservation(raw);
   if(Date.parse(raw.savedAt)<threshold){s.delete(raw.id);count++;}
  }
  await done;
  if(count)inform();
  return count;
 }finally{db.close();}
}

export const liveObservationRepository:LiveObservationRepository={
 list:listLiveObservations,
 save:saveLiveObservation,
 remove:deleteLiveObservation,
 eraseAll:eraseLiveObservations,
 purgeExpired:purgeLiveObservations
};
