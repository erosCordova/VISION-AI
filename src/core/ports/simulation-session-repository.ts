import type {SimulationSession} from '../domain/simulation-session';
/** Contrato de persistencia: el adaptador decide cómo guardar; la UI no conoce IndexedDB. */
export interface SimulationSessionRepository{
 save(record:SimulationSession):Promise<void>;
 list():Promise<readonly SimulationSession[]>;
 remove(id:string):Promise<void>;
}
