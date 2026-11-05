import {describe,it,expect} from 'vitest';
import {INITIAL_YOLO_TELEMETRY,updateYoloTelemetry,detectedClasses,observedCaptureFps,observedYoloFps,reviewSignals,modelScope,stableReviewSignals} from '../../src/modules/detections/services/yolo-telemetry';
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
  expect(modelScope('warehouse','coco')).toContain('equipos de almacén');
  expect(modelScope('retail','coco')).toContain('personas');
  expect(modelScope('safety','ppe')).toContain('seguridad');
 });
});


describe('revisión de EPP basada exclusivamente en evidencia repetida de YOLO',()=>{
 const start=()=>updateYoloTelemetry(INITIAL_YOLO_TELEMETRY,
  {type:'status',phase:'running',model:'ppe'});
 const feed=(state:ReturnType<typeof start>,n:number,time:number,ids:string[],confidence=.84)=>
  updateYoloTelemetry(state,{type:'frame',observation:sample(n,time,'ppe',ids.map(id=>detection(id,confidence)))});
 it('no genera una alerta por un solo fotograma, aunque contenga dos cajas de la misma clase',()=>{
  const state=feed(start(),1,1000,['no-hardhat','no-hardhat']);
  expect(state.activeReview).toHaveLength(0);
  expect(state.reviewLog).toHaveLength(0);
 });
 it('genera un indicio después de dos fotogramas positivos, no una infracción confirmada',()=>{
  let state=feed(start(),1,1000,['no-hardhat']);
  state=feed(state,2,2000,['no-hardhat']);
  expect(state.activeReview).toHaveLength(1);
  expect(state.activeReview[0]).toMatchObject({
   classId:'no-hardhat',supportingFrames:2,maxConfidence:.84
  });
  expect(state.reviewLog).toHaveLength(1);
  expect(state.reviewLog[0]).toMatchObject({
   frameNumber:2,classId:'no-hardhat',observedAtMs:2000
  });
 });
 it('permite dos de tres fotogramas y no duplica el evento en cada lectura',()=>{
  let state=start();
  state=feed(state,1,1000,['no-safety vest']);
  state=feed(state,2,1500,[]);
  state=feed(state,3,2000,['no-safety vest']);
  expect(state.activeReview).toHaveLength(1);
  expect(state.reviewLog).toHaveLength(1);
  state=feed(state,4,2500,['no-safety vest']);
  expect(state.reviewLog).toHaveLength(1);
 });
 it('señales inactivas desaparecen si no se repiten; nuevos episodios generan nuevo evento',()=>{
  let state=start();
  state=feed(state,1,1000,['no-goggles']);
  state=feed(state,2,2000,['no-goggles']);
  expect(state.activeReview).toHaveLength(1);
  state=feed(state,3,3000,[]);
  state=feed(state,4,4000,[]);
  expect(state.activeReview).toHaveLength(0);
  state=feed(state,5,5000,['no-goggles']);
  state=feed(state,6,6000,['no-goggles']);
  expect(state.reviewLog).toHaveLength(2);
 });
 it('descarta scores bajos y la clase no-mask no validada',()=>{
  expect(stableReviewSignals([sample(1,1000,'ppe',[detection('no-hardhat',.54)]),
   sample(2,2000,'ppe',[detection('no-hardhat',.54)])])).toEqual([]);
  expect(stableReviewSignals([sample(1,1000,'ppe',[detection('no-mask')]),
   sample(2,2000,'ppe',[detection('no-mask')])])).toEqual([]);
  expect(stableReviewSignals([sample(1,1000,'coco',[detection('no-hardhat')]),
   sample(2,2000,'coco',[detection('no-hardhat')])])).toEqual([]);
 });
 it('no considera positivas dos lecturas separadas por más de 30 segundos',()=>{
  expect(stableReviewSignals([sample(1,1000,'ppe',[detection('no-hardhat')]),
   sample(2,42000,'ppe',[detection('no-hardhat')])])).toEqual([]);
 });
 it('no mezcla eventos de sesiones después de cambiar modelo o detener el detector',()=>{
  let state=start();
  state=feed(state,1,1000,['no-hardhat']);
  state=feed(state,2,1500,['no-hardhat']);
  state=updateYoloTelemetry(state,{type:'status',phase:'stopped',model:'ppe'});
  expect(state.activeReview).toHaveLength(0);
  expect(state.reviewLog).toHaveLength(1);
  state=updateYoloTelemetry(state,{type:'status',phase:'loading',model:'coco'});
  expect(state.reviewLog).toHaveLength(0);
  expect(state.activeReview).toHaveLength(0);
  state=updateYoloTelemetry(state,{type:'status',phase:'running',model:'coco'});
  const result=updateYoloTelemetry(state,{type:'frame',observation:sample(1,2000,'coco',[detection('no-hardhat')])});
  expect(result.reviewLog).toEqual([]);
 });
});

describe('Fase 8: telemetría de captura independiente del renderizador',()=>{
 it('mide frecuencia de capturas realmente entregadas y no confunde FPS WebGL',()=>{
  let t=updateYoloTelemetry(INITIAL_YOLO_TELEMETRY,{type:'status',phase:'running',model:'coco'});
  for(const capturedAtMs of [1000,1500,2000])
   t=updateYoloTelemetry(t,{type:'capture',model:'coco',capturedAtMs});
  expect(t.captureTimestamps).toEqual([1000,1500,2000]);
  expect(observedCaptureFps(t.captureTimestamps)).toBeCloseTo(2);
  expect(observedYoloFps(t.observations)).toBeNull();
 });
 it('cuenta capturas omitidas solo cuando no hubo canvas disponible',()=>{
  let t=updateYoloTelemetry(INITIAL_YOLO_TELEMETRY,{type:'status',phase:'running',model:'ppe'});
  t=updateYoloTelemetry(t,{type:'capture-skip',model:'ppe'});
  t=updateYoloTelemetry(t,{type:'capture-skip',model:'coco'});
  expect(t.skippedCaptures).toBe(1);
  expect(t.captureTimestamps).toHaveLength(0);
 });
 it('reinicia contadores al cambiar detector y no acepta lecturas tardías',()=>{
  let t=updateYoloTelemetry(INITIAL_YOLO_TELEMETRY,{type:'status',phase:'running',model:'ppe'});
  t=updateYoloTelemetry(t,{type:'capture',model:'ppe',capturedAtMs:2000});
  t=updateYoloTelemetry(t,{type:'capture',model:'ppe',capturedAtMs:1000});
  expect(t.captureTimestamps).toEqual([2000]);
  t=updateYoloTelemetry(t,{type:'status',phase:'loading',model:'coco'});
  expect(t.captureTimestamps).toHaveLength(0);
  expect(t.skippedCaptures).toBe(0);
  const ignored=updateYoloTelemetry(t,{type:'capture-skip',model:'ppe'});
  expect(ignored).toBe(t);
 });
 it('reporta ausencia de datos, no FPS inventados',()=>{
  expect(observedCaptureFps([])).toBeNull();
  expect(observedCaptureFps([1000])).toBeNull();
  expect(observedCaptureFps([1000,1000])).toBeNull();
 });
});
