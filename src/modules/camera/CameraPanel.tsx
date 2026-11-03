import { useEffect, useRef, useState } from 'react';
import type { RefObject } from 'react';
import { CameraController } from './camera-controller';
const labels = { idle: 'Cámara detenida', requesting: 'Esperando permiso', preview: 'Vista en vivo', paused: 'Cámara pausada', failed: 'Cámara no disponible' };
export type CameraStatus = keyof typeof labels;
export function CameraPanel({ scenario, onStatusChange, videoRef }: { scenario: string; onStatusChange?: (status: CameraStatus) => void; videoRef?: RefObject<HTMLVideoElement | null> }) {
  const internalVideo = useRef<HTMLVideoElement>(null);
  const video = videoRef ?? internalVideo;
  const controller = useRef<CameraController | null>(null);
  const alive = useRef(true);
  const operation = useRef(0);
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [error, setError] = useState('');
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [device, setDevice] = useState('');
  useEffect(() => { onStatusChange?.(status); }, [status, onStatusChange]);
  useEffect(() => {
    alive.current = true;
    if (navigator.mediaDevices?.getUserMedia) controller.current = new CameraController(c => navigator.mediaDevices.getUserMedia(c));
    const hide = () => { if (document.hidden) { operation.current++; controller.current?.stop(); if (video.current) video.current.srcObject = null; setStatus('idle'); } };
    document.addEventListener('visibilitychange', hide);
    return () => { document.removeEventListener('visibilitychange', hide); alive.current = false; operation.current++; controller.current?.stop(); };
  }, []);
  const stop = () => { operation.current++; controller.current?.stop(); if (video.current) video.current.srcObject = null; setStatus('idle'); setError(''); };
  async function start() {
    const token = ++operation.current;
    setError('');
    if (!controller.current) { setStatus('failed'); setError('La cámara requiere HTTPS o localhost y un navegador compatible.'); return; }
    setStatus('requesting');
    try {
      const stream = await controller.current.start(device);
      if (!stream || !alive.current || token !== operation.current) return;
      if (video.current) { video.current.srcObject = stream; await video.current.play(); }
      if (!alive.current || token !== operation.current) return;
      setStatus('preview');
      const list = await navigator.mediaDevices.enumerateDevices().catch(() => []);
      if (alive.current && token === operation.current) setDevices(list.filter(d => d.kind === 'videoinput'));
      stream.getVideoTracks()[0]?.addEventListener('ended', () => {
        if (alive.current && token === operation.current) { controller.current?.stop(); setStatus('failed'); setError('La cámara se desconectó. Puedes volver a iniciarla.'); }
      });
    } catch (e) {
      if (!alive.current || token !== operation.current) return;
      controller.current.stop(); setStatus('failed');
      const name = e instanceof Error ? e.name : '';
      setError(name === 'NotAllowedError' ? 'Permiso rechazado. Habilita la cámara en tu navegador e inténtalo de nuevo.' : name === 'NotFoundError' ? 'No se encontró una cámara conectada.' : 'No se pudo abrir la cámara. Comprueba que esté disponible y vuelve a intentarlo.');
    }
  }
  const active = status === 'preview' || status === 'paused';
  return <section className="panel camera-panel" aria-label="Cámara en vivo">
    <div className="panel-heading"><div><h2>Monitor en vivo</h2><p>{scenario}</p></div><span role="status" className={'status ' + (status === 'preview' ? 'live' : '')}><i />{labels[status]}</span></div>
    <div className="viewport">
      <video ref={video} muted playsInline aria-label="Vista previa de la cámara" hidden={!active} />
      {!active && <div className="camera-empty"><span className="camera-symbol">▣</span><h3>{status === 'requesting' ? 'Autoriza el acceso a tu cámara' : 'Tu escenario, en tiempo real'}</h3><p>{status === 'requesting' ? 'Puedes cancelar mientras esperas el permiso.' : 'Selecciona una cámara e inicia la vista en vivo.'}</p></div>}
      {status === 'paused' && <div className="paused-label">Vista pausada</div>}
      <span className="viewport-label">VISTA PREVIA · SIN INFERENCIA</span>
    </div>
    <div className="camera-controls"><label>Cámara<select value={device} disabled={active || status === 'requesting'} onChange={e => setDevice(e.target.value)}><option value="">Cámara predeterminada</option>{devices.map((d,i) => <option key={d.deviceId} value={d.deviceId}>{d.label || `Cámara ${i+1}`}</option>)}</select></label>
      {!active && status !== 'requesting' && <button className="primary" onClick={() => void start()}>Iniciar cámara</button>}
      {active && <button onClick={() => { const paused = status !== 'paused'; controller.current?.pause(paused); setStatus(paused ? 'paused' : 'preview'); }}>{status === 'paused' ? 'Reanudar' : 'Pausar'}</button>}
      {(active || status === 'requesting') && <button onClick={stop}>{status === 'requesting' ? 'Cancelar solicitud' : 'Detener cámara'}</button>}
    </div>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="camera-note"><span className="dot" />YOLO sin conectar. La vista previa permanece en este navegador; no se envían imágenes ni audio.</div>
  </section>;
}
