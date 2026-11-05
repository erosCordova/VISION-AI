import {validYoloFrameSource} from './yolo-telemetry';
import type {YoloFrameSource} from './yolo-telemetry';
/** Nombre reproducible y sin datos personales para la evidencia del modelo. */
export function evidencePngName(source:YoloFrameSource,frameId:number,capturedAtMs:number):string{
 if(!validYoloFrameSource(source)||!Number.isSafeInteger(frameId)||frameId<1||
  !Number.isFinite(capturedAtMs)||capturedAtMs<0||
  !Number.isFinite(new Date(capturedAtMs).getTime()))
  throw Error('No se pudo preparar la imagen solicitada.');
 const timestamp=new Date(capturedAtMs).toISOString().replace(/[:.]/g,'-');
 return 'vision-ai-analisis-'+source.scenarioId+'-frame-'+frameId+'-'+timestamp+'.png';
}
/** Descarga bajo acción explícita; no se sube una imagen a ningún servicio. */
/** Identifica una máscara cromática sin presentarla como salida YOLO-seg. */
export function chromaticMaskPngName(source:YoloFrameSource,frameId:number,capturedAtMs:number):string{
 return evidencePngName(source,frameId,capturedAtMs).replace('vision-ai-analisis-','vision-ai-mask-');
}
export async function saveEvidencePng(canvas:HTMLCanvasElement,filename:string):Promise<void>{
 if(!canvas.width||!canvas.height||!/^vision-ai-(?:analisis|mask)-[a-z0-9-]+\.png$/.test(filename))
  throw Error('No se pudo preparar la imagen descargable.');
 const blob=await new Promise<Blob>((resolve,reject)=>{
  canvas.toBlob(value=>value?resolve(value):reject(Error('El navegador no pudo crear el PNG.')),
   'image/png');
 });
 if(blob.type!=='image/png'||blob.size===0)throw Error('La evidencia PNG está vacía.');
 const uri=URL.createObjectURL(blob);
 try{
  const anchor=document.createElement('a');
  anchor.href=uri;anchor.download=filename;
  document.body.appendChild(anchor);anchor.click();anchor.remove();
 }finally{
  window.setTimeout(()=>URL.revokeObjectURL(uri),1000);
 }
}
