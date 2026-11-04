/**
 * Motor geométrico determinista para el simulador didáctico 2D.
 * NO ES YOLO: cada entidad y puntuación es sintética.
 * No se utiliza como evidencia de inferencia ni precisión de modelos.
 */
export type ScenarioKey = 'safety' | 'warehouse' | 'quality' | 'retail';
export type ObjectKind = 'person' | 'helmet' | 'vest' | 'forklift' | 'pallet' | 'product' | 'defect' | 'shelf' | 'box';
export interface SimEntity {
  readonly id: string;
  readonly kind: ObjectKind;
  readonly label: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly score: number;
  readonly tone: 'mint' | 'amber' | 'coral' | 'blue';
}
export interface SimZone {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly label: string;
  readonly type: 'restricted' | 'inspection' | 'count';
}
export interface SimSnapshot {
  readonly scenarioId: ScenarioKey;
  readonly entities: readonly SimEntity[];
  readonly zones: readonly SimZone[];
  readonly count: number;
  readonly alert: boolean;
  readonly event: string;
  readonly metricLabel: string;
  readonly palette: readonly { label: string; score: number; color: string }[];
}
const entity = (id: string, kind: ObjectKind, label: string, x: number, y: number,
  width: number, height: number, score: number, tone: SimEntity['tone']): SimEntity =>
  ({ id, kind, label, x, y, width, height, score, tone });
export const validScenario = (id: string): id is ScenarioKey =>
  ['safety','warehouse','quality','retail'].includes(id);
export const insideZone = (o: SimEntity, z: SimZone): boolean => {
  const cx = o.x + o.width / 2;
  const cy = o.y + o.height / 2;
  return cx >= z.x && cx <= z.x + z.width && cy >= z.y && cy <= z.y + z.height;
};
/** Tiempos en segundos; no hay llamadas a servidor ni imágenes externas. */
export function simulationSnapshot(scenarioId: ScenarioKey, seconds: number): SimSnapshot {
  const t = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  if (scenarioId === 'safety') {
    const z: SimZone = { x: 570, y: 115, width: 285, height: 272, label: 'ZONA RESTRINGIDA', type: 'restricted' };
    const x1 = 165 + 35 * Math.sin(t * .55);
    const x2 = 510 + 135 * Math.sin(t * .42);
    const x3 = 790 + 18 * Math.sin(t * .47);
    const workers = [
      entity('w1', 'person','Persona · 01',x1,245,48,114,.97,'mint'),
      entity('w2', 'person','Persona · 02',x2,240,48,114,.93,'coral'),
      entity('w3', 'person','Persona · 03',x3,230,48,114,.94,'mint'),
      entity('h1', 'helmet','Casco · 01',x1+10,239,29,19,.96,'amber'),
      entity('h3', 'helmet','Casco · 03',x3+10,224,29,19,.91,'amber'),
      entity('v1', 'vest','Chaleco · 01',x1+7,281,35,44,.94,'mint'),
      entity('v2', 'vest','Chaleco · 02',x2+7,276,35,44,.92,'mint'),
      entity('v3', 'vest','Chaleco · 03',x3+7,267,35,44,.95,'mint'),
    ];
    const violation = insideZone(workers[1], z);
    return {
      scenarioId, entities: workers, zones:[z], count:3, alert:violation,
      event: violation ? 'Persona 02 sin casco dentro de zona restringida · caso sintético' :
        'Personal en movimiento · revisión EPP simulada',
      metricLabel:'Personas en escena',
      palette:[{label:'Persona',score:.97,color:'#7ce7cc'},{label:'Casco',score:.96,color:'#f9c865'},{label:'Chaleco',score:.94,color:'#63d7d2'}]
    };
  }
  if (scenarioId === 'warehouse') {
    const z: SimZone = {x:570,y:147,width:284,height:250,label:'VÍA DE SEGURIDAD',type:'restricted'};
    const x = 300 + 285 * Math.sin(t * .31);
    const fork = entity('lift','forklift','Montacargas · 01',x,274,128,102,.96,'amber');
    const other = [
      fork,entity('p1','pallet','Pallet · A',170,240,94,65,.92,'mint'),
      entity('p2','pallet','Pallet · B',770,230,95,66,.95,'mint'),
      entity('b1','box','Caja · 01',175,187,80,54,.91,'blue'),
      entity('b2','box','Caja · 02',778,180,76,50,.89,'blue')
    ];
    const violation = insideZone(fork,z);
    return {scenarioId,entities:other,zones:[z],count:1,alert:violation,
      event:violation?'Montacargas cruza la zona delimitada · caso sintético':'Movimiento de carga dentro del almacén · simulación',
      metricLabel:'Montacargas visibles',
      palette:[{label:'Montacargas',score:.96,color:'#f9c865'},{label:'Pallet',score:.95,color:'#7ce7cc'},{label:'Caja',score:.91,color:'#87b5ff'}]};
  }
  if (scenarioId === 'quality') {
    const z: SimZone = {x:365,y:200,width:290,height:181,label:'ZONA DE INSPECCIÓN',type:'inspection'};
    const speed=68;
    const moving = (offset:number) => ((t*speed + offset) % 1160) - 130;
    const xs=[moving(170),moving(500),moving(840)];
    const items = xs.map((x,i)=>entity('q'+i,'product','Producto · '+(i+1),x,260,108,84,.94-(i*.02),i===1?'coral':'mint'));
    const defect = entity('d1','defect','Defecto · superficial',xs[1]+42,281,31,23,.89,'coral');
    const visible=items.filter(o=>o.x+o.width>0&&o.x<960);
    const inInspection=insideZone(items[1],z);
    return {scenarioId,entities:[...visible, ...(xs[1]>-105&&xs[1]<955?[defect]:[])],zones:[z],count:visible.length,alert:inInspection,
      event:inInspection?'Producto 02 con defecto en inspección · caso sintético':'Cinta de transporte en funcionamiento · simulación',
      metricLabel:'Productos visibles',
      palette:[{label:'Producto',score:.94,color:'#7ce7cc'},{label:'Defecto',score:.89,color:'#ff8d7e'}]};
  }
  const z: SimZone = {x:215,y:137,width:530,height:263,label:'ÁREA DE CONTEO',type:'count'};
  const positions=[{x:250,y:259},{x:410,y:245},{x:585,y:260},{x:755,y:260},{x:95,y:280}];
  const people = positions.map((p,i)=>entity('r'+i,'person','Persona · '+(i+1),
    p.x+72*Math.sin(t*(.28+.04*i)+i*.8),p.y+17*Math.cos(t*.45+i),43,105,.95-i*.017,
    i===4?'blue':'mint'));
  const count=people.filter(p=>insideZone(p,z)).length;
  return {scenarioId,entities:people,zones:[z],count,alert:count>3,
    event:count>3?'Ocupación simulada por encima del umbral de 3 personas':'Conteo de personas en zona delimitada · simulación',
    metricLabel:'Personas en zona',
    palette:[{label:'Persona',score:.95,color:'#7ce7cc'},{label:'Zona',score:1,color:'#87b5ff'}]};
}
