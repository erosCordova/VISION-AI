/** Fuentes HLS oficiales de SDOT destinadas al monitoreo de tránsito.
 * Los usuarios reciben el video directamente del servidor del operador.
 * No se reemiten ni almacenan los segmentos en Vercel/Render.
 * Identificadores contrastados con el inventario público SDOT.
 */
export interface LiveTrafficSource {
 readonly id:string;
 readonly name:string;
 readonly description:string;
 readonly streamUrl:string;
}
export const LIVE_TRAFFIC_SOURCES:readonly LiveTrafficSource[]=[
 {id:'sdot-2-pike-ew',name:'2nd Ave y Pike St · Seattle',
  description:'Intersección urbana: peatones y automóviles',
  streamUrl:'https://61e0c5d388c2e.streamlock.net/live/2_Pike_EW.stream/playlist.m3u8'},
 {id:'sdot-western-broad',name:'Western Ave y Broad St · Seattle',
  description:'Tránsito de vehículos en zona urbana',
  streamUrl:'https://61e0c5d388c2e.streamlock.net/live/Western_Broad_SWC.stream/playlist.m3u8'},
 {id:'sdot-4-battery',name:'4th Ave y Battery St · Seattle',
  description:'Vehículos y movilidad en intersección',
  streamUrl:'https://61e0c5d388c2e.streamlock.net/live/4_Battery_EW.stream/playlist.m3u8'},
 {id:'sdot-queen-anne',name:'Queen Anne Ave N y Thomas St · Seattle',
  description:'Circulación urbana y conteo por fotograma',
  streamUrl:'https://61e0c5d388c2e.streamlock.net/live/QAnne_N_Thomas_NWC.stream/playlist.m3u8'}
] as const;
export function isAuthorizedLiveTrafficUrl(url:string):boolean{
 try{
  const u=new URL(url);
  return u.protocol==='https:' &&
   u.hostname==='61e0c5d388c2e.streamlock.net' &&
   u.port===''&&u.username===''&&u.password===''&&
   u.search===''&&u.hash===''&&
   /^\/live\/[a-zA-Z0-9_]+\.stream\/playlist\.m3u8$/.test(u.pathname)&&
   LIVE_TRAFFIC_SOURCES.some(s=>s.streamUrl===u.href);
 }catch{return false;}
}

/** Busca una fuente distinta de la actual, sin repetir cámaras que fallaron.
 * Una cámara nunca se considera disponible hasta que avanzan fotogramas reales.
 */
export function nextTrafficSource(
 currentId:string,excluded:ReadonlySet<string>
):LiveTrafficSource|null{
 const index=LIVE_TRAFFIC_SOURCES.findIndex(source=>source.id===currentId);
 if(index<0)return null;
 for(let step=1;step<LIVE_TRAFFIC_SOURCES.length;step++){
  const candidate=LIVE_TRAFFIC_SOURCES[(index+step)%LIVE_TRAFFIC_SOURCES.length];
  if(!excluded.has(candidate.id))return candidate;
 }
 return null;
}
