import type { VisionResult } from '../../../core/domain/model';
import { validateBox } from '../../../core/domain/validation';
import { isValidMask } from '../../segmentation/services/mask-rle';
import type { ModelCoverage } from '../../scenarios/services/scenario-summary';

export interface InferenceResponse {
  readonly sessionId: string;
  readonly generation: number;
  readonly frameId: number;
  readonly capturedAtMonotonicMs: number;
  readonly configurationVersion: string;
  readonly inferenceDurationMs: number;
  readonly image: { readonly width: number; readonly height: number; readonly assetId: string; readonly contentHash: string };
  readonly coverage: ModelCoverage;
  readonly modelClasses: string[];
  readonly result: VisionResult;
}
export interface RequestedFrame {
  readonly sessionId: string;
  readonly generation: number;
  readonly frameId: number;
  readonly capturedAtMonotonicMs: number;
  readonly width: number;
  readonly height: number;
}

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const identifier = (value: unknown) => typeof value === 'string' && value.trim().length > 0;
const withinUnit = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1;

/** Comprueba de forma local la huella del JPEG exacto enviado al motor. */
export async function jpegSha256(blob: Blob): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer());
  return [...new Uint8Array(hash)].map(value => value.toString(16).padStart(2, '0')).join('');
}

/** No se dibuja ni contabiliza ninguna respuesta que incumpla el contrato. */
export function matchesInferenceResponse(value: unknown, requested: RequestedFrame, sourceHash: string): value is InferenceResponse {
  if (!record(value) || !record(value.image) || !record(value.result) || !record(value.coverage)) return false;
  const { image, result, coverage } = value;
  if (value.sessionId !== requested.sessionId ||
      value.generation !== requested.generation ||
      value.frameId !== requested.frameId ||
      value.capturedAtMonotonicMs !== requested.capturedAtMonotonicMs ||
      image.width !== requested.width || image.height !== requested.height ||
      !identifier(image.assetId) || image.contentHash !== sourceHash ||
      !identifier(value.configurationVersion) ||
      typeof value.inferenceDurationMs !== 'number' || !Number.isFinite(value.inferenceDurationMs) ||
      value.inferenceDurationMs < 0 ||
      result.schemaVersion !== 'vision-result-v1' || result.origin !== 'real' ||
      !identifier(result.modelVersion) || result.assetId !== image.assetId ||
      result.sourceHash !== sourceHash || !identifier(result.analysisId) ||
      !Array.isArray(result.detections) || !Array.isArray(result.masks) || !Array.isArray(result.patterns) ||
      result.detections.length > 50 ||
      typeof coverage.complete !== 'boolean' ||
      !Array.isArray(coverage.missingClasses) ||
      !coverage.missingClasses.every(identifier) ||
      typeof coverage.detail !== 'string' ||
      !Array.isArray(value.modelClasses) ||
      !value.modelClasses.every(identifier)) return false;
  try {
    for (const detection of result.detections) {
      if (!record(detection) || !identifier(detection.id) || !identifier(detection.classId)
        || !identifier(detection.label) || !withinUnit(detection.confidence)) return false;
      validateBox(detection.box);
    }
    for (const mask of result.masks) {
      if (!record(mask) || !record(mask.mask) || !isValidMask(mask.mask as unknown as Parameters<typeof isValidMask>[0])
          || mask.mask.width !== image.width || mask.mask.height !== image.height) return false;
    }
    for (const pattern of result.patterns) {
      if (!record(pattern) || !identifier(pattern.id) || !identifier(pattern.label)
          || !['triggered','not-triggered','indeterminate'].includes(String(pattern.assessment))) return false;
    }
  } catch { return false; }
  return true;
}
