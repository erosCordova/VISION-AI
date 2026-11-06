import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const source=(file:string)=>readFileSync(new URL('../../'+file,import.meta.url),'utf8');
describe('Navegación clara y panel sin enlaces duplicados',()=>{
 it('presenta escenarios distintos, sin cuatro accesos rápidos para repetir el menú',()=>{
  const home=source('src/modules/experience/CommandHome.tsx');
  expect(home).toContain('onScene(scene.id)');
  expect(home).toContain('onCameras');
  expect(home).toContain('Explorar simulación 3D');
  expect(home).toContain('Demostración con cámaras públicas');
  expect(home).not.toContain('neo-shortcut-grid');
  expect(home).not.toContain('neo-recent neo-glass');
  expect(home).not.toContain('Abrir laboratorio');
  expect(home).not.toContain('Iniciar simulación 3D');
  expect(home).not.toContain('onHistory');
  expect(home).not.toContain('onStatistics');
 });
 it('tiene un espacio de análisis y estadísticas como página propia',()=>{
  const app=source('src/app/App.tsx');
  const nav=source('src/app/layout/Sidebar.tsx');
  const routes=source('src/app/router/navigation.ts');
  expect(app).toContain("page === 'Estadísticas' && <section");
  expect(app).toContain('<SessionsDashboard');
  expect(app).toContain('<LiveObservationsDashboard');
  expect(app).toContain('<CommandHome');
  expect(app).not.toContain('<VisionWorkspace');
  expect(nav).toContain("label:'Cámaras públicas'");
  expect(nav).toContain("label:'Simulador 3D'");
  expect(nav).toContain("page:'Estadísticas'");
  expect(nav).not.toContain("label:'Laboratorio IA'");
  expect(nav).not.toContain("label:'Administración'");
  expect(routes).toContain("if(name==='Visión IA')return 'Análisis en vivo'");
 });
 it('mantiene cuatro escenarios y los motores de reconocimiento',()=>{
  const home=source('src/modules/experience/CommandHome.tsx');
  for(const id of ['safety','quality','retail','warehouse'])
   expect(home).toContain("id:'"+id+"'");
  const page=source('src/modules/analysis/pages/LiveAnalysisPage.tsx');
  expect(page).toContain('<InteractiveSimulator');
  expect(page).toContain('<LiveTrafficAnalysis');
 });
 it('usa registros verdaderos y conserva la ilustración industrial aprobada',()=>{
  const home=source('src/modules/experience/CommandHome.tsx');
  expect(home).toContain('sessions.list()');
  expect(home).toContain('observations.list()');
  expect(home).toContain('r.inference!.detections');
  expect(home).toContain('chartPath(summary.activity');
  expect(home).toContain('Confianza media');
  expect(home).toContain('ILUSTRACIÓN DEL PROYECTO');
  expect(home).toContain('src="/visuals/vision-ai-supervision-industrial.webp"');
  expect(home).not.toContain('96%');
  expect(home).not.toContain('1,248');
 });
});
