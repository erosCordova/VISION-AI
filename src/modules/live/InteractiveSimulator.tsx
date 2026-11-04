import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { simulationSnapshot } from './simulation-engine';
import type { ObjectKind, ScenarioKey, SimEntity } from './simulation-engine';

const SCENES: {id:ScenarioKey; tab:string; name:string; description:string; icon:string}[]=[
  {id:'safety',tab:'Seguridad',name:'Seguridad industrial',description:'Personas, EPP y cruces por zonas restringidas',icon:'◈'},
  {id:'quality',tab:'Manufactura',name:'Control de calidad',description:'Inspección de productos en una cinta de transporte',icon:'▤'},
  {id:'retail',tab:'Retail',name:'Ocupación comercial',description:'Personas en movimiento y conteo por zonas',icon:'▦'},
  {id:'warehouse',tab:'Logística',name:'Almacén inteligente',description:'Montacargas, cajas y zonas operativas',icon:'▣'}
];
const TONES={mint:'#63edd0',amber:'#ffca72',coral:'#ff857c',blue:'#90b7ff'} as const;
const KIND_NAME:Record<ObjectKind,string>={
 person:'Persona',helmet:'Casco',vest:'Chaleco',forklift:'Montacargas',
 pallet:'Pallet',product:'Producto',defect:'Defecto',shelf:'Estante',box:'Caja'
};
type Layer='boxes'|'labels'|'masks'|'zones';

function EntityGraphic({o,segment}: {o:SimEntity;segment:boolean}){
 const w=o.width,h=o.height;
 let body;
 switch(o.kind){
  case 'person':
   body=<>
    <ellipse cx={w*.5} cy={h*.98} rx={w*.42} ry={6} fill="#050e18" opacity=".55"/>
    <path d={`M ${w*.33} ${h*.54} L ${w*.27} ${h*.88} Q ${w*.28} ${h*.93} ${w*.38} ${h*.93} L ${w*.52} ${h*.62} L ${w*.58} ${h*.93} L ${w*.72} ${h*.93} L ${w*.66} ${h*.52}`} fill="#243c52" stroke="#3a6070" strokeWidth="3" strokeLinejoin="round"/>
    <rect x={w*.19} y={h*.31} width={w*.63} height={h*.37} rx={w*.13} fill="#2f6172" stroke="#5991a0" strokeWidth="2"/>
    <path d={`M ${w*.23} ${h*.35} L ${w*.08} ${h*.64} M ${w*.77} ${h*.35} L ${w*.91} ${h*.62}`} stroke="#a6d3ca" strokeWidth={w*.11} strokeLinecap="round"/>
    <rect x={w*.23} y={h*.41} width={w*.53} height={h*.12} fill="#e4ad59" opacity=".82" rx="2"/>
    <circle cx={w*.5} cy={h*.19} r={w*.23} fill="#d6aa82" stroke="#edc3a0" strokeWidth="2"/>
    <path d={`M ${w*.31} ${h*.12} Q ${w*.5} ${h*.04} ${w*.7} ${h*.13}`} stroke="#2b414f" strokeWidth="7" fill="none" strokeLinecap="round"/>
   </>;
   break;
  case 'helmet':
   body=<><path d={`M 3 ${h*.75} Q 3 1 ${w*.5} 1 Q ${w-3} 1 ${w-3} ${h*.75} Z`} fill="#f7c655" stroke="#ffeaa2" strokeWidth="2"/>
    <rect x="1" y={h*.69} width={w-2} height={h*.18} rx="3" fill="#f2af40"/><path d={`M ${w*.5} 2 V ${h*.65}`} stroke="#cc8d3c" strokeWidth="2"/></>;
   break;
  case 'vest':
   body=<><path d={`M 7 0 L ${w*.35} ${h*.13} L ${w*.65} ${h*.13} L ${w-7} 0 L ${w} ${h*.85} L 0 ${h*.85} Z`}
     fill="#1bbaa7" opacity=".86" stroke="#94f6db" strokeWidth="2"/><path d={`M 9 ${h*.32} H ${w-9} M ${w*.5} ${h*.13} V ${h*.84}`} stroke="#f0f6c6" strokeWidth="3" opacity=".87"/></>;
   break;
  case 'forklift':
   body=<><ellipse cx={w*.49} cy={h*.93} rx={w*.48} ry="6" fill="#030b12" opacity=".55"/>
    <rect x={w*.1} y={h*.48} width={w*.72} height={h*.26} rx="10" fill="#ebb456" stroke="#ffe1a1" strokeWidth="3"/>
    <path d={`M ${w*.3} ${h*.49} L ${w*.37} ${h*.09} H ${w*.7} L ${w*.78} ${h*.49}`} fill="#203d4b" stroke="#c1d7ce" strokeWidth="5" strokeLinejoin="round"/>
    <path d={`M ${w*.43} ${h*.14} V ${h*.47} M ${w*.18} ${h*.4} H ${w*.7}`} stroke="#f3c778" strokeWidth="4"/>
    <rect x={w*.87} y={h*.08} width={w*.045} height={h*.73} fill="#a1b1b8"/>
    <rect x={w*.87} y={h*.74} width={w*.13} height="5" fill="#aec9d2"/>
    <circle cx={w*.26} cy={h*.78} r={h*.135} fill="#101e29" stroke="#d7e1d3" strokeWidth="4"/>
    <circle cx={w*.7} cy={h*.78} r={h*.135} fill="#101e29" stroke="#d7e1d3" strokeWidth="4"/></>;
   break;
  case 'pallet':
   body=<><rect x="3" y={h*.28} width={w-6} height={h*.48} fill="#a97d51" rx="3" stroke="#dab98c" strokeWidth="3"/>
   {[.28,.51,.74].map(p=><path key={p} d={`M ${w*p} ${h*.29} V ${h*.73}`} stroke="#503d2d" strokeWidth="3"/>)}
   <rect x="1" y={h*.74} width={w-2} height={h*.14} rx="2" fill="#d3aa70"/></>;
   break;
  case 'box':
  case 'product':
   body=<><rect x="2" y="3" width={w-4} height={h-6} rx={o.kind==='product'?12:4} fill={o.kind==='product'?'#567c87':'#987550'} stroke={o.kind==='product'?'#c7f6df':'#e9bf86'} strokeWidth="3"/>
    <path d={`M ${w*.5} 4 V ${h-3} M 3 ${h*.25} H ${w-3}`} stroke="#d8e9cd" strokeWidth="3" opacity=".42"/>
    {o.kind==='product'&&<rect x={w*.25} y={h*.33} width={w*.5} height={h*.35} rx="5" fill="#253c48" stroke="#a5d7bf" strokeWidth="2"/>}</>;
   break;
  case 'defect':
   body=<><path d={`M 4 ${h*.2} L ${w*.3} ${h*.46} L ${w*.24} ${h*.9} L ${w*.56} ${h*.54} L ${w*.8} ${h*.86} L ${w*.94} ${h*.18}`} fill="none" stroke="#ff665e" strokeWidth="5" strokeLinecap="round"/><circle cx={w*.55} cy={h*.5} r="5" fill="#ffb5a7" opacity=".65"/></>;
   break;
  default:
   body=<rect x="2" y="2" width={w-4} height={h-4} fill="#63877f" rx="6"/>;
 }
 return <g transform={`translate(${o.x},${o.y})`}>
   {body}
   {segment&&<rect x="0" y="0" width={w} height={h} rx={o.kind==='person'?24:8} fill={TONES[o.tone]} opacity=".17"/>}
  </g>;
}
function Evidence({o,showLabels,showScore}:{o:SimEntity;showLabels:boolean;showScore:boolean}){
 const color=TONES[o.tone];
 const label=KIND_NAME[o.kind]+(showScore?' · '+Math.round(o.score*100)+'%':'');
 const width=Math.max(o.width,Math.min(180,label.length*6.4+15));
 const top=Math.max(4,o.y-24);
 return <g pointerEvents="none">
  <rect x={o.x} y={o.y} width={o.width} height={o.height} rx="3" stroke={color} strokeWidth="2" strokeDasharray={o.kind==='defect'?'5 3':undefined} fill="none"/>
  <path d={`M ${o.x} ${o.y+11} V ${o.y} H ${o.x+11} M ${o.x+o.width-11} ${o.y} H ${o.x+o.width} V ${o.y+11}`} stroke={color} strokeWidth="4" fill="none"/>
  {showLabels&&<g><rect x={Math.min(954-width,Math.max(2,o.x))} y={top} width={width} height="21" rx="4" fill={color}/>
   <text x={Math.min(954-width,Math.max(2,o.x))+7} y={top+14} fontSize="11" fontWeight="700" fill="#101b27">{label}</text></g>}
 </g>;
}
function SceneBackground({scenarioId}:{scenarioId:ScenarioKey}){
 return <>
  <defs>
   <linearGradient id="sim-wall" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#14232f"/><stop offset="1" stopColor="#213745"/></linearGradient>
   <linearGradient id="sim-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#263a45"/><stop offset="1" stopColor="#111f2a"/></linearGradient>
   <pattern id="floor-grid" patternUnits="userSpaceOnUse" width="55" height="55"><path d="M 55 0 L 0 0 0 55" fill="none" stroke="#719299" strokeOpacity=".13" strokeWidth="1"/></pattern>
  </defs>
  <rect width="960" height="520" fill="url(#sim-wall)"/>
  <rect x="0" y="90" width="960" height="430" fill="url(#sim-floor)"/>
  <rect x="0" y="90" width="960" height="430" fill="url(#floor-grid)"/>
  <path d="M0 85 H960" stroke="#537b82" strokeWidth="4" opacity=".45"/>
  {[90,320,555,790].map(x=><g key={x} opacity=".65"><rect x={x} y="30" width="112" height="8" rx="4" fill="#a2c7bd"/><path d={`M ${x+10} 38 L ${x-30} 140 H ${x+130} L ${x+102} 38`} fill="#a2ffe9" opacity=".035"/></g>)}
  {scenarioId==='safety'&&<>
   <path d="M 0 415 H960" stroke="#dfb866" strokeWidth="3" strokeDasharray="32 22" opacity=".55"/>
   <path d="M 0 438 H960" stroke="#dcbf88" strokeWidth="2" opacity=".3"/>
   <g stroke="#516976" strokeWidth="4">{[0,1,2,3,4,5,6].map(i=><path key={i} d={`M ${i*160+20} 120 L ${i*160+42} 178`}/>)}</g>
   <g opacity=".34"><rect x="26" y="152" width="135" height="85" rx="9" fill="#315364" stroke="#77979a"/><path d="M47 170 H144 M47 189 H116 M47 208 H137" stroke="#94b2ac" strokeWidth="4"/></g>
  </>}
  {scenarioId==='warehouse'&&<>
   {[35,770].map(x=><g key={x}><rect x={x} y="132" width="156" height="205" rx="5" fill="#30454d" stroke="#748f96" strokeWidth="5"/>
     {[185,246,306].map(y=><path key={y} d={`M ${x+5} ${y} H ${x+151}`} stroke="#a8bd9a" strokeWidth="5"/>)}
     {[0,1,2].map(i=><rect key={i} x={x+15+i*44} y="152" width="35" height="32" rx="3" fill="#886c53" stroke="#d3b48a" strokeWidth="2"/>)}</g>)}
   <path d="M 0 420 H960" stroke="#d5ad62" strokeWidth="4" strokeDasharray="30 24" opacity=".7"/>
  </>}
  {scenarioId==='quality'&&<>
   <path d="M0 257 H960" stroke="#455e67" strokeWidth="120"/>
   <rect x="0" y="264" width="960" height="111" rx="7" fill="#243946" stroke="#8aa5a8" strokeWidth="4"/>
   {[0,1,2,3,4,5,6,7,8,9,10,11].map(i=><circle key={i} cx={i*88+18} cy="323" r="24" fill="#315465" stroke="#4e7884" strokeWidth="4"/>)}
   <path d="M0 387 H960" stroke="#1b2c36" strokeWidth="19"/>
   <rect x="357" y="117" width="316" height="58" rx="7" fill="#1f3e4a" stroke="#7baca4" strokeWidth="4"/>
   <circle cx="515" cy="146" r="15" fill="#86ebd3" opacity=".78"/>
   <path d="M515 176 V220" stroke="#81aaa3" strokeWidth="7"/>
  </>}
  {scenarioId==='retail'&&<>
   {[30,775].map(x=><g key={x}>
    <rect x={x} y="155" width="158" height="200" rx="6" fill="#294654" stroke="#7da3a9" strokeWidth="4"/>
    {[197,266,336].map(y=><path key={y} d={`M ${x+8} ${y} H ${x+150}`} stroke="#b4d5c6" strokeWidth="6"/>)}
    {[0,1,2].map(i=><g key={i}><rect x={x+18+i*41} y="170" width="25" height="25" rx="3" fill={i===1?'#dba768':'#68a9ac'}/><rect x={x+18+i*41} y="235" width="25" height="28" rx="3" fill="#a8ba91"/></g>)}
   </g>)}
   <path d="M0 436 H960" stroke="#95b0a4" strokeWidth="2" strokeDasharray="14 8" opacity=".35"/>
  </>}
  <rect x="15" y="14" width="178" height="32" rx="6" fill="#0a1923" opacity=".8"/>
  <circle cx="33" cy="30" r="4" fill="#5de5c8"/>
  <text x="45" y="34" fontSize="12" fontWeight="700" fill="#bfd9d5">ESCENA DIGITAL · 2D</text>
  <g opacity=".42"><path d="M921 16 H944 V39 M921 504 H944 V481" stroke="#b2d3c7" strokeWidth="2" fill="none"/></g>
 </>;
}

export function InteractiveSimulator({scenarioId,onScenarioChange}:{
 scenarioId:ScenarioKey;onScenarioChange:(id:ScenarioKey)=>void;
}){
 const [elapsed,setElapsed]=useState(0);
 const [paused,setPaused]=useState(false);
 const [speed,setSpeed]=useState(1);
 const [scoreThreshold,setScoreThreshold]=useState(.7);
 const [layers,setLayers]=useState<Record<Layer,boolean>>({boxes:true,labels:true,masks:false,zones:true});
 const [showScore,setShowScore]=useState(true);
 const [hz,setHz]=useState(0);
 const svgRef=useRef<SVGSVGElement>(null);
 const frameRef=useRef({previous:0,started:0,count:0});
 const [captureError,setCaptureError]=useState('');
 const config=SCENES.find(s=>s.id===scenarioId)??SCENES[0];

 useEffect(()=>{
   if(paused){setHz(0);return;}
   frameRef.current={previous:performance.now(),started:performance.now(),count:0};
   const id=window.setInterval(()=>{
     const current=performance.now();
     const frame=frameRef.current;
     const elapsedReal=Math.min(250,current-frame.previous);
     frame.previous=current;
     setElapsed(value=>value+elapsedReal*speed/1000);
     frame.count+=1;
     if(current-frame.started>=950){
       setHz(Math.round(frame.count*1000/(current-frame.started)));
       frame.started=current;frame.count=0;
     }
   },100);
   return ()=>window.clearInterval(id);
 },[paused,speed]);
 const snapshot=useMemo(()=>simulationSnapshot(scenarioId,elapsed),[scenarioId,elapsed]);
 const visible=snapshot.entities.filter(o=>o.score>=scoreThreshold);
 const indicator=paused?'PAUSADO':'EN MOVIMIENTO';
 const trend=useMemo(()=>Array.from({length:36},(_,i)=>{
   const t=Math.max(0,elapsed-(35-i)*.5);
   return simulationSnapshot(scenarioId,t).count;
 }),[scenarioId,elapsed]);
 const max=Math.max(3,...trend);

 function select(id:ScenarioKey){onScenarioChange(id);setElapsed(0);setPaused(false);setCaptureError('');}
 function toggle(layer:Layer){setLayers(old=>({...old,[layer]:!old[layer]}));}
 async function capture(){
   const svg=svgRef.current;
   if(!svg)return;
   try{
     const markup=new XMLSerializer().serializeToString(svg);
     const source=URL.createObjectURL(new Blob([markup],{type:'image/svg+xml;charset=utf-8'}));
     const image=new Image();
     try{
       await new Promise<void>((resolve,reject)=>{
         image.onload=()=>resolve();image.onerror=()=>reject(new Error('No se pudo generar la captura.'));
         image.src=source;
       });
       const canvas=document.createElement('canvas');
       canvas.width=960;canvas.height=520;
       const context=canvas.getContext('2d');
       if(!context)throw new Error('No se pudo preparar la captura.');
       context.drawImage(image,0,0);
       const file=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/png'));
       if(!file)throw new Error('No se pudo guardar la imagen.');
       const downloadUrl=URL.createObjectURL(file);
       const a=document.createElement('a');
       a.href=downloadUrl;
       a.download=`vision-ai-${scenarioId}-simulacion.png`;
       document.body.appendChild(a);
       a.click();a.remove();
       window.setTimeout(()=>URL.revokeObjectURL(downloadUrl),1000);
       setCaptureError('');
     } finally{ URL.revokeObjectURL(source); }
   }catch(e){setCaptureError(e instanceof Error?e.message:'No se pudo capturar la escena.');}
 }
 function displayLayer(layer:Layer){return layers[layer];}
 return <section className="simulator-shell" aria-label="Simulador visual interactivo 2D">
   <div className="simulator-topline">
     <div><span className="simulator-overline">VISION-AI / LABORATORIO VISUAL</span><h2>Simulador en tiempo real</h2>
     <p>Escenas animadas con objetos, zonas de vigilancia y anotaciones dinámicas.</p></div>
     <span className="simulator-mode"><span className="simulator-signal"/> SIMULACIÓN SINTÉTICA · SIN YOLO</span>
   </div>
   <nav className="simulator-scenarios" aria-label="Escenarios simulados">
     {SCENES.map(s=><button key={s.id} type="button" aria-pressed={scenarioId===s.id}
       onClick={()=>select(s.id)}><span aria-hidden="true">{s.icon}</span>{s.tab}</button>)}
   </nav>
   <div className="simulator-content">
    <div className="simulator-visual">
      <div className="simulator-visual-head"><div>
        <span className="simulator-kicker">ESCENARIO / {config.tab.toUpperCase()}</span>
        <h3>{config.name}</h3><p>{config.description}</p></div>
        <span className="simulator-fps">{hz===0?'—':hz} Hz <small>animación</small></span>
      </div>
      <div className="simulator-canvas-wrap">
        <svg xmlns="http://www.w3.org/2000/svg" ref={svgRef} viewBox="0 0 960 520" preserveAspectRatio="xMidYMid meet"
          role="img" aria-label={`Escena 2D animada de ${config.name}. ${snapshot.event}`}
          className="simulator-svg">
          <SceneBackground scenarioId={scenarioId}/>
          {layers.zones&&snapshot.zones.map(z=><g key={z.label}>
           <rect x={z.x} y={z.y} width={z.width} height={z.height} rx="7"
             fill={snapshot.alert?'#ff857c':'#80d9e1'} fillOpacity={snapshot.alert?.08:.04}
             stroke={snapshot.alert?'#ff9c8a':'#8fcecc'} strokeWidth="2.5" strokeDasharray="10 8"/>
           <rect x={z.x+8} y={z.y-14} width={Math.max(146,z.label.length*8.1)} height="24" rx="4" fill={snapshot.alert?'#613c38':'#26484b'}/>
           <text x={z.x+16} y={z.y+2} fontSize="13" letterSpacing="1.1" fontWeight="700" fill={snapshot.alert?'#ffd0bb':'#a9f2e1'}>{z.label}</text>
          </g>)}
          {snapshot.entities.map(o=><EntityGraphic key={o.id} o={o} segment={layers.masks&&o.score>=scoreThreshold}/>)}
          {layers.boxes&&visible.map(o=><Evidence key={o.id} o={o} showLabels={displayLayer('labels')} showScore={showScore}/>)}
          <rect x="16" y="478" width="300" height="29" rx="5" fill="#0b1821" fillOpacity=".88"/>
          <circle cx="31" cy="492" r="5" fill={paused?'#ffca72':'#55e6c7'}/>
          <text x="44" y="497" fontSize="12" fill="#d7ece6" fontWeight="700">{indicator} · t={elapsed.toFixed(1)} s</text>
          <rect x="730" y="478" width="215" height="29" rx="5" fill="#0b1821" fillOpacity=".9"/>
          <text x="745" y="497" fontSize="11" fill="#f5cb77">DATOS CREADOS POR SIMULADOR</text>
        </svg>
        <span className="simulator-canvas-badge">ESCENA INTERACTIVA</span>
      </div>
      <div className={'simulator-event '+(snapshot.alert?'is-alert':'')} aria-live="off">
        <span className="simulator-event-dot"/>
        <span>{snapshot.event}</span>
        <span className="simulator-event-tag">{snapshot.alert?'EVENTO SINTÉTICO':'OBSERVANDO'}</span>
      </div>
      <div className="simulator-bottomline">
        <span><i/> Motor gráfico · secuencia determinista</span>
        <span>Las cajas siguen los objetos dibujados; no son predicciones de IA.</span>
      </div>
    </div>
    <aside className="simulator-controls" aria-label="Panel de control de la simulación">
      <span className="simulator-kicker">PANEL DE CONTROL</span>
      <div className="simulator-control-section">
        <span className="simulator-control-label">Motor utilizado</span>
        <strong>Animación 2D / reglas sintéticas</strong>
        <p>No se está ejecutando YOLO ni un detector entrenado en este modo.</p>
      </div>
      <div className="simulator-control-section">
        <div className="simulator-inline"><label htmlFor="sim-score">Umbral de puntuación sintética</label><b>{Math.round(scoreThreshold*100)}%</b></div>
        <input id="sim-score" type="range" min="50" max="99" value={Math.round(scoreThreshold*100)}
          onChange={e=>setScoreThreshold(Number(e.target.value)/100)}/>
        <p>Filtra las anotaciones visuales; no modifica una precisión real.</p>
      </div>
      <div className="simulator-control-section">
        <span className="simulator-control-label">Capas visibles</span>
        <div className="simulator-switch-grid">
          {([['boxes','Detecciones'],['labels','Etiquetas'],['masks','Segmentación'],['zones','Zonas']] as const).map(([layer,label])=>
          <label key={layer} className="simulator-toggle">
            <span>{label}</span><input type="checkbox" checked={layers[layer]} onChange={()=>toggle(layer)}/>
          </label>)}
          <label className="simulator-toggle"><span>Porcentajes</span>
            <input type="checkbox" checked={showScore} onChange={e=>setShowScore(e.target.checked)}/></label>
        </div>
      </div>
      <div className="simulator-control-section">
        <div className="simulator-inline"><span className="simulator-control-label">Velocidad</span><strong>{speed}×</strong></div>
        <div className="simulator-speed" role="group" aria-label="Velocidad de animación">
          {[.5,1,2].map(n=><button key={n} type="button" aria-pressed={speed===n} onClick={()=>setSpeed(n)}>{n}×</button>)}
        </div>
        <div className="simulator-actions">
          <button type="button" className="simulator-pause" onClick={()=>setPaused(!paused)}>{paused?'▶ Reanudar':'Ⅱ Pausar'}</button>
          <button type="button" onClick={()=>void capture()}>▣ Capturar PNG</button>
        </div>
        {captureError&&<p role="alert">{captureError}</p>}
      </div>
      <div className="simulator-control-section">
        <span className="simulator-control-label">Visualizaciones por clase (sintéticas)</span>
        {snapshot.palette.map(p=><div key={p.label} className="simulator-class-bar">
          <div><span>{p.label}</span><small>{Math.round(p.score*100)}% ref.</small></div>
          <div className="simulator-track"><div style={{width:Math.round(p.score*100)+'%',background:p.color} as CSSProperties}/></div>
        </div>)}
      </div>
      <div className="simulator-control-section simulator-trend">
        <div className="simulator-inline"><span className="simulator-control-label">{snapshot.metricLabel}</span><strong>{snapshot.count}</strong></div>
        <svg viewBox="0 0 310 55" preserveAspectRatio="none" role="img" aria-label="Historial sintético de conteo">
          {[18,35,52].map(y=><path key={y} d={`M0 ${y} H310`} stroke="#43605d" strokeOpacity=".55" strokeDasharray="3 5"/>)}
          <polyline fill="none" stroke="#61e6bd" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round"
            points={trend.map((n,i)=>`${i*(310/(trend.length-1))},${49-(n/max)*39}`).join(' ')}/>
        </svg>
        <small>Historial generado por la escena; no métricas de YOLO.</small>
      </div>
    </aside>
   </div>
   <div className="simulator-footnote">
     <strong>Dos modalidades distintas:</strong> este simulador es una demostración interactiva de escenas y reglas.
     Para recibir detecciones de YOLO auténticas selecciona «Video con YOLO» o «Cámara con YOLO» y conecta un motor disponible.
   </div>
 </section>;
}
