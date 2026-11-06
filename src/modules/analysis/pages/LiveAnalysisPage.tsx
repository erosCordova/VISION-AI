import {useEffect,useState} from 'react';
import {selectedVisualSource,selectVisualSource} from '../services/source-navigation';
import type {VisualSource} from '../services/source-navigation';
import {InteractiveSimulator} from '../../scenarios/pages/InteractiveSimulator';
import {LiveTrafficAnalysis} from './LiveTrafficAnalysis';
import {validScenario} from '../../scenarios/services/simulation-engine';
import type {SimulationSessionRepository} from '../../../core/ports/simulation-session-repository';

interface Scenario {
 readonly id:string;readonly name:string;readonly classes:string;readonly rule:string;
}
interface Props {
 readonly scenarios:readonly Scenario[];
 readonly scenarioId:string;
 readonly onScenarioChange:(id:string)=>void;
 readonly sessionRepository:SimulationSessionRepository;
 readonly role:string;
 readonly apiBaseUrl:string|null;
}
/** HLS continuo como origen real; la simulación 3D es alternativa independiente. */
export function LiveAnalysisPage({scenarioId,onScenarioChange,sessionRepository,apiBaseUrl}:Props){
 const [source,setSource]=useState<VisualSource>(()=>selectedVisualSource(apiBaseUrl?'live':'simulated'));
 useEffect(()=>{
  const onSelected=(event:Event)=>{
   const value=(event as CustomEvent<VisualSource>).detail;
   if(value==='live'||value==='simulated')setSource(value);
  };
  window.addEventListener('vision-ai-visual-source',onSelected);
  return()=>window.removeEventListener('vision-ai-visual-source',onSelected);
 },[]);
 return <>
  <section className="vision-source-selector" aria-label="Origen de imágenes para análisis">
   <div><strong>Seleccionar origen visual</strong>
    <p>Video público en directo o escenarios 3D. No se utiliza la cámara de tu dispositivo.</p></div>
   <div role="group" aria-label="Origen de fotogramas">
    <button type="button" aria-pressed={source==='live'} onClick={()=>{setSource('live');selectVisualSource('live');}}>
     Video público en directo
    </button>
    <button type="button" aria-pressed={source==='simulated'} onClick={()=>{setSource('simulated');selectVisualSource('simulated');}}>
     Simulaciones 3D
    </button>
   </div>
  </section>
  {source==='simulated'&&<div className="simulation-only-notice" role="note">
   <strong>ESCENARIOS VIRTUALES</strong>
   <span>Explora cuatro escenarios y observa los objetos reconocidos.</span>
  </div>}
  {source==='live'?
   <LiveTrafficAnalysis/>:
   <InteractiveSimulator sessionRepository={sessionRepository}
    scenarioId={validScenario(scenarioId)?scenarioId:'safety'}
    onScenarioChange={onScenarioChange}/>}
 </>;
}
