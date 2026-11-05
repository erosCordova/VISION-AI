/** Declaraciones mínimas para el adaptador de escena; Three.js se carga desde npm. */
declare module 'three';
declare module 'three/examples/jsm/loaders/GLTFLoader.js' {
 export class GLTFLoader { load(url:string,onLoad:(gltf:any)=>void,onProgress?:((event:any)=>void)|undefined,onError?:((error:unknown)=>void)|undefined):void; }
}
declare module 'three/examples/jsm/utils/SkeletonUtils.js' {
 export function clone(object:any):any;
}

declare module 'three/examples/jsm/postprocessing/EffectComposer.js' {
 export class EffectComposer {
  constructor(renderer:any);addPass(pass:any):void;setSize(w:number,h:number):void;
  render():void;dispose():void;
 }
}
declare module 'three/examples/jsm/postprocessing/RenderPass.js' {
 export class RenderPass { constructor(scene:any,camera:any); }
}
declare module 'three/examples/jsm/postprocessing/UnrealBloomPass.js' {
 export class UnrealBloomPass {
  constructor(resolution:any,strength?:number,radius?:number,threshold?:number);
 }
}
declare module 'three/examples/jsm/postprocessing/OutputPass.js' {
 export class OutputPass { constructor(); }
}

declare module 'three/examples/jsm/environments/RoomEnvironment.js' {
 export class RoomEnvironment {
  constructor(renderer:any);dispose():void;
 }
}
