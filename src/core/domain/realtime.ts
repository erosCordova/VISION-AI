import type { AnalysisMode, Origin, SourceReference, VisionResult } from './model';
/** Contrato de alcance v1; la captura y el transporte se implementan en fases posteriores. */
export type LiveSessionStatus = 'idle' | 'requesting-camera' | 'preview' | 'connecting'
  | 'running' | 'paused' | 'stopping' | 'stopped' | 'failed';
export interface LiveSessionSpec {
  readonly schemaVersion: 'live-session-v1';
  readonly sessionId: string;
  readonly generation: number;
  readonly ownerId: string;
  readonly organizationId: string;
  readonly origin: Origin;
  readonly modelFamily: 'YOLO';
  readonly sourceKind: 'browser-camera' | 'backend-ip-camera';
  readonly scenarioId: string;
  readonly scenarioVersion: string;
  readonly configurationVersion: string;
  readonly mode: AnalysisMode;
  readonly modelVersion: string | null;
  readonly targetInferenceFps: number;
  readonly maxInFlight: 1;
  readonly maxPendingFrames: 1;
  readonly maxOverlayAgeMs: number;
}
export interface LiveFrameIdentity {
  readonly sessionId: string;
  readonly generation: number;
  readonly frameId: number;
  /** Reloj monotónico del cliente; no compararlo con el reloj de otro equipo. */
  readonly capturedAtMonotonicMs: number;
}
export interface LiveFrame extends LiveFrameIdentity {
  readonly source: SourceReference;
  readonly mimeType: 'image/jpeg' | 'image/png';
  readonly encodedBytes: Uint8Array;
}
export interface LiveFrameResult extends LiveFrameIdentity {
  readonly configurationVersion: string;
  readonly result: VisionResult;
  readonly inferenceDurationMs: number;
}
export interface LiveSessionMetrics {
  readonly captureFps: number;
  readonly inferenceFps: number;
  readonly discardedFrames: number;
  readonly inferenceDurationMs: number;
  /** Medida en el cliente desde captura hasta dibujo del resultado de ese fotograma. */
  readonly captureToDisplayMs: number;
}
