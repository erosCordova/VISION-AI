import {describe,it,expect} from 'vitest';
import {existsSync,readFileSync} from 'node:fs';
import {trafficPhotos} from '../../src/modules/analysis/services/traffic-photo-assets';
const read=(path:string)=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');
function greenish(color:string){
 const hex=color.slice(1);
 if(![3,4,6,8].includes(hex.length))return false;
 const main=(hex.length===3||hex.length===4)?hex.slice(0,3).split('').map(x=>x+x).join(''):hex.slice(0,6);
 const [r,g,b]=[0,2,4].map(i=>parseInt(main.slice(i,i+2),16)/255);
 const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn,l=(mx+mn)/2;
 if(d===0)return false;
 let h=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;
 h=(h*60+360)%360;
 const saturation=d/(1-Math.abs(2*l-1));
 return h>=55&&h<=202&&saturation>.025;
}
describe('Cámaras públicas: azul puro y fotografías auténticas',()=>{
 it('mantiene el video real y el lienzo de resultados separados',()=>{
  const component=read('src/modules/analysis/pages/LiveTrafficAnalysis.tsx');
  expect(component).toContain('<video ref={videoRef}');
  expect(component).toContain('<canvas ref={evidenceRef}');
  expect(component).toContain('await liveRepository.save(item)');
  expect(component).toContain('Iniciar reconocimiento');
  expect(component).toContain('No se utilizan fotografías estáticas ni archivos simulados.');
 });
 it('la galería usa fotos documentadas en Wikimedia, solo antes de analizar',()=>{
  const component=read('src/modules/analysis/pages/LiveTrafficAnalysis.tsx');
  expect(component).toContain('{!analyzed&&<div className="live-traffic-evidence-empty">');
  expect(component).toContain('Fotografías reales de referencia; no son resultados de la cámara.');
  expect(component).toContain('src={trafficPhotos.camera.src}');
  expect(component).toContain('src={trafficPhotos.skyline.src}');
  expect(component).toContain('src={trafficPhotos.car.src}');
  expect(component).toContain('src={trafficPhotos.bus.src}');
  expect(component).toContain('src={trafficPhotos.bicycle.src}');
  expect(Object.values(trafficPhotos)).toHaveLength(5);
  for(const item of Object.values(trafficPhotos)){
   expect(item.src).toMatch(/^https:\/\/commons\.wikimedia\.org\/wiki\/Special:FilePath\//);
   expect(item.sourcePage).toContain('commons.wikimedia.org/wiki/File:');
  }
 });
 it('no conserva imágenes vectoriales anteriores ni verdes turquesa en las capas de cámaras',()=>{
  const cssPaths=['live-traffic.css','traffic-blue.css','vision-workspace.css','public-cameras.css'];
  for(const path of cssPaths){
   const source=read('src/styles/'+path);
   const colors=source.match(/#[0-9a-fA-F]{3,8}\b/g)||[];
   expect(colors.filter(greenish),path).toEqual([]);
  }
  for(const name of ['traffic-camera','traffic-car','traffic-bus','traffic-cyclist','seattle-skyline']){
   expect(existsSync(new URL('../../public/visuals/'+name+'.svg',import.meta.url))).toBe(false);
  }
  expect(read('src/main.tsx').indexOf("traffic-blue.css")).toBeGreaterThan(
   read('src/main.tsx').indexOf("neon-command.css"));
 });
});
