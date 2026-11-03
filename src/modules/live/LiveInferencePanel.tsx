import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { CameraStatus } from '../camera/CameraPanel';
import type { AnalyzedFrame } from './frame-guard';

interface ResponsePayload {
  sessionId: string; generation: number; frameId: number; capturedAtMonotonicMs: number;
  configurationVersion: string; inferenceDurationMs: number;
  image: { width: number; height: number; assetId: string; contentHash: string };
  coverage: { complete: boolean; missingClasses: string[]; detail: string };
  modelClasses: string[];
  result: AnalyzedFrame['output']['result'];
}
interface Props {
  videoRef: RefObject<HTMLVideoElement | null>;
  sourceStatus: CameraStatus;
  scenarioId: string;
  apiBaseUrl: string | null;
  onFrame: (frame: AnalyzedFrame | null) => void;
}

export function LiveInferencePanel({ videoRef, sourceStatus, scenarioId, apiBaseUrl, onFrame }: Props) {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [coverage, setCoverage] = useState<ResponsePayload['coverage'] | null>(null);
  const [inferenceMs, setInferenceMs] = useState<number | null>(null);
  const [personCount, setPersonCount] = useState<number | null>(null);
  const [frames, setFrames] = useState(0);
  const generation = useRef(0);
  const imageUrlRef = useRef<string | null>(null);
  const allowRun = !!apiBaseUrl && sourceStatus === 'preview';

  useEffect(() => {
    if (sourceStatus !== 'preview') setRunning(false);
  }, [sourceStatus]);
  useEffect(() => {
    if (!running || !allowRun || !apiBaseUrl) return;
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
      const maxSide = 640;
      const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      const ctx = canvas.getContext('2d');
      if (!ctx) { setError('No se pudo preparar la captura del video.'); setRunning(false); return; }
      const capturedAtMonotonicMs = performance.now();
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
      if (!blob || cancelled) return;
      const currentFrameId = ++frameId;
      const params = new URLSearchParams({
        scenario: scenarioId, session, generation: String(currentGeneration),
        frameId: String(currentFrameId), capturedAtMonotonicMs: String(capturedAtMonotonicMs)
      });
      try {
        const response = await fetch(apiBaseUrl + '/api/v1/infer?' + params, {
          method: 'POST', headers: { 'Content-Type': 'image/jpeg' }, body: blob, signal: abort.signal
        });
        if (!response.ok) {
          const info: unknown = await response.json().catch(() => ({}));
          const message = info && typeof info === 'object' && 'detail' in info && typeof info.detail === 'string'
            ? info.detail : 'No se pudo procesar el video.';
          throw Error(message);
        }
        const value = await response.json() as ResponsePayload;
        if (cancelled) return;
        if (value.sessionId !== session || value.generation !== currentGeneration ||
            value.frameId !== currentFrameId || value.capturedAtMonotonicMs !== capturedAtMonotonicMs ||
            value.image.width !== canvas.width || value.image.height !== canvas.height ||
            value.result.assetId !== value.image.assetId || value.result.sourceHash !== value.image.contentHash) {
          throw Error('Se recibió un resultado incompatible con el fotograma solicitado.');
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
        if (previous) URL.revokeObjectURL(previous);
        setCoverage(value.coverage);
        setInferenceMs(value.inferenceDurationMs);
        setPersonCount(value.result.detections.filter(d => d.classId === 'person').length);
        setFrames(currentFrameId);
        setError('');
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Motor de visión inaccesible.');
          setRunning(false);
        }
        return;
      }
      if (!cancelled) timer = setTimeout(() => { void tick(); }, 200);
    }

    void tick();
    return () => {
      cancelled = true; abort.abort();
      if (timer) clearTimeout(timer);
      onFrame(null);
      if (imageUrlRef.current) { URL.revokeObjectURL(imageUrlRef.current); imageUrlRef.current = null; }
    };
  }, [running, allowRun, apiBaseUrl, scenarioId, videoRef, onFrame]);

  return <section className="panel inference-controls" aria-label="Motor de análisis en tiempo real">
    <div className="panel-heading"><div><span className="eyebrow">INFERENCIA REAL</span><h2>Analizar fotogramas con YOLO</h2></div>
      <span className={'status ' + (running ? 'live' : '')}><i />{running ? 'Analizando video' : 'Análisis detenido'}</span></div>
    <p>La cámara o el video se procesan en tu equipo mediante un servidor local. No es una animación con etiquetas prefabricadas.</p>
    <div className="inference-actions">
      {!running && <button className="primary" disabled={!allowRun} onClick={() => { setError(''); setCoverage(null); setInferenceMs(null); setPersonCount(null); setFrames(0); setRunning(true); }}>Iniciar análisis con YOLO</button>}
      {running && <button onClick={() => setRunning(false)}>Detener análisis</button>}
      <span>{apiBaseUrl ? 'Servidor configurado: ' + apiBaseUrl : 'Configura VITE_VISION_MODE=real y la URL de la API local.'}</span>
    </div>
    {error && <p role="alert" className="error">{error}</p>}
    <div className="simulation-metrics">
      <div><span>Fotogramas procesados</span><strong>{frames || '—'}</strong></div>
      <div><span>Inferencia del último fotograma</span><strong>{inferenceMs === null ? '—' : Math.round(inferenceMs) + ' ms'}</strong></div>
      <div><span>Personas en último fotograma</span><strong>{personCount === null ? '—' : personCount}</strong></div>
    </div>
    {coverage && <p className={coverage.complete ? 'simulation-coverage' : 'simulation-coverage warning'} role="status">
      {coverage.complete ? 'Clases requeridas disponibles en los pesos cargados. Falta validar las reglas del escenario.' :
        'Cobertura incompleta: faltan clases ' + coverage.missingClasses.join(', ') + '. ' + coverage.detail}
    </p>}
    {!apiBaseUrl && <p className="simulation-coverage warning">No se ha conectado un motor real. La cámara puede funcionar como vista previa, pero no habrá detecciones hasta ejecutar el backend local.</p>}
  </section>;
}
