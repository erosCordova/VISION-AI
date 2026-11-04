import {describe,expect,it} from 'vitest';
import {boxIoU,evaluateDetections,formatMetric} from '../../src/modules/live/ppe-evaluation';
import {pairDatasetFiles,parsePpeYaml,parseYoloLabels,readEvaluationDataset}
 from '../../src/modules/live/ppe-dataset';
import type {Detection} from '../../src/core/domain/model';
import type {GroundTruth,EvaluationSample} from '../../src/modules/live/ppe-evaluation';
const box={x:.1,y:.2,width:.3,height:.4};
const truth=(classId:string):GroundTruth=>({classId,box});
const pred=(classId:string,confidence=.9,override=box):Detection=>({
 id:classId+'-'+confidence,classId,label:classId,confidence,box:override
});
const sample=(id:string,groundTruth:GroundTruth[],predictions:Detection[]):EvaluationSample=>({
 id,groundTruth,predictions,inferenceMs:23
});
const file=(name:string,size=100,text=''):File=>
 ({name,size,type:name.endsWith('.png')?'image/png':'text/plain',
 text:async()=>text}) as unknown as File;
describe('Evaluación real EPP: IoU, P, R, F1 y AP50',()=>{
 it('IoU idéntico =1, no solapado =0 y parcial entre 0 y 1',()=>{
  expect(boxIoU(box,box)).toBe(1);
  expect(boxIoU(box,{x:.8,y:.8,width:.1,height:.1})).toBe(0);
  expect(boxIoU(box,{x:.2,y:.3,width:.3,height:.4})).toBeGreaterThan(0);
 });
 it('predicción perfecta produce P/R/F1/AP50 y mAP50 iguales a 100%',()=>{
  const report=evaluateDetections([sample('a',[truth('hardhat')],[pred('hardhat')])],['hardhat']);
  expect([report.precision,report.recall,report.f1,report.map50])
   .toEqual([1,1,1,1]);
  expect(report.tp).toBe(1);expect(report.fp).toBe(0);expect(report.fn).toBe(0);
 });
 it('detección duplicada = falso positivo; no se asignan dos predicciones a un GT',()=>{
  const r=evaluateDetections([sample('a',[truth('hardhat')],
   [pred('hardhat',.95),pred('hardhat',.90)])],['hardhat']);
  expect(r.tp).toBe(1);expect(r.fp).toBe(1);expect(r.fn).toBe(0);
  expect(r.precision).toBe(.5);expect(r.recall).toBe(1);
 });
 it('respeta la clase: detectar chaleco no equivale a casco',()=>{
  const r=evaluateDetections([sample('a',[truth('hardhat')],[pred('safety vest')])],
   ['hardhat','safety vest']);
  expect(r.tp).toBe(0);expect(r.fp).toBe(1);expect(r.fn).toBe(1);
  expect(r.map50).toBe(0);
 });
 it('clases sin GT no entran en mAP, pero cuentan predicciones falsas en precisión',()=>{
  const r=evaluateDetections([sample('a',[truth('hardhat')],
   [pred('hardhat'),pred('no-hardhat')])],['hardhat','no-hardhat']);
  expect(r.map50).toBe(1);expect(r.evaluatedClasses).toBe(1);
  expect(r.precision).toBe(.5);
  expect(r.perClass.find(c=>c.id==='no-hardhat')?.ap50).toBeNull();
 });
 it('sin datos no genera 100% de precisión inventada',()=>{
  const r=evaluateDetections([sample('fondo',[],[])],['person','hardhat']);
  expect(r.map50).toBeNull();expect(r.precision).toBeNull();
  expect(r.recall).toBeNull();expect(formatMetric(r.map50)).toBe('—');
 });
 it('sin detecciones con GT: recall 0, AP50=0 y precisión no definida',()=>{
  const r=evaluateDetections([sample('a',[truth('hardhat')],[])],['hardhat']);
  expect(r.recall).toBe(0);expect(r.map50).toBe(0);
  expect(r.precision).toBeNull();expect(r.fn).toBe(1);
 });
 it('el umbral cambia P/R/F1, no la curva AP50 de las mismas predicciones',()=>{
  const data=[sample('a',[truth('hardhat')],[pred('hardhat',.21)])];
  const low=evaluateDetections(data,['hardhat'],.2);
  const high=evaluateDetections(data,['hardhat'],.5);
  expect(low.recall).toBe(1);expect(high.recall).toBe(0);
  expect(low.map50).toBeCloseTo(high.map50!);
 });
 it('AP baja cuando un FP de mayor confianza antecede al TP',()=>{
  const r=evaluateDetections([sample('a',[truth('hardhat')],[
   pred('hardhat',.95,{x:.7,y:.7,width:.2,height:.2}),
   pred('hardhat',.75)
  ])],['hardhat']);
  expect(r.map50).toBeCloseTo(.5,3);
 });
 it('imágenes separadas mantienen estado GT independiente',()=>{
  const r=evaluateDetections([
   sample('a',[truth('person')],[pred('person')]),
   sample('b',[truth('person')],[pred('person')])
  ],['person']);
  expect(r.tp).toBe(2);expect(r.map50).toBe(1);
 });
 it('valida clases y umbrales en lugar de emitir números engañosos',()=>{
  expect(()=>evaluateDetections([],[])).toThrow();
  expect(()=>evaluateDetections([],['camión inexistente'])).toThrow();
  expect(()=>evaluateDetections([],['person'],0)).toThrow();
  expect(()=>evaluateDetections([],['person'],.35,0)).toThrow();
 });
});
describe('Datasets con anotaciones YOLO y data.yaml auténtico',()=>{
 it('interpreta índices permutados a partir del YAML real del dataset',()=>{
  const fixed=parsePpeYaml("train: images\nnames: ['no-hardhat', 'person', 'hardhat']");
  expect(fixed).toEqual(['no-hardhat','person','hardhat']);
  const labels=parseYoloLabels('0 0.5 0.5 0.4 0.4\n2 0.2 0.2 0.1 0.1',fixed);
  expect(labels.map(l=>l.classId)).toEqual(['no-hardhat','hardhat']);
  expect(labels[0].box.x).toBeCloseTo(.3);
 });
 it('admite YAML indexado y secuencias multilinea',()=>{
  expect(parsePpeYaml('names:\n  0: person\n  1: no-hardhat'))
   .toEqual(['person','no-hardhat']);
  expect(parsePpeYaml('names:\n  - hardhat\n  - gloves'))
   .toEqual(['hardhat','gloves']);
 });
 it('rechaza anotaciones con valores corruptos o clases no respaldadas',()=>{
  expect(()=>parseYoloLabels('2 0.5 0.5 0.1 0.1',['person'],'a.txt')).toThrow();
  expect(()=>parseYoloLabels('0 0.5 NaN 0.1 0.1',['person'],'a.txt')).toThrow();
  expect(()=>parseYoloLabels('0 0.95 0.5 0.2 0.3',['person'],'a.txt')).toThrow();
  expect(()=>parseYoloLabels('0 0.2 0.3 0.4',['person'],'a.txt')).toThrow();
  expect(()=>parsePpeYaml("names: ['random-item']")).toThrow();
  expect(()=>parsePpeYaml("names: ['person','person']")).toThrow();
 });
 it('exige pares imagen y .txt; una foto sin etiqueta no se asume negativa',()=>{
  expect(()=>pairDatasetFiles([file('a.png')],['person'])).toThrow();
  const list=pairDatasetFiles([file('a.png'),file('a.txt',10)],['person']);
  expect(list.pairs).toHaveLength(1);expect(list.missingLabels).toBe(0);
  expect(pairDatasetFiles([file('a.png')],['person'],true).missingLabels).toBe(1);
 });
 it('rechaza ambigüedad por nombres duplicados y anotaciones huérfanas',()=>{
  expect(()=>pairDatasetFiles([file('a.png'),file('a.jpg'),file('a.txt')],['person'])).toThrow();
  expect(()=>pairDatasetFiles([file('a.png'),file('b.txt')],['person'])).toThrow();
 });
 it('valida datos antes de generar estadísticas de evaluación',async()=>{
  const files=[file('data.yaml',40,"names: ['hardhat', 'person']"),
   file('test.png'),file('test.txt',20,'0 0.5 0.5 0.2 0.3')];
  const result=await readEvaluationDataset(files);
  expect(result.dataset.pairs).toHaveLength(1);
  expect(result.dataset.classIds).toEqual(['hardhat','person']);
  expect(result.truths.get('test')?.[0]?.classId).toBe('hardhat');
 });
});
