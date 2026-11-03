import type { LiveFrameIdentity, LiveFrameResult } from '../../core/domain/realtime';
import { validateBox } from '../../core/domain/validation';
import { isValidMask } from './mask-rle';

/** La imagen representa el mismo fotograma orientado que recibió el motor. */
export interface AnalyzedFrame {
  readonly identity: LiveFrameIdentity;
  readonly configurationVersion: string;
  readonly image: {
    readonly url: string;
    readonly width: number;
    readonly height: number;
    readonly assetId: string;
    readonly contentHash: string;
  };
  readonly output: LiveFrameResult;
}

export type FrameDecision =
  | { readonly state: 'empty' }
  | { readonly state: 'invalid'; readonly reason: string }
  | { readonly state: 'stale'; readonly ageMs: number }
  | { readonly state: 'ready'; readonly ageMs: number };

const positive = (n: number) => Number.isSafeInteger(n) && n > 0;

/** No mezclar imagen, generación, configuración ni resultado de ejecuciones distintas. */
export function decideFrame(frame: AnalyzedFrame | null, nowMs: number, maxAgeMs: number): FrameDecision {
  if (!frame) return { state: 'empty' };
  const { identity: source, image, output } = frame;
  const sameFrame = source.sessionId === output.sessionId
    && source.generation === output.generation
    && source.frameId === output.frameId
    && source.capturedAtMonotonicMs === output.capturedAtMonotonicMs;
  const validNumbers = Number.isSafeInteger(source.generation) && source.generation >= 0
    && Number.isSafeInteger(source.frameId) && source.frameId >= 0
    && Number.isFinite(source.capturedAtMonotonicMs) && source.capturedAtMonotonicMs >= 0
    && Number.isFinite(nowMs) && nowMs >= source.capturedAtMonotonicMs
    && Number.isFinite(maxAgeMs) && maxAgeMs > 0
    && positive(image.width) && positive(image.height)
    && image.width * image.height <= 20_000_000
    && Number.isFinite(output.inferenceDurationMs) && output.inferenceDurationMs >= 0;
  const linked = output.configurationVersion === frame.configurationVersion
    && output.result.assetId === image.assetId
    && output.result.sourceHash === image.contentHash
    && output.result.schemaVersion === 'vision-result-v1'
    && output.result.origin === 'real'
    && Boolean(output.result.modelVersion?.trim())
    && typeof image.url === 'string' && image.url.length > 0
    && typeof source.sessionId === 'string' && source.sessionId.length > 0;
  if (!sameFrame || !validNumbers || !linked) {
    return { state: 'invalid', reason: 'La imagen o el resultado no pertenecen a la misma ejecución validada.' };
  }
  try {
    for (const detection of output.result.detections) {
      validateBox(detection.box);
      if (!Number.isFinite(detection.confidence) || detection.confidence < 0 || detection.confidence > 1) throw Error();
    }
    for (const mask of output.result.masks) {
      if (!isValidMask(mask.mask) || mask.mask.width !== image.width || mask.mask.height !== image.height) throw Error();
    }
  } catch {
    return { state: 'invalid', reason: 'Las anotaciones no tienen geometría compatible con la imagen.' };
  }
  const ageMs = nowMs - source.capturedAtMonotonicMs;
  if (ageMs > maxAgeMs) return { state: 'stale', ageMs };
  return { state: 'ready', ageMs };
}
