/** Detector EPP para Seguridad, pesos AGPL-3.0 de Constructelligence. */
import type {Detection} from '../../../core/domain/model';
export const PPE_MODEL={
 id:'epp-v03',
 name:'YOLOv8s EPP / seguridad industrial',
 url:'https://huggingface.co/constructelligence/construction-site-safety-hazards/resolve/main/buildvision-hazards-v0.3.onnx',
 sha256:'55f4dd2f53158eac4ff093d938b9fbda80c99454a03672145bbc36f539988249',
 minBytes:42_000_000,maxBytes:48_000_000,
 input:{width:640,height:640},
 license:'AGPL-3.0',
 source:'https://huggingface.co/constructelligence/construction-site-safety-hazards',
 version:'v0.3'
} as const;
/** Orden EXACTO que declara el archivo config.json del repositorio original. */
export const PPE_CLASSES=[
 {id:'person',label:'Persona',category:'persona'},
 {id:'hardhat',label:'Casco',category:'correcto'},
 {id:'no-hardhat',label:'Sin casco',category:'revisar'},
 {id:'safety vest',label:'Chaleco de seguridad',category:'correcto'},
 {id:'no-safety vest',label:'Sin chaleco',category:'revisar'},
 {id:'no-mask',label:'Sin mascarilla (no validado)',category:'no-fiable'},
 {id:'gloves',label:'Guantes',category:'correcto'},
 {id:'safety shoes',label:'Calzado de seguridad',category:'correcto'},
 {id:'excavator',label:'Excavadora',category:'maquinaria'},
 {id:'wheel loader',label:'Cargadora',category:'maquinaria'},
 {id:'dump truck',label:'Camión volquete',category:'maquinaria'},
 {id:'goggles',label:'Gafas protectoras',category:'correcto'},
 {id:'no-goggles',label:'Sin gafas',category:'revisar'},
 {id:'no-gloves',label:'Sin guantes',category:'revisar'}
] as const;
/** Solo evidencia positiva explícita; ausencia de una detección NO demuestra infracción. */
export function ppeFindings(detections:readonly Detection[]){
 const review=detections.filter(d=>PPE_CLASSES.some(c=>
  c.id===d.classId&&c.category==='revisar'));
 const worn=detections.filter(d=>PPE_CLASSES.some(c=>
  c.id===d.classId&&c.category==='correcto'));
 const unsupported=detections.filter(d=>d.classId==='no-mask');
 const people=detections.filter(d=>d.classId==='person');
 return {review,worn,unsupported,people,requiresReview:review.length>0};
}
export function ppeColor(id:string):string{
 const p=PPE_CLASSES.find(c=>c.id===id);
 switch(p?.category){
  case 'revisar':return '#ff9786';
  case 'correcto':return '#73a9ef';
  case 'maquinaria':return '#ffcc84';
  case 'no-fiable':return '#9eaebe';
  default:return '#80baff';
 }
}
