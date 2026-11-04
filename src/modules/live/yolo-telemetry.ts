import type {Detection} from '../../core/domain/model';
import type {ScenarioKey} from './simulation-engine';
import type {YoloFamily} from './yolo-browser';

export type MonitorPhase='idle'|'loading'|'running'|'stopped'|'failed';
export interface YoloObservation {
 readonly frameNumber:number;
 readonly capturedAtMs:number;
 readonly inferenceMs:number;
 readonly detections:readonly Detection[];
 readonly model:YoloFamily;
}
export interface YoloTelemetry {
 readonly phase:MonitorPhase;
 readonly model:YoloFamily;
 readonly error:string|null;
 readonly observations:readonly YoloObservation[];
}
export type YoloTelemetryEvent=
 | {readonly type:'status';readonly phase:MonitorPhase;readonly model:YoloFamily;readonly error?:string}
 | {readonly type:'frame';readonly observation:YoloObservation};
export const INITIAL_YOLO_TELEMETRY:YoloTelemetry={
 phase:'idle',model:'coco',error:null,observations:[]
};
export function updateYoloTelemetry(previous:YoloTelemetry,event:YoloTelemetryEvent):YoloTelemetry {
 if(event.type==='status'){
  if(event.phase==='loading'||event.phase==='idle')
   return {phase:event.phase,model:event.model,error:null,observations:[]};
  return {...previous,phase:event.phase,model:event.model,
   error:event.phase==='failed'?(event.error||'Error de inferencia'):null};
 }
 if(previous.phase!=='running'||event.observation.model!==previous.model)return previous;
 const last=previous.observations.at(-1);
 if(last && (event.observation.frameNumber<=last.frameNumber ||
   event.observation.capturedAtMs<last.capturedAtMs))return previous;
 return {...previous,observations:[...previous.observations.slice(-29),event.observation]};
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
export function observedYoloFps(samples:readonly YoloObservation[]):number|null{
 const latest=samples.slice(-12);
 if(latest.length<2)return null;
 const delta=latest.at(-1)!.capturedAtMs-latest[0].capturedAtMs;
 return delta>0?1000*(latest.length-1)/delta:null;
}
export function reviewSignals(model:YoloFamily,detections:readonly Detection[]):number{
 if(model!=='ppe')return 0;
 const review=new Set(['no-hardhat','no-safety vest','no-goggles','no-gloves']);
 return detections.filter(d=>review.has(d.classId)).length;
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
