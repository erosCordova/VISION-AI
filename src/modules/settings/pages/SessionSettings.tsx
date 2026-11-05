import {useState} from 'react';
import {LIVE_PREFERENCES_DEFAULT,readLivePreferences,
 saveLivePreferences,validateLivePreferences} from '../services/live-preferences';
import type {LivePreferences} from '../services/live-preferences';
/** Controles reales del monitor de cámaras, no valores de demostración. */
export function SessionSettings(){
 const [saved,setSaved]=useState<LivePreferences>(()=>readLivePreferences());
 const [confidence,setConfidence]=useState(()=>String(Math.round(readLivePreferences().threshold*100)));
 const [interval,setInterval]=useState(()=>String(readLivePreferences().analysisIntervalMs));
 const [auto,setAuto]=useState(()=>readLivePreferences().autoSwitch);
 const [notice,setNotice]=useState('');
 const [error,setError]=useState('');
 const apply=(value:LivePreferences)=>{
  if(!validateLivePreferences(value)){
   setError('Usa una confianza de 10 a 90 % y una pausa de 250 a 2000 ms.');return;
  }
  try{
   saveLivePreferences(value);
   setSaved(value);setError('');
   setNotice('Cambios aplicados al monitor de cámaras.');
  }catch(e){setError(e instanceof Error?e.message:String(e));}
 };
 const current={threshold:Number(confidence)/100,analysisIntervalMs:Number(interval),autoSwitch:auto};
 const dirty=!validateLivePreferences(current)||
  current.threshold!==saved.threshold||
  current.analysisIntervalMs!==saved.analysisIntervalMs||
  current.autoSwitch!==saved.autoSwitch;
 return <section className="panel session-settings" aria-label="Preferencias reales de cámaras">
  <span className="eyebrow">PERSONALIZACIÓN DEL ANÁLISIS</span>
  <h2>Preferencias de cámaras en directo</h2>
  <p>Estos controles cambian cómo se analizan los videos en tu navegador.
   No modifican las cámaras públicas ni los modelos ya entrenados.</p>
  <form onSubmit={e=>{e.preventDefault();apply(current);}}>
   <div className="settings-fields">
    <label htmlFor="setting-confidence">Confianza mínima (%)
     <input type="number" id="setting-confidence" min="10" max="90" step="1"
      value={confidence} onChange={e=>{setConfidence(e.target.value);setNotice('');}}/>
     <small>Se muestran solo las detecciones que alcancen este nivel.</small>
    </label>
    <label htmlFor="setting-interval">Pausa entre análisis (milisegundos)
     <input type="number" id="setting-interval" min="250" max="2000" step="50"
      value={interval} onChange={e=>{setInterval(e.target.value);setNotice('');}}/>
     <small>Un intervalo mayor reduce el uso de CPU; no cambia la velocidad del video.</small>
    </label>
    <label htmlFor="setting-auto-switch">Cambio de cámara
     <span className="live-settings-checkbox"><input type="checkbox" id="setting-auto-switch"
      checked={auto} onChange={e=>setAuto(e.target.checked)}/>
      Buscar otra cámara si se pierde la señal</span>
    </label>
   </div>
   <div className="settings-actions">
    <button className="primary" type="submit" disabled={!dirty}>Guardar preferencias</button>
    <button type="button" onClick={()=>{
     const defaults=LIVE_PREFERENCES_DEFAULT;
     setConfidence(String(Math.round(defaults.threshold*100)));
     setInterval(String(defaults.analysisIntervalMs));setAuto(defaults.autoSwitch);
     apply(defaults);
    }}>Restablecer valores</button>
   </div>
  </form>
  {error&&<p role="alert" className="field-error">{error}</p>}
  {notice&&<p role="status" className="notice">{notice}</p>}
  <p>Las preferencias quedan guardadas únicamente en este navegador.</p>
 </section>;
}
