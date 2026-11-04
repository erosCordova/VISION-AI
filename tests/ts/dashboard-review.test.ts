import {describe,it,expect} from 'vitest';
import {performance} from 'node:perf_hooks';
import type {SimulationSession} from '../../src/core/domain/simulation-session';
import type {ReviewClosure} from '../../src/core/domain/review-closure';
import {buildSimulationSession} from '../../src/modules/live/simulation-session-model';
import {INITIAL_YOLO_TELEMETRY} from '../../src/modules/live/yolo-telemetry';
import {collectReviewItems,withReviewClosed} from '../../src/modules/dashboard/review-state';
import {calculateDashboard,DEFAULT_DASHBOARD_FILTER} from '../../src/modules/dashboard/dashboard-metrics';

const now=new Date('2026-11-04T18:30:00Z');
function session(id:string,reviewCount=1):SimulationSession{
 const base=buildSimulationSession({
  scenarioId:'safety',scenarioName:'Seguridad Industrial',
  elapsed:20,graphics:'light',camera:'isometric',
  mode:'synthetic',telemetry:INITIAL_YOLO_TELEMETRY
 },new Date('2026-11-04T18:00:00Z'),id);
 const evidence=Array.from({length:reviewCount},(_,i)=>({
  id:'no-hardhat-'+i,classId:'no-hardhat',label:'Posible ausencia de casco',
  observedAtMs:now.getTime()-1000-i*1000,frameNumber:7+i,
  supportingFrames:2,maxConfidence:.82
 }));
 return {...base,mode:'yolo',inference:{
  model:'ppe',modelLabel:'YOLOv8s EPP',
  frameNumber:20,observedAtMs:now.getTime()-500,
  inferenceMs:73,detections:[],reviewLog:evidence
 }};
}
describe('Fase 8: KP02 revisión idempotente de alertas',()=>{
 it('indicio guardado es pendiente hasta registrarse cierre explícito',()=>{
  const s=session('one');
  const result=collectReviewItems([s],[]);
  expect(result).toHaveLength(1);
  expect(result[0].status).toBe('open');
  expect(result[0].closedAt).toBeNull();
  expect(s.inference?.reviewLog[0].id).toBe('no-hardhat-0');
 });
 it('KP02: cerrar disminuye pendientes 1 y aumenta revisados 1, una sola vez',()=>{
  const s=session('one',2);
  const before=calculateDashboard([s],DEFAULT_DASHBOARD_FILTER,now,[]);
  expect([before.reviewEvents,before.openReviews,before.closedReviews]).toEqual([2,2,0]);
  const first=withReviewClosed([],'one','no-hardhat-0','2026-11-04T18:29:00Z');
  const after=calculateDashboard([s],DEFAULT_DASHBOARD_FILTER,now,first);
  expect([after.reviewEvents,after.openReviews,after.closedReviews]).toEqual([2,1,1]);
  const repeated=withReviewClosed(first,'one','no-hardhat-0','2026-11-04T18:30:00Z');
  expect(repeated).toBe(first);
  const again=calculateDashboard([s],DEFAULT_DASHBOARD_FILTER,now,repeated);
  expect([again.reviewEvents,again.openReviews,again.closedReviews]).toEqual([2,1,1]);
  expect(s.inference?.reviewLog).toHaveLength(2); // evidencia no se modifica
 });
 it('separa claves idénticas entre sesiones distintas',()=>{
  const a=session('a'),b=session('b');
  const closed:ReviewClosure[]=[{sessionId:'a',eventId:'no-hardhat-0',closedAt:'2026-11-04T18:20:00Z'}];
  const rows=collectReviewItems([a,b],closed);
  expect(rows.filter(x=>x.status==='closed').map(x=>x.sessionId)).toEqual(['a']);
  expect(rows.filter(x=>x.status==='open').map(x=>x.sessionId)).toEqual(['b']);
 });
 it('filtra por escenario, modo, fecha antes de contar revisiones',()=>{
  const valid=session('a'),old={...session('b'),savedAt:'2026-10-04T00:00:00Z'};
  const closed=[{sessionId:'b',eventId:'no-hardhat-0',closedAt:'2026-10-04T00:03:00Z'}];
  const result=calculateDashboard([valid,old],{period:'day',mode:'yolo',scenario:'safety'},now,closed);
  expect([result.reviewEvents,result.openReviews,result.closedReviews]).toEqual([1,1,0]);
 });
 it('el histórico de cierre no se convierte en una nueva detección o infracción',()=>{
  const s=session('one');
  const closed=withReviewClosed([],'one','no-hardhat-0','2026-11-04T18:29:00Z');
  const r=calculateDashboard([s],DEFAULT_DASHBOARD_FILTER,now,closed);
  expect(r.detections).toBe(0);
  expect(r.reviewEvents).toBe(1);
  expect(r.closedReviews).toBe(1);
  expect(r.recentReviews).toHaveLength(1);
  expect(r.recentReviews[0].status).toBe('closed');
  expect(r.meanConfidence).toBeNull();
 });
 it('el mismo evento duplicado dentro de una sesión no se cuenta dos veces',()=>{
  const a=session('one');
  const duplicate={...a,inference:{...a.inference!,reviewLog:[
   ...a.inference!.reviewLog,...a.inference!.reviewLog
  ]}} as SimulationSession;
  expect(collectReviewItems([duplicate],[])).toHaveLength(1);
  expect(calculateDashboard([duplicate],DEFAULT_DASHBOARD_FILTER,now).reviewEvents).toBe(1);
 });
});
describe('Fase 8: series y acceso a indicios sin resultados ficticios',()=>{
 it('los episodios recientes conservan su estado y la serie agrupa sesiones por día',()=>{
  const a=session('a',1),b=session('b',1);
  const closes=[{sessionId:'b',eventId:'no-hardhat-0',closedAt:'2026-11-04T18:00:00Z'}];
  const report=calculateDashboard([a,b],DEFAULT_DASHBOARD_FILTER,now,closes);
  expect(report.recentReviews).toHaveLength(2);
  expect(report.recentReviews.filter(r=>r.status==='closed')).toHaveLength(1);
  expect(report.openReviews+report.closedReviews).toBe(report.reviewEvents);
  expect(report.byDay).toEqual([{date:'2026-11-04',count:2}]);
 });
 it('sin registros no se fabrican series, clases ni episodios',()=>{
  const report=calculateDashboard([],DEFAULT_DASHBOARD_FILTER,now);
  expect(report.recentReviews).toEqual([]);
  expect(report.byDay).toEqual([]);
  expect(report.meanConfidence).toBeNull();
 });
});
describe('KP01/KP03: rendimiento con límite objetivo de 100 sesiones',()=>{
 it('calcula 100 sesiones y 1200 indicios sin resultados falsos ni latencia excesiva',()=>{
  const samples=Array.from({length:100},(_,i)=>session('volume-'+i,12));
  const closed=Array.from({length:50},(_,i)=>({
   sessionId:'volume-'+i,eventId:'no-hardhat-0',closedAt:'2026-11-04T18:29:00Z'
  }));
  const t=performance.now();
  let result=calculateDashboard(samples,DEFAULT_DASHBOARD_FILTER,now,closed);
  for(let i=0;i<99;i++)result=calculateDashboard(samples,DEFAULT_DASHBOARD_FILTER,now,closed);
  const duration=performance.now()-t;
  expect(result.sessions).toBe(100);
  expect(result.reviewEvents).toBe(1200);
  expect(result.openReviews).toBe(1150);
  expect(result.closedReviews).toBe(50);
  expect(result.detections).toBe(0);
  expect(duration).toBeLessThan(2000); // 100 consultas para 100 registros en CI
  console.log('KP rendimiento: 100 cálculos de 100 sesiones / 1200 eventos: '+duration.toFixed(1)+' ms');
 });
});
