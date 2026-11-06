import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {LIVE_TRAFFIC_SOURCES,isAuthorizedLiveTrafficUrl,nextTrafficSource} from '../../src/modules/analysis/services/live-traffic-sources';
const code=(path:string)=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');

describe('Video en directo con análisis YOLO y fuente HLS autorizada',()=>{
 it('presenta cuatro transmisiones HLS SDOT, no JPEG ni VOD',()=>{
  expect(LIVE_TRAFFIC_SOURCES).toHaveLength(4);
  const ids=new Set<string>();
  for(const source of LIVE_TRAFFIC_SOURCES){
   expect(source.id).toMatch(/^sdot-/);
   expect(ids.has(source.id)).toBe(false);ids.add(source.id);
   expect(source.streamUrl).toMatch(/^https:\/\/61e0c5d388c2e\.streamlock\.net\/live\/[A-Za-z0-9_]+\.stream\/playlist\.m3u8$/);
   expect(isAuthorizedLiveTrafficUrl(source.streamUrl)).toBe(true);
  }
 });
 it('elige la siguiente fuente sin repetir cámaras fallidas ni volver a la actual',()=>{
  const ids=LIVE_TRAFFIC_SOURCES.map(source=>source.id);
  expect(nextTrafficSource(ids[0],new Set([ids[0]]))?.id).toBe(ids[1]);
  expect(nextTrafficSource(ids[0],new Set([ids[0],ids[1]]))?.id).toBe(ids[2]);
  expect(nextTrafficSource(ids[2],new Set([ids[1],ids[2]]))?.id).toBe(ids[3]);
  expect(nextTrafficSource(ids[3],new Set([ids[3]]))?.id).toBe(ids[0]);
  expect(nextTrafficSource(ids[3],new Set(ids))).toBeNull();
  expect(nextTrafficSource('desconocida',new Set())).toBeNull();
 });
 it('distingue el bloqueo de análisis de una señal caída y prueba otra fuente',()=>{
  const page=code('src/modules/analysis/pages/LiveTrafficAnalysis.tsx');
  expect(page).toContain('setAnalysisSourceBlocked(cameraId)');
  expect(page).toContain('const accessDenied=/SecurityError|tainted|cross-origin/i.test(text)');
  expect(page).toContain('imageAccessBlocked=analysisSourceBlocked===cameraId');
  expect(page).toContain('nextTrafficSource(cameraId,failedCameras.current)');
  expect(page).toContain('analysisSourceBlocked!==cameraId');
  expect(page).toContain('failedCameras.current.clear()');
 });
 it('no admite URLs de terceros ni se puede reconfigurar arbitrariamente',()=>{
  for(const u of [
   'http://61e0c5d388c2e.streamlock.net/live/2_Pike_EW.stream/playlist.m3u8',
   'https://example.com/camera.m3u8',
   'https://127.0.0.1/live.m3u8',
   'https://61e0c5d388c2e.streamlock.net/live/unknown.stream/playlist.m3u8',
   'https://61e0c5d388c2e.streamlock.net/live/2_Pike_EW.stream/playlist.m3u8?token=a',
  ])expect(isAuthorizedLiveTrafficUrl(u)).toBe(false);
 });
 it('requiere video que avance y manifiesto LIVE antes del reconocimiento',()=>{
  const s=code('src/modules/analysis/pages/LiveTrafficAnalysis.tsx');
  expect(s).toContain('manifestIsLive');
  expect(s).toContain('video.currentTime');
  expect(s).toContain("data.details?.live===true");
  expect(s).toContain("videoPhase==='live'&&liveConfirmed");
  expect(s).toContain('video.readyState<2');
  expect(s).toContain('ctx.drawImage(video');
  expect(s).toContain('analyzeYoloFrame');
  expect(s).toContain('renderEvidence(result');
  expect(s).toContain('lastMediaTime');
  expect(s).not.toContain('getUserMedia');
  expect(s).not.toContain('apiBaseUrl');
 });
 it('no descarga ni hospeda el video: conexión directa con biblioteca fijada',()=>{
  const loader=code('src/modules/analysis/services/live-hls-loader.ts');
  expect(loader).toContain('hls.js@1.7.3');
  const page=code('src/modules/analysis/pages/LiveAnalysisPage.tsx');
  expect(page).toContain('LiveTrafficAnalysis');
  expect(page).not.toContain('<PublicCameraLab');
  const vercel=JSON.parse(code('vercel.json'));
  expect(vercel.rewrites.every((r:{destination:string})=>!r.destination.includes('.m3u8'))).toBe(true);
 });
});
