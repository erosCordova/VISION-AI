import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { CameraStatus } from '../camera/CameraPanel';
import type { AnalyzedFrame } from './frame-guard';
import { inferenceFps, retainRecentFrames } from './analysis-metrics';
import { jpegSha256, matchesInferenceResponse } from './response-contract';
import { scenarioInsight } from './scenario-summary';
import type { ModelCoverage } from './scenario-summary';

type ServerState = 'unconfigured' | 'checking' | 'online' | 'limited' | 'offline';
interface Props {
  videoRef: RefObject<HTMLVideoElement | null>;
  sourceStatus: CameraStatus;
  scenarioId: string;
  apiBaseUrl: string | null;
  onFrame: (frame: AnalyzedFrame | null) => void;
}

export function LiveInferencePanel({ videoRef, sourceStatus, scenarioId, apiBaseUrl, onFrame }: Props) {
  const [running, setRunning] = useState(false);
  const [serverState, setServerState] = useState<ServerState>('unconfigured');
  const [retry, setRetry] = useState(0);
  const [error, setError] = useState('');
  const [coverage, setCoverage] = useState<ModelCoverage | null>(null);
  const [lastResult, setLastResult] = useState<AnalyzedFrame['output']['result'] | null>(null);
  const [inferenceMs, setInferenceMs] = useState<number | null>(null);
  const [roundTripMs, setRoundTripMs] = useState<number | null>(null);
  const [fps, setFps] = useState<number | null>(null);
  const [frames, setFrames] = useState(0);
  const [lastFrameId, setLastFrameId] = useState<number | null>(null);
  const generation = useRef(0);
  const imageUrlRef = useRef<string | null>(null);
  const times = useRef<number[]>([]);

  useEffect(() => {
    if (!apiBaseUrl) { setServerState('unconfigured'); return; }
    setServerState('checking');
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 7000);
    void fetch(apiBaseUrl + '/api/v1/health', { signal: abort.signal, cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw Error('Servidor no disponible');
        const data: unknown = await response.json();
        if (!data || typeof data !== 'object' || !('ok' in data) || data.ok !== true) {
          throw Error('Respuesta de salud no válida');
        }
        if (!abort.signal.aborted) {
          const capability = 'inferenceAvailable' in data ? data.inferenceAvailable : false;
          setServerState(capability === true ? 'online' : 'limited');
        }
      })
      .catch(() => { if (!abort.signal.aborted) setServerState('offline'); })
      .finally(() => clearTimeout(timeout));
    return () => { abort.abort(); clearTimeout(timeout); };
  }, [apiBaseUrl, retry]);

  const canStart = serverState === 'online' && sourceStatus === 'preview';
  useEffect(() => {
    if (sourceStatus !== 'preview' || serverState !== 'online') setRunning(false);
  }, [sourceStatus, serverState]);

  useEffect(() => {
    if (!running || !canStart || !apiBaseUrl) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const abort = new AbortController();
    const session = crypto.randomUUID();
    const currentGeneration = ++generation.current;
    let frameId = 0;
    const canvas = document.createElement('canvas');

    async function tick() {
      if (cancelled) return;
      const video = videoRef.current;
      if (!video || video.paused || video.readyState < 2 || !video.videoWidth || !video.videoHeight) {
        timer = setTimeout(() => { void tick(); }, 250);
        return;
      }
      const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) { setError('No se pudo preparar la captura del video.'); setRunning(false); return; }
      const capturedAtMonotonicMs = performance.now();
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
      if (!blob || cancelled) return;
      const currentFrameId = ++frameId;
      const requested = {
        sessionId: session, generation: currentGeneration,
        frameId: currentFrameId, capturedAtMonotonicMs,
        width: canvas.width, height: canvas.height
      };
      const params = new URLSearchParams({
        scenario: scenarioId, session, generation: String(currentGeneration),
        frameId: String(currentFrameId), capturedAtMonotonicMs: String(capturedAtMonotonicMs)
      });
      try {
        const hashPromise = jpegSha256(blob);
        const response = await fetch(apiBaseUrl + '/api/v1/infer?' + params, {
          method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: blob, signal: abort.signal
        });
        if (!response.ok) {
          const info: unknown = await response.json().catch(() => ({}));
          const message = info && typeof info === 'object' && 'detail' in info && typeof info.detail === 'string'
            ? info.detail : 'El servidor no pudo procesar este fotograma.';
          throw Error(message);
        }
        const value: unknown = await response.json();
        const sourceHash = await hashPromise;
        if (cancelled) return;
        if (!matchesInferenceResponse(value, requested, sourceHash)) {
          throw Error('El resultado recibido no es válido.');
        }
        const url = URL.createObjectURL(blob);
        const previous = imageUrlRef.current;
        imageUrlRef.current = url;
        onFrame({
          identity: { sessionId: session, generation: currentGeneration, frameId: currentFrameId, capturedAtMonotonicMs },
          configurationVersion: value.configurationVersion,
          image: { ...value.image, url },
          output: { sessionId: session, generation: currentGeneration, frameId: currentFrameId,
                    capturedAtMonotonicMs, configurationVersion: value.configurationVersion,
                    inferenceDurationMs: value.inferenceDurationMs, result: value.result }
        });
        if (previous) setTimeout(() => URL.revokeObjectURL(previous), 500);
        const completed = performance.now();
        times.current = retainRecentFrames(times.current, completed);
        setCoverage(value.coverage);
        setLastResult(value.result);
        setInferenceMs(value.inferenceDurationMs);
        setRoundTripMs(Math.round(completed - capturedAtMonotonicMs));
        setFps(inferenceFps(times.current));
        setLastFrameId(currentFrameId);
        setFrames(currentFrameId);
        setError('');
      } catch (e) {
        if (!cancelled) {
          setError('No se pudo analizar la imagen. Intenta de nuevo.');
          setRunning(false);
        }
        return;
      }
      if (!cancelled) timer = setTimeout(() => { void tick(); }, 200);
    }
    void tick();
    return () => {
      cancelled = true;
      abort.abort();
      if (timer) clearTimeout(timer);
      onFrame(null);
      if (imageUrlRef.current) { URL.revokeObjectURL(imageUrlRef.current); imageUrlRef.current = null; }
    };
  }, [running, canStart, apiBaseUrl, scenarioId, videoRef, onFrame]);

  const insight = scenarioInsight(scenarioId, lastResult, coverage);
  const connectionLabel: Record<ServerState,string> = {
    unconfigured: 'No disponible',
    checking: 'Comprobando conexión',
    online: 'Conexión disponible',
    limited: 'Reconocimiento no disponible',
    offline: 'Sin conexión'
  };

  return <section className="panel inference-controls" aria-label="Motor de análisis en tiempo real">
    <div className="panel-heading"><div><span className="eyebrow">ANÁLISIS EN DIRECTO</span><h2>Reconocimiento de objetos</h2></div>
      <span className={'status ' + (running && frames ? 'live' : '')} role="status"><i />
        {running ? (frames ? 'Analizando video' : 'Esperando primera inferencia') : 'Análisis detenido'}
      </span>
    </div>
    <p>La imagen se analiza mientras el video continúa reproduciéndose.</p>
    <div className="inference-connection" role="status">
      <span className={serverState === 'online' || serverState === 'limited' ? 'connection-online' : 'connection-offline'}>{connectionLabel[serverState]}</span>
      
      {apiBaseUrl && serverState !== 'checking' &&
        <button onClick={() => setRetry(value => value + 1)}>Comprobar de nuevo</button>}
    </div>
    <div className="inference-actions">
      {!running && <button className="primary" disabled={!canStart} onClick={() => {
        setError(''); setCoverage(null); setLastResult(null);
        setInferenceMs(null); setRoundTripMs(null); setFps(null);
        setLastFrameId(null); setFrames(0); times.current = [];
        setRunning(true);
      }}>Iniciar reconocimiento</button>}
      {running && <button onClick={() => setRunning(false)}>Detener análisis</button>}
      <span>{sourceStatus !== 'preview' ? 'Primero inicia la reproducción del video o la cámara.' :
        serverState !== 'online' ? 'No hay conexión para analizar las imágenes.' :
        'Los fotogramas se envían exclusivamente mientras el análisis está activo.'}</span>
    </div>
    {error && <p role="alert" className="error">{error}</p>}
    <div className="simulation-metrics">
      <div><span>Fotogramas válidos</span><strong>{frames || '—'}</strong></div>
      <div><span>Tiempo de análisis</span><strong>{inferenceMs === null ? '—' : Math.round(inferenceMs) + ' ms'}</strong></div>
      <div><span>Imágenes por segundo</span><strong>{fps === null ? '—' : fps.toFixed(1) + ' imágenes/s'}</strong></div>
      <div><span>Captura a recepción</span><strong>{roundTripMs === null ? '—' : roundTripMs + ' ms'}</strong></div>
      <div><span>Última imagen</span><strong>{lastFrameId ?? '—'}</strong></div>
    </div>
    {lastResult && <div className={'scenario-insight ' + insight.status} aria-live="polite">
      <div><span className="eyebrow">LECTURA DEL ESCENARIO</span><h3>{insight.title}</h3><strong>{insight.amount}</strong></div>
      <div><p>{insight.explanation}</p><p><b>Regla siguiente:</b> {insight.nextRule}</p></div>
    </div>}
    {coverage && <p className={coverage.complete ? 'simulation-coverage' : 'simulation-coverage warning'} role="status">
      {coverage.complete
        ? 'El resultado requiere revisión visual.'
        : 'Este modo no reconoce todas las clases esperadas.'}
    </p>}
    {serverState === 'limited' && <p className="simulation-coverage warning" role="status">
      El reconocimiento no está disponible para esta fuente. Prueba otra fuente o abre una escena 3D.
    </p>}
    {serverState === 'offline' && <p className="simulation-coverage warning">
      No hay conexión para analizar imágenes. Puedes seguir viendo el video.
    </p>}
    {serverState === 'unconfigured' && <p className="simulation-coverage warning">
      El reconocimiento no está disponible para esta fuente.
    </p>}
  </section>;
}
