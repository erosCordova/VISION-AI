import {useEffect,useRef} from 'react';
import {gsap} from 'gsap';
import * as THREE from 'three';
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {clone as cloneSkeleton} from 'three/examples/jsm/utils/SkeletonUtils.js';
import {humanAssetFor,motionClipName} from '../scenarios/data/human-assets';

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
  let renderer:any=null,composer:any=null,environment:any=null,room:any=null,raf=0,last=0,disposed=false,visible=true;
  let playing=!paused,activeKey:WorldKey=active;
  const prefer=window.matchMedia('(prefers-reduced-motion: reduce)');
  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0x060f1d);
  scene.fog=new THREE.FogExp2(0x06111d,.029);
  const camera=new THREE.PerspectiveCamera(35,1,.1,100);
  camera.position.set(10.8,8.6,16.8);
  const targetCam=new THREE.Vector3(10.8,8.6,16.8);
  const lookAt=new THREE.Vector3(0,0,0);
  const box=new THREE.BoxGeometry(1,1,1),sphere=new THREE.SphereGeometry(1,16,12);
  const cylinder=new THREE.CylinderGeometry(1,1,1,14);
  const anatomia=new THREE.SphereGeometry(1,28,18);
  const taper=new THREE.CylinderGeometry(.31,.255,.78,20);
  const cuff=new THREE.CylinderGeometry(1,1,1,16);
  const geometries=new Set<any>([box,sphere,cylinder,anatomia,taper,cuff]);
  const actorRigs:Array<{
   world:WorldKey;root:any;fallback:any;armL:any;armR:any;
   legL:any;legR:any;body:any;phase:number;homeX:number;homeZ:number;
   url:string|null;requested:boolean;mixer:any|null;
  }>=[];
  const loadedGeometries=new Set<any>(),loadedMaterials=new Set<any>();
  const gltfCache=new Map<string,Promise<any>>();
  let buildingWorld:WorldKey='safety';
  const loadAsset=(url:string):Promise<any>=>{
   let task=gltfCache.get(url);
   if(!task){
    task=new Promise((resolve,reject)=>{
     new GLTFLoader().load(url,(glb:any)=>resolve(glb),undefined,(error:unknown)=>reject(error));
    });
    gltfCache.set(url,task);
    task.catch(()=>gltfCache.delete(url));
   }
   return task;
  };
  const loadCharacters=(world:WorldKey)=>{
   for(const rig of actorRigs){
    if(rig.world!==world||!rig.url||rig.requested)continue;
    rig.requested=true;
    void loadAsset(rig.url).then(asset=>{
     if(disposed||!rig.root.parent)return;
     const model=cloneSkeleton(asset.scene);
     const bounds=new THREE.Box3().setFromObject(model);
     const height=bounds.max.y-bounds.min.y;
     if(!Number.isFinite(height)||height<.1)return;
     const scale=Math.min(7,Math.max(.025,2.1/height));
     model.scale.setScalar(scale);
     model.position.y=-bounds.min.y*scale;
     model.traverse((node:any)=>{
      if(node.isMesh){
       node.castShadow=true;node.receiveShadow=true;
       if(node.geometry)loadedGeometries.add(node.geometry);
       const mats=Array.isArray(node.material)?node.material:[node.material];
       for(const m of mats)if(m)loadedMaterials.add(m);
      }
     });
     rig.root.add(model);
     rig.fallback.visible=false;
     if(asset.animations?.length){
      const names=asset.animations.map((clip:any)=>clip.name);
      const moving=world==='retail'||world==='warehouse'||world==='safety';
      const preferred=motionClipName(moving?'walking':'idle',names);
      const clip=asset.animations.find((item:any)=>item.name===preferred)??asset.animations[0];
      const mixer=new THREE.AnimationMixer(model);
      mixer.clipAction(clip).play();
      rig.mixer=mixer;
     }
    }).catch(()=>{
     // La figura articulada local permanece disponible si el GLB remoto no carga.
    });
   }
  };
  const materials=new Set<any>();
  const material=(color:number,metalness=.48,roughness=.38,emissive=0)=>{
   const m=new THREE.MeshStandardMaterial({
    color,metalness,roughness,emissive,emissiveIntensity:emissive?.35:0
   });
   materials.add(m);return m;
  };
  const asphalt=material(0x1c3545,.25,.48);
  const metal=material(0x4c7988,.42,.28);
  const dark=material(0x193544,.34,.37);
  const bright=material(0xb1d9df,.28,.29);
  const glass=material(0x7dbcca,.26,.25);
  const orange=material(0xe7aa63,.55,.36,0xe7aa63);
  const cyan=material(0x56e7d2,.38,.25,0x56e7d2);
  const violet=material(0x91a3e9,.47,.31,0x6a7dca);
  const white=material(0xbed8df,.5,.28);
  const crateColors=[metal,glass,orange,violet,bright];
  const emission=new THREE.MeshBasicMaterial({color:0x46e7cf,toneMapped:false});
  const emissionViolet=new THREE.MeshBasicMaterial({color:0x8a99ff,toneMapped:false});
  materials.add(emission);materials.add(emissionViolet);
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
   block(platform,emission,s*8.5,-.40,0,.028,.021,13.3);
   block(platform,emissionViolet,0,-.40,s*6.55,17,.018,.025);
  }
  // Balizas de guiado y franjas de paso reflectantes.
  for(let i=-5;i<=5;i++){
   block(platform,bright,i*1.4,-.391,4,.53,.005,.065);
   if(i%2===0){
    block(platform,emission,i*1.4,-.383,-4.7,.20,.011,.04);
   }
  }
  const ambience=new THREE.HemisphereLight(0x9bdaf0,0x0e1b2b,1.28);scene.add(ambience);
  const key=new THREE.DirectionalLight(0xf0faff,2.85);
  key.position.set(-8,14,11);
  key.castShadow=true;
  key.shadow.mapSize.set(1024,1024);
  key.shadow.camera.left=-13;key.shadow.camera.right=13;
  key.shadow.camera.top=13;key.shadow.camera.bottom=-13;
  key.shadow.camera.near=.5;key.shadow.camera.far=40;
  key.shadow.bias=-.0007;scene.add(key);
  const neonLeft=new THREE.PointLight(0x56e8e0,33,20);neonLeft.position.set(-5,5,2);scene.add(neonLeft);
  const neonRight=new THREE.PointLight(0x9b8dff,26,18);neonRight.position.set(6,5,-3);scene.add(neonRight);
  const worlds={} as Record<WorldKey,{group:any;moving:any[];rotating:any[]}>;
  function person(g:any,x:number,z:number,vest:any,helmet=true,roleId?:string){
   // Figura anatómica articulada: proporciones humanas, cabeza, manos,
   // cuello, EPP y pasos independientes. Siempre funciona sin conexión.
   const root=new THREE.Group();root.position.set(x,0,z);g.add(root);
   const visual=new THREE.Group();root.add(visual);
   const tones=[0xd9a58d,0xa87a61,0xe5b99a,0x926c56];
   const tone=material(tones[actorRigs.length%tones.length],.02,.83);
   const jeans=material(helmet?0x344d5b:0x283b4a,.06,.87);
   const hair=material(0x202c35,.03,.84);
   const shoes=material(0x202b34,.18,.69);
   const reflection=material(0xe9fff1,.16,.36);
   const eye=material(0x1b3038,.02,.89);
   const chest=create(visual,taper,vest,0,1.33,0);
   chest.castShadow=true;
   create(visual,anatomia,jeans,0,.93,0,.275,.16,.23);
   const neck=cylinderAt(visual,tone,0,1.82,0,.115,.18);
   neck.castShadow=true;
   create(visual,anatomia,tone,0,2.015,0,.235,.295,.235);
   create(visual,anatomia,tone,0,1.96,.224,.067,.078,.065);
   for(const side of [-1,1]){
    create(visual,anatomia,tone,side*.235,2.01,0,.048,.105,.074);
    create(visual,anatomia,eye,side*.086,2.048,.22,.024,.029,.017);
   }
   if(helmet){
    create(visual,anatomia,orange,0,2.226,-.008,.266,.128,.259);
    block(visual,orange,0,2.16,.18,.52,.048,.26);
    block(visual,reflection,0,2.214,.22,.21,.029,.055);
    // Franjas reflectantes, visibles en giros y primeros planos.
    block(visual,reflection,0,1.48,.282,.52,.055,.018);
    block(visual,reflection,0,1.15,.277,.43,.047,.018);
    for(const side of [-1,1]){
     const strip=block(visual,reflection,side*.21,1.36,.235,.056,.69,.018);
     strip.rotation.z=side*.17;
    }
   }else{
    create(visual,anatomia,hair,0,2.26,-.048,.24,.095,.23);
   }
   const armL=new THREE.Group(),armR=new THREE.Group();
   const legL=new THREE.Group(),legR=new THREE.Group();
   for(const side of [-1,1]){
    const arm=side<0?armL:armR;
    arm.position.set(side*.395,1.645,0);visual.add(arm);
    create(arm,anatomia,vest,0,-.23,0,.145,.315,.156);
    create(arm,anatomia,tone,0,-.57,.015,.11,.17,.12);
    create(arm,anatomia,tone,0,-.74,.028,.12,.12,.096);
    const leg=side<0?legL:legR;
    leg.position.set(side*.155,.93,0);visual.add(leg);
    create(leg,anatomia,jeans,0,-.34,0,.157,.39,.16);
    create(leg,anatomia,shoes,0,-.77,.095,.17,.13,.275);
   }
   const phase=(actorRigs.length*1.831)%6.283;
   actorRigs.push({world:buildingWorld,root,fallback:visual,armL,armR,
    legL,legR,body:chest,phase,homeX:x,homeZ:z,
    url:roleId?humanAssetFor(buildingWorld,roleId):null,requested:false,mixer:null});
   return root;
  }
  function rack(g:any,x:number,z:number,count=3){
   const rackGroup=new THREE.Group();rackGroup.position.set(x,0,z);g.add(rackGroup);
   for(const xx of [-1.5,1.5])for(const zz of [-.62,.62])
    block(rackGroup,metal,xx,1.75,zz,.12,3.55,.12);
   for(let h=0;h<3;h++){
    block(rackGroup,bright,0,.68+h*1.08,0,3.2,.09,1.3);
    block(rackGroup,h%2===0?emission:emissionViolet,0,.737+h*1.08,.69,2.9,.012,.014);
    for(let i=-count;i<=count;i++){
     const m=crateColors[(i+count+h)%crateColors.length];
     block(rackGroup,m,i*.38,.94+h*1.08,(i%2)*.16,.33,.45,.43);
    }
   }
  }
  function conveyor(g:any,x:number,z:number,length=6){
   block(g,metal,x,.42,z,length,.35,1.6);
   block(g,dark,x,.63,z,length,.09,1.25);
   block(g,emission,x,.52,z-.78,length,.025,.035);
   block(g,emissionViolet,x,.52,z+.78,length,.025,.035);
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
   block(g,emission,x,3.83,z,3.85,.06,.08);
   block(g,cyan,x,3.85,z,.75,.08,.32);
   block(g,white,x,3.53,z,.34,.52,.25);
  }
  for(const key of WORLD_KEYS){
   const group=new THREE.Group();scene.add(group);
   buildingWorld=key;
   const moving:any[]=[],rotating:any[]=[];
   if(key==='safety'){
    gantry(group,-1,-2.8);
    block(group,metal,-5,1,-3,.7,2.6,.65);
    for(let i=0;i<3;i++)block(group,orange,-4.3+i*.48,.35,-.9,.28,.7,.28);
    moving.push(person(group,0,.8,cyan,true,'w1'));
    person(group,-3,1,orange,true,'w2');
    person(group,3,-2,violet,true,'w3');
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
    person(group,4.8,-2.4,cyan,true,'inspector');
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
    person(group,3,1.1,cyan,true,'a1');
    lift.userData.industrialVehicle=true;
    moving.push(lift);
   }else{
    for(const x of [-5,0,5])rack(group,x,-2.7,3);
    for(const x of [-4,2.6]){
     block(group,dark,x,.5,2,2.2,1,.9);
     block(group,glass,x,1.04,2,.8,.14,.7);
    }
    person(group,-2,1.1,violet,false,'r0');
    moving.push(person(group,1.6,.5,cyan,false,'r2'));
    person(group,4,1.8,orange,false,'r3');
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
  let orbitYaw=0,orbitPitch=0,zoom=1;
  let dragging=false,dragX=0,dragY=0;
  const down=(event:PointerEvent)=>{
   if(event.button!==0)return;
   dragging=true;dragX=event.clientX;dragY=event.clientY;
   host.setPointerCapture?.(event.pointerId);
  };
  const up=(event:PointerEvent)=>{
   dragging=false;
   if(host.hasPointerCapture?.(event.pointerId))host.releasePointerCapture(event.pointerId);
  };
  const wheel=(event:WheelEvent)=>{
   event.preventDefault();
   zoom=Math.min(1.42,Math.max(.73,zoom+Math.sign(event.deltaY)*.07));
   paint();
  };
  const move=(event:PointerEvent)=>{
   if(dragging){
    orbitYaw=Math.min(.88,Math.max(-.88,orbitYaw+(event.clientX-dragX)*.0032));
    orbitPitch=Math.min(.40,Math.max(-.36,orbitPitch+(event.clientY-dragY)*.0028));
    dragX=event.clientX;dragY=event.clientY;
   }
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
   const t=now*.001;
   current.rotating.forEach((object,i)=>{
    object.rotation.z=Math.sin(t*(i%2?.57:.39)+i*.9)*.26;
    object.rotation.y=Math.sin(t*.24+i)*.32;
   });
   current.moving.forEach((obj,i)=>{
    // Exclusivamente coreografía visual; los resultados YOLO son independientes.
    if(obj.userData?.industrialVehicle){
     obj.position.x=-1.3+Math.sin(t*.29)*2.1;
     obj.position.z=1.2+Math.cos(t*.21)*.72;
     obj.rotation.y=Math.sin(t*.29)*.19;
    }else if(obj.isMesh){
     obj.position.x=-1.9+i*1.7+((t*.37+i*.73)%3.4)-1.7;
     obj.position.y=1.05+Math.sin(t*1.3+i)*.026;
    }
   });
   for(const rig of actorRigs){
    if(rig.world!==activeKey)continue;
    const walking=current.moving.includes(rig.root);
    const stride=walking?Math.sin(t*2.3+rig.phase):Math.sin(t*.57+rig.phase)*.075;
    rig.legL.rotation.x=stride*.49;
    rig.legR.rotation.x=-stride*.49;
    rig.armL.rotation.x=-stride*.36+Math.sin(t*.49+rig.phase)*.038;
    rig.armR.rotation.x=stride*.36-Math.sin(t*.43+rig.phase)*.038;
    rig.body.rotation.z=Math.sin(t*.52+rig.phase)*.025;
    rig.root.position.x=rig.homeX+(walking?Math.sin(t*.32+rig.phase)*.62:0);
    rig.root.position.z=rig.homeZ+(walking?Math.sin(t*.27+rig.phase*.6)*.39:0);
    rig.root.rotation.y=Math.sin(t*.35+rig.phase)*.22;
    rig.mixer?.update(dt);
   }
   cameraX+=(mouseX-cameraX)*Math.min(1,dt*1.6);
   cameraY+=(mouseY-cameraY)*Math.min(1,dt*1.6);
   const wantedX=(targetCam.x*Math.cos(orbitYaw)+targetCam.z*Math.sin(orbitYaw))*zoom+cameraX*.3;
   const wantedZ=(targetCam.z*Math.cos(orbitYaw)-targetCam.x*Math.sin(orbitYaw))*zoom;
   camera.position.x+=(wantedX-camera.position.x)*Math.min(1,dt*2.6);
   camera.position.y+=(targetCam.y*zoom+orbitPitch*7-cameraY*.2-camera.position.y)*Math.min(1,dt*2.6);
   camera.position.z+=(wantedZ-camera.position.z)*Math.min(1,dt*2.6);
   camera.lookAt(lookAt);
   particles.rotation.y+=dt*.004;
   if(composer)composer.render();else renderer?.render(scene,camera);
  };
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
   loadCharacters(key);
   orbitYaw=0;orbitPitch=0;zoom=1;
   neonLeft.color.setHex(p.accent);
   neonRight.color.setHex(p.secondary);
   // Travelling suave entre instalaciones (GSAP gratuito). No afecta YOLO.
   const viewpoints:Record<WorldKey,readonly[number,number,number]>={
    safety:[10.8,8.6,16.8],
    quality:[9.1,7.5,15.8],
    warehouse:[11.4,9.1,18.0],
    retail:[9.4,8.4,16.8]
   };
   const [x,y,z]=viewpoints[key];
   gsap.killTweensOf(targetCam);
   if(playing&&!prefer.matches){
    gsap.to(targetCam,{x,y,z,duration:1.25,ease:'power2.inOut'});
   }else{
    targetCam.set(x,y,z);
   }
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
   renderer.toneMappingExposure=1.15;
   renderer.shadowMap.enabled=true;
   renderer.shadowMap.type=THREE.PCFSoftShadowMap;
   try{
    // Light probes procedimentales para que los metales no parezcan plástico.
    const pmrem=new THREE.PMREMGenerator(renderer);
    room=new RoomEnvironment(renderer);
    environment=pmrem.fromScene(room,.035);
    scene.environment=environment.texture;
    scene.environmentIntensity=.53;
    pmrem.dispose();
   }catch{/* Fallback PBR con luces y sombras sin environment map. */}
   renderer.outputColorSpace=THREE.SRGBColorSpace;
   // Bloom de Three.js; el renderer sigue siendo único. Fallback sin bloom.
   if(window.innerWidth>700){
    try{
     composer=new EffectComposer(renderer);
     composer.addPass(new RenderPass(scene,camera));
     composer.addPass(new UnrealBloomPass(new THREE.Vector2(1,1),.30,.28,1.15));
     composer.addPass(new OutputPass());
    }catch{composer?.dispose();composer=null;}
   }
   host.addEventListener('pointermove',move,{passive:true});
   host.addEventListener('pointerdown',down);
   host.addEventListener('pointerup',up);
   host.addEventListener('pointercancel',up);
   host.addEventListener('wheel',wheel,{passive:false});
   prefer.addEventListener('change',motion);
   resize.observe(host);intersect.observe(host);
   size();loadCharacters(activeKey);onReady?.(true);
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
   host.removeEventListener('pointerdown',down);
   host.removeEventListener('pointerup',up);
   host.removeEventListener('pointercancel',up);
   host.removeEventListener('wheel',wheel);
   prefer.removeEventListener('change',motion);
   resize.disconnect();intersect.disconnect();
   composer?.dispose();
   scene.environment=null;
   gsap.killTweensOf(targetCam);
   environment?.dispose();room?.dispose();
   renderer?.dispose();
   for(const rig of actorRigs)rig.mixer?.stopAllAction();
   for(const geo of geometries)geo.dispose();
   for(const mat of materials)mat.dispose();
   for(const geo of loadedGeometries)geo.dispose();
   for(const mat of loadedMaterials){
    for(const field of ['map','normalMap','roughnessMap','metalnessMap','emissiveMap']){
     mat[field]?.dispose?.();
    }
    mat.dispose();
   }
  };
 },[]);
 return <div className="studio-world-stage" ref={stageRef}>
  <canvas ref={canvasRef} className="studio-world-canvas" aria-hidden="true"/>
  <div className="studio-world-fallback" aria-hidden="true"/>
  <span className="studio-world-legend" aria-hidden="true">ENTORNO VIRTUAL · MOVER PARA ORBITAR · RUEDA PARA ACERCAR</span>
 </div>;
}
