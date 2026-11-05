import { useMemo } from 'react';
import type { SimSnapshot } from './simulation-engine';
import { simulationSnapshot } from './simulation-engine';

interface Props {
 readonly snapshot:SimSnapshot;
 readonly elapsed:number;
 readonly fps:number;
}
const clamp=(v:number)=>Math.min(100,Math.max(0,Math.round(v)));
const actors=(snapshot:SimSnapshot)=>snapshot.entities.filter(e=>
 e.kind==='person'||e.kind==='forklift');
export function activityIndex(snapshot:SimSnapshot):number{
 const people=actors(snapshot);
 const running=people.filter(e=>e.state==='walking'||e.state==='transporting').length;
 return clamp((running/Math.max(1,people.length))*69+(snapshot.alert?23:0)+
  Math.min(8,snapshot.count*1.5));
}
function linePath(values:readonly number[],width=320,height=91):string{
 if(!values.length)return '';
 const points=values.map((value,index)=>({
  x:index*(width/Math.max(1,values.length-1)),
  y:height-(value/100)*height
 }));
 let path='M'+points[0].x.toFixed(2)+' '+points[0].y.toFixed(2);
 for(let i=1;i<points.length;i++){
  const prev=points[i-1],p=points[i],cx=(prev.x+p.x)/2;
  path+=` C${cx.toFixed(2)} ${prev.y.toFixed(2)} ${cx.toFixed(2)} ${p.y.toFixed(2)} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
 }
 return path;
}
function RecentEvents({snapshot,elapsed}:{snapshot:SimSnapshot;elapsed:number}){
 const events=useMemo(()=>{
  const results:{second:number;event:string;alert:boolean}[]=[];
  let previous='';
  const t=Math.max(0,Math.floor(elapsed));
  for(let second=Math.max(0,t-26);second<=t;second++){
   const sample=simulationSnapshot(snapshot.scenarioId,second);
   if(sample.event!==previous){
    results.push({second,event:sample.event,alert:sample.alert});
    previous=sample.event;
   }
  }
  return results.slice(-4).reverse();
 },[snapshot.scenarioId,Math.floor(elapsed)]);
 return <div className="v2-events-list">
  {events.map(entry=><div key={entry.second+'-'+entry.event} className="v2-event-row">
   <span className={'v2-event-marker'+(entry.alert?' is-critical':'')}/>
   <div><span className="v2-event-time">T+{entry.second.toString().padStart(3,'0')} s</span>
    <p>{entry.event}</p></div>
  </div>)}
 </div>;
}
export function SimulationAnalytics({snapshot,elapsed,fps}:Props){
 const active=actors(snapshot);
 const moving=active.filter(a=>a.state==='walking'||a.state==='transporting').length;
 const index=activityIndex(snapshot);
 const recent=useMemo(()=>Array.from({length:42},(_,i)=>{
  const t=Math.max(0,Math.floor(elapsed)-(41-i)*.75);
  return activityIndex(simulationSnapshot(snapshot.scenarioId,t));
 }),[snapshot.scenarioId,Math.floor(elapsed)]);
 const curve=linePath(recent);
 const area=curve+` L320 100 L0 100 Z`;
 const subtitle= snapshot.scenarioId==='retail'?'Personas en zona':snapshot.metricLabel;
 return <div className="sim-analytics">
  <header className="sim-analytics-head">
   <div><span className="sim-analytics-eyebrow">ANALÍTICA DEL GEMELO DIGITAL</span>
    <h3>Centro de operaciones</h3></div>
   <span className="sim-analytics-synthetic">DATOS SINTÉTICOS</span>
  </header>
  <div className="sim-analytics-kpis">
   <div className="sim-kpi sim-kpi-featured">
    <span>Objetos en movimiento</span><strong>{moving}<small> / {active.length}</small></strong>
    <span className="sim-kpi-tiny">Rutas multidir.</span>
   </div>
   <div className="sim-kpi">
    <span>{subtitle}</span><strong>{snapshot.count.toString().padStart(2,'0')}</strong>
    <span className="sim-kpi-tiny">Contador simulado</span>
   </div>
   <div className={'sim-kpi'+(snapshot.alert?' sim-kpi-alert':'')}>
    <span>Estado de zonas</span><strong>{snapshot.alert?'01':'00'}</strong>
    <span className="sim-kpi-tiny">{snapshot.alert?'Evento activo':'Sin incidencias'}</span>
   </div>
  </div>
  <div className="sim-analytics-activity">
   <div className="sim-analytics-section-head"><div><h4>Actividad operacional</h4>
      <p>Índice sintético, últimos 30 s</p></div>
     <span className="sim-analytics-value">{index}<small>/100</small></span></div>
   <svg viewBox="0 0 350 132" preserveAspectRatio="none" role="img"
    aria-label={'Actividad sintética '+index+' de 100, con evolución temporal'}>
    <defs>
     <linearGradient id="sim-activity-fill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor="#36dbb5" stopOpacity=".32"/>
      <stop offset="100%" stopColor="#36dbb5" stopOpacity=".015"/>
     </linearGradient>
    </defs>
    <g transform="translate(0 9)">
     {[0,25,50,75,100].map(v=><g key={v}>
      <path d={`M0 ${100-v} H320`} stroke="#4a7180" strokeWidth=".65" strokeDasharray="3 5" opacity=".58"/>
      <text x="346" y={104-v} fontSize="10" fill="#9db8c1" textAnchor="end">{v}</text>
     </g>)}
     <path d={area} fill="url(#sim-activity-fill)" stroke="none"/>
     <path d={curve} fill="none" stroke="#53edc5" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
     <circle cx="320" cy={100-recent[recent.length-1]} r="4.2" stroke="#193b3d" strokeWidth="2" fill="#9dffdc"/>
    </g>
   </svg>
   <div className="sim-activity-axis"><span>−30 s</span><span>−15 s</span><span>Ahora</span></div>
  </div>
  <div className="sim-analytics-map">
   <div className="sim-analytics-section-head"><div><h4>Mapa operativo</h4><p>Vista superior · posiciones generadas</p></div>
    <span className="sim-map-live">● POSICIONES</span></div>
   <svg viewBox="0 0 480 260" role="img" aria-label="Minimapa sintético con actores y zonas">
    <rect x="4" y="4" width="472" height="252" rx="11" fill="#0b2836" stroke="#3b6571" strokeWidth="1.5"/>
    {Array.from({length:15},(_,i)=><path key={'v'+i} d={`M${18+i*32} 10 V250`}
      stroke="#50808b" strokeWidth=".75" opacity=".17"/>)}
    {Array.from({length:7},(_,i)=><path key={'h'+i} d={`M10 ${14+i*38} H470`}
      stroke="#50808b" strokeWidth=".75" opacity=".17"/>)}
    {snapshot.zones.map(z=><g key={z.label}>
     <rect x={z.x/2+1} y={z.y/2+1} width={z.width/2} height={z.height/2}
      rx="5" fill={snapshot.alert?'#a84a3a':'#3cc9bd'} fillOpacity=".14"
      stroke={snapshot.alert?'#ef927e':'#57dacb'} strokeDasharray="5 4" strokeWidth="1.7"/>
     <text x={z.x/2+7} y={z.y/2+15} fill={snapshot.alert?'#ffc4b4':'#a2eee0'} fontSize="9" fontWeight="700">{z.label}</text>
    </g>)}
    {active.map(a=>{
     const x=(a.x+a.width/2)/2,y=(a.y+a.height/2)/2;
     const radius=a.kind==='forklift'?8:5;
     const color=a.kind==='forklift'?'#ffca82':'#69eaca';
     return <g key={a.id}>
       <circle cx={x} cy={y} r={radius+4} fill={color} opacity=".14"/>
       <circle cx={x} cy={y} r={radius} fill={color} stroke="#0c2836" strokeWidth="2"/>
       <path d={`M${x} ${y} l${Math.sin(a.heading??0)*16} ${Math.cos(a.heading??0)*16}`}
        stroke={color} strokeWidth="2" strokeLinecap="round" opacity=".9"/>
     </g>;
    })}
    <rect x="12" y="231" width="151" height="17" rx="4" fill="#102f3e"/>
    <text x="22" y="242" fontSize="9" fill="#b7d8d7">ESCALA REFERENCIAL / 2D</text>
   </svg>
   <div className="sim-map-legend"><span><i className="sim-legend-person"/> Personas</span>
    <span><i className="sim-legend-forklift"/> Vehículos</span>
    <span><i className="sim-legend-zone"/> Zonas</span></div>
  </div>
  <div className="sim-analytics-class">
   <div className="sim-analytics-section-head"><div><h4>Objetos del escenario</h4><p>Objetos de la escena virtual</p></div></div>
   {snapshot.palette.map(p=><div className="sim-analytic-class-row" key={p.label}>
    <span className="sim-class-dot" style={{background:p.color}}/>
    <span>{p.label}</span>
    <div className="sim-class-gauge"><i style={{width:Math.round(p.score*100)+'%',background:p.color}}/></div>
    <small>{Math.round(p.score*100)}%*</small>
   </div>)}
  </div>
  <div className="sim-analytics-events">
   <div className="sim-analytics-section-head">
    <div><h4>Bitácora operacional</h4><p>Transiciones calculadas de la simulación</p></div>
    <span className="sim-analytics-eventcount">{fps||'—'} fps gráfico</span>
   </div>
   <RecentEvents snapshot={snapshot} elapsed={elapsed}/>
  </div>
  <p className="sim-analytics-note">*Valores de la escena virtual. No confirman situaciones reales de seguridad.</p>
 </div>;
}
