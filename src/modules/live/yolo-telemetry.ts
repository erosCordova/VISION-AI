import type {Detection} from '../../core/domain/model';
import type {ScenarioKey} from './simulation-engine';
import type {YoloFamily} from './yolo-browser';

export type MonitorPhase='idle'|'loading'|'running'|'retrying'|'stopped'|'failed';
export interface YoloObservation {
 readonly frameNumber:number;
 readonly capturedAtMs:number;
 /** Hora en que la inferencia terminó, separada de la captura original. */
 readonly completedAtMs?:number;
 readonly inferenceMs:number;
 readonly detections:readonly Detection[];
 readonly model:YoloFamily;
}
export interface YoloReviewIncident {
 readonly id:string;
 readonly classId:string;
 readonly label:string;
 readonly observedAtMs:number;
 readonly frameNumber:number;
 readonly supportingFrames:number;
 readonly maxConfidence:number;
}
/** Un indicio repetido corresponde a una clase, NO a una persona identificada. */
export interface YoloReviewSignal {
 readonly classId:string;
 readonly label:string;
 readonly supportingFrames:number;
 readonly maxConfidence:number;
}
export interface YoloTelemetry {
 readonly reviewLog:readonly YoloReviewIncident[];
 readonly activeReview:readonly YoloReviewSignal[];
 readonly phase:MonitorPhase;
 readonly model:YoloFamily;
 readonly error:string|null;
 readonly observations:readonly YoloObservation[];
 readonly captureTimestamps:readonly number[];
 readonly skippedCaptures:number;
}
export type YoloTelemetryEvent=
 | {readonly type:'status';readonly phase:MonitorPhase;readonly model:YoloFamily;readonly error?:string}
 | {readonly type:'frame';readonly observation:YoloObservation}
 | {readonly type:'capture';readonly model:YoloFamily;readonly capturedAtMs:number}
 | {readonly type:'capture-skip';readonly model:YoloFamily};
export const INITIAL_YOLO_TELEMETRY:YoloTelemetry={
 phase:'idle',model:'coco',error:null,observations:[],reviewLog:[],activeReview:[],
 captureTimestamps:[],skippedCaptures:0
};
const REVIEW_IDS=new Set(['no-hardhat','no-safety vest','no-goggles','no-gloves']);
const REVIEW_MIN_CONFIDENCE=.55;
const REVIEW_WINDOW_MS=30_000;
/**
 * Filtra indicios de EPP: misma clase en >=2 de hasta 3 inferencias recientes
 * (no necesariamente el mismo individuo), confianza >=55%, ventana de 30 s.
 * Sin predicción positiva no hay evento. No usa el estado de simulación.
 */
export function stableReviewSignals(observations:readonly YoloObservation[]):readonly YoloReviewSignal[]{
 const newest=observations.at(-1);
 if(!newest||newest.model!=='ppe')return [];
 const recent=observations.slice(-3).filter(o=>o.model==='ppe' &&
  newest.capturedAtMs-o.capturedAtMs<=REVIEW_WINDOW_MS);
 const score=new Map<string,{label:string;frames:number;maxConfidence:number}>();
 for(const observation of recent){
  const perFrame=new Map<string,{label:string;confidence:number}>();
  for(const d of observation.detections){
   if(!REVIEW_IDS.has(d.classId)||!Number.isFinite(d.confidence)||
    d.confidence<REVIEW_MIN_CONFIDENCE)continue;
   const prev=perFrame.get(d.classId);
   if(!prev||d.confidence>prev.confidence)perFrame.set(d.classId,{label:d.label,confidence:d.confidence});
  }
  for(const [id,entry] of perFrame){
   const found=score.get(id)??{label:entry.label,frames:0,maxConfidence:0};
   found.frames++;found.maxConfidence=Math.max(found.maxConfidence,entry.confidence);
   score.set(id,found);
  }
 }
 return [...score].filter(([,v])=>v.frames>=2).map(([classId,v])=>({
  classId,label:v.label,supportingFrames:v.frames,maxConfidence:v.maxConfidence
 })).sort((a,b)=>b.supportingFrames-a.supportingFrames||b.maxConfidence-a.maxConfidence);
}
export function updateYoloTelemetry(previous:YoloTelemetry,event:YoloTelemetryEvent):YoloTelemetry {
 if(event.type==='status'){
  if(event.phase==='loading'||event.phase==='idle')
   return {phase:event.phase,model:event.model,error:null,observations:[],reviewLog:[],activeReview:[],
    captureTimestamps:[],skippedCaptures:0};
  // Fallo y reintento preservan las observaciones e indicios YA obtenidos.
  // Solo detener desactiva las señales en curso; reiniciar modelo limpia la sesión.
  return {...previous,phase:event.phase,model:event.model,
   activeReview:event.phase==='stopped'?[]:previous.activeReview,
   error:event.phase==='failed'?(event.error||'Error de inferencia'):null};
 }
 if(event.type==='capture-skip'){
  if(previous.phase!=='running'||previous.model!==event.model)return previous;
  return {...previous,skippedCaptures:previous.skippedCaptures+1};
 }
 if(event.type==='capture'){
  if(previous.phase!=='running'||previous.model!==event.model||
   !Number.isFinite(event.capturedAtMs))return previous;
  const last=previous.captureTimestamps.at(-1);
  if(last!==undefined&&event.capturedAtMs<last)return previous;
  return {...previous,captureTimestamps:[
   ...previous.captureTimestamps.slice(-19),event.capturedAtMs]};
 }
 if(previous.phase!=='running'||event.observation.model!==previous.model)return previous;
 const incoming=event.observation;
 if(!Number.isSafeInteger(incoming.frameNumber)||incoming.frameNumber<1||
  !Number.isFinite(incoming.capturedAtMs)||!Number.isFinite(incoming.inferenceMs)||
  incoming.inferenceMs<0||
  (incoming.completedAtMs!==undefined&&
   (!Number.isFinite(incoming.completedAtMs)||incoming.completedAtMs<incoming.capturedAtMs)))
  return previous;
 const last=previous.observations.at(-1);
 if(last && (event.observation.frameNumber<=last.frameNumber ||
   event.observation.capturedAtMs<last.capturedAtMs))return previous;
 const observations=[...previous.observations.slice(-29),event.observation];
 const activeReview=stableReviewSignals(observations);
 const activePreviously=new Set(previous.activeReview.map(signal=>signal.classId));
 const added=activeReview.filter(signal=>!activePreviously.has(signal.classId))
  .map(signal=>({
   id:signal.classId+'-'+event.observation.frameNumber,
   classId:signal.classId,label:signal.label,
   observedAtMs:event.observation.capturedAtMs,
   frameNumber:event.observation.frameNumber,
   supportingFrames:signal.supportingFrames,maxConfidence:signal.maxConfidence
  }));
 return {...previous,observations,activeReview,
  reviewLog:[...previous.reviewLog,...added].slice(-12)};
}
export interface YoloClassCount {readonly id:string;readonly label:string;readonly count:number;readonly meanConfidence:number}
export function detectedClasses(detections:readonly Detection[]):readonly YoloClassCount[]{
 const values=new Map<string,{label:string;count:number;score:number}>();
 for(const d of detections){
  if(!Number.isFinite(d.confidence))continue;
  const item=values.get(d.classId)??{label:d.label,count:0,score:0};
  item.count++;item.score+=d.confidence;
  values.set(d.classId,item);
 }
 return [...values].map(([id,v])=>({id,label:v.label,count:v.count,meanConfidence:v.score/v.count}))
  .sort((a,b)=>b.count-a.count||b.meanConfidence-a.meanConfidence);
}
/** Frecuencia de imágenes efectivamente capturadas para YOLO, distinta del render WebGL. */
export function observedCaptureFps(stamps:readonly number[]):number|null{
 const latest=stamps.slice(-12);
 if(latest.length<2)return null;
 const delta=latest.at(-1)!-latest[0];
 return delta>0?1000*(latest.length-1)/delta:null;
}
/** Inferencias terminadas por segundo; distinto de la tasa de captura. */
export function observedYoloFps(samples:readonly YoloObservation[]):number|null{
 const latest=samples.slice(-12);
 if(latest.length<2)return null;
 const stamp=(item:YoloObservation)=>item.completedAtMs??item.capturedAtMs;
 const delta=stamp(latest.at(-1)!)-stamp(latest[0]);
 return Number.isFinite(delta)&&delta>0?1000*(latest.length-1)/delta:null;
}
/** Edad de la lectura desde el resultado terminado, no desde el frame capturado. */
export function observationAgeSeconds(item:YoloObservation|null,now:number):number|null{
 if(!item||!Number.isFinite(now))return null;
 const time=item.completedAtMs??item.capturedAtMs;
 return Number.isFinite(time)?Math.max(0,(now-time)/1000):null;
}
export function reviewSignals(model:YoloFamily,detections:readonly Detection[]):number{
 if(model!=='ppe')return 0;
 return detections.filter(d=>REVIEW_IDS.has(d.classId)).length;
}
export function modelScope(scenario:ScenarioKey,model:YoloFamily):string{
 if(scenario==='safety'&&model==='ppe')
  return 'Señales EPP positivas para revisión. Sin detección no significa cumplimiento.';
 if(scenario==='quality')
  return 'COCO no identifica defectos de manufactura ni calidad de productos.';
 if(scenario==='warehouse')
  return 'COCO no diferencia montacargas y pallets como clases especializadas.';
 if(scenario==='retail')
  return 'YOLO puede detectar personas, pero no identifica ni sigue individuos entre fotogramas.';
 return 'COCO reconoce objetos generales; no evalúa casco ni chaleco de protección.';
}
