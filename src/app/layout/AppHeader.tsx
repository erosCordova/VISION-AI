import {ScanSearch,Menu,X} from 'lucide-react';
import type {Page} from '../router/navigation';
interface Props{
 readonly menu:boolean;readonly page:Page;readonly role:string;
 readonly onToggleMenu:()=>void;readonly onOpenCommand:()=>void;
 readonly onRoleChange:(role:string)=>void;
}
export function AppHeader({menu,page,role,onToggleMenu,onOpenCommand,onRoleChange}:Props){
 return (<header className="topbar"><button className="menu-button" aria-label={menu?'Cerrar navegación':'Abrir navegación'}
 aria-expanded={menu} onClick={() => onToggleMenu()}>{menu?<X size={19}/>:<Menu size={19}/>}</button><span className="experience-mobile-brand" aria-label="VISION AI">
 VISION<span>AI</span></span><span className="experience-breadcrumb">VISION AI <span className="breadcrumb">/ {page}</span></span>
 <button type="button" className="studio-top-search"
  aria-label="Abrir búsqueda global de páginas y escenarios" onClick={()=>onOpenCommand()}>
  <ScanSearch size={17}/><span>Buscar cualquier función</span><kbd>Ctrl K</kbd>
 </button><label className="profile-control">Perfil de prueba<select aria-label="Perfil de prueba" value={role} onChange={e => onRoleChange(e.target.value)}>{['operador','supervisor','administrador','auditor'].map(r => <option key={r} value={r}>{r[0].toUpperCase()+r.slice(1)}</option>)}</select></label><span className="mode-badge"><span aria-hidden="true" className="experience-status-dot"/>
CÁMARAS EN VIVO · RECONOCIMIENTO</span></header>);
}
