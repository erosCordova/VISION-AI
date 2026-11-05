/** Preferencias efectivas del análisis de cámaras, guardadas por navegador. */
export interface LivePreferences{
 readonly threshold:number;
 readonly autoSwitch:boolean;
 readonly analysisIntervalMs:number;
}
export const LIVE_PREFERENCES_DEFAULT:LivePreferences={
 threshold:.35,autoSwitch:true,analysisIntervalMs:350
};
export const LIVE_PREFERENCES_KEY='vision-ai-live-preferences-v1';
export function validateLivePreferences(v:unknown):v is LivePreferences{
 if(!v||typeof v!=='object')return false;
 const x=v as LivePreferences;
 return typeof x.threshold==='number'&&Number.isFinite(x.threshold)&&
  x.threshold>=.1&&x.threshold<=.9&&
  typeof x.autoSwitch==='boolean'&&
  Number.isInteger(x.analysisIntervalMs)&&
  x.analysisIntervalMs>=250&&x.analysisIntervalMs<=2000;
}
export function readLivePreferences():LivePreferences{
 try{
  const raw=localStorage.getItem(LIVE_PREFERENCES_KEY);
  const value:unknown=raw?JSON.parse(raw):null;
  if(validateLivePreferences(value))return value;
 }catch{/* bloqueo de almacenamiento: usar valores locales por defecto */}
 return LIVE_PREFERENCES_DEFAULT;
}
export function saveLivePreferences(value:LivePreferences):void{
 if(!validateLivePreferences(value))throw Error('Los valores están fuera del rango permitido.');
 try{
  localStorage.setItem(LIVE_PREFERENCES_KEY,JSON.stringify(value));
  window.dispatchEvent(new Event('vision-ai-live-preferences-updated'));
 }catch{throw Error('El navegador no permitió guardar estas preferencias.');}
}
