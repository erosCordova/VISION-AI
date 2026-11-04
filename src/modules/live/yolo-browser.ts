/** Adaptador ONNX Runtime Web en WASM; no instala nada en Render y no fabrica predicciones. */
import {decodeYolov8,decodeYoloClasses,letterboxFor,YOLO_INPUT,YOLO_MODEL_URL,
 YOLO_RUNTIME_URL,YOLO_WASM_BASE,YOLO_SHA256} from './yolo-postprocess';
import type {Detection} from '../../core/domain/model';
import {PPE_CLASSES,PPE_MODEL} from './ppe-model';

interface OrtTensor {
 readonly dims: readonly number[];
 readonly data: Float32Array|readonly number[];
 readonly type: string;
 readonly dispose?: ()=>void|Promise<void>;
}
interface OrtSession {
 readonly inputNames: readonly string[];
 readonly outputNames: readonly string[];
 run(feeds:Record<string,unknown>):Promise<Record<string,OrtTensor>>;
}
interface OrtApi {
 readonly env: { readonly wasm: { wasmPaths:string;numThreads:number;proxy:boolean } };
 readonly Tensor: new (type:string,data:Float32Array,dims:readonly number[])=>unknown;
 readonly InferenceSession: {create(bytes:Uint8Array,
  options:{executionProviders:readonly string[];graphOptimizationLevel:string}):Promise<OrtSession>};
}
export type YoloFamily='coco'|'ppe';
export interface LoadedYolo {readonly ort:OrtApi;readonly session:OrtSession;readonly family:YoloFamily}
const shared:{runtime?:Promise<OrtApi>;session?:Promise<LoadedYolo>;ppeSession?:Promise<LoadedYolo>}={};
export interface YoloFrame {
 readonly source:HTMLCanvasElement;
 readonly width:number;
 readonly height:number;
 readonly detections:readonly Detection[];
 readonly inferenceMs:number;
 readonly candidates:number;
 readonly createdAt:number;
}
/** Precarga el runtime SOLO bajo acción del usuario; URL y versión fijadas. */
function loadScript():Promise<OrtApi>{
 if(shared.runtime)return shared.runtime;
 shared.runtime=new Promise<OrtApi>((resolve,reject)=>{
  const existing=(window as Window & {ort?:OrtApi}).ort;
  if(existing){resolve(existing);return;}
  const script=document.createElement('script');
  script.src=YOLO_RUNTIME_URL;
  script.async=true;script.crossOrigin='anonymous';
  script.onload=()=>{
   const ort=(window as Window & {ort?:OrtApi}).ort;
   if(ort)resolve(ort);
   else reject(Error('El módulo ONNX Runtime no se inicializó.'));
  };
  script.onerror=()=>reject(Error('No se pudo descargar ONNX Runtime Web. Comprueba la conexión o el bloqueo del CDN.'));
  document.head.appendChild(script);
 }).catch(error=>{shared.runtime=undefined;throw error;});
 return shared.runtime;
}
export async function loadYoloBrowser(onProgress:(status:string)=>void,family:YoloFamily='coco'):Promise<LoadedYolo>{
 if(family==='ppe')return loadPpeBrowser(onProgress);
 if(shared.session)return shared.session;
 shared.session=(async()=>{
  onProgress('Descargando motor de inferencia WASM…');
  const ort=await loadScript();
  ort.env.wasm.wasmPaths=YOLO_WASM_BASE;
  ort.env.wasm.numThreads=1; // Compatible con sitios sin COOP/COEP.
  ort.env.wasm.proxy=false;
  onProgress('Descargando pesos YOLOv8n (aprox. 13 MB)…');
  const response=await fetch(YOLO_MODEL_URL,{mode:'cors',cache:'force-cache'});
  if(!response.ok)throw Error('No fue posible descargar los pesos YOLO (HTTP '+response.status+').');
  const buffer=await response.arrayBuffer();
  if(buffer.byteLength<10_000_000||buffer.byteLength>16_000_000)
   throw Error('El archivo del modelo YOLO tiene un tamaño inesperado.');
  onProgress('Comprobando integridad del modelo…');
  const hash=await crypto.subtle.digest('SHA-256',buffer);
  const checksum=[...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');
  if(checksum!==YOLO_SHA256)throw Error('Integridad del modelo YOLO no verificada. Se rechazó la carga.');
  onProgress('Inicializando el modelo YOLO en CPU del navegador…');
  const session=await ort.InferenceSession.create(new Uint8Array(buffer),{
   executionProviders:['wasm'],graphOptimizationLevel:'all'
  });
  if(session.inputNames.length!==1||session.outputNames.length<1)
   throw Error('El modelo no expone un contrato de detección válido.');
  return {ort,session,family:'coco' as const};
 })().catch(error=>{shared.session=undefined;throw error;});
 return shared.session;
}

/** Pesos especializados solo para Seguridad. Verificación SHA256 obligatoria. */
async function loadPpeBrowser(onProgress:(status:string)=>void):Promise<LoadedYolo>{
 if(shared.ppeSession)return shared.ppeSession;
 shared.ppeSession=(async()=>{
  onProgress('Preparando ONNX Runtime para seguridad industrial…');
  const ort=await loadScript();
  ort.env.wasm.wasmPaths=YOLO_WASM_BASE;
  ort.env.wasm.numThreads=1;
  ort.env.wasm.proxy=false;
  onProgress('Descargando modelo especializado EPP (44,8 MB) en tu dispositivo…');
  const response=await fetch(PPE_MODEL.url,{mode:'cors',cache:'force-cache'});
  if(!response.ok)throw Error('No se pudieron descargar los pesos de seguridad (HTTP '+response.status+').');
  const buffer=await response.arrayBuffer();
  if(buffer.byteLength<PPE_MODEL.minBytes||buffer.byteLength>PPE_MODEL.maxBytes)
   throw Error('El archivo ONNX EPP no coincide con el tamaño esperado.');
  onProgress('Verificando integridad SHA256 del modelo industrial…');
  const hash=await crypto.subtle.digest('SHA-256',buffer);
  const checksum=[...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,'0')).join('');
  if(checksum!==PPE_MODEL.sha256)throw Error('SHA256 del detector EPP inválido. Se rechazó el modelo.');
  onProgress('Inicializando YOLOv8s EPP mediante WebAssembly…');
  const session=await ort.InferenceSession.create(new Uint8Array(buffer),{
   executionProviders:['wasm'],graphOptimizationLevel:'all'
  });
  if(session.inputNames.length!==1||session.outputNames.length<1)
   throw Error('El detector especializado no expone entradas y salidas válidas.');
  return {ort,session,family:'ppe' as const};
 })().catch(error=>{shared.ppeSession=undefined;throw error;});
 return shared.ppeSession;
}

export function captureRenderedFrame(canvas:HTMLCanvasElement):HTMLCanvasElement{
 if(canvas.width<2||canvas.height<2)throw Error('El motor 3D todavía no tiene fotogramas.');
 const captured=document.createElement('canvas');
 const scale=Math.min(1,960/Math.max(canvas.width,canvas.height));
 captured.width=Math.max(2,Math.round(canvas.width*scale));
 captured.height=Math.max(2,Math.round(canvas.height*scale));
 const ctx=captured.getContext('2d',{willReadFrequently:true});
 if(!ctx)throw Error('No se pudo capturar un fotograma 3D.');
 ctx.drawImage(canvas,0,0,captured.width,captured.height);
 return captured;
}
/** Letterbox: preservar la proporción de la escena frente a la entrada fija de YOLO. */
export function toYoloTensor(canvas:HTMLCanvasElement,
 target:{width:number;height:number}=YOLO_INPUT):{
 readonly data:Float32Array;readonly letterbox:ReturnType<typeof letterboxFor>
}{
 const letterbox=letterboxFor(canvas.width,canvas.height,target);
 const resized=document.createElement('canvas');
 resized.width=target.width;resized.height=target.height;
 const ctx=resized.getContext('2d',{willReadFrequently:true});
 if(!ctx)throw Error('No se pudo preparar el tensor del modelo.');
 ctx.fillStyle='rgb(114,114,114)';ctx.fillRect(0,0,resized.width,resized.height);
 ctx.drawImage(canvas,letterbox.padX,letterbox.padY,
  canvas.width*letterbox.scale,canvas.height*letterbox.scale);
 const pixels=ctx.getImageData(0,0,resized.width,resized.height).data;
 const size=resized.width*resized.height;
 const tensor=new Float32Array(3*size);
 for(let i=0;i<size;i++){
  const k=i*4;
  tensor[i]=pixels[k]/255;
  tensor[size+i]=pixels[k+1]/255;
  tensor[size*2+i]=pixels[k+2]/255;
 }
 return {data:tensor,letterbox};
}
export async function analyzeYoloFrame(
 model:LoadedYolo,captured:HTMLCanvasElement,
 threshold:number,maxDetections=35):Promise<YoloFrame>{
 const target=model.family==='ppe'?PPE_MODEL.input:YOLO_INPUT;
 const {data,letterbox}=toYoloTensor(captured,target);
 const input=new model.ort.Tensor('float32',data,[1,3,target.height,target.width]);
 try {
  const before=performance.now();
  const output=await model.session.run({[model.session.inputNames[0]]:input});
  const inferenceMs=performance.now()-before;
  try {
   const value=output[model.session.outputNames[0]];
   if(!value||value.type!=='float32'||!value.data)
    throw Error('El motor devolvió una salida incompatible con YOLOv8n.');
   const decoded=model.family==='ppe'
    ?decodeYoloClasses(value.data,value.dims,letterbox,PPE_CLASSES,threshold,maxDetections)
    :decodeYolov8(value.data,value.dims,letterbox,threshold);
   return {source:captured,width:captured.width,height:captured.height,
    detections:decoded.detections,candidates:decoded.candidates,
    inferenceMs,createdAt:performance.now()};
  } finally {
   for(const tensor of Object.values(output))await tensor.dispose?.();
  }
 } finally {
  await (input as {dispose?:()=>void|Promise<void>}).dispose?.();
 }
}
