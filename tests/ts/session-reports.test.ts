import {describe,it,expect} from 'vitest';
import {buildHistoryCsv,buildHistoryAuditReport,historyReportMetrics,
 filterHistoryRecords,csvDocument,DEFAULT_HISTORY_FILTER,linkedReviews} from '../../src/modules/history/session-reports';
import {buildSimulationSession} from '../../src/modules/live/simulation-session-model';
import {INITIAL_YOLO_TELEMETRY} from '../../src/modules/live/yolo-telemetry';
import type {SimulationSession} from '../../src/core/domain/simulation-session';
import type {ReviewClosure} from '../../src/core/domain/review-closure';
const now=new Date('2026-11-04T20:30:00Z');
function session(id:string,scenario:'safety'|'retail'='safety',mode:'yolo'|'synthetic'='yolo'):SimulationSession{
 const base=buildSimulationSession({scenarioId:scenario,scenarioName:scenario==='safety'?'Seguridad':'Retail',
  elapsed:10,graphics:'human',camera:'frontal',mode:'synthetic',telemetry:INITIAL_YOLO_TELEMETRY},
  new Date('2026-11-04T20:00:00Z'),id);
 if(mode==='synthetic')return base;
 return {...base,mode:'yolo',inference:{
  model:scenario==='safety'?'ppe':'coco',modelLabel:'YOLO',
  frameNumber:5,observedAtMs:now.getTime()-1000,inferenceMs:42,
  detections:[{id:'obj',classId:'person',label:'Persona',
   confidence:.9,box:{x:.1,y:.2,width:.2,height:.3}}],
  reviewLog:scenario==='safety'?[{id:'no-hardhat-5',classId:'no-hardhat',label:'Sin casco',
   observedAtMs:now.getTime()-1000,frameNumber:5,supportingFrames:2,maxConfidence:.8}]:[]
 }};
}
const saved=[session('alpha'),session('beta','retail'),session('gamma','retail','synthetic')];
const closures:ReviewClosure[]=[{sessionId:'alpha',eventId:'no-hardhat-5',closedAt:now.toISOString(),
 decision:'follow_up',note:'Inspección presencial'},
 {sessionId:'unrelated',eventId:'no-hardhat-5',closedAt:now.toISOString(),decision:'dismissed'}];
describe('Fase 12 — informes exclusivamente desde sesiones guardadas',()=>{
 it('resumen no inventa inferencias, reviews ni precision',()=>{
  const metrics=historyReportMetrics(saved,closures);
  expect([metrics.total,metrics.yolo,metrics.detections,metrics.reviews,metrics.open,metrics.closed])
   .toEqual([3,2,2,1,0,1]);
  expect(metrics.meanInferenceMs).toBe(42);
 });
 it('filtra el conjunto entero antes de calcular exportaciones',()=>{
  const results=filterHistoryRecords(saved,closures,
   {...DEFAULT_HISTORY_FILTER,scenario:'retail',mode:'yolo'},now);
  expect(results.map(r=>r.id)).toEqual(['beta']);
  expect(buildHistoryCsv('sessions',results,closures)).not.toContain('alpha');
 });
 it('filtra las sesiones con revisión abierta o cerrada sin borrar la evidencia',()=>{
  expect(filterHistoryRecords(saved,closures,{...DEFAULT_HISTORY_FILTER,review:'closed'},now).map(r=>r.id))
   .toEqual(['alpha']);
  expect(filterHistoryRecords(saved,closures,{...DEFAULT_HISTORY_FILTER,review:'open'},now)).toHaveLength(0);
  expect(saved).toHaveLength(3);
 });
 it('periodo futuro no mezcla sesiones existentes',()=>{
  expect(filterHistoryRecords(saved,closures,{...DEFAULT_HISTORY_FILTER,period:'day'},
   new Date('2026-12-11T00:00:00Z'))).toEqual([]);
 });
 it('CSV usa BOM UTF-8, punto y coma y comillas para Excel',()=>{
  const csv=buildHistoryCsv('sessions',saved,closures);
  expect(csv.startsWith('\uFEFF')).toBe(true);
  expect(csv).toContain('"ID sesión";"Guardada UTC"');
  expect(csv).toContain('"alpha"');
  expect(csv.split('\r\n').filter(Boolean)).toHaveLength(4);
 });
 it('exporta solo las detecciones reales: ninguna fila falsa en sesiones sin YOLO',()=>{
  const csv=buildHistoryCsv('detections',saved,closures);
  expect(csv.split('\r\n').filter(Boolean)).toHaveLength(3);
  expect(csv).not.toContain('"gamma"');
  expect(csv).toContain('"person"');
 });
 it('CSV de revisiones conserva decisión y nota, no registros huérfanos',()=>{
  const csv=buildHistoryCsv('reviews',saved,closures);
  expect(csv).toContain('"Requiere seguimiento humano"');
  expect(csv).toContain('"Inspección presencial"');
  expect(csv).not.toContain('unrelated');
  expect(linkedReviews(saved,closures)).toHaveLength(1);
 });
 it('protege hoja de cálculo contra fórmula en etiquetas y notas',()=>{
  const csv=csvDocument(['Entrada','Nota'],[['=SUM(1;1)',' @look'],
   ['+2','-cmd'],['texto "literal"','normal']]);
  expect(csv).toContain('"\'=SUM(1;1)"');
  expect(csv).toContain('"\' @look"');
  expect(csv).toContain('"\'+2"');
  expect(csv).toContain('"\'-cmd"');
  expect(csv).toContain('"texto ""literal"""');
 });
 it('JSON de auditoría es reproducible, con huellas y sin datos externos',()=>{
  const audit=JSON.parse(buildHistoryAuditReport(saved,closures,now));
  expect(audit.schemaVersion).toBe('vision-ai-local-report-v1');
  expect(audit.source).toBe('indexeddb-local');
  expect(audit.sessions).toHaveLength(3);
  expect(audit.reviewClosures).toHaveLength(1);
  expect(audit.sessions[0].source.fingerprint).toMatch(/^[a-f0-9]{8}$/);
  expect(audit.metrics.closed).toBe(1);
 });
 it('sin sesiones, exportaciones con cabecera, sin datos fabricados',()=>{
  expect(buildHistoryCsv('sessions',[],[]).split('\r\n').filter(Boolean)).toHaveLength(1);
  expect(buildHistoryCsv('reviews',[],[]).split('\r\n').filter(Boolean)).toHaveLength(1);
  expect(historyReportMetrics([],[]).meanInferenceMs).toBeNull();
 });
 it('rechaza esquema de filas inconsistente y nombre de informe no permitido',()=>{
  expect(()=>csvDocument(['ID'],[['a','b']])).toThrow();
  expect(()=>buildHistoryCsv('unsupported' as 'sessions',saved,closures)).toThrow();
 });
 it('la generación de informes no cambia las sesiones ni cierres',()=>{
  const before=JSON.stringify({saved,closures});
  buildHistoryAuditReport(saved,closures,now);
  buildHistoryCsv('detections',saved,closures);
  expect(JSON.stringify({saved,closures})).toBe(before);
 });
});
