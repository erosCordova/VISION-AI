import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const file=(p:string)=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');

describe('VISION AI: fondo azul hielo global',()=>{
 it('aplica un único tema al final, después de simulador y cámaras',()=>{
  const main=file('src/main.tsx');
  const all=main.indexOf("import './styles/global-ice.css'");
  expect(all).toBeGreaterThan(main.indexOf("import './styles/simulator-blue.css'"));
  expect(all).toBeGreaterThan(main.indexOf("import './styles/traffic-blue.css'"));
  expect(file('src/styles/global-ice.css')).toContain('GLOBAL_ICE_BLUE_V1');
 });
 it('colorea el contenedor de TODAS las vistas, incluso si no hay simulador',()=>{
  const css=file('src/styles/global-ice.css');
  expect(css).toContain('.neo-shell .workspace{');
  expect(css).toContain('background-color:#d9eeff');
  expect(css).toContain('.neo-shell main>.page-heading h1');
  expect(css).toContain('.neo-shell .neo-welcome h1');
  expect(css).toContain('.neo-shell .history-panel');
  expect(css).toContain('.neo-shell .privacy-center');
  expect(css).toContain('.neo-shell .operations-panel');
  expect(css).toContain('.neo-shell .session-settings');
  expect(css).toContain('.neo-shell .live-dashboard');
  expect(css).toContain('.neo-shell .saved-dashboard-metrics>div');
  expect(css).toContain('.neo-shell .sidebar');
  expect(css).toContain('.neo-shell .topbar');
 });
 it('respeta los visores y no altera la ejecución ni los modelos',()=>{
  const css=file('src/styles/global-ice.css');
  expect(css).toContain('.neo-shell .neo-preview-overlay');
  expect(css).toContain('.neo-shell .workspace:has(.simulator-v3)');
  expect(css).toContain('.neo-shell .workspace:has(.live-traffic-lab)');
  const app=file('src/app/App.tsx');
  expect(app).toContain('<CommandHome');
  expect(app).toContain('<VisionWorkspace');
  expect(app).toContain('<HistoryPanel');
  expect(app).toContain('<PrivacyCenter');
  expect(app).toContain('<OperationsPanel');
  expect(app).toContain('<SessionSettings');
 });
});
