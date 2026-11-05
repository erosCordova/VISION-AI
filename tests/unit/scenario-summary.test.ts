import { describe, expect, it } from 'vitest';
import type { VisionResult } from '../../src/core/domain/model';
import { scenarioInsight } from '../../src/modules/scenarios/services/scenario-summary';
const result: VisionResult = {
  schemaVersion: 'vision-result-v1', analysisId: 'analysis-1', origin: 'real',
  assetId: 'asset-1', sourceHash: 'a'.repeat(64), scenarioVersion: '1.0.0',
  durationMs: 20, modelVersion: 'yolo26n.pt',
  detections: [
    { id: 'p1', classId: 'person', label: 'Persona', confidence: .9,
      box: { x: .1, y: .1, width: .1, height: .5 } },
    { id: 'p2', classId: 'person', label: 'Persona', confidence: .7,
      box: { x: .5, y: .1, width: .1, height: .5 } },
    { id: 'truck', classId: 'truck', label: 'Camión', confidence: .85,
      box: { x: .2, y: .6, width: .3, height: .3 } },
  ],
  masks: [], patterns: []
};
const coverage = (missingClasses: string[] = []) => ({
  complete: !missingClasses.length, missingClasses, detail: ''
});
describe('Lectura empresarial fiel a los resultados de YOLO', () => {
  it('retail cuenta personas visibles y no visitantes únicos', () => {
    const view = scenarioInsight('retail', result, coverage());
    expect(view.amount).toBe('2');
    expect(view.status).toBe('measured');
    expect(view.explanation).toMatch(/no de visitantes únicos/);
  });
  it('sin clase persona no afirma que el local esté vacío', () => {
    expect(scenarioInsight('retail', result, coverage(['person'])).amount).toBe('—');
  });
  it('seguridad no determina cumplimiento EPP por contar personas', () => {
    const view = scenarioInsight('safety', result, coverage(['helmet', 'vest']));
    expect(view.status).toBe('unavailable');
    expect(view.nextRule).toMatch(/pendiente/);
  });
  it('camión genérico no equivale a montacargas', () => {
    const view = scenarioInsight('warehouse', result, coverage(['forklift']));
    expect(view.amount).toBe('—');
  });
  it('sin pesos específicos no presenta productos como defectuosos', () => {
    expect(scenarioInsight('quality', result, coverage(['defect'])).amount).toBe('—');
  });
  it('sin inferencia permanece vacío', () => {
    expect(scenarioInsight('retail', null, null).status).toBe('unavailable');
  });
});
