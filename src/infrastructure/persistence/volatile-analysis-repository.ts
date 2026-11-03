import type { AnalysisEvent, AnalysisRecord, RepositorySnapshot } from '../../core/domain/model';
import type { AnalysisRepository } from '../../core/ports/analysis-repository';
import { DomainError } from '../../core/domain/errors';
import { object, validateRecord, validateResult } from '../../core/domain/validation';
import { advanceAnalysis } from '../../core/domain/workflow';
/** Adaptador VOLÁTIL de contrato. No sustituye IndexedDB ni conserva datos tras recarga. */
export class VolatileAnalysisRepository implements AnalysisRepository {
  private records = new Map<string, AnalysisRecord>();
  async create(record: AnalysisRecord): Promise<void> {
    validateRecord(record);
    if (record.status !== 'queued' || record.version !== 1) throw new DomainError('INVALID_STATE');
    const id = record.input.analysisId;
    if (this.records.has(id)) throw new DomainError('ALREADY_EXISTS');
    this.records.set(id, structuredClone(record));
  }
  async get(id: string): Promise<AnalysisRecord | null> { return structuredClone(this.records.get(id) ?? null); }
  async list(): Promise<readonly AnalysisRecord[]> { return structuredClone([...this.records.values()]); }
  private require(id: string): AnalysisRecord {
    const record = this.records.get(id);
    if (!record) throw new DomainError('NOT_FOUND');
    return record;
  }
  async transition(id: string, event: AnalysisEvent): Promise<AnalysisRecord> {
    const current = this.require(id);
    // Completar solo mediante commitResult: el cliente no puede afirmar que guardó el resultado.
    const next = advanceAnalysis(current, event);
    validateRecord(next);
    const snapshot = structuredClone(next);
    this.records.set(id, snapshot);
    return structuredClone(snapshot);
  }
  async commitResult(id: string, result: unknown, expectedVersion: number, occurredAt: string): Promise<AnalysisRecord> {
    const current = this.require(id);
    validateResult(result, current.input);
    const next = { ...advanceAnalysis(current, { analysisId: id, correlationId: current.input.correlationId,
      target: 'completed', expectedVersion, occurredAt }, result), result: structuredClone(result) };
    validateRecord(next);
    // Todo se prepara antes del único reemplazo. No hay await ni escritura parcial en esta sección.
    const snapshot = structuredClone(next);
    this.records.set(id, snapshot);
    return structuredClone(snapshot);
  }
  async exportSnapshot(): Promise<RepositorySnapshot> {
    return { schemaVersion: 'analysis-repository-v1', records: await this.list() };
  }
  async restoreSnapshot(snapshot: unknown): Promise<void> {
    let candidate: Map<string, AnalysisRecord>;
    try {
      const backup = object(snapshot);
      if (backup.schemaVersion !== 'analysis-repository-v1' || !Array.isArray(backup.records)) throw new Error();
      candidate = new Map();
      for (const item of backup.records) {
        validateRecord(item);
        const id = item.input.analysisId;
        if (candidate.has(id)) throw new Error();
        candidate.set(id, structuredClone(item));
      }
    } catch { throw new DomainError('SNAPSHOT_INCOMPATIBLE'); }
    this.records = candidate;
  }
}
