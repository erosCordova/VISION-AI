import {describe,expect,it} from 'vitest';
import {decodeYoloClasses,letterboxFor} from '../../src/modules/live/yolo-postprocess';
import {PPE_CLASSES,PPE_MODEL,ppeFindings,ppeColor} from '../../src/modules/live/ppe-model';
import type {Detection} from '../../src/core/domain/model';
const detect=(classId:string):Detection=>({id:classId,classId,label:classId,confidence:.82,
 box:{x:.1,y:.2,width:.2,height:.3}});
describe('Detector EPP industrial - contrato original y seguridad',()=>{
 it('usa 14 clases e input 640x640 sin confundirlas con COCO',()=>{
  expect(PPE_CLASSES).toHaveLength(14);
  expect(PPE_MODEL.input).toEqual({width:640,height:640});
  expect(PPE_CLASSES.map(c=>c.id)).toEqual([
  'person','hardhat','no-hardhat','safety vest','no-safety vest',
  'no-mask','gloves','safety shoes','excavator','wheel loader',
  'dump truck','goggles','no-goggles','no-gloves']);
 });
 it('reproyecta cajas del tensor 18 x 8400 en una imagen panorámica',()=>{
  const l=letterboxFor(960,540,PPE_MODEL.input);
  expect(l.padX).toBe(0);expect(l.padY).toBeCloseTo(140);
  const d=new Float32Array(18*8400);
  const put=(c:number,v:number)=>{d[c*8400+7]=v;};
  put(0,320);put(1,320);put(2,64);put(3,128);put(6,.91);
  const decoded=decodeYoloClasses(d,[1,18,8400],l,PPE_CLASSES,.4);
  expect(decoded.detections).toHaveLength(1);
  expect(decoded.detections[0].classId).toBe('no-hardhat');
  expect(decoded.detections[0].label).toBe('Sin casco');
  expect(decoded.detections[0].confidence).toBeCloseTo(.91);
 });
 it('si no hay resultados, NO inventa infracciones por ausencia de casco',()=>{
  const result=ppeFindings([detect('person')]);
  expect(result.requiresReview).toBe(false);
  expect(result.review).toHaveLength(0);
 });
 it('registra únicamente detecciones explícitas con clase de revisión',()=>{
  const result=ppeFindings([detect('hardhat'),detect('no-hardhat'),detect('no-safety vest')]);
  expect(result.review).toHaveLength(2);
  expect(result.worn).toHaveLength(1);
  expect(result.requiresReview).toBe(true);
 });
 it('no toma la clase no-mask poco entrenada como evidencia confiable',()=>{
  const result=ppeFindings([detect('no-mask')]);
  expect(result.requiresReview).toBe(false);
  expect(result.unsupported).toHaveLength(1);
 });
 it('elimina la confusión entre casco, chaleco, persona y maquinaria',()=>{
  expect(ppeColor('no-hardhat')).not.toBe(ppeColor('hardhat'));
  expect(ppeColor('dump truck')).not.toBe(ppeColor('person'));
 });
 it('rechaza salidas corruptas y ceros de tensor, sin detecciones falsas',()=>{
  expect(decodeYoloClasses(new Float32Array(18*8400),[1,18,8400],
   letterboxFor(640,640,PPE_MODEL.input),PPE_CLASSES).detections).toHaveLength(0);
  expect(()=>decodeYoloClasses(new Float32Array(18*8400),[1,84,8400],
   letterboxFor(640,640,PPE_MODEL.input),PPE_CLASSES)).toThrow();
 });
});
