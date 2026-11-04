import type {BoundingBox} from '../../core/domain/model';
/** Máscara cromática medida SOLO sobre los píxeles del fotograma capturado.
 * No equivale a segmentación semántica, ni es la salida de YOLO-seg. */
export interface ChromaticMask {
 readonly width:number;
 readonly height:number;
 /** Índices 0/1 para cada píxel de la imagen, sin interpolación geométrica. */
 readonly binary:Uint8Array;
 readonly imagePixels:number;
 readonly selectedPixels:number;
 readonly coveragePercent:number;
 readonly regions:readonly {readonly index:number;readonly roiPixels:number;
  readonly selectedPixels:number;readonly coveragePercent:number}[];
}
export function segmentByContrast(
 rgba:Uint8ClampedArray,width:number,height:number,
 boxes:readonly BoundingBox[],contrastThreshold=70
):ChromaticMask{
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<2||height<2||
  width>4096||height>4096||rgba.length!==width*height*4)
  throw Error('Fotograma de segmentación incompatible.');
 if(!Number.isFinite(contrastThreshold)||contrastThreshold<20||contrastThreshold>160)
  throw Error('Contraste cromático fuera del intervalo permitido.');
 if(!Array.isArray(boxes)||boxes.length>35)throw Error('Número de regiones inválido.');
 const binary=new Uint8Array(width*height);
 const regions:ChromaticMask['regions'][number][]=[];
 const square=contrastThreshold*contrastThreshold;
 const pixel=(x:number,y:number)=>(y*width+x)*4;
 for(let k=0;k<boxes.length;k++){
  const box=boxes[k];
  if(!box||![box.x,box.y,box.width,box.height].every(Number.isFinite)||
   box.width<=0||box.height<=0||box.x<0||box.y<0||
   box.x+box.width>1.00001||box.y+box.height>1.00001)
   throw Error('Caja YOLO inválida para segmentación.');
  const x0=Math.max(0,Math.floor(box.x*width)),y0=Math.max(0,Math.floor(box.y*height));
  const x1=Math.min(width,Math.ceil((box.x+box.width)*width));
  const y1=Math.min(height,Math.ceil((box.y+box.height)*height));
  const roiPixels=Math.max(0,(x1-x0)*(y1-y0));
  let selectedPixels=0;
  if(roiPixels>0){
   const corners=[pixel(x0,y0),pixel(x1-1,y0),pixel(x0,y1-1),pixel(x1-1,y1-1)];
   const back=[0,0,0];
   for(const index of corners)for(let ch=0;ch<3;ch++)back[ch]+=rgba[index+ch]/4;
   for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
    const at=pixel(x,y);
    const dr=rgba[at]-back[0],dg=rgba[at+1]-back[1],db=rgba[at+2]-back[2];
    if(dr*dr+dg*dg+db*db>=square){
     binary[y*width+x]=1;selectedPixels++;
    }
   }
  }
  regions.push({index:k,roiPixels,selectedPixels,
   coveragePercent:roiPixels?100*selectedPixels/roiPixels:0});
 }
 let union=0;
 for(const item of binary)union+=item;
 const imagePixels=width*height;
 return {width,height,binary,imagePixels,selectedPixels:union,
  coveragePercent:100*union/imagePixels,regions};
}
