import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { IndustrialScene3D } from './IndustrialScene3D';
import { HumanizedScene3D } from './HumanizedScene3D';
import { SimulationAnalytics } from './SimulationAnalytics';
import { YoloBrowserPanel } from './YoloBrowserPanel';
import { YoloMonitor } from './YoloMonitor';
import { INITIAL_YOLO_TELEMETRY,updateYoloTelemetry } from './yolo-telemetry';
import type {YoloTelemetry,YoloTelemetryEvent} from './yolo-telemetry';
import type { IndustrialSceneHandle,LayerName } from './IndustrialScene3D';
import { simulationSnapshot } from './simulation-engine';
import type { ScenarioKey } from './simulation-engine';
import type { CameraView } from './scene-math';

const SCENES:{id:ScenarioKey;tab:string;name:string;description:string;icon:string}[]=[
 {id:'safety',tab:'Seguridad',name:'Seguridad industrial',description:'Personal, cascos, chalecos y zonas restringidas.',icon:'◈'},
 {id:'quality',tab:'Manufactura',name:'Línea de producción',description:'Productos sobre cinta e inspección visual sintética.',icon:'▤'},
 {id:'retail',tab:'Retail',name:'Ocupación comercial',description:'Personas, pasillos y conteo ilustrativo por zonas.',icon:'▦'},
 {id:'warehouse',tab:'Logística',name:'Almacén inteligente',description:'Montacargas, pallets, estanterías y rutas de paso.',icon:'▣'}
];
const CAMERAS:{id:CameraView;label:string}[]=[
 {id:'isometric',label:'Isométrica'},{id:'frontal',label:'Frontal'},{id:'superior',label:'Superior'},
 {id:'persona',label:'Primer plano'}
];
const controls:{id:LayerName;label:string}[]=[
 {id:'boxes',label:'Cajas de seguimiento'},
 {id:'labels',label:'Etiquetas flotantes'},
 {id:'masks',label:'Resaltado de objetos'},
 {id:'zones',label:'Zonas delimitadas'}
];
const blankLayers:Record<LayerName,boolean>={boxes:true,labels:true,masks:false,zones:true};
const secondsText=(seconds:number)=>Math.floor(seconds/60).toString().padStart(2,'0')+
 ':'+Math.floor(seconds%60).toString().padStart(2,'0');

export function InteractiveSimulator({scenarioId,onScenarioChange}:{
 scenarioId:ScenarioKey;
 onScenarioChange:(id:ScenarioKey)=>void;
}){
 const [elapsed,setElapsed]=useState(0);
 const [paused,setPaused]=useState(false);
 const [speed,setSpeed]=useState(1);
 const [threshold,setThreshold]=useState(.70);
 const [layers,setLayers]=useState<Record<LayerName,boolean>>(blankLayers);
 const [showScore,setShowScore]=useState(true);
 const [view,setView]=useState<CameraView>('isometric');
 const [graphics,setGraphics]=useState<'human'|'light'>('human');
 const [analysisMode,setAnalysisMode]=useState<'synthetic'|'yolo'>('synthetic');
 const [renderFps,setRenderFps]=useState(0);
 const [yoloTelemetry,setYoloTelemetry]=useState<YoloTelemetry>(INITIAL_YOLO_TELEMETRY);
 const onYoloTelemetry=useCallback((event:YoloTelemetryEvent)=>{
  setYoloTelemetry(previous=>updateYoloTelemetry(previous,event));
 },[]);
 const [captureError,setCaptureError]=useState('');
 const frameRef=useRef({previous:0});
 const sceneRef=useRef<IndustrialSceneHandle>(null);
 const getRenderedSource=useCallback(()=>sceneRef.current?.rawCanvas()??null,[]);
 const shellRef=useRef<HTMLElement>(null);
 const config=SCENES.find(item=>item.id===scenarioId)??SCENES[0];
 useEffect(()=>{
  if(paused)return;
  frameRef.current.previous=performance.now();
  const timer=window.setInterval(()=>{
   const now=performance.now();
   const delta=Math.min(180,now-frameRef.current.previous);
   frameRef.current.previous=now;
   setElapsed(value=>value+delta*speed/1000);
  },75);
  return ()=>window.clearInterval(timer);
 },[paused,speed]);
 const snapshot=useMemo(()=>simulationSnapshot(scenarioId,elapsed),[scenarioId,elapsed]);
 const filterCount=snapshot.entities.filter(entity=>entity.score>=threshold).length;
 const yoloLatest=yoloTelemetry.observations.at(-1)??null;
 const effectiveLayers=useMemo(()=>analysisMode==='yolo'?{
  ...layers,boxes:false,labels:false,masks:false,zones:false
 }:layers,[analysisMode,layers]);
 function changeScenario(id:ScenarioKey){
  onScenarioChange(id);setElapsed(0);setPaused(false);
  setYoloTelemetry(INITIAL_YOLO_TELEMETRY);
  setView('isometric');sceneRef.current?.resetCamera();
  setCaptureError('');
 }
 function toggle(layer:LayerName){
  setLayers(prev=>({...prev,[layer]:!prev[layer]}));
 }
 async function capture(){
  try{
   const blob=await sceneRef.current?.capture();
   if(!blob)throw new Error('No se ha inicializado el visor WebGL.');
   const href=URL.createObjectURL(blob);
   const link=document.createElement('a');
   link.download='vision-ai-3d-'+scenarioId+'-'+Math.floor(elapsed)+'s.png';
   link.href=href;document.body.appendChild(link);link.click();link.remove();
   setCaptureError('');
   window.setTimeout(()=>URL.revokeObjectURL(href),1000);
  }catch(e){setCaptureError(e instanceof Error?e.message:'No se pudo guardar PNG.');}
 }
 async function fullscreen(){
  const node=shellRef.current;
  if(!node)return;
  try{
   if(document.fullscreenElement)await document.exitFullscreen();
   else await node.requestFullscreen();
  }catch{setCaptureError('El navegador no permitió activar pantalla completa.');}
 }
 function restart(){setElapsed(0);setPaused(false);}
 return <section className="simulator-shell simulator-v2 simulator-v3" ref={shellRef}
   aria-label="Laboratorio tridimensional de simulaciones industriales">
   <div className="simulator-topline">
    <div>
     <span className="simulator-overline">VISION-AI / LABORATORIO INDUSTRIAL</span>
     <h2>Simulación industrial 3D <span className="simulator-pro-label">YOLO + 3D</span></h2>
     <p>Personajes humanos animados, rutas autónomas, instalaciones industriales y supervisión visual.</p>
    </div>
    <span className="simulator-mode"><span className="simulator-signal"/> ESCENA SINTÉTICA · YOLO OPCIONAL</span>
   </div>
   <nav className="simulator-scenarios" aria-label="Escenarios 3D">
    {SCENES.map(scene=><button key={scene.id} type="button" aria-pressed={scenarioId===scene.id}
      onClick={()=>changeScenario(scene.id)}><span aria-hidden="true">{scene.icon}</span>{scene.tab}</button>)}
   </nav>
   <div className="simulator-3d-summary" aria-label="Estado de la simulación">
     <div><span>ESCENARIO ACTIVO</span><strong>{config.name}</strong></div>
     <div><span>TIPO DE MOVIMIENTO</span><strong>Rutas múltiples</strong></div>
     <div><span>RENDERIZADO</span><strong>{renderFps||'—'} FPS <small>visuales</small></strong></div>
     <div><span>{analysisMode==='yolo'?'DETECCIONES YOLO':'OBJETOS SINTÉTICOS'}</span>
      <strong>{analysisMode==='yolo'?(yoloLatest?yoloLatest.detections.length:'—'):filterCount.toString().padStart(2,'0')}</strong></div>
     <div><span>{analysisMode==='yolo'?'MOTOR DE INFERENCIA':'ESTADO SIMULADO'}</span>
      {analysisMode==='yolo'?
       <strong className={yoloTelemetry.phase==='failed'?'sim-status-alert':'sim-status-normal'}>
        {yoloTelemetry.phase==='running'?'EN CURSO':
         yoloTelemetry.phase==='loading'?'CARGANDO':
         yoloTelemetry.phase==='failed'?'ERROR':
         yoloTelemetry.phase==='stopped'?'DETENIDO':'SIN INICIAR'}</strong>:
       <strong className={snapshot.alert?'sim-status-alert':'sim-status-normal'}>
        {paused?'PAUSADA':snapshot.alert?'EVENTO ACTIVO':'OPERATIVA'}</strong>}
     </div>
   </div>
   <div className="simulator-content">
    <div className="simulator-visual">
     <div className="simulator-visual-head">
      <div><span className="simulator-kicker">ESCENA TRIDIMENSIONAL / {config.tab.toUpperCase()}</span>
       <h3>{config.name}</h3><p>{config.description} Prueba «Primer plano» para observar a los personajes.</p></div>
      <div className="simulator-runtime">
       <span className="simulator-runtime-dot"/>{paused?'EN PAUSA':'REPRODUCIENDO'}
       <strong>{secondsText(elapsed)}</strong>
      </div>
     </div>
     <div className="simulator-render-preset" role="group" aria-label="Calidad visual del simulador">
       <span>CALIDAD DE PERSONAJES</span>
       <div>
        <button type="button" aria-pressed={graphics==='human'}
         onClick={()=>{setGraphics('human');setYoloTelemetry(INITIAL_YOLO_TELEMETRY);}}>
          Humanos animados
        </button>
        <button type="button" aria-pressed={graphics==='light'}
         onClick={()=>{setGraphics('light');setYoloTelemetry(INITIAL_YOLO_TELEMETRY);}}>
          Modo ligero
        </button>
       </div>
     </div>
     <div className="simulator-ai-select" role="group" aria-label="Origen de las detecciones">
       <div><strong>ORIGEN DE LAS DETECCIONES</strong>
        <span>{analysisMode==='yolo'?'YOLO analiza exclusivamente la escena 3D':'Datos geométricos programados'}</span></div>
       <div className="simulator-ai-switch">
        <button type="button" aria-pressed={analysisMode==='synthetic'}
         onClick={()=>{setAnalysisMode('synthetic');setYoloTelemetry(INITIAL_YOLO_TELEMETRY);}}>Simulación visual</button>
        <button type="button" aria-pressed={analysisMode==='yolo'}
         onClick={()=>{setAnalysisMode('yolo');setYoloTelemetry(INITIAL_YOLO_TELEMETRY);}}>◉ YOLO real (navegador)</button>
       </div>
     </div>
     <div className="simulator-canvas-wrap">
      {graphics==='human'?
        <HumanizedScene3D ref={sceneRef} view={view} snapshot={snapshot}
          elapsed={elapsed} paused={paused} layers={effectiveLayers}
          threshold={threshold} showScore={showScore} onFps={setRenderFps}/>:
        <IndustrialScene3D ref={sceneRef} view={view} snapshot={snapshot}
          elapsed={elapsed} paused={paused} layers={effectiveLayers}
          threshold={threshold} showScore={showScore} onFps={setRenderFps}/>
      }
      <span className="simulator-canvas-badge">INSTALACIÓN 3D · {config.tab.toUpperCase()}</span>
     </div>
     <div className="simulator-camera-toolbar" aria-label="Control de cámara tridimensional">
       <div className="simulator-view-group" role="group" aria-label="Perspectiva de cámara">
        {CAMERAS.map(camera=><button type="button" key={camera.id}
         aria-pressed={view===camera.id} onClick={()=>setView(camera.id)}>{camera.label}</button>)}
       </div>
       <div className="simulator-view-tools" role="group" aria-label="Zoom y pantalla">
        <button type="button" aria-label="Acercar cámara" onClick={()=>sceneRef.current?.zoom(-1.8)}>＋</button>
        <button type="button" aria-label="Alejar cámara" onClick={()=>sceneRef.current?.zoom(1.8)}>－</button>
        <button type="button" aria-label="Restablecer cámara" onClick={()=>sceneRef.current?.resetCamera()}>↺</button>
        <button type="button" aria-label="Mostrar pantalla completa" onClick={()=>void fullscreen()}>⛶</button>
       </div>
     </div>
     {analysisMode==='yolo'&&<YoloBrowserPanel key={scenarioId+'-'+graphics}
       getSource={getRenderedSource} scenarioName={config.name} scenarioId={scenarioId}
       paused={paused} onTelemetry={onYoloTelemetry}/>}
     {analysisMode==='synthetic'&&<div className={'simulator-event '+(snapshot.alert?'is-alert':'')} role="status">
       <span className="simulator-event-dot"/>
       <span>{snapshot.event}</span>
       <span className="simulator-event-tag">{snapshot.alert?'ALERTA SIMULADA':'SEGUIMIENTO 3D'}</span>
     </div>}
     <div className="simulator-timeline">
      <div className="simulator-timeline-meta"><span>RECORRIDO DE LA SIMULACIÓN</span>
       <span>{secondsText(elapsed)} / LÍNEA TEMPORAL LIBRE</span></div>
      <input type="range" aria-label="Mover tiempo de la simulación"
       min="0" max={Math.max(60,Math.ceil(elapsed/60)*60)} step=".2"
       value={Math.min(elapsed,Math.max(60,Math.ceil(elapsed/60)*60))}
       onChange={event=>{setElapsed(Number(event.target.value));setPaused(true);}}/>
      <div className="simulator-timeline-actions">
       <div><button type="button" onClick={restart}>↺ Reiniciar</button>
        <button type="button" className="simulator-pause" onClick={()=>setPaused(value=>!value)}>
         {paused?'▶ Reanudar':'Ⅱ Pausar'}</button></div>
       <div><button type="button" onClick={()=>void capture()}>▣ Capturar PNG</button></div>
      </div>
      {captureError&&<p className="simulator-action-error" role="alert">{captureError}</p>}
     </div>
     <div className="simulator-bottomline"><span><i/> Renderizado tridimensional y animación de personajes en navegador</span>
      <span>{analysisMode==='synthetic'?'Las cajas y alertas mostradas son sintéticas.':
       'YOLO analiza los fotogramas de la simulación, sin importar archivos.'}</span></div>
    </div>
    <aside className="simulator-controls" aria-label="Controles avanzados de simulación">
     <span className="simulator-kicker">SISTEMA DE SUPERVISIÓN</span>
     <div className="simulator-control-section">
       <span className="simulator-control-label">Estado del sistema</span>
       <strong>{paused?'Simulación pausada':'Rutas autónomas en ejecución'}</strong>
       <p>{analysisMode==='yolo'?
         'YOLO analiza imágenes capturadas del entorno 3D. Los resultados del monitor son predicciones reales del modelo.':
         'Los objetos, eventos y zonas se calculan con las reglas sintéticas de la simulación.'}</p>
       <div className="simulator-health"><span>Motor gráfico</span><b>ACTIVO</b></div>
       <div className="simulator-health"><span>Fuente</span><b>SIMULACIÓN 3D</b></div>
       <div className="simulator-health"><span>Inferencia remota</span><b>NO UTILIZADA</b></div>
     </div>
     {analysisMode==='synthetic'&&<>
     <div className="simulator-control-section">
       <div className="simulator-inline"><label htmlFor="sim-score">Umbral de etiquetas sintéticas</label>
        <b>{Math.round(threshold*100)}%</b></div>
       <input type="range" id="sim-score" min="50" max="99"
        value={Math.round(threshold*100)}
        onChange={e=>setThreshold(Number(e.target.value)/100)}/>
       <p>Solo filtra cajas y rótulos del simulador; no mide confianza real.</p>
     </div>
     <div className="simulator-control-section">
      <span className="simulator-control-label">Capas de visualización</span>
      <div className="simulator-switch-grid">
       {controls.map(({id,label})=><label className="simulator-toggle" key={id}>
        <span>{label}</span><input type="checkbox" checked={layers[id]}
         onChange={()=>toggle(id)}/></label>)}
       <label className="simulator-toggle"><span>Porcentajes de referencia</span>
        <input type="checkbox" checked={showScore}
         onChange={event=>setShowScore(event.target.checked)}/></label>
      </div>
     </div>
     </>}
     {analysisMode==='yolo'&&<div className="simulator-control-section simulator-yolo-guidance">
       <span className="simulator-control-label">Detecciones del modelo</span>
       <p>Inicia YOLO y ajusta su umbral de confianza en el panel de inferencia.
       Aquí se muestran exclusivamente las predicciones obtenidas, sin las etiquetas sintéticas.</p>
     </div>}
     <div className="simulator-control-section">
      <div className="simulator-inline"><span className="simulator-control-label">Velocidad de movimiento</span><strong>{speed}×</strong></div>
      <div className="simulator-speed" role="group" aria-label="Velocidad de simulación">
       {[.5,1,2,4].map(n=><button type="button" key={n} aria-pressed={speed===n}
        onClick={()=>setSpeed(n)}>{n}×</button>)}
      </div>
     </div>
     {analysisMode==='yolo'?
       <YoloMonitor telemetry={yoloTelemetry} scenario={scenarioId} paused={paused}/>:
       <SimulationAnalytics snapshot={snapshot} elapsed={elapsed} fps={renderFps}/>}
    </aside>
   </div>
   <div className="simulator-footnote">
    <strong>Dos flujos independientes:</strong> «Simulación visual» calcula objetos y alertas con reglas programadas.
    «YOLO real (navegador)» examina únicamente fotogramas de los cuatro escenarios 3D con una red ONNX,
    muestra detecciones sobre el fotograma analizado y no requiere fotografías, videos ni datasets. Los indicadores de la derecha
    siguen describiendo la simulación, no la precisión de YOLO. Render Free mantiene exclusivamente la API ligera.
   </div>
 </section>;
}
