/** Fase 14 — decisiones puras de ciclo 3D, sin lecturas GPU ni datos ficticios.
 * Los límites son intervalos objetivo, NO valores de FPS medidos. */
export interface DynamicMeshRevision{
 readonly snapshot:object|null;
 readonly elapsed:number;
 readonly zones:boolean|null;
}
export function meshNeedsRefresh(previous:DynamicMeshRevision,next:DynamicMeshRevision):boolean{
 if(!Number.isFinite(next.elapsed))throw Error('Tiempo de simulación incompatible.');
 return previous.snapshot!==next.snapshot||previous.elapsed!==next.elapsed||
  previous.zones!==next.zones;
}
/** Al pausar, mantener cámara navegable sin redibujar la escena 30 veces/s. */
export function renderFrameBudgetMs(paused:boolean):number{
 return paused?100:33;
}
export interface PerformanceMeasurement{
 readonly route:string;readonly width:number;readonly measuredAt:string;
 readonly pageReadyMs:number|null;readonly heapUsedMiB:number|null;
 readonly renderFps:number|null;readonly webgl:boolean|null;
}
export function validPerformanceMeasurement(record:unknown):record is PerformanceMeasurement{
 if(!record||typeof record!=='object')return false;
 const r=record as PerformanceMeasurement;
 return typeof r.route==='string'&&r.route.length>0&&
  Number.isInteger(r.width)&&r.width>=320&&r.width<=4096&&
  typeof r.measuredAt==='string'&&Number.isFinite(Date.parse(r.measuredAt))&&
  [r.pageReadyMs,r.heapUsedMiB,r.renderFps].every(x=>x===null||
   (typeof x==='number'&&Number.isFinite(x)&&x>=0))&&
  (r.webgl===null||typeof r.webgl==='boolean');
}
