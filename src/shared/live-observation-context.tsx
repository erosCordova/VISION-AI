import {createContext,useContext} from 'react';
import type {LiveObservationRepository} from '../core/ports/live-observation-repository';
/** El proveedor se configura una vez durante el arranque de VISION-AI. */
export const LiveObservationContext=createContext<LiveObservationRepository|null>(null);
export function useLiveObservationRepository():LiveObservationRepository{
 const value=useContext(LiveObservationContext);
 if(!value)throw Error('No está disponible el historial local de cámaras.');
 return value;
}
