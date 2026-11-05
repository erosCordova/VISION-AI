import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {PUBLIC_CAMERA_SOURCES} from '../../src/modules/analysis/services/public-camera-sources';

const read=(p:string)=>readFileSync(new URL('../..'+p,import.meta.url),'utf8');

describe('Cámaras públicas TfL: catálogo sin Render ni dispositivos locales',()=>{
 it('solo acepta dos rutas internas públicas con identidad verificada',()=>{
  expect(PUBLIC_CAMERA_SOURCES).toHaveLength(2);
  const paths=new Set<string>();
  for(const item of PUBLIC_CAMERA_SOURCES){
   expect(item.id).toMatch(/^[a-z0-9-]+$/);
   expect(item.name).toMatch(/(Piccadilly|Romford)/);
   expect(item.imagePath).toMatch(/^\/camaras-tfl\/[a-z0-9-]+\.jpg$/);
   expect(paths.has(item.imagePath)).toBe(false);
   paths.add(item.imagePath);
  }
 });
 it('el proxy de Vercel dirige los únicos JPEG al bucket público de TfL',()=>{
  const config=JSON.parse(read('vercel.json')) as {
   rewrites:{source:string;destination:string}[];
   headers:{source:string;headers:{key:string}[]}[];
  };
  expect(config.rewrites).toHaveLength(PUBLIC_CAMERA_SOURCES.length);
  for(const camera of PUBLIC_CAMERA_SOURCES){
   const rewrite=config.rewrites.find(r=>r.source===camera.imagePath);
   expect(rewrite).toBeDefined();
   expect(rewrite?.destination).toMatch(
    /^https:\/\/s3-eu-west-1\.amazonaws\.com\/jamcams\.tfl\.gov\.uk\/\d{5}\.\d{5}\.jpg$/
   );
  }
  expect(config.headers[0].headers.some(h=>h.key==='Permissions-Policy')).toBe(true);
 });
 it('el frontend consume rutas propias y no depende del catálogo Render',()=>{
  const component=read('src/modules/analysis/components/PublicCameraLab.tsx');
  expect(component).toContain('fetch(camera.imagePath');
  expect(component).not.toContain("'/api/v1/public-cameras'");
  expect(component).not.toContain('navigator.mediaDevices');
  expect(component).toContain('analyzeYoloFrame');
  expect(component).toContain('createImageBitmap');
  expect(component).toContain('sha256');
 });
});
