import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { PointerEvent as RP, KeyboardEvent as RK } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { IndustrialSceneHandle, LayerName } from './IndustrialScene3D';
import type { SimSnapshot } from './simulation-engine';
import { entityFootprint, presets, boundedOrbit, zoneFootprint } from './scene-math';
import type { CameraView, Orbit } from './scene-math';
import { makeScene } from './industrial-renderer';
import { humanAssetFor, motionClipName, humanoidScale } from './human-assets';

/** Three.js y GLB humanos CC0; las posiciones/eventos son sintéticos y no proceden de YOLO. */
interface Props {
 readonly snapshot: SimSnapshot; readonly elapsed: number; readonly paused: boolean;
 readonly threshold: number; readonly layers: Readonly<Record<LayerName, boolean>>;
 readonly showScore: boolean; readonly view: CameraView; readonly onFps: (fps:number)=>void;
}
type Asset = { scene:any; animations:any[] };
type Actor = { root:any; visual:any; mixer:any|null; actions:Record<string,any>;
 clip:string|null; prior:number; loaded:boolean };
const cache=new Map<string,Promise<Asset>>();
function getAsset(url:string):Promise<Asset>{
 const old=cache.get(url);if(old)return old;
 const promise=new Promise<Asset>((resolve,reject)=>{
  new GLTFLoader().load(url,(glb:any)=>resolve({scene:glb.scene,animations:glb.animations??[]}),
   undefined,(error:unknown)=>reject(error));
 });
 cache.set(url,promise);promise.catch(()=>cache.delete(url));
 return promise;
}
function mat(hex:number,roughness=.68,metalness=.07){
 return new THREE.MeshStandardMaterial({color:hex,roughness,metalness});
}
const fabric=mat(0x278e9c,.92),pants=mat(0x344f5e,.9),skin=mat(0xd6a788,.94);
const yellow=mat(0xf4bb46,.5),safety=mat(0xcfe7dd,.6);
function mesh(parent:any,geometry:any,material:any,x=0,y=0,z=0):any{
 const object=new THREE.Mesh(geometry,material);object.position.set(x,y,z);
 object.castShadow=true;object.receiveShadow=true;parent.add(object);return object;
}
function fallbackHuman(){
 const root=new THREE.Group();root.name='Figura humana articulada de respaldo';
 const torso=new THREE.Group();torso.position.y=1.23;root.add(torso);
 mesh(torso,new THREE.SphereGeometry(1,18,12),fabric,0,0,0).scale.set(.37,.45,.24);
 mesh(torso,new THREE.SphereGeometry(1,18,12),skin,0,.73,0).scale.set(.29,.35,.29);
 mesh(torso,new THREE.SphereGeometry(1,18,10),pants,0,-.37,0).scale.set(.30,.23,.24);
 mesh(torso,new THREE.SphereGeometry(1,16,9),mat(0x273642,.95),0,.93,-.10).scale.set(.28,.14,.28);
 for(const side of [-1,1]){
  mesh(torso,new THREE.SphereGeometry(1,12,8),mat(0x24343b,.92),side*.12,.76,.276).scale.set(.028,.039,.027);
 }
 const limbs:Record<string,any>={};
 for(const side of [-1,1]){
  const arm=new THREE.Group();arm.position.set(side*.43,.27,0);torso.add(arm);
  mesh(arm,new THREE.SphereGeometry(1,14,8),fabric,0,-.30,0).scale.set(.135,.34,.13);
  mesh(arm,new THREE.SphereGeometry(1,12,8),skin,0,-.67,0).scale.set(.11,.12,.12);
  limbs[side<0?'leftArm':'rightArm']=arm;
  const leg=new THREE.Group();leg.position.set(side*.17,.80,0);root.add(leg);
  mesh(leg,new THREE.SphereGeometry(1,14,8),pants,0,-.39,0).scale.set(.18,.42,.17);
  mesh(leg,new THREE.SphereGeometry(1,12,8),mat(0x1c292f),0,-.76,.10).scale.set(.18,.13,.27);
  limbs[side<0?'leftLeg':'rightLeg']=leg;
 }
 root.userData.limbs=limbs;
 return root;
}
function protectWorker(root:any,helmet:boolean){
 const vest=mesh(root,new THREE.CylinderGeometry(.37,.32,.73,12,1,true,0,Math.PI*2),
  new THREE.MeshStandardMaterial({color:0xf3a33a,side:THREE.DoubleSide,transparent:true,opacity:.68}),0,1.21,0);
 vest.name='Chaleco reflectante sintético';
 for(const side of [-1,1]){
  mesh(root,new THREE.BoxGeometry(.075,.65,.04),safety,side*.29,1.16,.32);
 }
 if(helmet){
  mesh(root,new THREE.SphereGeometry(1,18,10),yellow,0,2.04,0).scale.set(.36,.20,.34);
  mesh(root,new THREE.BoxGeometry(.72,.06,.28),yellow,0,1.99,.20);
 }
}
function readyHuman(actor:Actor,asset:Asset,scenario:string,id:string){
 const cloned=cloneSkeleton(asset.scene);
 // Los clips GLB pueden animar la escala/posición del rig. La escala física
 // permanece en un grupo padre NO animado: evita cuerpos diminutos bajo cascos.
 cloned.updateMatrixWorld(true);
 const rawBounds=new THREE.Box3().setFromObject(cloned,true);
 const originalHeight=rawBounds.max.y-rawBounds.min.y;
 const rig=new THREE.Group();rig.name='Escala normalizada fuera del esqueleto';
 rig.add(cloned);
 rig.scale.setScalar(humanoidScale(originalHeight));
 rig.updateMatrixWorld(true);
 const normalizedBounds=new THREE.Box3().setFromObject(rig,true);
 rig.position.y=-normalizedBounds.min.y;
 const model=new THREE.Group();model.name='GLB humano / CC0';
 model.add(rig);
 model.traverse((item:any)=>{
  if(item.isMesh){item.castShadow=true;item.receiveShadow=true;
   item.userData.externalModel=true;
  }
 });
 if(scenario==='safety')protectWorker(model,id!=='w2');
 actor.root.remove(actor.visual);
 actor.visual=model;actor.root.add(model);
 actor.loaded=true;
 if(asset.animations.length){
  actor.mixer=new THREE.AnimationMixer(cloned);
  for(const animation of asset.animations)actor.actions[animation.name]=actor.mixer.clipAction(animation);
 }
}
function makeCamera(orbit:Orbit,width:number,height:number){
 const o=boundedOrbit(orbit);
 const c=new THREE.PerspectiveCamera(56,width/Math.max(1,height),.1,150);
 const center=new THREE.Vector3(0,1.03,0);
 c.position.set(Math.sin(o.yaw)*Math.cos(o.pitch)*o.distance,
  center.y+Math.sin(o.pitch)*o.distance,Math.cos(o.yaw)*Math.cos(o.pitch)*o.distance);
 c.lookAt(center);c.updateMatrixWorld();return c;
}
/** Convierte las posiciones/normales/colores de la instalación existente en una malla PBR. */
function sceneGeometry(data:Float32Array,offset=0){
 const buffer=data.subarray(offset);
 const stride=new THREE.InterleavedBuffer(buffer,9);
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.InterleavedBufferAttribute(stride,3,0));
 geometry.setAttribute('normal',new THREE.InterleavedBufferAttribute(stride,3,3));
 geometry.setAttribute('color',new THREE.InterleavedBufferAttribute(stride,3,6));
 return geometry;
}
function stageMesh(snapshot:SimSnapshot,seconds:number,showZones:boolean,skip:number,material:any){
 const geometries=makeScene({
  ...snapshot,
  entities:snapshot.entities.filter(e=>e.kind!=='person'&&e.kind!=='helmet'&&e.kind!=='vest')
 },seconds,showZones).output();
 // Reutiliza un material de GPU compartido para todos los fotogramas.
 const mesh=new THREE.Mesh(sceneGeometry(geometries,skip),material);
 mesh.castShadow=true;mesh.receiveShadow=true;return mesh;
}
function drawAnnotations(canvas:HTMLCanvasElement,camera:any,snapshot:SimSnapshot,
  show:Readonly<Record<LayerName,boolean>>,threshold:number,scores:boolean){
 const ctx=canvas.getContext('2d');if(!ctx)return;
 ctx.clearRect(0,0,canvas.width,canvas.height);
 ctx.save();
 ctx.scale(canvas.width/960,canvas.width/960);
 const W=960,H=canvas.height*960/canvas.width;
 for(const e of snapshot.entities){
  if(!show.boxes||e.score<threshold||e.kind==='helmet'||e.kind==='vest')continue;
  const foot=entityFootprint(e);
  const height=e.kind==='person'?2.16:e.kind==='forklift'?2.05:1;
  const p=new THREE.Vector3(foot[0],height/2,foot[2]).project(camera);
  if(p.z<-1||p.z>1)continue;
  const x=(p.x*.5+.5)*W,y=(-p.y*.5+.5)*H;
  const distance=camera.position.distanceTo(new THREE.Vector3(foot[0],0,foot[2]));
  const factor=Math.min(1.65,Math.max(.5,18/distance));
  const width=(e.kind==='forklift'?66:e.kind==='person'?38:40)*factor;
  const boxHeight=(e.kind==='person'?140:e.kind==='forklift'?110:48)*factor;
  const xx=x-width/2, yy=y-boxHeight/2;
  if(xx>W||yy>H||xx+width<0||yy+boxHeight<0)continue;
  const tint=e.kind==='defect'?'#ff9b86':e.kind==='forklift'?'#f6ca77':'#66f3cd';
  if(show.masks){ctx.globalAlpha=.14;ctx.fillStyle=tint;ctx.fillRect(xx,yy,width,boxHeight);ctx.globalAlpha=1;}
  ctx.strokeStyle=tint;ctx.lineWidth=1.7;ctx.strokeRect(xx,yy,width,boxHeight);
  if(show.labels){
   const label=e.label.toUpperCase()+(scores?' · '+Math.round(e.score*100)+'%*':'');
   ctx.font='700 10px ui-monospace,Consolas,monospace';
   const tx=Math.max(3,Math.min(W-ctx.measureText(label).width-18,xx));
   const ty=Math.max(25,yy-23);
   ctx.fillStyle='#0b2b3cec';ctx.fillRect(tx,ty,ctx.measureText(label).width+17,20);
   ctx.fillStyle=tint;ctx.fillRect(tx,ty,3,20);
   ctx.fillStyle='#ebfff8';ctx.fillText(label,tx+9,ty+14);
  }
 }
 if(show.zones){
  for(const z of snapshot.zones){
   const pos=zoneFootprint(z).center;
   const p=new THREE.Vector3(pos[0],.12,pos[2]).project(camera);
   if(p.z<-1||p.z>1)continue;
   const x=(p.x*.5+.5)*W,y=(-p.y*.5+.5)*H;
   const label=z.label+' · SIMULADO';ctx.font='700 11px ui-monospace,Consolas,monospace';
   const measure=ctx.measureText(label).width;
   const left=Math.max(5,Math.min(W-measure-18,x-measure/2)),top=Math.max(45,Math.min(H-24,y));
   ctx.fillStyle=snapshot.alert?'#7c3d36df':'#164c4adf';
   ctx.fillRect(left-6,top-12,measure+12,24);
   ctx.fillStyle='#dcfff2';ctx.fillText(label,left,top+4);
  }
 }
 ctx.restore();
}
export const HumanizedScene3D=forwardRef<IndustrialSceneHandle,Props>(function HumanizedScene3D(props,ref){
 const canvas=useRef<HTMLCanvasElement>(null);
 const overlay=useRef<HTMLCanvasElement>(null);
 const state=useRef(props);state.current=props;
 const orbit=useRef<Orbit>({...presets[props.view]});
 const pointer=useRef<{x:number;y:number}|null>(null);
 const [error,setError]=useState('');
 const [assets,setAssets]=useState({loaded:0,total:0,failed:0});
 useEffect(()=>{orbit.current={...presets[props.view]};},[props.view]);
 useImperativeHandle(ref,()=>({
  rawCanvas(){return canvas.current;},
  resetCamera(){orbit.current={...presets[state.current.view]};},
  zoom(delta){orbit.current=boundedOrbit({...orbit.current,distance:orbit.current.distance+delta});},
  async capture(){
   if(!canvas.current||!overlay.current||error)throw Error('El visor 3D no está disponible.');
   const copy=document.createElement('canvas');
   copy.width=canvas.current.width;copy.height=canvas.current.height;
   const ctx=copy.getContext('2d');if(!ctx)throw Error('Captura no disponible.');
   ctx.drawImage(canvas.current,0,0);ctx.drawImage(overlay.current,0,0);
   return await new Promise<Blob>((resolve,reject)=>copy.toBlob(
    blob=>blob?resolve(blob):reject(Error('No se pudo generar PNG.')),'image/png'));
  }
 }),[error]);
 useEffect(()=>{
  const element=canvas.current,layers=overlay.current;if(!element||!layers)return;
  let renderer:any;
  try{renderer=new THREE.WebGLRenderer({canvas:element,antialias:true,preserveDrawingBuffer:true,alpha:false});}
  catch{setError('No hay WebGL compatible. Usa Chrome o Edge con aceleración gráfica.');return;}
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.14;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  const stage=new THREE.Scene();
  stage.background=new THREE.Color(0x1b3847);
  stage.fog=new THREE.FogExp2(0x243c48,.012);
  stage.add(new THREE.HemisphereLight(0xf5fffa,0x526c7a,1.9));
  const sun=new THREE.DirectionalLight(0xfff1dd,2.4);
  sun.position.set(-7,13,8);sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);
  sun.shadow.camera.left=-14;sun.shadow.camera.right=14;
  sun.shadow.camera.top=14;sun.shadow.camera.bottom=-14;
  sun.shadow.normalBias=.024;
  stage.add(sun);
  const fill=new THREE.DirectionalLight(0xb1e5ff,.9);
  fill.position.set(8,7,-6);stage.add(fill);
  const snap=state.current.snapshot;
  const empty={...snap,entities:[],zones:[]} as SimSnapshot;
  const base=makeScene(empty,0,false).output();
  const staticMesh=new THREE.Mesh(sceneGeometry(base),
   new THREE.MeshStandardMaterial({vertexColors:true,roughness:.76,metalness:.15,side:THREE.DoubleSide}));
  staticMesh.castShadow=true;staticMesh.receiveShadow=true;stage.add(staticMesh);
  const activeScene=new THREE.Group();stage.add(activeScene);
  const movingMaterial=new THREE.MeshStandardMaterial({
   vertexColors:true,metalness:.13,roughness:.72,side:THREE.DoubleSide
  });
  const players=new Map<string,Actor>();
  let alive=true,raf=0,previous=0,meter=performance.now(),count=0;
  let loaded=0,failed=0;
  const humans=snap.entities.filter(e=>e.kind==='person');
  setAssets({loaded:0,total:humans.length,failed:0});
  for(const e of humans){
   const root=new THREE.Group();root.name=e.id;stage.add(root);
   const fallback=fallbackHuman();root.add(fallback);
   if(snap.scenarioId==='safety')protectWorker(fallback,e.id!=='w2');
   const actor:Actor={root,visual:fallback,mixer:null,actions:{},clip:null,prior:state.current.elapsed,loaded:false};
   players.set(e.id,actor);
   const url=humanAssetFor(snap.scenarioId,e.id);
   if(!url){failed++;continue;}
   void getAsset(url).then(asset=>{
    if(!alive)return;
    readyHuman(actor,asset,snap.scenarioId,e.id);
    loaded++;setAssets({loaded,total:humans.length,failed});
   }).catch(()=>{if(!alive)return;failed++;setAssets({loaded,total:humans.length,failed});});
  }
  const resize=()=>{
   const rect=element.getBoundingClientRect();
   const dpr=Math.min(1.5,window.devicePixelRatio||1);
   const w=Math.max(2,Math.round(rect.width*dpr)),h=Math.max(2,Math.round(rect.height*dpr));
   if(element.width!==w||element.height!==h){
    renderer.setSize(w,h,false);layers.width=w;layers.height=h;
   }
  };
  const observer=new ResizeObserver(resize);observer.observe(element);resize();
  let movingMesh:any=null;
  let lastMovingSnapshot:SimSnapshot|null=null;
  let lastMovingElapsed=Number.NaN;
  let lastMovingZones:boolean|null=null;
  let lastResizeCheck=0;
  const render=(now:number)=>{
   if(!alive)return;
   raf=requestAnimationFrame(render);
   if(document.hidden||now-previous<33)return;
   previous=now;
   // ResizeObserver cubre los cambios normales; fallback para DPR de otra pantalla.
   if(now-lastResizeCheck>=1000){resize();lastResizeCheck=now;}
   const current=state.current;
   // Cámara sigue viva; nuevas mallas solo cuando el estado realmente cambia.
   // En pausa no se recrea geometría ni material.
   if(!movingMesh||current.snapshot!==lastMovingSnapshot||
      current.elapsed!==lastMovingElapsed||current.layers.zones!==lastMovingZones){
    if(movingMesh){activeScene.remove(movingMesh);movingMesh.geometry.dispose();}
    movingMesh=stageMesh(current.snapshot,current.elapsed,current.layers.zones,
     base.length,movingMaterial);
    activeScene.add(movingMesh);
    lastMovingSnapshot=current.snapshot;
    lastMovingElapsed=current.elapsed;
    lastMovingZones=current.layers.zones;
   }
   for(const e of current.snapshot.entities){
    if(e.kind!=='person')continue;
    const actor=players.get(e.id);if(!actor)continue;
    const foot=entityFootprint(e);
    actor.root.position.set(foot[0],0,foot[2]);
    actor.root.rotation.y=e.heading??0;
    if(actor.loaded&&actor.mixer){
     const next=motionClipName(e.state,Object.keys(actor.actions));
     if(next&&next!==actor.clip){
      if(actor.clip)actor.actions[actor.clip]?.fadeOut(.16);
      actor.actions[next].reset().fadeIn(.16).play();actor.clip=next;
     }
     const delta=current.elapsed-actor.prior;
     if(delta<0||delta>.6)actor.mixer.setTime(current.elapsed%60);
     else actor.mixer.update(Math.max(0,delta));
     actor.prior=current.elapsed;
    }else{
     const limbs=actor.visual.userData.limbs;
     if(limbs){
      const wave=(e.state==='walking'?1:0)*Math.sin(e.motionPhase??current.elapsed*4)*.48;
      limbs.leftArm.rotation.x=wave;limbs.rightArm.rotation.x=-wave;
      limbs.leftLeg.rotation.x=-wave;limbs.rightLeg.rotation.x=wave;
     }
    }
   }
   const camera=makeCamera(orbit.current,element.width,element.height);
   if(current.view==='persona'){
    const subject=current.snapshot.entities.find(e=>e.kind==='person');
    if(subject){
     const [x,,z]=entityFootprint(subject);
     const o=boundedOrbit(orbit.current);
     const target=new THREE.Vector3(x,1.12,z);
     camera.position.set(x+Math.sin(o.yaw)*Math.cos(o.pitch)*o.distance,
       1.12+Math.sin(o.pitch)*o.distance,
       z+Math.cos(o.yaw)*Math.cos(o.pitch)*o.distance);
     camera.lookAt(target);
     camera.updateMatrixWorld();
    }
   }
   renderer.render(stage,camera);
   drawAnnotations(layers,camera,current.snapshot,current.layers,current.threshold,current.showScore);
   count++;
   if(now-meter>1000){
    current.onFps(Math.round(count*1000/(now-meter)));
    count=0;meter=now;
   }
  };
  raf=requestAnimationFrame(render);
  const wheel=(ev:WheelEvent)=>{
   ev.preventDefault();
   orbit.current=boundedOrbit({...orbit.current,distance:orbit.current.distance+Math.sign(ev.deltaY)*1.2});
  };
  element.addEventListener('wheel',wheel,{passive:false});
  return ()=>{
   alive=false;cancelAnimationFrame(raf);observer.disconnect();
   element.removeEventListener('wheel',wheel);
   players.forEach(actor=>actor.mixer?.stopAllAction());
   if(movingMesh)movingMesh.geometry.dispose();
   movingMaterial.dispose();
   staticMesh.geometry.dispose();staticMesh.material.dispose();
   // The loaded GLB templates remain cached so changing scenarios doesn't re-download models.
   renderer.dispose();
  };
 },[props.snapshot.scenarioId]);
 function down(event:RP<HTMLCanvasElement>){
  if(event.button!==0)return;
  pointer.current={x:event.clientX,y:event.clientY};
  event.currentTarget.setPointerCapture(event.pointerId);
 }
 function move(event:RP<HTMLCanvasElement>){
  if(!pointer.current)return;
  const dx=event.clientX-pointer.current.x,dy=event.clientY-pointer.current.y;
  orbit.current=boundedOrbit({...orbit.current,yaw:orbit.current.yaw+dx*.008,
   pitch:orbit.current.pitch+dy*.006});
  pointer.current={x:event.clientX,y:event.clientY};
 }
 function up(event:RP<HTMLCanvasElement>){
  pointer.current=null;
  if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);
 }
 function keyboard(event:RK<HTMLCanvasElement>){
  if(event.key.toLowerCase()==='r'){
   orbit.current={...presets[state.current.view]};event.preventDefault();return;
  }
  const delta:Record<string,[number,number,number]>={
   ArrowLeft:[-.13,0,0],ArrowRight:[.13,0,0],ArrowUp:[0,-.11,0],ArrowDown:[0,.11,0],
   '+':[0,0,-1],'-':[0,0,1]
  };
  const move=delta[event.key];if(!move)return;
  event.preventDefault();orbit.current=boundedOrbit({yaw:orbit.current.yaw+move[0],
   pitch:orbit.current.pitch+move[1],distance:orbit.current.distance+move[2]});
 }
 const label=assets.failed
  ?'Modelos externos no disponibles: se muestran humanos articulados alternativos'
  :assets.loaded===assets.total&&assets.total>0?'Personajes GLB cargados y animados':
    'Cargando personajes humanos '+assets.loaded+'/'+assets.total;
 return <div className="simulator-3d-stage simulator-human-stage" aria-label="Simulador tridimensional con humanos animados">
   <canvas ref={canvas} tabIndex={0} role="img"
    aria-label="Escena industrial 3D con personajes animados. Flechas para girar, más y menos para zoom, R para restablecer; también puedes arrastrar o usar la rueda."
    onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={keyboard}/>
   <canvas ref={overlay} className="simulator-3d-hud" aria-hidden="true"/>
   <div className="simulator-3d-top" aria-hidden="true"><span className="simulator-3d-live">● HUMANOS 3D ANIMADOS</span>
     <span>MODELOS CC0 / {props.view.toUpperCase()}</span></div>
   <span className="simulator-human-status" role="status">{label}</span>
   <div className="simulator-3d-bottom" aria-hidden="true">
     <span>SIMULACIÓN SINTÉTICA · NO YOLO</span><span>ARASTRAR O FLECHAS PARA GIRAR · + / − ZOOM · R RESTABLECER</span>
   </div>
   {error&&<div className="simulator-3d-error" role="alert"><strong>El motor 3D no está disponible</strong><p>{error}</p></div>}
 </div>;
});
