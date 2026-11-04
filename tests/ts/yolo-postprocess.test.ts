import {describe,expect,it} from 'vitest';
import {COCO_EN,COCO_ES,decodeYolov8,letterboxFor,suppressOverlaps,YOLO_INPUT} from '../../src/modules/live/yolo-postprocess';

describe('YOLOv8n: decodificación de salidas reales y geometría',()=>{
 it('conserva 80 categorías COCO y dimensión del export ONNX',()=>{
   expect(COCO_EN).toHaveLength(80);expect(COCO_ES).toHaveLength(80);
   expect(YOLO_INPUT).toEqual({width:640,height:480});
 });
 it('reconstruye la geometría de una captura panorámica sin deformar la imagen',()=>{
   const l=letterboxFor(960,540);
   expect(l.scale).toBeCloseTo(2/3,5);expect(l.padX).toBeCloseTo(0,4);
   expect(l.padY).toBeCloseTo(60,4);
 });
 it('decodifica persona detectada en CHW sin columna extra de objetividad',()=>{
   const l=letterboxFor(640,480);
   const data=new Float32Array(84*2);
   const put=(anchor:number,channel:number,value:number)=>{data[channel*2+anchor]=value;};
   for(const anchor of [0,1]){
     put(anchor,0,200+anchor*2);put(anchor,1,200);
     put(anchor,2,100);put(anchor,3,200);put(anchor,4,.92-anchor*.02);
   }
   const value=decodeYolov8(data,[1,84,2],l,.4);
   expect(value.candidates).toBe(2);
   expect(value.detections).toHaveLength(1);
   const person=value.detections[0];
   expect(person.classId).toBe('person');
   expect(person.confidence).toBeCloseTo(.92);
   expect(person.box.x).toBeCloseTo(150/640,3);
   expect(person.box.y).toBeCloseTo(100/480,3);
 });
 it('admite exportación transpuesta [1, N, 84]',()=>{
   const d=new Float32Array(84);
   d[0]=320;d[1]=240;d[2]=64;d[3]=80;d[4]=.7;
   const result=decodeYolov8(d,[1,1,84],letterboxFor(640,480),.5);
   expect(result.detections[0].label).toBe('Persona');
 });
 it('descarta valores corruptos y clasificaciones bajo el umbral',()=>{
   const d=new Float32Array(84);d[0]=200;d[1]=200;d[2]=0;d[3]=80;d[4]=.9;
   expect(decodeYolov8(d,[1,1,84],letterboxFor(640,480)).detections).toHaveLength(0);
   d[2]=64;d[4]=.2;
   expect(decodeYolov8(d,[1,1,84],letterboxFor(640,480),.35).detections).toHaveLength(0);
 });
 it('no convierte una forma sin detección en una persona inventada',()=>{
   const d=new Float32Array(84*6300);
   const result=decodeYolov8(d,[1,84,6300],letterboxFor(960,550));
   expect(result.detections).toHaveLength(0);
 });
 it('aplica NMS por clase, manteniendo objetos de otra clase en la misma zona',()=>{
   const a={classIndex:0,score:.9,x:.1,y:.1,width:.4,height:.4};
   const b={...a,score:.8,x:.11};
   const c={...a,classIndex:2,score:.7};
   expect(suppressOverlaps([a,b,c])).toEqual([a,c]);
 });
 it('rechaza formas de tensor incompatibles',()=>{
   expect(()=>decodeYolov8(new Float32Array(84),[1,85,1],letterboxFor(640,480))).toThrow();
   expect(()=>letterboxFor(0,100)).toThrow();
 });
});

describe('Fase 15 — equivalencia numérica del decodificador optimizado',()=>{
 it('conserva el resultado exacto entre tensores CHW y HWC de 80 clases',()=>{
  const anchors=25,channels=84;
  const chw=new Float32Array(channels*anchors);
  for(let a=0;a<anchors;a++){
   chw[a]=30+(a%5)*110;
   chw[anchors+a]=25+Math.floor(a/5)*89;
   chw[2*anchors+a]=56;chw[3*anchors+a]=85;
   chw[(4+(a%4))*anchors+a]=.61+(a%3)*.08;
  }
  const hwc=new Float32Array(chw.length);
  for(let a=0;a<anchors;a++)
   for(let c=0;c<channels;c++)hwc[a*channels+c]=chw[c*anchors+a];
  const geometry=letterboxFor(640,480);
  const one=decodeYolov8(chw,[1,channels,anchors],geometry,.35);
  const two=decodeYolov8(hwc,[1,anchors,channels],geometry,.35);
  expect(one).toEqual(two);
  expect(one.detections.length).toBeGreaterThan(0);
 });
 it('la optimización no transforma celdas NaN/infinitas en predicciones',()=>{
  const invalid=new Float32Array(84*2);
  invalid[0]=250;invalid[2]=100;invalid[4]=80;invalid[6]=90;
  invalid[8]=.7;invalid[9]=Number.NaN;
  invalid[1]=200;invalid[3]=200;invalid[5]=100;invalid[7]=100;
  const got=decodeYolov8(invalid,[1,84,2],letterboxFor(640,480));
  expect(got.detections).toHaveLength(1);
  expect(got.detections[0].confidence).toBeCloseTo(.7);
 });
 it('un tensor vacío de anclas sin señales sigue sin detecciones',()=>{
  const zero=new Float32Array(84*6300);
  expect(decodeYolov8(zero,[1,84,6300],letterboxFor(960,540),.25)
   .detections).toEqual([]);
 });
});
