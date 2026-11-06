import {useEffect,useMemo,useRef,useState} from 'react';
import {
 Search,ArrowUpRight,LayoutDashboard,Boxes,Video,ChartNoAxesCombined,ClipboardCheck,
 History,ShieldCheck,X,Command,
 Factory,Warehouse,ShoppingBag
} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
import type {WorldKey} from './StudioWorld';
import type {VisualSource} from '../analysis/services/source-navigation';

type Entry={id:string;label:string;detail:string;icon:LucideIcon;action:()=>void;category:string};
interface Props{
 readonly open:boolean;
 readonly onClose:()=>void;
 readonly onNavigate:(page:string,source?:VisualSource)=>void;
 readonly onScenario:(key:WorldKey)=>void;
}
const PAGE_LINKS=[
 {key:'Resumen',label:'Inicio',detail:'Resumen de actividad',icon:LayoutDashboard},
 {key:'Análisis en vivo',source:'simulated' as const,label:'Simulador 3D',detail:'Escenarios industriales interactivos',icon:Boxes},
 {key:'Análisis en vivo',source:'live' as const,label:'Cámaras públicas',detail:'Demostración de reconocimiento en directo',icon:Video},
 {key:'Estadísticas',label:'Estadísticas',detail:'Informes de las sesiones y cámaras guardadas',icon:ChartNoAxesCombined},
 {key:'Operaciones',label:'Operaciones',detail:'Revisión de observaciones de seguridad',icon:ClipboardCheck},
 {key:'Historial',label:'Historial',detail:'Sesiones y exportaciones locales',icon:History},
 {key:'Privacidad',label:'Privacidad',detail:'Control de los datos guardados',icon:ShieldCheck},
] as const;
const SCENARIOS=[
 {key:'safety',label:'Seguridad industrial',detail:'Personal y EPP — simulación 3D',icon:ShieldCheck},
 {key:'quality',label:'Control de calidad',detail:'Línea de producción — simulación 3D',icon:Factory},
 {key:'warehouse',label:'Logística inteligente',detail:'Almacén — simulación 3D',icon:Warehouse},
 {key:'retail',label:'Retail',detail:'Comercio — simulación 3D',icon:ShoppingBag},
] as const;
export function StudioCommandPalette({open,onClose,onNavigate,onScenario}:Props){
 const [query,setQuery]=useState('');
 const [index,setIndex]=useState(0);
 const input=useRef<HTMLInputElement>(null);
 const dialog=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const handler=(event:KeyboardEvent)=>{
   if((event.metaKey||event.ctrlKey)&&event.key.toLowerCase()==='k'){
    event.preventDefault();
    if(open)onClose();else document.dispatchEvent(new CustomEvent('vision-ai:open-command'));
   }
   if(open&&event.key==='Escape'){event.preventDefault();onClose();}
  };
  document.addEventListener('keydown',handler);
  return()=>document.removeEventListener('keydown',handler);
 },[open,onClose]);
 useEffect(()=>{
  if(!open)return;
  setQuery('');setIndex(0);
  const original=document.activeElement as HTMLElement|null;
  const t=requestAnimationFrame(()=>input.current?.focus());
  return()=>{cancelAnimationFrame(t);original?.focus();};
 },[open]);
 const entries=useMemo<Entry[]>(()=>[
  ...PAGE_LINKS.map(p=>({
   id:'page-'+p.label,label:p.label,detail:p.detail,icon:p.icon,category:'NAVEGACIÓN',
   action:()=>onNavigate(p.key,'source' in p?p.source:undefined)
  })),
  ...SCENARIOS.map(s=>({
   id:'scene-'+s.key,label:s.label,detail:s.detail,icon:s.icon,category:'ESCENARIOS 3D',
   action:()=>onScenario(s.key as WorldKey)
  })),
 ],[onNavigate,onScenario]);
 const filtered=entries.filter(item=>
  (item.label+' '+item.detail+' '+item.category).toLocaleLowerCase('es-PE')
  .includes(query.trim().toLocaleLowerCase('es-PE'))).slice(0,11);
 if(!open)return null;
 const activate=(item:Entry)=>{item.action();onClose();};
 return <div className="studio-command-backdrop" onMouseDown={event=>{
   if(event.target===event.currentTarget)onClose();
  }}>
  <div className="studio-command-dialog" role="dialog" aria-modal="true"
   aria-label="Búsqueda y navegación de VISION-AI" ref={dialog}
   onKeyDown={event=>{
    if(event.key==='ArrowDown'){event.preventDefault();setIndex(i=>(i+1)%Math.max(1,filtered.length));}
    if(event.key==='ArrowUp'){event.preventDefault();setIndex(i=>(i-1+Math.max(1,filtered.length))%Math.max(1,filtered.length));}
    if(event.key==='Enter'&&filtered[index]){event.preventDefault();activate(filtered[index]);}
    if(event.key==='Tab'){
     const focusables=dialog.current?.querySelectorAll<HTMLElement>('input,button:not([disabled])');
     if(!focusables?.length)return;
     const first=focusables[0],last=focusables[focusables.length-1];
     if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
     else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    }
   }}>
   <div className="studio-command-search">
    <Search size={22} strokeWidth={1.8}/>
    <input ref={input} type="search" role="combobox"
     aria-expanded="true" aria-controls="studio-command-results"
     aria-label="Buscar páginas y escenarios"
     placeholder="Buscar una vista o una simulación..."
     value={query} onChange={event=>{setQuery(event.target.value);setIndex(0);}}/>
    <button aria-label="Cerrar búsqueda" type="button" onClick={onClose}><X size={18}/></button>
   </div>
   <div id="studio-command-results" className="studio-command-results">
    {filtered.length===0?<p className="studio-command-empty">
      No se encontraron páginas o escenarios para esta búsqueda.
    </p>:filtered.map((item,i)=>{
     const Icon=item.icon;
     return <button key={item.id} type="button"
      className={'studio-command-item '+(index===i?'is-selected':'')}
      onMouseEnter={()=>setIndex(i)} onClick={()=>activate(item)}>
      <span className="studio-command-icon"><Icon size={21} strokeWidth={1.7}/></span>
      <span className="studio-command-item-label"><strong>{item.label}</strong>
       <small>{item.detail}</small></span>
      <span className="studio-command-type">{item.category}</span>
      <ArrowUpRight size={17}/>
     </button>;
    })}
   </div>
   <div className="studio-command-footer"><span><Command size={13}/> PANEL DE NAVEGACIÓN</span>
    <span>↑ ↓ NAVEGAR <kbd>↵</kbd> ABRIR <kbd>ESC</kbd> CERRAR</span>
   </div>
  </div>
 </div>;
}
