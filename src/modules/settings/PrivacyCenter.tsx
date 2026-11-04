import {useEffect,useMemo,useState} from 'react';
import type {SimulationSessionRepository,SimulationSessionInspection} from '../../core/ports/simulation-session-repository';
import type {ReviewClosure} from '../../core/domain/review-closure';
import {expiredSessionIds,PRIVACY_CONFIRM_PURGE,PRIVACY_CONFIRM_ERASE,
 RETENTION_DAYS,formatLocalDataSummary} from '../../core/domain/local-data-policy';
import type {RetentionDays} from '../../core/domain/local-data-policy';

type DeleteTarget='expired'|'all';
/** Privacidad utilizable sin cambiar roles de prueba; no promete autenticación. */
export function PrivacyCenter({repository}:{repository:SimulationSessionRepository}){
 const [inspection,setInspection]=useState<SimulationSessionInspection|null>(null);
 const [closures,setClosures]=useState<readonly ReviewClosure[]>([]);
 const [loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [notice,setNotice]=useState('');
 const [retention,setRetention]=useState<RetentionDays>(90);
 const [target,setTarget]=useState<DeleteTarget|null>(null);
 const [phrase,setPhrase]=useState('');
 const [refreshKey,setRefreshKey]=useState(0);
 useEffect(()=>{
  let alive=true;
  const refresh=async()=>{
   try{
    const [next,reviews]=await Promise.all([repository.inspect(),repository.listReviewClosures()]);
    if(alive){setInspection(next);setClosures(reviews);setError('');}
   }catch(e){if(alive)setError(e instanceof Error?e.message:String(e));}
   finally{if(alive)setLoading(false);}
  };
  void refresh();
  const onUpdate=()=>{void refresh();};
  window.addEventListener('vision-ai-sessions-updated',onUpdate);
  window.addEventListener('vision-ai-reviews-updated',onUpdate);
  return()=>{alive=false;
   window.removeEventListener('vision-ai-sessions-updated',onUpdate);
   window.removeEventListener('vision-ai-reviews-updated',onUpdate);
  };
 },[repository,refreshKey]);
 const expired=useMemo(()=>inspection?
  expiredSessionIds(inspection.records,retention):[],[inspection,retention]);
 const summary=inspection?formatLocalDataSummary(inspection.records.length,
  inspection.corruptIds.length,closures.length,expired.length):null;
 const expected=target==='expired'?PRIVACY_CONFIRM_PURGE:PRIVACY_CONFIRM_ERASE;
 const canConfirm=Boolean(target&&phrase===expected&&summary&&!busy&&!loading&&
  (target==='all'?(summary.sessions+summary.corrupt+summary.reviews)>0:summary.expired>0));
 const resetConfirm=()=>{setTarget(null);setPhrase('');};
 async function applyDeletion(){
  if(!canConfirm||!target)return;
  setBusy(true);setError('');setNotice('');
  try{
   if(target==='expired'){
    const removed=await repository.purgeExpired(retention);
    setNotice('Depuración confirmada: '+removed+' sesiones antiguas eliminadas con sus revisiones vinculadas.');
   }else{
    const result=await repository.eraseAll();
    setNotice('Historial local eliminado: '+result.sessions+' sesiones y '+
     result.reviews+' revisiones. Los archivos que descargaste permanecen fuera de la aplicación.');
   }
   resetConfirm();
   window.dispatchEvent(new Event('vision-ai-sessions-updated'));
   window.dispatchEvent(new Event('vision-ai-reviews-updated'));
   setRefreshKey(value=>value+1);
  }catch(e){setError(e instanceof Error?e.message:String(e));}
  finally{setBusy(false);}
 }
 return <section className="panel privacy-center" aria-label="Gobierno y privacidad de datos locales">
  <header className="privacy-header">
   <span>FASE 13 · GOBIERNO DE DATOS</span>
   <h2>Privacidad y control del historial</h2>
   <p>Estas opciones se aplican a IndexedDB de este navegador. No
    necesitas subir imágenes, videos ni datasets para usar las simulaciones 3D.</p>
  </header>
  <div className="privacy-metrics" aria-live="polite">
   <div><span>Sesiones válidas</span><strong>{loading?'—':summary?.sessions??'—'}</strong></div>
   <div><span>Revisiones humanas</span><strong>{loading?'—':summary?.reviews??'—'}</strong></div>
   <div><span>Registros incompatibles</span><strong>{loading?'—':summary?.corrupt??'—'}</strong></div>
   <div><span>Fuera de retención</span><strong>{loading?'—':summary?.expired??'—'}</strong></div>
  </div>
  {error&&<p role="alert" className="session-history-error">{error}</p>}
  {notice&&<p role="status" className="session-history-notice">{notice}</p>}
  <section className="privacy-policy">
   <h3>¿Qué datos conserva la aplicación?</h3>
   <dl>
    <dt>Sesiones 3D</dt><dd>Escenario, fecha, estado reproducible, huella local y duración.</dd>
    <dt>Detecciones YOLO</dt><dd>Modelo, fotograma, cajas, clases y confianzas de los análisis que guardes.</dd>
    <dt>Revisión humana</dt><dd>Decisión, hora y nota opcional vinculadas a cada indicio EPP.</dd>
    <dt>Imágenes y videos</dt><dd>El historial no conserva capturas, grabaciones ni imágenes subidas.</dd>
    <dt>Protección y límites</dt><dd>IndexedDB depende de la seguridad del navegador y del sistema operativo.
     No incorpora cifrado propio, cuentas autenticadas ni sincronización cifrada entre dispositivos.</dd>
    <dt>Modelos ONNX</dt><dd>El navegador puede conservar pesos descargados en su caché.
     Este panel no elimina esa caché ni los CSV/JSON que hayas descargado.</dd>
   </dl>
   <p className="privacy-warning">Los perfiles operador, supervisor, auditor y administrador
    son perfiles de demostración. Seleccionar uno no es autenticación ni restringe
    por sí solo el acceso al almacenamiento local.</p>
  </section>
  <section className="privacy-retention">
   <div><h3>Retención y depuración manual</h3>
    <p>La eliminación nunca se ejecuta automáticamente. Los registros sin fecha válida
     se aíslan para revisión; no se destruyen por antigüedad.</p></div>
   <label htmlFor="privacy-retention-days">Conservar los últimos
    <select id="privacy-retention-days" value={retention}
     disabled={busy} onChange={e=>{
      setRetention(Number(e.target.value) as RetentionDays);resetConfirm();
     }}>
     {RETENTION_DAYS.map(days=><option key={days} value={days}>{days} días</option>)}
    </select>
   </label>
   <p className="privacy-retention-count"><strong>{summary?.expired??'—'}</strong>
    {' '}sesiones antiguas elegibles para depuración. Se borrarán también
    sus decisiones asociadas, no las sesiones recientes.</p>
   <button type="button" disabled={loading||busy||!summary?.expired}
    onClick={()=>{setTarget('expired');setPhrase('');}}>
    Revisar depuración</button>
  </section>
  <section className="privacy-erase">
   <h3>Eliminar todos los datos guardados</h3>
   <p>Se eliminarán conjuntamente las sesiones y revisiones de IndexedDB, incluidos
    registros incompatibles. Esta operación no se puede deshacer.</p>
   <button type="button" className="privacy-danger"
    disabled={loading||busy||!summary||
     summary.sessions+summary.corrupt+summary.reviews===0}
    onClick={()=>{setTarget('all');setPhrase('');}}>Revisar borrado total</button>
   <button type="button" className="privacy-history-link"
    onClick={()=>{location.hash='Historial';}}>Ver historial y exportar antes</button>
  </section>
  {target&&<section className="privacy-confirm" role="group"
   aria-label="Confirmación explícita de eliminación">
   <h3>{target==='expired'?'Confirmar depuración por antigüedad':'Confirmar borrado de todo el historial'}</h3>
   <p>{target==='expired'?
    'Se eliminarán '+(summary?.expired??0)+' sesiones antiguas y sus revisiones.':
    'Se eliminarán todas las sesiones, revisiones e incluso registros incompatibles de este navegador.'}</p>
   <label htmlFor="privacy-confirm-phrase">Escribe exactamente <strong>{expected}</strong>
    <input id="privacy-confirm-phrase" autoComplete="off" spellCheck={false}
     value={phrase} onChange={e=>setPhrase(e.target.value)}
     placeholder={expected} disabled={busy}/>
   </label>
   <div className="privacy-confirm-actions">
    <button type="button" onClick={resetConfirm} disabled={busy}>Cancelar</button>
    <button type="button" className="privacy-danger" disabled={!canConfirm}
     onClick={()=>void applyDeletion()}>
     {busy?'Eliminando…':target==='expired'?'Eliminar sesiones caducadas':'Eliminar todos los registros'}
    </button>
   </div>
  </section>}
  <p className="privacy-footnote">Las operaciones de borrado son atómicas: una
   revisión vinculada no queda separada de una sesión eliminada. Para retirar
   información de otras pestañas, dispositivos, descargas o copias de seguridad,
   debes actuar por separado en esos lugares.</p>
 </section>;
}
