import {useContext} from 'react';
import {LiveObservationContext} from '../live-observation-context';
import type {LiveObservationRepository} from '../../core/ports/live-observation-repository';
/** Consumo controlado del repositorio inyectado por el proveedor principal. */
export function useLiveObservationRepository():LiveObservationRepository{
 const value=useContext(LiveObservationContext);
 if(!value)throw Error('No está disponible el historial local de cámaras.');
 return value;
}
