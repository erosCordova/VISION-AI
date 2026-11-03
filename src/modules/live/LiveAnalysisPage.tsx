import { useState } from 'react';
import { CameraPanel } from '../camera/CameraPanel';
import type { CameraStatus } from '../camera/CameraPanel';
import { cameraStep } from './live-workflow';
import { ResultFrameViewer } from './ResultFrameViewer';
import type { AnalyzedFrame } from './frame-guard';

interface Scenario {
  readonly id: string;
  readonly name: string;
  readonly classes: string;
  readonly rule: string;
}
interface Props {
  readonly scenarios: readonly Scenario[];
  readonly scenarioId: string;
  readonly onScenarioChange: (id: string) => void;
  readonly role: string;
  /** Sin adaptador YOLO, la aplicación pasa null; jamás se fabrica una detección. */
  readonly analyzedFrame?: AnalyzedFrame | null;
}
export function LiveAnalysisPage({ scenarios, scenarioId, onScenarioChange, role, analyzedFrame = null }: Props) {
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const selected = scenarios.find(item => item.id === scenarioId) ?? scenarios[0];
  if (!selected) return null;
  const camera = role === 'auditor'
    ? { status: 'waiting', label: 'Perfil de consulta', detail: 'El auditor no puede iniciar la cámara.' }
    : cameraStep(cameraStatus);
  return <>
    <section className="panel flow-panel" aria-label="Pasos para analizar un escenario">
      <div className="flow-heading"><div><span className="eyebrow">FLUJO DE TRABAJO</span><h2>De la cámara al resultado</h2></div><p>La cámara funciona como vista previa. La inferencia YOLO se incorporará después.</p></div>
      <ol className="flow-steps">
        <li className="flow-step complete"><span className="flow-number" aria-hidden="true">1</span><div><h3>Elegir escenario</h3><p>{selected.name}</p></div><span className="flow-state">Seleccionado</span></li>
        <li className={'flow-step '+camera.status}><span className="flow-number" aria-hidden="true">2</span><div><h3>{camera.label}</h3><p aria-live="polite">{camera.detail}</p></div><span className="flow-state">{camera.status === 'complete' ? 'Lista' : camera.status === 'attention' ? 'Revisar' : 'Cámara'}</span></li>
        <li className="flow-step unavailable"><span className="flow-number" aria-hidden="true">3</span><div><h3>Revisar resultados</h3><p>La detección, las máscaras y las alertas requieren conectar y validar YOLO.</p></div><span className="flow-state">Pendiente</span></li>
      </ol>
    </section>
    <div className="scenario-picker"><label htmlFor="scenario">Escenario seleccionado</label><select id="scenario" value={scenarioId} onChange={e => { setCameraStatus('idle'); onScenarioChange(e.target.value); }}>{scenarios.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}</select><span>Una cámara por sesión · sin grabación</span></div>
    <div className="analysis-grid">
      {role !== 'auditor'
        ? <CameraPanel key={scenarioId + role} scenario={selected.name} onStatusChange={setCameraStatus} />
        : <section className="panel empty-page"><h2>Perfil de consulta</h2><p>Este perfil permite revisar evidencia existente, pero no iniciar una cámara.</p></section>}
      <aside className="panel results-panel" aria-label="Resultados del escenario">
        <div className="result-title"><div><span className="eyebrow">PASO 3 · RESULTADOS</span><h2>Resultados del análisis</h2></div><span className="result-pending">YOLO no conectado</span></div>
        <p className="results-explainer">Este panel mostrará las predicciones del fotograma realmente procesado, no de la vista previa.</p>
        <div className="result-readiness"><strong>Esperando conexión con YOLO</strong><p>La vista previa no produce detecciones. Cuando exista inferencia validada, aquí se consultarán las clases, las reglas y el rendimiento.</p></div>
        <dl><dt>Clases previstas</dt><dd>{selected.classes}</dd><dt>Regla prevista</dt><dd>{selected.rule}</dd><dt>Rendimiento</dt><dd>Sin FPS ni latencias de inferencia medidos</dd></dl>
        <div className="subtle-note">Al integrar YOLO se mostrarán únicamente resultados asociados al fotograma analizado, con su fecha y antigüedad.</div>
      </aside>
    </div>
    <ResultFrameViewer frame={analyzedFrame} />
  </>;
}
