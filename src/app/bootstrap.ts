import { parseConfig } from '../shared/utils/config';
import { VolatileAnalysisRepository } from '../infrastructure/persistence/volatile-analysis-repository';
import { simulationSessionRepository } from '../infrastructure/persistence/LocalAnalysisRepository';
import {liveObservationRepository} from '../infrastructure/persistence/LocalLiveObservationRepository';
import { UnavailableVisionEngine } from '../infrastructure/vision/unavailable-vision-engine';
export function createFoundation(env: Record<string, unknown>) {
  const config = parseConfig(env);
  return { config, repository: new VolatileAnalysisRepository(), sessionRepository: simulationSessionRepository, liveObservationRepository, engine: new UnavailableVisionEngine(config.origin) };
}
