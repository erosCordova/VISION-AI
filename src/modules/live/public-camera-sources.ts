/** Fuentes con IDs de TfL publicados. Se exponen exclusivamente rutas internas,
 * para que el navegador pueda leer los píxeles mediante el proxy HTTPS de Vercel.
 * No se pueden añadir URLs arbitrarias, IPs ni cámaras privadas.
 * TfL Open Data: https://tfl.gov.uk/corporate/terms-and-conditions/transport-data-service
 */
export interface PublicCameraSource {
 readonly id:string;
 readonly name:string;
 readonly context:string;
 readonly scenario:string;
 readonly imagePath:string;
}
/** Identificadores verificados por URLs JPEG públicas de TfL. */
export const PUBLIC_CAMERA_SOURCES: readonly PublicCameraSource[] = [
 {
  id:'piccadilly-retail',
  name:'Piccadilly Circus · retail y ocupación',
  context:'Tráfico urbano y peatones visibles',
  scenario:'Retail y ocupación',
  imagePath:'/camaras-tfl/piccadilly-retail.jpg'
 },
 {
  id:'romford-transito',
  name:'Romford Road / Tennyson Road · logística',
  context:'Circulación de vehículos en una intersección',
  scenario:'Transporte y logística',
  imagePath:'/camaras-tfl/romford-transito.jpg'
 }
] as const;
