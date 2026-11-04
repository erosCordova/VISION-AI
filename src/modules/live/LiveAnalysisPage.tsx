import {InteractiveSimulator} from './InteractiveSimulator';
import {validScenario} from './simulation-engine';
import type {SimulationSessionRepository} from '../../core/ports/simulation-session-repository';

/**
 * VISION-AI: exclusivamente simulaciones industriales 3D.
 * La inferencia real YOLO observa los fotogramas sintéticos renderizados.
 * No se presentan importadores de datasets, cámaras ni cargas de videos.
 */
interface Scenario {
 readonly id:string;
 readonly name:string;
 readonly classes:string;
 readonly rule:string;
}
interface Props {
 readonly scenarios:readonly Scenario[];
 readonly scenarioId:string;
 readonly onScenarioChange:(id:string)=>void;
 readonly sessionRepository:SimulationSessionRepository;
 readonly role:string;
 readonly apiBaseUrl:string|null;
}
export function LiveAnalysisPage({scenarioId,onScenarioChange,sessionRepository}:Props){
 return <>
  <div className="simulation-only-notice" role="note">
   <strong>SIMULACIÓN INDUSTRIAL EN TIEMPO REAL</strong>
   <span>Cuatro escenarios 3D autónomos. YOLO procesa las imágenes generadas por la simulación,
    sin importar fotografías, videos ni datasets.</span>
  </div>
  <InteractiveSimulator sessionRepository={sessionRepository} scenarioId={validScenario(scenarioId)?scenarioId:'safety'}
   onScenarioChange={onScenarioChange}/>
 </>;
}
