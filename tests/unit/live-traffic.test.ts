import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {LIVE_TRAFFIC_SOURCES,isAuthorizedLiveTrafficUrl} from '../../src/modules/analysis/services/live-traffic-sources';
const code=(path:string)=>readFileSync(new URL('../..'+path,import.meta.url),'utf8');

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
