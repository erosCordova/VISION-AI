import {describe,it,expect} from 'vitest';
import {INITIAL_YOLO_TELEMETRY,updateYoloTelemetry} from '../../src/modules/live/yolo-telemetry';
import {buildSimulationSession,validateReproducibility} from '../../src/modules/live/simulation-session-model';
import type {YoloFrameSource} from '../../src/modules/live/yolo-telemetry';
const scenes=['safety','quality','retail','warehouse'] as const;
function make(source:YoloFrameSource){
 let state=updateYoloTelemetry(INITIAL_YOLO_TELEMETRY,
  {type:'status',phase:'running',model:source.scenarioId==='safety'?'ppe':'coco'});
 state=updateYoloTelemetry(state,{type:'frame',observation:{
  model:source.scenarioId==='safety'?'ppe':'coco',frameNumber:1,
  capturedAtMs:1000,completedAtMs:1300,inferenceMs:250,
  detections:[],source
 }});
 return state;
}
const scene=(scenarioId:typeof scenes[number]):YoloFrameSource=>({
 scenarioId,elapsedMs:12300,graphics:'human',camera:'frontal'
});
describe('Fase 9 — historial vinculado al frame YOLO, no al estado al guardar',()=>{
 it.each(scenes)('conserva el estado capturado de %s aunque el simulador avance',scenarioId=>{
  const telemetry=make(scene(scenarioId));
  const saved=buildSimulationSession({scenarioId,scenarioName:scenarioId,
   elapsed:79.9,graphics:'light',camera:'superior',mode:'yolo',telemetry},
   new Date('2026-11-04T16:00:00Z'),'captured-'+scenarioId);
  expect(saved.source.elapsedMs).toBe(12300);
  expect(saved.source.graphics).toBe('human');
  expect(saved.source.camera).toBe('frontal');
  expect(saved.inference?.frameNumber).toBe(1);
  expect(saved.inference?.observedAtMs).toBe(1000);
  expect(saved.inference?.detections).toEqual([]);
  expect(()=>validateReproducibility(saved)).not.toThrow();
 });
 it('rechaza adjuntar un frame capturado en otro escenario',()=>{
  const telemetry=make(scene('retail'));
  expect(()=>buildSimulationSession({scenarioId:'warehouse',scenarioName:'Logística',
   elapsed:12,graphics:'human',camera:'frontal',mode:'yolo',telemetry},
   new Date('2026-11-04T16:00:00Z'),'wrong')).toThrow(/no corresponde/);
 });
 it('no rompe el monitor con metadatos de escena corruptos o ausentes',()=>{
  const broken=updateYoloTelemetry(updateYoloTelemetry(INITIAL_YOLO_TELEMETRY,
   {type:'status',phase:'running',model:'coco'}),{type:'frame',observation:{
    frameNumber:1,capturedAtMs:1000,inferenceMs:100,model:'coco',detections:[],
    source:null as unknown as YoloFrameSource
   }});
  expect(broken.observations).toHaveLength(0);
  const strange=make({...scene('safety'),camera:'inventada' as YoloFrameSource['camera']});
  expect(strange.observations).toHaveLength(0);
 });
 it('ignora una observación con datos de origen inválidos',()=>{
  const bad={...scene('quality'),elapsedMs:-100};
  const telemetry=make(bad);
  expect(telemetry.observations).toHaveLength(0);
 });
 it('registros anteriores sin origen detallado siguen siendo compatibles',()=>{
  let telemetry=updateYoloTelemetry(INITIAL_YOLO_TELEMETRY,
   {type:'status',phase:'running',model:'coco'});
  telemetry=updateYoloTelemetry(telemetry,{type:'frame',observation:{
   frameNumber:2,capturedAtMs:1000,inferenceMs:90,detections:[],model:'coco'
  }});
  const record=buildSimulationSession({scenarioId:'retail',scenarioName:'Retail',
   elapsed:17,graphics:'light',camera:'superior',mode:'yolo',telemetry},
   new Date('2026-11-04T16:00:00Z'),'legacy');
  expect(record.source.elapsedMs).toBe(17000);
  expect(record.source.camera).toBe('superior');
 });
});
