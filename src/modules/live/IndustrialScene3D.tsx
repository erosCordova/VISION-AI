import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import type { SimEntity, SimSnapshot } from './simulation-engine';
import { createCamera, entityFootprint, presets, project, zoneFootprint } from './scene-math';
import type { Camera, CameraView, Orbit, Projection, Vec3 } from './scene-math';
import { boundedOrbit } from './scene-math';
import { IndustrialRenderer, makeScene } from './industrial-renderer';

export type LayerName = 'boxes' | 'labels' | 'masks' | 'zones';
export interface IndustrialSceneHandle {
 /** Lienzo GPU sin rótulos sintéticos: fuente de pixeles para la inferencia YOLO. */
 rawCanvas():HTMLCanvasElement|null;
 capture():Promise<Blob>;
 resetCamera():void;
 zoom(delta:number):void;
}
interface Props {
 readonly snapshot:SimSnapshot;
 readonly elapsed:number;
 readonly paused:boolean;
 readonly threshold:number;
 readonly layers:Readonly<Record<LayerName,boolean>>;
 readonly showScore:boolean;
 readonly view:CameraView;
 readonly onFps:(fps:number)=>void;
}
interface DrawOptions {
 snapshot:SimSnapshot;
 threshold:number;
 showScore:boolean;
 layers:Readonly<Record<LayerName,boolean>>;
 elapsed:number;
 paused:boolean;
}
const colorFor=(o:SimEntity)=>({
 mint:'#6af3cf',amber:'#ffc56d',coral:'#ff9381',blue:'#7db8ff'
})[o.tone];

const names:Record<SimEntity['kind'],string>={
 person:'PERSONA',helmet:'CASCO',vest:'CHALECO',forklift:'MONTACARGAS',
 pallet:'PALLET',product:'PRODUCTO',defect:'DEFECTO',shelf:'ESTANTE',box:'CAJA'
};

function anchoredEntity(o:SimEntity,all:readonly SimEntity[]):{center:Vec3;dimensions:Vec3}{
 const base=entityFootprint(o);
 if(o.kind==='helmet'||o.kind==='vest'){
  const index=o.id.slice(1);
  const worker=all.find(item=>item.id==='w'+index);
  const foot=worker?entityFootprint(worker):base;
  return {center:[foot[0],o.kind==='helmet'?2.04:1.17,foot[2]],
    dimensions:o.kind==='helmet'?[.76,.36,.75]:[.80,.95,.46]};
 }
 if(o.kind==='defect'){
  const product=all.find(item=>item.id==='q1');
  const foot=product?entityFootprint(product):base;
  return {center:[foot[0]+.12,1.48,foot[2]+.05],dimensions:[.30,.17,.27]};
 }
 switch(o.kind){
  case 'person':return {center:[base[0],1.05,base[2]],dimensions:[.93,2.25,.73]};
  case 'forklift':return {center:[base[0]+.48,1.0,base[2]],dimensions:[3.5,2.1,1.6]};
  case 'pallet':return {center:[base[0],.49,base[2]],dimensions:[1.5,1.0,1.35]};
  case 'box':return {center:[base[0],.53,base[2]],dimensions:[1.18,1.09,.94]};
  case 'product':return {center:[base[0],1.20,base[2]],dimensions:[1.08,.58,.86]};
  default:return {center:[base[0],.6,base[2]],dimensions:[1,1,1]};
 }
}
function boundsFromProjection(center:Vec3,dimensions:Vec3,camera:Camera,width:number,height:number):
 {x:number;y:number;width:number;height:number;depth:number}|null{
 const points:Projection[]=[];
 for(const sx of [-1,1])for(const sy of [-1,1])for(const sz of [-1,1]){
  const p:Vec3=[center[0]+sx*dimensions[0]/2,center[1]+sy*dimensions[1]/2,
   center[2]+sz*dimensions[2]/2];
  const s=project(p,camera,width,height);
  if(s)points.push(s);
 }
 if(points.length!==8)return null;
 const left=Math.min(...points.map(p=>p.x)),right=Math.max(...points.map(p=>p.x));
 const top=Math.min(...points.map(p=>p.y)),bottom=Math.max(...points.map(p=>p.y));
 return {x:left,y:top,width:right-left,height:bottom-top,
 depth:Math.min(...points.map(p=>p.depth))};
}
function cornerBox(ctx:CanvasRenderingContext2D,x:number,y:number,width:number,height:number,color:string){
 const edge=Math.min(15,width*.3,height*.3);
 ctx.strokeStyle=color;ctx.lineWidth=2.3;ctx.lineCap='square';
 ctx.beginPath();
 ctx.moveTo(x+edge,y);ctx.lineTo(x,y);ctx.lineTo(x,y+edge);
 ctx.moveTo(x+width-edge,y);ctx.lineTo(x+width,y);ctx.lineTo(x+width,y+edge);
 ctx.moveTo(x+edge,y+height);ctx.lineTo(x,y+height);ctx.lineTo(x,y+height-edge);
 ctx.moveTo(x+width-edge,y+height);ctx.lineTo(x+width,y+height);ctx.lineTo(x+width,y+height-edge);
 ctx.stroke();
 ctx.lineWidth=.8;ctx.globalAlpha=.33;ctx.strokeRect(x,y,width,height);
 ctx.globalAlpha=1;
}
function drawHud(canvas:HTMLCanvasElement,camera:Camera,options:DrawOptions){
 const ctx=canvas.getContext('2d');
 if(!ctx)return;
 const width=canvas.width,height=canvas.height;
 ctx.clearRect(0,0,width,height);
 const scale=width/960;
 ctx.save();
 ctx.scale(scale,scale);
 const w=960,h=height/scale;
 const {snapshot,layers,threshold,showScore}=options;
 ctx.font='600 10px ui-monospace,Consolas,monospace';
 ctx.textBaseline='middle';
 // HUD surface corners.
 ctx.strokeStyle='rgba(110,237,205,.55)';ctx.lineWidth=1.5;
 ctx.beginPath();
 ctx.moveTo(24,45);ctx.lineTo(24,24);ctx.lineTo(45,24);
 ctx.moveTo(w-45,24);ctx.lineTo(w-24,24);ctx.lineTo(w-24,45);
 ctx.moveTo(24,h-45);ctx.lineTo(24,h-24);ctx.lineTo(45,h-24);
 ctx.moveTo(w-45,h-24);ctx.lineTo(w-24,h-24);ctx.lineTo(w-24,h-45);
 ctx.stroke();
 if(layers.zones){
  snapshot.zones.forEach(z=>{
   const bounds=zoneFootprint(z);
   const at=project([bounds.center[0],.25,bounds.center[2]],camera,w,h);
   if(!at)return;
   const title=z.label+' / ZONA SINTÉTICA';
   ctx.font='700 11px ui-monospace,Consolas,monospace';
   const textWidth=ctx.measureText(title).width;
   const x=Math.min(Math.max(5,at.x-textWidth/2),w-textWidth-18);
   const y=Math.max(60,Math.min(h-44,at.y));
   ctx.fillStyle=snapshot.alert?'rgba(132,54,47,.93)':'rgba(24,75,72,.92)';
   ctx.fillRect(x-7,y-11,textWidth+14,23);
   ctx.fillStyle=snapshot.alert?'#ffd6c5':'#abffe3';ctx.fillText(title,x,y+.5);
  });
 }
 if(layers.boxes){
  const annotations=snapshot.entities.filter(o=>o.score>=threshold).map(o=>{
   const geometry=anchoredEntity(o,snapshot.entities);
   const b=boundsFromProjection(geometry.center,geometry.dimensions,camera,w,h);
   return b?{...b,entity:o}:null;
  }).filter((entry):entry is NonNullable<typeof entry>=>!!entry);
  annotations.sort((a,b)=>b.depth-a.depth);
  annotations.forEach(({entity,x,y,width,height})=>{
   if(width<3||height<4||x>w||y>h||x+width<0||y+height<0)return;
   const color=colorFor(entity);
   if(layers.masks){
    ctx.fillStyle=color;
    ctx.globalAlpha=.10;
    ctx.fillRect(x,y,width,height);
    ctx.globalAlpha=1;
   }
   cornerBox(ctx,x,y,width,height,color);
   if(layers.labels){
    const label=names[entity.kind]+(showScore?'  '+Math.round(entity.score*100)+'%*':'');
    ctx.font='700 11px ui-monospace,Consolas,monospace';
    const textWidth=ctx.measureText(label).width;
    const px=Math.max(3,Math.min(w-textWidth-19,x));
    const py=y>49?y-25:Math.min(h-30,y+height+4);
    ctx.fillStyle='rgba(9,25,34,.92)';
    ctx.fillRect(px,py,textWidth+15,21);
    ctx.fillStyle=color;
    ctx.fillRect(px,py,3,21);
    ctx.fillStyle='#effff8';ctx.fillText(label,px+9,py+10.5);
   }
  });
 }
 ctx.restore();
}
/** Canvas WebGL2 + HUD 2D. Orbit, teclado y captura sin bibliotecas ni servicios de pago. */
export const IndustrialScene3D=forwardRef<IndustrialSceneHandle,Props>(function IndustrialScene3D(props,ref){
 const gpu=useRef<HTMLCanvasElement>(null);
 const overlay=useRef<HTMLCanvasElement>(null);
 const cameraOrbit=useRef<Orbit>({...presets[props.view]});
 const propsRef=useRef(props);
 propsRef.current=props;
 const [error,setError]=useState<string|null>(null);
 const [dragging,setDragging]=useState(false);
 const drag=useRef<{x:number;y:number}|null>(null);
 const dirty=useRef(true);
 useEffect(()=>{cameraOrbit.current={...presets[props.view]};dirty.current=true;},[props.view]);
 useImperativeHandle(ref,()=>({
  rawCanvas(){return gpu.current;},
  resetCamera(){cameraOrbit.current={...presets[propsRef.current.view]};dirty.current=true;},
  zoom(delta){cameraOrbit.current=boundedOrbit({...cameraOrbit.current,distance:cameraOrbit.current.distance+delta});dirty.current=true;},
  async capture(){
   const canvas=gpu.current,labels=overlay.current;
   if(!canvas||!labels||error)throw new Error('La escena 3D no está disponible');
   const mixed=document.createElement('canvas');
   mixed.width=canvas.width;mixed.height=canvas.height;
   const context=mixed.getContext('2d');
   if(!context)throw new Error('La captura no está disponible en este navegador.');
   context.drawImage(canvas,0,0);context.drawImage(labels,0,0);
   return await new Promise<Blob>((resolve,reject)=>mixed.toBlob(b=>b?resolve(b):reject(new Error('Error al crear PNG.')),'image/png'));
  }
 }),[error]);
 useEffect(()=>{
  const canvas=gpu.current,labels=overlay.current;
  if(!canvas||!labels)return;
  const gl=canvas.getContext('webgl2',{alpha:false,antialias:true,preserveDrawingBuffer:true,powerPreference:'default'});
  if(!gl){setError('Este dispositivo no admite WebGL2. Prueba con Chrome, Edge o Firefox con aceleración gráfica.');return;}
  let renderer:IndustrialRenderer;
  try{renderer=new IndustrialRenderer(gl);}catch(e){
   setError(e instanceof Error?e.message:'No se pudo iniciar el renderizador 3D.');
   return;
  }
  let alive=true,last=0,frameCount=0,previousMetrics=performance.now(),raf=0;
  const resize=()=>{
   const rect=canvas.getBoundingClientRect();
   const dpr=Math.min(1.65,window.devicePixelRatio||1);
   const width=Math.max(2,Math.round(rect.width*dpr)),height=Math.max(2,Math.round(rect.height*dpr));
   if(canvas.width!==width||canvas.height!==height){
    canvas.width=width;canvas.height=height;labels.width=width;labels.height=height;dirty.current=true;
   }
  };
  const observer=new ResizeObserver(resize);
  observer.observe(canvas);
  resize();
  const paint=(now:number)=>{
   if(!alive)return;
   raf=requestAnimationFrame(paint);
   if(document.hidden||now-last<33)return;
   if(propsRef.current.paused&&!dirty.current&&now-last<150)return;
   last=now;dirty.current=false;
   resize();
   const state=propsRef.current;
   const camera=createCamera(cameraOrbit.current);
   try{
    const scene=makeScene(state.snapshot,state.elapsed,state.layers.zones);
    renderer.render(scene,camera,canvas.width,canvas.height);
    drawHud(labels,camera,state);
   }catch(e){
    setError(e instanceof Error?e.message:'Error inesperado en WebGL.');alive=false;return;
   }
   frameCount++;
   if(now-previousMetrics>1000){
    state.onFps(Math.round(frameCount*1000/(now-previousMetrics)));
    frameCount=0;previousMetrics=now;
   }
  };
  raf=requestAnimationFrame(paint);
  const contextLost=(event:Event)=>{event.preventDefault();setError('Se perdió el contexto WebGL. Recarga la página para restaurarlo.');alive=false;};
  canvas.addEventListener('webglcontextlost',contextLost);
  const onWheel=(event:WheelEvent)=>{
   event.preventDefault();
   cameraOrbit.current=boundedOrbit({...cameraOrbit.current,
    distance:cameraOrbit.current.distance+Math.sign(event.deltaY)*1.1});
   dirty.current=true;
  };
  canvas.addEventListener('wheel',onWheel,{passive:false});
  return ()=>{
   alive=false;cancelAnimationFrame(raf);observer.disconnect();
   canvas.removeEventListener('webglcontextlost',contextLost);
   canvas.removeEventListener('wheel',onWheel);
   renderer.dispose();
  };
 },[]);
 function pointerDown(e:ReactPointerEvent<HTMLCanvasElement>){
  if(e.button!==0)return;
  drag.current={x:e.clientX,y:e.clientY};setDragging(true);
  e.currentTarget.setPointerCapture(e.pointerId);
 }
 function pointerMove(e:ReactPointerEvent<HTMLCanvasElement>){
  const previous=drag.current;if(!previous)return;
  const deltaX=e.clientX-previous.x,deltaY=e.clientY-previous.y;
  cameraOrbit.current=boundedOrbit({...cameraOrbit.current,
   yaw:cameraOrbit.current.yaw+deltaX*.008,
   pitch:cameraOrbit.current.pitch+deltaY*.006});
  drag.current={x:e.clientX,y:e.clientY};dirty.current=true;
 }
 function pointerUp(e:ReactPointerEvent<HTMLCanvasElement>){
  drag.current=null;setDragging(false);
  if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);
 }
 function keyDown(e:ReactKeyboardEvent<HTMLCanvasElement>){
  const delta:{[key:string]:[number,number,number]}={
   ArrowLeft:[-.12,0,0],ArrowRight:[.12,0,0],
   ArrowUp:[0,-.10,0],ArrowDown:[0,.10,0],
   '+':[0,0,-1],'-':[0,0,1]
  };
  if(e.key.toLowerCase()==='r'){cameraOrbit.current={...presets[propsRef.current.view]};e.preventDefault();dirty.current=true;return;}
  const offsets=delta[e.key];if(!offsets)return;
  e.preventDefault();
  cameraOrbit.current=boundedOrbit({yaw:cameraOrbit.current.yaw+offsets[0],
   pitch:cameraOrbit.current.pitch+offsets[1],
   distance:cameraOrbit.current.distance+offsets[2]});
  dirty.current=true;
 }
 return <div className={'simulator-3d-stage'+(dragging?' dragging':'')} aria-label="Escena tridimensional interactiva">
   <canvas ref={gpu} tabIndex={0} role="img" aria-label={'Escena WebGL 3D de '+props.snapshot.scenarioId+
     '. Arrastra para girar, rueda para acercar, flechas del teclado para orientar la cámara y R para restablecer.'}
     onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}
     onPointerCancel={pointerUp} onKeyDown={keyDown}/>
   <canvas ref={overlay} className="simulator-3d-hud" aria-hidden="true"/>
   <div className="simulator-3d-top" aria-hidden="true"><span className="simulator-3d-live">● 3D EN TIEMPO REAL</span>
     <span>PROYECCIÓN · {props.view.toUpperCase()}</span></div>
   <div className="simulator-3d-bottom" aria-hidden="true"><span>◉ ESCENA GENERADA</span>
     <span>ARRASTRAR PARA GIRAR · RUEDA PARA ZOOM</span></div>
   {error&&<div className="simulator-3d-error" role="alert">
     <strong>Renderizado 3D no disponible</strong><p>{error}</p>
     <p>El simulador no inicia inferencia YOLO ni envía imágenes al servidor.</p></div>}
 </div>;
});
