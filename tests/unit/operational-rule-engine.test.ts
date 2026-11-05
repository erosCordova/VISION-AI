import {describe,it,expect} from 'vitest';
import {INITIAL_YOLO_TELEMETRY,updateYoloTelemetry} from '../../src/modules/detections/services/yolo-telemetry';
import {evaluateOperationalRules,OPERATIONAL_RULE_VERSION} from '../../src/modules/patterns/services/operational-rule-engine';
import type {YoloTelemetry} from '../../src/modules/detections/services/yolo-telemetry';
import type {ScenarioKey} from '../../src/modules/scenarios/services/simulation-engine';
import type {YoloFamily} from '../../src/modules/detections/services/yolo-browser';
const box={x:.1,y:.1,width:.2,height:.4};
function build(scenario:ScenarioKey,model:YoloFamily,classes:readonly string[][],times?:readonly number[]):YoloTelemetry{
 let state=updateYoloTelemetry(INITIAL_YOLO_TELEMETRY,{type:'status',phase:'running',model});
 classes.forEach((ids,index)=>{
  state=updateYoloTelemetry(state,{type:'frame',observation:{
   model,frameNumber:index+1,capturedAtMs:times?.[index]??1000+index*1000,
   inferenceMs:50,completedAtMs:(times?.[index]??1000+index*1000)+60,
   source:{scenarioId:scenario,elapsedMs:1000+index*1000,graphics:'light',camera:'frontal'},
   detections:ids.map((id,i)=>({id:id+'-'+index+'-'+i,classId:id,label:id,
    confidence:.84,box}))
  }});
 });
 return state;
}
describe('Fase 11 — motor de reglas sobre YOLO real y alcance de modelos',()=>{
 it('mantiene una versión reproducible de reglas',()=>expect(OPERATIONAL_RULE_VERSION).toBe('vision-ai-rules-v1'));
 it('solo EPP positivo repetido activa revisión humana',()=>{
  const r=evaluateOperationalRules('safety',build('safety','ppe',[
   ['no-hardhat'],[],['no-hardhat']
  ]))[0];
  expect([r.status,r.category,r.supportingFrames,r.observedFrames]).toEqual(['review','human-review',2,3]);
  expect(r.classes).toEqual(['no-hardhat']);
 });
 it('ninguna detección o un indicio aislado no significa incumplimiento',()=>{
  const empty=evaluateOperationalRules('safety',build('safety','ppe',[[],[],[]]))[0];
  const once=evaluateOperationalRules('safety',build('safety','ppe',[[],['no-hardhat'],[]]))[0];
  expect(empty.status).toBe('no-signal');
  expect(once.status).toBe('no-signal');
  expect(once.classes).toEqual([]);
 });
 it('COCO no evalúa EPP aunque detecte personas',()=>{
  expect(evaluateOperationalRules('safety',build('safety','coco',[['person'],['person']]))[0].status)
   .toBe('unavailable');
 });
 it('no trata no-mask como una clase segura de incumplimiento EPP',()=>{
  expect(evaluateOperationalRules('safety',build('safety','ppe',[['no-mask'],['no-mask']]))[0].status)
   .toBe('no-signal');
 });
 it('retail exige 2 personas en al menos 2 lecturas, nunca produce alarma de aforo',()=>{
  const observed=evaluateOperationalRules('retail',build('retail','coco',[
   ['person','person'],['person','person'],[]
  ]))[0];
  const insufficient=evaluateOperationalRules('retail',build('retail','coco',[
   ['person'],['person'],[]
  ]))[0];
  expect([observed.status,observed.category,observed.supportingFrames]).toEqual(['observed','information',2]);
  expect(insufficient.status).toBe('no-signal');
 });
 it('logística registra presencia repetida pero no inventa riesgo',()=>{
  const item=evaluateOperationalRules('warehouse',build('warehouse','coco',[['person'],['person']]))[0];
  expect(item.status).toBe('observed');
  expect(item.category).toBe('information');
  expect(item.description).toContain('No determina proximidad');
 });
 it('control de calidad no inventa defectos con COCO o EPP',()=>{
  for(const model of ['ppe','coco'] as const)
   expect(evaluateOperationalRules('quality',build('quality',model,[['person'],['person']]))[0].status)
    .toBe('unavailable');
 });
 it('si no existe inferencia, no crea alertas',()=>{
  expect(evaluateOperationalRules('retail',INITIAL_YOLO_TELEMETRY)[0].status).toBe('no-evidence');
 });
 it('caducan señales temporales de más de 30 segundos',()=>{
  const rule=evaluateOperationalRules('retail',build('retail','coco',[
   ['person','person'],['person','person']
  ],[1000,34000]))[0];
  expect(rule.status).toBe('no-signal');
 });
 it('no cuenta una detección COCO de confianza baja aunque se repita',()=>{
  let t=build('warehouse','coco',[[],[]]);
  t={...t,observations:t.observations.map((o,i)=>({...o,detections:[
   {id:'p'+i,classId:'person',label:'Persona',confidence:.30,box}
  ]}))};
  expect(evaluateOperationalRules('warehouse',t)[0].status).toBe('no-signal');
 });
 it('la regla no muta predicciones ni estado del monitor',()=>{
  const t=build('safety','ppe',[['no-hardhat'],['no-hardhat']]);
  const before=JSON.stringify(t);
  evaluateOperationalRules('safety',t);
  expect(JSON.stringify(t)).toBe(before);
 });
 it('si cambia escenario y hay frames viejos, no atribuye la señal a la nueva escena',()=>{
  const t=build('retail','coco',[['person','person'],['person','person']]);
  expect(evaluateOperationalRules('warehouse',t)[0].status).toBe('no-evidence');
 });
});
