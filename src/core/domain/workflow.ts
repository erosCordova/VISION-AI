import type { AnalysisEvent, AnalysisRecord, VisionResult } from './model';
import { DomainError } from './errors';
import { identifier, utc, validateRecord, validateResult } from './validation';
export function advanceAnalysis(record: AnalysisRecord, event: AnalysisEvent, completion?: VisionResult): AnalysisRecord {
  validateRecord(record); utc(event.occurredAt);
  if (record.input.analysisId !== event.analysisId || record.input.correlationId !== event.correlationId || event.occurredAt < record.updatedAt) throw new DomainError('STALE_EXECUTION');
  if (!Number.isSafeInteger(event.expectedVersion) || record.version !== event.expectedVersion) throw new DomainError('VERSION_CONFLICT');
  if (!['queued', 'processing', 'completed', 'failed'].includes(event.target)) throw new DomainError('INVALID_STATE');
  const permitted = record.status === 'queued' ? ['processing', 'failed'] : record.status === 'processing' ? ['completed', 'failed'] : [];
  if (!permitted.includes(event.target)) throw new DomainError('INVALID_TRANSITION');
  if (event.target === 'completed') {
    if (!completion) throw new DomainError('RESULT_NOT_COMMITTED');
    validateResult(completion, record.input);
  }
  if (event.target === 'failed') identifier(event.errorCode);
  else if (event.errorCode !== undefined) throw new DomainError('INVALID_STATE');
  return { ...record, result: event.target === 'completed' ? completion! : null, status: event.target, version: record.version + 1, updatedAt: event.occurredAt,
    errorCode: event.target === 'failed' ? event.errorCode! : null };
}
