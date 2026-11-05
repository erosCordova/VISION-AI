import { useEffect, useState } from 'react';
import type { Origin } from '../core/domain/model';
import { HistoryPanel } from '../modules/history/HistoryPanel';
import { SessionSettings } from '../modules/settings/SessionSettings';
import {PrivacyCenter} from '../modules/settings/PrivacyCenter';
import { ErrorBoundary } from '../shared/ui/ErrorBoundary';
import { LiveAnalysisPage } from '../modules/live/LiveAnalysisPage';
import type {SimulationSessionRepository} from '../core/ports/simulation-session-repository';
import {validateReproducibility} from '../modules/live/simulation-session-model';
import {SessionsDashboard} from '../modules/dashboard/SessionsDashboard';
import {OperationsPanel} from '../modules/operations/OperationsPanel';
import {ImmersiveHero} from '../modules/experience/ImmersiveHero';
import {ScenarioArtwork} from '../modules/experience/ScenarioArtwork';
const pages = ['Resumen', 'Análisis en vivo', 'Visión IA', 'Operaciones', 'Historial', 'Privacidad', 'Configuración', 'Administración'] as const;
type Page = typeof pages[number];
const scenarios = [
  { id: 'safety', name: 'Seguridad industrial', icon: '◈', text: 'Personas y equipos de protección', rule: 'Revisión de casco y chaleco por persona', classes: 'Persona · Casco · Chaleco' },
  { id: 'warehouse', name: 'Almacén inteligente', icon: '▦', text: 'Objetos y zonas de operación', rule: 'Presencia de montacargas en zona configurada', classes: 'Caja · Pallet · Montacargas' },
  { id: 'quality', name: 'Control de calidad', icon: '◎', text: 'Inspección visual de productos', rule: 'Revisión de defectos sobre el producto', classes: 'Producto · Defecto superficial' },
  { id: 'retail', name: 'Retail', icon: '▥', text: 'Conteo y ocupación de espacios', rule: 'Conteo de personas dentro de una zona', classes: 'Persona · Estante · Producto' },
];
function currentPage(): Page { let value = ''; try { value = decodeURIComponent(location.hash.slice(1)); } catch { return 'Resumen'; } return pages.find(p => p === value) ?? 'Resumen'; }
export function App({ origin, apiBaseUrl, sessionRepository }: { origin: Origin; apiBaseUrl: string | null; sessionRepository:SimulationSessionRepository }) {
  const [page, setPage] = useState<Page>(currentPage);
  const [scenarioId, setScenarioId] = useState('safety');
  const [menu, setMenu] = useState(false);
  const [role, setRole] = useState('operador');
  const [savedStats,setSavedStats] = useState<{total:number;indicios:number}|null>(null);
  useEffect(()=>{
   let active=true;
   const reload=()=>{void sessionRepository.list().then(records=>{
    const valid=records.filter(r=>{try{validateReproducibility(r);return true;}catch{return false;}});
    if(active)setSavedStats({total:valid.length,
     indicios:valid.reduce((sum,r)=>sum+(r.inference?.reviewLog.length??0),0)});
   }).catch(()=>{if(active)setSavedStats(null);});};
   reload();window.addEventListener('vision-ai-sessions-updated',reload);
   return()=>{active=false;window.removeEventListener('vision-ai-sessions-updated',reload);};
  },[page,sessionRepository]);
  useEffect(() => {
   // SPA con navegación hash: cada vista empieza arriba; evita revelar
   // la portada a mitad de scroll después de visitar Historial/YOLO.
   const update=()=>{setPage(currentPage());setMenu(false);window.scrollTo(0,0);};
   window.addEventListener('hashchange',update);
   window.scrollTo(0,0);
   return()=>window.removeEventListener('hashchange',update);
  },[]);
  const navigate = (p: Page) => { location.hash = p; setPage(p); setMenu(false); };
  return <div className="app-shell experience-shell">
    <a className="skip" href="#contenido" onClick={e => { e.preventDefault(); document.getElementById('contenido')?.focus(); }}>Saltar al contenido</a>
    {menu&&<button type="button" className="experience-nav-scrim"
     aria-label="Cerrar navegación" onClick={()=>setMenu(false)}/>}
    <aside className={'sidebar ' + (menu ? 'open' : '')}>
      <a className="logo" href="#Resumen" onClick={()=>setMenu(false)}
       aria-label="VISION-AI, ir al resumen"><span className="logo-mark">⟡</span>
       <span className="logo-wordmark">VISION<span>AI</span><small>INTELLIGENCE LAB</small></span></a>
      <span className="nav-label">SISTEMA / NAVEGACIÓN</span>
      <nav aria-label="Navegación principal">{pages.filter(p => (p !== 'Administración' || role === 'administrador') && (p !== 'Configuración' || role === 'administrador')).map(p => <a key={p} href={'#'+p} aria-current={page === p ? 'page' : undefined} onClick={() => setMenu(false)}><span aria-hidden="true">{['▦','◉','◎','◇','◷','◆','⚙','⌘'][pages.indexOf(p)]}</span>{p}{p === 'Análisis en vivo' && <i className="nav-dot" />}</a>)}</nav>
      <div className="sidebar-bottom">
       <div className="experience-sidebar-system"><span className="engine-light"/>
        <div><strong>MOTOR DE VISIÓN</strong><small>ONNX · EJECUCIÓN LOCAL</small></div>
        <span aria-hidden="true">↗</span>
       </div>
       <p>Modelos bajo demanda. Resultados reales de YOLO, sin cámaras ni datasets.</p>
       <div className="user"><b>AI</b><div>Laboratorio de pruebas
        <small>Sin cuenta autenticada</small></div></div>
      </div>
    </aside>
    <div className="workspace"><header className="topbar"><button className="menu-button" aria-label={menu?'Cerrar navegación':'Abrir navegación'}
 aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu?'✕':'☰'}</button><span className="experience-breadcrumb">VISION AI <span className="breadcrumb">/ {page}</span></span><label className="profile-control">Perfil de prueba<select aria-label="Perfil de prueba" value={role} onChange={e => setRole(e.target.value)}>{['operador','supervisor','administrador','auditor'].map(r => <option key={r} value={r}>{r[0].toUpperCase()+r.slice(1)}</option>)}</select></label><span className="mode-badge"><span aria-hidden="true" className="experience-status-dot"/>
 4 ESCENARIOS · YOLO EN NAVEGADOR</span></header>
      <main id="contenido" tabIndex={-1}>{page !== 'Resumen'&&<div className="page-heading"><div><span className="eyebrow">VISIÓN COMPUTACIONAL</span><h1>{page}</h1><p>{page === 'Análisis en vivo' ? 'Cuatro simulaciones industriales 3D con análisis YOLO real de sus fotogramas.' : page === 'Historial' ? 'Sesiones y evidencias de tus análisis.' : 'Estado del entorno y capacidades disponibles.'}</p></div></div>}
      <ErrorBoundary key={page + role}>
      {page === 'Resumen' && <>
       <ImmersiveHero onExplore={()=>navigate('Análisis en vivo')}
        onHistory={()=>navigate('Historial')} sessionCount={savedStats?.total??null}/>
       <div className="experience-dashboard-label">
        <span>01 / CENTRO DE CONTROL</span><p>DATOS VERIFICABLES · INDEXEDDB LOCAL</p>
       </div>
       <div className="stats">{[['Escenarios','04','Simulaciones 3D'],['Motor de visión','YOLO','ONNX en navegador'],['Sesiones guardadas',savedStats?savedStats.total.toString():'—','IndexedDB local'],['Indicios conservados',savedStats?savedStats.indicios.toString():'—','Señales YOLO guardadas']].map(([title,value,detail]) => <section className="stat" key={title}><span>{title}</span><strong>{value}</strong><small>{detail}</small></section>)}</div><div className="experience-saved-dashboard"><SessionsDashboard repository={sessionRepository}
   onHistory={()=>navigate('Historial')} onOperations={()=>navigate('Operaciones')} /></div>
   <section className="section-heading experience-scenarios-heading"><div><h2>Elige tu escenario</h2><p>Un flujo de trabajo adaptado a cada operación.</p></div><span>01 — 04</span></section><div className="scenario-grid experience-scenario-grid">{scenarios.map((s,i) =>
    <button className={'scenario-card scenario-'+i} key={s.id}
     aria-label={'Abrir simulación: '+s.name}
     onClick={() => { setScenarioId(s.id); navigate('Análisis en vivo'); }}>
     <ScenarioArtwork kind={s.id as 'safety'|'quality'|'retail'|'warehouse'}/>
     <div className="experience-card-shade" aria-hidden="true"/>
     <div className="card-top"><span className="scenario-icon">{s.icon}</span><span className="card-index">0{i+1} ↗</span></div><div className="experience-card-copy"><span className="experience-card-label">
      SIMULACIÓN / 0{i+1}</span><h3>{s.name}</h3><p>{s.text}</p></div>
     <div className="card-footer">Explorar entorno <span aria-hidden="true">↗</span></div>
    </button>)}</div><section className="ready-banner experience-ready-banner"><div className="banner-icon">⟡</div>
     <div><span className="experience-banner-eyebrow">02 / INTELIGENCIA OPERATIVA</span>
      <h2>De la simulación a la evidencia</h2><p>Explora escenarios 3D, ejecuta YOLO sobre sus fotogramas y guarda los resultados en tu navegador.</p></div><button onClick={() => navigate('Análisis en vivo')}>Iniciar exploración ↗</button></section></>}
      {page === 'Análisis en vivo' && <LiveAnalysisPage scenarios={scenarios} scenarioId={scenarioId} onScenarioChange={setScenarioId} sessionRepository={sessionRepository} role={role} apiBaseUrl={origin === 'real' ? apiBaseUrl : null} />}
      {page === 'Historial' && <HistoryPanel onAnalyze={() => navigate('Análisis en vivo')} sessionRepository={sessionRepository} />}
      {page === 'Privacidad' && <PrivacyCenter repository={sessionRepository} />}
      {page === 'Visión IA' && <><section className="panel settings"><h2>Detección sobre simulaciones</h2>
   <dl><dt>Tecnología</dt><dd>YOLOv8n general y YOLOv8s EPP</dd>
   <dt>Motor</dt><dd>ONNX Runtime Web / WebAssembly en el navegador</dd>
   <dt>Fuente</dt><dd>Únicamente fotogramas renderizados de los cuatro escenarios 3D</dd>
   <dt>Detección</dt><dd>Cajas, clases y confianza de inferencia; no equivale a precisión medida</dd>
   <dt>Limitaciones</dt><dd>Sin segmentación real ni seguimiento de identidades. Defectos y montacargas requieren modelos especializados.</dd>
   <dt>Persistencia</dt><dd>Resúmenes de sesiones guardados explícitamente en IndexedDB; sin video almacenado</dd></dl></section>
      <section className="panel vision-guide" aria-label="Guía rápida de uso de VISION-AI">
       <div className="vision-guide-heading"><span>MANUAL DE USO · FASE 16</span>
        <h2>Cómo funciona VISION-AI</h2>
        <p>Del escenario virtual a la evidencia. Solo simulaciones 3D; YOLO procesa sus píxeles en este navegador.</p>
       </div>
       <div className="vision-guide-flow">
        <article><b>01</b><h3>Selecciona un escenario</h3><p>Seguridad, Manufactura, Retail o Logística.
         Elige una cámara 3D y ajusta movimiento y visualización.</p></article>
        <article><b>02</b><h3>Ejecuta YOLO real</h3><p>Presiona Iniciar YOLO. Observa el
         fotograma analizado, detecciones ONNX, confianza y tiempos medidos.
         Una lectura vacía no certifica ausencia de objetos.</p></article>
        <article><b>03</b><h3>Conserva y revisa</h3><p>Guarda los resultados de la sesión.
         Consulta Historial y, si hay indicios EPP, registra una revisión
         humana en Operaciones. Descarga CSV/JSON desde el navegador.</p></article>
       </div>
       <div className="vision-guide-actions">
        <a href="#Análisis en vivo">Abrir simulaciones 3D</a>
        <a href="#Historial">Ver historial local</a>
        <a href="https://github.com/erosCordova/VISION-AI/blob/main/docs/manual/Manual_Usuario_VISION_AI.md"
         target="_blank" rel="noopener noreferrer">Manual de usuario completo</a>
       </div>
       <p className="vision-guide-note">Sin cámaras, imágenes cargadas ni datasets.
        Los perfiles del menú no son cuentas autenticadas; Render no procesa
        imágenes. Las detecciones no equivalen a conformidad industrial.</p>
      </section></>}
      {page === 'Operaciones' && <OperationsPanel repository={sessionRepository}
   onHistory={() => navigate('Historial')} />}
      {(page === 'Administración' || page === 'Configuración') && role !== 'administrador' && <section className="panel empty-page"><h2>Vista restringida</h2><p>Esta vista está reservada al perfil administrador de prueba.</p><button onClick={() => navigate('Resumen')}>Volver al resumen</button></section>}
      {page === 'Administración' && role === 'administrador' && <section className="panel settings"><h2>Administración del espacio</h2><p>Perfil de prueba. No constituye autenticación de servidor.</p><dl><dt>Usuarios</dt><dd>Gestión pendiente de integración con identidad real.</dd><dt>Escenarios</dt><dd>Cuatro escenarios versionados y reproducibles; administración avanzada pendiente.</dd><dt>Auditoría</dt><dd>Sin registros productivos.</dd></dl></section>}
      {page === 'Configuración' && role === 'administrador' && <><SessionSettings /><section className="panel settings"><h2>Estado del entorno</h2><dl><dt>Origen configurado</dt><dd>{origin.toUpperCase()} · sin inferencia activa</dd><dt>Fuente disponible</dt><dd>Cuatro simulaciones industriales 3D, sin cámaras externas</dd><dt>Motor disponible</dt><dd>YOLO ONNX descargado bajo demanda en el navegador</dd><dt>Destino de fotogramas</dt><dd>Procesados localmente por WebAssembly; no enviados a Render</dd><dt>Almacenamiento</dt><dd>IndexedDB local para resúmenes guardados manualmente; sin videos ni imágenes</dd><dt>Identidad y permisos</dt><dd>Sin autenticación de servidor</dd><dt>Red</dt><dd>Vercel aloja el frontend y Render la API ligera; sin cámaras IP o RTSP</dd></dl></section></>}
      </ErrorBoundary><footer className="workspace-footer"><span>VISION AI / Visión computacional aplicada</span><span>Fase 16 · Manuales y operación</span></footer></main>
    </div>
  </div>;
}
