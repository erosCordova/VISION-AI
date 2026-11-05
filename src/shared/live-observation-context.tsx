import {createContext} from 'react';
import type {LiveObservationRepository} from '../core/ports/live-observation-repository';
/** El proveedor se configura una vez durante el arranque de VISION-AI. */
export const LiveObservationContext=createContext<LiveObservationRepository|null>(null);
export {useLiveObservationRepository} from './hooks/useLiveObservationRepository';
