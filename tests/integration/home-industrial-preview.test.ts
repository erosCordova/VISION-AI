import {describe,it,expect} from 'vitest';
import {existsSync,statSync,readFileSync} from 'node:fs';
const source=(p:string)=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');
describe('Portada de supervisión industrial VISION AI',()=>{
 it('carga localmente la ilustración aprobada sin servicio de imagen externo',()=>{
  const image=new URL('../../public/visuals/vision-ai-supervision-industrial.webp',import.meta.url);
  expect(existsSync(image)).toBe(true);
  expect(statSync(image).size).toBeGreaterThan(100_000);
  const home=source('src/modules/experience/CommandHome.tsx');
  expect(home).toContain('src="/visuals/vision-ai-supervision-industrial.webp"');
  expect(home).toContain('alt="Ilustración de supervisión industrial');
  expect(home).toContain('ILUSTRACIÓN DEL PROYECTO');
  expect(home).not.toContain('neo-street-road');
  expect(source('src/styles/neon-command.css')).not.toContain('images.unsplash.com');
 });
 it('la simulación industrial es la acción principal, cámaras son una demostración',()=>{
  const home=source('src/modules/experience/CommandHome.tsx');
  expect(home).toContain('Supervisión visual industrial');
  expect(home).toContain('onClick={()=>onScene(\'safety\')}>Explorar simulación 3D');
  expect(home).toContain('Demostración con cámaras públicas');
  expect(home).toContain('Las cámaras en directo son una demostración complementaria');
 });
});
