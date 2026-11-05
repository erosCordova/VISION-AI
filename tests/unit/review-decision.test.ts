import {describe,it,expect} from 'vitest';
import {REVIEW_DECISIONS,validateReviewClosure,validateReviewDecision} from '../../src/core/domain/review-closure';
import type {ReviewDecision} from '../../src/core/domain/review-closure';
import {collectReviewItems,withReviewClosed} from '../../src/modules/alerts/services/review-state';
import {buildSimulationSession} from '../../src/modules/scenarios/services/simulation-session-model';
import {INITIAL_YOLO_TELEMETRY} from '../../src/modules/detections/services/yolo-telemetry';
import type {SimulationSession} from '../../src/core/domain/simulation-session';
function fixture():SimulationSession{
 const base=buildSimulationSession({scenarioId:'safety',scenarioName:'Seguridad Industrial',
  elapsed:10,graphics:'light',camera:'frontal',mode:'synthetic',
  telemetry:INITIAL_YOLO_TELEMETRY},new Date('2026-11-04T20:00:00Z'),'audit-session');
 return {...base,mode:'yolo',inference:{
  model:'ppe',modelLabel:'YOLOv8s EPP',frameNumber:3,observedAtMs:1000,
  inferenceMs:99,detections:[],reviewLog:[{id:'epp-3',classId:'no-hardhat',
   label:'Sin casco',observedAtMs:1000,frameNumber:3,supportingFrames:2,maxConfidence:.81}]
 }};
}
describe('Fase 11 — decisiones sin mutar evidencia YOLO',()=>{
 it.each(['follow_up','dismissed','inconclusive','reviewed'] as ReviewDecision[])('valida %s',decision=>{
  expect(()=>validateReviewDecision(decision,'Nota local')).not.toThrow();
  expect(REVIEW_DECISIONS[decision]).toBeTruthy();
 });
 it('cierre histórico sin decisión sigue siendo revisado',()=>{
  const row={sessionId:'audit-session',eventId:'epp-3',closedAt:'2026-11-04T20:02:00Z'};
  validateReviewClosure(row);
  expect(collectReviewItems([fixture()],[row])[0].decision).toBe('reviewed');
 });
 it('resolución y nota conservan la sesión original sin mutación',()=>{
  const s=fixture(),snapshot=JSON.stringify(s);
  const rows=withReviewClosed([],'audit-session','epp-3','2026-11-04T20:02:00Z',
   'follow_up','Inspección presencial');
  const result=collectReviewItems([s],rows)[0];
  expect([result.status,result.decision,result.note]).toEqual(['closed','follow_up','Inspección presencial']);
  expect(JSON.stringify(s)).toBe(snapshot);
 });
 it('segunda decisión para el mismo indicio no cambia la primera',()=>{
  const a=withReviewClosed([],'audit-session','epp-3','2026-11-04T20:02:00Z','dismissed');
  expect(withReviewClosed(a,'audit-session','epp-3','2026-11-04T20:03:00Z','follow_up')).toBe(a);
 });
 it('rechaza notas largas, fechas inválidas y decisiones ajenas',()=>{
  expect(()=>validateReviewDecision('confirmed-violation','')).toThrow();
  expect(()=>validateReviewDecision('follow_up','x'.repeat(241))).toThrow();
  expect(()=>validateReviewDecision('dismissed',' nota ')).toThrow();
  expect(()=>validateReviewClosure({sessionId:'s',eventId:'e',closedAt:'ayer'})).toThrow();
 });
 it('cierre de otra sesión no cierra el registro real',()=>{
  const rows=withReviewClosed([],'other','epp-3','2026-11-04T20:00:00Z');
  expect(collectReviewItems([fixture()],rows)[0].status).toBe('open');
 });
 it('ausencia de inferencias no produce revisiones ni alertas',()=>{
  const source=buildSimulationSession({scenarioId:'retail',scenarioName:'Retail',
   elapsed:10,graphics:'light',camera:'frontal',mode:'synthetic',
   telemetry:INITIAL_YOLO_TELEMETRY},new Date('2026-11-04T20:00:00Z'),'none');
  expect(collectReviewItems([source],[])).toEqual([]);
 });
});
