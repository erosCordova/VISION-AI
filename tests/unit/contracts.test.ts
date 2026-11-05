import { describe, it, expect } from 'vitest';
import { validateBox, validateInput, validateResult, utc } from '../../src/core/domain/validation';
import { toViewportBox } from '../../src/core/domain/geometry';
import fixture from '../../docs/fixtures/fase02.json';
import { input, result } from './factories';

describe('Contratos de entrada y geometría', () => {
  it('acepta una entrada canónica y no acepta booleanos como números', () => {
    expect(() => validateInput(input())).not.toThrow();
    const bad = structuredClone(input()) as unknown as { config: { threshold: unknown } };
    bad.config.threshold = true;
    expect(() => validateInput(bad)).toThrow();
  });
  it.each([NaN, Infinity, -0.1, 1.1])('rechaza confianza no válida %s', value => {
    const bad = { ...input(), config: { ...input().config, threshold: value } };
    expect(() => validateInput(bad)).toThrow();
  });
  it('rechaza duplicados de clase y fuentes sin huella correcta', () => {
    expect(() => validateInput({ ...input(), config: { ...input().config, classIds: ['person', 'person'] } })).toThrow();
    expect(() => validateInput({ ...input(), source: { ...input().source, contentHash: 'unverified' } })).toThrow();
  });
  it('limita dimensiones y píxeles antes del contrato de motor', () => {
    expect(() => validateInput({ ...input(), source: { ...input().source, width: 8193 } })).toThrow();
    expect(() => validateInput({ ...input(), source: { ...input().source, width: 8192, height: 8192 } })).toThrow();
  });
  it.each(fixture.viewports)('mantiene la fixture del visor $size', example => {
    const box = toViewportBox(fixture.person_box, 1000, 800, example.size[0]!, example.size[1]!);
    Object.values(box).forEach((value, i) => expect(value).toBeCloseTo(example.expected[i]!, 8));
  });
  it('rechaza cajas sin área o fuera de imagen y viewport sin tamaño', () => {
    expect(() => validateBox({ x: 0.9, y: 0, width: 0.2, height: 0.2 })).toThrow();
    expect(() => validateBox({ x: 0, y: 0, width: 0, height: 0.2 })).toThrow();
    expect(() => toViewportBox(fixture.person_box, 1000, 800, 0, 500)).toThrow();
  });
  it('exige UTC canónico y fechas existentes', () => {
    expect(() => utc('2026-11-03T00:00:00.000Z')).not.toThrow();
    expect(() => utc('2026-02-30T00:00:00.000Z')).toThrow();
    expect(() => utc('2026-11-03T00:00:00')).toThrow();
  });
});
describe('Contrato de resultados', () => {
  it('acepta resultado demo y real con versión', () => {
    expect(() => validateResult(result(), input())).not.toThrow();
    expect(() => validateResult(result('real'), input('real'))).not.toThrow();
  });
  it.each(['analysisId', 'assetId', 'sourceHash', 'scenarioVersion'] as const)('rechaza mezcla de identidad %s', key => {
    expect(() => validateResult({ ...result(), [key]: 'other' }, input())).toThrowError();
  });
  it('no permite cambiar de origen ni presentar semilla como modelo', () => {
    expect(() => validateResult(result('real'), input())).toThrow();
    expect(() => validateResult({ ...result(), modelVersion: 'invented' }, input())).toThrow();
    const { modelVersion: _version, ...withoutModel } = result('real');
    expect(() => validateResult(withoutModel, input('real'))).toThrow();
  });
  it('rechaza clase desconocida, IDs duplicados y duración negativa', () => {
    expect(() => validateResult({ ...result(), durationMs: -1 }, input())).toThrow();
    expect(() => validateResult({ ...result(), detections: [...result().detections, ...result().detections] }, input())).toThrow();
    expect(() => validateResult({ ...result(), detections: [{ ...result().detections[0]!, classId: 'unknown' }] }, input())).toThrow();
  });
  it('acepta máscara RLE sin primer plano sin confundirla con una puntuación', () => {
    const mask = { id: 'mask-1', classId: 'person', coordinateSpace: 'oriented-original', mask: { encoding: 'binary-rle-row-v1', width: 1000, height: 800, counts: [800000] } };
    expect(() => validateResult({ ...result(), masks: [mask] }, input())).not.toThrow();
  });
  it.each([[799999], [800001], [1, 0, 799999], [-1, 800001], [true, 799999]].map(counts => ({ counts })))('rechaza longitudes RLE $counts', ({ counts }) => {
    const mask = { id: 'mask-1', classId: 'person', coordinateSpace: 'oriented-original', mask: { encoding: 'binary-rle-row-v1', width: 1000, height: 800, counts } };
    expect(() => validateResult({ ...result(), masks: [mask] }, input())).toThrow();
  });
  it('rechaza máscara de otra resolución', () => {
    const mask = { id: 'mask-1', classId: 'person', coordinateSpace: 'oriented-original', mask: { encoding: 'binary-rle-row-v1', width: 10, height: 8, counts: [80] } };
    expect(() => validateResult({ ...result(), masks: [mask] }, input())).toThrow();
  });
  it('exige evidencia de patrones existente y regla versionada', () => {
    const pattern = { id: 'pattern-1', ruleVersion: '1.0.0', label: 'Revisión', assessment: 'indeterminate', evidenceRefs: ['person-1'] };
    expect(() => validateResult({ ...result(), patterns: [pattern] }, input())).not.toThrow();
    expect(() => validateResult({ ...result(), patterns: [{ ...pattern, evidenceRefs: ['missing'] }] }, input())).toThrow();
    expect(() => validateResult({ ...result(), patterns: [{ ...pattern, ruleVersion: 'other' }] }, input())).toThrow();
  });
});
