import {describe,it,expect} from 'vitest';
import {CAPTURE_PACE_MS,captureWaitMs,shouldPauseCapture,AdaptiveCapturePacer} from '../../src/modules/analysis/services/inference-scheduler';
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

describe('Fase 15 — capturas adaptativas basadas en tiempos observados',()=>{
 it('calcula media móvil sin predicciones sintéticas ni colas en paralelo',()=>{
  const pacer=new AdaptiveCapturePacer();
  expect(pacer.estimateMs).toBeNull();
  expect(pacer.intervalMs).toBe(900);
  pacer.observe(1000);pacer.observe(2000);
  expect(pacer.estimateMs).toBe(1250);
  expect(pacer.intervalMs).toBe(1850);
  expect(captureWaitMs('auto',1100,pacer.estimateMs)).toBe(750);
 });
 it('limita el presupuesto para equipos rápidos y lentos',()=>{
  expect(captureWaitMs('auto',20,0)).toBe(480);
  expect(captureWaitMs('auto',4000,10000)).toBe(100);
  expect(captureWaitMs('auto',600,1200)).toBe(1150);
 });
 it('ignora muestras no finitas, negativas y atípicas',()=>{
  const pacer=new AdaptiveCapturePacer();
  pacer.observe(400);
  for(const invalid of [-1,Number.NaN,Infinity,120001])
   expect(pacer.observe(invalid)).toBe(400);
  expect(()=>captureWaitMs('auto',10,-20)).toThrow();
 });
 it('reinicia el historial de mediciones al cambiar o reabrir un modelo',()=>{
  const pacer=new AdaptiveCapturePacer();
  pacer.observe(900);pacer.reset();
  expect(pacer.estimateMs).toBeNull();
  expect(pacer.intervalMs).toBe(900);
 });
 it('preserva los tres modos manuales previos y sus intervalos',()=>{
  expect(CAPTURE_PACE_MS).toEqual({fast:350,balanced:750,efficient:1500});
  expect(captureWaitMs('balanced',200)).toBe(550);
 });
});
