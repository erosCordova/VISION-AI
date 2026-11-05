import {describe,it,expect} from 'vitest';
import {FrameAnalysisCycle} from '../../src/modules/analysis/services/frame-analysis-cycle';
describe('Fase 9 — procedencia del fotograma en errores y reintentos',()=>{
 it('el ID y la fecha de captura no cambian al reintentar un frame fallido',()=>{
  const cycle=new FrameAnalysisCycle();
  const first=cycle.begin('safety','ppe',960,540,1000)!;
  cycle.fail(first,Error('modelo no disponible'),1400);
  const again=cycle.retry(3100)!;
  expect(again.frameId).toBe(first.frameId);
  expect(again.capturedAtMs).toBe(first.capturedAtMs);
  expect(again.startedAtMs).toBe(3100);
  expect(again.attempt).toBe(2);
  expect(cycle.complete(again,[],3800)?.run.capturedAtMs).toBe(1000);
 });
 it('una generación reemplazada no puede completar el resultado anterior',()=>{
  const cycle=new FrameAnalysisCycle();
  const old=cycle.begin('retail','coco',900,500,50)!;
  cycle.reset();
  const newFrame=cycle.begin('warehouse','coco',900,500,100)!;
  expect(cycle.complete(old,[],200)).toBeNull();
  expect(cycle.complete(newFrame,[],210)?.run.scenarioId).toBe('warehouse');
 });
 it('un reintento con reloj anterior a la captura se rechaza',()=>{
  const cycle=new FrameAnalysisCycle();
  const old=cycle.begin('quality','coco',600,400,100)!;
  cycle.fail(old,Error('falló'),110);
  expect(cycle.retry(99)).toBeNull();
  expect(cycle.retry(130)).not.toBeNull();
 });
});
