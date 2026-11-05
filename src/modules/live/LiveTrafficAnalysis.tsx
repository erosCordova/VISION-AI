import {useEffect,useRef,useState} from 'react';
import type {Detection} from '../../core/domain/model';
import {loadYoloBrowser,analyzeYoloFrame} from './yolo-browser';
import type {LoadedYolo,YoloFrame} from './yolo-browser';
import {frameBoxPixels} from './frame-analysis-cycle';
import {loadHlsFactory} from './live-hls-loader';
import type {HlsPlayer,HlsErrorData,HlsLevelData} from './live-hls-loader';
import {LIVE_TRAFFIC_SOURCES,isAuthorizedLiveTrafficUrl} from './live-traffic-sources';
import {saveLiveObservation} from '../../infrastructure/persistence/live-observation-store';
import type {LiveObservation} from '../../core/domain/live-observation';
import {readLivePreferences,saveLivePreferences} from '../settings/live-preferences';
import {streamReconnectDelay,MAX_STREAM_RECONNECTS,chooseFatalHlsAction,
 conciseVideoError} from './live-hls-recovery';

type VideoPhase='idle'|'connecting'|'buffering'|'live'|'error';
type YoloPhase='idle'|'loading'|'running'|'error';
const delay=(ms:number)=>new Promise<void>(resolve=>window.setTimeout(resolve,ms));

/** Siempre dibuja las detecciones sobre el fotograma EXACTO que examinó YOLO,
 * no sobre el video que siguió avanzando durante la inferencia.
 */
function renderEvidence(
 frame:YoloFrame,dest:HTMLCanvasElement,minConfidence:number,classFilter='all'
):void{
 dest.width=frame.width;dest.height=frame.height;
 const ctx=dest.getContext('2d');
 if(!ctx)throw Error('No se pudo dibujar el resultado.');
 ctx.drawImage(frame.source,0,0,frame.width,frame.height);
 for(const detection of frame.detections){
  if(detection.confidence<minConfidence||
   (classFilter!=='all'&&detection.classId!==classFilter))continue;
  const box=frameBoxPixels(detection.box,frame.width,frame.height);
  const color=detection.classId==='person'?'#75f6d0':'#ffd283';
  ctx.lineWidth=Math.max(2,frame.width/400);
  ctx.strokeStyle=color;
  ctx.strokeRect(box.x,box.y,box.width,box.height);
  const text=detection.label+'  '+Math.round(detection.confidence*100)+'%';
  ctx.font='700 '+Math.max(12,Math.round(frame.width/42))+'px sans-serif';
  const width=Math.min(frame.width,ctx.measureText(text).width+18);
  const height=24;
  const left=Math.max(0,Math.min(frame.width-width,box.x));
  const top=Math.max(0,box.y-height);
  ctx.fillStyle='#051b2be9';ctx.fillRect(left,top,width,height);
  ctx.fillStyle=color;ctx.fillRect(left,top,4,height);
  ctx.fillStyle='#f5fff9';ctx.textBaseline='middle';
  ctx.fillText(text,left+9,top+height/2);
 }
}

/** SDOT transmite HLS en directo; vídeo y modelo se ejecutan en navegador.
 * Sin cámara del dispositivo, transcodificación en Render ni descarga del vídeo.
 */
export function LiveTrafficAnalysis(){
 const [cameraId,setCameraId]=useState(LIVE_TRAFFIC_SOURCES[0].id);
 const camera=LIVE_TRAFFIC_SOURCES.find(s=>s.id===cameraId)??LIVE_TRAFFIC_SOURCES[0];
 const [streaming,setStreaming]=useState(false);
 const [videoPhase,setVideoPhase]=useState<VideoPhase>('idle');
 const [videoError,setVideoError]=useState('');
 const [videoMessage,setVideoMessage]=useState('Selecciona una cámara e inicia el video en directo.');
 const [liveConfirmed,setLiveConfirmed]=useState(false);
 const [yoloPhase,setYoloPhase]=useState<YoloPhase>('idle');
 const [yoloError,setYoloError]=useState('');
 const [yoloMessage,setYoloMessage]=useState('YOLOv8n ONNX se carga al iniciar el análisis.');
 const [analyzing,setAnalyzing]=useState(false);
 const [threshold,setThreshold]=useState(()=>readLivePreferences().threshold);
 const [classFilter,setClassFilter]=useState('all');
 const [autoSwitch,setAutoSwitch]=useState(()=>readLivePreferences().autoSwitch);
 const [saveNotice,setSaveNotice]=useState('');
 const [saving,setSaving]=useState(false);
 const [detections,setDetections]=useState<readonly Detection[]>([]);
 const [analyzed,setAnalyzed]=useState(0);
 const [fps,setFps]=useState<number|null>(null);
 const [inferenceMs,setInferenceMs]=useState<number|null>(null);
 const [sampleTime,setSampleTime]=useState('');
 const videoRef=useRef<HTMLVideoElement>(null);
 const evidenceRef=useRef<HTMLCanvasElement>(null);
 const modelRef=useRef<LoadedYolo|null>(null);
 const lastResultRef=useRef<YoloFrame|null>(null);
 const streamGeneration=useRef(0);
 const runGeneration=useRef(0);
 const reconnectAttempts=useRef(0);
 const wantsRecognition=useRef(false);
 const failedCameras=useRef(new Set<string>());
 const observedAtRef=useRef('');
 const classFilterRef=useRef(classFilter);
 classFilterRef.current=classFilter;
 const nativeHlsRejected=useRef(false);
 const thresholdRef=useRef(threshold);
 thresholdRef.current=threshold;
 const analysisDelayRef=useRef(readLivePreferences().analysisIntervalMs);
 const persist=(patch:{threshold?:number;autoSwitch?:boolean})=>{
  try{saveLivePreferences({...readLivePreferences(),...patch});}
  catch{/* seguir funcionando aunque el navegador rechace guardar preferencias */}
 };
 useEffect(()=>{
  const onConfig=()=>{
   const prefs=readLivePreferences();
   setThreshold(prefs.threshold);setAutoSwitch(prefs.autoSwitch);
   analysisDelayRef.current=prefs.analysisIntervalMs;
  };
  window.addEventListener('vision-ai-live-preferences-updated',onConfig);
  window.addEventListener('storage',onConfig);
  return()=>{
   window.removeEventListener('vision-ai-live-preferences-updated',onConfig);
   window.removeEventListener('storage',onConfig);
  };
 },[]);
 const [connectionEpoch,setConnectionEpoch]=useState(0);
 const readyForInference=videoPhase==='live'&&liveConfirmed;
 const visibleDetections=detections.filter(item=>item.confidence>=threshold&&
  (classFilter==='all'||item.classId===classFilter));
 const classOptions=[...new Map(detections.map(d=>[d.classId,d.label])).entries()]
  .sort((a,b)=>a[1].localeCompare(b[1],'es'));

 useEffect(()=>{
  if(!streaming)return;
  const video=videoRef.current;
  if(!video)return;
  if(!isAuthorizedLiveTrafficUrl(camera.streamUrl)){
   setVideoPhase('error');
   setVideoError('Fuente no permitida por la lista de cámaras públicas.');
   return;
  }
  const token=++streamGeneration.current;
  let closed=false;
  let player:HlsPlayer|null=null;
  let movement=0;
  let lastTime=-1;
  let lastProgress=performance.now();
  let manifestIsLive=false;
  let nativePlayback=false;
  let sourceAttached=false;
  let retryTimeout:number|null=null;
  let recoveredMedia=false;
  let restartedNetwork=false;
  let liveSince=0;
  const fail=(reason:string)=>{
   if(closed||retryTimeout!==null)return;
   const wait=streamReconnectDelay(reconnectAttempts.current);
   setLiveConfirmed(false);
   if(wait===null){
    setVideoPhase('error');
    setVideoError(reason+' Reintentos agotados. Selecciona otra cámara.');
    setVideoMessage('Sin señal · usa Reintentar cámara u Otra cámara.');
    return;
   }
   const attempt=++reconnectAttempts.current;
   setVideoPhase('buffering');
   setVideoError('');
   setVideoMessage('Se interrumpió la señal: reconectando ('+attempt+'/'+
    MAX_STREAM_RECONNECTS+') en '+(wait/1000).toFixed(1)+' s…');
   retryTimeout=window.setTimeout(()=>{
    retryTimeout=null;
    if(!closed)setConnectionEpoch(n=>n+1);
   },wait);
  };
  setVideoPhase('connecting');setVideoError('');
  setVideoMessage('Conectando con el video HLS público de SDOT…');
  setLiveConfirmed(false);
  // No llamar load() sin URL: algunos navegadores lanzan MEDIA_ERR_SRC_NOT_SUPPORTED.
  // La limpieza de la conexión anterior se realiza antes, en el return del effect.
  video.crossOrigin='anonymous';
  video.muted=true;

  const onPlaybackError=()=>{
   if(closed||!sourceAttached)return;
   if(nativePlayback&&video.error?.code===4)nativeHlsRejected.current=true;
   fail(conciseVideoError(video.error?.code));
  };
  const onNativeDuration=()=>{
   if(!closed&&nativePlayback&&(video.duration===Infinity||!Number.isFinite(video.duration)))
    manifestIsLive=true;
  };
  video.addEventListener('error',onPlaybackError);
  video.addEventListener('durationchange',onNativeDuration);

  const watchdog=window.setInterval(()=>{
   if(closed||document.hidden)return;
   const current=video.currentTime;
   if(video.readyState>=2&&current>lastTime+.08){
    lastTime=current;movement++;
    lastProgress=performance.now();
    if(retryTimeout!==null)return;
    if(manifestIsLive&&movement>=2){
     if(!liveSince)liveSince=performance.now();
     if(performance.now()-liveSince>=30_000)reconnectAttempts.current=0;
     setVideoPhase('live');setLiveConfirmed(true);
     setVideoError('');
     setVideoMessage('Transmisión HLS activa · video en movimiento');
    }else if(movement>=1){
     setVideoPhase('buffering');
     setVideoMessage('Comprobando que llegan nuevos fotogramas en directo…');
    }
   }
   const stalledFor=performance.now()-lastProgress;
   if(stalledFor>6_000&&liveSince&&!retryTimeout){
    setVideoPhase('buffering');setLiveConfirmed(false);
    setVideoMessage('Video detenido temporalmente: esperando nuevos fotogramas…');
   }
   if(stalledFor>20_000){
    fail('No llegaron fotogramas nuevos durante 20 segundos.');
   }
  },1000);

  const start=async()=>{
   try{
    const native=Boolean(video.canPlayType('application/vnd.apple.mpegurl'))&&!nativeHlsRejected.current;
    if(native){
     nativePlayback=true;
     // En Safari HLS es nativo; el estado DIRECTO requiere fotogramas avanzando.
     manifestIsLive=true;
     sourceAttached=true;
     video.src=camera.streamUrl;
     await video.play();
    }else{
     const Hls=await loadHlsFactory();
     if(closed||streamGeneration.current!==token)return;
     if(!Hls.isSupported())throw Error('El navegador no admite HLS mediante MediaSource.');
     player=new Hls({
      enableWorker:true,lowLatencyMode:true,
      liveSyncDurationCount:2,maxBufferLength:12,
      backBufferLength:0,maxLiveSyncPlaybackRate:1.5
     });
     player.on(Hls.Events.LEVEL_LOADED,(_event:string,data:HlsLevelData)=>{
      if(closed)return;
      if(data.details?.live===true)manifestIsLive=true;
      else if(data.details?.live===false){
       setVideoPhase('error');setLiveConfirmed(false);
       setVideoError('La fuente no corresponde a una transmisión en directo.');
      }
     });
     player.on(Hls.Events.MANIFEST_PARSED,()=>{
      if(closed)return;
      void video.play().catch(error=>{
       if(closed)return;
       const message=error instanceof Error?error.message:String(error);
       fail('No se pudo iniciar la reproducción: '+message.slice(0,120));
      });
     });
     player.on(Hls.Events.ERROR,(_event:string,data:HlsErrorData)=>{
      if(closed||!data.fatal)return;
      const action=chooseFatalHlsAction(data.type,recoveredMedia,restartedNetwork);
      if(action==='recover-media'&&player?.recoverMediaError){
       recoveredMedia=true;
       setVideoMessage('Recuperando decodificación del video en directo…');
       player.recoverMediaError();return;
      }
      if(action==='restart-network'&&player?.startLoad){
       restartedNetwork=true;
       setVideoMessage('Reanudando la descarga de segmentos de video…');
       player.startLoad();return;
      }
      fail('Error HLS: '+(data.details||data.type||'transmisión interrumpida'));
     });
     sourceAttached=true;
     player.attachMedia(video);
     player.loadSource(camera.streamUrl);
     setVideoPhase('buffering');
     setVideoMessage('Descargando manifiesto y segmentos del video HLS…');
    }
   }catch(error){
    if(closed)return;
    fail(error instanceof Error?error.message:'No se pudo iniciar la transmisión.');
   }
  };
  void start();
  return()=>{
   closed=true;streamGeneration.current++;
   window.clearInterval(watchdog);
   if(retryTimeout!==null)window.clearTimeout(retryTimeout);
   video.removeEventListener('error',onPlaybackError);
   video.removeEventListener('durationchange',onNativeDuration);
   video.pause();player?.destroy();
   video.removeAttribute('src');video.load();
  };
 },[streaming,cameraId,camera.streamUrl,connectionEpoch]);

 /** Selecciona otra cámara SOLO cuando fallaron los reintentos de la fuente.
  * No se afirma disponibilidad hasta recibir video realmente en movimiento.
  */
 useEffect(()=>{
  if(!autoSwitch||!streaming||videoPhase!=='error')return;
  failedCameras.current.add(cameraId);
  const alternative=LIVE_TRAFFIC_SOURCES.find(item=>!failedCameras.current.has(item.id));
  if(!alternative){
   setVideoMessage('No hay otra cámara sin probar. Puedes reintentar más tarde.');
   return;
  }
  reconnectAttempts.current=0;
  setLiveConfirmed(false);setVideoPhase('connecting');setVideoError('');
  setVideoMessage('Buscando otra cámara en directo…');
  setCameraId(alternative.id);
  setDetections([]);setAnalyzed(0);setFps(null);setInferenceMs(null);
  setSampleTime('');setClassFilter('all');setSaveNotice('');
  observedAtRef.current='';lastResultRef.current=null;
  const c=evidenceRef.current;
  c?.getContext('2d')?.clearRect(0,0,c.width,c.height);
 },[autoSwitch,streaming,videoPhase,cameraId]);

 useEffect(()=>{
  if(videoPhase!=='live'&&analyzing){
   setAnalyzing(false);runGeneration.current++;
   setYoloPhase('idle');
   setYoloMessage('Reconectando: YOLO se reanudará al recibir video nuevo.');
  }else if(videoPhase==='live'&&!analyzing&&wantsRecognition.current&&modelRef.current&&
   videoRef.current&&!videoRef.current.paused&&videoRef.current.readyState>=2){
   setYoloPhase('running');setAnalyzing(true);
   setYoloMessage('YOLO reanudado sobre fotogramas actuales.');
  }
 },[videoPhase,analyzing,yoloPhase]);

 useEffect(()=>{
  const frame=lastResultRef.current;
  if(frame&&evidenceRef.current)renderEvidence(frame,evidenceRef.current,threshold,classFilter);
 },[threshold,classFilter]);

 useEffect(()=>{
  if(!analyzing||!modelRef.current)return;
  let closed=false;
  const token=++runGeneration.current;
  const model=modelRef.current;
  const video=videoRef.current;
  if(!video)return;
  let lastMediaTime=-1;
  let recent:number[]=[];
  const pump=async()=>{
   while(!closed&&token===runGeneration.current){
    if(document.hidden||video.paused||video.readyState<2||
       video.videoWidth<2||video.videoHeight<2){
     await delay(400);continue;
    }
    const mediaTime=video.currentTime;
    if(mediaTime-lastMediaTime<.10){
     await delay(180);continue;
    }
    const scale=Math.min(1,640/Math.max(video.videoWidth,video.videoHeight));
    const canvas=document.createElement('canvas');
    canvas.width=Math.max(2,Math.round(video.videoWidth*scale));
    canvas.height=Math.max(2,Math.round(video.videoHeight*scale));
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    if(!ctx){
     setYoloPhase('error');setYoloError('No se pudo crear el canvas de inferencia.');
     setAnalyzing(false);return;
    }
    try{
     // Si la fuente no concede acceso CORS a píxeles, YOLO falla explícitamente.
     ctx.drawImage(video,0,0,canvas.width,canvas.height);
     lastMediaTime=mediaTime;
     const result=await analyzeYoloFrame(model,canvas,.20,35);
     if(closed||token!==runGeneration.current)return;
     lastResultRef.current=result;
     observedAtRef.current=new Date().toISOString();
     if(evidenceRef.current)renderEvidence(result,evidenceRef.current,thresholdRef.current,classFilterRef.current);
     setDetections(result.detections);
     setInferenceMs(Math.round(result.inferenceMs));
     setAnalyzed(n=>n+1);
     setSampleTime(new Date().toLocaleTimeString('es-PE',{hour12:false}));
     const now=performance.now();
     recent=[...recent.filter(t=>t>now-10000),now].slice(-15);
     if(recent.length>1){
      const span=recent[recent.length-1]-recent[0];
      setFps(span>0?(recent.length-1)*1000/span:null);
     }
     setYoloMessage('YOLO examina los píxeles de los fotogramas nuevos de esta cámara.');
    }catch(error){
     if(closed||token!==runGeneration.current)return;
     const text=error instanceof Error?error.message:String(error);
     wantsRecognition.current=false;
     setYoloPhase('error');setAnalyzing(false);
     setYoloError(/SecurityError|tainted|cross-origin/i.test(text)?
      'El servidor de video no permite leer sus píxeles (CORS). No se puede ejecutar YOLO con esta fuente.':
      'Error de inferencia: '+text.slice(0,180));
     return;
    }
    await delay(analysisDelayRef.current); // Sin acumulación de fotogramas atrasados.
   }
  };
  void pump();
  return()=>{closed=true;runGeneration.current++;};
 },[analyzing,cameraId]);

 const stopStream=()=>{
  runGeneration.current++;
  wantsRecognition.current=false;
  reconnectAttempts.current=0;
  setAnalyzing(false);setYoloPhase('idle');
  setStreaming(false);setVideoPhase('idle');setLiveConfirmed(false);
  setVideoError('');setVideoMessage('Transmisión detenida.');
 };
 const retryStream=()=>{
  failedCameras.current.clear();
  reconnectAttempts.current=0;
  setVideoError('');setLiveConfirmed(false);setVideoPhase('connecting');
  if(streaming)setConnectionEpoch(n=>n+1);
  else setStreaming(true);
 };
 const changeCamera=(next:string)=>{
  if(!LIVE_TRAFFIC_SOURCES.some(x=>x.id===next))return;
  stopStream();failedCameras.current.clear();
  nativeHlsRejected.current=false;setCameraId(next);
  setDetections([]);setAnalyzed(0);setFps(null);
  setInferenceMs(null);setSampleTime('');setYoloError('');
  lastResultRef.current=null;observedAtRef.current='';setClassFilter('all');setSaveNotice('');
  if(evidenceRef.current){
   const ctx=evidenceRef.current.getContext('2d');
   ctx?.clearRect(0,0,evidenceRef.current.width,evidenceRef.current.height);
  }
 };
 const startYolo=async()=>{
  if(!readyForInference||yoloPhase==='loading')return;
  wantsRecognition.current=true;
  const token=++runGeneration.current;
  setYoloPhase('loading');setYoloError('');
  setYoloMessage('Cargando modelo YOLOv8n para analizar el video…');
  try{
   const model=modelRef.current??await loadYoloBrowser(message=>{
    if(token===runGeneration.current)setYoloMessage(message);
   },'coco');
   if(token!==runGeneration.current)return;
   modelRef.current=model;
   if(!videoRef.current||videoRef.current.paused||videoRef.current.readyState<2){
    setYoloPhase('idle');
    setYoloMessage('Reconectando cámara: YOLO continuará al volver los fotogramas.');
    return;
   }
   setYoloPhase('running');setAnalyzing(true);
  }catch(error){
   if(token!==runGeneration.current)return;
   wantsRecognition.current=false;
   setYoloPhase('error');setYoloError(error instanceof Error?error.message:String(error));
  }
 };
 const stopYolo=()=>{
  runGeneration.current++;
  wantsRecognition.current=false;
  setAnalyzing(false);setYoloPhase('idle');
  setYoloMessage('Análisis detenido. El video puede continuar reproduciéndose.');
 };
 const saveCurrent=async()=>{
  const frame=lastResultRef.current;
  if(!frame||!observedAtRef.current||saving)return;
  setSaving(true);setSaveNotice('');
  try{
   const now=new Date().toISOString();
   const item:LiveObservation={
    schemaVersion:1,id:crypto.randomUUID(),source:'public-live-video',
    model:'yolov8n-coco',savedAt:now,observedAt:observedAtRef.current,
    cameraId,cameraName:camera.name,inferenceMs:frame.inferenceMs,
    frameWidth:frame.width,frameHeight:frame.height,
    detections:frame.detections.map(d=>({...d,box:{...d.box}}))
   };
   await saveLiveObservation(item);
   setSaveNotice('Análisis guardado. Puedes verlo en Historial.');
  }catch(e){setSaveNotice(e instanceof Error?e.message:'No se pudo guardar el análisis.');}
  finally{setSaving(false);}
 };
 const downloadEvidence=()=>{
  const canvas=evidenceRef.current;
  if(!lastResultRef.current||!canvas)return;
  try{
   canvas.toBlob(blob=>{
    if(!blob){setSaveNotice('No se pudo generar la imagen de evidencia.');return;}
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download='vision-ai-camara-'+cameraId+'-'+Date.now()+'.png';
    document.body.appendChild(a);a.click();a.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),1000);
    setSaveNotice('Imagen descargada en tu dispositivo.');
   },'image/png');
  }catch{setSaveNotice('No se pudo descargar esta imagen.');}
 };
 return <section className="live-traffic-lab" aria-label="Transmisión pública en tiempo real con YOLO">
  <header className="live-traffic-head">
   <div><span className="live-traffic-eyebrow">CÁMARAS PÚBLICAS EN DIRECTO</span>
    <h2>Monitoreo de tráfico en directo</h2>
    <p>Observa cámaras públicas de Seattle y reconoce personas y vehículos
    mientras el video está en movimiento.</p></div>
   <span className={'live-traffic-status '+(readyForInference?'is-live':'')}>
    <i/>{readyForInference?'DIRECTO · VIDEO ACTIVO':videoPhase==='connecting'?'CONECTANDO':
     videoPhase==='buffering'?'BUFFERING':videoPhase==='error'?'SIN SEÑAL':'DETENIDO'}</span>
  </header>
  <div className="live-traffic-bar">
   <label htmlFor="live-traffic-source">Cámara pública de tránsito
    <select id="live-traffic-source" value={cameraId} onChange={event=>changeCamera(event.target.value)}>
     {LIVE_TRAFFIC_SOURCES.map(source=><option key={source.id} value={source.id}>{source.name}</option>)}
    </select></label>
   <label className="live-traffic-auto">
    <input type="checkbox" checked={autoSwitch} onChange={e=>{
     setAutoSwitch(e.target.checked);persist({autoSwitch:e.target.checked});
    }}/>
    Cambiar automáticamente de cámara si falla
   </label>
  </div>
  <div className="live-traffic-grid">
   <div className="live-traffic-stream-column">
    <div className="live-traffic-viewport">
     <video ref={videoRef} muted playsInline autoPlay crossOrigin="anonymous"
      aria-label={'Transmisión de tráfico en directo: '+camera.name}/>
     {!readyForInference&&<div className="live-traffic-placeholder">
      <strong>{videoPhase==='error'?'Video no disponible':
       streaming?'Conectando con la cámara pública…':'Transmisión detenida'}</strong>
      <span>{videoPhase==='error'?'Selecciona otra fuente o reintenta.':
       'No se utilizan fotografías estáticas ni archivos simulados.'}</span>
     </div>}
     {readyForInference&&<span className="live-traffic-video-label">● VIDEO EN DIRECTO</span>}
    </div>
    <div className="live-traffic-stream-controls">
     {!streaming?
      <button type="button" className="primary" onClick={()=>setStreaming(true)}>▶ Iniciar video en directo</button>:
      <button type="button" onClick={stopStream}>■ Detener transmisión</button>}
     {streaming&&videoPhase!=='live'&&<button type="button" className="primary" onClick={retryStream}>
      ↻ Reintentar cámara
     </button>}
     {videoPhase==='error'&&<button type="button" onClick={()=>{
      const index=LIVE_TRAFFIC_SOURCES.findIndex(item=>item.id===cameraId);
      const next=LIVE_TRAFFIC_SOURCES[(index+1)%LIVE_TRAFFIC_SOURCES.length];
      changeCamera(next.id);
      setStreaming(true);
     }}>Otra cámara</button>}
     <span role="status">{videoMessage}</span>
    </div>
    {videoError&&<p className="live-traffic-error" role="alert">{videoError}</p>}
    <p className="live-traffic-source-note">Fuente pública: Departamento de Transporte de Seattle.
     El video puede presentar retrasos o interrupciones y no se graba en VISION-AI.</p>
    <a href="https://web.seattle.gov/travelers" target="_blank" rel="noopener noreferrer">
     Consultar cámaras en el portal oficial de Seattle
    </a>
   </div>
   <aside className="live-traffic-inference">
    <div className="live-traffic-inference-head">
     <span className="live-traffic-eyebrow">RESULTADOS DEL ÚLTIMO ANÁLISIS</span>
     <h3>Reconocimiento YOLO real</h3>
     <p>Las detecciones corresponden a la imagen analizada,
      aunque el video siga avanzando.</p>
    </div>
    <div className="live-traffic-evidence">
     <canvas ref={evidenceRef} role="img" aria-label="Último fotograma analizado, con cajas YOLO reales"/>
     {!analyzed&&<div className="live-traffic-evidence-empty">
      Inicia el video y después YOLO para ver las detecciones reales.
     </div>}
    </div>
    <div className="live-traffic-actions">
     {!analyzing?
      <button className="primary" type="button" disabled={!readyForInference||yoloPhase==='loading'}
       onClick={()=>void startYolo()}>
       {yoloPhase==='loading'?'Cargando modelo…':'◉ Iniciar reconocimiento'}
      </button>:
      <button type="button" onClick={stopYolo}>■ Detener reconocimiento</button>}
    </div>
    <p className="live-traffic-engine-note" role="status">{yoloMessage}</p>
    {yoloError&&<p role="alert" className="live-traffic-error">{yoloError}</p>}
    <div className="live-traffic-visual-filters">
     <label htmlFor="live-traffic-threshold" className="live-traffic-threshold">
      Confianza mínima: {Math.round(threshold*100)} %
      <input id="live-traffic-threshold" type="range" min="10" max="90"
       value={Math.round(threshold*100)}
       onChange={event=>{
        const value=Number(event.target.value)/100;
        setThreshold(value);persist({threshold:value});
       }}/>
     </label>
     <label htmlFor="live-traffic-class-filter" className="live-traffic-class-label">
      Mostrar objetos
      <select id="live-traffic-class-filter" value={classFilter}
       onChange={event=>setClassFilter(event.target.value)}>
       <option value="all">Todas las clases</option>
       {classOptions.map(([id,label])=><option key={id} value={id}>{label}</option>)}
      </select>
     </label>
    </div>
    <div className="live-traffic-result-actions">
     <button type="button" disabled={!analyzed||saving} onClick={()=>void saveCurrent()}>
      {saving?'Guardando…':'Guardar análisis'}
     </button>
     <button type="button" disabled={!analyzed} onClick={downloadEvidence}>
      Descargar imagen
     </button>
     <button type="button" onClick={()=>{location.hash='Historial';}}>
      Ver historial
     </button>
    </div>
    {saveNotice&&<p className="live-history-notice" role="status">{saveNotice}</p>}
    <div className="live-traffic-metrics">
     <div><span>Fotogramas analizados</span><strong>{analyzed}</strong></div>
     <div><span>Objetos detectados</span><strong>{analyzed?visibleDetections.length:'—'}</strong></div>
     <div><span>Inferencias por segundo</span><strong>{fps===null?'—':fps.toFixed(1)}</strong></div>
     <div><span>Tiempo del último YOLO</span><strong>{inferenceMs===null?'—':inferenceMs+' ms'}</strong></div>
    </div>
    <div className="live-traffic-observations">
     <strong>Última lectura {sampleTime||'—'}</strong>
     {analyzed===0?<p>Sin mediciones todavía.</p>:
      visibleDetections.length===0?<p>YOLO no detectó objetos que superen el umbral.</p>:
      <ul>{visibleDetections.slice(0,10).map((item,index)=>
       <li key={index}><span>{item.label}</span><b>{Math.round(item.confidence*100)}%</b></li>)}</ul>}
    </div>
   </aside>
  </div>
  <footer className="live-traffic-footer">
   Resultados orientativos de reconocimiento visual; no identifica rostros ni matrículas.
   La transmisión depende de la disponibilidad de cada cámara pública.
  </footer>
 </section>;
}
