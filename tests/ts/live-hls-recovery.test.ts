import {describe,it,expect} from 'vitest';
import {chooseFatalHlsAction,streamReconnectDelay,MAX_STREAM_RECONNECTS,
 conciseVideoError} from '../../src/modules/live/live-hls-recovery';
import {readFileSync} from 'node:fs';
const component=readFileSync(new URL('../../src/modules/live/LiveTrafficAnalysis.tsx',import.meta.url),'utf8');
describe('Recuperación HLS sin vídeos falsos ni bucles infinitos',()=>{
 it('limita los reintentos, con pausas progresivas',()=>{
  expect(MAX_STREAM_RECONNECTS).toBe(3);
  expect([0,1,2,3,4].map(streamReconnectDelay)).toEqual([1200,3000,6500,null,null]);
  expect(streamReconnectDelay(-1)).toBeNull();
 });
 it('recupera un media error o un network error una vez antes de recrear reproductor',()=>{
  expect(chooseFatalHlsAction('mediaError',false,false)).toBe('recover-media');
  expect(chooseFatalHlsAction('mediaError',true,false)).toBe('reconnect');
  expect(chooseFatalHlsAction('networkError',false,false)).toBe('restart-network');
  expect(chooseFatalHlsAction('networkError',false,true)).toBe('reconnect');
  expect(chooseFatalHlsAction('otherError',false,false)).toBe('reconnect');
 });
 it('explica cuando la fuente es incompatible sin inventar detecciones',()=>{
  expect(conciseVideoError(4)).toContain('código 4');
  expect(conciseVideoError(3)).toContain('decodificar');
 });
 it('reconecta sin recargar pagina y ofrece un control manual',()=>{
  expect(component).toContain('setConnectionEpoch');
  expect(component).toContain('streamReconnectDelay');
  expect(component).toContain('recoverMediaError');
  expect(component).toContain('startLoad');
  expect(component).toContain('Reintentar cámara');
  expect(component).toContain('Otra cámara');
  expect(component).not.toContain('getUserMedia');
 });
 it('conserva la inferencia solo sobre frames reales y sin doble ejecución',()=>{
  expect(component).toContain('ctx.drawImage(video');
  expect(component).toContain('analyzeYoloFrame(model');
  expect(component).toContain('renderEvidence(result');
  expect(component).toContain('document.hidden');
 });
});
