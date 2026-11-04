/** Estado persistente de una revisión humana. La evidencia YOLO se conserva inmutable. */
export interface ReviewClosure{
 readonly sessionId:string;
 readonly eventId:string;
 readonly closedAt:string;
}
export function validateReviewClosure(raw:unknown):asserts raw is ReviewClosure{
 if(!raw||typeof raw!=='object')throw Error('Revisión dañada.');
 const r=raw as ReviewClosure;
 if(!r.sessionId||typeof r.sessionId!=='string'||
    !r.eventId||typeof r.eventId!=='string'||
    typeof r.closedAt!=='string'||!Number.isFinite(Date.parse(r.closedAt)))
  throw Error('Registro de revisión incompatible.');
}
