import { describe, it, expect } from 'vitest';
import type { AnalysisInput, Origin } from '../../src/core/domain/model';
import type { VisionEngine } from '../../src/core/ports/vision-engine';
import { requestVisionResult } from '../../src/core/application/request-vision-result';
import { UnavailableVisionEngine } from '../../src/infrastructure/vision/unavailable-vision-engine';
import { parseConfig } from '../../src/shared/config';
import { input, result } from './factories';
class FixtureEngine implements VisionEngine {
  constructor(readonly origin: Origin) {}
  async analyze(_input: AnalysisInput) { return result(this.origin); }
}
describe('Inversión de dependencias y configuración', () => {
  it.each(['demo', 'real'] as const)('sustituye adaptador %s sin cambiar el consumidor', async origin => {
    const output = await requestVisionResult(new FixtureEngine(origin), input(origin));
    expect(output.origin).toBe(origin); expect(output.analysisId).toBe('analysis-1');
  });
  it('no muta la entrada original cuando un motor modifica su copia', async () => {
    const request = input();
    const engine: VisionEngine = { origin: 'demo', async analyze(copy) { Object.assign(copy.config, { threshold: 0 }); return result(); } };
    await requestVisionResult(engine, request); expect(request.config.threshold).toBe(0.85);
  });
  it('rechaza cambio de origen y salida ajena al contrato', async () => {
    await expect(requestVisionResult(new FixtureEngine('demo'), input('real'))).rejects.toMatchObject({ code: 'INVALID_CONFIGURATION' });
    const engine: VisionEngine = { origin: 'demo', async analyze() { return { ...result(), assetId: 'other' }; } };
    await expect(requestVisionResult(engine, input())).rejects.toMatchObject({ code: 'INVALID_RESULT' });
  });
  it('respeta cancelación antes de invocar y tras respuesta tardía', async () => {
    const controller = new AbortController(); controller.abort();
    await expect(requestVisionResult(new FixtureEngine('demo'), input(), controller.signal)).rejects.toMatchObject({ code: 'OPERATION_ABORTED' });
    const pending = new AbortController();
    const engine: VisionEngine = { origin: 'demo', async analyze() { pending.abort(); return result(); } };
    await expect(requestVisionResult(engine, input(), pending.signal)).rejects.toMatchObject({ code: 'OPERATION_ABORTED' });
  });
  it('el motor no conectado falla explícitamente sin fabricar resultados', async () => {
    await expect(requestVisionResult(new UnavailableVisionEngine('demo'), input())).rejects.toMatchObject({ code: 'ENGINE_UNAVAILABLE' });
  });
  it('modo demo es predeterminado y real necesita URL', () => {
    expect(parseConfig({})).toEqual({ origin: 'demo', apiBaseUrl: null });
    expect(() => parseConfig({ VITE_VISION_MODE: 'real' })).toThrow();
    expect(parseConfig({ VITE_VISION_MODE: 'real', VITE_VISION_API_BASE_URL: 'https://vision.example/api/' }).apiBaseUrl).toBe('https://vision.example/api');
    expect(parseConfig({ VITE_VISION_MODE: 'real', VITE_VISION_API_BASE_URL: 'http://localhost:8010' }).origin).toBe('real');
  });
  it.each(['javascript:alert(1)', 'http://public.example', 'https://user:password@example.com', 'https://example.com/?token=secret', 'https://example.com/#fragment'])('rechaza configuración insegura %s', url => {
    expect(() => parseConfig({ VITE_VISION_MODE: 'real', VITE_VISION_API_BASE_URL: url })).toThrow();
  });
  it('rechaza modo inválido o variable URL no textual', () => {
    expect(() => parseConfig({ VITE_VISION_MODE: 'invented' })).toThrow();
    expect(() => parseConfig({ VITE_VISION_API_BASE_URL: true })).toThrow();
  });
});
