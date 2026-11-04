import {SCENE_VERSION,validateSimulationSession} from '../../core/domain/simulation-session';
import type {SimulationSession} from '../../core/domain/simulation-session';
import {simulationSnapshot,validScenario} from './simulation-engine';
import type {ScenarioKey,SimSnapshot} from './simulation-engine';
import type {CameraView} from './scene-math';
import {validYoloFrameSource} from './yolo-telemetry';
import type {YoloTelemetry} from './yolo-telemetry';
export interface SessionInput {
 readonly scenarioId:ScenarioKey;readonly scenarioName:string;readonly elapsed:number;
 readonly graphics:'human'|'light';readonly camera:CameraView;
 readonly mode:'synthetic'|'yolo';readonly telemetry:YoloTelemetry;
}
export function snapshotFingerprint(s:SimSnapshot,elapsedMs:number):string{
 const text=JSON.stringify({sceneVersion:SCENE_VERSION,scenario:s.scenarioId,elapsedMs,
  entities:s.entities.map(e=>[e.id,e.kind,e.x,e.y,e.width,e.height,e.state,e.segment]),
  zones:s.zones.map(z=>[z.label,z.x,z.y,z.width,z.height]),
  count:s.count,event:s.event,alert:s.alert});
 let result=2166136261;
 for(let i=0;i<text.length;i++){result=Math.imul(result^text.charCodeAt(i),16777619);}
 return (result>>>0).toString(16).padStart(8,'0');
}
export function buildSimulationSession(input:SessionInput,clock=new Date(),id:string=crypto.randomUUID()):SimulationSession{
 if(!validScenario(input.scenarioId))throw Error('Escenario de simulación desconocido.');
 if(!Number.isFinite(input.elapsed)||input.elapsed<0||input.elapsed>3600)
  throw Error('Tiempo de simulación inválido.');
 if(!['synthetic','yolo'].includes(input.mode))throw Error('Modo de sesión inválido.');
 if(!['human','light'].includes(input.graphics))throw Error('Calidad de escena desconocida.');
 if(!['isometric','frontal','superior','persona'].includes(input.camera))
  throw Error('Cámara no soportada.');
 if(!Number.isFinite(clock.getTime()))throw Error('Fecha de guardado inválida.');
 const observation=input.telemetry.observations.at(-1)??null;
 const provenance=input.mode==='yolo'?observation?.source:null;
 if(provenance&&(!validYoloFrameSource(provenance)||provenance.scenarioId!==input.scenarioId))
  throw Error('La lectura YOLO no corresponde a este escenario de simulación.');
 const elapsedMs=provenance?.elapsedMs??Math.round(input.elapsed*1000);
 const graphics=provenance?.graphics??input.graphics;
 const camera=provenance?.camera??input.camera;
 const sample=simulationSnapshot(input.scenarioId,elapsedMs/1000);
 if(input.mode==='yolo' && (!observation||input.telemetry.phase==='failed'||
  input.telemetry.phase==='retrying'))
  throw Error('Primero ejecuta YOLO y procesa al menos un fotograma antes de guardar su resultado.');
 const inference=input.mode==='yolo'&&observation?{
  model:observation.model,
  modelLabel:observation.model==='ppe'?'YOLOv8s EPP':'YOLOv8n COCO',
  frameNumber:observation.frameNumber,
  observedAtMs:observation.capturedAtMs,
  inferenceMs:observation.inferenceMs,
  detections:observation.detections.map(d=>({...d,box:{...d.box}})),
  reviewLog:input.telemetry.reviewLog.map(x=>({...x}))
 }:null;
 const record:SimulationSession={schemaVersion:1,id,savedAt:clock.toISOString(),
  scenarioId:input.scenarioId,scenarioName:input.scenarioName,mode:input.mode,
  source:{kind:'simulation-3d',sceneVersion:SCENE_VERSION,elapsedMs,
   graphics,camera,fingerprint:snapshotFingerprint(sample,elapsedMs),
   syntheticEvent:sample.event,syntheticObjectCount:sample.entities.length},
  inference};
 validateSimulationSession(record);
 return record;
}
export function validateReproducibility(record:SimulationSession):void{
 validateSimulationSession(record);
 const snapshot=simulationSnapshot(record.scenarioId,record.source.elapsedMs/1000);
 if(record.source.fingerprint!==snapshotFingerprint(snapshot,record.source.elapsedMs)||
  record.source.syntheticEvent!==snapshot.event||
  record.source.syntheticObjectCount!==snapshot.entities.length)
  throw Error('La fuente de simulación fue alterada o no coincide con su versión.');
}
export function sameScenarioSnapshot(scenario:ScenarioKey,timeMs:number):boolean{
 const a=simulationSnapshot(scenario,timeMs/1000),b=simulationSnapshot(scenario,timeMs/1000);
 return snapshotFingerprint(a,timeMs)===snapshotFingerprint(b,timeMs);
}
