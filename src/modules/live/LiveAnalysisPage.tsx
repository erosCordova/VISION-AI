import { useRef, useState } from 'react';
import type { CameraStatus } from '../camera/CameraPanel';
import { CameraPanel } from '../camera/CameraPanel';
import { SimulationVideoPanel } from './SimulationVideoPanel';
import { LiveInferencePanel } from './LiveInferencePanel';
import { ResultFrameViewer } from './ResultFrameViewer';
import { InteractiveSimulator } from './InteractiveSimulator';
import { validScenario } from './simulation-engine';
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
type SourceKind = 'simulator' | 'video' | 'camera';

export function LiveAnalysisPage({ scenarios, scenarioId, onScenarioChange, role, apiBaseUrl }: Props) {
  const [source, setSource] = useState<SourceKind>('simulator');
  const [sourceStatus, setSourceStatus] = useState<CameraStatus>('idle');
  const [analyzedFrame, setAnalyzedFrame] = useState<AnalyzedFrame | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const selected = scenarios.find(item => item.id === scenarioId) ?? scenarios[0];
  if (!selected) return null;
  const sourceStep = role === 'auditor'
    ? { status: 'waiting', label: 'Perfil de consulta', detail: 'El auditor no puede activar la cámara ni enviar fotogramas.' }
    : cameraStep(sourceStatus);
  const hasResult = analyzedFrame !== null && performance.now() - analyzedFrame.identity.capturedAtMonotonicMs <= 1000;
  const selectSource = (next: SourceKind) => {
    setSourceStatus('idle');
    setAnalyzedFrame(null);
    setSource(next);
  };
  const selectScenario = (nextId: string) => {
    setSourceStatus('idle');
    setAnalyzedFrame(null);
    onScenarioChange(nextId);
  };
  return <>
    <div className="simulation-source-tabs" role="group" aria-label="Modalidad de simulación y análisis">
      <button aria-pressed={source === 'simulator'} onClick={() => selectSource('simulator')}>◈ Simulador interactivo</button>
      <button aria-pressed={source === 'video'} onClick={() => selectSource('video')}>▣ Video con YOLO</button>
      <button aria-pressed={source === 'camera'} onClick={() => selectSource('camera')}>◎ Cámara con YOLO</button>
    </div>

    {source === 'simulator' ? <InteractiveSimulator
      scenarioId={validScenario(scenarioId) ? scenarioId : 'safety'}
      onScenarioChange={selectScenario}
    /> : <>
      <section className="panel flow-panel" aria-label="Pasos del análisis con YOLO">
        <div className="flow-heading">
          <div><span className="eyebrow">INFERENCIA CON MODELO REAL</span><h2>De la fuente al análisis YOLO</h2></div>
          <p>Selecciona el escenario, activa la fuente y analiza solo cuando exista un motor disponible.</p>
        </div>
        <ol className="flow-steps">
          <li className="flow-step complete"><span className="flow-number" aria-hidden="true">1</span>
            <div><h3>Elegir escenario</h3><p>{selected.name}</p></div><span className="flow-state">Seleccionado</span></li>
          <li className={'flow-step ' + sourceStep.status}><span className="flow-number" aria-hidden="true">2</span>
            <div><h3>{source === 'video' ? 'Video real' : sourceStep.label}</h3>
              <p>{source === 'video' && sourceStatus === 'idle' ? 'Carga un video desde tu equipo.' : sourceStep.detail}</p>
            </div><span className="flow-state">{sourceStatus === 'preview' ? 'En reproducción' : 'Fuente'}</span></li>
          <li className={'flow-step ' + (hasResult ? 'complete' : 'unavailable')}><span className="flow-number" aria-hidden="true">3</span>
            <div><h3>Resultados del modelo</h3><p>{hasResult ? 'Resultado válido de YOLO listo para revisión.' :
              'Necesita un backend real compatible: Render Free no ejecuta YOLO.'}</p></div>
            <span className="flow-state">{hasResult ? 'Procesado' : 'Pendiente'}</span></li>
        </ol>
      </section>
      <div className="scenario-picker"><label htmlFor="scenario">Escenario seleccionado</label>
        <select id="scenario" value={scenarioId} onChange={e => selectScenario(e.target.value)}>
          {scenarios.map(item => <option value={item.id} key={item.id}>{item.name}</option>)}
        </select><span>Una fuente activa por simulación</span>
      </div>
      <div className="analysis-grid">
        {role !== 'auditor' ? (
          source === 'video' ?
            <SimulationVideoPanel key={'video-' + scenarioId} videoRef={videoRef} scenario={selected.name} onStatusChange={setSourceStatus}/> :
            <CameraPanel key={'camera-' + scenarioId} scenario={selected.name} videoRef={videoRef} onStatusChange={setSourceStatus}/>
        ) : <section className="panel empty-page"><h2>Perfil de consulta</h2>
          <p>El auditor no puede activar fuentes ni enviar fotogramas al motor.</p></section>}
        <aside className="panel results-panel">
          <span className="eyebrow">ALCANCE DEL MODELO</span><h2>{selected.name}</h2>
          <dl><dt>Clases requeridas</dt><dd>{selected.classes}</dd>
            <dt>Regla especializada prevista</dt><dd>{selected.rule}</dd>
            <dt>Motor real</dt><dd>YOLO necesita pesos comprobados y un servidor o navegador capaz de inferir.</dd></dl>
          <div className="subtle-note">Las cajas, porcentajes y eventos del Simulador 2D no proceden de esta fuente ni del detector real.</div>
        </aside>
      </div>
      {role !== 'auditor' && <LiveInferencePanel key={scenarioId + '-' + source}
        videoRef={videoRef} sourceStatus={sourceStatus}
        scenarioId={scenarioId} apiBaseUrl={apiBaseUrl} onFrame={setAnalyzedFrame}/>}
      <ResultFrameViewer frame={analyzedFrame}/>
    </>}
  </>;
}
