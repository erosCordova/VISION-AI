import {useEffect,useMemo,useState} from 'react';
import {
  Activity, ArrowRight, BarChart3, Box, Camera, CheckCircle2, Clock3,
  Factory, History, Layers3, ScanEye, ShieldCheck, ShoppingBag,
  Video, Warehouse, Zap
} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import type {SimulationSessionRepository} from '../../core/ports/simulation-session-repository';
import type {LiveObservationRepository} from '../../core/ports/live-observation-repository';
import type {SimulationSession} from '../../core/domain/simulation-session';
import type {LiveObservation} from '../../core/domain/live-observation';
import type {Detection} from '../../core/domain/model';
import type {WorldKey} from './StudioWorld';
import {ScenarioArtwork} from './ScenarioArtwork';
import {validateReproducibility} from '../scenarios/services/simulation-session-model';

type SeriesName='people'|'vehicles'|'other';
type Recent={id:string;name:string;date:string;count:number;kind:'cameras'|'scenarios'};
interface DayPoint {label:string;people:number;vehicles:number;other:number;}
interface Props {
 readonly sessions:SimulationSessionRepository;
 readonly observations:LiveObservationRepository;
 readonly onScene:(key:WorldKey)=>void;
 readonly onCameras:()=>void;
 readonly onHistory:()=>void;
 readonly onStatistics:()=>void;
 readonly onLab:()=>void;
}
const sceneCards:{id:WorldKey;title:string;detail:string;icon:LucideIcon}[]=[
 {id:'safety',title:'Seguridad industrial',detail:'Personal y protección',icon:ShieldCheck},
 {id:'quality',title:'Control de calidad',detail:'Línea de producción',icon:Factory},
 {id:'retail',title:'Ocupación comercial',detail:'Personas y zonas',icon:ShoppingBag},
 {id:'warehouse',title:'Almacén inteligente',detail:'Equipos y logística',icon:Warehouse}
];
const isPerson=(d:Detection)=>d.classId.toLowerCase()==='person'||d.label.toLowerCase().startsWith('persona');
const isVehicle=(d:Detection)=>/^(car|truck|bus|motorcycle|bicycle|forklift)$/.test(d.classId.toLowerCase())||/veh[ií]culo|montacargas|cami[oó]n|autom[oó]vil|motocicleta|bicicleta|autob[uú]s/i.test(d.label);
function localDay(value:string|Date):string{
 const d=value instanceof Date?value:new Date(value);
 if(!Number.isFinite(d.getTime()))return '';
 return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
}
function chartPath(data:DayPoint[],name:SeriesName,max:number):string{
 return data.map((d,i)=>{
  const x=24+i*69.6;
  const y=142-((d[name]||0)/Math.max(1,max))*114;
  return (i===0?'M':'L')+x.toFixed(1)+' '+y.toFixed(1);
 }).join(' ');
}
/** El tablero jamás genera conteos, porcentajes ni detecciones de demostración. */
export function CommandHome({sessions,observations,onScene,onCameras,onHistory,onStatistics,onLab}:Props){
 const [records,setRecords]=useState<readonly SimulationSession[]>([]);
 const [live,setLive]=useState<readonly LiveObservation[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState('');
 useEffect(()=>{
  let mounted=true;
  const load=async()=>{
   try{
    const [stored,publicVideos]=await Promise.all([sessions.list(),observations.list()]);
    if(!mounted)return;
    setRecords(stored.filter(r=>{try{validateReproducibility(r);return true;}catch{return false;}}));
    setLive(publicVideos);setError('');
   }catch{
    if(mounted)setError('No fue posible consultar los resultados guardados en este navegador.');
   }finally{if(mounted)setLoading(false);}
  };
  void load();
  window.addEventListener('vision-ai-sessions-updated',load);
  window.addEventListener('vision-ai-live-updated',load);
  window.addEventListener('vision-ai-reviews-updated',load);
  return()=>{
   mounted=false;
   window.removeEventListener('vision-ai-sessions-updated',load);
   window.removeEventListener('vision-ai-live-updated',load);
   window.removeEventListener('vision-ai-reviews-updated',load);
  };
 },[sessions,observations]);
 const summary=useMemo(()=>{
  const observationsByTime=[
   ...live.map(o=>({savedAt:o.savedAt,detections:o.detections})),
   ...records.filter(r=>r.inference).map(r=>({savedAt:r.savedAt,detections:r.inference!.detections}))
  ];
  const all=observationsByTime.flatMap(r=>r.detections);
  const people=all.filter(isPerson).length;
  const vehicles=all.filter(isVehicle).length;
  const confidence=all.length?all.reduce((n,d)=>n+d.confidence,0)/all.length:null;
  const times=observationsByTime.map(x=>x.savedAt);
  const base=new Date();base.setHours(0,0,0,0);
  const activity:DayPoint[]=Array.from({length:7},(_,i)=>{
   const day=new Date(base);day.setDate(base.getDate()-6+i);
   const key=localDay(day);
   const matched=observationsByTime.filter(r=>localDay(r.savedAt)===key).flatMap(r=>r.detections);
   return {
    label:day.toLocaleDateString('es-PE',{weekday:'short'}),
    people:matched.filter(isPerson).length,
    vehicles:matched.filter(isVehicle).length,
    other:matched.filter(d=>!isPerson(d)&&!isVehicle(d)).length
   };
  });
  const recent:Recent[]=[
   ...records.map(r=>({id:'s-'+r.id,name:r.scenarioName,date:r.savedAt,
    count:r.inference?.detections.length??0,kind:'scenarios' as const})),
   ...live.map(r=>({id:'c-'+r.id,name:r.cameraName,date:r.savedAt,
    count:r.detections.length,kind:'cameras' as const}))
  ].sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)).slice(0,3);
  const max=Math.max(1,...activity.map(d=>Math.max(d.people,d.vehicles,d.other)));
  const meanMs=observationsByTime.length?[
   ...live.map(r=>r.inferenceMs),
   ...records.filter(r=>r.inference).map(r=>r.inference!.inferenceMs)
  ].reduce((a,b)=>a+b,0)/observationsByTime.length:null;
  return {all,people,vehicles,confidence,activity,max,recent,meanMs,sourceCount:times.length};
 },[records,live]);
 const confidencePercent=summary.confidence===null?null:Math.round(summary.confidence*100);
 return <div className="neo-home" aria-label="Centro de control VISION AI">
  <header className="neo-welcome">
   <div><span className="neo-welcome-kicker"><ScanEye size={16}/> CENTRO DE CONTROL VISUAL</span>
    <h1>Bienvenido a <em>VISION AI</em></h1>
    <p>Monitorea, analiza y reconoce objetos mediante visión computacional.</p>
   </div>
   <button type="button" className="neo-primary-action" onClick={onLab}>
    <ScanEye size={17}/> Abrir laboratorio <ArrowRight size={17}/>
   </button>
  </header>
  {error&&<p role="alert" className="neo-error">{error}</p>}
  <section className="neo-kpi-grid" aria-label="Indicadores de actividad guardada">
   <div className="neo-kpi neo-kpi-blue"><div className="neo-kpi-icon"><ScanEye size={28}/></div>
    <div><span>Detecciones guardadas</span><strong>{loading?'—':summary.all.length.toLocaleString('es-PE')}</strong>
     <small>Sesiones y cámaras</small></div></div>
   <div className="neo-kpi neo-kpi-violet"><div className="neo-kpi-icon"><CarIcon/></div>
    <div><span>Vehículos reconocidos</span><strong>{loading?'—':summary.vehicles.toLocaleString('es-PE')}</strong>
     <small>En resultados guardados</small></div></div>
   <div className="neo-kpi neo-kpi-purple"><div className="neo-kpi-icon"><UsersIcon/></div>
    <div><span>Personas reconocidas</span><strong>{loading?'—':summary.people.toLocaleString('es-PE')}</strong>
     <small>Sin identificación personal</small></div></div>
   <div className="neo-kpi neo-kpi-green"><div className="neo-kpi-icon"><Box size={29}/></div>
    <div><span>Escenarios disponibles</span><strong>4</strong><small>Simulaciones 3D</small></div></div>
  </section>
  <div className="neo-dashboard-grid">
   <section className="neo-main-view neo-glass" aria-label="Vista previa del reconocimiento visual">
    <header className="neo-panel-heading"><h2><Video size={20}/> Análisis visual</h2>
     <span className="neo-state"><span/> Vistas disponibles</span></header>
    <div className="neo-preview-scene">
     <div className="neo-preview-art" aria-hidden="true">
      <div className="neo-street-sky"/>
      <div className="neo-street-blocks left"/><div className="neo-street-blocks right"/>
      <div className="neo-street-road"><i/><i/><i/></div>
      <span className="neo-focus-box neo-focus-a"/><span className="neo-focus-box neo-focus-b"/>
      <span className="neo-focus-box neo-focus-c"/>
     </div>
     <div className="neo-preview-label"><span className="neo-preview-led"/> VISTA ILUSTRATIVA</div>
     <div className="neo-preview-watermark">VISION <b>AI</b> / ANÁLISIS DE IMAGEN</div>
     <div className="neo-preview-overlay">
      <span><Camera size={17}/> Cámaras públicas disponibles</span>
      <button type="button" onClick={onCameras}>Abrir video en directo <ArrowRight size={16}/></button>
     </div>
    </div>
    <div className="neo-main-actions">
     <button onClick={onCameras} type="button"><Video size={17}/> Cámaras públicas</button>
     <button onClick={()=>onScene('safety')} type="button"><Layers3 size={17}/> Iniciar simulación 3D</button>
     <span>El video y el reconocimiento se activan al abrir la cámara.</span>
    </div>
   </section>
   <div className="neo-right-rail">
    <section className="neo-performance neo-glass" aria-label="Resultados y rendimiento de análisis guardados">
     <header className="neo-panel-heading"><h2><Activity size={19}/> Resultados del reconocimiento</h2></header>
     <div className="neo-performance-content">
      <div className="neo-progress" role="img" aria-label={confidencePercent===null?
       'No hay detecciones guardadas': 'Confianza media de detecciones guardadas: '+confidencePercent+' por ciento'}>
       <svg viewBox="0 0 144 144" aria-hidden="true">
        <circle className="neo-progress-track" cx="72" cy="72" r="55"/>
        <circle className="neo-progress-ring" cx="72" cy="72" r="55"
         strokeDasharray={confidencePercent===null?'0 346':(confidencePercent*3.456).toFixed(2)+' 346'}/>
       </svg>
       <div><strong>{confidencePercent===null?'—':confidencePercent+'%'}</strong><span>Confianza media</span></div>
      </div>
      <div className="neo-performance-list">
       <div><Clock3 size={17}/><span>Tiempo de análisis</span>
        <b>{loading||summary.meanMs===null?'—':summary.meanMs.toFixed(0)+' ms'}</b></div>
       <div><Layers3 size={17}/><span>Sesiones 3D guardadas</span><b>{loading?'—':records.length}</b></div>
       <div><Camera size={17}/><span>Análisis de cámaras</span><b>{loading?'—':live.length}</b></div>
      </div>
     </div>
     <p className="neo-performance-footnote">Confianza de detección, no precisión estadística. Solo registros locales.</p>
    </section>
    <section className="neo-chart-panel neo-glass" aria-label="Actividad de detección de los últimos siete días">
     <header className="neo-panel-heading"><h2><BarChart3 size={19}/> Actividad de detección</h2>
      <span className="neo-period">Últimos 7 días</span></header>
     <div className="neo-chart-wrap">
      <svg className="neo-activity-chart" viewBox="0 0 466 183" role="img"
       aria-label="Detecciones guardadas por día: personas, vehículos y otros objetos">
       <g className="neo-chart-grid">
        {[28,66,104,142].map(y=><line key={y} x1="23" y1={y} x2="449" y2={y}/>)}
       </g>
       <path className="neo-chart-line people" d={chartPath(summary.activity,'people',summary.max)}/>
       <path className="neo-chart-line vehicles" d={chartPath(summary.activity,'vehicles',summary.max)}/>
       <path className="neo-chart-line other" d={chartPath(summary.activity,'other',summary.max)}/>
       {summary.activity.map((d,i)=><text key={i} x={24+i*69.6} y="165" textAnchor="middle">{d.label}</text>)}
      </svg>
      {!summary.all.length&&!loading&&<span className="neo-chart-empty">Sin detecciones guardadas en este periodo</span>}
     </div>
     <div className="neo-chart-legend"><span><i className="people"/>Personas</span>
      <span><i className="vehicles"/>Vehículos</span>
      <span><i className="other"/>Otros</span></div>
    </section>
   </div>
  </div>
  <div className="neo-bottom-grid">
   <section className="neo-scenarios neo-glass" aria-label="Escenarios 3D disponibles">
    <header className="neo-panel-heading"><h2><Box size={20}/> Escenarios disponibles</h2>
     <button className="neo-text-action" onClick={()=>onScene('safety')}>Explorar <ArrowRight size={15}/></button></header>
    <div className="neo-scenario-grid">
     {sceneCards.map((scene,i)=>{
      const Icon=scene.icon;
      return <button type="button" key={scene.id} className={'neo-scene neo-scene-'+i}
       onClick={()=>onScene(scene.id)} aria-label={'Abrir escenario: '+scene.title}>
       <div className="neo-scene-art"><ScenarioArtwork kind={scene.id}/>
        <span className="neo-scene-arrow"><ArrowRight size={15}/></span></div>
       <div className="neo-scene-text"><Icon size={17}/><div><strong>{scene.title}</strong>
        <small>{scene.detail}</small></div></div>
      </button>;
     })}
    </div>
   </section>
   <section className="neo-shortcuts neo-glass" aria-label="Accesos rápidos">
    <header className="neo-panel-heading"><h2><Zap size={19}/> Accesos rápidos</h2></header>
    <div className="neo-shortcut-grid">
     <button type="button" onClick={()=>onScene('safety')}><Box size={26}/> Simulador 3D</button>
     <button type="button" onClick={onCameras}><Camera size={26}/> Cámaras</button>
     <button type="button" onClick={onStatistics}><BarChart3 size={26}/> Estadísticas</button>
     <button type="button" onClick={onHistory}><History size={26}/> Historial</button>
    </div>
   </section>
  </div>
  <div className="neo-recent neo-glass">
   <header className="neo-panel-heading"><h2><History size={19}/> Sesiones recientes</h2>
    <button className="neo-text-action" onClick={onHistory}>Ver historial <ArrowRight size={15}/></button></header>
   {summary.recent.length===0?<div className="neo-empty"><CheckCircle2 size={17}/>
    Todavía no hay análisis guardados. Abre una simulación o una cámara para comenzar.</div>:
    <div className="neo-recent-items">{summary.recent.map(r=><div className="neo-recent-item" key={r.id}>
     <span className="neo-recent-mark">{r.kind==='cameras'?<Camera size={16}/>:<Box size={16}/>}</span>
     <div><strong>{r.name}</strong><small>{new Date(r.date).toLocaleString('es-PE',{dateStyle:'short',timeStyle:'short'})}</small></div>
     <span>{r.count} objetos</span>
    </div>)}</div>}
  </div>
  <p className="neo-data-note">Los indicadores y las curvas proceden de análisis guardados en este navegador. Las ilustraciones de portada no representan transmisiones ni inferencias activas.</p>
 </div>;
}
function CarIcon(){return <svg width="29" height="29" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 16h14l-1.8-6H6.8L5 16ZM7 10l1.1-3h7.8L17 10M4 16v3h3v-3m10 0v3h3v-3M2 13l2-1m18 1-2-1"/><circle cx="8" cy="16" r=".6"/><circle cx="16" cy="16" r=".6"/></svg>}
function UsersIcon(){return <svg width="29" height="29" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true"><circle cx="9" cy="8" r="3"/><path d="M3 20v-2a6 6 0 0 1 12 0v2H3ZM16 11a3 3 0 0 0 0-6M18 20h3v-2a5 5 0 0 0-4-5"/></svg>}
