import { describe, expect, it } from 'vitest';
import { insideZone, simulationSnapshot, validScenario } from '../../src/modules/live/simulation-engine';
describe('Simulador 2D determinista (no inferencia YOLO)', () => {
 it('implementa los cuatro escenarios documentados', () => {
   expect(['safety','warehouse','quality','retail'].every(validScenario)).toBe(true);
   expect(validScenario('unknown')).toBe(false);
 });
 it('reproduce el mismo estado en un mismo instante', () => {
   expect(simulationSnapshot('safety', 13.5)).toEqual(simulationSnapshot('safety',13.5));
 });
 it('la escena industrial tiene personas, casco, chaleco y zona', () => {
   const s=simulationSnapshot('safety',0);
   expect(s.entities.filter(e=>e.kind==='person')).toHaveLength(3);
   expect(s.entities.filter(e=>e.kind==='helmet')).toHaveLength(2);
   expect(s.zones[0].type).toBe('restricted');
 });
 it('detecta un ingreso sintético a zona cuando el centro cruza el límite', () => {
   expect(insideZone({id:'x',kind:'person',label:'p',x:0,y:0,width:10,height:10,score:1,tone:'mint'},
    {x:4,y:4,width:10,height:10,label:'z',type:'restricted'})).toBe(true);
   const states=Array.from({length:90},(_,i)=>simulationSnapshot('safety',i*.2).alert);
   expect(states).toContain(true);expect(states).toContain(false);
 });
 it('montacargas es distinguible de cajas y pallets',()=>{
   const s=simulationSnapshot('warehouse',1);
   expect(s.entities.filter(e=>e.kind==='forklift')).toHaveLength(1);
   expect(s.entities.some(e=>e.kind==='box')).toBe(true);
 });
 it('calidad contiene al menos una referencia de defecto sintético',()=>{
   const frames=Array.from({length:40},(_,i)=>simulationSnapshot('quality',i));
   expect(frames.some(f=>f.entities.some(e=>e.kind==='defect'))).toBe(true);
   expect(frames.some(f=>f.alert)).toBe(true);
 });
 it('retail cuenta únicamente centros de persona dentro de la zona',()=>{
   const s=simulationSnapshot('retail',2);
   expect(s.count).toBe(s.entities.filter(e=>e.kind==='person'&&insideZone(e,s.zones[0])).length);
 });
 it('no produce coordenadas ni puntuaciones fuera del contrato',()=>{
   for(const scenario of ['safety','warehouse','quality','retail'] as const) {
    for(const seconds of [0,3.5,12,50]){
     const s=simulationSnapshot(scenario,seconds);
     for(const e of s.entities){
      expect([e.x,e.y,e.width,e.height,e.score].every(Number.isFinite)).toBe(true);
      expect(e.score).toBeGreaterThanOrEqual(0);
      expect(e.score).toBeLessThanOrEqual(1);
      expect(e.width).toBeGreaterThan(0);
     }
    }
   }
 });
});
