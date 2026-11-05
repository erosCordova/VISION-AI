import type {Page} from '../router/navigation';
import {pages,isVisiblePage} from '../router/navigation';
import {LayoutDashboard,ScanEye,ScanSearch,ClipboardList,History,ShieldCheck,Settings2,SlidersHorizontal,Command} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
const NAV_ICONS:Record<Page,LucideIcon>={
 'Resumen':LayoutDashboard,'Análisis en vivo':ScanEye,'Visión IA':ScanSearch,
 'Operaciones':ClipboardList,'Historial':History,'Privacidad':ShieldCheck,
 'Configuración':SlidersHorizontal,'Administración':Settings2
};
interface Props{
 readonly menu:boolean;readonly page:Page;readonly role:string;
 readonly onClose:()=>void;readonly onOpenCommand:()=>void;
}
export function Sidebar({menu,page,role,onClose,onOpenCommand}:Props){
 return (    <aside className={'sidebar ' + (menu ? 'open' : '')}>
      <a className="logo" href="#Resumen" onClick={()=>onClose()}
       aria-label="VISION-AI, ir al resumen"><span className="logo-mark">⟡</span>
       <span className="logo-wordmark">VISION<span>AI</span><small>INTELLIGENCE LAB</small></span></a>
      <span className="nav-label">SISTEMA / NAVEGACIÓN</span>
      <nav aria-label="Navegación principal">{pages.filter(p=>isVisiblePage(p,role)).map(p => {
       const Icon=NAV_ICONS[p];
       return <a key={p} href={'#'+p} aria-current={page === p ? 'page' : undefined}
        onClick={()=>onClose()}><span aria-hidden="true"><Icon size={18} strokeWidth={1.8}/></span>
        <span className="studio-nav-text">{p}</span>
        {p==='Análisis en vivo'&&<i className="nav-dot"/>}</a>;
      })}</nav>
      <div className="sidebar-bottom">
       <button className="studio-sidebar-command" type="button"
        onClick={()=>{onOpenCommand();onClose();}}>
        <Command size={17}/><span>Acceso rápido</span><kbd>⌘ K</kbd></button>
       <div className="experience-sidebar-system"><span className="engine-light"/>
        <div><strong>ANÁLISIS VISUAL</strong><small>LISTO PARA USAR</small></div>
        <span aria-hidden="true">↗</span>
       </div>
       <p>Analiza cámaras públicas y escenarios 3D con reconocimiento visual.</p>
       <div className="user"><b>AI</b><div>Laboratorio de pruebas
        <small>Sin cuenta autenticada</small></div></div>
      </div>
    </aside>);
}
