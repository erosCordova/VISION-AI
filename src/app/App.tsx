import { useEffect, useState } from 'react';
import type { Origin } from '../core/domain/model';
import { HistoryPanel } from '../modules/history/pages/HistoryPanel';
import { SessionSettings } from '../modules/settings/pages/SessionSettings';
import {PrivacyCenter} from '../modules/settings/pages/PrivacyCenter';
import { ErrorBoundary } from '../shared/ui/ErrorBoundary';
import { LiveAnalysisPage } from '../modules/analysis/pages/LiveAnalysisPage';
import {VisionWorkspace} from '../modules/detections/pages/VisionWorkspace';
import type {SimulationSessionRepository} from '../core/ports/simulation-session-repository';
import {SessionsDashboard} from '../modules/dashboard/pages/SessionsDashboard';
import {LiveObservationsDashboard} from '../modules/dashboard/components/LiveObservationsDashboard';
import {AppProviders} from './providers/AppProviders';
import {currentPage} from './router/navigation';
import type {Page} from './router/navigation';
import {Sidebar} from './layout/Sidebar';
import {AppHeader} from './layout/AppHeader';
import type {LiveObservationRepository} from '../core/ports/live-observation-repository';
import {OperationsPanel} from '../modules/alerts/pages/OperationsPanel';
import {CommandHome} from '../modules/experience/CommandHome';
import {selectVisualSource} from '../modules/analysis/services/source-navigation';
import {StudioCommandPalette} from '../modules/experience/StudioCommandPalette';
import type {WorldKey} from '../modules/experience/StudioWorld';
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
  useEffect(() => {
   // SPA con navegación hash: cada vista empieza arriba; evita revelar
   // la portada a mitad de scroll después de visitar Historial/YOLO.
   const update=()=>{setPage(currentPage());setMenu(false);window.scrollTo(0,0);};
   window.addEventListener('hashchange',update);
   window.scrollTo(0,0);
   return()=>window.removeEventListener('hashchange',update);
  },[]);
  const navigate = (p: Page) => { location.hash = p; setPage(p); setMenu(false); };
  const openScene=(key:WorldKey)=>{selectVisualSource('simulated');setScenarioId(key);navigate('Análisis en vivo');};
  const openCameras=()=>{selectVisualSource('live');navigate('Análisis en vivo');};
  const openStatistics=()=>{navigate('Resumen');window.setTimeout(()=>document.getElementById('neo-insights')?.scrollIntoView({behavior:'smooth'}),120);};
  useEffect(()=>{
   const open=()=>setCommandOpen(true);
   document.addEventListener('vision-ai:open-command',open);
   return()=>document.removeEventListener('vision-ai:open-command',open);
  },[]);
  return <AppProviders liveObservationRepository={liveObservationRepository}><div className="app-shell experience-shell studio-shell neo-shell">
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
       <CommandHome sessions={sessionRepository} observations={liveObservationRepository}
        onScene={openScene} onCameras={openCameras} onHistory={()=>navigate('Historial')}
        onStatistics={openStatistics} onLab={()=>navigate('Visión IA')}/>
       <section id="neo-insights" className="neo-insights">
        <div className="neo-insights-title"><span>DATOS GUARDADOS</span><h2>Estadísticas y resultados</h2>
         <p>Revisa los registros que has conservado en este navegador.</p></div>
        <div className="experience-saved-dashboard"><SessionsDashboard repository={sessionRepository}
         onHistory={()=>navigate('Historial')} onOperations={()=>navigate('Operaciones')}/></div>
        <LiveObservationsDashboard onHistory={()=>navigate('Historial')} onAnalyze={openCameras}/>
       </section>
      </>}
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
