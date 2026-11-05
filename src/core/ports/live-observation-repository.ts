import type {LiveObservation} from '../domain/live-observation';
export interface LiveObservationRepository{
 list():Promise<LiveObservation[]>;
 save(record:LiveObservation):Promise<void>;
 remove(id:string):Promise<void>;
 eraseAll():Promise<number>;
 purgeExpired(days:30|90|180):Promise<number>;
}
