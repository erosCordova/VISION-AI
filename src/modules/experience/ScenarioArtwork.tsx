type Kind='safety'|'warehouse'|'quality'|'retail';
/** Vector original por escenario. Sin imágenes de stock ni assets de pago. */
export function ScenarioArtwork({kind}:{kind:Kind}){
 const grid=Array.from({length:9},(_,i)=>i*60+12);
 return <svg className={'experience-scenario-art art-'+kind}
  viewBox="0 0 560 300" preserveAspectRatio="xMidYMid slice"
  aria-hidden="true" focusable="false">
  <defs>
   <linearGradient id={'art-fill-'+kind} x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stopColor="#488eef" stopOpacity=".29"/>
    <stop offset="100%" stopColor="#7796ff" stopOpacity=".025"/>
   </linearGradient>
   <linearGradient id={'art-line-'+kind} x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stopColor="#90bdfd"/><stop offset="100%" stopColor="#8da7ff"/>
   </linearGradient>
  </defs>
  <g opacity=".16" stroke="#8eafdd" strokeWidth=".7">
   {grid.map(x=><path key={x} d={'M'+x+' 0 V300'}/>)}
   {grid.slice(0,5).map(y=><path key={y} d={'M0 '+y+' H560'}/>)}
  </g>
  <g stroke={'url(#art-line-'+kind+')'} strokeWidth="1.9"
   fill={'url(#art-fill-'+kind+')'} strokeLinejoin="round">
   {kind==='safety'&&<>
    <path d="M230 257 L230 157 L260 130 L310 130 L347 162 L347 257 Z"/>
    <path d="M229 168 L180 220 L204 238 L230 205 M346 168 L393 219 L374 240 L347 205"/>
    <path d="M262 255 L262 292 M317 255 L317 292"/>
    <circle cx="287" cy="103" r="30"/>
    <path d="M254 101 Q252 65 286 61 Q323 65 320 101 Z"/>
    <path d="M248 101 L326 101 M268 155 L285 194 L307 155"/>
    <rect x="207" y="77" width="162" height="183" rx="12"
     fill="none" strokeDasharray="6 7" opacity=".75"/>
    <path d="M115 200 L182 200 M395 200 L453 200" strokeDasharray="8 8"/>
   </>}
   {kind==='warehouse'&&<>
    <path d="M110 91 L450 91 L450 267 L110 267 Z"/>
    <path d="M140 91 L140 264 M420 91 L420 264 M108 155 L452 155 M108 219 L452 219"/>
    <path d="M167 119 L217 119 L217 149 L167 149 Z
             M238 119 L302 119 L302 149 L238 149 Z
             M321 119 L395 119 L395 149 L321 149 Z"/>
    <path d="M173 177 L239 177 L239 215 L173 215 Z
             M260 177 L311 177 L311 215 L260 215 Z
             M335 177 L404 177 L404 215 L335 215 Z"/>
    <path d="M200 253 L341 253 M236 253 L236 282 M310 253 L310 282"/>
    <circle cx="242" cy="277" r="12"/><circle cx="330" cy="277" r="12"/>
   </>}
   {kind==='quality'&&<>
    <path d="M85 233 L455 233 L495 261 L48 261 Z"/>
    <path d="M135 191 L422 191 L447 233 L112 233 Z"/>
    <path d="M181 178 L225 156 L278 181 L234 201 Z
             M234 201 L234 237 L181 212 Z M234 201 L278 181 L278 216 L234 237 Z"/>
    <path d="M290 160 L344 136 L397 163 L342 190 Z
             M342 190 L342 233 L290 204 Z M342 190 L397 163 L397 202 L342 233 Z"/>
    <path d="M144 117 L144 46 L417 46 L417 117" fill="none"/>
    <path d="M262 52 L262 105 M240 88 L262 109 L283 88"/>
    <path d="M256 185 L318 185" strokeDasharray="8 7" fill="none"/>
    <rect x="155" y="132" width="252" height="112" rx="12"
     fill="none" strokeDasharray="8 7"/>
   </>}
   {kind==='retail'&&<>
    <path d="M91 96 L468 96 L468 255 L91 255 Z"/>
    <path d="M117 152 L442 152 M117 210 L442 210 M193 95 L193 255 M359 95 L359 255"/>
    {Array.from({length:6},(_,i)=><rect key={i} x={135+(i%3)*110}
      y={118+Math.floor(i/3)*58} width="32" height="30" rx="3"/>)}
    <circle cx="273" cy="161" r="17"/>
    <path d="M246 242 L245 194 L260 183 L288 183 L301 194 L301 242 Z"/>
    <path d="M264 242 L263 274 M286 242 L287 274"/>
    <rect x="220" y="129" width="105" height="147" rx="8"
     fill="none" strokeDasharray="5 6"/>
   </>}
  </g>
  <g opacity=".65" fill="#89b9fd">
   <circle cx="92" cy="78" r="3"/><circle cx="469" cy="231" r="3"/>
   <circle cx="455" cy="54" r="2"/>
  </g>
 </svg>;
}
