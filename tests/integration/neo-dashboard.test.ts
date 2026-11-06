import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const source=(file:string)=>readFileSync(new URL('../../'+file,import.meta.url),'utf8');
describe('Rediseño visual VISION AI',()=>{
 it('conecta cámaras, escenas y resultados a herramientas reales',()=>{
  const home=source('src/modules/experience/CommandHome.tsx');
  const app=source('src/app/App.tsx');
  const nav=source('src/app/layout/Sidebar.tsx');
  expect(home).toContain('onScene(scene.id)');
  expect(home).toContain('onCameras');
  expect(home).toContain('onHistory');
  expect(app).toContain('<CommandHome');
  expect(nav).toContain("label:'Cámaras públicas'");
  expect(nav).toContain("source:'live'");
  expect(nav).toContain("source:'simulated'");
 });
 it('presenta métricas guardadas, sin precisión ni conteos ficticios',()=>{
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
 it('conserva los cuatro escenarios y motores originales',()=>{
  const home=source('src/modules/experience/CommandHome.tsx');
  for(const id of ['safety','quality','retail','warehouse'])
   expect(home).toContain("id:'"+id+"'");
  const page=source('src/modules/analysis/pages/LiveAnalysisPage.tsx');
  expect(page).toContain('<InteractiveSimulator');
  expect(page).toContain('<LiveTrafficAnalysis');
 });
});
