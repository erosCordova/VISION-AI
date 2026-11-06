/** Fotografías reales verificadas en Wikimedia Commons, licencia CC0 1.0.
 * Solo decoración: nunca se usan como entrada para el reconocimiento.
 * Si Wikimedia no está disponible, la interfaz conserva sus colores de respaldo.
 */
export interface TrafficPhoto{
 readonly file:string;
 readonly label:string;
 readonly author:string;
 readonly src:string;
 readonly sourcePage:string;
}
function photo(file:string,label:string,author:string,width:number):TrafficPhoto{
 const filename=file.replaceAll(' ','_');
 return {
  file,label,author,
  src:'https://commons.wikimedia.org/wiki/Special:FilePath/'+encodeURIComponent(filename)+'?width='+width,
  sourcePage:'https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(filename)
 };
}
export const trafficPhotos={
 camera:photo('Closed-circuit television (CCTV) cameras.jpg','Cámaras de vigilancia reales','Fourhazzy',360),
 skyline:photo('Seattle Kerry Park Skyline.jpg','Panorámica real de Seattle','CommunistSquared',640),
 car:photo('Car traveling along road in Singapore.jpg','Automóvil en una calle','Teojincheng',420),
 bus:photo('KingCountyMetroBus2020.jpg','Autobús público de Seattle','Chiwauk',420),
 bicycle:photo('Cyclist crossing a street, Quebec City.jpg','Ciclista cruzando una calle','Wilfredor',420)
} as const;
