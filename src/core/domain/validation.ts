import { DomainError } from './errors';
import type { AnalysisInput, AnalysisRecord, BoundingBox, VisionResult } from './model';

function fail(): never { throw new DomainError('INVALID_INPUT'); }
export function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail();
  return value as Record<string, unknown>;
}
export function identifier(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !value.trim() || value !== value.trim()) fail();
}
function finite(value: unknown): asserts value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) fail();
}
function positiveInteger(value: unknown): asserts value is number {
  if (!Number.isSafeInteger(value) || (value as number) <= 0) fail();
}
export function unit(value: unknown): asserts value is number {
  finite(value); if (value < 0 || value > 1) fail();
}
export function utc(value: unknown): asserts value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)) fail();
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value) fail();
}
export function validateBox(value: unknown): asserts value is BoundingBox {
  const b = object(value);
  unit(b.x); unit(b.y); unit(b.width); unit(b.height);
  if (b.width <= 0 || b.height <= 0 || b.x + b.width > 1 + 1e-9 || b.y + b.height > 1 + 1e-9) fail();
}
export function validateInput(value: unknown): asserts value is AnalysisInput {
  const a = object(value);
  for (const key of ['analysisId', 'correlationId', 'ownerId', 'organizationId']) identifier(a[key]);
  const source = object(a.source); identifier(source.assetId); identifier(source.contentHash);
  if (!/^[a-f0-9]{64}$/.test(source.contentHash as string) || source.orientation !== 'already-oriented') fail();
  positiveInteger(source.width); positiveInteger(source.height);
  if (source.width > 8192 || source.height > 8192 || source.width * source.height > 20_000_000) fail();
  const c = object(a.config);
  if (!['demo', 'real'].includes(c.origin as string) || !['detection', 'segmentation', 'patterns', 'combined'].includes(c.mode as string)) fail();
  unit(c.threshold);
  for (const key of ['scenarioId', 'scenarioVersion', 'ruleVersion']) identifier(c[key]);
  if (!Array.isArray(c.classIds) || !c.classIds.length) fail();
  c.classIds.forEach(identifier);
  if (new Set(c.classIds).size !== c.classIds.length) fail();
}
function list(value: unknown): unknown[] { if (!Array.isArray(value)) return fail(); return value; }
export function validateResult(value: unknown, input: AnalysisInput): asserts value is VisionResult {
  validateInput(input);
  try {
    const r = object(value);
    if (r.schemaVersion !== 'vision-result-v1' || r.analysisId !== input.analysisId
        || r.origin !== input.config.origin || r.assetId !== input.source.assetId
        || r.sourceHash !== input.source.contentHash || r.scenarioVersion !== input.config.scenarioVersion) fail();
    finite(r.durationMs); if (r.durationMs < 0) fail();
    if (r.origin === 'real') identifier(r.modelVersion);
    else if (r.modelVersion !== undefined) fail();
    const ids = new Set<string>();
    const register = (item: Record<string, unknown>, hasClass: boolean) => {
      identifier(item.id);
      if (ids.has(item.id)) fail();
      ids.add(item.id);
      if (hasClass) { identifier(item.classId); if (!input.config.classIds.includes(item.classId)) fail(); }
    };
    for (const value of list(r.detections)) {
      const d = object(value); register(d, true); identifier(d.label); unit(d.confidence); validateBox(d.box);
    }
    for (const value of list(r.masks)) {
      const m = object(value); register(m, true);
      if (m.instanceId !== undefined) identifier(m.instanceId);
      if (m.confidence !== undefined) unit(m.confidence);
      if (m.coordinateSpace !== 'oriented-original') fail();
      const data = object(m.mask); positiveInteger(data.width); positiveInteger(data.height);
      if (data.encoding !== 'binary-rle-row-v1' || data.width !== input.source.width || data.height !== input.source.height) fail();
      const counts = list(data.counts);
      if (!counts.length || counts.length > data.width * data.height + 1) fail();
      let total = 0;
      counts.forEach((count, index) => {
        if (!Number.isSafeInteger(count) || (count as number) < 0 || (index > 0 && count === 0)) fail();
        total += count as number;
      });
      if (total !== data.width * data.height) fail();
    }
    const evidenceIds = new Set(ids);
    for (const value of list(r.patterns)) {
      const p = object(value); register(p, false); identifier(p.label);
      if (p.ruleVersion !== input.config.ruleVersion || !['triggered', 'not-triggered', 'indeterminate'].includes(p.assessment as string)) fail();
      const refs = list(p.evidenceRefs); if (!refs.length || new Set(refs).size !== refs.length) fail();
      refs.forEach(ref => { identifier(ref); if (!evidenceIds.has(ref)) fail(); });
    }
  } catch { throw new DomainError('INVALID_RESULT'); }
}
export function validateRecord(value: unknown): asserts value is AnalysisRecord {
  const r = object(value); validateInput(r.input); utc(r.createdAt); utc(r.updatedAt);
  positiveInteger(r.version);
  if (r.updatedAt < r.createdAt || !['queued', 'processing', 'completed', 'failed'].includes(r.status as string)) fail();
  if (r.status === 'completed') {
    validateResult(r.result, r.input);
    if (r.errorCode !== null) fail();
  } else {
    if (r.result !== null) fail();
    if (r.status === 'failed') identifier(r.errorCode);
    else if (r.errorCode !== null) fail();
  }
}
