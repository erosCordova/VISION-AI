import {useEffect,useRef,useState} from 'react';
import {gsap} from 'gsap';
import {ScrollTrigger} from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import {
 ArrowUpRight,ScanEye,Play,Pause,ChevronRight,Layers3,
 ShieldCheck,Factory,Warehouse,ShoppingBag
} from 'lucide-react';
import {StudioWorld,worldName,WORLD_KEYS} from './StudioWorld';
import type {WorldKey} from './StudioWorld';

const info:Record<WorldKey,{serial:string;tag:string;title:string;detail:string;category:string}>={
 safety:{serial:'01',tag:'SEGURIDAD INDUSTRIAL',title:'Visualiza lo que antes era invisible.',
  detail:'Personal y protección en un espacio de trabajo virtual. Examina cada fotograma con YOLO EPP y revisa sus indicios reales.',
  category:'PERSONAS / EPP'},
 quality:{serial:'02',tag:'CONTROL DE CALIDAD',title:'Cada detalle importa.',
  detail:'Una línea de producción recreada en 3D. Observa qué reconoce COCO sobre las piezas y qué requiere una evaluación especializada.',
  category:'MANUFACTURA / PROCESOS'},
 warehouse:{serial:'03',tag:'LOGÍSTICA INTELIGENTE',title:'El entorno se convierte en datos.',
  detail:'Almacenes, estanterías y rutas de paso en una escena tridimensional. Detecta clases disponibles y analiza sus límites.',
  category:'ALMACENES / LOGÍSTICA'},
 retail:{serial:'04',tag:'RETAIL Y OCUPACIÓN',title:'Una nueva perspectiva del espacio.',
  detail:'Explora zonas comerciales y movimiento de personajes. Interpreta detecciones del modelo sin confundirlas con identificación personal.',
  category:'COMERCIO / ENTORNOS'},
};
const icons={safety:ShieldCheck,quality:Factory,warehouse:Warehouse,retail:ShoppingBag};
interface Props {
 readonly onExplore:(key:WorldKey)=>void;
 readonly onHistory:()=>void;
 readonly sessionCount:number|null;
}
export function StudioLanding({onExplore,onHistory,sessionCount}:Props){
 const [active,setActive]=useState<WorldKey>('safety');
 const [paused,setPaused]=useState(false);
 const [loaded,setLoaded]=useState<boolean|null>(null);
 const main=useRef<HTMLElement>(null);
 const current=info[active];
 useEffect(()=>{
  const root=main.current;
  if(!root)return;
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
  const animations:ReturnType<typeof gsap.context>=gsap.context(()=>{
   if(reduce.matches)return;
   const timeline=gsap.timeline({defaults:{ease:'power3.out'}});
   timeline.fromTo('.studio-display-entry',{opacity:0,y:37},
    {opacity:1,y:0,duration:1.05,stagger:.11,clearProps:'transform'})
    .fromTo('.studio-selection',{opacity:0,y:20},
     {opacity:1,y:0,duration:.6,clearProps:'transform'},'-.45');
  },root);
  return()=>animations.revert();
 },[]);
 useEffect(()=>{
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const root=main.current;
  if(!root)return;
  const heading=root.querySelector('.studio-display-title');
  const detail=root.querySelector('.studio-display-description');
  gsap.fromTo([heading,detail],{opacity:.35,y:14},{
   opacity:1,y:0,duration:.6,ease:'power2.out',clearProps:'transform'
  });
 },[active]);
 useEffect(()=>{
  const query=window.matchMedia('(prefers-reduced-motion: reduce)');
  const respect=()=>{if(query.matches)setPaused(true);};
  respect();query.addEventListener('change',respect);
  return()=>query.removeEventListener('change',respect);
 },[]);
 // Lenis solo vive en el resumen. No interfiere con controles del laboratorio.
 useEffect(()=>{
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches||
     window.matchMedia('(max-width: 760px)').matches)return;
  let lenis:Lenis|undefined;
  try{lenis=new Lenis({autoRaf:true,lerp:.09,smoothWheel:true});}catch{return;}
  const instance=lenis;
  return()=>instance?.destroy();
 },[]);
 useEffect(()=>{
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  gsap.registerPlugin(ScrollTrigger);
  const ctx=gsap.context(()=>{
   gsap.utils.toArray<HTMLElement>('.studio-scroll-reveal').forEach(item=>{
    gsap.fromTo(item,{opacity:.1,y:36},{
     opacity:1,y:0,duration:.8,ease:'power3.out',clearProps:'transform',
     scrollTrigger:{trigger:item,start:'top 94%',once:true}
    });
   });
  },document.body);
  return()=>{ctx.revert();};
 },[]);
 return <section className="studio-experience" ref={main}
  aria-label="Explorador de escenarios tridimensionales">
  <StudioWorld active={active} paused={paused} onReady={setLoaded}/>
  <div className="studio-vignette" aria-hidden="true"/>
  <div className="studio-scanline" aria-hidden="true"/>
  <div className="studio-topline">
   <span className="studio-edition"><span className="studio-edition-icon"><Layers3 size={15}/></span>
    VISION<span>AI</span> <small>EXPERIENCE / 02</small></span>
   <span className="studio-experience-tag"><span className="studio-led"/>LABORATORIO 3D INTERACTIVO</span>
  </div>
  <div className="studio-copy">
   <p className="studio-upper studio-display-entry">
    <span>0{WORLD_KEYS.indexOf(active)+1} / 04</span>
    <span className="studio-upper-line"/>
    {current.tag}
   </p>
   <h1 className="studio-display-title studio-display-entry">
    La visión<br/>se <em>transforma.</em>
   </h1>
   <p className="studio-display-subtitle studio-display-entry">{current.title}</p>
   <p className="studio-display-description studio-display-entry">{current.detail}</p>
   <div className="studio-hero-ctas studio-display-entry">
    <button type="button" className="studio-enter" onClick={()=>onExplore(active)}>
     <ScanEye size={18} strokeWidth={2}/> Iniciar análisis
     <ArrowUpRight size={18}/>
    </button>
    <button type="button" className="studio-quiet" onClick={onHistory}>
     Consultar historial <ChevronRight size={16}/>
    </button>
   </div>
   <div className="studio-trust studio-display-entry">
    <span><span aria-hidden="true" className="studio-verified"/>MODELOS ONNX REALES</span>
    <span>PROCESAMIENTO LOCAL</span>
    <span>SIN CÁMARAS NI DATASETS</span>
   </div>
  </div>
  <div className="studio-scene-inspector" aria-hidden="true">
   <span className="studio-inspector-kicker"><span className="studio-inspector-pulse"/> VISUALIZACIÓN EN TIEMPO REAL</span>
   <strong>{worldName(active)}</strong>
   <span className="studio-inspector-divider"/>
   <span>ESCENARIO {current.serial} / 04</span>
   <span>PERSONAJES 3D · LUCES PBR</span>
   <span>ORBITAR / ACERCAR / EXPLORAR</span>
   <small>Escena ilustrativa · Inferencia YOLO en Análisis</small>
  </div>
  <div className="studio-vertical-label" aria-hidden="true">
   IMAGING SYSTEMS / INTERACTIVE ENVIRONMENTS / 2026
  </div>
  <div className="studio-side-system" aria-hidden="true">
   <span>VISUALIZACIÓN ACTIVA</span>
   <strong>{current.serial}<small>/04</small></strong>
   <span>{current.category}</span>
   <span className="studio-side-line"/>
   <span>RENDERIZADO WEBGL</span>
  </div>
  <div className="studio-bottom-deck">
   <div className="studio-deck-heading">
    <span>SELECCIONA UN ENTORNO</span>
    <div>
     <span className="studio-world-status">
      {loaded===false?'MODO VISUAL ALTERNATIVO':loaded?'ESCENA 3D ACTIVA':'CARGANDO ESCENA'}
     </span>
     <button type="button" className="studio-pause" aria-pressed={paused}
      onClick={()=>setPaused(s=>!s)} aria-label={paused?'Reanudar movimiento 3D':'Pausar movimiento 3D'}>
      {paused?<Play size={14}/>:<Pause size={14}/>}
      {paused?'Reanudar':'Pausar'}
     </button>
    </div>
   </div>
   <div className="studio-selection" role="tablist" aria-label="Seleccionar escenario de exhibición">
    {WORLD_KEYS.map(key=>{
     const Icon=icons[key],data=info[key];
     return <button type="button" role="tab" key={key}
      aria-selected={active===key} className={'studio-scene-choice '+(active===key?'is-active':'')}
      onClick={()=>setActive(key)}>
      <span className="studio-choice-index">{data.serial}</span>
      <Icon size={21} strokeWidth={1.6}/>
      <span className="studio-choice-copy"><strong>{worldName(key)}</strong>
       <small>{data.category}</small></span>
      <ArrowUpRight className="studio-choice-arrow" size={14}/>
     </button>;
    })}
   </div>
  </div>
  <span className="studio-data-count" aria-label="Sesiones guardadas en este navegador">
   <strong>{sessionCount??'—'}</strong><small>SESIONES LOCALES</small>
  </span>
 </section>;
}
