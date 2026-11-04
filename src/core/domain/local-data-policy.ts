/** Fase 13: gobernanza local; ninguna limpieza se ejecuta automáticamente. */
export const RETENTION_DAYS=[30,90,180] as const;
export type RetentionDays=typeof RETENTION_DAYS[number];
export const PRIVACY_CONFIRM_PURGE='DEPURAR';
export const PRIVACY_CONFIRM_ERASE='BORRAR TODO';
export function isRetentionDays(value:unknown):value is RetentionDays{
 return RETENTION_DAYS.includes(value as RetentionDays);
}
export interface RetainedSession{
 readonly id:string;readonly savedAt:string;
}
export function expiredSessionIds(records:readonly RetainedSession[],
 days:RetentionDays,now=new Date()):string[]{
 if(!isRetentionDays(days)||!Number.isFinite(now.getTime()))
  throw Error('Periodo de conservación o fecha inválida.');
 const cutoff=now.getTime()-days*86_400_000;
 return records.filter(record=>{
  const value=Date.parse(record.savedAt);
  // Registros sin fecha válida nunca se purgan por antigüedad.
  return Number.isFinite(value)&&value<=cutoff&&value<=now.getTime();
 }).map(record=>record.id).sort();
}
export function formatLocalDataSummary(
 validSessionCount:number,corruptCount:number,reviewCount:number,
 expiredCount:number
){
 for(const n of [validSessionCount,corruptCount,reviewCount,expiredCount])
  if(!Number.isSafeInteger(n)||n<0)throw Error('Conteo de registros inválido.');
 return {
  sessions:validSessionCount,corrupt:corruptCount,reviews:reviewCount,
  expired:expiredCount
 };
}
