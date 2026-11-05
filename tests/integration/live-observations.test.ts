import {describe,it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {validateLiveObservation} from '../../src/core/contracts/live-observation-contract';
import type {LiveObservation} from '../../src/core/domain/live-observation';
import {makeLiveObservationsCsv} from '../../src/modules/history/export/live-observation-export';
import {LIVE_PREFERENCES_DEFAULT,validateLivePreferences} from '../../src/modules/settings/services/live-preferences';

const obs:LiveObservation={
 schemaVersion:1,id:'local-xxxxxxxx-1234',source:'public-live-video',
 model:'yolov8n-coco',savedAt:'2026-11-05T11:00:00.000Z',
 observedAt:'2026-11-05T10:59:59.000Z',
 cameraId:'sdot-2-pike-ew',cameraName:'Cámara central',inferenceMs:123.3,
 frameWidth:640,frameHeight:360,
 detections:[{id:'d1',classId:'car',label:'Automóvil',confidence:.87,
  box:{x:.1,y:.2,width:.3,height:.4}}]
};
const source=(path:string)=>readFileSync(new URL('../..'+path,import.meta.url),'utf8');
describe('Historial y configuración de video en directo',()=>{
 it('guarda exclusivamente metadatos verificables, sin imágenes ni video',()=>{
  expect(()=>validateLiveObservation(obs)).not.toThrow();
  expect(()=>validateLiveObservation({...obs,source:'simulation-3d'})).toThrow();
  expect(()=>validateLiveObservation({...obs,inferenceMs:NaN})).toThrow();
  expect(()=>validateLiveObservation({...obs,frameWidth:0})).toThrow();
  expect(()=>validateLiveObservation({...obs,detections:[{...obs.detections[0],
   box:{x:.8,y:.9,width:.3,height:.3}}]})).toThrow();
  expect(Object.keys(obs)).not.toContain('image');
  expect(Object.keys(obs)).not.toContain('video');
 });
 it('exporta clases y porcentajes reales protegiendo CSV contra fórmulas',()=>{
  const csv=makeLiveObservationsCsv([obs,{...obs,id:'local-xxxxxxxx-5678',
   cameraName:'=IMPORTXML("url")',detections:[]}]);
  expect(csv).toContain('Automóvil');
  expect(csv).toContain('87.0');
  expect(csv).toContain('Origen');
  expect(csv).toContain("'=IMPORTXML");
  expect(csv.split('\r\n').length).toBe(4);
 });
 it('las preferencias efectivas rechazan valores inválidos',()=>{
  expect(validateLivePreferences(LIVE_PREFERENCES_DEFAULT)).toBe(true);
  expect(validateLivePreferences({...LIVE_PREFERENCES_DEFAULT,analysisIntervalMs:200})).toBe(false);
  expect(validateLivePreferences({...LIVE_PREFERENCES_DEFAULT,threshold:1.2})).toBe(false);
  expect(validateLivePreferences({...LIVE_PREFERENCES_DEFAULT,autoSwitch:'sí'})).toBe(false);
 });
 it('el monitor permite guardar, exportar, filtrar y cambiar de cámara automáticamente',()=>{
  const monitor=source('src/modules/analysis/pages/LiveTrafficAnalysis.tsx');
  const history=source('src/modules/history/pages/HistoryPanel.tsx');
  const privacy=source('src/modules/settings/pages/PrivacyCenter.tsx');
  const dashboard=source('src/app/App.tsx');
  const settings=source('src/modules/settings/pages/SessionSettings.tsx');
  expect(monitor).toContain('liveRepository.save(item)');
  expect(monitor).toContain('Descargar imagen');
  expect(monitor).toContain('live-traffic-class-filter');
  expect(monitor).toContain('failedCameras.current.add(cameraId)');
  expect(monitor).toContain('analysisDelayRef.current');
  expect(history).toContain('LiveObservationsHistory');
  expect(dashboard).toContain('LiveObservationsDashboard');
  expect(privacy).toContain('liveRepository.eraseAll()');
  expect(privacy).toContain('liveRepository.purgeExpired(retention)');
  expect(settings).toContain('saveLivePreferences');
 });
});
