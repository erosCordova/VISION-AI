import { describe, it, expect } from 'vitest';
import { VolatileAnalysisRepository } from '../../src/infrastructure/persistence/volatile-analysis-repository';
import { record, result, t1, t2 } from '../unit/factories';
import type { AnalysisEvent } from '../../src/core/domain/model';
const start: AnalysisEvent = { analysisId: 'analysis-1', correlationId: 'request-1', target: 'processing', expectedVersion: 1, occurredAt: t1 };
async function processing() { const repo = new VolatileAnalysisRepository(); await repo.create(record()); await repo.transition('analysis-1', start); return repo; }

describe('Contrato del repositorio volátil', () => {
  it('no expone referencias mutables al registro guardado', async () => {
    const repo = new VolatileAnalysisRepository(), source = record(); await repo.create(source);
    Object.assign(source.input.config, { threshold: 0 });
    const loaded = await repo.get('analysis-1');
    expect(loaded?.input.config.threshold).toBe(0.85);
    Object.assign(loaded!.input.source, { assetId: 'modified' });
    expect((await repo.get('analysis-1'))?.input.source.assetId).toBe('asset-1');
  });
  it('rechaza creación repetida y registros que no empiezan en cola', async () => {
    const repo = new VolatileAnalysisRepository(); await repo.create(record());
    await expect(repo.create(record())).rejects.toMatchObject({ code: 'ALREADY_EXISTS' });
    await expect(new VolatileAnalysisRepository().create({ ...record(), status: 'processing' })).rejects.toMatchObject({ code: 'INVALID_STATE' });
  });
  it('no finaliza mediante transición sin resultado guardado', async () => {
    const repo = await processing();
    await expect(repo.transition('analysis-1', { ...start, target: 'completed', expectedVersion: 2, occurredAt: t2 })).rejects.toMatchObject({ code: 'RESULT_NOT_COMMITTED' });
    expect((await repo.get('analysis-1'))?.status).toBe('processing');
  });
  it('guarda resultado y estado en el mismo cambio', async () => {
    const repo = await processing(), output = result();
    const completed = await repo.commitResult('analysis-1', output, 2, t2);
    expect(completed.status).toBe('completed'); expect(completed.version).toBe(3);
    Object.assign(output, { durationMs: 999 });
    expect((await repo.get('analysis-1'))?.result?.durationMs).toBe(12);
  });
  it('resultado inválido deja intacto el registro y la versión', async () => {
    const repo = await processing(), before = await repo.get('analysis-1');
    await expect(repo.commitResult('analysis-1', { ...result(), sourceHash: 'other' }, 2, t2)).rejects.toMatchObject({ code: 'INVALID_RESULT' });
    expect(await repo.get('analysis-1')).toEqual(before);
  });
  it('solo una finalización concurrente gana la misma versión', async () => {
    const repo = await processing();
    const results = await Promise.allSettled([repo.commitResult('analysis-1', result(), 2, t2), repo.commitResult('analysis-1', result(), 2, t2)]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(r => r.status === 'rejected')).toHaveLength(1);
    expect((await repo.get('analysis-1'))?.version).toBe(3);
  });
  it('rechaza respuesta ajena, evento antiguo y estado terminal', async () => {
    const repo = await processing();
    await expect(repo.transition('analysis-1', { ...start, correlationId: 'other', expectedVersion: 2 })).rejects.toMatchObject({ code: 'STALE_EXECUTION' });
    await expect(repo.transition('analysis-1', { ...start, target: 'failed', errorCode: 'ENGINE_FAILED', expectedVersion: 1 })).rejects.toMatchObject({ code: 'VERSION_CONFLICT' });
    await repo.transition('analysis-1', { ...start, target: 'failed', errorCode: 'ENGINE_FAILED', expectedVersion: 2 });
    await expect(repo.transition('analysis-1', { ...start, expectedVersion: 3 })).rejects.toMatchObject({ code: 'INVALID_TRANSITION' });
  });
  it('una copia incompatible o corrupta no sustituye la actual', async () => {
    const repo = await processing(), before = await repo.exportSnapshot();
    for (const backup of [{ schemaVersion: 'future', records: [] }, { schemaVersion: 'analysis-repository-v1', records: [{}] }, { schemaVersion: 'analysis-repository-v1', records: [record(), record()] }]) {
      await expect(repo.restoreSnapshot(backup)).rejects.toMatchObject({ code: 'SNAPSHOT_INCOMPATIBLE' });
      expect(await repo.exportSnapshot()).toEqual(before);
    }
  });
  it('restaura una copia compatible y aísla sus objetos', async () => {
    const original = await processing(); await original.commitResult('analysis-1', result(), 2, t2);
    const backup = await original.exportSnapshot(), restored = new VolatileAnalysisRepository();
    await restored.restoreSnapshot(backup);
    expect(await restored.list()).toEqual(await original.list());
    Object.assign(backup.records[0]!.input.config, { threshold: 0 });
    expect((await restored.get('analysis-1'))?.input.config.threshold).toBe(0.85);
  });
  it('rechaza ID inexistente sin crear registro', async () => {
    const repo = new VolatileAnalysisRepository();
    expect(await repo.get('unknown')).toBeNull();
    await expect(repo.commitResult('unknown', result(), 1, t1)).rejects.toMatchObject({ code: 'NOT_FOUND' });
    expect(await repo.list()).toHaveLength(0);
  });
});
