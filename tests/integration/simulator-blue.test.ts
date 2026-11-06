import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const read=(path:string)=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');
describe('Tema azul hielo: entorno real del simulador 3D',()=>{
 it('carga el estilo después del tema de cámaras y modifica el fondo de la página completa',()=>{
  const main=read('src/main.tsx');
  expect(main.indexOf("simulator-blue.css")).toBeGreaterThan(main.indexOf("traffic-blue.css"));
  const css=read('src/styles/simulator-blue.css');
  expect(css).toContain('.neo-shell .workspace:has(.simulator-v3)');
  expect(css).toContain('background-color:#d9eeff');
  expect(css).toContain('background:#e1f2ff');
  expect(css).toContain('background:#0b2048');
  expect(css).toContain('background-color:#d7eafa');
  expect(css).toContain('.simulator-speed button[aria-pressed=true]');
  expect(css).toContain('.simulator-ai-select');
  expect(css).toContain('.yolo-monitor');
 });
 it('cambia el color opaco que dibujan ambos motores, no solo el CSS',()=>{
  const human=read('src/modules/scenarios/components/HumanizedScene3D.tsx');
  const simple=read('src/modules/scenarios/services/industrial-renderer.ts');
  expect(human).toContain('stage.background=new THREE.Color(0xd9eafa)');
  expect(human).toContain('stage.fog=new THREE.FogExp2(0xc9e1f4,.012)');
  expect(simple).toContain('gl.clearColor(.79,.88,.97,1)');
  expect(simple).toContain('vec3 fogColor=vec3(.79,.88,.97)');
  expect(human).not.toContain('stage.background=new THREE.Color(0x1b3847)');
  expect(simple).not.toContain('gl.clearColor(.063,.112,.145,1)');
 });
 it('mantiene escenas y reconocimiento en ambas rutas y elimina rótulos internos',()=>{
  const scene=read('src/modules/scenarios/pages/InteractiveSimulator.tsx');
  const human=read('src/modules/scenarios/components/HumanizedScene3D.tsx');
  const lite=read('src/modules/scenarios/components/IndustrialScene3D.tsx');
  expect(scene).toContain('<HumanizedScene3D');
  expect(scene).toContain('<IndustrialScene3D');
  expect(scene).toContain('<YoloBrowserPanel');
  expect(scene).toContain('<YoloMonitor');
  expect(human).toContain('ESCENA VIRTUAL · REPRESENTACIÓN 3D');
  expect(human).not.toContain('NO YOLO');
  expect(lite).not.toContain('inferencias YOLO');
 });
});
