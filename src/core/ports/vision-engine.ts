import type { AnalysisInput, Origin } from '../domain/model';
export interface VisionEngine {
  readonly origin: Origin;
  analyze(input: AnalysisInput, options?: { readonly signal?: AbortSignal }): Promise<unknown>;
}
