/**
 * Importador local de evaluación YOLO, sin ZIP ni transmisión al servidor.
 * Pares imagen y .txt. data.yaml obligatorio para mapear índices a clases del
 * modelo EPP; sin ese contrato no hay métricas fiables.
 */
import {PPE_CLASSES} from './ppe-model';
import type {GroundTruth} from './ppe-evaluation';
export interface EvaluationPair {
 readonly id:string;
 readonly image:File;
 readonly labels:File|null;
}
export interface EvaluationDataset {
 readonly pairs:readonly EvaluationPair[];
 readonly classIds:readonly string[];
 readonly classMap:readonly string[];
 readonly missingLabels:number;
 readonly fileBytes:number;
}
export const MAX_EVAL_IMAGES=40;
export const MAX_EVAL_BYTES=120_000_000;
const imageExt=/\.(jpg|jpeg|png|webp)$/i;
const txtExt=/\.txt$/i;
const yamlExt=/\.ya?ml$/i;
const norm=(name:string)=>name.replace(/^['"]|['"]$/g,'').trim();
const noComments=(line:string)=>line.replace(/\s+#.*$/,'').trim();
const classKey=(name:string)=>norm(name).toLowerCase().replace(/[_-]+/g,' ').replace(/\s+/g,' ');
function evaluationId(file:Pick<File,'name'> & {webkitRelativePath?:string}):string{
 const path=(file.webkitRelativePath||file.name).replace(/\\/g,'/');
 const segments=path.split('/');
 const split=segments.find(value=>/^(train|valid|val|test)$/i.test(value))?.toLowerCase()??'';
 const name=file.name.replace(/\.[^.]+$/,'').trim().toLowerCase();
 return (split?split+'/':'')+name;
}
/** Subconjuntos/permutaciones admitidos, pero clases no reconocidas se RECHAZAN. */
export function parsePpeYaml(text:string):readonly string[]{
 if(text.length>100_000)throw Error('data.yaml demasiado grande');
 const lines=text.replace(/\r/g,'').split('\n');
 const index=lines.findIndex(line=>/^\s*names\s*:/.test(line));
 if(index<0)throw Error('data.yaml debe incluir «names:» con las clases del dataset.');
 const declaration=noComments(lines[index].replace(/^\s*names\s*:\s*/,''));
 let names:string[]=[];
 if(declaration.startsWith('[')){
  const rest=lines.slice(index).join(' ');
  const match=rest.match(/names\s*:\s*\[([^\]]+)\]/);
  if(!match)throw Error('La lista names de data.yaml está incompleta.');
  names=match[1].split(',').map(norm);
 }else if(declaration.startsWith('{')){
  const match=declaration.match(/^\{([^}]+)\}/);
  if(!match)throw Error('El diccionario names está incompleto.');
  const entries=match[1].split(',').map(part=>part.match(/^\s*(\d+)\s*:\s*(.+)\s*$/));
  if(entries.some(item=>!item))throw Error('Índices inválidos en names.');
  const values=entries.map(item=>({index:Number(item![1]),name:norm(item![2])}))
   .sort((a,b)=>a.index-b.index);
  if(values.some((item,i)=>item.index!==i))throw Error('Índices de clase no consecutivos en names.');
  names=values.map(item=>item.name);
 }else{
  const items:{index:number;name:string}[]=[];
  for(const line of lines.slice(index+1)){
   if(!line.trim()||line.trim().startsWith('#'))continue;
   if(/^\S/.test(line)&& !/^\s*-\s+/.test(line))break;
   const numbered=line.match(/^\s*(\d+)\s*:\s*(.+?)\s*$/);
   const dashed=line.match(/^\s*-\s*(.+?)\s*$/);
   if(numbered)items.push({index:Number(numbered[1]),name:norm(noComments(numbered[2]))});
   else if(dashed)items.push({index:items.length,name:norm(noComments(dashed[1]))});
   else throw Error('Formato de nombres no reconocido en data.yaml: '+line.trim());
  }
  items.sort((a,b)=>a.index-b.index);
  if(items.some((item,i)=>item.index!==i))throw Error('Índices de clase no consecutivos en data.yaml.');
  names=items.map(item=>item.name);
 }
 if(!names.length||names.length>14)throw Error('data.yaml debe declarar entre 1 y 14 clases EPP.');
 const ids=names.map(label=>{
  const matched=PPE_CLASSES.find(item=>classKey(item.id)===classKey(label));
  if(!matched)throw Error('Clase no reconocida por el modelo EPP: '+label);
  return matched.id;
 });
 if(new Set(ids).size!==ids.length)throw Error('Clases duplicadas en data.yaml.');
 return ids;
}
export function parseYoloLabels(
 text:string,classMap:readonly string[],labelName='anotación.txt'
):GroundTruth[]{
 const records:GroundTruth[]=[];
 for(const [lineIndex,line] of text.replace(/\r/g,'').split('\n').entries()){
  const trimmed=line.trim();
  if(!trimmed||trimmed.startsWith('#'))continue;
  const cols=trimmed.split(/\s+/);
  if(cols.length!==5)throw Error(labelName+' línea '+(lineIndex+1)+': se esperan cinco columnas YOLO.');
  const numbers=cols.map(Number);
  if(numbers.some(n=>!Number.isFinite(n)))throw Error(labelName+' línea '+(lineIndex+1)+': datos no numéricos.');
  const [index,cx,cy,w,h]=numbers;
  if(!Number.isInteger(index)||index<0||index>=classMap.length)
   throw Error(labelName+' línea '+(lineIndex+1)+': índice de clase fuera de data.yaml.');
  if(cx<0||cx>1||cy<0||cy>1||w<=0||w>1||h<=0||h>1||
    cx-w/2<-.001||cy-h/2<-.001||cx+w/2>1.001||cy+h/2>1.001)
   throw Error(labelName+' línea '+(lineIndex+1)+': caja fuera del rango normalizado 0–1.');
  records.push({classId:classMap[index],box:{
   x:Math.max(0,cx-w/2),y:Math.max(0,cy-h/2),
   width:Math.min(w,1-Math.max(0,cx-w/2)),
   height:Math.min(h,1-Math.max(0,cy-h/2))
  }});
 }
 return records;
}
export function pairDatasetFiles(
 files:readonly File[],classMap:readonly string[],allowMissing=false
):EvaluationDataset{
 if(!classMap.length)throw Error('Primero se requiere el mapeo de data.yaml.');
 const images=new Map<string,File>();
 const labels=new Map<string,File>();
 let bytes=0;
 for(const file of files){
  const ext=file.name.toLowerCase();
  if(yamlExt.test(ext))continue;
  const id=evaluationId(file);
  if(imageExt.test(ext)){
   if(file.size>12_000_000)throw Error('Imagen mayor de 12 MB: '+file.name);
   if(images.has(id))throw Error('Dos imágenes comparten nombre: '+file.name);
   images.set(id,file);bytes+=file.size;
  }else if(txtExt.test(ext)){
   if(/^classes\.txt$/i.test(file.name))continue;
   if(file.size>1_000_000)throw Error('Anotación demasiado grande: '+file.name);
   if(labels.has(id))throw Error('Dos anotaciones comparten nombre: '+file.name);
   labels.set(id,file);bytes+=file.size;
  }else throw Error('Archivo no admitido: '+file.name);
 }
 if(!images.size)throw Error('Selecciona imágenes etiquetadas JPG, PNG o WebP.');
 if(images.size>MAX_EVAL_IMAGES)throw Error('Se admiten hasta '+MAX_EVAL_IMAGES+' imágenes por evaluación.');
 if(bytes>MAX_EVAL_BYTES)throw Error('El conjunto supera 120 MB.');
 for(const [id,file] of labels){
  if(!images.has(id))throw Error('Anotación sin imagen asociada: '+file.name);
 }
 let missing=0;
 const pairs=[...images].sort(([a],[b])=>a.localeCompare(b)).map(([id,image])=>{
  const label=labels.get(id)??null;
  if(!label)missing++;
  return {id,image,labels:label};
 });
 if(missing&&!allowMissing)throw Error('Faltan '+missing+
  ' archivos .txt. Activa «Sin .txt = fondo vacío» solo si verificaste el dataset.');
 return {pairs,classIds:[...classMap],classMap,missingLabels:missing,fileBytes:bytes};
}
export async function readEvaluationDataset(
 files:readonly File[],allowMissing=false
):Promise<{dataset:EvaluationDataset;truths:ReadonlyMap<string,readonly GroundTruth[]>}>{
 const yaml=files.filter(file=>/^(data|dataset)\.ya?ml$/i.test(file.name));
 if(yaml.length!==1)throw Error('Incluye exactamente un data.yaml o dataset.yaml, junto a las imágenes y etiquetas.');
 const classMap=parsePpeYaml(await yaml[0].text());
 const dataset=pairDatasetFiles(files,classMap,allowMissing);
 const truths=new Map<string,readonly GroundTruth[]>();
 for(const pair of dataset.pairs){
  const text=pair.labels?await pair.labels.text():'';
  truths.set(pair.id,parseYoloLabels(text,classMap,pair.labels?.name??pair.id));
 }
 return {dataset,truths};
}
