import type { AnalysisInput, AnalysisRecord, VisionResult } from '../../src/core/domain/model';
export const t0 = '2026-11-03T00:00:00.000Z';
export const t1 = '2026-11-03T00:00:01.000Z';
export const t2 = '2026-11-03T00:00:02.000Z';
export function input(origin: 'demo' | 'real' = 'demo'): AnalysisInput {
  return { analysisId: 'analysis-1', correlationId: 'request-1', ownerId: 'user-1', organizationId: 'org-1',
    source: { assetId: 'asset-1', contentHash: 'a'.repeat(64), width: 1000, height: 800, orientation: 'already-oriented' },
    config: { origin, mode: 'combined', threshold: 0.85, scenarioId: 'industrial-safety', scenarioVersion: '1.0.0', ruleVersion: '1.0.0', classIds: ['person', 'helmet'] } };
}
export function record(): AnalysisRecord {
  return { input: input(), status: 'queued', version: 1, createdAt: t0, updatedAt: t0, result: null, errorCode: null };
}
export function result(origin: 'demo' | 'real' = 'demo'): VisionResult {
  return { schemaVersion: 'vision-result-v1', analysisId: 'analysis-1', origin, assetId: 'asset-1', sourceHash: 'a'.repeat(64),
    scenarioVersion: '1.0.0', durationMs: 12, ...(origin === 'real' ? { modelVersion: 'validated-model-v1' } : {}),
    detections: [{ id: 'person-1', classId: 'person', label: 'Persona', confidence: 0.9, box: { x: 0.2, y: 0.15, width: 0.3, height: 0.7 } }],
    masks: [], patterns: [] };
}
