import {useEffect,useRef} from 'react';
import * as THREE from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';

export const WORLD_KEYS=['safety','quality','warehouse','retail'] as const;
export type WorldKey=typeof WORLD_KEYS[number];

const WORLD_PALETTES={
 safety:{accent:0x64f6d0,secondary:0xf9b55f,position:0},
 quality:{accent:0x6bdef4,secondary:0xe1b4ff,position:1},
 warehouse:{accent:0x93b1ff,secondary:0x72f1d5,position:2},
 retail:{accent:0xefbeff,secondary:0x7dffe0,position:3},
} as const;
export function worldName(key:WorldKey):string{
 return {safety:'Seguridad industrial',quality:'Control de calidad',
  warehouse:'Logística inteligente',retail:'Retail y ocupación'}[key];
}
interface Props{
 readonly active:WorldKey;
 readonly paused:boolean;
 readonly onReady?:(ready:boolean)=>void;
}
/** Escenario de exhibición original. NO genera predicciones YOLO.
 * El panel de Análisis es el único que procesa píxeles con ONNX real.
 * Un solo renderer, geometrías compartidas, bloom adaptativo y limpieza total. */
export function StudioWorld({active,paused,onReady}:Props){
 const canvasRef=useRef<HTMLCanvasElement>(null);
 const stageRef=useRef<HTMLDivElement>(null);
 const engine=useRef<{change:(key:WorldKey)=>void;play:(value:boolean)=>void}|null>(null);
 useEffect(()=>{engine.current?.change(active);},[active]);
 useEffect(()=>{engine.current?.play(!paused);},[paused]);
 useEffect(()=>{
  const canvas=canvasRef.current,host=stageRef.current;
  if(!canvas||!host)return;
  let renderer:any=null,composer:any=null,raf=0,last=0,disposed=false,visible=true;
  let playing=!paused,activeKey:WorldKey=active;
  const prefer=window.matchMedia('(prefers-reduced-motion: reduce)');
  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0x060f1d);
  scene.fog=new THREE.FogExp2(0x06111d,.037);
  const camera=new THREE.PerspectiveCamera(35,1,.1,100);
  camera.position.set(10.8,8.6,16.8);
  const targetCam=new THREE.Vector3(10.8,8.6,16.8);
  const lookAt=new THREE.Vector3(0,0,0);
  const box=new THREE.BoxGeometry(1,1,1),sphere=new THREE.SphereGeometry(1,16,12);
  const cylinder=new THREE.CylinderGeometry(1,1,1,14);
  const geometries=new Set<any>([box,sphere,cylinder]);
  const materials=new Set<any>();
  const material=(color:number,metalness=.48,roughness=.38,emissive=0)=>{
   const m=new THREE.MeshStandardMaterial({
    color,metalness,roughness,emissive,emissiveIntensity:emissive?.35:0
   });
   materials.add(m);return m;
  };
  const asphalt=material(0x142c3b,.67,.35);
  const metal=material(0x2c4b5c,.8,.23);
  const dark=material(0x0c1f2b,.63,.28);
  const bright=material(0x6b96a3,.76,.21);
  const glass=material(0x4fa7b1,.58,.18);
  const orange=material(0xe7aa63,.55,.36,0xe7aa63);
  const cyan=material(0x56e7d2,.38,.25,0x56e7d2);
  const violet=material(0x91a3e9,.47,.31,0x6a7dca);
  const white=material(0xbed8df,.5,.28);
  const black=material(0x122735,.8,.2);
  const crateColors=[metal,glass,orange,violet,bright];
  const create=(g:any,geo:any,mat:any,x:number,y:number,z:number,sx=1,sy=1,sz=1)=>{
   const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);
   m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;
   g.add(m);return m;
  };
  const block=(g:any,mat:any,x:number,y:number,z:number,w:number,h:number,d:number)=>
   create(g,box,mat,x,y,z,w,h,d);
  const cylinderAt=(g:any,mat:any,x:number,y:number,z:number,r:number,h:number)=>
   create(g,cylinder,mat,x,y,z,r,h,r);
  const platform=new THREE.Group();scene.add(platform);
  block(platform,asphalt,0,-.53,0,17,.26,13);
  block(platform,dark,0,-.7,0,17.35,.16,13.35);
  const floorLines=material(0x25566a,.3,.4,0x1a4555);
  for(let i=-7;i<=7;i++){
   block(platform,floorLines,i,-.385,0,.012,.004,12.8);
  }
  for(let i=-5;i<=5;i++){
   block(platform,floorLines,0,-.385,i,16.9,.004,.012);
  }
  // Líneas de guía, e iluminación de un centro industrial ficticio.
  for(const s of [-1,1]){
   block(platform,cyan,s*8.5,-.44,0,.035,.035,13.3);
   block(platform,cyan,0,-.44,s*6.55,17,.035,.035);
  }
  const ambience=new THREE.HemisphereLight(0x9bdaf0,0x0e1b2b,2.5);scene.add(ambience);
  const key=new THREE.DirectionalLight(0xf8fff6,3.4);
  key.position.set(-7,13,8);scene.add(key);
  const neonLeft=new THREE.PointLight(0x56e8e0,63,18);neonLeft.position.set(-5,4,2);scene.add(neonLeft);
  const neonRight=new THREE.PointLight(0x9b8dff,46,16);neonRight.position.set(6,4,-3);scene.add(neonRight);
  const worlds={} as Record<WorldKey,{group:any;moving:any[];rotating:any[]}>;
  function person(g:any,x:number,z:number,vest:any,helmet=true){
   const p=new THREE.Group();p.position.set(x,0,z);g.add(p);
   cylinderAt(p,dark,0,.48,0,.24,.9);
   block(p,vest,0,1.28,0,.55,.84,.34);
   block(p,white,0,1.92,0,.27,.27,.27);
   if(helmet){
    cylinderAt(p,orange,0,2.08,0,.21,.15);
    block(p,orange,0,2.11,.13,.48,.04,.29);
   }
   for(const sx of [-1,1]){
    block(p,dark,sx*.16,.42,0,.20,.78,.2);
    block(p,vest,sx*.36,1.22,0,.16,.64,.19);
   }
   return p;
  }
  function rack(g:any,x:number,z:number,count=3){
   const rackGroup=new THREE.Group();rackGroup.position.set(x,0,z);g.add(rackGroup);
   for(const xx of [-1.5,1.5])for(const zz of [-.62,.62])
    block(rackGroup,metal,xx,1.75,zz,.12,3.55,.12);
   for(let h=0;h<3;h++){
    block(rackGroup,bright,0,.68+h*1.08,0,3.2,.09,1.3);
    for(let i=-count;i<=count;i++){
     const m=crateColors[(i+count+h)%crateColors.length];
     block(rackGroup,m,i*.38,.94+h*1.08,(i%2)*.16,.33,.45,.43);
    }
   }
  }
  function conveyor(g:any,x:number,z:number,length=6){
   block(g,metal,x,.42,z,length,.35,1.6);
   block(g,dark,x,.63,z,length,.09,1.25);
   for(let i=0;i<8;i++){
    const a=x-length*.43+i*length*.12;
    const roll=cylinderAt(g,bright,a,.71,z,.11,1.4);
    roll.rotation.x=Math.PI/2;
   }
   for(const xx of [-length*.37,length*.37])for(const zz of [-.5,.5])
    block(g,metal,x+xx,0,zz,.12,.85,.12);
  }
  function arm(g:any,x:number,z:number,paint:any){
   const root=new THREE.Group();root.position.set(x,0,z);g.add(root);
   cylinderAt(root,metal,0,.22,0,.58,.46);
   const base=block(root,paint,0,.85,0,.34,1.1,.32);
   base.rotation.z=.19;
   const upper=new THREE.Group();upper.position.set(.11,1.47,0);root.add(upper);
   const shaft=block(upper,paint,.48,.45,0,.25,1.12,.25);
   shaft.rotation.z=-.78;
   cylinderAt(upper,metal,.93,.87,0,.26,.25);
   block(upper,white,1.2,.78,0,.55,.13,.13);
   block(upper,cyan,1.52,.61,0,.1,.3,.15);
   return upper;
  }
  function gantry(g:any,x:number,z:number){
   for(const xx of [-2,2])block(g,metal,x+xx,2.0,z,.21,4,.21);
   block(g,bright,x,4,z,4.45,.25,.29);
   block(g,cyan,x,3.85,z,.75,.08,.32);
   block(g,white,x,3.53,z,.34,.52,.25);
  }
  for(const key of WORLD_KEYS){
   const group=new THREE.Group();scene.add(group);
   const moving:any[]=[],rotating:any[]=[];
   if(key==='safety'){
    gantry(group,-1,-2.8);
    block(group,metal,-5,1,-3,.7,2.6,.65);
    for(let i=0;i<3;i++)block(group,orange,-4.3+i*.48,.35,-.9,.28,.7,.28);
    moving.push(person(group,0,.8,cyan));
    person(group,-3,1,orange);
    person(group,3,-2,violet);
    rack(group,4.6,2,2);
    const radar=new THREE.Group();radar.position.set(0,2.8,.8);group.add(radar);
    const scanGeo=new THREE.TorusGeometry(1.45,.017,6,90);
    geometries.add(scanGeo);
    const scan=create(radar,scanGeo,cyan,0,0,0);
    scan.rotation.x=Math.PI*.5;rotating.push(scan);
   }else if(key==='quality'){
    conveyor(group,-.5,.2,8);
    gantry(group,.3,-1.5);
    const a=arm(group,-4.7,-1.4,violet);rotating.push(a);
    arm(group,4.3,1.6,cyan);
    for(let i=0;i<3;i++){
     const obj=block(group,orange,-1.9+i*1.7,1.05,.15,.65,.65,.7);
     moving.push(obj);
    }
    person(group,4.8,-2.4,cyan);
    block(group,metal,-5.5,1.35,2,1,2.6,.75);
    block(group,glass,-5.5,1.97,2.4,.7,.65,.08);
   }else if(key==='warehouse'){
    for(const x of [-5,0,5])rack(group,x,-2.3,3);
    for(const x of [-3.5,3.5])rack(group,x,3.5,2);
    const lift=new THREE.Group();lift.position.set(-1.3,0,1.2);group.add(lift);
    block(lift,orange,0,.65,0,1.7,.78,1.4);
    block(lift,metal,-.28,1.5,0,.14,1.5,.13);
    block(lift,metal,.37,1.5,0,.14,1.5,.13);
    block(lift,orange,0,2.2,0,1.6,.12,1.5);
    for(const xx of [-.57,.57])for(const zz of [-.55,.55]){
     const wheel=cylinderAt(lift,dark,xx,.22,zz,.33,.2);wheel.rotation.x=Math.PI/2;
    }
    block(lift,bright,1.06,.23,0,.12,.11,2.05);
    person(group,3,1.1,cyan);
    moving.push(lift);
   }else{
    for(const x of [-5,0,5])rack(group,x,-2.7,3);
    for(const x of [-4,2.6]){
     block(group,dark,x,.5,2,2.2,1,.9);
     block(group,glass,x,1.04,2,.8,.14,.7);
    }
    person(group,-2,1.1,violet,false);
    moving.push(person(group,1.6,.5,cyan,false));
    person(group,4,1.8,orange,false);
    for(let i=0;i<4;i++)block(group,crateColors[i],-3.5+i*1.95,.28,3.6,.5,.57,.4);
   }
   group.visible=key===activeKey;
   worlds[key]={group,moving,rotating};
  }
  const ribbonGeometry=new THREE.BufferGeometry();
  geometries.add(ribbonGeometry);
  const coords:number[]=[];
  for(let i=0;i<120;i++){
   const a=i/119*Math.PI*2;
   coords.push(Math.sin(a)*8.9,Math.cos(i*.12)*.07+.03,Math.cos(a)*7.2);
  }
  ribbonGeometry.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));
  const outlineMaterial=new THREE.LineBasicMaterial({
   color:0x41dec8,transparent:true,opacity:.47
  });
  materials.add(outlineMaterial);
  const outline=new THREE.LineLoop(ribbonGeometry,outlineMaterial);
  platform.add(outline);
  const particlesGeometry=new THREE.BufferGeometry();
  const count=430,points=new Float32Array(count*3);
  for(let i=0;i<count;i++){
   const angle=i*2.39996,radius=Math.sqrt((i+.6)/count)*12;
   points[i*3]=Math.cos(angle)*radius;
   points[i*3+1]=1.2+((i*97)%37)*.185;
   points[i*3+2]=Math.sin(angle)*radius;
  }
  particlesGeometry.setAttribute('position',new THREE.BufferAttribute(points,3));
  geometries.add(particlesGeometry);
  const pm=new THREE.PointsMaterial({
   color:0xa7fef0,size:.034,transparent:true,opacity:.6,
   depthWrite:false,blending:THREE.AdditiveBlending
  });
  materials.add(pm);
  const particles=new THREE.Points(particlesGeometry,pm);scene.add(particles);
  let mouseX=0,mouseY=0,cameraX=0,cameraY=0;
  const move=(event:PointerEvent)=>{
   const bounds=host.getBoundingClientRect();
   mouseX=Math.max(-1,Math.min(1,(event.clientX-bounds.left)/Math.max(1,bounds.width)*2-1));
   mouseY=Math.max(-1,Math.min(1,(event.clientY-bounds.top)/Math.max(1,bounds.height)*2-1));
  };
  const tick=(now:number)=>{
   raf=window.requestAnimationFrame(tick);
   if(disposed||!playing||prefer.matches||!visible||document.hidden)return;
   if(now-last<33)return;
   const dt=Math.min(.06,(now-last)/1000||.033);
   last=now;
   const current=worlds[activeKey];
   current.rotating.forEach((object,i)=>{
    object.rotation.z+=dt*(i%2?-.11:.14);
   });
   current.moving.forEach((obj,i)=>{
    // Movimiento determinista solo visual: NO es un resultado YOLO.
    if(keyFor(obj)==='object'){obj.position.y=1.04+Math.sin(now*.001+i*1.1)*.035;}
   });
   cameraX+=(mouseX-cameraX)*Math.min(1,dt*1.6);
   cameraY+=(mouseY-cameraY)*Math.min(1,dt*1.6);
   camera.position.x+=(targetCam.x+cameraX*.45-camera.position.x)*Math.min(1,dt*1.1);
   camera.position.y+=(targetCam.y-cameraY*.25-camera.position.y)*Math.min(1,dt*1.1);
   camera.position.z+=(targetCam.z-camera.position.z)*Math.min(1,dt*1.1);
   camera.lookAt(lookAt);
   particles.rotation.y+=dt*.004;
   if(composer)composer.render();else renderer?.render(scene,camera);
  };
  function keyFor(object:any):string{return object.isMesh?'object':'group';}
  const paint=()=>{
   camera.lookAt(lookAt);
   if(composer)composer.render();else renderer?.render(scene,camera);
  };
  const size=()=>{
   if(!renderer)return;
   const rect=host.getBoundingClientRect();
   const width=Math.max(1,Math.round(rect.width)),height=Math.max(1,Math.round(rect.height));
   const dpr=Math.min(1.35,window.devicePixelRatio||1);
   renderer.setPixelRatio(dpr);renderer.setSize(width,height,false);
   composer?.setSize(width,height);
   camera.aspect=width/height;
   camera.fov=width<680?47:35;
   camera.position.set(width<680?11.1:10.8,width<680?10.2:8.6,width<680?20.8:16.8);
   targetCam.set(camera.position.x,camera.position.y,camera.position.z);
   camera.updateProjectionMatrix();paint();
  };
  const onChange=(key:WorldKey)=>{
   activeKey=key;
   for(const id of WORLD_KEYS)worlds[id].group.visible=id===key;
   const p=WORLD_PALETTES[key];
   neonLeft.color.setHex(p.accent);
   neonRight.color.setHex(p.secondary);
   paint();
  };
  const motion=()=>{if(prefer.matches)playing=false;paint();};
  const intersect=new IntersectionObserver(entries=>{
   visible=entries.some(e=>e.isIntersecting);
   if(visible)paint();
  },{threshold:.025});
  const resize=new ResizeObserver(size);
  try{
   renderer=new THREE.WebGLRenderer({
    canvas,alpha:false,antialias:window.devicePixelRatio<=1.5,
    powerPreference:'high-performance'
   });
   renderer.toneMapping=THREE.ACESFilmicToneMapping;
   renderer.toneMappingExposure=1.6;
   renderer.outputColorSpace=THREE.SRGBColorSpace;
   // Bloom de Three.js; el renderer sigue siendo único. Fallback sin bloom.
   if(window.innerWidth>700){
    try{
     composer=new EffectComposer(renderer);
     composer.addPass(new RenderPass(scene,camera));
     composer.addPass(new UnrealBloomPass(new THREE.Vector2(1,1),.57,.45,.88));
     composer.addPass(new OutputPass());
    }catch{composer?.dispose();composer=null;}
   }
   host.addEventListener('pointermove',move,{passive:true});
   prefer.addEventListener('change',motion);
   resize.observe(host);intersect.observe(host);
   size();onReady?.(true);
   raf=window.requestAnimationFrame(tick);
   engine.current={
    change:onChange,
    play:(value:boolean)=>{playing=value;if(!value)paint();}
   };
  }catch{
   canvas.style.display='none';
   onReady?.(false);
  }
  return()=>{
   disposed=true;engine.current=null;
   window.cancelAnimationFrame(raf);
   host.removeEventListener('pointermove',move);
   prefer.removeEventListener('change',motion);
   resize.disconnect();intersect.disconnect();
   composer?.dispose();renderer?.dispose();
   for(const geo of geometries)geo.dispose();
   for(const mat of materials)mat.dispose();
  };
 },[]);
 return <div className="studio-world-stage" ref={stageRef}>
  <canvas ref={canvasRef} className="studio-world-canvas" aria-hidden="true"/>
  <div className="studio-world-fallback" aria-hidden="true"/>
  <span className="studio-world-legend" aria-hidden="true">ESCENA 3D · REPRESENTACIÓN VIRTUAL</span>
 </div>;
}
