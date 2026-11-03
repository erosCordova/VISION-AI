import { useState } from 'react';
export function HistoryPanel({ onAnalyze }: { onAnalyze: () => void }) {
  const [query, setQuery] = useState('');
  const [scenario, setScenario] = useState('');
  const filtered = query !== '' || scenario !== '';
  return <section className="panel history-panel"><div className="panel-heading"><h2>Sesiones de análisis</h2><span className="status">0 registros</span></div>
    <div className="history-filters"><label>Buscar sesión<input type="search" value={query} placeholder="Nombre o identificador" onChange={e => setQuery(e.target.value)} /></label><label>Escenario<select value={scenario} onChange={e => setScenario(e.target.value)}><option value="">Todos los escenarios</option>{['Seguridad industrial','Almacén inteligente','Control de calidad','Retail'].map(s => <option key={s}>{s}</option>)}</select></label><button disabled={!filtered} onClick={() => { setQuery(''); setScenario(''); }}>Limpiar filtros</button></div>
    <div className="table-scroll"><table><caption>Historial de sesiones; almacenamiento pendiente de integración</caption><thead><tr>{['Sesión','Escenario','Fecha','Estado'].map(h => <th scope="col" key={h}>{h}</th>)}</tr></thead><tbody><tr><td colSpan={4}><div className="history-empty"><span aria-hidden="true">◷</span><h3>{filtered ? 'No hay sesiones que mostrar' : 'Aún no hay sesiones guardadas'}</h3><p>El almacenamiento persistente se implementará en la Fase 7.</p><button onClick={onAnalyze}>Ir al análisis en vivo</button></div></td></tr></tbody></table></div>
    <nav className="pagination" aria-label="Páginas del historial"><span aria-live="polite">0 resultados</span><button disabled>Anterior</button><span>Página 1</span><button disabled>Siguiente</button></nav>
  </section>;
}
