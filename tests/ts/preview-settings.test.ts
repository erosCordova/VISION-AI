import { describe, expect, it } from 'vitest';
import { defaultPreviewSettings, validatePreviewSettings } from '../../src/modules/settings/preview-settings';
describe('Límites de configuración temporal', () => {
  it('acepta límites inclusivos y valores iniciales', () => {
    expect(validatePreviewSettings(defaultPreviewSettings)).toEqual({});
    expect(validatePreviewSettings({confidence:0.01,targetFps:1,overlayAgeMs:100})).toEqual({});
    expect(validatePreviewSettings({confidence:1,targetFps:30,overlayAgeMs:5000})).toEqual({});
  });
  it('rechaza valores no finitos, frecuencias y duraciones fraccionarias', () => {
    const errors=validatePreviewSettings({confidence:NaN,targetFps:1.5,overlayAgeMs:100.5});
    expect(Object.keys(errors)).toEqual(['confidence','targetFps','overlayAgeMs']);
    expect(validatePreviewSettings({...defaultPreviewSettings,confidence:Infinity})).toHaveProperty('confidence');
  });
  it('rechaza cada valor fuera de rango sin alterar la propuesta inicial', () => {
    for(const value of [-1,0,1.01]) expect(validatePreviewSettings({...defaultPreviewSettings,confidence:value})).toHaveProperty('confidence');
    for(const value of [0,31]) expect(validatePreviewSettings({...defaultPreviewSettings,targetFps:value})).toHaveProperty('targetFps');
    for(const value of [99,5001]) expect(validatePreviewSettings({...defaultPreviewSettings,overlayAgeMs:value})).toHaveProperty('overlayAgeMs');
    expect(defaultPreviewSettings).toEqual({confidence:0.5,targetFps:5,overlayAgeMs:1000});
  });
});
