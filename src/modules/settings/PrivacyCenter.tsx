import {useEffect,useMemo,useState} from 'react';
import type {SimulationSessionRepository,SimulationSessionInspection} from '../../core/ports/simulation-session-repository';
import type {ReviewClosure} from '../../core/domain/review-closure';
import {expiredSessionIds,PRIVACY_CONFIRM_PURGE,PRIVACY_CONFIRM_ERASE,
 RETENTION_DAYS,formatLocalDataSummary} from '../../core/domain/local-data-policy';
import type {RetentionDays} from '../../core/domain/local-data-policy';
import type {LiveObservation} from '../../core/domain/live-observation';
import {useLiveObservationRepository} from '../../shared/live-observation-context';

type DeleteTarget='expired'|'all';
/** Privacidad utilizable sin cambiar roles de prueba; no promete autenticación. */
export function PrivacyCenter({repository}:{repository:SimulationSessionRepository}){
 const liveRepository=useLiveObservationRepository();
 const [inspection,setInspection]=useState<SimulationSessionInspection|null>(null);
 const [closures,setClosures]=useState<readonly ReviewClosure[]>([]);
 const [liveRows,setLiveRows]=useState<readonly LiveObservation[]>([]);
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
    const [next,reviews,live]=await Promise.all([repository.inspect(),repository.listReviewClosures(),liveRepository.list()]);
    if(alive){setInspection(next);setClosures(reviews);setLiveRows(live);setError('');}
   }catch(e){if(alive)setError(e instanceof Error?e.message:String(e));}
   finally{if(alive)setLoading(false);}
  };
  void refresh();
  const onUpdate=()=>{void refresh();};
  window.addEventListener('vision-ai-sessions-updated',onUpdate);
  window.addEventListener('vision-ai-reviews-updated',onUpdate);
  window.addEventListener('vision-ai-live-updated',onUpdate);
  return()=>{alive=false;
   window.removeEventListener('vision-ai-sessions-updated',onUpdate);
   window.removeEventListener('vision-ai-reviews-updated',onUpdate);
   window.removeEventListener('vision-ai-live-updated',onUpdate);
  };
 },[repository,liveRepository,refreshKey]);
 const expired=useMemo(()=>inspection?
  expiredSessionIds(inspection.records,retention):[],[inspection,retention]);
 const summary=inspection?formatLocalDataSummary(inspection.records.length,
  inspection.corruptIds.length,closures.length,expired.length):null;
 const liveExpired=useMemo(()=>liveRows.filter(r=>Date.parse(r.savedAt)<
  Date.now()-retention*86400000).length,[liveRows,retention]);
 const totalExpired=(summary?.expired??0)+liveExpired;
 const totalLocal=(summary?.sessions??0)+(summary?.corrupt??0)+
  (summary?.reviews??0)+liveRows.length;
 const expected=target==='expired'?PRIVACY_CONFIRM_PURGE:PRIVACY_CONFIRM_ERASE;
 const canConfirm=Boolean(target&&phrase===expected&&summary&&!busy&&!loading&&
  (target==='all'?totalLocal>0:totalExpired>0));
 const resetConfirm=()=>{setTarget(null);setPhrase('');};
 async function applyDeletion(){
  if(!canConfirm||!target)return;
  setBusy(true);setError('');setNotice('');
  try{
   if(target==='expired'){
    const removed=await repository.purgeExpired(retention);
    const removedLive=await liveRepository.purgeExpired(retention);
    setNotice('Depuración confirmada: '+removed+' sesiones de escenarios y '+
     removedLive+' análisis de cámaras eliminados.');
   }else{
    const result=await repository.eraseAll();
    const liveRemoved=await liveRepository.eraseAll();
    setNotice('Historial local eliminado: '+result.sessions+' sesiones, '+
     liveRemoved+' análisis de cámaras y '+result.reviews+
     ' revisiones. Las descargas permanecen en tu dispositivo.');
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
   <span>CONTROL DE DATOS</span>
   <h2>Privacidad y control del historial</h2>
   <p>Controla y elimina los resultados que guardaste en este navegador.
    Los videos públicos no se graban.</p>
  </header>
  <div className="privacy-metrics" aria-live="polite">
   <div><span>Sesiones válidas</span><strong>{loading?'—':summary?.sessions??'—'}</strong></div>
   <div><span>Revisiones humanas</span><strong>{loading?'—':summary?.reviews??'—'}</strong></div>
   <div><span>Registros incompatibles</span><strong>{loading?'—':summary?.corrupt??'—'}</strong></div>
   <div><span>Fuera de retención</span><strong>{loading?'—':summary?.expired??'—'}</strong></div>
  </div>
  <p className="privacy-live-count"><strong>{loading?'—':liveRows.length}</strong>
   {' '}análisis guardados de cámaras en directo, incluidos en las opciones de borrado.</p>
  {error&&<p role="alert" className="session-history-error">{error}</p>}
  {notice&&<p role="status" className="session-history-notice">{notice}</p>}
  <section className="privacy-policy">
   <h3>¿Qué datos conserva la aplicación?</h3>
   <dl>
    <dt>Sesiones 3D</dt><dd>Escenario, fecha, estado reproducible, huella local y duración.</dd>
    <dt>Reconocimiento de objetos</dt><dd>Resultados de los análisis que decidas guardar.</dd>
    <dt>Cámaras públicas</dt><dd>Fecha de análisis, nombre de la cámara y detecciones guardadas de forma voluntaria. No se conserva el video.</dd>
    <dt>Revisión humana</dt><dd>Decisión, hora y nota opcional vinculadas a cada observación de seguridad.</dd>
    <dt>Imágenes y videos</dt><dd>El historial no conserva capturas, grabaciones ni imágenes subidas.</dd>
    <dt>Seguridad de tus datos</dt><dd>Los resultados quedan en este navegador. No se sincronizan con otros dispositivos.</dd>
    <dt>Archivos descargados</dt><dd>Eliminar el historial no borra los archivos que ya descargaste en tu dispositivo.</dd>
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
   <p className="privacy-retention-count"><strong>{loading?'—':totalExpired}</strong>
    {' '}registros antiguos elegibles para eliminar, tanto de simulaciones
    como de cámaras en directo.</p>
   <button type="button" disabled={loading||busy||!totalExpired}
    onClick={()=>{setTarget('expired');setPhrase('');}}>
    Revisar depuración</button>
  </section>
  <section className="privacy-erase">
   <h3>Eliminar todos los datos guardados</h3>
   <p>Se eliminarán sesiones, revisiones y análisis de cámaras guardados,
    incluidos registros incompatibles. Esta acción no se puede deshacer.</p>
   <button type="button" className="privacy-danger"
    disabled={loading||busy||!summary||
     totalLocal===0}
    onClick={()=>{setTarget('all');setPhrase('');}}>Revisar borrado total</button>
   <button type="button" className="privacy-history-link"
    onClick={()=>{location.hash='Historial';}}>Ver historial y exportar antes</button>
  </section>
  {target&&<section className="privacy-confirm" role="group"
   aria-label="Confirmación explícita de eliminación">
   <h3>{target==='expired'?'Confirmar depuración por antigüedad':'Confirmar borrado de todo el historial'}</h3>
   <p>{target==='expired'?
    'Se eliminarán '+totalExpired+' registros antiguos y sus revisiones.':
    'Se eliminarán sesiones, análisis de cámaras, revisiones y registros incompatibles de este navegador.'}</p>
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
  <p className="privacy-footnote">Los datos de este navegador se eliminan según
   la acción confirmada. Las imágenes y archivos ya descargados, así como los
   registros de otros dispositivos, deben eliminarse por separado.</p>
 </section>;
}
