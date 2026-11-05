/** Reintentos acotados para no saturar cámaras públicas si el proveedor cae. */
export const MAX_STREAM_RECONNECTS=3 as const;
export const STREAM_RECONNECT_DELAYS=[1200,3000,6500] as const;
export function streamReconnectDelay(attemptsAlreadyMade:number):number|null{
 if(!Number.isInteger(attemptsAlreadyMade)||attemptsAlreadyMade<0)return null;
 return STREAM_RECONNECT_DELAYS[attemptsAlreadyMade]??null;
}
export type FatalHlsAction='recover-media'|'restart-network'|'reconnect';
/** Un único intento de recuperación ligera por reproductor y causa. */
export function chooseFatalHlsAction(
 type:string|undefined,alreadyRecoveredMedia:boolean,alreadyRestartedNetwork:boolean
):FatalHlsAction{
 if(type==='mediaError'&&!alreadyRecoveredMedia)return 'recover-media';
 if(type==='networkError'&&!alreadyRestartedNetwork)return 'restart-network';
 return 'reconnect';
}
export function conciseVideoError(code:number|undefined):string{
 if(code===4)return 'El navegador rechazó la fuente de video (código 4).';
 if(code===3)return 'Error al decodificar los segmentos de video (código 3).';
 if(code===2)return 'Se interrumpió la descarga del video (código 2).';
 if(code===1)return 'La reproducción de video fue cancelada (código 1).';
 return 'El proveedor interrumpió la transmisión HLS.';
}
