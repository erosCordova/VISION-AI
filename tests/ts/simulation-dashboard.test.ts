import {describe,it,expect} from 'vitest';
import {calculateDashboard,DEFAULT_DASHBOARD_FILTER} from '../../src/modules/dashboard/dashboard-metrics';
import {buildSimulationSession} from '../../src/modules/live/simulation-session-model';
import {INITIAL_YOLO_TELEMETRY,updateYoloTelemetry} from '../../src/modules/live/yolo-telemetry';
import type {SimulationSession} from '../../src/core/domain/simulation-session';
type Scenario='safety'|'retail'|'quality'|'warehouse';
const now=new Date('2026-11-04T16:00:00.000Z');
const synthetic=(scenario:Scenario,id:string,date='2026-11-04T15:00:00.000Z')=>
 buildSimulationSession({scenarioId:scenario,scenarioName:scenario,elapsed:9,
  graphics:'human',camera:'isometric',mode:'synthetic',telemetry:INITIAL_YOLO_TELEMETRY},
 new Date(date),id);
const yolo=(scenario:Scenario,id:string,date='2026-11-04T15:00:00.000Z',
 scores=[.9,.7],review=0)=>{
 let state=updateYoloTelemetry(INITIAL_YOLO_TELEMETRY,{type:'status',phase:'running',model:'ppe'});
 state=updateYoloTelemetry(state,{type:'frame',observation:{
  frameNumber:1,capturedAtMs:1793808000000,inferenceMs:45,model:'ppe',
  detections:scores.map((confidence,i)=>({
   id:'d-'+i,classId:'person',label:'Persona',confidence,
   box:{x:.05+i*.3,y:.1,width:.2,height:.4}
  }))
 }});
 const record=buildSimulationSession({scenarioId:scenario,scenarioName:scenario,
  elapsed:10,graphics:'light',camera:'frontal',mode:'yolo',telemetry:state},new Date(date),id);
 return {...record,inference:record.inference?{
  ...record.inference,reviewLog:Array.from({length:review},(_,n)=>({
   id:'signal-'+n,classId:'no-hardhat',label:'sin casco',
   observedAtMs:1793808000000,frameNumber:1,supportingFrames:2,maxConfidence:.8
  }))
 }:null} as SimulationSession;
};
describe('Fase 8: KPI derivados únicamente del historial guardado',()=>{
 it('KP03: sin sesiones no inventa medias ni registros',()=>{
  const result=calculateDashboard([],DEFAULT_DASHBOARD_FILTER,now);
  expect(result.sessions).toBe(0);expect(result.detections).toBe(0);
  expect(result.meanConfidence).toBeNull();expect(result.meanInferenceMs).toBeNull();
  expect(result.lastSavedAt).toBeNull();expect(result.byClass).toEqual([]);
 });
 it('KP01: conteos, confianza, duración y señales coinciden con cálculo manual',()=>{
  const result=calculateDashboard([
   synthetic('safety','a'),yolo('safety','b',undefined,[.9,.7],2),
   yolo('retail','c',undefined,[.5],1)
  ],DEFAULT_DASHBOARD_FILTER,now);
  expect(result.sessions).toBe(3);expect(result.yoloSessions).toBe(2);
  expect(result.detections).toBe(3);expect(result.reviewEvents).toBe(3);
  expect(result.meanConfidence).toBeCloseTo(.7);
  expect(result.meanInferenceMs).toBe(45);
  expect(result.byClass).toEqual([{id:'person',label:'Persona',count:3}]);
  expect(result.byScenario.find(r=>r.id==='safety')?.count).toBe(2);
 });
 it('filtra por escenario y origen sin contaminar el resultado con otros modos',()=>{
  const entries=[synthetic('safety','a'),yolo('safety','b'),yolo('retail','c')];
  const result=calculateDashboard(entries,{scenario:'safety',mode:'yolo',period:'all'},now);
  expect(result.sessions).toBe(1);expect(result.yoloSessions).toBe(1);
  expect(result.detections).toBe(2);
 });
 it('respeta límite temporal de 24 horas e ignora registros posteriores a ahora',()=>{
  const entries=[
   synthetic('safety','old','2026-11-03T15:59:59.000Z'),
   synthetic('safety','border','2026-11-03T16:00:00.000Z'),
   synthetic('retail','future','2026-11-05T15:00:00.000Z')
  ];
  const r=calculateDashboard(entries,{scenario:'all',mode:'all',period:'day'},now);
  expect(r.sessions).toBe(1);expect(r.byDay).toEqual([{date:'2026-11-03',count:1}]);
 });
 it('no confunde objetos geométricos con detecciones de IA',()=>{
  const r=calculateDashboard([synthetic('quality','sim')],DEFAULT_DASHBOARD_FILTER,now);
  expect(r.sessions).toBe(1);
  expect(r.detections).toBe(0);expect(r.meanConfidence).toBeNull();
 });
 it('mide inferencia YOLO aun cuando el detector no reconoce objetos',()=>{
  const r=calculateDashboard([yolo('warehouse','empty',undefined,[])],DEFAULT_DASHBOARD_FILTER,now);
  expect(r.yoloSessions).toBe(1);expect(r.detections).toBe(0);
  expect(r.meanInferenceMs).toBe(45);expect(r.meanConfidence).toBeNull();
 });
 it('agrupa sesiones por fecha UTC y última actualización real',()=>{
  const r=calculateDashboard([
   synthetic('quality','first','2026-11-01T12:00:00.000Z'),
   synthetic('quality','second','2026-11-04T10:00:00.000Z')
  ],DEFAULT_DASHBOARD_FILTER,now);
  expect(r.byDay).toEqual([{date:'2026-11-01',count:1},{date:'2026-11-04',count:1}]);
  expect(r.lastSavedAt).toBe('2026-11-04T10:00:00.000Z');
 });
});
