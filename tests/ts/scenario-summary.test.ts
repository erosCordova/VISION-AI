import { describe, expect, it } from 'vitest';
import type { VisionResult } from '../../src/core/domain/model';
import { scenarioInsight } from '../../src/modules/live/scenario-summary';
const result = {
  detections: [
    { id: 'p1', classId: 'person', confidence: .9 },
    { id: 'p2', classId: 'person', confidence: .7 },
    { id: 'truck', classId: 'truck', confidence: .85 },
  ]
} as VisionResult;
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
