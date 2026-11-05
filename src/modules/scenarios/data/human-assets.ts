/** URLs publicadas en el catálogo CC0 de Gobkit: https://gobkit.com/api/free */
export const HUMAN_ASSETS = {
  extinguisher: 'https://gobkit.com/freebies/human007/ExtinguisherOperator.glb',
  hazmat: 'https://gobkit.com/freebies/human007/HazmatTech.glb',
  engineer: 'https://gobkit.com/freebies/human002/ItEngineer.glb',
  stock: 'https://gobkit.com/freebies/human001/StockClerk.glb',
  baggage: 'https://gobkit.com/freebies/human008/BaggageHandler.glb',
  cashier: 'https://gobkit.com/freebies/human001/Cashier.glb',
  office: 'https://gobkit.com/freebies/human001/OfficeLady.glb',
  shopper: 'https://gobkit.com/freebies/human001/GrandmaShopper.glb',
  manager: 'https://gobkit.com/freebies/human001/StoreManager.glb',
  courier: 'https://gobkit.com/freebies/human001/FoodCourier.glb',
} as const;
export type AssetKey = keyof typeof HUMAN_ASSETS;
const characterMap:Record<string,Record<string,AssetKey>> = {
  safety: {w1:'extinguisher',w2:'engineer',w3:'hazmat'},
  warehouse: {a1:'stock',a2:'baggage'},
  quality: {inspector:'engineer'},
  retail: {r0:'cashier',r1:'office',r2:'shopper',r3:'manager',r4:'courier'}
};
export function humanAssetFor(scenario:string,id:string):string|null{
  const key=characterMap[scenario]?.[id];
  return key?HUMAN_ASSETS[key]:null;
}
export function motionClipName(state:string|undefined,available:readonly string[]):string|null{
  const lookup=(value:string)=>available.find(name=>name.toLowerCase()===value)??null;
  const moving=state==='walking'||state==='transporting';
  return (moving?lookup('Walk')??lookup('walk')??lookup('Run'):
    lookup('Idle')??lookup('idle'))??available[0]??null;
}
/** 1.8–2.15 m de altura: tamaño coherente en la maqueta, no tamaño humano clínico. */
export function humanoidScale(height:number,target=2.04):number{
  if(!Number.isFinite(height)||height<=0.01)return 1;
  return Math.min(10,Math.max(.01,target/height));
}
