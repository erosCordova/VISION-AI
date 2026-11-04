import type { VisionResult } from '../../core/domain/model';

export interface ModelCoverage {
  readonly complete: boolean;
  readonly missingClasses: readonly string[];
  readonly detail: string;
}

export interface ScenarioInsight {
  readonly title: string;
  readonly amount: string;
  readonly status: 'measured' | 'partial' | 'unavailable';
  readonly explanation: string;
  readonly nextRule: string;
}

const titles: Record<string, string> = {
  retail: 'Personas visibles',
  safety: 'Personas detectadas',
  warehouse: 'Montacargas visibles',
  quality: 'Defectos detectados',
};
const count = (result: VisionResult, name: string) =>
  result.detections.filter(d => d.classId === name).length;

/**
 * No convierte una detección de objetos en una decisión empresarial.
 * Las faltas de EPP exigen asociación por persona; zonas y defectos, calibración.
 */
export function scenarioInsight(scenarioId: string, result: VisionResult | null, coverage: ModelCoverage | null): ScenarioInsight {
  if (!result || !coverage) return {
    title: titles[scenarioId] ?? 'Resultado del escenario',
    amount: '—', status: 'unavailable',
    explanation: 'Sin resultados válidos del modelo para este escenario.',
    nextRule: 'Selecciona una fuente y completa una inferencia con un modelo conectado.',
  };
  switch (scenarioId) {
    case 'retail':
      if (coverage.missingClasses.includes('person')) return {
        title: 'Personas visibles', amount: '—', status: 'unavailable',
        explanation: 'El modelo no incluye la clase persona.',
        nextRule: 'La ocupación por zona requiere configurar la región y validar cada detección.'
      };
      return {
        title: 'Personas visibles', amount: String(count(result, 'person')), status: 'measured',
        explanation: 'Conteo de detecciones de persona en el último fotograma; no de visitantes únicos.',
        nextRule: 'El aforo por zonas y el seguimiento temporal todavía no están validados.'
      };
    case 'safety':
      return {
        title: 'Personas detectadas',
        amount: coverage.missingClasses.includes('person') ? '—' : String(count(result, 'person')),
        status: coverage.complete ? 'partial' : 'unavailable',
        explanation: !coverage.complete
          ? 'El modelo no contiene todas las clases de equipos de protección exigidas.'
          : 'La presencia de personas no demuestra el cumplimiento de EPP.',
        nextRule: 'Casco y chaleco por persona: pendiente de asociación y validación contra oclusiones.'
      };
    case 'warehouse':
      return {
        title: 'Montacargas visibles',
        amount: coverage.missingClasses.includes('forklift') ? '—' : String(count(result, 'forklift')),
        status: coverage.complete ? 'partial' : 'unavailable',
        explanation: !coverage.complete
          ? 'No hay un modelo validado con la clase específica de montacargas.'
          : 'Se muestran detecciones de montacargas sin evaluar todavía la zona de riesgo.',
        nextRule: 'Entrada a zona restringida: pendiente de calibración espacial y comprobación.'
      };
    case 'quality':
      return {
        title: 'Defectos detectados',
        amount: coverage.missingClasses.includes('defect') ? '—' : String(count(result, 'defect')),
        status: coverage.complete ? 'partial' : 'unavailable',
        explanation: !coverage.complete
          ? 'No se pueden buscar defectos sin pesos entrenados para el producto.'
          : 'Un defecto detectado no certifica por sí mismo la calidad del producto.',
        nextRule: 'Se requiere segmentación, área afectada y validación de inspección completa.'
      };
    default:
      return {
        title: 'Resultado del escenario', amount: '—', status: 'unavailable',
        explanation: 'El escenario indicado no está definido.',
        nextRule: 'Selecciona un escenario configurado.'
      };
  }
}
