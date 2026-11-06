/**
 * Simulación empresarial 3D: navegación multidireccional con rutas y estados.
 * NO es inferencia YOLO: clases, porcentajes y eventos son sintéticos.
 */
import { actorMotion, separateActors } from './motion-planner';
import type { Movement } from './motion-planner';
export type ScenarioKey='safety'|'warehouse'|'quality'|'retail';
export type ObjectKind='person'|'helmet'|'vest'|'forklift'|'pallet'|'product'|'defect'|'shelf'|'box';
export interface SimEntity {
 readonly id:string;readonly kind:ObjectKind;readonly label:string;
 readonly x:number;readonly y:number;readonly width:number;readonly height:number;
 readonly score:number;readonly tone:'mint'|'amber'|'coral'|'blue';
 readonly heading?:number;
 readonly motionPhase?:number;
 readonly state?:Movement['state'];
 readonly segment?:number;
}
export interface SimZone {
 readonly x:number;readonly y:number;readonly width:number;readonly height:number;
 readonly label:string;readonly type:'restricted'|'inspection'|'count';
}
export interface SimSnapshot {
 readonly scenarioId:ScenarioKey;
 readonly entities:readonly SimEntity[];
 readonly zones:readonly SimZone[];
 readonly count:number;readonly alert:boolean;readonly event:string;
 readonly metricLabel:string;
 readonly palette:readonly {label:string;score:number;color:string}[];
}
const entity=(id:string,kind:ObjectKind,label:string,x:number,y:number,
 width:number,height:number,score:number,tone:SimEntity['tone'],motion?:Movement):SimEntity=>({
 id,kind,label,x,y,width,height,score,tone,
 ...(motion?{heading:motion.heading,motionPhase:motion.phase,state:motion.state,segment:motion.segment}:{})
});
const actor=(scenario:ScenarioKey,id:string,kind:ObjectKind,label:string,t:number,
 width:number,height:number,score:number,tone:SimEntity['tone']):SimEntity=>{
 const motion=actorMotion(scenario,id,t);
 return entity(id,kind,label,motion.x-width/2,motion.y-height,width,height,score,tone,motion);
};
export const validScenario=(id:string):id is ScenarioKey=>
 ['safety','warehouse','quality','retail'].includes(id);
export const insideZone=(o:SimEntity,z:SimZone):boolean=>{
 const cx=o.x+o.width/2,cy=o.y+o.height/2;
 return cx>=z.x&&cx<=z.x+z.width&&cy>=z.y&&cy<=z.y+z.height;
};
const find=(actors:readonly SimEntity[],id:string):SimEntity=>{
 const actor=actors.find(a=>a.id===id);
 if(!actor)throw Error('Actor no disponible '+id);
 return actor;
};
const safetyZone:SimZone={x:570,y:115,width:285,height:272,label:'ZONA RESTRINGIDA',type:'restricted'};
const warehouseZone:SimZone={x:570,y:147,width:284,height:250,label:'VÍA DE SEGURIDAD',type:'restricted'};
const qualityZone:SimZone={x:365,y:200,width:290,height:181,label:'ZONA DE INSPECCIÓN',type:'inspection'};
const retailZone:SimZone={x:215,y:137,width:530,height:263,label:'ÁREA DE CONTEO',type:'count'};
function equipment(id:string,kind:'helmet'|'vest',person:SimEntity):SimEntity {
 const helmet=kind==='helmet';
 return entity(id,kind,helmet?'Casco':'Chaleco',person.x+(helmet?10:7),
   person.y+(helmet?-6:38),helmet?29:35,helmet?19:44,
   helmet?.96:.94,helmet?'amber':'mint');
}
/** Velocidades por ciclo variables y parada realista dentro de la estación de inspección. */
function productPosition(index:number,t:number):{x:number;state:Movement['state']}{
 const speed=72+index*5;
 const before=620/speed;
 const after=600/speed;
 const dwell=.7+index*.34;
 const period=before+after+dwell;
 const local=(Math.max(0,t)+index*period/3)%period;
 if(local<before)return {x:-140+local*speed,state:'transporting'};
 if(local<before+dwell)return {x:480,state:'inspecting'};
 return {x:480+(local-before-dwell)*speed,state:'transporting'};
}
export function simulationSnapshot(scenarioId:ScenarioKey,seconds:number):SimSnapshot {
 const t=Number.isFinite(seconds)?Math.max(0,Math.min(seconds,3600)):0;
 if(scenarioId==='safety'){
  const people=separateActors([
   actor('safety','w1','person','Persona · 01',t,48,114,.97,'mint'),
   actor('safety','w2','person','Persona · 02',t,48,114,.93,'coral'),
   actor('safety','w3','person','Persona · 03',t,48,114,.94,'mint')
  ],59);
  const inside=insideZone(find(people,'w2'),safetyZone);
  const checking=people.filter(p=>p.state==='inspecting').length;
  return {scenarioId,entities:[...people,
   equipment('h1','helmet',find(people,'w1')),equipment('h3','helmet',find(people,'w3')),
   ...people.map((p,i)=>equipment('v'+(i+1),'vest',p))],
   zones:[safetyZone],count:people.length,alert:inside,
   event:inside?'Persona 02 sin casco en zona restringida · evento sintético':
    checking?'Personal realizando inspección en distintas estaciones · simulación':
    'Rondas con rutas independientes y cambios de dirección · simulación',
   metricLabel:'Personas en escena',
   palette:[{label:'Persona',score:.97,color:'#7ca9e7'},{label:'Casco',score:.96,color:'#f9c865'},{label:'Chaleco',score:.94,color:'#6393d7'}]};
 }
 if(scenarioId==='warehouse'){
  const forklift=actor('warehouse','lift','forklift','Montacargas · 01',t,128,102,.96,'amber');
  const workers=separateActors([
   actor('warehouse','a1','person','Operario · 01',t,46,108,.93,'mint'),
   actor('warehouse','a2','person','Operario · 02',t,46,108,.91,'blue')
  ],72).map(w=>{
   const fx=forklift.x+forklift.width/2,fy=forklift.y+forklift.height/2;
   const wx=w.x+w.width/2,wy=w.y+w.height/2;
   const distance=Math.hypot(wx-fx,wy-fy);
   if(distance>103||distance<.001)return w;
   const push=Math.min(16,103-distance)*.64;
   return {...w,x:w.x+(wx-fx)/distance*push,y:w.y+(wy-fy)/distance*push};
  });
  const props=[
   entity('p1','pallet','Pallet · A',170,240,94,65,.92,'mint'),
   entity('p2','pallet','Pallet · B',770,230,95,66,.95,'mint'),
   entity('b1','box','Caja · 01',175,187,80,54,.91,'blue'),
   entity('b2','box','Caja · 02',778,180,76,50,.89,'blue')
  ];
  const violation=insideZone(forklift,warehouseZone);
  return {scenarioId,entities:[forklift,...workers,...props],zones:[warehouseZone],count:1,
   alert:violation,event:violation?'Montacargas atraviesa vía delimitada · evento sintético':
   forklift.state==='inspecting'?'Montacargas detenido en área de carga · simulación':
   'Montacargas y operarios navegan por rutas diferenciadas · simulación',
   metricLabel:'Montacargas visibles',
   palette:[{label:'Montacargas',score:.96,color:'#f9c865'},{label:'Operario',score:.93,color:'#7ca9e7'},{label:'Pallet',score:.95,color:'#87b5ff'}]};
 }
 if(scenarioId==='quality'){
  const items=[0,1,2].map(i=>{
   const pose=productPosition(i,t);
   return entity('q'+i,'product','Producto · '+(i+1),pose.x,260,108,84,
     .94-i*.02,i===1?'coral':'mint',{
       x:pose.x,y:344,heading:Math.PI/2,phase:t*5,state:pose.state,segment:Math.floor(t/12)
     });
  });
  const selected=find(items,'q1');
  const defect=entity('d1','defect','Defecto superficial',selected.x+42,281,31,23,.89,'coral');
  const inspector=actor('quality','inspector','person','Operario inspector',t,44,104,.93,'blue');
  const visible=items.filter(o=>o.x+o.width>0&&o.x<960);
  const showDefect=selected.x>-100&&selected.x<955;
  const inspection=insideZone(selected,qualityZone);
  return {scenarioId,entities:[...visible,...(showDefect?[defect]:[]),inspector],zones:[qualityZone],
   count:visible.length,alert:inspection,
   event:inspection?'Producto 02 inspeccionado con defecto ilustrativo · simulación':
   inspector.state==='inspecting'?'Operario verifica la estación de inspección · simulación':
   'Línea de producción y operario ejecutan tareas independientes · simulación',
   metricLabel:'Productos visibles',
   palette:[{label:'Producto',score:.94,color:'#7ca9e7'},{label:'Defecto',score:.89,color:'#ff8d7e'},{label:'Inspector',score:.93,color:'#87b5ff'}]};
 }
 const people=separateActors(Array.from({length:5},(_,i)=>
  actor('retail','r'+i,'person','Persona · '+(i+1),t,43,105,.95-i*.017,
   i===4?'blue':'mint')
 ),62);
 const count=people.filter(p=>insideZone(p,retailZone)).length;
 return {scenarioId,entities:people,zones:[retailZone],count,alert:count>3,
  event:count>3?'Ocupación sintética superior al umbral de 3 personas':
   people.some(p=>p.state==='inspecting')?'Clientes se detienen frente a estantes · simulación':
   'Tránsito multidireccional de clientes y cruces entre pasillos · simulación',
  metricLabel:'Personas en zona',
  palette:[{label:'Persona',score:.95,color:'#7ca9e7'},{label:'Zona',score:1,color:'#87b5ff'}]};
}
