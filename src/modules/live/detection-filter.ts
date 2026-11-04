/** Fase 9: los filtros de presentación no modifican la evidencia cruda de YOLO. */
import type {Detection} from '../../core/domain/model';
export const MIN_RAW_YOLO_CONFIDENCE=.15;
export interface DetectionViewFilter {
 readonly minConfidence:number;
 readonly classId:string|null;
}
export function filterDetectionsForDisplay(
 raw:readonly Detection[],filter:DetectionViewFilter
):readonly Detection[]{
 if(!Number.isFinite(filter.minConfidence)||filter.minConfidence<MIN_RAW_YOLO_CONFIDENCE||
  filter.minConfidence>.99)throw Error('Umbral visual fuera del intervalo permitido.');
 return raw.filter(d=>Number.isFinite(d.confidence)&&d.confidence>=filter.minConfidence&&
  (filter.classId===null||d.classId===filter.classId));
}
export function classesInDetections(raw:readonly Detection[]):readonly {id:string;label:string}[]{
 const byId=new Map<string,string>();
 for(const d of raw)if(!byId.has(d.classId))byId.set(d.classId,d.label);
 return [...byId].map(([id,label])=>({id,label})).sort((a,b)=>a.label.localeCompare(b.label,'es'));
}
