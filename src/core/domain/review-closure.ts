/** Acciones humanas locales independientes de las detecciones de YOLO. */
export type ReviewDecision='reviewed'|'follow_up'|'dismissed'|'inconclusive';
export const REVIEW_DECISIONS:Readonly<Record<ReviewDecision,string>>={
 reviewed:'Revisado (registro anterior)',follow_up:'Requiere seguimiento humano',
 dismissed:'Indicio descartado por revisión',inconclusive:'Revisado sin conclusión'
};
export interface ReviewClosure{
 readonly sessionId:string;readonly eventId:string;readonly closedAt:string;
 /** Ausente en revisiones guardadas antes de esta fase. */
 readonly decision?:ReviewDecision;
 readonly note?:string;
}
export function validateReviewDecision(decision:unknown,note:unknown):void{
 if(!['reviewed','follow_up','dismissed','inconclusive'].includes(decision as string))
  throw Error('Decisión de revisión inválida.');
 if(note!==undefined&&(typeof note!=='string'||note.length>240||
  note.trim()!==note))
  throw Error('La nota debe tener como máximo 240 caracteres y no tener espacios sobrantes.');
}
export function validateReviewClosure(raw:unknown):asserts raw is ReviewClosure{
 if(!raw||typeof raw!=='object')throw Error('Revisión dañada.');
 const r=raw as ReviewClosure;
 if(typeof r.sessionId!=='string'||!r.sessionId||
  typeof r.eventId!=='string'||!r.eventId||
  typeof r.closedAt!=='string'||!Number.isFinite(Date.parse(r.closedAt)))
  throw Error('Registro de revisión incompatible.');
 validateReviewDecision(r.decision??'reviewed',r.note);
}
