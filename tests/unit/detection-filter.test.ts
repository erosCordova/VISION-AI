import {describe,it,expect} from 'vitest';
import type {Detection} from '../../src/core/domain/model';
import {MIN_RAW_YOLO_CONFIDENCE,filterDetectionsForDisplay,classesInDetections} from '../../src/modules/detections/services/detection-filter';
const d=(id:string,score:number,label=id):Detection=>({
 id:id+'-'+score,classId:id,label,confidence:score,
 box:{x:.1,y:.2,width:.3,height:.4}
});
describe('Fase 9: filtros de cajas YOLO sin alterar evidencia original',()=>{
 const raw=Object.freeze([d('person',.92,'Persona'),d('person',.28,'Persona'),d('hardhat',.65,'Casco')]);
 it('respeta el mínimo inclusivo y conserva el orden y la fuente',()=>{
  const visible=filterDetectionsForDisplay(raw,{minConfidence:.65,classId:null});
  expect(visible).toEqual([raw[0],raw[2]]);
  expect(raw).toHaveLength(3);
  expect(raw[1].confidence).toBe(.28);
 });
 it('filtra clases por identificador real, no por etiqueta ni geometría simulada',()=>{
  const visible=filterDetectionsForDisplay(raw,{minConfidence:.15,classId:'person'});
  expect(visible).toEqual([raw[0],raw[1]]);
  expect(filterDetectionsForDisplay(raw,{minConfidence:.15,classId:'unknown'})).toEqual([]);
 });
 it('muestra cero cuando cambia el umbral, pero no elimina evidencia ni agrega detecciones',()=>{
  expect(filterDetectionsForDisplay(raw,{minConfidence:.95,classId:null})).toEqual([]);
  expect(filterDetectionsForDisplay(raw,{minConfidence:.15,classId:null})).toHaveLength(3);
 });
 it('rechaza umbrales inválidos y descarta confianzas no finitas',()=>{
  for(const value of [Number.NaN,0,1,Number.POSITIVE_INFINITY])
   expect(()=>filterDetectionsForDisplay(raw,{minConfidence:value,classId:null})).toThrow();
  expect(filterDetectionsForDisplay([d('person',Number.NaN)],{
   minConfidence:MIN_RAW_YOLO_CONFIDENCE,classId:null
  })).toEqual([]);
 });
 it('presenta clases únicas en orden legible y no atribuye una clase ausente',()=>{
  expect(classesInDetections(raw)).toEqual([{id:'hardhat',label:'Casco'},{id:'person',label:'Persona'}]);
  expect(classesInDetections([])).toEqual([]);
 });
});
