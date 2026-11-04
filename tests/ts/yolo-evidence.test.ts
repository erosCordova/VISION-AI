import {describe,it,expect} from 'vitest';
import {evidencePngName} from '../../src/modules/live/yolo-evidence';
import type {YoloFrameSource} from '../../src/modules/live/yolo-telemetry';
const scenarios=['safety','quality','retail','warehouse'] as const;
const source=(scenarioId:typeof scenarios[number]):YoloFrameSource=>({
 scenarioId,elapsedMs:15200,graphics:'human',camera:'frontal'
});
describe('Fase 9 — exportación de evidencia YOLO desde simulación 3D',()=>{
 it.each(scenarios)('el nombre de %s conserva fecha y frame sin datos externos',id=>{
  const name=evidencePngName(source(id),17,1793798400000);
  expect(name).toMatch(new RegExp('^vision-ai-yolo-'+id+'-frame-17-'));
  expect(name).toMatch(/\.png$/);
  expect(name).not.toMatch(/[\\/\s]/);
 });
 it('rechaza fotogramas inválidos y fechas no finitas',()=>{
  expect(()=>evidencePngName(source('safety'),0,1000)).toThrow();
  expect(()=>evidencePngName(source('safety'),1,Number.NaN)).toThrow();
  expect(()=>evidencePngName(source('safety'),1,-1000)).toThrow();
  expect(()=>evidencePngName({...source('quality'),camera:'mágica' as 'frontal'},1,1000)).toThrow();
 });
});
