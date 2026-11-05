import { describe, expect, it } from 'vitest';
import { boundedOrbit,createCamera,entityFootprint,presets,project,worldX,worldZ,zoneFootprint } from '../../src/modules/scenarios/services/scene-math';
describe('Motor de cámara 3D y geometría',()=>{
 it('proyecta un punto visible en la pantalla',()=>{
  const c=createCamera(presets.frontal);
  const p=project([0,.85,0],c,960,540);
  expect(p?.x).toBeCloseTo(480,5);
  expect(p?.y).toBeCloseTo(270,5);
  expect(p?.depth).toBeGreaterThan(0);
 });
 it('limita altura y zoom de cámara y protege de NaN',()=>{
  expect(boundedOrbit({yaw:0,pitch:99,distance:999})).toEqual({yaw:0,pitch:1.52,distance:34});
  expect(boundedOrbit({yaw:NaN,pitch:NaN,distance:NaN})).toEqual({yaw:0,pitch:.2,distance:9});
 });
 it('convierte cajas 2D y zonas a un piso 3D coherente',()=>{
  const e=entityFootprint({x:448,y:230,width:64,height:40});
  expect(e[0]).toBe(0);expect(e[2]).toBe(0);
  expect(worldX(480)).toBe(0);expect(worldZ(270)).toBe(0);
  const zone=zoneFootprint({x:416,y:206,width:128,height:128});
  expect(zone.center[0]).toBe(0);expect(zone.center[2]).toBe(0);
  expect(zone.width).toBe(2);expect(zone.depth).toBe(2);
 });
 it('tiene cámara frontal, superior e isométrica distintas',()=>{
  const coords=['frontal','superior','isometric'] as const;
  expect(new Set(coords.map(x=>createCamera(presets[x]).eye.join(','))).size).toBe(3);
 });
 it('no devuelve coordenadas no finitas para puntos detrás de cámara',()=>{
  const c=createCamera(presets.isometric);
  expect(project([99,99,99],c,0,0)).toBeNull();
 });
});
