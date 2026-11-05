/** Las páginas son rutas de interfaz, no permisos de servidor. */
export const pages = [
 'Resumen','Análisis en vivo','Visión IA','Operaciones',
 'Historial','Privacidad','Configuración','Administración'
] as const;
export type Page=(typeof pages)[number];
export function currentPage():Page{
 let name='';
 try{name=decodeURIComponent(location.hash.slice(1));}
 catch{return 'Resumen';}
 return pages.find(p=>p===name)??'Resumen';
}
export function isVisiblePage(page:Page,role:string):boolean{
 return role==='administrador'||(page!=='Administración'&&page!=='Configuración');
}
