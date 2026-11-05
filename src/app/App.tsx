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
import {LiveObservationsDashboard} from '../modules/dashboard/LiveObservationsDashboard';
import {OperationsPanel} from '../modules/operations/OperationsPanel';
import {StudioLanding} from '../modules/experience/StudioLanding';
import {StudioCommandPalette} from '../modules/experience/StudioCommandPalette';
import {LayoutDashboard,ScanEye,ScanSearch,ClipboardList,History,ShieldCheck,
 Settings2,SlidersHorizontal,Command,Menu,X} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import type {WorldKey} from '../modules/experience/StudioWorld';
import {ScenarioArtwork} from '../modules/experience/ScenarioArtwork';
const pages = ['Resumen', 'Análisis en vivo', 'Visión IA', 'Operaciones', 'Historial', 'Privacidad', 'Configuración', 'Administración'] as const;
type Page = typeof pages[number];
const NAV_ICONS:Record<Page,LucideIcon>={
 'Resumen':LayoutDashboard,'Análisis en vivo':ScanEye,'Visión IA':ScanSearch,
 'Operaciones':ClipboardList,'Historial':History,'Privacidad':ShieldCheck,
 'Configuración':SlidersHorizontal,'Administración':Settings2
};
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
  const [commandOpen,setCommandOpen]=useState(false);
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
  const openScene=(key:WorldKey)=>{setScenarioId(key);navigate('Análisis en vivo');};
  useEffect(()=>{
   const open=()=>setCommandOpen(true);
   document.addEventListener('vision-ai:open-command',open);
   return()=>document.removeEventListener('vision-ai:open-command',open);
  },[]);
  return <div className="app-shell experience-shell studio-shell">
    <a className="skip" href="#contenido" onClick={e => { e.preventDefault(); document.getElementById('contenido')?.focus(); }}>Saltar al contenido</a>
    {menu&&<button type="button" className="experience-nav-scrim"
     aria-label="Cerrar navegación" onClick={()=>setMenu(false)}/>}
    <aside className={'sidebar ' + (menu ? 'open' : '')}>
      <a className="logo" href="#Resumen" onClick={()=>setMenu(false)}
       aria-label="VISION-AI, ir al resumen"><span className="logo-mark">⟡</span>
       <span className="logo-wordmark">VISION<span>AI</span><small>INTELLIGENCE LAB</small></span></a>
      <span className="nav-label">SISTEMA / NAVEGACIÓN</span>
      <nav aria-label="Navegación principal">{pages.filter(p => (p !== 'Administración' || role === 'administrador') && (p !== 'Configuración' || role === 'administrador')).map(p => {
       const Icon=NAV_ICONS[p];
       return <a key={p} href={'#'+p} aria-current={page === p ? 'page' : undefined}
        onClick={()=>setMenu(false)}><span aria-hidden="true"><Icon size={18} strokeWidth={1.8}/></span>
        <span className="studio-nav-text">{p}</span>
        {p==='Análisis en vivo'&&<i className="nav-dot"/>}</a>;
      })}</nav>
      <div className="sidebar-bottom">
       <button className="studio-sidebar-command" type="button"
        onClick={()=>{setCommandOpen(true);setMenu(false);}}>
        <Command size={17}/><span>Acceso rápido</span><kbd>⌘ K</kbd></button>
       <div className="experience-sidebar-system"><span className="engine-light"/>
        <div><strong>MOTOR DE VISIÓN</strong><small>ONNX · EJECUCIÓN LOCAL</small></div>
        <span aria-hidden="true">↗</span>
       </div>
       <p>Analiza cámaras públicas y escenarios 3D con reconocimiento visual.</p>
       <div className="user"><b>AI</b><div>Laboratorio de pruebas
        <small>Sin cuenta autenticada</small></div></div>
      </div>
    </aside>
    <div className="workspace"><header className="topbar"><button className="menu-button" aria-label={menu?'Cerrar navegación':'Abrir navegación'}
 aria-expanded={menu} onClick={() => setMenu(!menu)}>{menu?<X size={19}/>:<Menu size={19}/>}</button><span className="experience-mobile-brand" aria-label="VISION AI">
 VISION<span>AI</span></span><span className="experience-breadcrumb">VISION AI <span className="breadcrumb">/ {page}</span></span>
 <button type="button" className="studio-top-search"
  aria-label="Abrir búsqueda global de páginas y escenarios" onClick={()=>setCommandOpen(true)}>
  <ScanSearch size={17}/><span>Buscar cualquier función</span><kbd>Ctrl K</kbd>
 </button><label className="profile-control">Perfil de prueba<select aria-label="Perfil de prueba" value={role} onChange={e => setRole(e.target.value)}>{['operador','supervisor','administrador','auditor'].map(r => <option key={r} value={r}>{r[0].toUpperCase()+r.slice(1)}</option>)}</select></label><span className="mode-badge"><span aria-hidden="true" className="experience-status-dot"/>
CÁMARAS EN VIVO · YOLO</span></header>
      <main id="contenido" tabIndex={-1}>{page !== 'Resumen'&&<div className="page-heading"><div><span className="eyebrow">VISIÓN COMPUTACIONAL</span><h1>{page}</h1><p>{page === 'Análisis en vivo' ? 'Cámaras públicas en directo y simulaciones con reconocimiento de objetos.' : page === 'Historial' ? 'Sesiones y evidencias de tus análisis.' : 'Estado del entorno y capacidades disponibles.'}</p></div></div>}
      <ErrorBoundary key={page + role}>
      {page === 'Resumen' && <>
       <StudioLanding onExplore={openScene}
        onHistory={()=>navigate('Historial')} sessionCount={savedStats?.total??null}/>
       <div className="experience-dashboard-label studio-insights-label studio-scroll-reveal">
        <span>01 / CENTRO DE CONTROL</span><p>DATOS VERIFICABLES · INDEXEDDB LOCAL</p>
       </div>
       <div className="stats studio-scroll-reveal">{[['Escenarios','04','Simulaciones 3D'],['Motor de visión','YOLO','ONNX en navegador'],['Sesiones 3D',savedStats?savedStats.total.toString():'—','Guardadas en este navegador'],['Indicios conservados',savedStats?savedStats.indicios.toString():'—','Señales YOLO guardadas']].map(([title,value,detail]) => <section className="stat" key={title}><span>{title}</span><strong>{value}</strong><small>{detail}</small></section>)}</div><div className="experience-saved-dashboard studio-scroll-reveal"><SessionsDashboard repository={sessionRepository}
   onHistory={()=>navigate('Historial')} onOperations={()=>navigate('Operaciones')} /></div>
   <LiveObservationsDashboard onHistory={()=>navigate('Historial')} onAnalyze={()=>navigate('Análisis en vivo')}/>
   <section className="section-heading experience-scenarios-heading studio-scroll-reveal"><div><h2>Elige tu escenario</h2><p>Un flujo de trabajo adaptado a cada operación.</p></div><span>01 — 04</span></section><div className="scenario-grid experience-scenario-grid studio-scroll-reveal">{scenarios.map((s,i) =>
    <button className={'scenario-card scenario-'+i} key={s.id}
     aria-label={'Abrir simulación: '+s.name}
     onClick={() => { setScenarioId(s.id); navigate('Análisis en vivo'); }}>
     <ScenarioArtwork kind={s.id as 'safety'|'quality'|'retail'|'warehouse'}/>
     <div className="experience-card-shade" aria-hidden="true"/>
     <div className="card-top"><span className="scenario-icon">{s.icon}</span><span className="card-index">0{i+1} ↗</span></div><div className="experience-card-copy"><span className="experience-card-label">
      SIMULACIÓN / 0{i+1}</span><h3>{s.name}</h3><p>{s.text}</p></div>
     <div className="card-footer">Explorar entorno <span aria-hidden="true">↗</span></div>
    </button>)}</div><section className="ready-banner experience-ready-banner studio-scroll-reveal"><div className="banner-icon">⟡</div>
     <div><span className="experience-banner-eyebrow">02 / INTELIGENCIA OPERATIVA</span>
      <h2>De la simulación a la evidencia</h2><p>Analiza video público en directo con YOLO o explora simulaciones 3D y revisa sus resultados.</p></div><button onClick={() => navigate('Análisis en vivo')}>Iniciar exploración ↗</button></section></>}
      {page === 'Análisis en vivo' && <LiveAnalysisPage scenarios={scenarios} scenarioId={scenarioId} onScenarioChange={setScenarioId} sessionRepository={sessionRepository} role={role} apiBaseUrl={apiBaseUrl} />}
      {page === 'Historial' && <HistoryPanel onAnalyze={() => navigate('Análisis en vivo')} sessionRepository={sessionRepository} />}
      {page === 'Privacidad' && <PrivacyCenter repository={sessionRepository} />}
      {page === 'Visión IA' && <>
       <section className="panel settings">
        <h2>Reconocimiento de objetos</h2>
        <p>VISION-AI analiza fotogramas de cámaras públicas y simulaciones 3D con modelos de detección reales.</p>
        <dl><dt>Cámaras en directo</dt><dd>Personas, vehículos y otras clases generales reconocibles; la señal depende del proveedor.</dd>
         <dt>Simulaciones 3D</dt><dd>Seguridad, manufactura, almacén y retail, con detecciones sobre sus fotogramas.</dd>
         <dt>Resultados</dt><dd>Cajas sobre el fotograma analizado, clases, confianza y tiempo de procesamiento.</dd>
         <dt>Guardado</dt><dd>Solo por decisión del usuario. Los videos públicos no se graban.</dd>
         <dt>Limitaciones</dt><dd>No identifica rostros o matrículas ni certifica infracciones, defectos o medidas de seguridad.</dd>
        </dl>
       </section>
       <section className="panel vision-guide" aria-label="Funciones de VISION-AI">
        <div className="vision-guide-heading">
         <span>EXPLORA LAS FUNCIONES</span><h2>Todo en un espacio de análisis</h2>
         <p>Combina cámaras reales, simulaciones 3D y YOLO real sin instalar programas adicionales.</p>
        </div>
        <div className="vision-guide-flow">
         <article><b>01</b><h3>Cámaras en directo</h3><p>Video en movimiento, cambio automático de cámara y reconocimiento de personas o vehículos.</p></article>
         <article><b>02</b><h3>Simulaciones 3D</h3><p>Cuatro entornos para explorar detecciones visuales de seguridad, calidad, almacén y retail.</p></article>
         <article><b>03</b><h3>Historial y resultados</h3><p>Guarda análisis cuando lo necesites. Consulta detecciones, estadísticas y exporta informes CSV.</p></article>
        </div>
        <div className="vision-guide-actions">
         <a href="#Análisis en vivo">Abrir análisis</a>
         <a href="#Historial">Ver historial</a>
         <a href="https://github.com/erosCordova/VISION-AI/blob/main/docs/manual/Manual_Usuario_VISION_AI.md"
          target="_blank" rel="noopener noreferrer">Manual de usuario completo</a>
        </div>
        <p className="vision-guide-note">Las cámaras públicas no están disponibles permanentemente.
         Las detecciones son orientativas y los datos solo se guardan por decisión del usuario.</p>
       </section>
      </>}
      {page === 'Operaciones' && <OperationsPanel repository={sessionRepository}
   onHistory={() => navigate('Historial')} />}
      {(page === 'Administración' || page === 'Configuración') && role !== 'administrador' && <section className="panel empty-page"><h2>Vista restringida</h2><p>Esta vista está reservada al perfil administrador de prueba.</p><button onClick={() => navigate('Resumen')}>Volver al resumen</button></section>}
      {page === 'Administración' && role === 'administrador' && <section className="panel settings"><h2>Administración del espacio</h2><p>Perfil de prueba. No constituye autenticación de servidor.</p><dl><dt>Usuarios</dt><dd>Gestión pendiente de integración con identidad real.</dd><dt>Escenarios</dt><dd>Cuatro escenarios versionados y reproducibles; administración avanzada pendiente.</dd><dt>Auditoría</dt><dd>Sin registros productivos.</dd></dl></section>}
      {page === 'Configuración' && role === 'administrador' && <><SessionSettings /><section className="panel settings"><h2>Estado del entorno</h2><dl><dt>Origen configurado</dt><dd>{origin.toUpperCase()} · sin inferencia activa</dd><dt>Fuentes de video</dt><dd>Cámaras públicas en directo y cuatro escenarios de simulación 3D</dd><dt>Reconocimiento</dt><dd>YOLO para personas y vehículos en directo; modelos de objetos y protección en las simulaciones</dd><dt>Destino de fotogramas</dt><dd>Procesados localmente por WebAssembly; no enviados a Render</dd><dt>Almacenamiento</dt><dd>Resultados guardados voluntariamente en este navegador; sin grabaciones</dd><dt>Identidad y permisos</dt><dd>Sin autenticación de servidor</dd><dt>Conectividad</dt><dd>La página se aloja en Vercel; las transmisiones públicas dependen de sus operadores</dd></dl></section></>}
      </ErrorBoundary><footer className="workspace-footer"><span>VISION AI / Visión computacional aplicada</span><span>Cámaras públicas · Detección · Historial</span></footer></main>
    </div>
    <StudioCommandPalette open={commandOpen} onClose={()=>setCommandOpen(false)}
     onNavigate={name=>navigate(name as Page)} onScenario={openScene}/>
  </div>;
}
