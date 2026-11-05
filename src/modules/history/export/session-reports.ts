/** Reportes de fase 12: únicamente sesiones YA guardadas y revisiones humanas.
 * Sin cámaras, imágenes, datasets, ni inferencias sintetizadas para reportes. */
import type {SimulationSession,SessionScenario} from '../../../core/domain/simulation-session';
import type {ReviewClosure} from '../../../core/domain/review-closure';
import {collectReviewItems} from '../../alerts/services/review-state';
import {validateReproducibility} from '../../scenarios/services/simulation-session-model';
export type HistoryReportKind='sessions'|'detections'|'reviews';
export type HistoryPeriod='all'|'day'|'week';
export type HistoryReviewState='all'|'open'|'closed';
export interface HistoryFilter {
 readonly search:string;
 readonly scenario:string;
 readonly mode:string;
 readonly period:HistoryPeriod;
 readonly review:HistoryReviewState;
}
export const DEFAULT_HISTORY_FILTER:HistoryFilter={
 search:'',scenario:'',mode:'',period:'all',review:'all'
};
export const REPORT_SCHEMA='vision-ai-local-report-v1';
export const CSV_SCHEMA='vision-ai-local-csv-v1';
const SCENARIOS=['safety','quality','retail','warehouse'] as const;
const countBy=(arr:readonly SimulationSession[],scenario:SessionScenario)=>
 arr.filter(x=>x.scenarioId===scenario).length;
export function filterHistoryRecords(records:readonly SimulationSession[],
 closures:readonly ReviewClosure[],filter:HistoryFilter,now=new Date()):SimulationSession[]{
 const stamp=now.getTime();
 if(!Number.isFinite(stamp))throw Error('Fecha de filtro inválida.');
 const start=filter.period==='day'?stamp-86_400_000:
  filter.period==='week'?stamp-7*86_400_000:-Infinity;
 const query=filter.search.trim().toLocaleLowerCase('es');
 const reviews=collectReviewItems(records,closures);
 const matching=new Set(reviews.filter(x=>filter.review==='all'||x.status===filter.review)
  .map(x=>x.sessionId));
 return records.filter(record=>{
  const saved=Date.parse(record.savedAt);
  return (!query||(record.id+' '+record.scenarioName+' '+record.mode).toLocaleLowerCase('es').includes(query))&&
   (!filter.scenario||record.scenarioId===filter.scenario)&&
   (!filter.mode||record.mode===filter.mode)&&
   (filter.review==='all'||matching.has(record.id))&&
   Number.isFinite(saved)&&saved>=start&&saved<=stamp;
 }).sort((a,b)=>b.savedAt.localeCompare(a.savedAt)||a.id.localeCompare(b.id));
}
/** Incluye revisiones ligadas solo a las sesiones filtradas, sin cruces por ID. */
export function linkedReviews(records:readonly SimulationSession[],closures:readonly ReviewClosure[]){
 return collectReviewItems(records,closures);
}
export function historyReportMetrics(records:readonly SimulationSession[],closures:readonly ReviewClosure[]){
 const reviews=linkedReviews(records,closures);
 const yolo=records.filter(r=>r.mode==='yolo');
 const times=yolo.filter(r=>r.inference&&Number.isFinite(r.inference.inferenceMs))
  .map(r=>r.inference!.inferenceMs);
 return {
  total:records.length,yolo:yolo.length,
  detections:yolo.reduce((sum,r)=>sum+(r.inference?.detections.length??0),0),
  reviews:reviews.length,open:reviews.filter(x=>x.status==='open').length,
  closed:reviews.filter(x=>x.status==='closed').length,
  meanInferenceMs:times.length?times.reduce((a,b)=>a+b,0)/times.length:null,
  byScenario:SCENARIOS.map(id=>({id,count:countBy(records,id)})),
  firstSavedAt:records.length?records.reduce((a,b)=>a.savedAt<b.savedAt?a:b).savedAt:null,
  lastSavedAt:records.length?records.reduce((a,b)=>a.savedAt>b.savedAt?a:b).savedAt:null
 };
}
type CsvRow=readonly (string|number|null|undefined)[];
/** UTF-8 BOM, separador punto y coma y escape de fórmulas de hojas de cálculo. */
function csvCell(value:string|number|null|undefined):string {
 let text=String(value??'');
 // Una nota, nombre o clase proveniente de un registro puede ser texto adversario.
 if(/^\s*[=+\-@\t\r]/u.test(text))text="'"+text;
 return '"'+text.replace(/"/g,'""').replace(/\r\n|\r/g,'\n')+'"';
}
export function csvDocument(headers:readonly string[],rows:readonly CsvRow[]):string{
 if(headers.length===0||rows.some(r=>r.length!==headers.length))
  throw Error('Tabla CSV con columnas incompatibles.');
 return '\uFEFF'+[headers,...rows].map(row=>row.map(csvCell).join(';')).join('\r\n')+'\r\n';
}
export function buildHistoryCsv(kind:HistoryReportKind,
 records:readonly SimulationSession[],closures:readonly ReviewClosure[]):string{
 const ordered=[...records].sort((a,b)=>b.savedAt.localeCompare(a.savedAt)||a.id.localeCompare(b.id));
 if(kind==='sessions')return csvDocument([
  'ID sesión','Guardada UTC','Escenario','Origen','Versión 3D','Tiempo simulado ms',
  'Visualización','Cámara','Huella 3D','Detector','Fotograma YOLO','Capturado UTC',
  'Inferencia ms','Detecciones','Indicios EPP','Revisiones abiertas','Revisiones cerradas'
 ],ordered.map(r=>{
  const review=linkedReviews([r],closures);
  const i=r.inference;
  return [r.id,r.savedAt,r.scenarioName,r.mode,r.source.sceneVersion,r.source.elapsedMs,
   r.source.graphics,r.source.camera,r.source.fingerprint,i?.model??'',i?.frameNumber??'',
   i?new Date(i.observedAtMs).toISOString():'',i?.inferenceMs??'',
   i?.detections.length??0,review.length,review.filter(x=>x.status==='open').length,
   review.filter(x=>x.status==='closed').length];
 }));
 if(kind==='detections')return csvDocument([
  'ID sesión','Escenario','Detector','Fotograma','Capturado UTC','ID detección',
  'Clase','Etiqueta','Confianza','Caja X','Caja Y','Caja Ancho','Caja Alto'
 ],ordered.flatMap(r=>r.inference?.detections.map(d=>[
  r.id,r.scenarioName,r.inference!.model,r.inference!.frameNumber,
  new Date(r.inference!.observedAtMs).toISOString(),d.id,d.classId,d.label,
  d.confidence,d.box.x,d.box.y,d.box.width,d.box.height
 ])??[]));
 if(kind==='reviews')return csvDocument([
  'ID sesión','Escenario','ID indicio','Clase','Etiqueta','Fotograma',
  'Lecturas de soporte','Confianza máxima','Detectado UTC','Estado humano',
  'Decisión','Revisado UTC','Nota local'
 ],linkedReviews(ordered,closures).map(row=>[
  row.sessionId,row.scenarioName,row.eventId,row.classId,row.label,row.frameNumber,
  row.supportingFrames,row.confidence,row.evidenceAt,row.status,
  row.decisionLabel??'',row.closedAt??'',row.note??''
 ]));
 throw Error('Tipo de CSV desconocido.');
}
export function buildHistoryAuditReport(
 records:readonly SimulationSession[],closures:readonly ReviewClosure[],
 generatedAt=new Date()
):string{
 if(!Number.isFinite(generatedAt.getTime()))throw Error('Fecha de reporte inválida.');
 for(const record of records)validateReproducibility(record);
 const ordered=[...records].sort((a,b)=>b.savedAt.localeCompare(a.savedAt)||a.id.localeCompare(b.id));
 const validEvents=new Set(ordered.flatMap(r=>r.inference?.reviewLog.map(e=>JSON.stringify([r.id,e.id]))??[]));
 const linkedClosures=closures.filter(c=>validEvents.has(JSON.stringify([c.sessionId,c.eventId])));
 return JSON.stringify({
  schemaVersion:REPORT_SCHEMA,generatedAt:generatedAt.toISOString(),
  source:'indexeddb-local',sourceScope:'four-3d-simulations-only',
  disclaimer:'La confianza YOLO no equivale a exactitud; las ausencias de detecciones no acreditan cumplimiento.',
  metrics:historyReportMetrics(ordered,linkedClosures),
  sessions:ordered,reviewClosures:linkedClosures
 },null,2)+'\n';
}
/** Generación de archivos exclusivamente por interacción explícita del usuario. */
export function downloadLocalReport(content:string,name:string,mime='text/csv;charset=utf-8'):void{
 if(!/^[a-z0-9-]+\.(csv|json)$/.test(name)||!content)
  throw Error('Nombre o contenido de informe inválido.');
 const url=URL.createObjectURL(new Blob([content],{type:mime}));
 try{
  const anchor=document.createElement('a');
  anchor.href=url;anchor.download=name;
  document.body.appendChild(anchor);
  anchor.click();anchor.remove();
 }finally{
  window.setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
}
