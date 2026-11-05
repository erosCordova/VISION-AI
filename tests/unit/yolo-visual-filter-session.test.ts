import {describe,it,expect} from 'vitest';
import {filterDetectionsForDisplay} from '../../src/modules/detections/services/detection-filter';
import {INITIAL_YOLO_TELEMETRY,updateYoloTelemetry} from '../../src/modules/detections/services/yolo-telemetry';
import {buildSimulationSession} from '../../src/modules/scenarios/services/simulation-session-model';
import type {Detection} from '../../src/core/domain/model';
import type {ScenarioKey} from '../../src/modules/scenarios/services/simulation-engine';
const raw:Detection[]=[
 {id:'p',classId:'person',label:'Persona',confidence:.91,
  box:{x:.1,y:.2,width:.2,height:.4}},
 {id:'b',classId:'backpack',label:'Mochila',confidence:.35,
  box:{x:.4,y:.5,width:.2,height:.3}}
];
const scenes:ScenarioKey[]=['safety','quality','retail','warehouse'];
describe('Fase 9 — filtros visuales sin editar evidencia del modelo',()=>{
 it.each(scenes)('el filtro del visor de %s no modifica lectura ni sesión',scenarioId=>{
  const model=scenarioId==='safety'?'ppe' as const:'coco' as const;
  let telemetry=updateYoloTelemetry(INITIAL_YOLO_TELEMETRY,
   {type:'status',phase:'running',model});
  telemetry=updateYoloTelemetry(telemetry,{type:'frame',observation:{
   frameNumber:1,capturedAtMs:1000,completedAtMs:1200,inferenceMs:200,
   model,detections:raw,source:{
    scenarioId,elapsedMs:1000,graphics:'human',camera:'isometric'
   }
  }});
  const view=filterDetectionsForDisplay(raw,{minConfidence:.85,classId:'person'});
  expect(view).toHaveLength(1);
  expect(telemetry.observations[0].detections).toHaveLength(2);
  const record=buildSimulationSession({scenarioId,scenarioName:scenarioId,
   mode:'yolo',elapsed:20,graphics:'light',camera:'superior',telemetry},
   new Date('2026-11-04T16:00:00Z'),'filtered-'+scenarioId);
  expect(record.inference?.detections).toHaveLength(2);
  expect(record.source.elapsedMs).toBe(1000);
  expect(record.source.camera).toBe('isometric');
 });
 it('filtrar todo a vacío no puede convertirse en cumplimiento o pérdida de evidencia',()=>{
  const empty=filterDetectionsForDisplay(raw,{minConfidence:.95,classId:null});
  expect(empty).toHaveLength(0);
  expect(raw).toHaveLength(2);
  const nothing=filterDetectionsForDisplay([],{minConfidence:.35,classId:null});
  expect(nothing).toEqual([]);
 });
 it('una lectura COCO no genera incidencias EPP por clase o filtros',()=>{
  let t=updateYoloTelemetry(INITIAL_YOLO_TELEMETRY,
   {type:'status',phase:'running',model:'coco'});
  t=updateYoloTelemetry(t,{type:'frame',observation:{
   frameNumber:1,capturedAtMs:1000,completedAtMs:1200,inferenceMs:200,
   model:'coco',detections:raw
  }});
  expect(t.activeReview).toEqual([]);
  expect(t.reviewLog).toEqual([]);
 });
});
