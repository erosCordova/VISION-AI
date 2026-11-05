import { describe, expect, it } from 'vitest';
import { actorMotion, ROUTES, sampleRoute, separateActors } from '../../src/modules/scenarios/services/motion-planner';
import { simulationSnapshot, insideZone } from '../../src/modules/scenarios/services/simulation-engine';

describe('Navegación multidireccional de simulación 3D', () => {
  it('usa puntos conectados con decisiones reproducibles, no fórmulas oscilatorias', () => {
    const first = sampleRoute(ROUTES.safety.w2, 73.5);
    expect(sampleRoute(ROUTES.safety.w2, 73.5)).toEqual(first);
    expect(first.x).toBeGreaterThan(0);
    expect(first.y).toBeGreaterThan(0);
    const keys = Array.from({ length: 90 }, (_, i) => actorMotion('safety', 'w2', i * 1.35));
    expect(new Set(keys.map(k => k.segment)).size).toBeGreaterThan(7);
    expect(new Set(keys.map(k => Math.round(k.heading * 2))).size).toBeGreaterThan(3);
    expect(new Set(keys.map(k => Math.round(k.x) + ':' + Math.round(k.y))).size).toBeGreaterThan(22);
  });
  it('contiene fases de tránsito, espera e inspección sin teletransportarse', () => {
    const samples = Array.from({length: 360}, (_, i) => sampleRoute(ROUTES.retail.r1, i * .15));
    expect(samples.some(s => s.state === 'walking')).toBe(true);
    expect(samples.some(s => s.state === 'waiting' || s.state === 'inspecting')).toBe(true);
    for (let i = 1; i < samples.length; i++) {
      const a = samples[i-1], b = samples[i];
      expect(Math.hypot(b.x-a.x, b.y-a.y)).toBeLessThan(19);
    }
  });
  it('cambia orientaciones de montacargas y clientes según sus rutas', () => {
    const forklift = Array.from({length: 180},(_,i)=>actorMotion('warehouse','lift',i*1.1));
    const retail = Array.from({length: 180},(_,i)=>actorMotion('retail','r0',i*1.1));
    expect(new Set(forklift.map(s=>Math.round(s.heading))).size).toBeGreaterThan(2);
    expect(new Set(retail.map(s=>Math.round(s.heading))).size).toBeGreaterThan(2);
  });
  it('separa progresivamente peatones próximos sin modificar los originales', () => {
    const people=[
      {id:'a',x:100,y:100,width:40,height:80},
      {id:'b',x:120,y:106,width:40,height:80}
    ];
    const adjusted=separateActors(people,80);
    const distance=(arr:typeof people)=>Math.hypot(arr[0].x-arr[1].x,arr[0].y-arr[1].y);
    expect(distance(adjusted)).toBeGreaterThan(distance(people));
    expect(people[0].x).toBe(100);
  });
  it('seguridad y logística derivan zonas de las posiciones y no de eventos prefabricados', () => {
    const samples=Array.from({length:150},(_,i)=>simulationSnapshot('safety',i*.3));
    expect(samples.some(s=>s.alert)).toBe(true);
    expect(samples.some(s=>!s.alert)).toBe(true);
    for(const scene of samples){
      const worker=scene.entities.find(e=>e.id==='w2');
      expect(worker).toBeDefined();
      expect(scene.alert).toBe(insideZone(worker!,scene.zones[0]));
    }
    const warehouse=simulationSnapshot('warehouse',20);
    const lift=warehouse.entities.find(e=>e.kind==='forklift');
    expect(lift?.heading).toEqual(expect.any(Number));
    expect(warehouse.entities.filter(e=>e.kind==='person')).toHaveLength(2);
  });
  it('productos inspeccionan mientras un operario recorre una ruta independiente', () => {
    const seq=Array.from({length:150},(_,i)=>simulationSnapshot('quality',i*.25));
    expect(seq.some(s=>s.entities.some(e=>e.id==='q1'&&e.state==='inspecting'))).toBe(true);
    expect(new Set(seq.map(s=>Math.round(s.entities.find(e=>e.id==='inspector')!.x))).size).toBeGreaterThan(10);
  });
});
