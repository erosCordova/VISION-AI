import {describe,it,expect} from 'vitest';
import {INITIAL_YOLO_TELEMETRY,updateYoloTelemetry} from '../../src/modules/live/yolo-telemetry';
import {buildSimulationSession} from '../../src/modules/live/simulation-session-model';
import type {YoloObservation} from '../../src/modules/live/yolo-telemetry';
const observation=(number:number,time:number):YoloObservation=>({
 frameNumber:number,capturedAtMs:time,completedAtMs:time+100,inferenceMs:100,
 model:'ppe',detections:[{id:'ppe-'+number,classId:'no-hardhat',label:'Sin casco',
 confidence:.85,box:{x:.1,y:.2,width:.3,height:.4}}]
});
describe('Fase 9 — recuperación tras fallo del motor YOLO sin alterar evidencia',()=>{
 it('preserva lecturas e incidentes durante reintento del fotograma',()=>{
  let state=updateYoloTelemetry(INITIAL_YOLO_TELEMETRY,
   {type:'status',phase:'running',model:'ppe'});
  for(const [number,time] of [[1,1000],[2,2000]])
   state=updateYoloTelemetry(state,{type:'frame',observation:observation(number,time)});
  expect(state.reviewLog).toHaveLength(1);
  expect(state.activeReview).toHaveLength(1);
  const original=state.observations;
  state=updateYoloTelemetry(state,{type:'status',phase:'failed',model:'ppe',error:'ONNX'});
  expect(state.observations).toBe(original);
  state=updateYoloTelemetry(state,{type:'status',phase:'retrying',model:'ppe'});
  expect(state.phase).toBe('retrying');
  expect(state.observations).toBe(original);
  expect(state.reviewLog).toHaveLength(1);
  expect(state.error).toBeNull();
  expect(updateYoloTelemetry(state,{type:'frame',observation:observation(3,3000)})).toBe(state);
  state=updateYoloTelemetry(state,{type:'status',phase:'running',model:'ppe'});
  state=updateYoloTelemetry(state,{type:'frame',observation:observation(3,3000)});
  expect(state.observations).toHaveLength(3);
  expect(state.reviewLog).toHaveLength(1); // Sin duplicar indicio por un error transitorio
  expect(state.observations[2].capturedAtMs).toBe(3000);
  state=updateYoloTelemetry(state,{type:'status',phase:'stopped',model:'ppe'});
  expect(state.activeReview).toHaveLength(0);
  expect(state.reviewLog).toHaveLength(1);
 });
 it('no permite guardar una sesión YOLO incompleta mientras reintenta',()=>{
  let state=updateYoloTelemetry(INITIAL_YOLO_TELEMETRY,
   {type:'status',phase:'running',model:'ppe'});
  state=updateYoloTelemetry(state,{type:'frame',observation:observation(1,1000)});
  const input={scenarioId:'safety' as const,scenarioName:'Seguridad',
   elapsed:10,graphics:'human' as const,camera:'frontal' as const,
   mode:'yolo' as const};
  const stamp=new Date('2026-11-04T16:00:00Z');
  state=updateYoloTelemetry(state,{type:'status',phase:'failed',model:'ppe',error:'Fallo'});
  expect(()=>buildSimulationSession({...input,telemetry:state},stamp,'failed')).toThrow(/Primero ejecuta YOLO/);
  state=updateYoloTelemetry(state,{type:'status',phase:'retrying',model:'ppe'});
  expect(()=>buildSimulationSession({...input,telemetry:state},stamp,'retrying')).toThrow(/Primero ejecuta YOLO/);
  state=updateYoloTelemetry(state,{type:'status',phase:'running',model:'ppe'});
  state=updateYoloTelemetry(state,{type:'frame',observation:observation(2,2000)});
  state=updateYoloTelemetry(state,{type:'status',phase:'stopped',model:'ppe'});
  const saved=buildSimulationSession({...input,telemetry:state},stamp,'recovered');
  expect(saved.inference?.frameNumber).toBe(2);
  expect(saved.inference?.observedAtMs).toBe(2000);
  expect(saved.inference?.detections).toHaveLength(1);
 });
 it('reiniciar detector realmente comienza una nueva sesión sin heredar eventos',()=>{
  let state=updateYoloTelemetry(INITIAL_YOLO_TELEMETRY,{type:'status',phase:'running',model:'ppe'});
  state=updateYoloTelemetry(state,{type:'frame',observation:observation(1,1000)});
  state=updateYoloTelemetry(state,{type:'status',phase:'loading',model:'coco'});
  expect(state.observations).toEqual([]);
  expect(state.reviewLog).toEqual([]);
  expect(state.activeReview).toEqual([]);
  expect(state.model).toBe('coco');
 });
});
