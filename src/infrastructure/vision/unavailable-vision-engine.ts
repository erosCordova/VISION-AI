import type { AnalysisInput, Origin } from '../../core/domain/model';
import type { VisionEngine } from '../../core/ports/vision-engine';
import { DomainError } from '../../core/domain/errors';
/** Bloqueo explícito hasta integrar el adaptador demo en Fase 7 o la API real en Fase 15. */
export class UnavailableVisionEngine implements VisionEngine {
  constructor(readonly origin: Origin) {}
  async analyze(_input: AnalysisInput): Promise<never> { throw new DomainError('ENGINE_UNAVAILABLE'); }
}
