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
 boxes:readonly BoundingBox[],contrastThreshold=70,minComponentPixels=1
):ChromaticMask{
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<2||height<2||
  width>4096||height>4096||rgba.length!==width*height*4)
  throw Error('Fotograma de segmentación incompatible.');
 if(!Number.isFinite(contrastThreshold)||contrastThreshold<20||contrastThreshold>160)
  throw Error('Contraste cromático fuera del intervalo permitido.');
 if(!Array.isArray(boxes)||boxes.length>35)throw Error('Número de regiones inválido.');
 if(!Number.isInteger(minComponentPixels)||minComponentPixels<1||minComponentPixels>256)
  throw Error('Tamaño mínimo de componente fuera de rango.');
 const binary=new Uint8Array(width*height);
 const regions:ChromaticMask['regions'][number][]=[];
 const roiBounds:{x0:number;y0:number;x1:number;y1:number}[]=[];
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
  roiBounds.push({x0,y0,x1,y1});
  if(roiPixels>0){
   const corners=[pixel(x0,y0),pixel(x1-1,y0),pixel(x0,y1-1),pixel(x1-1,y1-1)];
   const back=[0,0,0];
   for(const index of corners)for(let ch=0;ch<3;ch++)back[ch]+=rgba[index+ch]/4;
   for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
    const at=pixel(x,y);
    const dr=rgba[at]-back[0],dg=rgba[at+1]-back[1],db=rgba[at+2]-back[2];
    if(dr*dr+dg*dg+db*db>=square){
     binary[y*width+x]=1;
    }
   }
  }
  regions.push({index:k,roiPixels,selectedPixels:0,coveragePercent:0});
 }
 // Eliminación opcional de motas de ruido mediante componentes 4-conexos.
 // Solo se modifica la máscara cromática, nunca las cajas o telemetría YOLO.
 if(minComponentPixels>1){
  const queue=new Int32Array(width*height);
  for(let seed=0;seed<binary.length;seed++){
   if(binary[seed]!==1)continue;
   let tail=1,head=0;queue[0]=seed;binary[seed]=2;
   while(head<tail){
    const index=queue[head++],x=index%width,y=Math.floor(index/width);
    const neighbors=[x>0?index-1:-1,x+1<width?index+1:-1,
     y>0?index-width:-1,y+1<height?index+width:-1];
    for(const next of neighbors)if(next>=0&&binary[next]===1){
     binary[next]=2;queue[tail++]=next;
    }
   }
   const keep=tail>=minComponentPixels?1:0;
   for(let k=0;k<tail;k++)binary[queue[k]]=keep;
  }
 }
 // Recuento posterior a la limpieza: áreas por ROI coherentes con la máscara final.
 const counted=regions.map((region,k)=>{
  const {x0,y0,x1,y1}=roiBounds[k];
  let selectedPixels=0;
  for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)
   selectedPixels+=binary[y*width+x]===1?1:0;
  return {...region,selectedPixels,coveragePercent:region.roiPixels?
   100*selectedPixels/region.roiPixels:0};
 });
 let union=0;
 for(const item of binary)if(item===1)union++;
 const imagePixels=width*height;
 return {width,height,binary,imagePixels,selectedPixels:union,
  coveragePercent:100*union/imagePixels,regions:counted};
}

/** Canal alfa: únicamente los píxeles segmentados son opacos.
 * PNG transparente independiente del fotograma original y de las cajas YOLO. */
export function chromaticMaskPixels(mask:ChromaticMask):Uint8ClampedArray{
 if(!Number.isInteger(mask.width)||!Number.isInteger(mask.height)||
  mask.width<2||mask.height<2||mask.width>4096||mask.height>4096||
  mask.binary.length!==mask.width*mask.height)
  throw Error('Máscara cromática con dimensiones incompatibles.');
 const pixels=new Uint8ClampedArray(mask.binary.length*4);
 for(let i=0;i<mask.binary.length;i++)if(mask.binary[i]===1){
  const offset=i*4;
  pixels[offset]=255;pixels[offset+1]=190;pixels[offset+2]=105;pixels[offset+3]=255;
 }
 return pixels;
}
