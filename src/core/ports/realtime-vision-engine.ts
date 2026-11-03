import type { Origin } from '../domain/model';
import type { LiveFrame, LiveFrameResult, LiveSessionSpec } from '../domain/realtime';
/** Especificación del puerto; todavía no existe un adaptador YOLO ni WebSocket conectado. */
export interface RealtimeVisionEngine {
  readonly origin: Origin;
  open(spec: LiveSessionSpec, options?: { readonly signal?: AbortSignal }): Promise<void>;
  analyzeFrame(frame: LiveFrame, options?: { readonly signal?: AbortSignal }): Promise<LiveFrameResult>;
  close(sessionId: string, generation: number): Promise<void>;
}
