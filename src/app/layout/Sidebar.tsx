import {useEffect,useState} from 'react';
import type {Page} from '../router/navigation';
import {isVisiblePage} from '../router/navigation';
import {selectVisualSource,selectedVisualSource} from '../../modules/analysis/services/source-navigation';
import type {VisualSource} from '../../modules/analysis/services/source-navigation';
import {Home, ScanEye, Box, Video, ChartNoAxesCombined, ClipboardList, History, ShieldCheck, Settings2, SlidersHorizontal, Search, Eye} from 'lucide-react';
import type {LucideIcon} from 'lucide-react';
type Entry={page:Page;label:string;icon:LucideIcon;source?:VisualSource;statistics?:boolean};
const entries:Entry[]=[
 {page:'Resumen',label:'Inicio',icon:Home},
 {page:'Visión IA',label:'Laboratorio IA',icon:ScanEye},
 {page:'Análisis en vivo',label:'Simulador 3D',icon:Box,source:'simulated'},
 {page:'Análisis en vivo',label:'Cámaras públicas',icon:Video,source:'live'},
 {page:'Resumen',label:'Estadísticas',icon:ChartNoAxesCombined,statistics:true},
 {page:'Operaciones',label:'Operaciones',icon:ClipboardList},
 {page:'Historial',label:'Historial',icon:History},
 {page:'Privacidad',label:'Privacidad',icon:ShieldCheck},
 {page:'Configuración',label:'Configuración',icon:SlidersHorizontal},
 {page:'Administración',label:'Administración',icon:Settings2}
];
interface Props{
 readonly menu:boolean;readonly page:Page;readonly role:string;
 readonly onClose:()=>void;readonly onOpenCommand:()=>void;
}
export function Sidebar({menu,page,role,onClose,onOpenCommand}:Props){
 const [source,setSource]=useState<VisualSource>(()=>selectedVisualSource('simulated'));
 useEffect(()=>{
  const update=(e:Event)=>{const next=(e as CustomEvent<VisualSource>).detail;
   if(next==='live'||next==='simulated')setSource(next);};
  window.addEventListener('vision-ai-visual-source',update);
  return()=>window.removeEventListener('vision-ai-visual-source',update);
 },[]);
 const onChoose=(item:Entry)=>{
  if(item.source){setSource(item.source);selectVisualSource(item.source);}
  if(item.statistics){
   window.setTimeout(()=>document.getElementById('neo-insights')?.scrollIntoView({behavior:'smooth'}),120);
  }
  onClose();
 };
 return <aside className={'sidebar neo-sidebar '+(menu?'open':'')}>
  <a className="logo neo-logo" href="#Resumen" onClick={onClose}
   aria-label="VISION AI, ir a inicio"><span className="neo-logo-symbol"><Eye size={36} strokeWidth={2.2}/></span>
   <span className="logo-wordmark">VISION <span>AI</span><small>VISIÓN COMPUTACIONAL</small></span></a>
  <nav aria-label="Navegación principal">{entries.filter(item=>isVisiblePage(item.page,role)).map((item,i)=>{
   const Icon=item.icon;
   const current=item.page===page&&(
    item.page==='Resumen'?!item.statistics:
    item.page==='Análisis en vivo'?item.source===source:true);
   return <a key={item.label} href={'#'+item.page} aria-current={current?'page':undefined}
    className={i===5?'neo-nav-separated':undefined}
    onClick={()=>onChoose(item)}>
    <Icon size={19} strokeWidth={1.9} aria-hidden="true"/>
    <span className="studio-nav-text">{item.label}</span>
    {current&&<span className="neo-nav-shine" aria-hidden="true"/>}
   </a>;
  })}</nav>
  <div className="sidebar-bottom neo-sidebar-bottom">
   <button className="studio-sidebar-command" type="button" onClick={()=>{onOpenCommand();onClose();}}>
    <Search size={16}/><span>Buscar funciones</span><kbd>Ctrl K</kbd>
   </button>
   <div className="neo-sidebar-visual" aria-hidden="true">
    <div className="neo-wave-line neo-wave-a"/><div className="neo-wave-line neo-wave-b"/>
    <div className="neo-camera-glyph"><Video size={62} strokeWidth={1.15}/><span/></div>
   </div>
   <p>Simulaciones 3D · Cámaras públicas · Reconocimiento visual</p>
   <small>VISION AI / 2026</small>
  </div>
 </aside>;
}
