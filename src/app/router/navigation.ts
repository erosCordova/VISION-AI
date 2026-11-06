/** Las páginas son rutas de interfaz, no permisos de servidor. */
export const pages = [
 'Resumen','Análisis en vivo','Estadísticas','Visión IA','Operaciones',
 'Historial','Privacidad','Configuración','Administración'
] as const;
export type Page=(typeof pages)[number];
export function currentPage():Page{
 let name='';
 try{name=decodeURIComponent(location.hash.slice(1));}
 catch{return 'Resumen';}
 // Enlaces antiguos siguen funcionando, pero abren una sola herramienta real.
 if(name==='Visión IA')return 'Análisis en vivo';
 if(name==='Administración')return 'Configuración';
 return pages.find(p=>p===name)??'Resumen';
}
export function isVisiblePage(page:Page,role:string):boolean{
 return role==='administrador'||(page!=='Administración'&&page!=='Configuración');
}
