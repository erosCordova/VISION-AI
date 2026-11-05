import { describe, expect, it } from 'vitest';
import type { AnalyzedFrame } from '../../src/modules/analysis/validators/frame-guard';
import { decideFrame } from '../../src/modules/analysis/validators/frame-guard';

function frame(): AnalyzedFrame {
  return {
    identity: { sessionId: 'session-1', generation: 4, frameId: 15, capturedAtMonotonicMs: 1000 },
    configurationVersion: 'config-2',
    image: { url: 'blob:verified-frame', width: 4, height: 3, assetId: 'asset-15', contentHash: 'a'.repeat(64) },
    output: {
      sessionId: 'session-1', generation: 4, frameId: 15, capturedAtMonotonicMs: 1000,
      configurationVersion: 'config-2', inferenceDurationMs: 45,
      result: {
        schemaVersion: 'vision-result-v1', analysisId: 'analysis-15', origin: 'real',
        assetId: 'asset-15', sourceHash: 'a'.repeat(64), scenarioVersion: 'scenario-v1',
        durationMs: 45, modelVersion: 'YOLO-model-validated',
        detections: [{ id: 'person-1', classId: 'person', label: 'Persona', confidence: 0.9,
          box: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 } }],
        masks: [], patterns: []
      }
    }
  };
}
describe('Seguridad del visor por fotograma', () => {
  it('no inventa datos sin salida del motor', () => {
    expect(decideFrame(null, 2000, 1000).state).toBe('empty');
  });
  it('acepta solo el resultado del fotograma exacto y dentro de vigencia', () => {
    expect(decideFrame(frame(), 1500, 1000)).toEqual({ state: 'ready', ageMs: 500 });
    expect(decideFrame(frame(), 2000, 1000).state).toBe('ready');
  });
  it('oculta resultado caducado', () => expect(decideFrame(frame(), 2001, 1000).state).toBe('stale'));
  it.each(['sessionId', 'generation', 'frameId', 'capturedAtMonotonicMs'] as const)(
    'rechaza discrepancia de %s', key => {
      const original = frame();
      const output = { ...original.output, [key]: key === 'sessionId' ? 'otra' : -1 };
      expect(decideFrame({ ...original, output }, 1500, 1000).state).toBe('invalid');
    });
  it('rechaza una configuración anterior', () => {
    const f = frame();
    expect(decideFrame({ ...f, configurationVersion: 'config-3' }, 1500, 1000).state).toBe('invalid');
  });
  it('rechaza imagen correspondiente a otro recurso', () => {
    const f = frame();
    expect(decideFrame({ ...f, image: { ...f.image, contentHash: 'b'.repeat(64) } }, 1500, 1000).state).toBe('invalid');
  });
  it('no muestra resultados demo como si procedieran de YOLO real', () => {
    const f = frame();
    expect(decideFrame({ ...f, output: { ...f.output, result: { ...f.output.result, origin: 'demo', modelVersion: undefined } } }, 1500, 1000).state).toBe('invalid');
  });
  it('rechaza relojes y geometrías imposibles', () => {
    const f = frame();
    expect(decideFrame(f, 900, 1000).state).toBe('invalid');
    const output = { ...f.output, result: { ...f.output.result, detections: [{ ...f.output.result.detections[0], box: { x: 0.9, y: 0.9, width: 0.2, height: 0.2 } }] } };
    expect(decideFrame({ ...f, output }, 1500, 1000).state).toBe('invalid');
  });
  it('rechaza máscaras de dimensiones incompatibles', () => {
    const f = frame();
    const output = { ...f.output, result: { ...f.output.result, masks: [{ id: 'm1', classId: 'person', coordinateSpace: 'oriented-original' as const, mask: { encoding: 'binary-rle-row-v1' as const, width: 2, height: 2, counts: [0, 4] } }] } };
    expect(decideFrame({ ...f, output }, 1500, 1000).state).toBe('invalid');
  });
});
