import { useEffect, useRef, useState } from 'react';
import type { Segmentation } from '../../../core/domain/model';
import type { AnalyzedFrame } from '../validators/frame-guard';
import { decideFrame } from '../validators/frame-guard';
import { forEachMaskSegment } from '../../segmentation/services/mask-rle';

const MAX_OVERLAY_AGE_MS = 1000;

function MaskLayer({ masks, width, height }: { masks: readonly Segmentation[]; width: number; height: number }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    element.width = width;
    element.height = height;
    const ctx = element.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(16, 85, 181, 0.38)';
    for (const mask of masks) forEachMaskSegment(mask.mask, (x, y, runWidth) => ctx.fillRect(x, y, runWidth, 1));
  }, [masks, width, height]);
  return <canvas className="evidence-mask" aria-hidden="true" ref={canvas} />;
}

export function ResultFrameViewer({ frame }: { frame: AnalyzedFrame | null }) {
  const [now, setNow] = useState(() => performance.now());
  const [brokenImage, setBrokenImage] = useState(false);
  const [boxes, setBoxes] = useState(true);
  const [masks, setMasks] = useState(true);
  const [patterns, setPatterns] = useState(true);
  useEffect(() => {
    if (!frame) return;
    const update = () => setNow(performance.now());
    update();
    const timer = window.setInterval(update, 250);
    return () => window.clearInterval(timer);
  }, [frame]);
  useEffect(() => setBrokenImage(false), [frame?.image.url]);
  const decision = decideFrame(frame, now, MAX_OVERLAY_AGE_MS);
  const ready = decision.state === 'ready' && !brokenImage && !!frame;
  const stale = decision.state === 'stale';
  const hasImage = (ready || stale) && !!frame && !brokenImage;
  const result = frame?.output.result;
  return <section className="panel evidence-panel" aria-label="Visor del fotograma analizado">
    <div className="panel-heading evidence-heading">
      <div><span className="eyebrow">VISOR DE EVIDENCIAS</span><h2>Fotograma analizado</h2><p>Separado de la cámara: cada anotación corresponde a una imagen concreta.</p></div>
      <span className={'status ' + (ready ? 'live' : '')} role="status">
        <i />{ready ? 'Resultado válido' : stale ? 'Resultado caducado' : decision.state === 'invalid' ? 'Resultado descartado' : 'Sin analizar'}
      </span>
    </div>
    <div className="evidence-options" role="group" aria-label="Capas visibles">
      <label><input type="checkbox" checked={boxes} disabled={!ready || !result?.detections.length} onChange={event => setBoxes(event.target.checked)} /> Cajas</label>
      <label><input type="checkbox" checked={masks} disabled={!ready || !result?.masks.length} onChange={event => setMasks(event.target.checked)} /> Máscaras</label>
      <label><input type="checkbox" checked={patterns} disabled={!ready || !result?.patterns.length} onChange={event => setPatterns(event.target.checked)} /> Patrones</label>
    </div>
    {hasImage && frame ? <figure className="evidence-figure">
      <div className="evidence-surface" style={{ aspectRatio: `${frame.image.width} / ${frame.image.height}` }}>
        <img src={frame.image.url} alt="Fotograma exacto enviado a análisis" onError={() => setBrokenImage(true)} />
        {ready && masks && result && <MaskLayer masks={result.masks} width={frame.image.width} height={frame.image.height} />}
        {ready && boxes && result?.detections.map(detection =>
          <div className="evidence-box" key={detection.id} aria-hidden="true" style={{
            left: `${detection.box.x * 100}%`, top: `${detection.box.y * 100}%`,
            width: `${detection.box.width * 100}%`, height: `${detection.box.height * 100}%`
          }}><span>{detection.label} · {Math.round(detection.confidence * 100)} % confianza</span></div>)}
      </div>
      <figcaption>{stale ? 'Fotograma conservado solo como referencia: anotaciones ocultas por caducidad.' :
        `Imagen ${frame.identity.frameId} · Tiempo desde análisis: ${decision.state === 'ready' ? Math.round(decision.ageMs) : '—'} ms`}</figcaption>
    </figure> : <div className="evidence-placeholder" role="status">
      <span className="evidence-placeholder-icon" aria-hidden="true">▧</span>
      <h3>{brokenImage ? 'La imagen analizada no está disponible' : decision.state === 'invalid' ? 'Resultado incompatible' : 'Esperando fotograma procesado'}</h3>
      <p>{brokenImage ? 'Se ocultaron las anotaciones porque no se puede comprobar su alineación con la imagen.' :
        decision.state === 'invalid' ? decision.reason :
        'Aquí aparecerán los objetos reconocidos cuando inicies el análisis.'}</p>
    </div>}
    {ready && result && <div className="evidence-insights">
      <div><h3>Detecciones ({result.detections.length})</h3>
        {result.detections.length ? <ul>{result.detections.map(d => <li key={d.id}>{d.label} · {Math.round(d.confidence * 100)} % confianza</li>)}</ul> : <p>Ninguna detección.</p>}</div>
      <div><h3>Patrones ({result.patterns.length})</h3>
        {patterns && result.patterns.length ? <ul>{result.patterns.map(p => <li key={p.id}>{p.label} · {p.assessment === 'triggered' ? 'Revisión requerida' : p.assessment === 'not-triggered' ? 'No activado' : 'Indeterminado'}</li>)}</ul> : <p>{result.patterns.length ? 'Capa de patrones oculta.' : 'Sin patrones evaluados.'}</p>}</div>
    </div>}
    <p className="evidence-privacy">El video no se graba en esta pantalla.</p>
  </section>;
}
