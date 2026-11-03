import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import type { CameraStatus } from '../camera/CameraPanel';

export function SimulationVideoPanel({ videoRef, scenario, onStatusChange }: {
  videoRef: RefObject<HTMLVideoElement | null>;
  scenario: string;
  onStatusChange: (status: CameraStatus) => void;
}) {
  const urlRef = useRef<string | null>(null);
  const [name, setName] = useState('');
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [error, setError] = useState('');
  useEffect(() => { onStatusChange(status); }, [status, onStatusChange]);
  useEffect(() => {
    const stopWhenHidden = () => {
      if (document.hidden) {
        videoRef.current?.pause();
        setStatus(previous => previous === 'preview' ? 'paused' : previous);
      }
    };
    document.addEventListener('visibilitychange', stopWhenHidden);
    return () => {
      document.removeEventListener('visibilitychange', stopWhenHidden);
      videoRef.current?.pause();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, [videoRef]);

  async function loadFile(file?: File) {
    const video = videoRef.current;
    if (!file || !video) return;
    video.pause();
    video.removeAttribute('src');
    video.load();
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setName(''); setError(''); setStatus('idle');
    if (!file.type.startsWith('video/')) {
      setError('Selecciona un archivo de video compatible con tu navegador.');
      return;
    }
    if (file.size > 500 * 1024 * 1024) {
      setError('El video excede el límite local de 500 MB.');
      return;
    }
    const url = URL.createObjectURL(file);
    urlRef.current = url;
    setName(file.name);
    video.src = url;
    video.loop = true;
    video.muted = true;
    video.load();
    try {
      await video.play();
      setStatus('preview');
    } catch {
      setStatus('paused');
      setError('Pulsa Reproducir para activar el video seleccionado.');
    }
  }

  async function toggle() {
    const video = videoRef.current;
    if (!video) return;
    if (!video.paused) { video.pause(); setStatus('paused'); return; }
    try {
      await video.play(); setStatus('preview'); setError('');
    } catch {
      setStatus('failed');
      setError('Tu navegador no pudo reproducir el video. Prueba con MP4 o WebM.');
    }
  }
  return <section className="panel camera-panel" aria-label="Simulación de escenario con video">
    <div className="panel-heading"><div><h2>Simulación en tiempo real</h2><p>{scenario}</p></div><span role="status" className={'status ' + (status === 'preview' ? 'live' : '')}><i />{status === 'preview' ? 'Video reproduciéndose' : status === 'paused' ? 'Video pausado' : 'Sin video activo'}</span></div>
    <div className="viewport simulation-viewport">
      <video ref={videoRef} playsInline muted loop hidden={!name} aria-label="Video de simulación"/>
      {!name && <div className="camera-empty"><span className="camera-symbol" aria-hidden="true">▣</span><h3>Selecciona un video para simular el escenario</h3><p>Se reproducirá en bucle y YOLO analizará los fotogramas que capturemos.</p></div>}
      <span className="viewport-label">VIDEO LOCAL · NO TRANSMITIDO HASTA INICIAR ANÁLISIS</span>
    </div>
    <div className="camera-controls"><label>Video del escenario<input type="file" accept="video/*" aria-label="Cargar video para simulación" onChange={event => { const file = event.target.files?.[0]; void loadFile(file); event.target.value = ''; }} /></label>
      {name && <button onClick={() => void toggle()}>{status === 'preview' ? 'Pausar video' : 'Reproducir video'}</button>}
    </div>
    {name && <p className="simulation-filename">Archivo local: {name} · reproducción en bucle</p>}
    {error && <p className="error" role="alert">{error}</p>}
    <p className="camera-note">El archivo permanece en tu navegador. Solo los fotogramas capturados durante un análisis activo se envían al motor local.</p>
  </section>;
}
