/** Geometría WebGL2 procedural: los objetos y alertas de esta escena son simulados. */
import type { SimEntity, SimSnapshot, SimZone } from './simulation-engine';
import type { Camera,Vec3 } from './scene-math';
import { entityFootprint, zoneFootprint } from './scene-math';
type Color=readonly [number,number,number];
const C={
  floor:[.107,.176,.218],grid:[.218,.321,.344],concrete:[.16,.24,.27],
  wall:[.17,.27,.32],steel:[.37,.50,.55],dark:[.065,.11,.15],pale:[.64,.78,.75],
  mint:[.22,.88,.72],green:[.08,.60,.47],amber:[1,.67,.26],red:[.94,.32,.27],
  blue:[.25,.56,.78],wood:[.55,.38,.23],box:[.70,.50,.27],lamp:[.85,.94,.84]
} as const satisfies Record<string,Color>;
type Face=[Vec3,Vec3,Vec3,Vec3,Vec3];
/** Una sola malla dinámica batched evita cientos de draw calls por fotograma. */
export class SceneBuilder {
 private vertices:number[]=[];
 private orientation:{x:number;z:number;cos:number;sin:number}|null=null;
 get triangleCount():number{return this.vertices.length/27;}
 /** Rotación en Y alrededor de los pies: permite que el vehículo gire y la persona cambie de dirección. */
 orientAround(x:number,z:number,heading:number,draw:()=>void):void {
  const previous=this.orientation;
  this.orientation={x,z,cos:Math.cos(heading),sin:Math.sin(heading)};
  try{draw();}finally{this.orientation=previous;}
 }
 private vertex(p:Vec3,n:Vec3,c:Color){
  const r=this.orientation;
  if(!r){this.vertices.push(...p,...n,...c);return;}
  const dx=p[0]-r.x,dz=p[2]-r.z;
  const point:Vec3=[r.x+dx*r.cos+dz*r.sin,p[1],r.z-dx*r.sin+dz*r.cos];
  const normal:Vec3=[n[0]*r.cos+n[2]*r.sin,n[1],-n[0]*r.sin+n[2]*r.cos];
  this.vertices.push(...point,...normal,...c);
 }
 tri(a:Vec3,b:Vec3,c:Vec3,color:Color,n:Vec3){
  this.vertex(a,n,color);this.vertex(b,n,color);this.vertex(c,n,color);
 }
 quad(a:Vec3,b:Vec3,c:Vec3,d:Vec3,color:Color,n:Vec3){
  this.tri(a,b,c,color,n);this.tri(a,c,d,color,n);
 }
 box(x:number,y:number,z:number,w:number,h:number,d:number,color:Color){
  const a=x-w/2,b=x+w/2,l=y-h/2,r=y+h/2,c=z-d/2,e=z+d/2;
  const faces:Face[]=[
   [[a,l,e],[b,l,e],[b,r,e],[a,r,e],[0,0,1]],
   [[b,l,c],[a,l,c],[a,r,c],[b,r,c],[0,0,-1]],
   [[a,l,c],[a,l,e],[a,r,e],[a,r,c],[-1,0,0]],
   [[b,l,e],[b,l,c],[b,r,c],[b,r,e],[1,0,0]],
   [[a,r,e],[b,r,e],[b,r,c],[a,r,c],[0,1,0]],
   [[a,l,c],[b,l,c],[b,l,e],[a,l,e],[0,-1,0]]
  ];
  for(const [p,q,s,t,n] of faces) this.quad(p,q,s,t,color,n);
 }
 sphere(x:number,y:number,z:number,rx:number,ry:number,rz:number,color:Color,segments=9,rings=5){
  for(let i=0;i<rings;i++){
   const a=-Math.PI/2+Math.PI*i/rings,b=-Math.PI/2+Math.PI*(i+1)/rings;
   for(let j=0;j<segments;j++){
    const c=j*Math.PI*2/segments,d=(j+1)*Math.PI*2/segments;
    const point=(lat:number,lon:number):Vec3=>[x+rx*Math.cos(lat)*Math.sin(lon),
      y+ry*Math.sin(lat),z+rz*Math.cos(lat)*Math.cos(lon)];
    const normal=(p:Vec3):Vec3=>{
      const n=[(p[0]-x)/rx,(p[1]-y)/ry,(p[2]-z)/rz];
      const len=Math.hypot(...n)||1;return [n[0]/len,n[1]/len,n[2]/len];
    };
    const p=point(a,c),q=point(a,d),r=point(b,d),s=point(b,c);
    this.tri(p,q,r,color,normal(p));
    this.tri(p,r,s,color,normal(r));
   }
  }
 }
 cylinder(x:number,y:number,z:number,radius:number,height:number,color:Color,segments=12){
  for(let i=0;i<segments;i++){
   const a=2*Math.PI*i/segments,b=2*Math.PI*(i+1)/segments;
   const p:Vec3=[x+radius*Math.cos(a),y-height/2,z+radius*Math.sin(a)];
   const q:Vec3=[x+radius*Math.cos(b),y-height/2,z+radius*Math.sin(b)];
   const r:Vec3=[q[0],y+height/2,q[2]];
   const s:Vec3=[p[0],y+height/2,p[2]];
   const n:Vec3=[Math.cos((a+b)/2),0,Math.sin((a+b)/2)];
   this.quad(p,q,r,s,color,n);
   this.tri([x,y+height/2,z],s,r,color,[0,1,0]);
  }
 }
 disc(x:number,y:number,z:number,rx:number,rz:number,color:Color){
  const sections=20;
  for(let i=0;i<sections;i++){
   const a=2*Math.PI*i/sections,b=2*Math.PI*(i+1)/sections;
   this.tri([x,y,z],[x+Math.cos(a)*rx,y,z+Math.sin(a)*rz],
    [x+Math.cos(b)*rx,y,z+Math.sin(b)*rz],color,[0,1,0]);
  }
 }
 output():Float32Array{return new Float32Array(this.vertices);}
}
function rack(b:SceneBuilder,x:number,z:number){
 b.box(x,.9,z,2.15,1.8,.72,C.steel);
 b.box(x,.96,z,1.98,1.69,.65,C.dark);
 for(const y of [.38,.89,1.42,1.79]){
  b.box(x,y,z,2.2,.09,.75,C.steel);
 }
 for(const dx of [-1.03,1.03]){
  b.box(x+dx,.91,z,.09,1.82,.77,C.pale);
 }
 for(const y of [.59,1.1,1.6])for(const dx of [-.65,0,.65]){
  b.box(x+dx,y,z,.5,.37,.5,Math.round((y+dx)*10)%2?C.box:C.wood);
  b.box(x+dx,y+.18,z,.52,.025,.54,C.pale);
 }
}
function facility(b:SceneBuilder,scenario:string,time:number){
 b.box(0,-.27,0,17,.5,11,C.floor);
 b.box(0,-.01,0,16.5,.015,10.5,C.concrete);
 for(let x=-8;x<=8;x+=1)b.box(x,.006,0,.016,.01,10.5,C.grid);
 for(let z=-5;z<=5;z+=1)b.box(0,.006,z,16.5,.01,.016,C.grid);
 // Industrial floor lane marks and cable tracks.
 for(let x=-7.5;x<7.5;x+=.92){
  b.box(x,.018,4.28,.55,.014,.055,C.amber);
  b.box(x,.018,-3.86,.42,.013,.04,C.steel);
 }
 // Architectural enclosure and overhead lines.
 b.box(0,2.7,-5.12,17,5.4,.19,C.wall);
 for(const x of [-6.3,0,6.3]){
  b.box(x,3.55,-4.96,1.52,.43,.07,C.dark);
  b.box(x,3.55,-4.91,1.35,.27,.035,C.mint);
 }
 b.box(-8.23,2.7,0,.18,5.4,10.4,C.wall);
 b.box(0,.24,-5.01,16.5,.05,.13,C.steel);
 for(const x of [-7,-3.5,0,3.5,7]){
  b.box(x,2.65,-5.0,.11,5.25,.11,C.steel);
  b.box(x,4.82,-4.8,1.72,.08,.17,C.pale);
  b.box(x,4.81,-4.68,1.52,.033,.09,C.mint);
 }
 for(const x of [-7.5,7.5])b.box(x,.13,0,.1,.26,10,C.amber);
 // skylights on back wall
 for(const x of [-5.2,-1.7,1.8,5.3]){
  b.box(x,3.33,-4.96,2.15,1.25,.08,C.steel);
  b.box(x,3.33,-4.90,1.88,.99,.04,C.blue);
  b.box(x,3.33,-4.86,.04,1,.045,C.pale);
 }
 if(scenario==='safety'){
  for(let x=-6.3;x<7;x+=2.4){
   b.box(x,.2,-2.55,1.1,.35,.85,C.dark);
   b.box(x,.47,-2.55,1.05,.20,.82,C.steel);
   b.box(x+.1,.72,-2.55,.6,.31,.51,C.box);
  }
  b.box(-6.5,.7,3.7,1,.9,.5,C.amber);
  for(let x=-7.5;x<=7.5;x+=.7)b.box(x,.012,3.4,.33,.025,.10,C.amber);
 }
 if(scenario==='warehouse'){
  for(const x of [-6.0,-3.6,3.8,6.3])rack(b,x,-2.9);
  for(let z=-3;z<=3;z+=2)b.box(0,.02,z,15,.035,.08,C.amber);
 }
 if(scenario==='quality'){
  // Conveyer is geometric and rollers rotate visually with product flow.
  b.box(0,.55,1.1,14,.5,1.7,C.steel);
  b.box(0,.82,1.1,13.9,.12,1.56,C.dark);
  for(let x=-6.75;x<7;x+=.58){
   b.cylinder(x,.89,1.1,.09,1.35,C.grid,8);
  }
  for(const x of [-6.4,6.4])b.box(x,.35,1.1,.16,.70,1.83,C.pale);
  b.box(0,3.1,1.1,3.3,.20,2.35,C.steel);
  for(const x of [-1.4,1.4])b.box(x,2,1.1,.15,2.2,.19,C.pale);
  b.box(0,2.85,1.1,.8,.13,.8,C.mint);
  b.disc(0,.92,1.1,.48,.5,time%4<2?C.mint:C.amber);
 }
 if(scenario==='retail'){
  for(const x of [-6.5,-4.2,4.2,6.5]){
   rack(b,x,-2.5);
   b.box(x,.04,3.3,1.25,.06,1.2,C.grid);
  }
  b.box(0,.72,-3.2,2.5,1.3,.9,C.wood);
  b.box(0,1.48,-3.2,2.35,.12,.85,C.pale);
 }
 for(const x of [-7.95,7.95])for(const z of [-4.7,4.7]){
  b.box(x,.07,z,.2,.14,.2,C.amber);
 }
}
function zone(b:SceneBuilder,z:SimZone,active:boolean,time:number){
 const g=zoneFootprint(z);
 const x=g.center[0],w=g.width,d=g.depth,pz=g.center[2];
 const lit=active && (Math.sin(time*6)>-.3);
 const color=lit?C.red:(z.type==='count'?C.blue:C.mint);
 b.box(x,.022,pz,w,.009,d,C.dark);
 const dashes=14;
 for(let i=0;i<dashes;i++){
  if(i%2===1)continue;
  const dx=-w/2+w*(i+.5)/dashes;
  const dz=-d/2+d*(i+.5)/dashes;
  b.box(x+dx,.052,pz-d/2,w/dashes*.85,.038,.08,color);
  b.box(x+dx,.052,pz+d/2,w/dashes*.85,.038,.08,color);
  b.box(x-w/2,.052,pz+dz,.08,.038,d/dashes*.85,color);
  b.box(x+w/2,.052,pz+dz,.08,.038,d/dashes*.85,color);
 }
 for(const dx of [-w/2,w/2])for(const dz of [-d/2,d/2]){
  b.box(x+dx,.11,pz+dz,.14,.22,.14,color);
  b.disc(x+dx,.02,pz+dz,.21,.21,C.dark);
 }
}
function worker(b:SceneBuilder,o:SimEntity,time:number,hasHelmet:boolean,hasVest:boolean){
 const [x,,z]=entityFootprint(o);
 const isMoving=o.state==='walking'||o.state==='transporting';
 const phase=o.motionPhase??time*4;
 const stride=isMoving?Math.sin(phase)*.22:0;
 const sway=isMoving?Math.sin(phase)*.025:0;
 // Ground contact and a soft contact shadow are stationary in ground coordinates.
 b.disc(x,.018,z,.43,.33,C.dark);
 b.orientAround(x,z,o.heading??0,()=>{
  // Feet have opposite phases, hands counter-swing and helmet/vest are attached to torso.
  for(const side of [-1,1]){
   const offset=side*stride;
   b.box(x+side*.15,.46,z+offset,.20,.80,.26,C.steel);
   b.box(x+side*.15,.11,z+offset+.10,.28,.20,.43,C.dark);
   b.box(x+side*.45,1.12,z-side*stride*.7,.18,.67,.24,hasVest?C.pale:C.steel);
   b.sphere(x+side*.45,.74,z-side*stride*.7,.13,.13,.13,C.wood,8,5);
  }
  b.box(x,1.11+sway,z,.75,.86,.43,hasVest?C.green:C.blue);
  // high-visibility reflective strips and front panel
  b.box(x,1.29+sway,z+.226,.70,.10,.024,hasVest?C.mint:C.steel);
  b.box(x,1.05+sway,z+.23,.66,.085,.02,hasVest?C.pale:C.blue);
  b.box(x,1.66+sway,z,.22,.21,.22,C.wood);
  b.sphere(x,1.88+sway,z,.29,.31,.28,C.wood,12,6);
  b.sphere(x,2.12+sway,z-.07,.26,.11,.23,C.dark,10,4);
  if(hasHelmet){
   b.sphere(x,2.10+sway,z,.36,.18,.34,C.amber,12,5);
   b.box(x,2.045+sway,z+.26,.71,.065,.23,C.amber);
  }
  // face and a clear forward direction
  for(const side of [-1,1])b.sphere(x+side*.11,1.91+sway,z+.264,.025,.035,.025,C.dark,6,3);
  b.box(x,1.82+sway,z+.276,.12,.018,.017,C.wood);
 });
}
function forklift(b:SceneBuilder,o:SimEntity){
 const [x,,z]=entityFootprint(o);
 b.disc(x,.017,z,1.18,.73,C.dark);
 b.orientAround(x,z,o.heading??0,()=>{
  b.box(x,.64,z,1.76,.66,1.25,C.amber);
  b.box(x-.35,1.05,z,.77,.30,1.12,C.amber);
  b.box(x,1.83,z,1.30,.12,1.16,C.steel);
  for(const dx of [-.56,.56])for(const dz of [-.48,.48]){
   b.box(x+dx,1.33,z+dz,.10,.98,.11,C.pale);
   b.sphere(x+dx,.35,z+dz,.29,.29,.27,C.dark,11,5);
   b.sphere(x+dx,.35,z+dz,.12,.12,.12,C.steel,9,4);
  }
  b.sphere(x-.20,1.42,z,.23,.27,.23,C.wood,10,5);
  b.box(x+.98,1.0,z,.12,2.06,1.05,C.steel);
  for(const dz of [-.40,.40])b.box(x+1.50,.21,z+dz,1.30,.11,.17,C.pale);
  b.box(x-.60,1.19,z+.63,.20,.10,.035,C.red);
  b.box(x+.44,.90,z+.64,.34,.13,.045,C.mint);
  b.box(x-.95,.58,z,.09,.62,1.15,C.amber);
 });
}
function pallet(b:SceneBuilder,o:SimEntity){
 const [x,,z]=entityFootprint(o);
 b.disc(x,.015,z,.8,.60,C.dark);
 for(const dz of [-.34,0,.34])b.box(x,.14,z+dz,1.36,.13,.22,C.wood);
 for(const dx of [-.46,0,.46])b.box(x+dx,.25,z,.2,.10,1.18,C.box);
 b.box(x,.48,z,1.1,.4,1,C.box);
 b.box(x,.69,z,1.15,.025,1.03,C.pale);
}
function caseBox(b:SceneBuilder,o:SimEntity){
 const [x,,z]=entityFootprint(o);
 b.disc(x,.014,z,.72,.55,C.dark);
 b.box(x,.52,z,1.10,.94,.84,C.box);
 b.box(x,1.00,z,.95,.025,.17,C.pale);
 b.box(x+.56,.53,z,.03,.87,.08,C.steel);
}
function product(b:SceneBuilder,o:SimEntity){
 const [x,,z]=entityFootprint(o);
 // In quality products ride the conveyor, so sit at belt level.
 b.box(x,1.18,z,.94,.47,.73,C.pale);
 b.box(x,1.44,z,.88,.05,.67,C.blue);
 b.box(x,.95,z,.7,.08,.55,C.dark);
 b.box(x-.22,1.21,z+.38,.23,.16,.022,C.steel);
}
function defect(b:SceneBuilder,o:SimEntity,all:readonly SimEntity[]){
 const paired=all.find(e=>e.id==='q1');
 const [x,,z]=entityFootprint(paired??o);
 b.box(x+.12,1.48,z+.05,.21,.02,.16,C.red);
 b.disc(x+.12,1.5,z+.05,.11,.09,C.amber);
}
export function makeScene(snapshot:SimSnapshot,time:number,showZones:boolean):SceneBuilder{
 const b=new SceneBuilder();
 facility(b,snapshot.scenarioId,time);
 if(showZones)for(const z of snapshot.zones)zone(b,z,snapshot.alert,time);
 for(const item of snapshot.entities){
  switch(item.kind){
   case 'person':
    worker(b,item,time,snapshot.scenarioId==='safety'&&item.id!=='w2',
      snapshot.scenarioId==='safety');
    break;
   case 'forklift':forklift(b,item);break;
   case 'pallet':pallet(b,item);break;
   case 'box':caseBox(b,item);break;
   case 'product':product(b,item);break;
   case 'defect':defect(b,item,snapshot.entities);break;
   // Helmet and vest are already attached physically to worker geometry.
   case 'helmet':case 'vest':break;
   default:break;
  }
 }
 return b;
}
function compile(gl:WebGL2RenderingContext,type:number,source:string):WebGLShader{
 const shader=gl.createShader(type);
 if(!shader)throw new Error('No se pudo crear el shader 3D');
 gl.shaderSource(shader,source);gl.compileShader(shader);
 if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){
  const details=gl.getShaderInfoLog(shader);gl.deleteShader(shader);
  throw new Error('Error al iniciar 3D: '+details);
 }
 return shader;
}
const vertexShader=String.raw`#version 300 es
precision highp float;
layout(location=0) in vec3 aPosition;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec3 aColor;
uniform vec3 uEye;
uniform vec3 uRight;
uniform vec3 uUp;
uniform vec3 uForward;
uniform float uFocal;
uniform float uAspect;
out vec3 vColor;
out float vDistance;
void main(){
 vec3 delta=aPosition-uEye;
 float distanceToCamera=dot(delta,uForward);
 gl_Position=vec4(dot(delta,uRight)*uFocal/uAspect,
   dot(delta,uUp)*uFocal,distanceToCamera*1.004-0.20,distanceToCamera);
 vec3 normal=normalize(aNormal);
 float diffuse=max(dot(normal,normalize(vec3(-.35,.85,.52))),0.0);
 vColor=aColor*(.37+.63*diffuse);
 vDistance=distanceToCamera;
}
`;
const fragmentShader=String.raw`#version 300 es
precision highp float;
in vec3 vColor;
in float vDistance;
out vec4 fragColor;
void main(){
 vec3 fogColor=vec3(.063,.112,.145);
 float fog=smoothstep(14.,39.,vDistance)*.60;
 fragColor=vec4(mix(vColor,fogColor,fog),1.);
}
`;
export class IndustrialRenderer {
 private readonly program:WebGLProgram;
 private readonly buffer:WebGLBuffer;
 private readonly uniform:Record<string,WebGLUniformLocation|null>;
 constructor(private readonly gl:WebGL2RenderingContext){
  const vs=compile(gl,gl.VERTEX_SHADER,vertexShader);
  const fs=compile(gl,gl.FRAGMENT_SHADER,fragmentShader);
  const program=gl.createProgram();
  if(!program)throw new Error('No se pudo crear el programa 3D');
  gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
  gl.deleteShader(vs);gl.deleteShader(fs);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){
   const message=gl.getProgramInfoLog(program);gl.deleteProgram(program);
   throw new Error('No se pudo vincular el renderizador: '+message);
  }
  const buffer=gl.createBuffer();
  if(!buffer)throw new Error('No se pudo crear memoria de geometría WebGL');
  this.program=program;this.buffer=buffer;
  this.uniform=Object.fromEntries(['uEye','uRight','uUp','uForward','uFocal','uAspect']
   .map(key=>[key,gl.getUniformLocation(program,key)]));
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
 }
 render(scene:SceneBuilder,camera:Camera,width:number,height:number){
  const gl=this.gl;
  gl.viewport(0,0,width,height);
  gl.clearColor(.063,.112,.145,1);
  gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.useProgram(this.program);
  gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);
  gl.bufferData(gl.ARRAY_BUFFER,scene.output(),gl.DYNAMIC_DRAW);
  const stride=9*4;
  gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,3,gl.FLOAT,false,stride,0);
  gl.enableVertexAttribArray(1);gl.vertexAttribPointer(1,3,gl.FLOAT,false,stride,3*4);
  gl.enableVertexAttribArray(2);gl.vertexAttribPointer(2,3,gl.FLOAT,false,stride,6*4);
  const uniforms=this.uniform;
  gl.uniform3f(uniforms.uEye,...camera.eye);
  gl.uniform3f(uniforms.uRight,...camera.right);
  gl.uniform3f(uniforms.uUp,...camera.up);
  gl.uniform3f(uniforms.uForward,...camera.forward);
  gl.uniform1f(uniforms.uFocal,camera.focal);
  gl.uniform1f(uniforms.uAspect,width/Math.max(1,height));
  gl.drawArrays(gl.TRIANGLES,0,scene.triangleCount*3);
 }
 dispose(){this.gl.deleteBuffer(this.buffer);this.gl.deleteProgram(this.program);}
}
