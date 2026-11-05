/** Reproductor HLS de carga diferida; NO cambia dependencias de npm ni
 * consume instancias de Vercel. La versión de Hls.js está fijada.
 */
const HLS_SCRIPT='https://cdn.jsdelivr.net/npm/hls.js@1.7.3/dist/hls.min.js';
export interface HlsErrorData {
 readonly fatal?:boolean;
 readonly type?:string;
 readonly details?:string;
}
export interface HlsLevelData {
 readonly details?:{readonly live?:boolean};
}
export interface HlsPlayer{
 attachMedia(video:HTMLVideoElement):void;
 loadSource(url:string):void;
 on(event:string,callback:(event:string,data:any)=>void):void;
 destroy():void;
 recoverMediaError?():void;
 startLoad?():void;
}
export interface HlsFactory{
 new(config?:Record<string,unknown>):HlsPlayer;
 isSupported():boolean;
 readonly Events:{
  readonly MANIFEST_PARSED:string;
  readonly LEVEL_LOADED:string;
  readonly ERROR:string;
 };
}
let loading:Promise<HlsFactory>|null=null;
export function loadHlsFactory():Promise<HlsFactory>{
 const global=window as Window & {Hls?:HlsFactory};
 if(global.Hls)return Promise.resolve(global.Hls);
 if(loading)return loading;
 loading=new Promise<HlsFactory>((resolve,reject)=>{
  const script=document.createElement('script');
  script.src=HLS_SCRIPT;
  script.async=true;
  script.crossOrigin='anonymous';
  script.onload=()=>{
   const factory=(window as Window & {Hls?:HlsFactory}).Hls;
   if(factory)resolve(factory);
   else reject(Error('La biblioteca HLS no se inicializó.'));
  };
  script.onerror=()=>reject(Error('No se pudo descargar Hls.js. Comprueba la conexión.'));
  document.head.appendChild(script);
 }).catch(error=>{loading=null;throw error;});
 return loading;
}
