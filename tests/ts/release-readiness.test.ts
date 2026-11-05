import {describe,it,expect} from 'vitest';
import {readFileSync,existsSync} from 'node:fs';
const get=(file:string)=>readFileSync(new URL('../../'+file,import.meta.url),'utf8');
describe('Fase 16 — integridad de entrega y límites de producción',()=>{
 it('incluye manuales y acta referenciables',()=>{
  for(const f of ['docs/manual/Manual_Usuario_VISION_AI.md',
   'docs/manual/Manual_Tecnico_VISION_AI.md','docs/fase16_operacion_entrega.md',
   'docs/despliegue_gratuito.md'])
   expect(existsSync(new URL('../../'+f,import.meta.url))).toBe(true);
 });
 it('no transforma la API remota gratuita en motor de inferencia',()=>{
  const code=get('backend/app/main.py');
  expect(code).toContain('render-free-status-only');
  expect(code).toContain('inferenceAvailable');
  expect(code).toContain('status_code=503');
  expect(code).not.toContain('import cv2');
  expect(code).not.toContain('model.predict(');
 });
 it('protege las cabeceras y conserva el pipeline GitHub',()=>{
  const config=JSON.parse(get('vercel.json'));
  expect(config.headers[0].headers.some((h:{key:string})=>h.key==='Permissions-Policy')).toBe(true);
  const ci=get('.github/workflows/verify.yml');
  expect(ci).toContain('branches: [main]');
  expect(ci).toContain('Comprobar referencias Python y API gratuita');
 });
 it('reconoce que Render y la integridad de datos exigen verificación',()=>{
  const docs=get('docs/fase16_operacion_entrega.md');
  expect(docs).toContain('RF04');
  expect(docs).toContain('no restauran IndexedDB');
  expect(docs).toContain('workspace confirmado');
 });
 it('no promueve cámaras ni datasets en la guía vigente',()=>{
  const docs=get('docs/manual/Manual_Usuario_VISION_AI.md');
  expect(docs).toContain('únicamente');
  expect(docs).toContain('Manufactura');
  expect(docs).toContain('Retail');
  expect(docs).toContain('Logística');
 });
});
