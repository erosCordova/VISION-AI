import {describe,it,expect} from 'vitest';
import {CAPTURE_PACE_MS,captureWaitMs,shouldPauseCapture} from '../../src/modules/live/inference-scheduler';
describe('Fase 9 — consumo controlado del navegador y estados de captura',()=>{
 it('elige tres intervalos explícitos, sin cambiar pesos ni clases de YOLO',()=>{
  expect(CAPTURE_PACE_MS).toEqual({fast:350,balanced:750,efficient:1500});
  expect(captureWaitMs('balanced',100)).toBe(650);
  expect(captureWaitMs('fast',50)).toBe(300);
  expect(captureWaitMs('efficient',200)).toBe(1300);
 });
 it('no crea cola agresiva cuando la inferencia tarda más que la cadencia',()=>{
  expect(captureWaitMs('fast',1200)).toBe(100);
  expect(captureWaitMs('balanced',800)).toBe(100);
 });
 it('no intenta capturar una simulación pausada ni una pestaña oculta',()=>{
  expect(shouldPauseCapture(true,false)).toBe(true);
  expect(shouldPauseCapture(false,true)).toBe(true);
  expect(shouldPauseCapture(true,true)).toBe(true);
  expect(shouldPauseCapture(false,false)).toBe(false);
 });
 it('rechaza una duración que no permite programar el siguiente fotograma',()=>{
  expect(()=>captureWaitMs('balanced',Number.NaN)).toThrow();
  expect(()=>captureWaitMs('efficient',-1)).toThrow();
 });
});
