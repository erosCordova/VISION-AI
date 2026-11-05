import type {ReactNode} from 'react';
import {LiveObservationContext} from '../../shared/live-observation-context';
import type {LiveObservationRepository} from '../../core/ports/live-observation-repository';
interface Props{readonly liveObservationRepository:LiveObservationRepository;readonly children:ReactNode;}
export function AppProviders({liveObservationRepository,children}:Props){
 return <LiveObservationContext.Provider value={liveObservationRepository}>{children}</LiveObservationContext.Provider>;
}
