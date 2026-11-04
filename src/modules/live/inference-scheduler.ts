/** Ritmo de captura de YOLO según la capacidad del equipo, sin inferencia remota. */
export type CapturePace='fast'|'balanced'|'efficient';
export const CAPTURE_PACE_MS:Readonly<Record<CapturePace,number>>={
 fast:350,balanced:750,efficient:1500
};
/** Nunca solapar inferencias; espera después de cada respuesta del modelo. */
export function captureWaitMs(pace:CapturePace,spentMs:number):number{
 const target=CAPTURE_PACE_MS[pace];
 if(!Number.isFinite(spentMs)||spentMs<0||!Number.isFinite(target))
  throw Error('Cadencia o duración de inferencia incompatible.');
 return Math.max(100,target-spentMs);
}
/** La pausa y el segundo plano no provocan captura ni lectura del canvas 3D. */
export function shouldPauseCapture(paused:boolean,documentHidden:boolean):boolean{
 return paused||documentHidden;
}
