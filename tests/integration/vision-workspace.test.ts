import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const code=(path:string)=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');
describe('Único espacio de análisis visual, sin pantallas duplicadas',()=>{
 it('las URLs antiguas abren el espacio real de análisis y ajustes',()=>{
  const app=code('src/app/App.tsx');
  const navigation=code('src/app/router/navigation.ts');
  expect(navigation).toContain("if(name==='Visión IA')return 'Análisis en vivo'");
  expect(navigation).toContain("if(name==='Administración')return 'Configuración'");
  expect(app).toContain("page === 'Análisis en vivo' && <LiveAnalysisPage");
  expect(app).not.toContain("page === 'Visión IA' && <VisionWorkspace");
  expect(app).not.toContain("page === 'Administración' && role === 'administrador'");
 });
 it('cada modalidad seleccionada utiliza el motor existente y guarda los resultados',()=>{
  const page=code('src/modules/analysis/pages/LiveAnalysisPage.tsx');
  const live=code('src/modules/analysis/pages/LiveTrafficAnalysis.tsx');
  const simulator=code('src/modules/scenarios/pages/InteractiveSimulator.tsx');
  expect(page).toContain('<InteractiveSimulator');
  expect(page).toContain('<LiveTrafficAnalysis');
  expect(page).toContain('selectVisualSource');
  expect(live).toContain('await liveRepository.save(item)');
  expect(simulator).toContain('await sessionRepository.save(record)');
  expect(simulator).toContain('initialMode');
 });
 it('el historial y privacidad siguen siendo secciones independientes',()=>{
  const app=code('src/app/App.tsx');
  expect(app).toContain("page === 'Historial' && <HistoryPanel");
  expect(app).toContain("page === 'Privacidad' && <PrivacyCenter");
  expect(app).toContain("page === 'Operaciones' && <OperationsPanel");
  expect(code('src/modules/settings/pages/PrivacyCenter.tsx')).toContain('totalLocal===0');
 });
 it('la búsqueda ofrece un acceso por función y acceso directo a cada escenario',()=>{
  const palette=code('src/modules/experience/StudioCommandPalette.tsx');
  expect(palette).toContain("label:'Simulador 3D'");
  expect(palette).toContain("label:'Cámaras públicas'");
  expect(palette).toContain("label:'Estadísticas'");
  expect(palette).not.toContain("label:'Laboratorio IA'");
  expect(palette).not.toContain("label:'Análisis en vivo'");
  expect(palette).toContain('onScenario(s.key as WorldKey)');
 });
});
