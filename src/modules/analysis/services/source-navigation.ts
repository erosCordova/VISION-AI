/** Mantiene el origen elegido al entrar desde un acceso directo sin duplicar pantallas. */
export type VisualSource='live'|'simulated';
const KEY='vision-ai-visual-source';
export function selectedVisualSource(fallback:VisualSource):VisualSource{
 try{const value=sessionStorage.getItem(KEY);return value==='live'||value==='simulated'?value:fallback;}
 catch{return fallback;}
}
export function selectVisualSource(value:VisualSource):void{
 try{sessionStorage.setItem(KEY,value);}catch{/* la selección sigue funcionando en la vista abierta */}
 window.dispatchEvent(new CustomEvent('vision-ai-visual-source',{detail:value}));
}
