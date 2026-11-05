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
