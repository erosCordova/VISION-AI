import {useEffect,useRef,useState} from 'react';
import * as THREE from 'three';

interface Props{
 readonly onExplore:()=>void;
 readonly onHistory:()=>void;
 readonly sessionCount:number|null;
}
export const IMMERSIVE_HERO_TITLE='Una visión clara de tu operación';
/** Escena WebGL original — Three.js MIT, sin assets remotos ni inferencia ficticia.
 * 30 FPS máximo, DPR limitado, IntersectionObserver y pausa si no es visible. */
export function ImmersiveHero({onExplore,onHistory,sessionCount}:Props){
 const canvasRef=useRef<HTMLCanvasElement>(null);
 const sceneRef=useRef<HTMLElement>(null);
 const [motion,setMotion]=useState(()=>{
  return typeof window!=='undefined'&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 });
 const motionRef=useRef(motion);
 useEffect(()=>{motionRef.current=motion;},[motion]);
 useEffect(()=>{
  const canvas=canvasRef.current,stage=sceneRef.current;
  if(!canvas||!stage)return;
  let renderer:THREE.WebGLRenderer|undefined;
  const resources:THREE.BufferGeometry[]=[];
  const materials:THREE.Material[]=[];
  let raf=0,active=true,visible=true,lastFrame=0;
  const pointer={x:0,y:0},smoothed={x:0,y:0};
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(38,1,.1,90);
  camera.position.set(0,0,9.4);
  const sculpture=new THREE.Group();
  sculpture.position.set(1.9,.1,0);
  scene.add(sculpture);
  const addMesh=(geo:THREE.BufferGeometry,mat:THREE.Material)=>{
   resources.push(geo);materials.push(mat);
   const mesh=new THREE.Mesh(geo,mat);sculpture.add(mesh);return mesh;
  };
  // Núcleo: superficie facetada y capas orbitales, sin modelos comprados.
  const shell=addMesh(new THREE.IcosahedronGeometry(1.64,3),
   new THREE.MeshStandardMaterial({
    color:0x1b9ca6,wireframe:true,transparent:true,opacity:.23,
    emissive:0x0d404e,roughness:.45
   }));
  const core=addMesh(new THREE.IcosahedronGeometry(1.08,5),
   new THREE.MeshPhysicalMaterial({
    color:0x1ad5c8,metalness:.49,roughness:.21,
    transparent:true,opacity:.64,
    emissive:0x08768d,emissiveIntensity:.31,flatShading:false
   }));
  const inner=addMesh(new THREE.IcosahedronGeometry(.69,3),
   new THREE.MeshStandardMaterial({
    color:0x132c4a,metalness:.6,roughness:.2,
    emissive:0x156f9a,emissiveIntensity:.7,flatShading:true
   }));
  inner.rotation.z=.3;
  const ringColors=[0x74ffe2,0x8d91ff,0x3da8d1];
  const rings=[2.07,2.32,2.55].map((radius,i)=>{
   const ring=addMesh(new THREE.TorusGeometry(radius,.012,4,180),
    new THREE.MeshBasicMaterial({
     color:ringColors[i],transparent:true,opacity:i===0?.7:.35,depthWrite:false
    }));
   ring.rotation.set(.25+i*.43,.24+i*.75,-.28+i*.42);
   return ring;
  });
  const knot=addMesh(new THREE.TorusKnotGeometry(1.75,.013,260,5,2,3),
   new THREE.MeshBasicMaterial({
    color:0x47eac9,transparent:true,opacity:.56,depthWrite:false
   }));
  knot.rotation.x=.36;
  const positions=new Float32Array(950*3);
  for(let i=0;i<950;i++){
   const a=i*2.3999632,rad=Math.sqrt((i+.5)/950)*5.1;
   positions[i*3]=Math.cos(a)*rad;
   positions[i*3+1]=Math.sin(a)*rad*.75;
   positions[i*3+2]=Math.sin(i*15.13)*1.9-1.2;
  }
  const pointsGeometry=new THREE.BufferGeometry();
  pointsGeometry.setAttribute('position',new THREE.BufferAttribute(positions,3));
  resources.push(pointsGeometry);
  const pointMaterial=new THREE.PointsMaterial({
   color:0x86f8ed,size:.022,transparent:true,opacity:.46,
   blending:THREE.AdditiveBlending,depthWrite:false
  });
  materials.push(pointMaterial);
  const stars=new THREE.Points(pointsGeometry,pointMaterial);
  stars.position.x=1.9;scene.add(stars);
  const ambient=new THREE.AmbientLight(0x86b0d2,1.25);
  scene.add(ambient);
  const cyan=new THREE.PointLight(0x46d9db,33);cyan.position.set(3,2,5);scene.add(cyan);
  const violet=new THREE.PointLight(0x8367c8,26);violet.position.set(-2,-2,3);scene.add(violet);
  const render=()=>{
   if(!renderer||!active)return;
   renderer.render(scene,camera);
  };
  const resize=()=>{
   if(!renderer)return;
   const rect=stage.getBoundingClientRect();
   const width=Math.max(1,Math.round(rect.width));
   const height=Math.max(1,Math.round(rect.height));
   renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
   renderer.setSize(width,height,false);
   camera.aspect=width/height;
   // En móvil el objeto se centra; el texto se sitúa sobre gradiente opaco.
   sculpture.position.x=width<720?0:1.9;
   stars.position.x=sculpture.position.x;
   camera.position.z=width<720?12:9.4;
   camera.updateProjectionMatrix();
   render();
  };
  const onPointer=(event:PointerEvent)=>{
   const rect=stage.getBoundingClientRect();
   pointer.x=((event.clientX-rect.left)/Math.max(1,rect.width)-.5)*2;
   pointer.y=((event.clientY-rect.top)/Math.max(1,rect.height)-.5)*2;
  };
  const onLeave=()=>{pointer.x=0;pointer.y=0;};
  const reducedMotion=()=>{if(reduce.matches){motionRef.current=false;setMotion(false);render();}};
  const tick=(time:number)=>{
   raf=window.requestAnimationFrame(tick);
   if(!active||!visible||document.hidden||!motionRef.current||reduce.matches||time-lastFrame<33)return;
   const dt=Math.min(.065,(time-lastFrame)/1000||.033);
   lastFrame=time;
   smoothed.x+=(pointer.x-smoothed.x)*Math.min(1,dt*2.8);
   smoothed.y+=(pointer.y-smoothed.y)*Math.min(1,dt*2.8);
   sculpture.rotation.y+=dt*.085;
   sculpture.rotation.x+=(smoothed.y*.12-sculpture.rotation.x)*Math.min(1,dt*1.4);
   shell.rotation.y-=dt*.12;
   core.rotation.y+=dt*.09;
   core.rotation.z+=dt*.036;
   rings.forEach((ring,i)=>{ring.rotation.y+=dt*(i%2?-.06:.055);});
   knot.rotation.z+=dt*.045;
   sculpture.position.y=.1+Math.sin(time*.00043)*.06;
   camera.position.x+=(smoothed.x*.25-camera.position.x)*Math.min(1,dt*1.4);
   camera.lookAt(0,0,0);
   render();
  };
  const onVisibility=()=>{if(!document.hidden)lastFrame=0;};
  const observer=new IntersectionObserver(entries=>{
   visible=entries.some(entry=>entry.isIntersecting);
   if(visible){lastFrame=0;render();}
  },{threshold:.01});
  const sizing=new ResizeObserver(resize);
  try{
   renderer=new THREE.WebGLRenderer({
    canvas,alpha:true,antialias:true,powerPreference:'low-power'
   });
   renderer.outputColorSpace=THREE.SRGBColorSpace;
   sizing.observe(stage);observer.observe(stage);
   stage.addEventListener('pointermove',onPointer,{passive:true});
   stage.addEventListener('pointerleave',onLeave);
   document.addEventListener('visibilitychange',onVisibility);
   reduce.addEventListener('change',reducedMotion);
   resize();raf=window.requestAnimationFrame(tick);
  }catch{
   // El degradado y la ilustración CSS mantienen la portada sin WebGL.
   canvas.style.display='none';
  }
  return()=>{
   active=false;window.cancelAnimationFrame(raf);
   sizing.disconnect();observer.disconnect();
   stage.removeEventListener('pointermove',onPointer);
   stage.removeEventListener('pointerleave',onLeave);
   document.removeEventListener('visibilitychange',onVisibility);
   reduce.removeEventListener('change',reducedMotion);
   scene.remove(sculpture,stars,ambient,cyan,violet);
   resources.forEach(resource=>resource.dispose());
   materials.forEach(material=>material.dispose());
   renderer?.dispose();
  };
 },[]);
 return <section ref={sceneRef} className="experience-hero" aria-label="Presentación VISION-AI">
  <div className="experience-hero-glow" aria-hidden="true"/>
  <canvas ref={canvasRef} className="experience-hero-canvas" aria-hidden="true"/>
  <div className="experience-hero-grid" aria-hidden="true"/>
  <div className="experience-hero-content">
   <div className="experience-overline"><i aria-hidden="true"/>VISION AI / LABORATORIO DE VISIÓN
    <span>EDICIÓN 2026</span></div>
   <p className="experience-kicker">SIMULACIÓN 3D + INTELIGENCIA ARTIFICIAL</p>
   <h1>Una visión <em>clara</em><br/>de tu operación</h1>
   <p className="experience-hero-description">Cuatro mundos industriales simulados.
    Una inteligencia que observa sus fotogramas. Explora, analiza y
    convierte cada escena en evidencia verificable, directamente en tu navegador.</p>
   <div className="experience-hero-actions">
    <button className="experience-cta" onClick={onExplore}>Explorar simulaciones
     <span aria-hidden="true">↗</span></button>
    <button className="experience-secondary" onClick={onHistory}>Ver historial
     <span aria-hidden="true">↗</span></button>
   </div>
   <div className="experience-hero-meta">
    <div><strong>04</strong><span>ESCENARIOS EN 3D</span></div>
    <div><strong>YOLO</strong><span>INFERENCIA ONNX REAL</span></div>
    <div><strong>{sessionCount??'—'}</strong><span>SESIONES LOCALES</span></div>
   </div>
  </div>
  <div className="experience-hero-side-label" aria-hidden="true">VISION · ANALYZE · UNDERSTAND</div>
  <div className="experience-hero-bottom">
   <span>EXPERIENCIA INTERACTIVA / WEBGL</span>
   <button type="button" className="experience-motion-toggle"
    aria-pressed={!motion} onClick={()=>setMotion(v=>!v)}>
    {motion?'Pausar movimiento':'Activar movimiento'}
   </button>
  </div>
 </section>;
}
