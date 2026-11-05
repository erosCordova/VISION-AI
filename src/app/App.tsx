import { useEffect, useState } from 'react';
import type { Origin } from '../core/domain/model';
import { HistoryPanel } from '../modules/history/pages/HistoryPanel';
import { SessionSettings } from '../modules/settings/pages/SessionSettings';
import {PrivacyCenter} from '../modules/settings/pages/PrivacyCenter';
import { ErrorBoundary } from '../shared/ui/ErrorBoundary';
import { LiveAnalysisPage } from '../modules/analysis/pages/LiveAnalysisPage';
import {VisionWorkspace} from '../modules/detections/pages/VisionWorkspace';
import type {SimulationSessionRepository} from '../core/ports/simulation-session-repository';
import {validateReproducibility} from '../modules/scenarios/services/simulation-session-model';
import {SessionsDashboard} from '../modules/dashboard/pages/SessionsDashboard';
import {LiveObservationsDashboard} from '../modules/dashboard/components/LiveObservationsDashboard';
import {AppProviders} from './providers/AppProviders';
import {currentPage} from './router/navigation';
import type {Page} from './router/navigation';
import {Sidebar} from './layout/Sidebar';
import {AppHeader} from './layout/AppHeader';
import type {LiveObservationRepository} from '../core/ports/live-observation-repository';
import {OperationsPanel} from '../modules/alerts/pages/OperationsPanel';
import {StudioLanding} from '../modules/experience/StudioLanding';
import {StudioCommandPalette} from '../modules/experience/StudioCommandPalette';
import type {WorldKey} from '../modules/experience/StudioWorld';
import {ScenarioArtwork} from '../modules/experience/ScenarioArtwork';
const scenarios = [
  { id: 'safety', name: 'Seguridad industrial', icon: '◈', text: 'Personas y equipos de protección', rule: 'Revisión de casco y chaleco por persona', classes: 'Persona · Casco · Chaleco' },
  { id: 'warehouse', name: 'Almacén inteligente', icon: '▦', text: 'Objetos y zonas de operación', rule: 'Presencia de montacargas en zona configurada', classes: 'Caja · Pallet · Montacargas' },
  { id: 'quality', name: 'Control de calidad', icon: '◎', text: 'Inspección visual de productos', rule: 'Revisión de defectos sobre el producto', classes: 'Producto · Defecto superficial' },
  { id: 'retail', name: 'Retail', icon: '▥', text: 'Conteo y ocupación de espacios', rule: 'Conteo de personas dentro de una zona', classes: 'Persona · Estante · Producto' },
];
export function App({ apiBaseUrl, sessionRepository, liveObservationRepository }: { origin: Origin; apiBaseUrl: string | null; sessionRepository:SimulationSessionRepository; liveObservationRepository:LiveObservationRepository }) {
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
  return <AppProviders liveObservationRepository={liveObservationRepository}><div className="app-shell experience-shell studio-shell">
    <a className="skip" href="#contenido" onClick={e => { e.preventDefault(); document.getElementById('contenido')?.focus(); }}>Saltar al contenido</a>
    {menu&&<button type="button" className="experience-nav-scrim"
     aria-label="Cerrar navegación" onClick={()=>setMenu(false)}/>}
    <Sidebar menu={menu} page={page} role={role}
      onClose={()=>setMenu(false)}
      onOpenCommand={()=>{setCommandOpen(true);setMenu(false);}}/>

    <div className="workspace"><AppHeader menu={menu} page={page} role={role}
      onToggleMenu={()=>setMenu(!menu)} onOpenCommand={()=>setCommandOpen(true)}
      onRoleChange={setRole}/>
      <main id="contenido" tabIndex={-1}>{page !== 'Resumen'&&<div className="page-heading"><div><span className="eyebrow">VISIÓN COMPUTACIONAL</span><h1>{page}</h1><p>{page === 'Análisis en vivo' ? 'Cámaras públicas en directo y simulaciones con reconocimiento de objetos.' : page === 'Visión IA' ? 'Laboratorio interactivo para reconocer objetos sobre escenas 3D o video público.' : page === 'Historial' ? 'Sesiones y evidencias de tus análisis.' : 'Estado del entorno y capacidades disponibles.'}</p></div></div>}
      <ErrorBoundary key={page + role}>
      {page === 'Resumen' && <>
       <StudioLanding onExplore={openScene}
        onHistory={()=>navigate('Historial')} sessionCount={savedStats?.total??null}/>
       <div className="experience-dashboard-label studio-insights-label studio-scroll-reveal">
        <span>01 / CENTRO DE CONTROL</span><p>RESULTADOS GUARDADOS</p>
       </div>
       <div className="stats studio-scroll-reveal">{[['Escenarios','04','Simulaciones 3D'],['Reconocimiento','Disponible','Análisis de imágenes'],['Sesiones 3D',savedStats?savedStats.total.toString():'—','Guardadas en este navegador'],['Indicios conservados',savedStats?savedStats.indicios.toString():'—','Observaciones guardadas']].map(([title,value,detail]) => <section className="stat" key={title}><span>{title}</span><strong>{value}</strong><small>{detail}</small></section>)}</div><div className="experience-saved-dashboard studio-scroll-reveal"><SessionsDashboard repository={sessionRepository}
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
      <h2>De la simulación a la evidencia</h2><p>Observa cámaras en directo o explora escenas 3D. Guarda los resultados que necesites.</p></div><button onClick={() => navigate('Análisis en vivo')}>Iniciar exploración ↗</button></section></>}
      {page === 'Análisis en vivo' && <LiveAnalysisPage scenarios={scenarios} scenarioId={scenarioId} onScenarioChange={setScenarioId} sessionRepository={sessionRepository} role={role} apiBaseUrl={apiBaseUrl} />}
      {page === 'Historial' && <HistoryPanel onAnalyze={() => navigate('Análisis en vivo')} sessionRepository={sessionRepository} />}
      {page === 'Privacidad' && <PrivacyCenter repository={sessionRepository} />}
      {page === 'Visión IA' && <VisionWorkspace
       scenarioId={scenarioId} onScenarioChange={setScenarioId}
       sessionRepository={sessionRepository}
       liveObservationRepository={liveObservationRepository}
       onHistory={()=>navigate('Historial')}/>}
      {page === 'Operaciones' && <OperationsPanel repository={sessionRepository}
   onHistory={() => navigate('Historial')} />}
      {(page === 'Administración' || page === 'Configuración') && role !== 'administrador' && <section className="panel empty-page"><h2>Vista restringida</h2><p>Esta vista está reservada al perfil administrador de prueba.</p><button onClick={() => navigate('Resumen')}>Volver al resumen</button></section>}
      {page === 'Administración' && role === 'administrador' && <section className="panel settings">
       <h2>Herramientas del espacio</h2>
       <p>Accede a las funciones de administración disponibles en esta página.</p>
       <div className="settings-actions">
        <button type="button" onClick={()=>navigate('Configuración')}>Ajustar análisis</button>
        <button type="button" onClick={()=>navigate('Historial')}>Consultar historial</button>
        <button type="button" onClick={()=>navigate('Privacidad')}>Gestionar datos</button>
       </div>
       <p>Los perfiles seleccionables son de prueba y no son cuentas personales.</p>
      </section>}
      {page === 'Configuración' && role === 'administrador' && <><SessionSettings /><section className="panel settings"><h2>Estado de la aplicación</h2><dl><dt>Estado</dt><dd>Disponible para iniciar un análisis</dd><dt>Fuentes de video</dt><dd>Cámaras públicas en directo y cuatro escenarios de simulación 3D</dd><dt>Reconocimiento</dt><dd>Personas y vehículos en cámaras; objetos y protección personal en escenas 3D</dd><dt>Privacidad</dt><dd>Los videos no se graban ni se guardan en la aplicación</dd><dt>Historial</dt><dd>Solo conserva los resultados que decidas guardar</dd><dt>Cuenta</dt><dd>Se usa sin iniciar sesión</dd><dt>Videos públicos</dt><dd>La disponibilidad depende de cada cámara</dd></dl></section></>}
      </ErrorBoundary><footer className="workspace-footer"><span>VISION AI / Visión computacional aplicada</span><span>Cámaras públicas · Detección · Historial</span></footer></main>
    </div>
    <StudioCommandPalette open={commandOpen} onClose={()=>setCommandOpen(false)}
     onNavigate={name=>navigate(name as Page)} onScenario={openScene}/>
  </div></AppProviders>;
}
