import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
const config=JSON.parse(readFileSync(new URL('../../vercel.json',import.meta.url),'utf8')) as {
 headers:readonly {source:string;headers:readonly {key:string;value:string}[]}[];
};
describe('Fase 13 — cabeceras HTTP declaradas de seguridad en Vercel',()=>{
 const entry=config.headers[0];
 const header=(name:string)=>entry.headers.find(x=>x.key===name)?.value;
 it('aplica las mismas cabeceras a todas las rutas',()=>{
  expect(entry.source).toBe('/(.*)');
  expect(config.headers).toHaveLength(1);
 });
 it('evita detección insegura de contenido',()=>{
  expect(header('X-Content-Type-Options')).toBe('nosniff');
 });
 it('impide embeber la aplicación mediante iframes',()=>{
  expect(header('X-Frame-Options')).toBe('DENY');
 });
 it('limita el referer a sitios de terceros',()=>{
  expect(header('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
 });
 it('deniega permisos de cámara, micrófono y geolocalización no utilizados',()=>{
  const policy=header('Permissions-Policy');
  expect(policy).toContain('camera=()');
  expect(policy).toContain('microphone=()');
  expect(policy).toContain('geolocation=()');
 });
});
