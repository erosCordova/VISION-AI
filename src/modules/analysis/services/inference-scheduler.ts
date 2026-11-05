/** Control de cadencia ONNX: una sola inferencia en curso, sin datos remotos. */
export type CapturePace='auto'|'fast'|'balanced'|'efficient';
export const CAPTURE_PACE_MS={fast:350,balanced:750,efficient:1500} as const;
export const AUTO_PACE_MIN_MS=500;
export const AUTO_PACE_MAX_MS=2500;
/** La media exponencial refleja duración TOTAL del ciclo de captura+ONNX.
 * No inventa FPS ni modifica los pesos del modelo. */
export class AdaptiveCapturePacer{
 private avg:number|null=null;
 observe(cycleMs:number):number|null{
  if(!Number.isFinite(cycleMs)||cycleMs<0||cycleMs>120000)return this.avg;
  this.avg=this.avg===null?cycleMs:this.avg*.75+cycleMs*.25;
  return this.avg;
 }
 reset():void{this.avg=null;}
 get estimateMs():number|null{return this.avg;}
 get intervalMs():number{
  // Margen para renderizar la escena 3D y responder a controles.
  const measured=this.avg??550;
  return Math.min(AUTO_PACE_MAX_MS,
   Math.max(AUTO_PACE_MIN_MS,Math.ceil((measured*1.35+120)/50)*50));
 }
}
/** Espera después del ciclo: nunca se solapan inferencias.
 * El preset manual conserva exactamente el comportamiento anterior. */
export function captureWaitMs(pace:CapturePace,spentMs:number,estimatedMs?:number|null):number{
 if(!Number.isFinite(spentMs)||spentMs<0)
  throw Error('Cadencia o duración de inferencia incompatible.');
 let target:number;
 if(pace==='auto'){
  const measured=estimatedMs===undefined||estimatedMs===null?550:estimatedMs;
  if(!Number.isFinite(measured)||measured<0)
   throw Error('Estimación de inferencia incompatible.');
  target=Math.min(AUTO_PACE_MAX_MS,
   Math.max(AUTO_PACE_MIN_MS,Math.ceil((measured*1.35+120)/50)*50));
 }else{
  target=CAPTURE_PACE_MS[pace];
  if(!Number.isFinite(target))throw Error('Cadencia incompatible.');
 }
 return Math.max(100,target-spentMs);
}
/** No capturar si el usuario pausó la simulación o la pestaña está oculta. */
export function shouldPauseCapture(paused:boolean,documentHidden:boolean):boolean{
 return paused||documentHidden;
}
