import { describe, expect, it } from 'vitest';
import { jpegSha256, matchesInferenceResponse } from '../../src/modules/live/response-contract';
import type { RequestedFrame } from '../../src/modules/live/response-contract';

const request: RequestedFrame = {
  sessionId: 'session-1', generation: 2, frameId: 3, capturedAtMonotonicMs: 1200,
  width: 640, height: 360
};
const sha = 'a'.repeat(64);
function reply() {
  return {
    ...request,
    configurationVersion: 'retail:yolo26n.pt:0.35',
    inferenceDurationMs: 45,
    image: { width: 640, height: 360, assetId: 'asset-3', contentHash: sha },
    coverage: { complete: true, missingClasses: [], detail: 'Contar personas visibles' },
    modelClasses: ['person', 'car'],
    result: {
      schemaVersion: 'vision-result-v1', analysisId: 'asset-3', origin: 'real',
      assetId: 'asset-3', sourceHash: sha, scenarioVersion: 'pilot-0.1',
      durationMs: 45, modelVersion: 'yolo26n.pt',
      detections: [{ id: 'person-1', classId: 'person', label: 'Persona', confidence: .87,
        box: { x: .1, y: .2, width: .3, height: .4 } }],
      masks: [], patterns: []
    }
  };
}
describe('Respuesta vinculada al fotograma JPEG exacto', () => {
  it('acepta solo una respuesta completa y válida', () => expect(matchesInferenceResponse(reply(), request, sha)).toBe(true));
  it('verifica SHA256 de los bytes exactos', async () => {
    expect(await jpegSha256(new Blob(['abc']))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
  it('descarta hash de otra captura', () => expect(matchesInferenceResponse(reply(), request, 'b'.repeat(64))).toBe(false));
  it.each(['sessionId', 'generation', 'frameId', 'capturedAtMonotonicMs'] as const)(
    'descarta una identidad equivocada: %s', field => {
      const r = reply() as Record<string, unknown>;
      r[field] = 'incorrecto';
      expect(matchesInferenceResponse(r, request, sha)).toBe(false);
    }
  );
  it('descarta una imagen con resolución incorrecta', () => {
    const r = reply();
    expect(matchesInferenceResponse({ ...r, image: { ...r.image, width: 800 } }, request, sha)).toBe(false);
  });
  it('no acepta un motor demo como inferencia real', () => {
    const r = reply();
    expect(matchesInferenceResponse({ ...r, result: { ...r.result, origin: 'demo' } }, request, sha)).toBe(false);
  });
  it('descarta cajas inválidas antes de dibujar', () => {
    const r = reply();
    r.result.detections[0].box.x = .99;
    expect(matchesInferenceResponse(r, request, sha)).toBe(false);
  });
  it('descarta respuesta sin lista de detecciones', () => {
    const r = reply();
    expect(matchesInferenceResponse({ ...r, result: { ...r.result, detections: undefined } }, request, sha)).toBe(false);
  });
  it('descarta ausencia de versión de modelo', () => {
    const r = reply();
    expect(matchesInferenceResponse({ ...r, result: { ...r.result, modelVersion: '' } }, request, sha)).toBe(false);
  });
});
