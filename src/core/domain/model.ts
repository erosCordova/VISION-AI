export type AnalysisMode = 'detection' | 'segmentation' | 'patterns' | 'combined';
export type Origin = 'demo' | 'real';
export type AnalysisStatus = 'queued' | 'processing' | 'completed' | 'failed';
export interface BoundingBox { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
export interface SourceReference {
  readonly assetId: string;
  readonly contentHash: string;
  readonly width: number;
  readonly height: number;
  readonly orientation: 'already-oriented';
}
export interface AnalysisInput {
  readonly analysisId: string;
  readonly correlationId: string;
  readonly ownerId: string;
  readonly organizationId: string;
  readonly source: SourceReference;
  readonly config: {
    readonly origin: Origin;
    readonly mode: AnalysisMode;
    readonly threshold: number;
    readonly scenarioId: string;
    readonly scenarioVersion: string;
    readonly ruleVersion: string;
    readonly classIds: readonly string[];
  };
}
export interface Detection {
  readonly id: string; readonly classId: string; readonly label: string;
  readonly confidence: number; readonly box: BoundingBox;
}
export interface Segmentation {
  readonly id: string; readonly classId: string; readonly instanceId?: string;
  readonly confidence?: number;
  readonly coordinateSpace: 'oriented-original';
  readonly mask: {
    readonly encoding: 'binary-rle-row-v1';
    readonly width: number; readonly height: number; readonly counts: readonly number[];
  };
}
export interface Pattern {
  readonly id: string; readonly ruleVersion: string; readonly label: string;
  readonly assessment: 'triggered' | 'not-triggered' | 'indeterminate';
  readonly evidenceRefs: readonly string[];
}
export interface VisionResult {
  readonly schemaVersion: 'vision-result-v1';
  readonly analysisId: string; readonly origin: Origin;
  readonly assetId: string; readonly sourceHash: string;
  readonly scenarioVersion: string; readonly durationMs: number;
  readonly modelVersion?: string;
  readonly detections: readonly Detection[];
  readonly masks: readonly Segmentation[];
  readonly patterns: readonly Pattern[];
}
export interface AnalysisRecord {
  readonly input: AnalysisInput;
  readonly status: AnalysisStatus;
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly result: VisionResult | null;
  readonly errorCode: string | null;
}
export interface AnalysisEvent {
  readonly analysisId: string; readonly correlationId: string;
  readonly target: AnalysisStatus; readonly expectedVersion: number;
  readonly occurredAt: string; readonly errorCode?: string;
}
export interface RepositorySnapshot {
  readonly schemaVersion: 'analysis-repository-v1';
  readonly records: readonly AnalysisRecord[];
}
