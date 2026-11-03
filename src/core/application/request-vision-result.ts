import type { AnalysisInput, VisionResult } from '../domain/model';
import type { VisionEngine } from '../ports/vision-engine';
import { DomainError } from '../domain/errors';
import { validateInput, validateResult } from '../domain/validation';
/** Caso de frontera: no crea trabajos ni afirma persistencia; el flujo completo llega en Fase 9. */
export async function requestVisionResult(engine: VisionEngine, input: AnalysisInput, signal?: AbortSignal): Promise<VisionResult> {
  validateInput(input);
  if (signal?.aborted) throw new DomainError('OPERATION_ABORTED');
  if (engine.origin !== input.config.origin) throw new DomainError('INVALID_CONFIGURATION');
  const request = structuredClone(input);
  const result = await engine.analyze(request, { signal });
  if (signal?.aborted) throw new DomainError('OPERATION_ABORTED');
  validateResult(result, input);
  return structuredClone(result);
}
