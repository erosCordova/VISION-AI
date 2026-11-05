import type {SimulationSession,SessionScenario} from '../../../core/domain/simulation-session';
import {REVIEW_DECISIONS} from '../../../core/domain/review-closure';
import type {ReviewClosure,ReviewDecision} from '../../../core/domain/review-closure';

/** Un indicio se refiere a la clase observada, nunca identifica a una persona. */
export interface ReviewItem {
 readonly id:string;
 readonly sessionId:string;
 readonly eventId:string;
 readonly scenarioId:SessionScenario;
 readonly scenarioName:string;
 readonly label:string;
 readonly classId:string;
 readonly evidenceAt:string;
 readonly frameNumber:number;
 readonly supportingFrames:number;
 readonly confidence:number;
 readonly status:'open'|'closed';
 readonly closedAt:string|null;
 readonly decision:ReviewDecision|null;
 readonly decisionLabel:string|null;
 readonly note:string|null;
}
const reviewKey=(sessionId:string,eventId:string)=>JSON.stringify([sessionId,eventId]);
/** Ensambla los estados humanos con episodios YOLO ya guardados, sin alterar evidencia. */
export function collectReviewItems(
 sessions:readonly SimulationSession[],closures:readonly ReviewClosure[]
):ReviewItem[]{
 const closed=new Map(closures.map(row=>[reviewKey(row.sessionId,row.eventId),row]));
 const seen=new Set<string>();
 const items:ReviewItem[]=[];
 for(const session of sessions){
  for(const event of session.inference?.reviewLog??[]){
   const key=reviewKey(session.id,event.id);
   if(seen.has(key))continue;
   seen.add(key);
   const closure=closed.get(key)??null;
   const closedAt=closure?.closedAt??null;
   const decision=closure?(closure.decision??'reviewed'):null;
   const eventDate=new Date(event.observedAtMs);
   const evidenceAt=Number.isFinite(event.observedAtMs)&&
    Number.isFinite(eventDate.getTime())?eventDate.toISOString():session.savedAt;
   items.push({
    id:key,sessionId:session.id,eventId:event.id,
    scenarioId:session.scenarioId,scenarioName:session.scenarioName,
    label:event.label,classId:event.classId,
    evidenceAt,
    frameNumber:event.frameNumber,
    supportingFrames:event.supportingFrames,
    confidence:event.maxConfidence,
    status:closedAt?'closed':'open',closedAt,
    decision,decisionLabel:decision?REVIEW_DECISIONS[decision]:null,
    note:closure?.note??null
   });
  }
 }
 return items.sort((a,b)=>b.evidenceAt.localeCompare(a.evidenceAt)||a.id.localeCompare(b.id));
}
/** Función pura para demostrar idempotencia del conteo KP02. */
export function withReviewClosed(
 closures:readonly ReviewClosure[],sessionId:string,eventId:string,
 closedAt:string,decision:ReviewDecision='reviewed',note?:string
):readonly ReviewClosure[]{
 if(closures.some(x=>x.sessionId===sessionId&&x.eventId===eventId))return closures;
 return [...closures,{sessionId,eventId,closedAt,decision,...(note?{note}:{})}];
}
