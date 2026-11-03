import { useState } from 'react';
import { Modal } from '../../shared/ui/Modal';
import { defaultPreviewSettings, validatePreviewSettings } from './preview-settings';
import type { PreviewSettings } from './preview-settings';
export function SessionSettings() {
  const [settings, setSettings] = useState(defaultPreviewSettings);
  const [draft, setDraft] = useState({ confidence: '0.5', targetFps: '5', overlayAgeMs: '1000' });
  const [errors, setErrors] = useState<Partial<Record<keyof PreviewSettings, string>>>({});
  const [confirm, setConfirm] = useState(false);
  const [notice, setNotice] = useState('');
  const fields = [{ key: 'confidence', label: 'Confianza mínima', unit: 'De 0.01 a 1', step: '0.01' }, { key: 'targetFps', label: 'Objetivo de inferencia', unit: 'De 1 a 30 FPS', step: '1' }, { key: 'overlayAgeMs', label: 'Caducidad de resultados', unit: 'De 100 a 5000 ms', step: '1' }] as const;
  const dirty = fields.some(f => Number(draft[f.key]) !== settings[f.key]);
  return <section className="panel session-settings"><span className="eyebrow">PREPARACIÓN DEL MOTOR</span><h2>Parámetros de análisis</h2><p>Propuesta temporal para esta vista. YOLO no está conectado: estos valores aún no afectan la cámara ni se conservan al recargar.</p>
    <form noValidate onSubmit={e => {
      e.preventDefault(); const next = { confidence: Number(draft.confidence), targetFps: Number(draft.targetFps), overlayAgeMs: Number(draft.overlayAgeMs) };
      const invalid = validatePreviewSettings(next); setErrors(invalid); setNotice('');
      if (Object.keys(invalid).length) { document.getElementById('setting-' + Object.keys(invalid)[0])?.focus(); return; }
      setSettings(next); setNotice('Propuesta actualizada en esta vista. El motor permanece sin conectar.');
    }}>
      <div className="settings-fields">{fields.map(f => <label key={f.key} htmlFor={'setting-'+f.key}>{f.label}<input id={'setting-'+f.key} type="number" inputMode="decimal" step={f.step} value={draft[f.key]} aria-invalid={!!errors[f.key]} aria-describedby={'help-'+f.key} onChange={e => { setDraft({ ...draft, [f.key]: e.target.value }); setErrors({ ...errors, [f.key]: undefined }); setNotice(''); }} /><small id={'help-'+f.key} className={errors[f.key] ? 'field-error' : ''}>{errors[f.key] || f.unit}</small></label>)}</div>
      <div className="settings-actions"><button type="submit" className="primary" disabled={!dirty}>Aplicar propuesta</button><button type="button" onClick={() => setConfirm(true)}>Restablecer valores</button></div>
    </form>
    <p role="status" className="notice">{notice}</p>
    {confirm && <Modal title="Restablecer la propuesta" onClose={() => setConfirm(false)}><p>Se reemplazarán los valores de esta vista por confianza 0.5, objetivo 5 FPS y caducidad 1000 ms.</p><div className="settings-actions"><button onClick={() => setConfirm(false)}>Cancelar</button><button className="primary" onClick={() => { setSettings(defaultPreviewSettings); setDraft({confidence:'0.5',targetFps:'5',overlayAgeMs:'1000'}); setErrors({}); setConfirm(false); setNotice('Valores iniciales restablecidos en esta vista.'); }}>Restablecer</button></div></Modal>}
  </section>;
}
