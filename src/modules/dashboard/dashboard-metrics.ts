import type {SimulationSession,SessionScenario} from '../../core/domain/simulation-session';
import type {ReviewClosure} from '../../core/domain/review-closure';
import {collectReviewItems} from './review-state';

export type DashboardPeriod='all'|'day'|'week';
export type DashboardMode='all'|'synthetic'|'yolo';
export type DashboardScenario='all'|SessionScenario;
export interface DashboardFilter{
 readonly period:DashboardPeriod;
 readonly mode:DashboardMode;
 readonly scenario:DashboardScenario;
}
export interface DashboardMetrics{
 readonly sessions:number;
 readonly yoloSessions:number;
 readonly detections:number;
 readonly reviewEvents:number;
 readonly openReviews:number;
 readonly closedReviews:number;
 readonly meanConfidence:number|null;
 readonly meanInferenceMs:number|null;
 readonly byScenario:readonly {id:SessionScenario;count:number}[];
 readonly byClass:readonly {id:string;label:string;count:number}[];
 readonly byDay:readonly {date:string;count:number}[];
 readonly lastSavedAt:string|null;
}
export const DEFAULT_DASHBOARD_FILTER:DashboardFilter={period:'all',mode:'all',scenario:'all'};
const SCENARIO_IDS=['safety','quality','retail','warehouse'] as const;
/** KPI del historial guardado. No representa todas las inferencias realizadas en directo. */
export function calculateDashboard(
 records:readonly SimulationSession[],
 filter:DashboardFilter=DEFAULT_DASHBOARD_FILTER,
 now=new Date(),
 closures:readonly ReviewClosure[]=[]
):DashboardMetrics{
 const start=filter.period==='day'?now.getTime()-86400000:
  filter.period==='week'?now.getTime()-7*86400000:-Infinity;
 const entries=records.filter(record=>{
  const saved=Date.parse(record.savedAt);
  return Number.isFinite(saved)&&saved>=start&&saved<=now.getTime()&&
   (filter.mode==='all'||filter.mode===record.mode)&&
   (filter.scenario==='all'||filter.scenario===record.scenarioId);
 });
 const byClass=new Map<string,{label:string;count:number}>();
 const byDay=new Map<string,number>();
 let detections=0,scores=0,scoreCount=0,times=0,timeCount=0;
 const byScenario=SCENARIO_IDS.map(id=>({id,count:entries.filter(r=>r.scenarioId===id).length}));
 for(const record of entries){
  const day=record.savedAt.slice(0,10);
  byDay.set(day,(byDay.get(day)??0)+1);
  const inf=record.inference;
  if(!inf)continue;
  if(Number.isFinite(inf.inferenceMs)&&inf.inferenceMs>=0){
   times+=inf.inferenceMs;timeCount++;
  }
  for(const d of inf.detections){
   detections++;
   if(Number.isFinite(d.confidence)&&d.confidence>=0&&d.confidence<=1){
    scores+=d.confidence;scoreCount++;
   }
   const cls=byClass.get(d.classId)??{label:d.label,count:0};
   cls.count++;byClass.set(d.classId,cls);
  }
 }
 const reviews=collectReviewItems(entries,closures);
 return {
  sessions:entries.length,
  yoloSessions:entries.filter(r=>r.mode==='yolo').length,
  detections,reviewEvents:reviews.length,
  openReviews:reviews.filter(x=>x.status==='open').length,
  closedReviews:reviews.filter(x=>x.status==='closed').length,
  meanConfidence:scoreCount?scores/scoreCount:null,
  meanInferenceMs:timeCount?times/timeCount:null,
  byScenario,
  byClass:[...byClass].map(([id,v])=>({id,...v}))
   .sort((a,b)=>b.count-a.count||a.id.localeCompare(b.id)),
  byDay:[...byDay].map(([date,count])=>({date,count}))
   .sort((a,b)=>a.date.localeCompare(b.date)),
  lastSavedAt:entries.reduce<string|null>((date,r)=>
   date===null||r.savedAt>date?r.savedAt:date,null)
 };
}
