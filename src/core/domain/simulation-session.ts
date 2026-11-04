/** Contrato independiente de UI para la Fase 7; sin imágenes/video almacenados. */
import type {Detection} from './model';
export type SessionScenario='safety'|'quality'|'retail'|'warehouse';
export type SessionCamera='isometric'|'frontal'|'superior'|'persona';
export type SessionModel='ppe'|'coco';
export const SESSION_SCHEMA=1;
export const SCENE_VERSION='vision-ai-3d-simulation-v1';
export interface ReviewEvidence{
 readonly id:string;readonly classId:string;readonly label:string;
 readonly observedAtMs:number;readonly frameNumber:number;
 readonly supportingFrames:number;readonly maxConfidence:number;
}
export interface SimulationSession{
 readonly schemaVersion:1;readonly id:string;readonly savedAt:string;
 readonly scenarioId:SessionScenario;readonly scenarioName:string;
 readonly mode:'synthetic'|'yolo';
 readonly source:{
  readonly kind:'simulation-3d';readonly sceneVersion:typeof SCENE_VERSION;
  readonly elapsedMs:number;readonly graphics:'human'|'light';
  readonly camera:SessionCamera;readonly fingerprint:string;
  readonly syntheticEvent:string;readonly syntheticObjectCount:number;
 };
 readonly inference:null|{
  readonly model:SessionModel;readonly modelLabel:string;
  readonly frameNumber:number;readonly observedAtMs:number;readonly inferenceMs:number;
  readonly detections:readonly Detection[];readonly reviewLog:readonly ReviewEvidence[];
 };
}
export function validateSimulationSession(candidate:unknown):asserts candidate is SimulationSession{
 if(!candidate||typeof candidate!=='object')throw Error('Registro de sesión corrupto.');
 const r=candidate as SimulationSession;
 if(r.schemaVersion!==SESSION_SCHEMA||typeof r.id!=='string'||!r.id||
  !r.savedAt||!Number.isFinite(Date.parse(r.savedAt))||
  !['safety','quality','retail','warehouse'].includes(r.scenarioId)||
  !['synthetic','yolo'].includes(r.mode)||!r.source||
  r.source.kind!=='simulation-3d'||r.source.sceneVersion!==SCENE_VERSION||
  !Number.isInteger(r.source.elapsedMs)||r.source.elapsedMs<0||r.source.elapsedMs>3_600_000||
  !['human','light'].includes(r.source.graphics)||
  !['isometric','frontal','superior','persona'].includes(r.source.camera)||
  typeof r.source.syntheticEvent!=='string'||!Number.isInteger(r.source.syntheticObjectCount)||
  r.source.syntheticObjectCount<0||!/^[a-f0-9]{8}$/.test(r.source.fingerprint))
  throw Error('Registro de sesión incompatible con el esquema.');
 if(r.mode==='yolo'&&(!r.inference||!Number.isInteger(r.inference.frameNumber)||
  r.inference.frameNumber<1||!Array.isArray(r.inference.detections)||
  !['ppe','coco'].includes(r.inference.model)||
  !Number.isFinite(r.inference.inferenceMs)||r.inference.inferenceMs<0||
  !Number.isFinite(r.inference.observedAtMs)||
  !Array.isArray(r.inference.reviewLog)))throw Error('La sesión YOLO no contiene predicciones verificables.');
 if(r.mode==='synthetic'&&r.inference!==null)
  throw Error('Una simulación visual no puede afirmar inferencia YOLO.');
 if(r.inference)for(const d of r.inference.detections){
  if(!d||typeof d.classId!=='string'||typeof d.label!=='string'||
   !Number.isFinite(d.confidence)||d.confidence<0||d.confidence>1||!d.box||
   [d.box.x,d.box.y,d.box.width,d.box.height].some(v=>!Number.isFinite(v))||
   d.box.x<0||d.box.y<0||d.box.width<=0||d.box.height<=0||
   d.box.x+d.box.width>1.00001||d.box.y+d.box.height>1.00001)
   throw Error('La sesión contiene detecciones YOLO dañadas.');
 }
}
