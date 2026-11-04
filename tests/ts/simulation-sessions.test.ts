import {describe,it,expect} from 'vitest';
import {buildSimulationSession,validateSimulationSession,SCENE_VERSION,
 sameScenarioSnapshot,snapshotFingerprint} from '../../src/infrastructure/persistence/simulation-session-store';
import {simulationSnapshot} from '../../src/modules/live/simulation-engine';
import {INITIAL_YOLO_TELEMETRY,updateYoloTelemetry} from '../../src/modules/live/yolo-telemetry';
const input=(scenarioId:'safety'|'quality'|'retail'|'warehouse'='safety')=>({
 scenarioId,scenarioName:scenarioId,elapsed:12.5,
 graphics:'human' as const,camera:'frontal' as const,mode:'synthetic' as const,
 telemetry:INITIAL_YOLO_TELEMETRY
});
describe('Fase 7: sesiones versionadas y reproducibles de cuatro simulaciones',()=>{
 it('dos ejecuciones producen la misma huella con IDs de ejecución distintos (DA02)',()=>{
  for(const scenario of ['safety','quality','retail','warehouse'] as const){
   const first=buildSimulationSession(input(scenario),new Date('2026-11-04T00:00:00Z'),'run-A');
   const second=buildSimulationSession(input(scenario),new Date('2026-11-04T00:00:01Z'),'run-B');
   expect(first.id).not.toBe(second.id);
   expect(first.source.fingerprint).toBe(second.source.fingerprint);
   expect(first.source.sceneVersion).toBe(SCENE_VERSION);
   expect(sameScenarioSnapshot(scenario,12500)).toBe(true);
   expect(()=>validateSimulationSession(first)).not.toThrow();
  }
 });
 it('fija el estado, la hora y la versión de la escena sin videos o datasets',()=>{
  const record=buildSimulationSession(input(),new Date('2026-11-04T15:20:00Z'),'s-001');
  expect(record.savedAt).toBe('2026-11-04T15:20:00.000Z');
  expect(record.mode).toBe('synthetic');
  expect(record.inference).toBeNull();
  expect(record.source.kind).toBe('simulation-3d');
  expect(record.source.fingerprint).toBe(
   snapshotFingerprint(simulationSnapshot('safety',12.5),12500));
 });
 it('si se altera el estado de la simulación, no se puede validar el historial',()=>{
  const record=buildSimulationSession(input(),new Date('2026-11-04T15:20:00Z'),'s-001');
  expect(()=>validateSimulationSession({...record,source:{
   ...record.source,fingerprint:'00000000'}})).toThrow(/alterada/);
  expect(()=>validateSimulationSession({...record,source:{
   ...record.source,syntheticObjectCount:200}})).toThrow(/alterada/);
  expect(()=>validateSimulationSession({...record,schemaVersion:2})).toThrow(/esquema/);
 });
 it('no permite guardar inferencia YOLO cuando todavía no se procesó un fotograma',()=>{
  expect(()=>buildSimulationSession({...input(),mode:'yolo'},
    new Date('2026-11-04T15:20:00Z'),'run-1')).toThrow(/Primero ejecuta YOLO/);
 });
 it('conserva predicciones reales vinculadas al modelo y la lectura original',()=>{
  const detection={id:'yolo-1',classId:'person',label:'Persona',confidence:.86,
   box:{x:.1,y:.2,width:.3,height:.4}};
  let telemetry=updateYoloTelemetry(INITIAL_YOLO_TELEMETRY,{
   type:'status',phase:'running',model:'ppe'});
  telemetry=updateYoloTelemetry(telemetry,{type:'frame',observation:{
   frameNumber:4,capturedAtMs:1793798400000,inferenceMs:54.5,model:'ppe',detections:[detection]
  }});
  const record=buildSimulationSession({...input(),mode:'yolo',telemetry},
   new Date('2026-11-04T16:00:00Z'),'run-yolo-1');
  expect(record.inference?.detections).toHaveLength(1);
  expect(record.inference?.model).toBe('ppe');
  expect(record.inference?.frameNumber).toBe(4);
  expect(record.inference?.inferenceMs).toBe(54.5);
  expect(()=>validateSimulationSession(record)).not.toThrow();
  const altered={...record,inference:{...record.inference!,detections:[{
   ...detection,box:{...detection.box,x:-1}}]}};
  expect(()=>validateSimulationSession(altered)).toThrow(/dañadas/);
 });
 it('protege referencias históricas de un posible cambio de nombre de clase (DA03)',()=>{
  const detection={id:'1',classId:'person',label:'Persona · versión 1',
   confidence:.72,box:{x:.1,y:.2,width:.1,height:.2}};
  const telemetry=updateYoloTelemetry(updateYoloTelemetry(INITIAL_YOLO_TELEMETRY,
   {type:'status',phase:'running',model:'coco'}),{type:'frame',observation:{
    frameNumber:1,capturedAtMs:1000,inferenceMs:110,model:'coco',detections:[detection]}});
  const r=buildSimulationSession({...input('retail'),mode:'yolo',telemetry},
   new Date('2026-11-04T15:20:00Z'),'id-retail');
  expect(r.inference!.detections[0].label).toBe('Persona · versión 1');
  detection.label='Persona · versión 2';
  expect(r.inference!.detections[0].label).toBe('Persona · versión 1');
 });
 it('rechaza modo, origen o tiempo incompatible sin salvar información falsa',()=>{
  expect(()=>buildSimulationSession({...input(),elapsed:-1},new Date(),'bad')).toThrow();
  expect(()=>validateSimulationSession({})).toThrow();
  const record=buildSimulationSession(input(),new Date('2026-11-04T15:20:00Z'),'id');
  expect(()=>validateSimulationSession({...record,mode:'yolo'})).toThrow();
 });
});
