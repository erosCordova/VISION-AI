/**
 * Fase 7. Sesiones reproducibles de las cuatro simulaciones 3D.
 * La evidencia local conserva metadatos, predicciones e indicios, NUNCA fotogramas crudos.
 * IndexedDB confirma cada escritura antes de indicar "Guardada".
 */
import type {Detection} from '../../core/domain/model';
import {simulationSnapshot,validScenario} from '../../modules/live/simulation-engine';
import type {ScenarioKey,SimSnapshot} from '../../modules/live/simulation-engine';
import type {CameraView} from '../../modules/live/scene-math';
import type {YoloFamily} from '../../modules/live/yolo-browser';
import type {YoloTelemetry,YoloReviewIncident} from '../../modules/live/yolo-telemetry';

export const SESSION_SCHEMA=1;
export const SCENE_VERSION='vision-ai-3d-simulation-v1';
const DB_NAME='vision-ai-simulation-sessions';
const STORE='sessions';
const MAX_SESSIONS=100;
export interface SimulationSession {
 readonly schemaVersion:1;
 readonly id:string;
 readonly savedAt:string;
 readonly scenarioId:ScenarioKey;
 readonly scenarioName:string;
 readonly mode:'synthetic'|'yolo';
 readonly source:{
  readonly kind:'simulation-3d';
  readonly sceneVersion:typeof SCENE_VERSION;
  readonly elapsedMs:number;
  readonly graphics:'human'|'light';
  readonly camera:CameraView;
  readonly fingerprint:string;
  readonly syntheticEvent:string;
  readonly syntheticObjectCount:number;
 };
 readonly inference:null|{
  readonly model:YoloFamily;
  readonly modelLabel:string;
  readonly frameNumber:number;
  readonly observedAtMs:number;
  readonly inferenceMs:number;
  readonly detections:readonly Detection[];
  readonly reviewLog:readonly YoloReviewIncident[];
 };
}
export interface SessionInput{
 readonly scenarioId:ScenarioKey;
 readonly scenarioName:string;
 readonly elapsed:number;
 readonly graphics:'human'|'light';
 readonly camera:CameraView;
 readonly mode:'synthetic'|'yolo';
 readonly telemetry:YoloTelemetry;
}
const asError=(error:unknown)=>error instanceof Error?error:new Error(String(error));
/** Non-cryptographic deterministic signature: detects accidental scene/version mismatch. */
export function snapshotFingerprint(s:SimSnapshot,elapsedMs:number):string{
 const text=JSON.stringify({sceneVersion:SCENE_VERSION,scenario:s.scenarioId,elapsedMs,
  entities:s.entities.map(e=>[e.id,e.kind,e.x,e.y,e.width,e.height,e.state,e.segment]),
  zones:s.zones.map(z=>[z.label,z.x,z.y,z.width,z.height]),
  count:s.count,event:s.event,alert:s.alert});
 let result=2166136261;
 for(let i=0;i<text.length;i++){result=Math.imul(result^text.charCodeAt(i),16777619);}
 return (result>>>0).toString(16).padStart(8,'0');
}
export function buildSimulationSession(input:SessionInput,clock=new Date(),id=crypto.randomUUID()):SimulationSession{
 if(!validScenario(input.scenarioId))throw Error('Escenario de simulación desconocido.');
 if(!Number.isFinite(input.elapsed)||input.elapsed<0||input.elapsed>3600)
  throw Error('Tiempo de simulación inválido.');
 if(!['synthetic','yolo'].includes(input.mode))throw Error('Modo de sesión inválido.');
 if(!['human','light'].includes(input.graphics))throw Error('Calidad de escena desconocida.');
 if(!['isometric','frontal','superior','persona'].includes(input.camera))
  throw Error('Cámara no soportada.');
 if(!Number.isFinite(clock.getTime()))throw Error('Fecha de guardado inválida.');
 const elapsedMs=Math.round(input.elapsed*1000);
 const sample=simulationSnapshot(input.scenarioId,elapsedMs/1000);
 const observation=input.telemetry.observations.at(-1)??null;
 if(input.mode==='yolo' && (!observation||input.telemetry.phase==='failed'))
  throw Error('Primero ejecuta YOLO y procesa al menos un fotograma antes de guardar su resultado.');
 const inference=input.mode==='yolo'&&observation?{
  model:observation.model,
  modelLabel:observation.model==='ppe'?'YOLOv8s EPP':'YOLOv8n COCO',
  frameNumber:observation.frameNumber,
  observedAtMs:observation.capturedAtMs,
  inferenceMs:observation.inferenceMs,
  detections:observation.detections.map(d=>({...d,box:{...d.box}})),
  reviewLog:input.telemetry.reviewLog.map(x=>({...x}))
 }:null;
 const record:SimulationSession={schemaVersion:1,id,savedAt:clock.toISOString(),
  scenarioId:input.scenarioId,scenarioName:input.scenarioName,mode:input.mode,
  source:{kind:'simulation-3d',sceneVersion:SCENE_VERSION,elapsedMs,
   graphics:input.graphics,camera:input.camera,fingerprint:snapshotFingerprint(sample,elapsedMs),
   syntheticEvent:sample.event,syntheticObjectCount:sample.entities.length},
  inference};
 validateSimulationSession(record);
 return record;
}
export function validateSimulationSession(candidate:unknown):asserts candidate is SimulationSession{
 if(!candidate||typeof candidate!=='object')throw Error('Registro de sesión corrupto.');
 const r=candidate as SimulationSession;
 if(r.schemaVersion!==SESSION_SCHEMA||!r.id||!r.savedAt||!Number.isFinite(Date.parse(r.savedAt))||
  !validScenario(r.scenarioId)||!['synthetic','yolo'].includes(r.mode)||!r.source||
  r.source.kind!=='simulation-3d'||r.source.sceneVersion!==SCENE_VERSION||
  !Number.isFinite(r.source.elapsedMs)||r.source.elapsedMs<0||r.source.elapsedMs>3_600_000||
  !['human','light'].includes(r.source.graphics)||
  !['isometric','frontal','superior','persona'].includes(r.source.camera)||
  typeof r.source.syntheticEvent!=='string'||!Number.isInteger(r.source.syntheticObjectCount)||
  typeof r.source.fingerprint!=='string')
  throw Error('Registro de sesión incompatible con el esquema.');
 const snapshot=simulationSnapshot(r.scenarioId,r.source.elapsedMs/1000);
 if(r.source.fingerprint!==snapshotFingerprint(snapshot,r.source.elapsedMs)||
   r.source.syntheticEvent!==snapshot.event||
   r.source.syntheticObjectCount!==snapshot.entities.length)
  throw Error('La fuente de simulación fue alterada o no coincide con su versión.');
 if(r.mode==='yolo' && (!r.inference||!Number.isInteger(r.inference.frameNumber)||
  r.inference.frameNumber<1||!Array.isArray(r.inference.detections)||
  !['ppe','coco'].includes(r.inference.model)||
  !Number.isFinite(r.inference.inferenceMs)||r.inference.inferenceMs<0||
  !Array.isArray(r.inference.reviewLog)))
  throw Error('La sesión YOLO no contiene predicciones verificables.');
 if(r.mode==='synthetic'&&r.inference!==null)
  throw Error('Una simulación visual no puede afirmar inferencia YOLO.');
 if(r.inference){
  for(const d of r.inference.detections){
   if(!d||typeof d.classId!=='string'||typeof d.label!=='string'||
    !Number.isFinite(d.confidence)||d.confidence<0||d.confidence>1||!d.box||
    [d.box.x,d.box.y,d.box.width,d.box.height].some(x=>!Number.isFinite(x))||
    d.box.x<0||d.box.y<0||d.box.width<=0||d.box.height<=0||
    d.box.x+d.box.width>1.00001||d.box.y+d.box.height>1.00001)
    throw Error('La sesión contiene detecciones YOLO dañadas.');
  }
 }
}
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
/** Función pura para reproducibilidad de Fase 7: misma entrada -> mismo resultado visual. */
export function sameScenarioSnapshot(scenario:ScenarioKey,timeMs:number):boolean{
 const a=simulationSnapshot(scenario,timeMs/1000),b=simulationSnapshot(scenario,timeMs/1000);
 return snapshotFingerprint(a,timeMs)===snapshotFingerprint(b,timeMs);
}
