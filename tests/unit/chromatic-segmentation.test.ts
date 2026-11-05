import {describe,it,expect} from 'vitest';
import {segmentByContrast,chromaticMaskPixels,chromaticMaskBoundary} from '../../src/modules/segmentation/services/chromatic-segmentation';
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
 it('una esquina de la ROI ocupada por objeto no contamina todo el fondo',()=>{
  const rgba=prepare(20,20);
  // La esquina superior izquierda de la ROI es (2,2).
  const i=(2*20+2)*4;rgba[i]=0;rgba[i+1]=0;rgba[i+2]=0;
  const m=segmentByContrast(rgba,20,20,[box],70,1);
  expect(m.selectedPixels).toBe(1);
  expect(m.binary[2*20+2]).toBe(1);
  expect(m.binary[2*20+3]).toBe(0);
 });
 it('filtrado tras esquina atípica mantiene regiones conectadas',()=>{
  const rgba=prepare(20,20);
  for(const [x,y] of [[2,2],[9,9],[9,10],[10,9],[10,10]]){
   const i=(y*20+x)*4;rgba[i]=10;rgba[i+1]=45;rgba[i+2]=10;
  }
  const result=segmentByContrast(rgba,20,20,[box],70,4);
  expect(result.selectedPixels).toBe(4);
  expect(result.regions[0].selectedPixels).toBe(4);
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
 it('elimina ruido de píxeles aislados sin borrar el objeto de área suficiente',()=>{
  const rgba=prepare(20,20);
  const dot=(x:number,y:number)=>{
   const at=(y*20+x)*4;rgba[at]=15;rgba[at+1]=45;rgba[at+2]=20;
  };
  dot(4,4);
  for(let y=8;y<11;y++)for(let x=8;x<11;x++)dot(x,y);
  const raw=segmentByContrast(rgba,20,20,[box],70,1);
  const cleaned=segmentByContrast(rgba,20,20,[box],70,4);
  expect(raw.selectedPixels).toBe(10);
  expect(cleaned.selectedPixels).toBe(9);
  expect(cleaned.binary[4*20+4]).toBe(0);
  expect(cleaned.binary[9*20+9]).toBe(1);
  expect(cleaned.regions[0].selectedPixels).toBe(9);
 });
 it('respeta conectividad de cuatro vecinos, no fusiona ruido diagonal',()=>{
  const rgba=prepare(20,20);
  for(const [x,y] of [[8,8],[9,9],[10,10]]){
   const i=(y*20+x)*4;rgba[i]=0;rgba[i+1]=0;rgba[i+2]=0;
  }
  expect(segmentByContrast(rgba,20,20,[box],70,1).selectedPixels).toBe(3);
  expect(segmentByContrast(rgba,20,20,[box],70,2).selectedPixels).toBe(0);
 });
 it('el área unida y las métricas por región reflejan la misma limpieza',()=>{
  const rgba=prepare(20,20);
  for(let y=7;y<13;y++)for(let x=7;x<13;x++){
   const i=(y*20+x)*4;rgba[i]=10;rgba[i+1]=10;rgba[i+2]=10;
  }
  const mask=segmentByContrast(rgba,20,20,[box,box],70,4);
  expect(mask.selectedPixels).toBe(36);
  expect(mask.regions[0].selectedPixels).toBe(36);
  expect(mask.regions[1].selectedPixels).toBe(36);
 });
 it('contorno de cuadrado 3x3 tiene ocho píxeles y doce lados expuestos',()=>{
  const rgba=prepare(20,20);
  for(let y=8;y<11;y++)for(let x=8;x<11;x++){
   const at=(y*20+x)*4;rgba[at]=0;rgba[at+1]=0;rgba[at+2]=0;
  }
  const mask=segmentByContrast(rgba,20,20,[box],70,1);
  const border=chromaticMaskBoundary(mask);
  expect(mask.selectedPixels).toBe(9);
  expect(border.boundaryPixels).toBe(8);
  expect(border.perimeterEdges).toBe(12);
  expect(border.binary[9*20+9]).toBe(0);
  expect(border.binary[8*20+8]).toBe(1);
 });
 it('un píxel aislado tiene cuatro bordes y una máscara vacía tiene cero',()=>{
  const rgba=prepare(20,20);
  const at=(9*20+9)*4;rgba[at]=0;rgba[at+1]=0;rgba[at+2]=0;
  const border=chromaticMaskBoundary(segmentByContrast(rgba,20,20,[box],70,1));
  expect(border.boundaryPixels).toBe(1);
  expect(border.perimeterEdges).toBe(4);
  const empty=chromaticMaskBoundary(segmentByContrast(prepare(20,20),20,20,[],70,1));
  expect(empty.boundaryPixels).toBe(0);
  expect(empty.perimeterEdges).toBe(0);
 });
 it('el contorno no cambia los píxeles ni porcentajes de la máscara original',()=>{
  const rgba=prepare(20,20);
  for(let y=8;y<11;y++)for(let x=8;x<11;x++){
   const at=(y*20+x)*4;rgba[at]=0;rgba[at+1]=0;rgba[at+2]=0;
  }
  const mask=segmentByContrast(rgba,20,20,[box],70,1);
  const copy=mask.binary.slice();
  chromaticMaskBoundary(mask);
  expect(mask.binary).toEqual(copy);
  expect(mask.selectedPixels).toBe(9);
 });
 it('rechaza geometría inválida para evitar contornos corruptos',()=>{
  const mask=segmentByContrast(prepare(20,20),20,20,[],70,1);
  expect(()=>chromaticMaskBoundary({...mask,binary:new Uint8Array(30)})).toThrow();
 });
 it('el PNG cromático usa alfa transparente fuera de los píxeles marcados',()=>{
  const rgba=prepare(20,20);
  const color=(8*20+8)*4;rgba[color]=0;rgba[color+1]=0;rgba[color+2]=0;
  const mask=segmentByContrast(rgba,20,20,[box],70,1);
  const data=chromaticMaskPixels(mask);
  expect(data.length).toBe(1600);
  expect(data[color+3]).toBe(255);
  expect(data[3]).toBe(0);
  let opaque=0;
  for(let k=3;k<data.length;k+=4)if(data[k]===255)opaque++;
  expect(opaque).toBe(mask.selectedPixels);
 });
 it('rechaza exportar máscara con geometría corrupta',()=>{
  const mask=segmentByContrast(prepare(20,20),20,20,[box],70,1);
  expect(()=>chromaticMaskPixels({...mask,binary:new Uint8Array(100)})).toThrow();
 });
 it('rechaza opciones de limpieza inválidas',()=>{
  const rgba=prepare(20,20);
  expect(()=>segmentByContrast(rgba,20,20,[box],70,0)).toThrow();
  expect(()=>segmentByContrast(rgba,20,20,[box],70,257)).toThrow();
  expect(()=>segmentByContrast(rgba,20,20,[box],70,3.5)).toThrow();
 });
});
