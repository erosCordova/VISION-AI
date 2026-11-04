import {useEffect,useMemo,useRef,useState} from 'react';
import type {EvaluationDataset} from './ppe-dataset';
import {readEvaluationDataset} from './ppe-dataset';
import {evaluateDetections,formatMetric} from './ppe-evaluation';
import type {EvaluationSample,GroundTruth} from './ppe-evaluation';
import {analyzeYoloFrame,loadYoloBrowser} from './yolo-browser';
import type {Detection} from '../../core/domain/model';
import {PPE_MODEL} from './ppe-model';

interface Props {readonly disabled:boolean}
type Phase='idle'|'preparing'|'evaluating'|'complete'|'stopped'|'error';
const scalar=(value:number)=>Number.isFinite(value)?value.toFixed(1):'—';
function download(name:string,text:string,type:string){
 const blob=new Blob([text],{type});
 const url=URL.createObjectURL(blob);
 const link=document.createElement('a');
 link.href=url;link.download=name;document.body.appendChild(link);
 link.click();link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1500);
}
async function canvasFor(file:File):Promise<HTMLCanvasElement>{
 const bitmap=await createImageBitmap(file);
 try{
  const scale=Math.min(1,960/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');
  canvas.width=Math.max(2,Math.round(bitmap.width*scale));
  canvas.height=Math.max(2,Math.round(bitmap.height*scale));
  const ctx=canvas.getContext('2d');
  if(!ctx)throw Error('El navegador no permitió abrir imágenes.');
  ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
  return canvas;
 }finally{bitmap.close();}
}
function mark(ctx:CanvasRenderingContext2D,box:{x:number;y:number;width:number;height:number},
 label:string,color:string,W:number,H:number){
 const x=box.x*W,y=box.y*H,w=box.width*W,h=box.height*H;
 ctx.strokeStyle=color;ctx.lineWidth=Math.max(2,W/450);ctx.strokeRect(x,y,w,h);
 ctx.font='700 '+Math.max(11,Math.round(W/72))+'px sans-serif';
 const tw=ctx.measureText(label).width+13,tx=Math.max(0,Math.min(W-tw,x));
 const yy=Math.max(0,y-22);
 ctx.fillStyle='#0d263de8';ctx.fillRect(tx,yy,tw,20);
 ctx.fillStyle=color;ctx.fillRect(tx,yy,3,20);
 ctx.fillText(label,tx+8,yy+14);
}
function drawInspection(
 image:HTMLCanvasElement,truth:readonly GroundTruth[],predictions:readonly Detection[],
 output:HTMLCanvasElement,threshold:number
){
 output.width=image.width;output.height=image.height;
 const ctx=output.getContext('2d');
 if(!ctx)return;
 ctx.drawImage(image,0,0);
 truth.forEach(entry=>mark(ctx,entry.box,'GT · '+entry.classId,'#66f5d0',output.width,output.height));
 predictions.filter(p=>p.confidence>=threshold).forEach(entry=>mark(ctx,entry.box,
  'YOLO · '+entry.label+' '+Math.round(entry.confidence*100)+'%','#ffbc82',output.width,output.height));
}
export function PpeEvaluationPanel({disabled}:Props){
 const [images,setImages]=useState<readonly File[]>([]);
 const [annotations,setAnnotations]=useState<readonly File[]>([]);
 const [yaml,setYaml]=useState<File|null>(null);
 const [missingAsEmpty,setMissingAsEmpty]=useState(false);
 const [score,setScore]=useState(.35);
 const [phase,setPhase]=useState<Phase>('idle');
 const [status,setStatus]=useState('Carga imágenes, etiquetas YOLO .txt y data.yaml para evaluar.');
 const [error,setError]=useState('');
 const [progress,setProgress]=useState(0);
 const [dataset,setDataset]=useState<EvaluationDataset|null>(null);
 const [samples,setSamples]=useState<readonly EvaluationSample[]>([]);
 const [selectedId,setSelectedId]=useState('');
 const token=useRef(0);
 const inspectCanvas=useRef<HTMLCanvasElement>(null);
 const sourceCache=useRef(new Map<string,HTMLCanvasElement>());
 const report=useMemo(()=>dataset&&phase==='complete'?
  evaluateDetections(samples,dataset.classIds,score,.5):null,[dataset,phase,samples,score]);
 const selected=selectedId?dataset?.pairs.find(item=>item.id===selectedId):null;
 useEffect(()=>{
  if(!selected||!inspectCanvas.current||phase!=='complete')return;
  const sample=samples.find(s=>s.id===selected.id);
  if(!sample)return;
  let active=true;
  const draw=async()=>{
   let frame=sourceCache.current.get(selected.id);
   if(!frame){
    frame=await canvasFor(selected.image);
    if(!active)return;
    sourceCache.current.set(selected.id,frame);
   }
   if(active&&inspectCanvas.current)drawInspection(frame,sample.groundTruth,sample.predictions,
    inspectCanvas.current,score);
  };
  void draw().catch(e=>{if(active)setError(e instanceof Error?e.message:String(e));});
  return()=>{active=false;};
 },[selected,selectedId,samples,score,phase]);
 useEffect(()=>()=>{token.current++;sourceCache.current.clear();},[]);
 function reset(){
  token.current++;
  setPhase('idle');setDataset(null);setSamples([]);setProgress(0);
  setSelectedId('');setError('');sourceCache.current.clear();
  setStatus('Archivos cambiados: ejecuta una nueva evaluación.');
 }
 function stop(){
  token.current++;setPhase('stopped');
  setStatus('Evaluación detenida. No se procesarán nuevas imágenes; la inferencia en curso puede finalizar.');
 }
 async function evaluate(){
  if(disabled||phase==='preparing'||phase==='evaluating')return;
  const run=++token.current;
  sourceCache.current.clear();
  setPhase('preparing');setError('');setDataset(null);setSamples([]);
  setSelectedId('');setProgress(0);
  try{
   const files=[...images,...annotations,...(yaml?[yaml]:[])];
   const read=await readEvaluationDataset(files,missingAsEmpty);
   if(token.current!==run)return;
   const {dataset:batch,truths}=read;
   setDataset(batch);
   setStatus('Preparando el detector industrial ONNX en el navegador…');
   const model=await loadYoloBrowser(message=>{if(run===token.current)setStatus(message);},'ppe');
   if(run!==token.current)return;
   setPhase('evaluating');
   const collected:EvaluationSample[]=[];
   for(let index=0;index<batch.pairs.length;index++){
    if(token.current!==run)return;
    const pair=batch.pairs[index];
    setStatus('Evaluando '+(index+1)+'/'+batch.pairs.length+' — '+pair.image.name);
    const canvas=await canvasFor(pair.image);
    if(token.current!==run)return;
    const result=await analyzeYoloFrame(model,canvas,.05,250);
    if(token.current!==run)return;
    collected.push({id:pair.id,groundTruth:truths.get(pair.id)??[],
      predictions:result.detections,inferenceMs:result.inferenceMs});
    setProgress(index+1);
   }
   if(token.current!==run)return;
   setSamples(collected);
   setSelectedId(batch.pairs[0]?.id??'');
   setPhase('complete');
   setStatus('Evaluación completa: '+collected.length+
    ' imágenes analizadas con predicciones reales del modelo EPP.');
  }catch(e){
   if(token.current!==run)return;
   setPhase('error');
   setError(e instanceof Error?e.message:String(e));
   setStatus('No se pudieron calcular métricas. Revisa las anotaciones o el modelo.');
  }
 }
 function exportReport(kind:'csv'|'json'){
  if(!report||!dataset)return;
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  if(kind==='json'){
   const output={evaluatedAt:new Date().toISOString(),model:PPE_MODEL.id,
    modelSha256:PPE_MODEL.sha256,classes:dataset.classIds,iou:0.5,
    minInferenceConfidence:0.05,decisionThreshold:score,
    metrics:report,samples:samples.map(s=>({id:s.id,groundTruth:s.groundTruth,
     predictions:s.predictions,inferenceMs:s.inferenceMs}))};
   download('vision-ai-epp-evaluacion-'+stamp+'.json',JSON.stringify(output,null,2),'application/json');
  }else{
   const rows=[
    'clase,anotaciones,TP,FP,FN,precision,recall,F1,AP50',
    ...report.perClass.map(c=>[JSON.stringify(c.label),c.groundTruth,c.tp,c.fp,c.fn,
     c.precision??'',c.recall??'',c.f1??'',c.ap50??''].join(',')),
    ['RESUMEN',report.objects,report.tp,report.fp,report.fn,
     report.precision??'',report.recall??'',report.f1??'',report.map50??''].join(',')
   ];
   download('vision-ai-epp-metricas-'+stamp+'.csv','\uFEFF'+rows.join('\n'),'text/csv;charset=utf-8');
  }
 }
 const canStart=images.length>0&&yaml!==null&&!disabled&&phase!=='preparing'&&phase!=='evaluating';
 return <section className="ppe-evaluation" aria-label="Evaluación de precisión del detector EPP">
  <div className="ppe-evaluation-head">
   <div><span className="ppe-evaluation-eyebrow">EVALUACIÓN CUANTITATIVA · MODELO EPP</span>
    <h3>Laboratorio de precisión</h3>
    <p>Compara detecciones reales de YOLO con anotaciones de referencia verificables.
       Las métricas permanecen vacías hasta procesar un dataset.</p></div>
   <span className="ppe-eval-origin">SIN DATOS DEMO</span>
  </div>
  <div className="ppe-evaluation-uploads">
   <label>1. Imágenes de validación
    <input aria-label="Imágenes de validación" type="file" multiple
     accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
     onChange={e=>{setImages(Array.from(e.target.files??[]));reset();}} />
    <small>{images.length} imágenes seleccionadas · hasta 40</small>
   </label>
   <label>2. Etiquetas YOLO (.txt)
    <input aria-label="Etiquetas de referencia YOLO" type="file" multiple accept=".txt,text/plain"
     onChange={e=>{setAnnotations(Array.from(e.target.files??[]));reset();}} />
    <small>{annotations.length} archivos de anotación</small>
   </label>
   <label>3. Orden de clases (data.yaml)
    <input aria-label="Configuración data.yaml de las clases" type="file"
     accept=".yaml,.yml"
     onChange={e=>{setYaml(e.target.files?.[0]??null);reset();}} />
    <small>{yaml?.name??'Obligatorio: para evitar clases mal asignadas'}</small>
   </label>
  </div>
  <label className="ppe-eval-negatives"><input type="checkbox" checked={missingAsEmpty}
   onChange={e=>{setMissingAsEmpty(e.target.checked);reset();}} />
   Tratar imágenes sin .txt como fondos sin objetos (solo cuando el dataset lo confirme)
  </label>
  <p className="ppe-eval-guidance">Formato YOLO: <code>clase x_centro y_centro ancho alto</code>,
   coordenadas 0–1. <code>data.yaml</code> debe declarar <code>names</code> con clases del modelo EPP.
   Selecciona imágenes y anotaciones del mismo conjunto <b>de validación o prueba</b>;
   no del entrenamiento. Todos los archivos se procesan localmente, sin subirlos a Render.</p>
  <div className="ppe-eval-actions">
   <button type="button" className="ppe-eval-start" disabled={!canStart}
    onClick={()=>void evaluate()}>◉ Ejecutar evaluación YOLO</button>
   {(phase==='preparing'||phase==='evaluating')&&
    <button type="button" onClick={stop}>Ⅱ Detener evaluación</button>}
   {disabled&&<span>Detén primero la inferencia de la escena.</span>}
   {report&&<>
    <button type="button" onClick={()=>exportReport('csv')}>Exportar métricas CSV</button>
    <button type="button" onClick={()=>exportReport('json')}>Exportar resultados JSON</button>
   </>}
  </div>
  <p className="ppe-eval-status" role="status">{status}
   {(phase==='preparing'||phase==='evaluating')&&
    <progress max={dataset?.pairs.length??1} value={progress}/>}
  </p>
  {error&&<p className="ppe-eval-error" role="alert">{error}</p>}
  {!report&&<p className="ppe-eval-empty">Sin evaluación realizada. No existen cifras de precisión,
   recall ni mAP medidas para este conjunto.</p>}
  {report&&<>
   <div className="ppe-eval-summary">
    <div><span>mAP@50</span><strong>{formatMetric(report.map50)}</strong><small>{report.evaluatedClasses} clases con GT</small></div>
    <div><span>Precisión</span><strong>{formatMetric(report.precision)}</strong><small>micro · umbral {Math.round(score*100)}%</small></div>
    <div><span>Recall</span><strong>{formatMetric(report.recall)}</strong><small>micro · IoU ≥ 0,50</small></div>
    <div><span>F1</span><strong>{formatMetric(report.f1)}</strong><small>micro · umbral {Math.round(score*100)}%</small></div>
   </div>
   <div className="ppe-eval-toolbar">
    <div><b>{report.samples} imágenes</b> · {report.objects} objetos de referencia ·
     {report.tp} TP · {report.fp} FP · {report.fn} FN</div>
    <label htmlFor="ppe-eval-threshold">Confianza para P/R/F1: <b>{Math.round(score*100)}%</b></label>
    <input id="ppe-eval-threshold" type="range" min="5" max="90" step="5"
     value={Math.round(score*100)} onChange={e=>setScore(Number(e.target.value)/100)}/>
   </div>
   {report.samples<15&&<p className="ppe-eval-caution">
    Muestra pequeña ({report.samples} imágenes). Los resultados son exploratorios;
    no permiten afirmar una precisión representativa.</p>}
   <div className="ppe-eval-class-performance">
    <h4>Rendimiento por clase</h4>
    <div className="ppe-eval-table-wrap"><table>
     <thead><tr><th>Clase</th><th>GT</th><th>TP</th><th>FP</th><th>FN</th>
      <th>P</th><th>R</th><th>F1</th><th>AP@50</th></tr></thead>
     <tbody>{report.perClass.map(row=><tr key={row.id}>
      <td>{row.label}</td><td>{row.groundTruth}</td><td>{row.tp}</td><td>{row.fp}</td>
      <td>{row.fn}</td><td>{formatMetric(row.precision)}</td>
      <td>{formatMetric(row.recall)}</td><td>{formatMetric(row.f1)}</td>
      <td><div className="ppe-eval-ap"><span>{formatMetric(row.ap50)}</span>
       {row.ap50!==null&&<i style={{width:Math.round(row.ap50*100)+'%'}}/>}</div></td>
     </tr>)}</tbody>
    </table></div>
   </div>
   <div className="ppe-eval-inspection">
    <div className="ppe-eval-inspection-head">
     <div><h4>Inspección de errores</h4><p>Comparación de cajas GT y predicciones YOLO en la imagen analizada.</p></div>
     <select aria-label="Imagen para inspeccionar" value={selectedId}
      onChange={e=>setSelectedId(e.target.value)}>
      {dataset?.pairs.map(p=><option key={p.id} value={p.id}>{p.image.name}</option>)}
     </select>
    </div>
    <div className="ppe-eval-legend"><span><i className="is-gt"/> Verdad terreno (GT)</span>
     <span><i className="is-pred"/> Predicción YOLO</span></div>
    <canvas ref={inspectCanvas} aria-label="Comparación visual de etiquetas y detecciones" role="img"
     width={960} height={550}/>
   </div>
   <p className="ppe-eval-caveat"><b>Interpretación:</b> mAP@50 estimado con interpolación de 101 niveles
    de recall, una IoU de 0,50 y predicciones filtradas por NMS. Se descartan puntuaciones inferiores
    a 5%. No es el mAP@50-95 oficial de COCO. Las clases sin anotaciones GT se excluyen del promedio.
    La precisión, recall y F1 usan el umbral seleccionado. Un resultado vacío no demuestra que nadie
    incumpla las normas de seguridad.</p>
  </>}
 </section>;
}
