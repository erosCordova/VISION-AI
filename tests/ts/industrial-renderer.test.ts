import { describe,expect,it } from 'vitest';
import { IndustrialRenderer,makeScene,SceneBuilder } from '../../src/modules/live/industrial-renderer';
import { simulationSnapshot } from '../../src/modules/live/simulation-engine';
describe('Motor 3D procedural para las cuatro simulaciones',()=>{
 it('genera mallas 3D reales con posiciones, normales y colores',()=>{
  const builder=new SceneBuilder();
  builder.box(0,0,0,2,2,2,[1,.3,.5]);
  const floats=builder.output();
  expect(builder.triangleCount).toBe(12);
  expect(floats).toHaveLength(12*3*9);
  expect([...floats].every(Number.isFinite)).toBe(true);
 });
 it('la malla de cada escenario tiene un entorno y objetos detallados',()=>{
  for(const key of ['safety','quality','warehouse','retail'] as const){
   const scene=makeScene(simulationSnapshot(key,12),12,true);
   expect(scene.triangleCount).toBeGreaterThan(300);
   expect(scene.output().every(Number.isFinite)).toBe(true);
  }
 });
 it('las zonas son elementos geométricos opcionales',()=>{
  const snap=simulationSnapshot('warehouse',20);
  expect(makeScene(snap,20,true).triangleCount)
   .toBeGreaterThan(makeScene(snap,20,false).triangleCount);
 });
 it('el renderizador se conserva como clase concreta para WebGL2',()=>{
  expect(typeof IndustrialRenderer).toBe('function');
 });
});
