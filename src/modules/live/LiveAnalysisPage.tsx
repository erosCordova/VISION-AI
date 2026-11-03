import { useRef, useState } from 'react';
import type { CameraStatus } from '../camera/CameraPanel';
import { CameraPanel } from '../camera/CameraPanel';
import { SimulationVideoPanel } from './SimulationVideoPanel';
import { LiveInferencePanel } from './LiveInferencePanel';
import { ResultFrameViewer } from './ResultFrameViewer';
import { cameraStep } from './live-workflow';
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
  readonly apiBaseUrl: string | null;
}
type SourceKind = 'video' | 'camera';

export function LiveAnalysisPage({ scenarios, scenarioId, onScenarioChange, role, apiBaseUrl }: Props) {
  const [source, setSource] = useState<SourceKind>('video');
  const [sourceStatus, setSourceStatus] = useState<CameraStatus>('idle');
  const [analyzedFrame, setAnalyzedFrame] = useState<AnalyzedFrame | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const selected = scenarios.find(item => item.id === scenarioId) ?? scenarios[0];
  if (!selected) return null;
  const sourceStep = role === 'auditor'
    ? { status: 'waiting', label: 'Perfil de consulta', detail: 'El auditor no puede iniciar la cámara ni enviar fotogramas.' }
    : cameraStep(sourceStatus);
  const hasResult = analyzedFrame !== null && performance.now() - analyzedFrame.identity.capturedAtMonotonicMs <= 1000;
  const selectSource = (next: SourceKind) => {
    setSourceStatus('idle'); setAnalyzedFrame(null); setSource(next);
  };
  const selectScenario = (nextId: string) => {
    setSourceStatus('idle'); setAnalyzedFrame(null); onScenarioChange(nextId);
  };

  return <>
    <section className="panel flow-panel" aria-label="Pasos de la simulación">
      <div className="flow-heading"><div><span className="eyebrow">SIMULACIÓN CON INTELIGENCIA ARTIFICIAL</span><h2>De la escena al análisis real</h2></div>
        <p>Reproduce un video en bucle o conecta tu cámara. YOLO ejecuta inferencias al iniciar el análisis.</p>
      </div>
      <ol className="flow-steps">
        <li className="flow-step complete"><span className="flow-number" aria-hidden="true">1</span><div><h3>Elegir escenario</h3><p>{selected.name}</p></div><span className="flow-state">Seleccionado</span></li>
        <li className={'flow-step ' + sourceStep.status}><span className="flow-number" aria-hidden="true">2</span><div><h3>{source === 'video' ? 'Video de simulación' : sourceStep.label}</h3><p>{source === 'video' && sourceStatus === 'idle' ? 'Carga un video de tu equipo.' : sourceStep.detail}</p></div>
          <span className="flow-state">{sourceStatus === 'preview' ? 'En reproducción' : 'Fuente'}</span></li>
        <li className={'flow-step ' + (hasResult ? 'complete' : 'unavailable')}><span className="flow-number" aria-hidden="true">3</span><div><h3>Analizar en tiempo real</h3><p>{hasResult ? 'Resultado de YOLO disponible para revisión.' : 'Activa el motor local para procesar fotogramas reales.'}</p></div><span className="flow-state">{hasResult ? 'Procesado' : 'Pendiente'}</span></li>
      </ol>
    </section>
    <div className="scenario-picker"><label htmlFor="scenario">Escenario seleccionado</label>
      <select id="scenario" value={scenarioId} onChange={e => selectScenario(e.target.value)}>
        {scenarios.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}
      </select><span>Una fuente activa por simulación</span>
    </div>
    <div className="simulation-source-tabs" role="group" aria-label="Origen de la simulación">
      <button aria-pressed={source === 'video'} onClick={() => selectSource('video')}>Video en bucle</button>
      <button aria-pressed={source === 'camera'} onClick={() => selectSource('camera')}>Cámara en vivo</button>
    </div>
    <div className="analysis-grid">
      {role !== 'auditor' ? (
        source === 'video' ?
          <SimulationVideoPanel key={'video-' + scenarioId} videoRef={videoRef} scenario={selected.name} onStatusChange={setSourceStatus} /> :
          <CameraPanel key={'camera-' + scenarioId} scenario={selected.name} videoRef={videoRef} onStatusChange={setSourceStatus} />
      ) : <section className="panel empty-page"><h2>Perfil de consulta</h2><p>El auditor no puede activar fuentes ni enviar fotogramas al motor.</p></section>}
      <aside className="panel results-panel">
        <span className="eyebrow">ALCANCE DEL ESCENARIO</span><h2>{selected.name}</h2>
        <dl><dt>Clases que necesita el escenario</dt><dd>{selected.classes}</dd>
          <dt>Regla especializada prevista</dt><dd>{selected.rule}</dd>
          <dt>Primer piloto</dt><dd>Detección de objetos que el modelo realmente conozca, sin inventar casco, montacargas o defectos.</dd></dl>
        <div className="subtle-note">Los modelos generales no certifican EPP, zonas peligrosas ni defectos. Los pesos especializados y las reglas se validarán con datasets propios.</div>
      </aside>
    </div>
    {role !== 'auditor' && <LiveInferencePanel key={scenarioId + '-' + source} videoRef={videoRef} sourceStatus={sourceStatus}
      scenarioId={scenarioId} apiBaseUrl={apiBaseUrl} onFrame={setAnalyzedFrame}/>}
    <ResultFrameViewer frame={analyzedFrame} />
  </>;
}
