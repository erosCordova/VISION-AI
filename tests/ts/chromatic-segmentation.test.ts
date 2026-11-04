import {describe,it,expect} from 'vitest';
import {segmentByContrast} from '../../src/modules/live/chromatic-segmentation';
const prepare=(w:number,h:number)=>new Uint8ClampedArray(w*h*4).fill(255);
const box={x:.1,y:.1,width:.8,height:.8};
describe('Fase 10 — máscaras de contraste obtenidas de píxeles reales',()=>{
 it('no inventa una región en una imagen uniforme, aun con caja YOLO',()=>{
  const m=segmentByContrast(prepare(20,20),20,20,[box]);
  expect(m.selectedPixels).toBe(0);
  expect(m.coveragePercent).toBe(0);
  expect(m.regions[0].selectedPixels).toBe(0);
 });
 it('mide el área de un objeto cromáticamente distinto dentro de su ROI',()=>{
  const rgba=prepare(20,20);
  for(let y=7;y<13;y++)for(let x=7;x<13;x++){
   const i=(y*20+x)*4;rgba[i]=12;rgba[i+1]=68;rgba[i+2]=17;
  }
  const m=segmentByContrast(rgba,20,20,[box]);
  expect(m.selectedPixels).toBe(36);
  expect(m.coveragePercent).toBeCloseTo(9);
  expect(m.regions[0].selectedPixels).toBe(36);
  expect(m.binary[7*20+7]).toBe(1);
  expect(m.binary[2*20+2]).toBe(0);
 });
 it('las regiones superpuestas no duplican el área del fotograma',()=>{
  const rgba=prepare(20,20);
  for(let y=6;y<14;y++)for(let x=6;x<14;x++){
   const i=(y*20+x)*4;rgba[i]=0;rgba[i+1]=0;rgba[i+2]=0;
  }
  const single=segmentByContrast(rgba,20,20,[box]);
  const twice=segmentByContrast(rgba,20,20,[box,box]);
  expect(twice.selectedPixels).toBe(single.selectedPixels);
  expect(twice.regions).toHaveLength(2);
 });
 it('un contraste más exigente no genera más píxeles positivos',()=>{
  const rgba=prepare(20,20);
  for(let y=7;y<13;y++)for(let x=7;x<13;x++){
   const i=(y*20+x)*4;rgba[i]=220;rgba[i+1]=220;rgba[i+2]=220;
  }
  const low=segmentByContrast(rgba,20,20,[box],20);
  const high=segmentByContrast(rgba,20,20,[box],160);
  expect(low.selectedPixels).toBeGreaterThanOrEqual(high.selectedPixels);
 });
 it('rechaza dimensiones, tamaños de píxeles y cajas corruptas',()=>{
  expect(()=>segmentByContrast(prepare(20,20),100,20,[box])).toThrow();
  expect(()=>segmentByContrast(prepare(20,20),20,20,[{...box,x:-1}])).toThrow();
  expect(()=>segmentByContrast(prepare(20,20),20,20,[box],0)).toThrow();
 });
 it('no requiere archivos, datasets ni información programada del escenario',()=>{
  const rgba=prepare(20,20);
  const result=segmentByContrast(rgba,20,20,[]);
  expect(result.binary).toHaveLength(400);
  expect(result.selectedPixels).toBe(0);
  expect(result.regions).toEqual([]);
 });
});
