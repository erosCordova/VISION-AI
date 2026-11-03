import { describe, expect, it } from 'vitest';
import { cameraStep } from '../../src/modules/live/live-workflow';

describe('Flujo de cámara de Fase 6', () => {
  it.each([
    ['idle', 'waiting'],
    ['requesting', 'in-progress'],
    ['preview', 'complete'],
    ['paused', 'in-progress'],
    ['failed', 'attention']
  ] as const)('%s expresa el estado %s', (camera, expected) => {
    expect(cameraStep(camera).status).toBe(expected);
  });

  it('la vista previa no afirma que YOLO esté conectado', () => {
    const step = cameraStep('preview');
    expect(step.label).toBe('Cámara en vivo');
    expect(step.detail).toMatch(/aún no hay análisis YOLO/i);
  });
});
