import { parseConfig } from '../shared/config';
import { VolatileAnalysisRepository } from '../infrastructure/persistence/volatile-analysis-repository';
import { simulationSessionRepository } from '../infrastructure/persistence/simulation-session-store';
import {liveObservationRepository} from '../infrastructure/persistence/live-observation-store';
import { UnavailableVisionEngine } from '../infrastructure/vision/unavailable-vision-engine';
export function createFoundation(env: Record<string, unknown>) {
  const config = parseConfig(env);
  return { config, repository: new VolatileAnalysisRepository(), sessionRepository: simulationSessionRepository, liveObservationRepository, engine: new UnavailableVisionEngine(config.origin) };
}
