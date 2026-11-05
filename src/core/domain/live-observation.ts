import type {Detection} from './model';

/** Registro de una inferencia REAL sobre video público; no almacena imágenes. */
export interface LiveObservation{
 readonly schemaVersion:1;
 readonly id:string;
 readonly source:'public-live-video';
 readonly model:'yolov8n-coco';
 readonly savedAt:string;
 readonly observedAt:string; // hora local de análisis, no hora oficial de captura
 readonly cameraId:string;
 readonly cameraName:string;
 readonly inferenceMs:number;
 readonly frameWidth:number;
 readonly frameHeight:number;
 readonly detections:readonly Detection[];
}
export function validateLiveObservation(raw:unknown):asserts raw is LiveObservation{
 if(!raw||typeof raw!=='object')throw Error('El registro no es válido.');
 const r=raw as LiveObservation;
 const validDate=(s:unknown)=>typeof s==='string'&&Number.isFinite(Date.parse(s))&&s.length<40;
 if(r.schemaVersion!==1||r.source!=='public-live-video'||r.model!=='yolov8n-coco'||
  typeof r.id!=='string'||r.id.length<8||r.id.length>100||
  !validDate(r.savedAt)||!validDate(r.observedAt)||
  typeof r.cameraId!=='string'||!/^[a-z0-9-]{3,70}$/.test(r.cameraId)||
  typeof r.cameraName!=='string'||r.cameraName.length<2||r.cameraName.length>160||
  !Number.isFinite(r.inferenceMs)||r.inferenceMs<0||r.inferenceMs>300000||
  !Number.isInteger(r.frameWidth)||r.frameWidth<2||r.frameWidth>4096||
  !Number.isInteger(r.frameHeight)||r.frameHeight<2||r.frameHeight>4096||
  !Array.isArray(r.detections)||r.detections.length>150)throw Error('Registro de observación incompatible.');
 for(const d of r.detections){
  if(!d||typeof d.id!=='string'||typeof d.classId!=='string'||d.classId.length>80||
   typeof d.label!=='string'||d.label.length>120||
   !Number.isFinite(d.confidence)||d.confidence<0||d.confidence>1||!d.box)throw Error('Detección dañada.');
  const {x,y,width,height}=d.box;
  if(![x,y,width,height].every(Number.isFinite)||x<0||y<0||width<=0||height<=0||
   x+width>1.0001||y+height>1.0001)throw Error('Caja de detección inválida.');
 }
}
