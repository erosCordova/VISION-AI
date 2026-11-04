/**
 * Evaluación reproducible de YOLO EPP con anotaciones YOLO reales.
 * No usa entidades del simulador, cifras inventadas ni cajas sintéticas.
 */
import type {BoundingBox,Detection} from '../../core/domain/model';
import {PPE_CLASSES} from './ppe-model';

export interface GroundTruth {
 readonly classId:string;
 readonly box:BoundingBox;
}
export interface EvaluationSample {
 readonly id:string;
 readonly groundTruth:readonly GroundTruth[];
 readonly predictions:readonly Detection[];
 readonly inferenceMs:number;
}
export interface EvaluationClass {
 readonly id:string;
 readonly label:string;
 readonly groundTruth:number;
 readonly predictions:number;
 readonly tp:number;
 readonly fp:number;
 readonly fn:number;
 readonly precision:number|null;
 readonly recall:number|null;
 readonly f1:number|null;
 readonly ap50:number|null;
}
export interface EvaluationReport {
 readonly samples:number;
 readonly objects:number;
 readonly tp:number;
 readonly fp:number;
 readonly fn:number;
 readonly precision:number|null;
 readonly recall:number|null;
 readonly f1:number|null;
 readonly map50:number|null;
 readonly evaluatedClasses:number;
 readonly totalInferenceMs:number;
 readonly meanInferenceMs:number;
 readonly perClass:readonly EvaluationClass[];
}
export function boxIoU(a:BoundingBox,b:BoundingBox):number{
 const left=Math.max(a.x,b.x),top=Math.max(a.y,b.y);
 const right=Math.min(a.x+a.width,b.x+b.width);
 const bottom=Math.min(a.y+a.height,b.y+b.height);
 const intersection=Math.max(0,right-left)*Math.max(0,bottom-top);
 const union=a.width*a.height+b.width*b.height-intersection;
 return union>0?intersection/union:0;
}
const safeDivide=(num:number,den:number):number|null=>den>0?num/den:null;
const f1Score=(precision:number|null,recall:number|null):number|null=>
 precision===null||recall===null?null:
 precision+recall>0?2*precision*recall/(precision+recall):0;

/** Match greedily by descending confidence against unmatched GT of the SAME class/image. */
function classify(
 samples:readonly EvaluationSample[],classId:string,scoreMin:number,iouMin:number
):{tp:number;fp:number;fn:number;precision:number|null;recall:number|null;f1:number|null;ap50:number|null;
  gtCount:number;predictionCount:number}{
 const groundTruth=samples.map(sample=>sample.groundTruth.filter(g=>g.classId===classId));
 const gtCount=groundTruth.reduce((total,list)=>total+list.length,0);
 const preds=samples.flatMap((sample,imageIndex)=>
  sample.predictions.filter(p=>p.classId===classId && Number.isFinite(p.confidence) && p.confidence>=.05)
   .map(p=>({...p,imageIndex})))
  .sort((a,b)=>b.confidence-a.confidence);
 const used=groundTruth.map(objects=>new Set<number>());
 let tp=0,fp=0,chosenTp=0,chosenFp=0;
 const cumulativeTp:number[]=[];
 const cumulativeFp:number[]=[];
 for(const prediction of preds){
  const image=prediction.imageIndex;
  let best=-1,bestIou=iouMin;
  groundTruth[image].forEach((truth,index)=>{
   if(used[image].has(index))return;
   const iou=boxIoU(truth.box,prediction.box);
   if(iou>=bestIou){bestIou=iou;best=index;}
  });
  const matched=best>=0;
  if(matched){used[image].add(best);tp++;}else fp++;
  cumulativeTp.push(tp);cumulativeFp.push(fp);
  if(prediction.confidence>=scoreMin){
   if(matched)chosenTp++;else chosenFp++;
  }
 }
 const fn=Math.max(0,gtCount-chosenTp);
 const precision=safeDivide(chosenTp,chosenTp+chosenFp);
 const recall=safeDivide(chosenTp,gtCount);
 let ap50:number|null=null;
 if(gtCount>0){
  const recalls=cumulativeTp.map(x=>x/gtCount);
  const precisions=cumulativeTp.map((x,i)=>x/(x+cumulativeFp[i]));
  // COCO-style interpolación a 101 niveles de recall, para una sola IoU = 0.50.
  let sum=0;
  for(let step=0;step<=100;step++){
   const target=step/100;
   let best=0;
   for(let k=0;k<recalls.length;k++){
    if(recalls[k]+1e-12>=target && precisions[k]>best)best=precisions[k];
   }
   sum+=best;
  }
  ap50=sum/101;
 }
 return {tp:chosenTp,fp:chosenFp,fn,precision,recall,
  f1:f1Score(precision,recall),ap50,gtCount,predictionCount:preds.length};
}
/**
 * mAP50: promedio solo sobre clases presentes en los GT. Las clases sin muestras no
 * cuentan como 0 ni como 1. Predicciones de clases fuera del dataset se ignoran.
 */
export function evaluateDetections(
 samples:readonly EvaluationSample[],
 classIds:readonly string[],
 scoreThreshold=.35,
 iouThreshold=.50
):EvaluationReport{
 if(!classIds.length)throw Error('No hay clases anotadas para evaluar.');
 if(!Number.isFinite(scoreThreshold)||scoreThreshold<.05||scoreThreshold>1)
  throw Error('El umbral de confianza debe estar entre 0.05 y 1.');
 if(!Number.isFinite(iouThreshold)||iouThreshold<=0||iouThreshold>1)
  throw Error('Umbral IoU inválido.');
 const unique=[...new Set(classIds)];
 if(unique.length!==classIds.length || unique.some(id=>!PPE_CLASSES.some(c=>c.id===id)))
  throw Error('Las clases de evaluación deben corresponder al detector EPP.');
 const perClass=unique.map(id=>{
  const metrics=classify(samples,id,scoreThreshold,iouThreshold);
  const ppe=PPE_CLASSES.find(c=>c.id===id)!;
  return {id,label:ppe.label,groundTruth:metrics.gtCount,
   predictions:metrics.predictionCount,tp:metrics.tp,fp:metrics.fp,fn:metrics.fn,
   precision:metrics.precision,recall:metrics.recall,f1:metrics.f1,ap50:metrics.ap50};
 });
 const tp=perClass.reduce((t,c)=>t+c.tp,0);
 const fp=perClass.reduce((t,c)=>t+c.fp,0);
 const fn=perClass.reduce((t,c)=>t+c.fn,0);
 const precision=safeDivide(tp,tp+fp),recall=safeDivide(tp,tp+fn);
 const present=perClass.filter(c=>c.ap50!==null);
 const totalInferenceMs=samples.reduce((total,s)=>total+s.inferenceMs,0);
 return {samples:samples.length,objects:tp+fn,tp,fp,fn,precision,recall,
  f1:f1Score(precision,recall),
  map50:present.length?present.reduce((total,c)=>total+c.ap50!,0)/present.length:null,
  evaluatedClasses:present.length,totalInferenceMs,
  meanInferenceMs:samples.length?totalInferenceMs/samples.length:0,
  perClass};
}
export function formatMetric(value:number|null):string{
 return value===null?'—':(value*100).toFixed(1)+'%';
}
