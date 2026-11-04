/** Conversión geométrica y postprocesamiento del YOLOv8n ONNX (COCO). */
import type { Detection } from '../../core/domain/model';

export const YOLO_INPUT = {width:640,height:480} as const;
export const YOLO_MODEL_URL =
 'https://huggingface.co/unileon-robotics/YOLO8-ONNX/resolve/main/yolov8n.onnx';
export const YOLO_SHA256 =
 'fa2c856b0effedce4f49fffd121f438247a64c8f633bf0e6d5e5960e869ccc5a';
export const YOLO_RUNTIME_URL='https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/ort.min.js';
export const YOLO_WASM_BASE='https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/';

/** Categorías oficiales COCO; los rótulos visibles se traducen al español. */
export const COCO_EN=[
 'person','bicycle','car','motorcycle','airplane','bus','train','truck','boat','traffic light',
 'fire hydrant','stop sign','parking meter','bench','bird','cat','dog','horse','sheep','cow',
 'elephant','bear','zebra','giraffe','backpack','umbrella','handbag','tie','suitcase','frisbee',
 'skis','snowboard','sports ball','kite','baseball bat','baseball glove','skateboard','surfboard',
 'tennis racket','bottle','wine glass','cup','fork','knife','spoon','bowl','banana','apple',
 'sandwich','orange','broccoli','carrot','hot dog','pizza','donut','cake','chair','couch',
 'potted plant','bed','dining table','toilet','tv','laptop','mouse','remote','keyboard',
 'cell phone','microwave','oven','toaster','sink','refrigerator','book','clock','vase',
 'scissors','teddy bear','hair drier','toothbrush'
] as const;
export const COCO_ES=[
 'Persona','Bicicleta','Automóvil','Motocicleta','Avión','Autobús','Tren','Camión','Barco','Semáforo',
 'Hidrante','Señal de alto','Parquímetro','Banco','Ave','Gato','Perro','Caballo','Oveja','Vaca',
 'Elefante','Oso','Cebra','Jirafa','Mochila','Paraguas','Bolso','Corbata','Maleta','Disco volador',
 'Esquís','Tabla de nieve','Pelota','Cometa','Bate','Guante de béisbol','Patineta','Tabla de surf',
 'Raqueta','Botella','Copa','Taza','Tenedor','Cuchillo','Cuchara','Cuenco','Plátano','Manzana',
 'Sándwich','Naranja','Brócoli','Zanahoria','Salchicha','Pizza','Dona','Pastel','Silla','Sofá',
 'Planta','Cama','Mesa','Inodoro','Televisor','Portátil','Ratón','Control remoto','Teclado',
 'Teléfono','Microondas','Horno','Tostadora','Lavadero','Refrigerador','Libro','Reloj','Jarrón',
 'Tijeras','Oso de peluche','Secador','Cepillo dental'
] as const;
export interface Letterbox { readonly sourceWidth:number;readonly sourceHeight:number;
 readonly scale:number;readonly padX:number;readonly padY:number;}
export interface DecodedYolo {readonly detections:readonly Detection[];readonly candidates:number;}
export function letterboxFor(width:number,height:number):Letterbox{
 if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)throw Error('Resolución de captura no válida');
 const scale=Math.min(YOLO_INPUT.width/width,YOLO_INPUT.height/height);
 return {sourceWidth:width,sourceHeight:height,scale,
  padX:(YOLO_INPUT.width-width*scale)/2,padY:(YOLO_INPUT.height-height*scale)/2};
}
interface Pred {classIndex:number;score:number;x:number;y:number;width:number;height:number}
function overlap(a:Pred,b:Pred):number{
 const left=Math.max(a.x,b.x),top=Math.max(a.y,b.y);
 const right=Math.min(a.x+a.width,b.x+b.width),bottom=Math.min(a.y+a.height,b.y+b.height);
 const intersection=Math.max(0,right-left)*Math.max(0,bottom-top);
 const union=a.width*a.height+b.width*b.height-intersection;
 return union>0?intersection/union:0;
}
export function suppressOverlaps(preds:readonly Pred[],iou=.45,limit=35):Pred[]{
 const sorted=[...preds].sort((a,b)=>b.score-a.score);
 const retained:Pred[]=[];
 for(const p of sorted){
  if(retained.length>=limit)break;
  if(!retained.some(q=>q.classIndex===p.classIndex&&overlap(q,p)>iou))retained.push(p);
 }
 return retained;
}
/**
 * YOLOv8 sin NMS: [1,84,6300] para 640x480, o [1,6300,84] en exportación transpuesta.
 * La salida incluye 4 coordenadas (cx,cy,w,h) y 80 scores; NO tiene objectness adicional.
 */
export function decodeYolov8(
 data:Float32Array|readonly number[],dims:readonly number[],letterbox:Letterbox,
 threshold=.35
):DecodedYolo{
 if(dims.length!==3||dims[0]!==1)throw Error('La salida del modelo YOLO tiene dimensiones inesperadas');
 const channelsFirst=dims[1]===84;
 const anchors=channelsFirst?dims[2]:dims[1];
 if((!channelsFirst&&dims[2]!==84)||anchors<1||anchors>30000||
  data.length!==anchors*84)throw Error('La salida YOLO no coincide con 80 clases COCO');
 if(letterbox.scale<=0||letterbox.sourceWidth<=0||letterbox.sourceHeight<=0)throw Error('Escala de captura inválida');
 const confidence=Math.max(.01,Math.min(.99,threshold));
 const at=(a:number,c:number)=>Number(data[channelsFirst?c*anchors+a:a*84+c]);
 const raw:Pred[]=[];
 for(let i=0;i<anchors;i++){
  let best=-1,score=-Infinity;
  for(let c=4;c<84;c++){
   const p=at(i,c);
   if(p>score){score=p;best=c-4;}
  }
  if(!Number.isFinite(score)||score<confidence||best<0)continue;
  const cx=at(i,0),cy=at(i,1),w=at(i,2),h=at(i,3);
  if(![cx,cy,w,h].every(Number.isFinite)||w<=0||h<=0)continue;
  const left=(cx-w/2-letterbox.padX)/letterbox.scale/letterbox.sourceWidth;
  const top=(cy-h/2-letterbox.padY)/letterbox.scale/letterbox.sourceHeight;
  const right=(cx+w/2-letterbox.padX)/letterbox.scale/letterbox.sourceWidth;
  const bottom=(cy+h/2-letterbox.padY)/letterbox.scale/letterbox.sourceHeight;
  const x=Math.max(0,Math.min(1,left)),y=Math.max(0,Math.min(1,top));
  const xmax=Math.max(0,Math.min(1,right)),ymax=Math.max(0,Math.min(1,bottom));
  if(xmax<=x||ymax<=y)continue;
  raw.push({classIndex:best,score,x,y,width:xmax-x,height:ymax-y});
 }
 const filtered=suppressOverlaps(raw,.45,35);
 return {candidates:raw.length,detections:filtered.map((p,i)=>({
  id:'yolo-'+(i+1),classId:COCO_EN[p.classIndex],label:COCO_ES[p.classIndex],
  confidence:p.score,box:{x:p.x,y:p.y,width:p.width,height:p.height}
 }))};
}
