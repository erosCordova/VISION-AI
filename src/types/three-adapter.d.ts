/** Declaraciones mínimas para el adaptador de escena; Three.js se carga desde npm. */
declare module 'three';
declare module 'three/examples/jsm/loaders/GLTFLoader.js' {
 export class GLTFLoader { load(url:string,onLoad:(gltf:any)=>void,onProgress?:((event:any)=>void)|undefined,onError?:((error:unknown)=>void)|undefined):void; }
}
declare module 'three/examples/jsm/utils/SkeletonUtils.js' {
 export function clone(object:any):any;
}
