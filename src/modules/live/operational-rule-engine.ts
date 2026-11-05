/** Fase 11: reglas declarativas sobre predicciones reales del modelo ONNX.
 * Ninguna regla lee personas, zonas u objetos programados en el motor 3D.
 * Una observación de presencia NO acredita aforo, infracción o riesgo.
 */
import type {ScenarioKey} from './simulation-engine';
import type {YoloFamily} from './yolo-browser';
import {stableReviewSignals} from './yolo-telemetry';
import type {YoloObservation,YoloTelemetry} from './yolo-telemetry';

export const OPERATIONAL_RULE_VERSION='vision-ai-rules-v1' as const;
export type RuleStatus='review'|'observed'|'no-evidence'|'no-signal'|'unavailable';
export type RuleCategory='human-review'|'information'|'unavailable';
export interface OperationalRule {
 readonly id:string;readonly scenarioId:ScenarioKey;readonly title:string;
 readonly description:string;readonly category:RuleCategory;
 readonly status:RuleStatus;readonly supportingFrames:number;
 readonly observedFrames:number;readonly classes:readonly string[];
 readonly model:YoloFamily;
}
/** Requisitos temporales iguales a los usados por el monitor EPP. */
const WINDOW_MS=30_000;
const FRAME_COUNT=3;
const MIN_CONFIDENCE=.55;
const SUPPORT=2;
const catalog={
 safety:{id:'ppe-repeat-v1',title:'Posibles faltas de protección repetidas',
  description:'Posibles faltas de protección observadas repetidamente. Requieren revisión humana.'},
 retail:{id:'retail-people-observed-v1',title:'Presencia repetida de personas',
  description:'Se observaron varias personas en imágenes recientes. No equivale a un conteo de visitantes únicos.'},
 warehouse:{id:'warehouse-people-observed-v1',title:'Personas reconocidas en logística',
  description:'Observación informativa de personas reconocidas en 2 de hasta 3 fotogramas. No determina proximidad a maquinaria ni invasión de zonas.'},
 quality:{id:'quality-defects-unsupported-v1',title:'Defectos industriales no verificables',
  description:'Este tipo de reconocimiento no permite confirmar defectos de producto.'}
} as const;
export const operationalRuleCatalog=catalog;
function recentFrames(scenario:ScenarioKey,model:YoloFamily,observations:readonly YoloObservation[]):YoloObservation[]{
 const last=observations.at(-1);
 if(!last||last.model!==model)return [];
 return observations.slice(-FRAME_COUNT).filter(item=>item.model===model&&
  Number.isFinite(item.capturedAtMs)&&item.capturedAtMs<=last.capturedAtMs&&
  last.capturedAtMs-item.capturedAtMs<=WINDOW_MS&&
  (!item.source||item.source.scenarioId===scenario));
}
function result(scenario:ScenarioKey,model:YoloFamily,status:RuleStatus,
 category:RuleCategory,observedFrames:number,supportingFrames:number,
 classes:readonly string[]=[]):OperationalRule {
 return {...catalog[scenario],scenarioId:scenario,model,status,category,
  observedFrames,supportingFrames,classes};
}
export function evaluateOperationalRules(scenario:ScenarioKey,telemetry:YoloTelemetry):OperationalRule[]{
 const {model}=telemetry;
 // COCO no permite evaluar EPP, y un EPP de seguridad no es un detector
 // de defectos o de aforo en los otros escenarios.
 if(scenario==='quality'||(scenario==='safety'&&model!=='ppe')||
  (scenario!=='safety'&&model!=='coco'))
  return [result(scenario,model,'unavailable','unavailable',0,0)];
 const recent=recentFrames(scenario,model,telemetry.observations);
 if(!recent.length)return [result(scenario,model,'no-evidence',
  scenario==='safety'?'human-review':'information',0,0)];
 if(scenario==='safety'){
  const signals=stableReviewSignals(recent);
  const support=signals.length?Math.max(...signals.map(x=>x.supportingFrames)):0;
  return [result(scenario,model,signals.length?'review':'no-signal',
   'human-review',recent.length,support,signals.map(x=>x.classId))];
 }
 const required=scenario==='retail'?2:1;
 const counted=recent.filter(frame=>
  frame.detections.filter(d=>d.classId==='person'&&
   Number.isFinite(d.confidence)&&d.confidence>=MIN_CONFIDENCE).length>=required);
 return [result(scenario,model,counted.length>=SUPPORT?'observed':'no-signal',
  'information',recent.length,counted.length,
  counted.length>=SUPPORT?['person']:[])];
}
