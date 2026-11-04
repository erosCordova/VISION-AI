import {describe,expect,it} from 'vitest';
import {HUMAN_ASSETS,humanAssetFor,motionClipName,humanoidScale} from '../../src/modules/live/human-assets';
describe('Selección de modelos humanos animados bajo licencia CC0',()=>{
 it('asigna variantes humanas a todos los actores de cada escenario',()=>{
   for(const [scenario,ids] of Object.entries({
     safety:['w1','w2','w3'],warehouse:['a1','a2'],
     quality:['inspector'],retail:['r0','r1','r2','r3','r4']
   }))for(const id of ids)expect(humanAssetFor(scenario,id)).toMatch(/^https:\/\/gobkit\.com\/freebies\/human\d+\/\w+\.glb$/);
 });
 it('elige caminata e idle de los clips reales sin inventar animaciones',()=>{
  expect(motionClipName('walking',['Idle','Walk','Run'])).toBe('Walk');
  expect(motionClipName('inspecting',['Idle','Walk','Run'])).toBe('Idle');
  expect(motionClipName('waiting',['idle','walk'])).toBe('idle');
  expect(motionClipName('walking',[])).toBeNull();
 });
 it('mantiene una escala válida para distintos modelos',()=>{
   expect(humanoidScale(1)).toBeCloseTo(2.04);
   expect(humanoidScale(2.04)).toBe(1);
   expect(humanoidScale(0)).toBe(1);
 });
 it('el catálogo no contiene rutas vacías ni duplicados',()=>{
  const assets=Object.values(HUMAN_ASSETS);
  expect(new Set(assets).size).toBe(assets.length);
 });
});
