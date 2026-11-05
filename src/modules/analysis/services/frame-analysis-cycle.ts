import type {Detection,BoundingBox} from '../../../core/domain/model';
import type {ScenarioKey} from '../../scenarios/services/simulation-engine';
import type {YoloFamily} from '../../detections/services/yolo-browser';

export type FrameAnalysisPhase='processing'|'completed'|'failed';
export interface FrameAnalysisAttempt{
 readonly token:string;
 readonly generation:number;
 readonly frameId:number;
 readonly attempt:number;
 readonly scenarioId:ScenarioKey;
 readonly model:YoloFamily;
 readonly width:number;
 readonly height:number;
 readonly capturedAtMs:number;
 readonly startedAtMs:number;
}
export interface FrameAnalysisOutcome{
 readonly run:FrameAnalysisAttempt;
 readonly phase:FrameAnalysisPhase;
 readonly endedAtMs:number;
 readonly durationMs:number|null;
 readonly detections:readonly Detection[]|null;
 readonly error:string|null;
}
export type FrameAnalysisError='invalid-frame'|'invalid-detection'|'model-failure';
const validDimensions=(w:number,h:number)=>Number.isInteger(w)&&Number.isInteger(h)&&w>=2&&h>=2&&w<=4096&&h<=4096;
export function assertFrameDetections(detections:readonly Detection[]):void{
 if(!Array.isArray(detections)||detections.length>150)
  throw Error('El detector devolvió una cantidad de objetos incompatible.');
 for(const d of detections){
  const b=d.box;
  if(!b||typeof d.classId!=='string'||typeof d.label!=='string'||
   !Number.isFinite(d.confidence)||d.confidence<0||d.confidence>1||
   ![b.x,b.y,b.width,b.height].every(Number.isFinite)||
   b.width<=0||b.height<=0||b.x<0||b.y<0||
   b.x+b.width>1.00001||b.y+b.height>1.00001)
   throw Error('El detector devolvió coordenadas o puntuaciones inválidas.');
 }
}
/** Coordenadas del overlay dibujado en el mismo tamaño que su fotograma capturado.
 * El redimensionamiento CSS de imagen y cajas usa una única escala. */
export function frameBoxPixels(
 box:BoundingBox,width:number,height:number,
 viewport:{readonly width:number;readonly height:number;readonly offsetX?:number;readonly offsetY?:number}=
 {width,height}
):{x:number;y:number;width:number;height:number}{
 if(!validDimensions(width,height)||viewport.width<=0||viewport.height<=0)
  throw Error('Dimensiones de fotograma o visor inválidas.');
 const x=box.x*viewport.width+(viewport.offsetX??0);
 const y=box.y*viewport.height+(viewport.offsetY??0);
 return {x,y,width:box.width*viewport.width,height:box.height*viewport.height};
}
/** Exclusión de doble análisis, correlación por generación y reintento de MISMO frame. */
export class FrameAnalysisCycle{
 private generation=0;
 private nextId=0;
 private active:FrameAnalysisAttempt|null=null;
 private failed:FrameAnalysisAttempt|null=null;
 private outcome:FrameAnalysisOutcome|null=null;
 reset():void{
  this.generation++;this.nextId=0;this.active=null;this.failed=null;this.outcome=null;
 }
 begin(scenarioId:ScenarioKey,model:YoloFamily,width:number,height:number,now:number):FrameAnalysisAttempt|null{
  if(this.active)return null; // AN01: doble envío rechazado
  if(!validDimensions(width,height)||!Number.isFinite(now))throw Error('Fotograma de simulación inválido.');
  const frameId=++this.nextId;
  const job={token:this.generation+':'+frameId+':1',generation:this.generation,
   frameId,attempt:1,scenarioId,model,width,height,capturedAtMs:now,startedAtMs:now};
  this.active=job;
  return job;
 }
 complete(job:FrameAnalysisAttempt,detections:readonly Detection[],endedAtMs:number):FrameAnalysisOutcome|null{
  if(!this.same(job))return null; // AN02: resultado antiguo ignorado
  assertFrameDetections(detections);
  if(!Number.isFinite(endedAtMs)||endedAtMs<job.startedAtMs)
   throw Error('Reloj de inferencia incompatible.');
  const value={run:job,phase:'completed' as const,endedAtMs,
   durationMs:endedAtMs-job.startedAtMs,
   detections:detections.map(d=>({...d,box:{...d.box}})),error:null};
  this.active=null;this.failed=null;this.outcome=value;return value;
 }
 fail(job:FrameAnalysisAttempt,error:unknown,endedAtMs:number):FrameAnalysisOutcome|null{
  if(!this.same(job))return null;
  const value={run:job,phase:'failed' as const,endedAtMs,
   durationMs:null,detections:null,
   error:error instanceof Error?error.message:String(error)};
  this.active=null;this.failed=job;this.outcome=value;return value;
 }
 retry(now:number):FrameAnalysisAttempt|null{
  if(this.active||!this.failed||!Number.isFinite(now)||now<this.failed.capturedAtMs)return null;
  const old=this.failed;
  const job={...old,attempt:old.attempt+1,
   token:old.generation+':'+old.frameId+':'+(old.attempt+1),startedAtMs:now};
  this.active=job;this.failed=null;return job;
 }
 discard(job:FrameAnalysisAttempt):void{
  if(this.same(job))this.active=null;
 }
 get last():FrameAnalysisOutcome|null{return this.outcome;}
 get busy():boolean{return this.active!==null;}
 private same(job:FrameAnalysisAttempt):boolean{
  return job.generation===this.generation && this.active?.token===job.token;
 }
}
