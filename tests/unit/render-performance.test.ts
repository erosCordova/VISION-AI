import {describe,it,expect} from 'vitest';
import {meshNeedsRefresh,renderFrameBudgetMs,shouldAdvanceSimulation,validPerformanceMeasurement}
 from '../../src/modules/scenarios/services/render-performance';
describe('Fase 14: ciclo de renderizado medible sin asignaciones repetitivas',()=>{
 const source={objects:5},another={objects:5};
 it('reutiliza geometría al pausar y cuando no hay cambios en el fotograma',()=>{
  const previous={snapshot:source,elapsed:3,zones:true};
  expect(meshNeedsRefresh(previous,{...previous})).toBe(false);
  expect(meshNeedsRefresh(previous,{snapshot:source,elapsed:3,zones:true})).toBe(false);
 });
 it('actualiza malla al variar tiempo, snapshot o zonas',()=>{
  const p={snapshot:source,elapsed:3,zones:true};
  expect(meshNeedsRefresh(p,{...p,elapsed:3.1})).toBe(true);
  expect(meshNeedsRefresh(p,{...p,snapshot:another})).toBe(true);
  expect(meshNeedsRefresh(p,{...p,zones:false})).toBe(true);
 });
 it('reclama un primer render y rechaza tiempos no finitos',()=>{
  const s={snapshot:source,elapsed:2,zones:true};
  expect(meshNeedsRefresh({snapshot:null,elapsed:NaN,zones:null},s)).toBe(true);
  expect(()=>meshNeedsRefresh(s,{...s,elapsed:Infinity})).toThrow();
 });
 it('baja la frecuencia solicitada durante pausa, conservando cámara navegable',()=>{
  expect(renderFrameBudgetMs(false)).toBe(33);
  expect(renderFrameBudgetMs(true)).toBe(100);
  expect(renderFrameBudgetMs(true)).toBeGreaterThan(renderFrameBudgetMs(false));
 });
 it('suspende el reloj oculto, evita deltas inválidos y se reanuda sin saltos',()=>{
  expect(shouldAdvanceSimulation(true,75)).toBe(false);
  expect(shouldAdvanceSimulation(false,75)).toBe(true);
  expect(shouldAdvanceSimulation(false,0)).toBe(false);
  expect(shouldAdvanceSimulation(false,Infinity)).toBe(false);
  expect(shouldAdvanceSimulation(false,NaN)).toBe(false);
 });
 it('las mediciones requieren números finitos, fecha e identificación',()=>{
  const measurement={route:'analisis',width:768,measuredAt:'2026-11-04T00:00:00Z',
   pageReadyMs:450,heapUsedMiB:40.5,renderFps:19,webgl:true};
  expect(validPerformanceMeasurement(measurement)).toBe(true);
  expect(validPerformanceMeasurement({...measurement,renderFps:NaN})).toBe(false);
  expect(validPerformanceMeasurement({...measurement,width:0})).toBe(false);
  expect(validPerformanceMeasurement({...measurement,measuredAt:'ayer'})).toBe(false);
  expect(validPerformanceMeasurement({...measurement,heapUsedMiB:-1})).toBe(false);
 });
});
