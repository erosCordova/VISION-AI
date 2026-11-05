import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const code=(path:string)=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');
describe('Laboratorio visual con reconocimiento y persistencia reales',()=>{
 it('Visión IA presenta controles de trabajo y no la guía de texto',()=>{
  const app=code('src/app/App.tsx');
  const ui=code('src/modules/detections/pages/VisionWorkspace.tsx');
  expect(app).toContain("page === 'Visión IA' && <VisionWorkspace");
  expect(app).not.toContain('Todo en un espacio de análisis');
  expect(ui).toContain('<InteractiveSimulator');
  expect(ui).toContain('initialMode="yolo"');
  expect(ui).toContain('<LiveTrafficAnalysis');
  expect(ui).toContain('onClick={()=>setSource(\'cameras\')}');
  expect(ui).toContain('onHistory');
 });
 it('las cifras provienen del repositorio y no de estadísticas inventadas',()=>{
  const ui=code('src/modules/detections/pages/VisionWorkspace.tsx');
  expect(ui).toContain('sessionRepository.list()');
  expect(ui).toContain('liveObservationRepository.list()');
  expect(ui).toContain('validateReproducibility');
  expect(ui).toContain('session.inference?.reviewLog.length');
  expect(ui).toContain('record.detections.length');
  expect(ui).toContain('vision-ai-live-updated');
  expect(ui).toContain('vision-ai-sessions-updated');
 });
 it('mantiene el guardado voluntario y el historial local',()=>{
  const live=code('src/modules/analysis/pages/LiveTrafficAnalysis.tsx');
  const simulator=code('src/modules/scenarios/pages/InteractiveSimulator.tsx');
  expect(live).toContain('await liveRepository.save(item)');
  expect(simulator).toContain('await sessionRepository.save(record)');
  expect(simulator).toContain('initialMode');
  expect(code('src/modules/settings/pages/PrivacyCenter.tsx')).toContain('totalLocal===0');
 });
});
