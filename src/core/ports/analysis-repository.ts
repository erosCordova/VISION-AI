import type { AnalysisEvent, AnalysisRecord, RepositorySnapshot } from '../domain/model';
export interface AnalysisRepository {
  create(record: AnalysisRecord): Promise<void>;
  get(id: string): Promise<AnalysisRecord | null>;
  list(): Promise<readonly AnalysisRecord[]>;
  transition(id: string, event: AnalysisEvent): Promise<AnalysisRecord>;
  commitResult(id: string, result: unknown, expectedVersion: number, occurredAt: string): Promise<AnalysisRecord>;
  exportSnapshot(): Promise<RepositorySnapshot>;
  restoreSnapshot(snapshot: unknown): Promise<void>;
}
