import type {SimulationSession} from '../domain/simulation-session';
/** Contrato de persistencia: el adaptador decide cómo guardar; la UI no conoce IndexedDB. */
/** No borra registros dañados; los enumera para recuperación o borrado explícito. */
export interface SimulationSessionInspection{
 readonly records:readonly SimulationSession[];
 readonly corruptIds:readonly string[];
}
export interface SimulationSessionRepository{
 inspect():Promise<SimulationSessionInspection>;
 save(record:SimulationSession):Promise<void>;
 list():Promise<readonly SimulationSession[]>;
 remove(id:string):Promise<void>;
}
