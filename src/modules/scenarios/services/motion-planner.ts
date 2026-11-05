/**
 * Navegación multirruta para escenas sintéticas, independiente de WebGL y YOLO.
 * Waypoints conectados + elecciones pseudoaleatorias reproducibles + pausas.
 * La ubicación se calcula a partir del tiempo, no de la velocidad de renderizado.
 */
export interface Movement {
  readonly x: number;
  readonly y: number;
  readonly heading: number;
  readonly phase: number;
  readonly state: 'walking' | 'waiting' | 'inspecting' | 'transporting';
  readonly segment: number;
}
export interface Waypoint {
  readonly x: number;
  readonly y: number;
  readonly wait?: number;
}
export interface RouteSpec {
  readonly nodes: readonly Waypoint[];
  readonly links: readonly (readonly number[])[];
  readonly start: number;
  readonly first: number;
  readonly speed: number;
  readonly seed: number;
  readonly role: 'pedestrian' | 'forklift';
}
const bounds = (n:number,lo:number,hi:number) => Math.min(hi,Math.max(lo,n));
const hash = (seed: number, step: number): number => {
  let x = Math.imul(seed ^ Math.imul(step + 1, 0x9e3779b1),0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x,0xc2b2ae35);
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
};
const distance=(a:Waypoint,b:Waypoint)=>Math.hypot(b.x-a.x,b.y-a.y);
const progress=(v:number)=>v*v*(3-2*v);
export function sampleRoute(spec:RouteSpec,seconds:number):Movement {
  if(!spec.nodes.length||!spec.nodes[spec.start]||!spec.nodes[spec.first])
    throw new Error('Ruta sin puntos válidos.');
  const t=bounds(seconds,0,3600);
  let from=spec.start,to=spec.first,at=0,heading=0;
  for(let segment=0;segment<1400;segment++){
    const start=spec.nodes[from],end=spec.nodes[to];
    const dx=end.x-start.x,dy=end.y-start.y;
    const len=distance(start,end);
    const variable=.80+hash(spec.seed,segment*5+1)*.52;
    const speed=Math.max(14,spec.speed*variable);
    const travel=Math.max(.65,len/speed);
    const arrive=at+travel;
    heading=len>1?Math.atan2(dx,dy):heading;
    if(t<arrive){
      const ratio=progress(bounds((t-at)/travel,0,1));
      return {x:start.x+dx*ratio,y:start.y+dy*ratio,
        heading,phase:t*speed*.063+segment*.15,
        state:spec.role==='forklift'?'transporting':'walking',segment};
    }
    const dwell=(end.wait??.12)+hash(spec.seed,segment*5+2)*
      (spec.role==='forklift'?.85:1.75);
    if(t<arrive+dwell){
      return {x:end.x,y:end.y,heading,phase:0,
        state:(end.wait??0)>.9?'inspecting':'waiting',segment};
    }
    at=arrive+dwell;
    const neighbors=spec.links[to]??[];
    const options=neighbors.filter(index=>index!==from && spec.nodes[index]);
    const candidates=options.length?options:neighbors.filter(index=>spec.nodes[index]);
    if(!candidates.length)throw new Error('Punto sin rutas conectadas.');
    const next=candidates[Math.min(candidates.length-1,
      Math.floor(hash(spec.seed,segment*5+3)*candidates.length))];
    from=to;to=next;
  }
  throw new Error('El recorrido excedió la duración admitida.');
}
const safetyNodes:readonly Waypoint[]=[
 {x:150,y:320,wait:1.1},{x:310,y:250,wait:.3},{x:505,y:322,wait:.2},
 {x:669,y:305,wait:1},{x:788,y:225,wait:1.4},{x:814,y:350,wait:.3},
 {x:503,y:192,wait:.8},{x:304,y:367,wait:.7},{x:650,y:165,wait:.3},
 {x:158,y:225,wait:.5}
];
const safetyLinks:readonly (readonly number[])[]=[
 [1,9,7],[0,2,6,7,9],[1,3,6,7],[2,4,5,6,8],[3,5,8],[3,4,7],
 [1,2,3,8],[0,1,2,5],[3,4,6],[0,1]
];
const warehouseNodes:readonly Waypoint[]=[
 {x:320,y:320,wait:.8},{x:485,y:320,wait:.5},{x:684,y:319,wait:1.3},
 {x:706,y:230,wait:1.8},{x:447,y:182,wait:.8},{x:289,y:236,wait:.5},
 {x:548,y:375,wait:.5},{x:745,y:365,wait:.5}
];
const warehouseLinks:readonly (readonly number[])[]=[
 [1,5,6],[0,2,4,6],[1,3,6,7],[2,4,7],[1,3,5],[0,4],[0,1,2,7],[2,3,6]
];
const retailNodes:readonly Waypoint[]=[
 {x:118,y:320,wait:.2},{x:275,y:265,wait:1.7},{x:460,y:220,wait:1.5},
 {x:652,y:250,wait:1.6},{x:824,y:321,wait:.4},{x:680,y:374,wait:.2},
 {x:485,y:364,wait:.6},{x:292,y:369,wait:.5},{x:161,y:215,wait:.8},
 {x:516,y:146,wait:1.2},{x:740,y:170,wait:1.1}
];
const retailLinks:readonly (readonly number[])[]=[
 [1,7,8],[0,2,7,8,9],[1,3,6,9],[2,4,5,10],[3,5,10],
 [3,4,6],[2,5,7,9],[0,1,6],[0,1,9],[1,2,6,8,10],[3,4,9]
];
const qualityNodes:readonly Waypoint[]=[
 {x:228,y:186,wait:1.3},{x:328,y:145,wait:.4},{x:530,y:162,wait:2.1},
 {x:700,y:188,wait:.6},{x:745,y:245,wait:1.4},{x:470,y:208,wait:.3}
];
const qualityLinks:readonly (readonly number[])[]=[
 [1,5],[0,2,5],[1,3,5],[2,4,5],[3,5],[0,1,2,3,4]
];
export const ROUTES={
 safety:{
  w1:{nodes:safetyNodes,links:safetyLinks,start:0,first:1,speed:48,seed:101,role:'pedestrian'},
  w2:{nodes:safetyNodes,links:safetyLinks,start:2,first:3,speed:49,seed:283,role:'pedestrian'},
  w3:{nodes:safetyNodes,links:safetyLinks,start:5,first:4,speed:43,seed:733,role:'pedestrian'}
 },
 warehouse:{
  lift:{nodes:warehouseNodes,links:warehouseLinks,start:0,first:1,speed:51,seed:47,role:'forklift'},
  a1:{nodes:warehouseNodes,links:warehouseLinks,start:5,first:4,speed:42,seed:229,role:'pedestrian'},
  a2:{nodes:warehouseNodes,links:warehouseLinks,start:7,first:6,speed:46,seed:419,role:'pedestrian'}
 },
 retail:{
  r0:{nodes:retailNodes,links:retailLinks,start:0,first:1,speed:55,seed:17,role:'pedestrian'},
  r1:{nodes:retailNodes,links:retailLinks,start:3,first:5,speed:43,seed:37,role:'pedestrian'},
  r2:{nodes:retailNodes,links:retailLinks,start:6,first:2,speed:48,seed:73,role:'pedestrian'},
  r3:{nodes:retailNodes,links:retailLinks,start:10,first:3,speed:52,seed:199,role:'pedestrian'},
  r4:{nodes:retailNodes,links:retailLinks,start:8,first:0,speed:42,seed:401,role:'pedestrian'}
 },
 quality:{
  inspector:{nodes:qualityNodes,links:qualityLinks,start:0,first:1,speed:37,seed:337,role:'pedestrian'}
 }
} as const satisfies Record<string,Record<string,RouteSpec>>;
export function actorMotion(scenario:keyof typeof ROUTES,id:string,t:number):Movement {
  const group:Record<string,RouteSpec>=ROUTES[scenario];
  const spec=group[id];
  if(!spec)throw new Error('Actor desconocido: '+scenario+'/'+id);
  return sampleRoute(spec,t);
}
export interface MovingActor {
 readonly id:string;
 readonly x:number;
 readonly y:number;
 readonly width:number;
 readonly height:number;
 readonly heading?:number;
 readonly state?:string;
}
/**
 * Evitación suave de proximidad entre peatones en el mismo fotograma.
 * No se aplica a mercancía; evita teletransportes y usa un tope de 15 px.
 */
export function separateActors<T extends MovingActor>(actors:readonly T[],minimumDistance=57):T[] {
  return actors.map(actor=>{
    const centerX=actor.x+actor.width/2,centerY=actor.y+actor.height/2;
    let pushX=0,pushY=0;
    for(const other of actors){
      if(actor.id===other.id)continue;
      const dx=centerX-(other.x+other.width/2);
      const dy=centerY-(other.y+other.height/2);
      const d=Math.hypot(dx,dy);
      if(d>=minimumDistance)continue;
      const weight=(minimumDistance-d)/(minimumDistance||1)*12;
      if(d<.0001){
        const dir=hash(actor.id.length*61+actor.id.charCodeAt(0),other.id.length);
        pushX+=(dir>.5?1:-1)*weight;
      }else{
        pushX+=dx/d*weight;pushY+=dy/d*weight;
      }
    }
    return {...actor,x:actor.x+bounds(pushX,-15,15),y:actor.y+bounds(pushY,-15,15)};
  });
}
