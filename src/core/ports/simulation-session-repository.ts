import type {SimulationSession} from '../domain/simulation-session';
import type {ReviewClosure,ReviewDecision} from '../domain/review-closure';
import type {RetentionDays} from '../domain/local-data-policy';
/** Contrato de persistencia: el adaptador decide cómo guardar; la UI no conoce IndexedDB. */
/** No borra registros dañados; los enumera para recuperación o borrado explícito. */
export interface SimulationSessionInspection{
 readonly records:readonly SimulationSession[];
 readonly corruptIds:readonly string[];
}
export interface SimulationSessionRepository{
 inspect():Promise<SimulationSessionInspection>;
 /** Cierres independientes de la evidencia; ausencia de cierre significa pendiente. */
 listReviewClosures():Promise<readonly ReviewClosure[]>;
 /** Devuelve false si ya se había cerrado (operación idempotente). */
 closeReview(sessionId:string,eventId:string,decision?:ReviewDecision,note?:string):Promise<boolean>;
 save(record:SimulationSession):Promise<void>;
 list():Promise<readonly SimulationSession[]>;
 remove(id:string):Promise<void>;
 /** Borrar únicamente sesiones fechadas más antiguas, junto con sus revisiones. */
 purgeExpired(days:RetentionDays,now?:Date):Promise<number>;
 /** Borrado explícito y atómico de las dos colecciones IndexedDB. */
 eraseAll():Promise<{sessions:number;reviews:number}>;
}
