import {Bell, ScanSearch,Menu,X} from 'lucide-react';
import type {Page} from '../router/navigation';
interface Props{
 readonly menu:boolean;readonly page:Page;readonly role:string;
 readonly onToggleMenu:()=>void;readonly onOpenCommand:()=>void;
 readonly onRoleChange:(role:string)=>void;
}
export function AppHeader({menu,page,role,onToggleMenu,onOpenCommand,onRoleChange}:Props){
 return <header className="topbar neo-topbar">
  <button className="menu-button" aria-label={menu?'Cerrar navegación':'Abrir navegación'}
   aria-expanded={menu} onClick={onToggleMenu}>{menu?<X size={20}/>:<Menu size={20}/>}</button>
  <span className="experience-mobile-brand" aria-label="VISION AI">VISION<span>AI</span></span>
  <span className="experience-breadcrumb">{page==='Resumen'?'Centro de control':
   page==='Visión IA'?'Laboratorio de reconocimiento':page}</span>
  <button type="button" className="studio-top-search" aria-label="Abrir búsqueda de funciones"
   onClick={onOpenCommand}><ScanSearch size={19}/><span>Buscar en la plataforma…</span><kbd>Ctrl K</kbd></button>
  <a href="#Operaciones" className="neo-header-bell" aria-label="Abrir observaciones y operaciones"><Bell size={20}/></a>
  <label className="profile-control neo-profile"><span className="neo-profile-avatar">VA</span>
   <span className="neo-profile-label">Perfil de prueba</span>
   <select aria-label="Perfil de prueba" value={role} onChange={e=>onRoleChange(e.target.value)}>
    {['operador','supervisor','administrador','auditor'].map(r=>
     <option key={r} value={r}>{r[0].toUpperCase()+r.slice(1)}</option>)}
   </select></label>
 </header>;
}
