import {describe,it,expect} from 'vitest';
import {FrameAnalysisCycle,frameBoxPixels,assertFrameDetections} from '../../src/modules/live/frame-analysis-cycle';
import type {Detection} from '../../src/core/domain/model';
const good:Detection={id:'infer-1',classId:'person',label:'persona',
 confidence:.93,box:{x:.24,y:.18,width:.32,height:.53}};
describe('Fase 9 — ejecución correlacionada de fotogramas 3D',()=>{
 it('AN01: doble clic no crea dos operaciones del mismo fotograma',()=>{
  const cycle=new FrameAnalysisCycle();
  const first=cycle.begin('safety','ppe',960,540,100);
  expect(first).not.toBeNull();
  expect(cycle.busy).toBe(true);
  expect(cycle.begin('safety','ppe',960,540,101)).toBeNull();
  const completed=cycle.complete(first!,[good],123);
  expect(completed?.phase).toBe('completed');
  expect(completed?.durationMs).toBe(23);
  expect(cycle.busy).toBe(false);
  expect(cycle.complete(first!,[good],124)).toBeNull();
 });
 it('AN02: ninguna respuesta de la generación anterior modifica el estado actual',()=>{
  const cycle=new FrameAnalysisCycle();
  const old=cycle.begin('safety','ppe',960,540,100)!;
  cycle.reset();
  const current=cycle.begin('quality','coco',720,420,200)!;
  expect(cycle.complete(old,[good],300)).toBeNull();
  expect(cycle.fail(old,Error('stale'),300)).toBeNull();
  expect(cycle.busy).toBe(true);
  const accepted=cycle.complete(current,[],220);
  expect(accepted?.run.scenarioId).toBe('quality');
  expect(accepted?.detections).toEqual([]);
 });
 it('AN02: cajas se alinean con imagen completa y al redimensionar el visor',()=>{
  const b=frameBoxPixels(good.box,960,540,{width:480,height:270});
  expect(b.x).toBeCloseTo(115.2);
  expect(b.y).toBeCloseTo(48.6);
  expect(b.width).toBeCloseTo(153.6);
  expect(b.height).toBeCloseTo(143.1);
  const c=frameBoxPixels(good.box,960,540,{width:600,height:400,offsetX:13,offsetY:17});
  expect(c.x).toBeCloseTo(157);
  expect(c.y).toBeCloseTo(89);
  expect(c.width).toBeCloseTo(192);
  expect(c.height).toBeCloseTo(212);
 });
 it('AN03: salida incompatible nunca termina completed',()=>{
  const cycle=new FrameAnalysisCycle();
  const run=cycle.begin('retail','coco',960,540,100)!;
  const broken={...good,box:{x:1.2,y:0,width:.3,height:.4}};
  expect(()=>cycle.complete(run,[broken],120)).toThrow(/coordenadas/);
  expect(cycle.busy).toBe(true);
  const failed=cycle.fail(run,Error('Contrato inválido'),125);
  expect(failed?.phase).toBe('failed');
  expect(failed?.detections).toBeNull();
  expect(cycle.last?.phase).toBe('failed');
 });
 it('AN04: reintento conserva fuente e id del frame, cambia token y deja rastro',()=>{
  const cycle=new FrameAnalysisCycle();
  const first=cycle.begin('warehouse','coco',960,540,100)!;
  const failure=cycle.fail(first,Error('ONNX no disponible'),180);
  const retry=cycle.retry(200)!;
  expect(failure?.run.token).toBe(first.token);
  expect(retry.token).not.toBe(first.token);
  expect(retry.frameId).toBe(first.frameId);
  expect(retry.scenarioId).toBe(first.scenarioId);
  expect(retry.attempt).toBe(2);
  expect(cycle.complete(first,[good],210)).toBeNull();
  expect(cycle.complete(retry,[good],230)?.phase).toBe('completed');
  expect(cycle.retry(240)).toBeNull();
 });
 it('AN04: descartar un frame cancelado permite el siguiente sin dejar dos activas',()=>{
  const cycle=new FrameAnalysisCycle();
  const first=cycle.begin('safety','ppe',960,540,100)!;
  cycle.discard(first);
  expect(cycle.busy).toBe(false);
  const second=cycle.begin('safety','ppe',960,540,110)!;
  expect(second.frameId).toBe(first.frameId+1);
 });
 it('rechaza fuentes inválidas y puntuaciones no finitas',()=>{
  const cycle=new FrameAnalysisCycle();
  expect(()=>cycle.begin('quality','coco',0,0,1)).toThrow(/Fotograma/);
  expect(()=>assertFrameDetections([{...good,confidence:NaN}])).toThrow();
  expect(()=>assertFrameDetections([{...good,box:{...good.box,width:-1}}])).toThrow();
  expect(()=>frameBoxPixels(good.box,960,540,{width:0,height:100})).toThrow();
 });
});
