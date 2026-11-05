import type {LiveObservation} from '../../../core/domain/live-observation';
import {validateLiveObservation} from '../../../core/contracts/live-observation-contract';
/** Escapa campos, controles y fórmulas interpretables por hojas de cálculo. */
function csvField(v:string|number):string{
 let s=String(v).replace(/[\u0000-\u001f\u007f]/g,' ');
 if(/^[\s]*[=+@-]/.test(s))s="'"+s;
 return '"'+s.replace(/"/g,'""')+'"';
}
export function makeLiveObservationsCsv(observations:readonly LiveObservation[]):string{
 const header=['ID','Guardado el','Analizado el','Origen','Cámara','Modelo',
  'Tiempo de análisis (ms)','Clase','Confianza (%)','X','Y','Ancho','Alto'];
 const rows=[header.map(csvField).join(',')];
 for(const item of observations){
  validateLiveObservation(item);
  const entries=item.detections.length?item.detections:[null];
  for(const d of entries){
   const values=[item.id,item.savedAt,item.observedAt,'Cámara pública',item.cameraName,
    'YOLOv8n',item.inferenceMs,d?.label??'',d?(d.confidence*100).toFixed(1):'',
    d?d.box.x.toFixed(5):'',d?d.box.y.toFixed(5):'',
    d?d.box.width.toFixed(5):'',d?d.box.height.toFixed(5):''];
   rows.push(values.map(csvField).join(','));
  }
 }
 return '\uFEFF'+rows.join('\r\n')+'\r\n';
}
export function downloadLiveCsv(observations:readonly LiveObservation[]):void{
 const blob=new Blob([makeLiveObservationsCsv(observations)],{
  type:'text/csv;charset=utf-8'
 });
 const link=document.createElement('a');
 const url=URL.createObjectURL(blob);
 link.href=url;link.download='vision-ai-camaras-'+new Date().toISOString().slice(0,10)+'.csv';
 document.body.appendChild(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
