import { useEffect, useState } from 'react';
import type { Origin } from '../core/domain/model';
import { HistoryPanel } from '../modules/history/HistoryPanel';
import { SessionSettings } from '../modules/settings/SessionSettings';
import { ErrorBoundary } from '../shared/ui/ErrorBoundary';
import { LiveAnalysisPage } from '../modules/live/LiveAnalysisPage';
const pages = ['Resumen', 'Análisis en vivo', 'Visión IA', 'Operaciones', 'Historial', 'Configuración', 'Administración'] as const;
type Page = typeof pages[number];
const scenarios = [
  { id: 'safety', name: 'Seguridad industrial', icon: '◈', text: 'Personas y equipos de protección', rule: 'Revisión de casco y chaleco por persona', classes: 'Persona · Casco · Chaleco' },
  { id: 'warehouse', name: 'Almacén inteligente', icon: '▦', text: 'Objetos y zonas de operación', rule: 'Presencia de montacargas en zona configurada', classes: 'Caja · Pallet · Montacargas' },
  { id: 'quality', name: 'Control de calidad', icon: '◎', text: 'Inspección visual de productos', rule: 'Revisión de defectos sobre el producto', classes: 'Producto · Defecto superficial' },
  { id: 'retail', name: 'Retail', icon: '▥', text: 'Conteo y ocupación de espacios', rule: 'Conteo de personas dentro de una zona', classes: 'Persona · Estante · Producto' },
];
function currentPage(): Page { let value = ''; try { value = decodeURIComponent(location.hash.slice(1)); } catch { return 'Resumen'; } return pages.find(p => p === value) ?? 'Resumen'; }
export function App({ origin }: { origin: Origin }) {
  const [page, setPage] = useState<Page>(currentPage);
  const [scenarioId, setScenarioId] = useState('safety');
  const [menu, setMenu] = useState(false);
  const [role, setRole] = useState('operador');
  useEffect(() => { const update = () => { setPage(currentPage()); setMenu(false); }; window.addEventListener('hashchange', update); return () => window.removeEventListener('hashchange', update); }, []);
  const navigate = (p: Page) => { location.hash = p; setPage(p); setMenu(false); };
  return <div className="app-shell">
    <a className="skip" href="#contenido" onClick={e => { e.preventDefault(); document.getElementById('contenido')?.focus(); }}>Saltar al contenido</a>
    <aside className={'sidebar ' + (menu ? 'open' : '')}>
      <a className="logo" href="#Resumen"><span className="logo-mark">◉</span>VISION<span>AI</span></a>
      <span className="nav-label">ESPACIO DE TRABAJO</span>
      <nav aria-label="Navegación principal">{pages.filter(p => (p !== 'Administración' || role === 'administrador') && (p !== 'Configuración' || role === 'administrador')).map((p,i) => <a key={p} href={'#'+p} aria-current={page === p ? 'page' : undefined} onClick={() => setMenu(false)}><span aria-hidden="true">{['▦','◉','◎','◇','◷','⚙','⌘'][i]}</span>{p}{p === 'Análisis en vivo' && <i className="nav-dot" />}</a>)}</nav>
      <div className="sidebar-bottom"><div className="engine-light" />Motor YOLO pendiente<p>Procesamiento aún sin conectar</p><div className="user"><b>EC</b><div>Eros Córdova<small>Perfil de prueba</small></div></div></div>
    </aside>
    <div className="workspace"><header className="topbar"><button className="menu-button" aria-label="Abrir navegación" aria-expanded={menu} onClick={() => setMenu(!menu)}>☰</button><span>Espacio de trabajo <span className="breadcrumb">/ {page}</span></span><label className="profile-control">Perfil de prueba<select aria-label="Perfil de prueba" value={role} onChange={e => setRole(e.target.value)}>{['operador','supervisor','administrador','auditor'].map(r => <option key={r} value={r}>{r[0].toUpperCase()+r.slice(1)}</option>)}</select></label><span className="mode-badge">{origin.toUpperCase()} · SIN INFERENCIA</span></header>
      <main id="contenido" tabIndex={-1}><div className="page-heading"><div><span className="eyebrow">VISIÓN COMPUTACIONAL</span><h1>{page === 'Resumen' ? 'Una visión clara de tu operación' : page}</h1><p>{page === 'Resumen' ? 'Cuatro escenarios. Un espacio para observar, analizar y revisar.' : page === 'Análisis en vivo' ? 'Elige el escenario, activa tu cámara y consulta el estado de los resultados.' : page === 'Historial' ? 'Sesiones y evidencias de tus análisis.' : 'Estado del entorno y capacidades disponibles.'}</p></div>{page === 'Resumen' && <button className="primary" onClick={() => navigate('Análisis en vivo')}>Abrir análisis <span aria-hidden="true">↗</span></button>}</div>
      <ErrorBoundary key={page + role}>
      {page === 'Resumen' && <><div className="stats">{[['Escenarios','04','Áreas de aplicación'],['Motor de visión','YOLO','Integración pendiente'],['Sesiones guardadas','—','Persistencia pendiente'],['Alertas generadas','—','Sin análisis ejecutados']].map(([title,value,detail]) => <section className="stat" key={title}><span>{title}</span><strong>{value}</strong><small>{detail}</small></section>)}</div><section className="section-heading"><div><h2>Elige tu escenario</h2><p>Un flujo de trabajo adaptado a cada operación.</p></div><span>01 — 04</span></section><div className="scenario-grid">{scenarios.map((s,i) => <button className={'scenario-card scenario-'+i} key={s.id} onClick={() => { setScenarioId(s.id); navigate('Análisis en vivo'); }}><div className="card-top"><span className="scenario-icon">{s.icon}</span><span className="card-index">0{i+1} ↗</span></div><h3>{s.name}</h3><p>{s.text}</p><div className="card-footer">Configurar cámara <span>→</span></div></button>)}</div><section className="ready-banner"><div className="banner-icon">◉</div><div><h2>Del video a la evidencia</h2><p>La cámara ya puede previsualizarse. Los resultados aparecerán al integrar y validar YOLO.</p></div><button onClick={() => navigate('Análisis en vivo')}>Preparar sesión →</button></section></>}
      {page === 'Análisis en vivo' && <LiveAnalysisPage scenarios={scenarios} scenarioId={scenarioId} onScenarioChange={setScenarioId} role={role} />}
      {page === 'Historial' && <HistoryPanel onAnalyze={() => navigate('Análisis en vivo')} />}
      {page === 'Visión IA' && <section className="panel settings"><h2>Motor de visión</h2><dl><dt>Familia</dt><dd>YOLO</dd><dt>Detección</dt><dd>Cajas, clases y confianza</dd><dt>Segmentación</dt><dd>Modelo con máscaras por instancia</dd><dt>Seguimiento</dt><dd>Identificadores temporales por sesión</dd><dt>Disponibilidad</dt><dd>Sin motor conectado. Versión, pesos y clases pendientes de evaluación.</dd></dl></section>}
      {page === 'Operaciones' && <section className="panel empty-page"><span className="large-symbol">◇</span><h2>Sin alertas para revisar</h2><p>No se han ejecutado reglas sobre detecciones reales.</p><button onClick={() => navigate('Historial')}>Consultar historial</button></section>}
      {(page === 'Administración' || page === 'Configuración') && role !== 'administrador' && <section className="panel empty-page"><h2>Vista restringida</h2><p>Esta vista está reservada al perfil administrador de prueba.</p><button onClick={() => navigate('Resumen')}>Volver al resumen</button></section>}
      {page === 'Administración' && role === 'administrador' && <section className="panel settings"><h2>Administración del espacio</h2><p>Perfil de prueba. No constituye autenticación de servidor.</p><dl><dt>Usuarios</dt><dd>Gestión pendiente de integración con identidad real.</dd><dt>Escenarios</dt><dd>Cuatro fichas de referencia; edición persistente en Fase 7.</dd><dt>Auditoría</dt><dd>Sin registros productivos.</dd></dl></section>}
      {page === 'Configuración' && role === 'administrador' && <><SessionSettings /><section className="panel settings"><h2>Estado del entorno</h2><dl><dt>Origen configurado</dt><dd>{origin.toUpperCase()} · sin inferencia activa</dd><dt>Fuente disponible</dt><dd>Cámara del navegador · sin audio</dd><dt>Motor previsto</dt><dd>YOLO · versión y pesos por evaluar</dd><dt>Destino de imágenes</dt><dd>Vista local; sin envío a servidores</dd><dt>Almacenamiento</dt><dd>Sin persistencia en esta fase</dd><dt>Identidad y permisos</dt><dd>Sin autenticación de servidor</dd><dt>Cámara IP / RTSP</dt><dd>Conector backend pendiente</dd></dl></section></>}
      </ErrorBoundary><footer className="workspace-footer"><span>VISION AI / Visión computacional aplicada</span><span>Fase 06 · Interfaz y cámara</span></footer></main>
    </div>
  </div>;
}
