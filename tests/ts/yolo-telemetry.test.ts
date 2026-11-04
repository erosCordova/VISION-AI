import {describe,it,expect} from 'vitest';
import {INITIAL_YOLO_TELEMETRY,updateYoloTelemetry,detectedClasses,observedYoloFps,reviewSignals,modelScope} from '../../src/modules/live/yolo-telemetry';
import type {Detection} from '../../src/core/domain/model';
const detection=(id:string,score=.82):Detection=>({
 id:'det-'+id,classId:id,label:id,confidence:score,box:{x:.2,y:.2,width:.4,height:.4}
});
const sample=(frameNumber:number,time:number,model:'coco'|'ppe'='ppe',detections:readonly Detection[]=[])=>
 ({frameNumber,capturedAtMs:time,inferenceMs:75,model,detections});
describe('telemetría YOLO real vinculada exclusivamente a inferencias',()=>{
 it('no muestra recuentos artificiales si no hay fotogramas procesados',()=>{
  expect(INITIAL_YOLO_TELEMETRY.observations).toEqual([]);
  expect(observedYoloFps([])).toBeNull();
 });
 it('la carga de nuevo modelo borra observaciones de la sesión anterior',()=>{
  let s=updateYoloTelemetry(INITIAL_YOLO_TELEMETRY,{type:'status',phase:'running',model:'ppe'});
  s=updateYoloTelemetry(s,{type:'frame',observation:sample(1,100)});
  expect(s.observations).toHaveLength(1);
  s=updateYoloTelemetry(s,{type:'status',phase:'loading',model:'coco'});
  expect(s.observations).toHaveLength(0);
 });
 it('ignora muestras tardías, duplicadas o de modelos incompatibles',()=>{
  let s=updateYoloTelemetry(INITIAL_YOLO_TELEMETRY,{type:'status',phase:'running',model:'ppe'});
  s=updateYoloTelemetry(s,{type:'frame',observation:sample(2,200)});
  s=updateYoloTelemetry(s,{type:'frame',observation:sample(2,300)});
  s=updateYoloTelemetry(s,{type:'frame',observation:sample(3,100)});
  s=updateYoloTelemetry(s,{type:'frame',observation:sample(4,300,'coco')});
  expect(s.observations).toHaveLength(1);
  s=updateYoloTelemetry(s,{type:'status',phase:'stopped',model:'ppe'});
  expect(updateYoloTelemetry(s,{type:'frame',observation:sample(10,600)}).observations).toHaveLength(1);
 });
 it('limita el historial sin almacenar pixeles ni recursos GPU',()=>{
  let s=updateYoloTelemetry(INITIAL_YOLO_TELEMETRY,{type:'status',phase:'running',model:'coco'});
  for(let n=1;n<=80;n++)s=updateYoloTelemetry(s,{type:'frame',observation:sample(n,1000*n,'coco')});
  expect(s.observations).toHaveLength(30);
  expect(s.observations[0].frameNumber).toBe(51);
 });
 it('calcula las clases del último fotograma sin usar la cantidad de actores 3D',()=>{
  expect(detectedClasses([detection('person'),detection('person',.6),detection('truck')]))
   .toEqual([{id:'person',label:'person',count:2,meanConfidence:.71},
    {id:'truck',label:'truck',count:1,meanConfidence:.82}]);
  expect(detectedClasses([])).toEqual([]);
 });
 it('calcula FPS a partir de fechas de inferencia, no del renderizado 3D',()=>{
  expect(observedYoloFps([sample(1,1000),sample(2,1500),sample(3,2000)])).toBeCloseTo(2);
  expect(observedYoloFps([sample(1,1000),sample(2,1000)])).toBeNull();
 });
 it('solo muestra señales de revisión si YOLO EPP predijo clases explícitas',()=>{
  expect(reviewSignals('ppe',[detection('person'),detection('hardhat')])).toBe(0);
  expect(reviewSignals('ppe',[detection('no-hardhat'),detection('no-safety vest')])).toBe(2);
  expect(reviewSignals('coco',[detection('no-hardhat')])).toBe(0);
  expect(reviewSignals('ppe',[detection('no-mask')])).toBe(0);
 });
 it('documenta los límites de las clases para los cuatro escenarios',()=>{
  expect(modelScope('quality','coco')).toContain('defectos');
  expect(modelScope('warehouse','coco')).toContain('montacargas');
  expect(modelScope('retail','coco')).toContain('personas');
  expect(modelScope('safety','ppe')).toContain('cumplimiento');
 });
});
