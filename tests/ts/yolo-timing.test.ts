import {describe,it,expect} from 'vitest';
import {INITIAL_YOLO_TELEMETRY,observationAgeSeconds,observedCaptureFps,
 observedYoloFps,updateYoloTelemetry} from '../../src/modules/live/yolo-telemetry';
import type {YoloObservation} from '../../src/modules/live/yolo-telemetry';
const sample=(frameNumber:number,capturedAtMs:number,completedAtMs:number):YoloObservation=>({
 frameNumber,capturedAtMs,completedAtMs,inferenceMs:completedAtMs-capturedAtMs,
 detections:[],model:'coco'
});
describe('Fase 9 — tiempos de captura, ejecución y recepción',()=>{
 it('los FPS de captura difieren de los FPS de inferencias completadas',()=>{
  const rows=[sample(1,1000,1500),sample(2,1100,2000),sample(3,1200,2500)];
  expect(observedCaptureFps(rows.map(x=>x.capturedAtMs))).toBeCloseTo(10);
  expect(observedYoloFps(rows)).toBeCloseTo(2);
 });
 it('la antigüedad comienza cuando termina la inferencia',()=>{
  expect(observationAgeSeconds(sample(1,1000,5100),5200)).toBeCloseTo(.1);
  expect(observationAgeSeconds(null,5100)).toBeNull();
  expect(observationAgeSeconds(sample(1,1000,5100),Number.NaN)).toBeNull();
 });
 it('ignora resultados con tiempos incompatibles o duración negativa',()=>{
  const active=updateYoloTelemetry(INITIAL_YOLO_TELEMETRY,{type:'status',phase:'running',model:'coco'});
  expect(updateYoloTelemetry(active,{type:'frame',observation:sample(1,2000,1500)})).toBe(active);
  expect(updateYoloTelemetry(active,{type:'frame',observation:{...sample(1,1000,1400),inferenceMs:-1}})).toBe(active);
  expect(updateYoloTelemetry(active,{type:'frame',observation:{...sample(1,1000,1400),completedAtMs:NaN}})).toBe(active);
 });
 it('un reintento conserva el tiempo de captura pero cambia el resultado',()=>{
  expect(observationAgeSeconds(sample(4,1000,4000),4100)).toBeCloseTo(.1);
 });
 it('es compatible con observaciones antiguas sin hora de finalización',()=>{
  const old:YoloObservation={frameNumber:1,capturedAtMs:1000,inferenceMs:50,detections:[],model:'coco'};
  expect(observationAgeSeconds(old,2000)).toBe(1);
  expect(observedYoloFps([old,{...old,frameNumber:2,capturedAtMs:2000}])).toBe(1);
 });
});