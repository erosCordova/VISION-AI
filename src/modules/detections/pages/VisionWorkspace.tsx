import {useCallback,useEffect,useState} from 'react';
import {Activity,ArrowRight,History,Layers3,Video} from 'lucide-react';
import {InteractiveSimulator} from '../../scenarios/pages/InteractiveSimulator';
import {LiveTrafficAnalysis} from '../../analysis/pages/LiveTrafficAnalysis';
import {validScenario} from '../../scenarios/services/simulation-engine';
import type {SimulationSessionRepository} from '../../../core/ports/simulation-session-repository';
import type {LiveObservationRepository} from '../../../core/ports/live-observation-repository';
import {validateReproducibility} from '../../scenarios/services/simulation-session-model';

type Source='scenarios'|'cameras';
interface Summary{
 readonly scenarios:number;
 readonly cameras:number;
 readonly detections:number;
 readonly reviews:number;
}
interface Props{
 readonly scenarioId:string;
 readonly onScenarioChange:(id:string)=>void;
 readonly sessionRepository:SimulationSessionRepository;
 readonly liveObservationRepository:LiveObservationRepository;
 readonly onHistory:()=>void;
}
/** Herramienta de reconocimiento efectiva: usa los motores y repositorios existentes. */
export function VisionWorkspace({
 scenarioId,onScenarioChange,sessionRepository,liveObservationRepository,onHistory
}:Props){
 const [source,setSource]=useState<Source>('scenarios');
 const [summary,setSummary]=useState<Summary|null>(null);
 const [error,setError]=useState('');
 const refresh=useCallback(async(active:()=>boolean)=>{
  try{
   const [sessions,cameras]=await Promise.all([
    sessionRepository.list(),liveObservationRepository.list()
   ]);
   if(!active())return;
   const verified=sessions.filter(session=>{
    try{validateReproducibility(session);return true;}
    catch{return false;}
   });
   setSummary({
    scenarios:verified.length,
    cameras:cameras.length,
    detections:cameras.reduce((sum,record)=>sum+record.detections.length,0),
    reviews:verified.reduce((sum,session)=>sum+(session.inference?.reviewLog.length??0),0)
   });
   setError('');
  }catch{
   if(active()){setError('No se pudo consultar el historial de este navegador.');setSummary(null);}
  }
 },[sessionRepository,liveObservationRepository]);
 useEffect(()=>{
  let mounted=true;
  const reload=()=>{void refresh(()=>mounted);};
  reload();
  window.addEventListener('vision-ai-sessions-updated',reload);
  window.addEventListener('vision-ai-live-updated',reload);
  return()=>{
   mounted=false;
   window.removeEventListener('vision-ai-sessions-updated',reload);
   window.removeEventListener('vision-ai-live-updated',reload);
  };
 },[refresh]);
 const total=(summary?.scenarios??0)+(summary?.cameras??0);
 return <div className="vision-workspace" aria-label="Laboratorio de reconocimiento visual">
  <header className="vision-workspace-intro">
   <div>
    <span className="vision-workspace-eyebrow"><Activity size={15}/> LABORATORIO ACTIVO</span>
    <h2>Reconoce lo que ocurre en la imagen</h2>
    <p>Elige una escena 3D o una cámara pública para reconocer objetos en imágenes reales
     de la fuente seleccionada. No se utiliza la cámara de tu dispositivo.</p>
   </div>
   <button type="button" className="vision-workspace-history" onClick={onHistory}>
    <History size={17}/> Mis resultados <ArrowRight size={16}/>
   </button>
  </header>
  <div className="vision-workspace-sources" role="group" aria-label="Elegir fuente de reconocimiento">
   <button type="button" className="vision-workspace-source" aria-pressed={source==='scenarios'}
    onClick={()=>setSource('scenarios')}>
    <Layers3 size={23} aria-hidden="true"/>
    <span><strong>Escenarios 3D</strong><small>Reconocer objetos en cuatro entornos interactivos</small></span>
   </button>
   <button type="button" className="vision-workspace-source" aria-pressed={source==='cameras'}
    onClick={()=>setSource('cameras')}>
    <Video size={23} aria-hidden="true"/>
    <span><strong>Cámaras públicas</strong><small>Reconocer vehículos y personas en video en directo</small></span>
   </button>
  </div>
  {error?<p className="vision-workspace-notice is-error" role="alert">{error}</p>:
   summary&&total>0?
    <div className="vision-workspace-activity" aria-label="Actividad real guardada en este navegador">
     <span><strong>{summary.scenarios}</strong> sesiones 3D</span>
     <span><strong>{summary.cameras}</strong> análisis de cámaras</span>
     <span><strong>{summary.detections}</strong> objetos de cámaras registrados</span>
     <span><strong>{summary.reviews}</strong> observaciones para revisión</span>
     <button type="button" onClick={onHistory}>Ver detalle <ArrowRight size={14}/></button>
    </div>:
    <p className="vision-workspace-notice" role="status">
     {summary===null?'Consultando resultados guardados…':
      'Todavía no hay análisis guardados. Elige una fuente, inicia el reconocimiento y guarda los resultados que quieras conservar.'}
    </p>}
  <div className="vision-workspace-engine" aria-label="Herramienta de reconocimiento">
   {source==='scenarios'?
    <InteractiveSimulator
     initialMode="yolo"
     sessionRepository={sessionRepository}
     scenarioId={validScenario(scenarioId)?scenarioId:'safety'}
     onScenarioChange={onScenarioChange}/>:
    <LiveTrafficAnalysis/>}
  </div>
 </div>;
}
