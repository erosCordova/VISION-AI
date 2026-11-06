import {describe,it,expect} from 'vitest';
import {readdirSync,readFileSync,statSync} from 'node:fs';
import {join,relative} from 'node:path';

/** Auditoría estática de los colores aplicados en CSS, JSX, SVG y canvas.
 * El vídeo y las fotografías mantienen sus píxeles originales.
 */
const root=join(process.cwd(),'src');
function files(dir:string):string[]{
 return readdirSync(dir).flatMap(file=>{
  const path=join(dir,file);
  if(statSync(path).isDirectory())return files(path);
  return /\.(?:css|tsx|ts)$/.test(file)?[path]:[];
 });
}
function hue(hex:string):{h:number;s:number}|null{
 let value=hex.replace(/^#|^0x/i,'');
 if(value.length===3||value.length===4)value=value.slice(0,3).split('').map(x=>x+x).join('');
 else value=value.slice(0,6);
 if(value.length!==6)return null;
 const [r,g,b]=[0,2,4].map(i=>parseInt(value.slice(i,i+2),16)/255);
 const max=Math.max(r,g,b),min=Math.min(r,g,b),delta=max-min;
 if(delta===0)return null;
 let angle=max===r?((g-b)/delta)%6:max===g?(b-r)/delta+2:(r-g)/delta+4;
 angle=(angle*60+360)%360;
 const light=(max+min)/2;
 return {h:angle,s:delta/(1-Math.abs(2*light-1))};
}
function isGreenish(hex:string){
 const c=hue(hex);
 return Boolean(c&&c.h>=64&&c.h<=197&&c.s>.075);
}
function rgbTokens(text:string):string[]{
 return [...text.matchAll(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/gi)]
  .map(m=>'#'+m.slice(1,4).map(v=>Number(v).toString(16).padStart(2,'0')).join(''));
}
function collectGreenish(text:string){
 const hex=[...text.matchAll(/(?:#[0-9a-fA-F]{3,8}|0x[0-9a-fA-F]{6})\b/g)].map(x=>x[0]);
 return [...hex,...rgbTokens(text)].filter(isGreenish);
}
describe('Identidad visual global — sin verdes ni turquesas de interfaz',()=>{
 it('no mantiene valores verdes en hojas CSS ni gráficos JSX/canvas/Three',()=>{
  const offenders=files(root).flatMap(path=>{
   const body=readFileSync(path,'utf8');
   const bad=collectGreenish(body);
   return bad.length?[relative(process.cwd(),path)+': '+[...new Set(bad)].join(', ')]:[];
  });
  expect(offenders).toEqual([]);
 });
 it('mantiene los azules de referencia y los estados operativos conectados',()=>{
  const global=readFileSync(join(root,'styles/global-ice.css'),'utf8');
  const scenes=readFileSync(join(root,'styles/simulator-blue.css'),'utf8');
  const cameras=readFileSync(join(root,'styles/traffic-blue.css'),'utf8');
  expect(global).toContain('background-color:#d9eeff');
  expect(scenes).toContain('background-color:#d9eeff');
  expect(cameras).toContain('background:#cce8fe');
  expect(global).toContain('.neo-shell .neo-chart-line.vehicles');
  expect(global).toContain('.neo-shell .sidebar');
  expect(global).toContain('.neo-shell .history-panel');
 });
});
