import { describe, expect, it } from 'vitest';
import { inferenceFps, retainRecentFrames } from '../../src/modules/live/analysis-metrics';
describe('Métricas de inferencia: respuestas verificadas', () => {
  it('no inventa FPS con una sola respuesta', () => expect(inferenceFps([1000])).toBeNull());
  it('calcula frecuencia en el intervalo entre respuestas', () => {
    expect(inferenceFps([1000, 1500, 2000])).toBe(2);
    expect(inferenceFps([1000, 1100, 1200])).toBe(10);
  });
  it('rechaza marcas inválidas o repetidas', () => {
    expect(inferenceFps([100, 100])).toBeNull();
    expect(inferenceFps([100, NaN])).toBeNull();
    expect(inferenceFps([100, 300, 200])).toBeNull();
  });
  it('descarta muestras antiguas y acota la memoria', () => {
    expect(retainRecentFrames([100, 5900, 6300], 7000)).toEqual([5900, 6300, 7000]);
    expect(retainRecentFrames(Array.from({ length: 40 }, (_, i) => i * 100), 4100)).toHaveLength(20);
  });
});
