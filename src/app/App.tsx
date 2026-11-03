import type { Origin } from '../core/domain/model';
export function App({ origin }: { origin: Origin }) {
  return <main className="foundation">
    <span className="brand">VISION AI</span>
    <h1>Plataforma de análisis visual</h1>
    <p>El entorno está preparado. El área de trabajo se construirá en la siguiente fase.</p>
    <p className="mode">Modo configurado: {origin.toUpperCase()} · Motor todavía no conectado</p>
  </main>;
}
