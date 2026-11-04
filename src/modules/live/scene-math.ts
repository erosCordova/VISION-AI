/** Transformaciones 3D puras; coordenadas en metros abstractos de la maqueta. */
export type Vec3 = readonly [number, number, number];
export interface Orbit {
  readonly yaw: number;
  readonly pitch: number;
  readonly distance: number;
}
export interface Camera {
  readonly eye: Vec3;
  readonly right: Vec3;
  readonly up: Vec3;
  readonly forward: Vec3;
  readonly focal: number;
}
export const clamp = (v: number, low: number, high: number): number =>
  Math.max(low, Math.min(high, Number.isFinite(v) ? v : low));
const minus = (a: Vec3,b: Vec3):Vec3=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const cross = (a:Vec3,b:Vec3):Vec3=>[
 a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a:Vec3,b:Vec3):number=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const norm=(v:Vec3):Vec3=>{
 const size=Math.hypot(...v);return size>0?v.map(x=>x/size) as unknown as Vec3:[0,0,1];
};
export const presets={
 isometric:{yaw:.57,pitch:.76,distance:19},
 frontal:{yaw:0,pitch:.46,distance:21},
 superior:{yaw:.12,pitch:1.48,distance:19}
} as const satisfies Record<string,Orbit>;
export type CameraView=keyof typeof presets;
export function boundedOrbit(orbit:Orbit):Orbit{
 return {yaw:Number.isFinite(orbit.yaw)?orbit.yaw:0,
 pitch:clamp(orbit.pitch,.2,1.52),distance:clamp(orbit.distance,9,34)};
}
export function createCamera(orbit:Orbit):Camera {
 const {yaw,pitch,distance}=boundedOrbit(orbit);
 const target:Vec3=[0,.85,0];
 const eye:Vec3=[
  target[0]+Math.sin(yaw)*Math.cos(pitch)*distance,
  target[1]+Math.sin(pitch)*distance,
  target[2]+Math.cos(yaw)*Math.cos(pitch)*distance
 ];
 const forward=norm(minus(target,eye));
 const right=norm(cross(forward,[0,1,0]));
 const up=norm(cross(right,forward));
 return {eye,right,up,forward,focal:1/Math.tan(Math.PI/6)};
}
export interface Projection{readonly x:number;readonly y:number;readonly depth:number}
export function project(p:Vec3,camera:Camera,width:number,height:number):Projection|null{
 if(width<=0||height<=0)return null;
 const d=minus(p,camera.eye);
 const depth=dot(d,camera.forward);
 if(depth<.2)return null;
 const aspect=width/height;
 const x=width*(.5+dot(d,camera.right)*camera.focal/(2*aspect*depth));
 const y=height*(.5-dot(d,camera.up)*camera.focal/(2*depth));
 return {x,y,depth};
}
export function worldX(x:number):number{return (x-480)/64;}
export function worldZ(y:number):number{return (y-270)/64;}
export function entityFootprint(o:{x:number;y:number;width:number;height:number}):Vec3{
 return [worldX(o.x+o.width/2),0,worldZ(o.y+o.height)];
}
export function zoneFootprint(z:{x:number;y:number;width:number;height:number}):{
 readonly center:Vec3;readonly width:number;readonly depth:number
}{
 return {center:[worldX(z.x+z.width/2),.04,worldZ(z.y+z.height/2)],
 width:z.width/64,depth:z.height/64};
}
