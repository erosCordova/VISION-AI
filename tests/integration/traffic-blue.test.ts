import {describe,it,expect} from 'vitest';
import {existsSync,readFileSync} from 'node:fs';
const read=(path:string)=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');
describe('Cámaras públicas con nueva identidad visual azul hielo',()=>{
 it('carga el tema al final sin reemplazar los motores del análisis',()=>{
  const main=read('src/main.tsx');
  expect(main.indexOf("traffic-blue.css")).toBeGreaterThan(main.indexOf("neon-command.css"));
  const component=read('src/modules/analysis/pages/LiveTrafficAnalysis.tsx');
  expect(component).toContain('<video ref={videoRef}');
  expect(component).toContain('<canvas ref={evidenceRef}');
  expect(component).toContain('await liveRepository.save(item)');
  expect(component).toContain('Iniciar reconocimiento');
 });
 it('muestra fotografías ilustrativas solo en estado sin análisis',()=>{
  const component=read('src/modules/analysis/pages/LiveTrafficAnalysis.tsx');
  expect(component).toContain('{!analyzed&&<div className="live-traffic-evidence-empty">');
  expect(component).toContain('Imágenes ilustrativas: todavía no hay resultados de esta cámara.');
  expect(component).toContain('live-traffic-camera-photo');
  expect(component).toContain('live-traffic-car-photo');
  expect(component).toContain('live-traffic-skyline');
  expect(component).toContain('live-traffic-gallery-photo is-bicycle');
 });
 it('utiliza solo azules y conserva los recursos de imagen locales',()=>{
  const styles=read('src/styles/traffic-blue.css');
  expect(styles).toContain('background:#cce8fe');
  expect(styles).toContain('background:#061934');
  expect(styles).toContain('accent-color:#1478e9');
  expect(styles).not.toMatch(/#(?:0e4|10ef|84ef|75f6|58a8|85ef|8bff|80f1)/i);
  for(const name of ['traffic-camera','traffic-car','traffic-bus','traffic-cyclist','seattle-skyline']){
   const path='public/visuals/'+name+'.svg';
   expect(existsSync(new URL('../../'+path,import.meta.url))).toBe(true);
   expect(read(path)).toContain('</svg>');
  }
 });
});
