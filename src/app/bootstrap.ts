import { parseConfig } from '../shared/config';
import { VolatileAnalysisRepository } from '../infrastructure/persistence/volatile-analysis-repository';
import { simulationSessionRepository } from '../infrastructure/persistence/simulation-session-store';
import { UnavailableVisionEngine } from '../infrastructure/vision/unavailable-vision-engine';
export function createFoundation(env: Record<string, unknown>) {
  const config = parseConfig(env);
  return { config, repository: new VolatileAnalysisRepository(), sessionRepository: simulationSessionRepository, engine: new UnavailableVisionEngine(config.origin) };
}
