import {useState} from 'react';
import {InteractiveSimulator} from './InteractiveSimulator';
import {PublicCameraLab} from './PublicCameraLab';
import {validScenario} from './simulation-engine';
import type {SimulationSessionRepository} from '../../core/ports/simulation-session-repository';

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
/** Las cámaras públicas son el origen real; la simulación 3D queda como alternativa. */
export function LiveAnalysisPage({scenarioId,onScenarioChange,sessionRepository,apiBaseUrl}:Props){
 const [source,setSource]=useState<'public'|'simulated'>(apiBaseUrl?'public':'simulated');
 return <>
  <section className="vision-source-selector" aria-label="Origen de imágenes para análisis">
   <div><strong>Seleccionar origen visual</strong>
    <p>Cámara pública con licencia o simulador 3D. Nunca se solicita la cámara del dispositivo.</p></div>
   <div role="group" aria-label="Origen de fotogramas">
    <button type="button" aria-pressed={source==='public'} onClick={()=>setSource('public')}>
     Cámara pública TfL
    </button>
    <button type="button" aria-pressed={source==='simulated'} onClick={()=>setSource('simulated')}>
     Simulaciones 3D
    </button>
   </div>
  </section>
  {source==='simulated'&&<div className="simulation-only-notice" role="note">
   <strong>SIMULACIÓN INDUSTRIAL 3D</strong>
   <span>Cuatro escenarios virtuales. YOLO procesa sus fotogramas;
    los resultados geométricos simulados se identifican por separado.</span>
  </div>}
  {source==='public'?
   <PublicCameraLab apiBaseUrl={apiBaseUrl}/>:
   <InteractiveSimulator sessionRepository={sessionRepository}
    scenarioId={validScenario(scenarioId)?scenarioId:'safety'}
    onScenarioChange={onScenarioChange}/>}
 </>;
}
