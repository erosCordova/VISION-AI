/**
 * QA responsive real en Chromium, sin dependencias de pruebas adicionales.
 * Usa CDP para verificar overflow y capturar vistas en 360/768/1440.
 * No inicia la cámara ni envía imágenes.
 */
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'vision-qa-chrome-'));
const artifacts = path.resolve('qa-artifacts');
fs.mkdirSync(artifacts, { recursive: true });

function findBrowser() {
  if (process.env.CHROME_BIN) return process.env.CHROME_BIN;
  for (const name of ['google-chrome', 'chromium', 'chromium-browser']) {
    const found = spawnSync('which', [name], { encoding: 'utf8' });
    if (found.status === 0) return found.stdout.trim();
  }
  throw Error('Chromium no está instalado');
}
function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode !== 200) reject(Error('HTTP ' + res.statusCode));
        else { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } }
      });
    }).on('error', reject);
  });
}
function getStatus(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => { res.resume(); resolve(res.statusCode); }).on('error', reject);
  });
}
async function eventually(callback, description, retries = 240) {
  for (let i = 0; i < retries; i++) {
    try { const value = await callback(); if (value) return value; }
    catch { /* carga en curso */ }
    await sleep(150);
  }
  throw Error('No se pudo verificar: ' + description);
}
function client(webSocketUrl) {
  const socket = new WebSocket(webSocketUrl);
  const pending = new Map();
  let next = 0;
  socket.addEventListener('message', event => {
    const packet = JSON.parse(event.data);
    if (!packet.id) return;
    const callback = pending.get(packet.id);
    if (callback) { pending.delete(packet.id); callback(packet); }
  });
  return {
    async open() {
      if (socket.readyState === WebSocket.OPEN) return;
      await new Promise((resolve, reject) => {
        socket.addEventListener('open', resolve, { once: true });
        socket.addEventListener('error', reject, { once: true });
      });
    },
    async send(method, params = {}) {
      const id = ++next;
      const promise = new Promise(resolve => pending.set(id, resolve));
      socket.send(JSON.stringify({ id, method, params }));
      const result = await promise;
      if (result.error) throw Error(method + ': ' + result.error.message);
      return result.result;
    },
    close() { socket.close(); }
  };
}
const server = spawn(process.execPath,
  ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4173', '--strictPort'],
  { stdio: 'ignore' });
let chrome;
let cdp;
try {
  await eventually(async () => await getStatus('http://127.0.0.1:4173/') === 200, 'servidor de preview');
  chrome = spawn(findBrowser(), ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
    '--hide-scrollbars', '--disable-extensions', '--disable-background-networking', '--remote-debugging-port=0', '--no-first-run', '--no-default-browser-check',
    '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
  const port = await eventually(() => {
    const f = path.join(profile, 'DevToolsActivePort');
    return fs.existsSync(f) ? Number(fs.readFileSync(f, 'utf8').split('\n')[0]) : null;
  }, 'puerto remoto de Chromium');
  const targets = await eventually(async () => {
    const targets = await getJson('http://127.0.0.1:' + port + '/json/list');
    return targets.find(target => target.type === 'page' && target.webSocketDebuggerUrl) ? targets : null;
  }, 'página de Chromium');
  cdp = client(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await cdp.open();
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  let checked = 0;
  for (const width of [360, 768, 1440]) {
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width, height: 850, deviceScaleFactor: 1, mobile: width === 360
    });
    for (const [name, hash, selector] of [
      ['resumen', '#Resumen', '.scenario-grid'],
      ['analisis', '#An%C3%A1lisis%20en%20vivo', '.simulator-shell'],
      ['historial', '#Historial', '.history-panel']
    ]) {
      await cdp.send('Page.navigate', { url: 'http://127.0.0.1:4173/' + hash });
      const view = await eventually(async () => {
        const expression = '(() => { '
          + 'const element = document.querySelector(' + JSON.stringify(selector) + '); '
          + 'if (!element || document.readyState !== "complete") return null; '
          + 'const viewport = window.innerWidth; '
          + 'const pageWidth = document.documentElement.scrollWidth; '
          + 'const bounds = element.getBoundingClientRect(); '
          + 'return { viewport, pageWidth, elementWidth: bounds.width, elementLeft: bounds.left, '
          + 'hasFocusableMain: !!document.querySelector("main[tabindex=\\\"-1\\\"]"), '
          + 'hasSkip: !!document.querySelector("a.skip"), hasText: !!element.textContent.trim(), '
          + 'hasSimulationOnly: !!document.querySelector(".simulation-only-notice"),  noExternalSources: !document.querySelector(".simulation-source-tabs") && !document.querySelector(".browser-yolo-upload") && !document.querySelector(".ppe-evaluation"), '
          + 'hasYoloModeSwitch: Array.from(document.querySelectorAll(".simulator-ai-switch button")).some(b=>b.textContent.includes("YOLO real")), '
          + 'hasSimulatorStage: !!document.querySelector(".simulator-3d-stage canvas"), '
          + 'hasSimulatorControls: !!document.querySelector(".simulator-controls input[type=range]"), '
          + 'hasCameraPresets: document.querySelectorAll(".simulator-view-group button").length === 4, '
          + 'hasHumanMode: !!document.querySelector(".simulator-render-preset button[aria-pressed=true]"), '
          + 'hasHumanCanvas: !!document.querySelector(".simulator-human-stage canvas"), '
          + 'hasSyntheticDisclosure: !!document.querySelector(".simulator-footnote"), '
          + 'hasSyntheticLabel: !!document.querySelector(".simulator-mode"), '
          + 'hasScenarioTabs: document.querySelectorAll(".simulator-scenarios button").length === 4, '
          + 'hasAnalytics: !!document.querySelector(".sim-analytics"), '
          + 'hasActivityChart: !!document.querySelector(".sim-analytics-activity svg"), '
          + 'hasMiniMap: !!document.querySelector(".sim-analytics-map svg"), '
          + 'hasKPIs: document.querySelectorAll(".sim-analytics-kpis .sim-kpi").length === 3, '
          + 'hasNoMonitorBeforeYolo: !document.querySelector(".yolo-monitor") }; '
          + '})()';
        const response = await cdp.send('Runtime.evaluate', { expression, returnByValue: true });
        return response.result?.value ?? null;
      }, name + ' ' + width);
      if (view.viewport !== width || view.pageWidth > width + 1
          || view.elementLeft < -1 || view.elementLeft + view.elementWidth > width + 1
          || !view.hasFocusableMain || !view.hasSkip || !view.hasText
          || (name === 'analisis' && (!view.hasSimulationOnly || !view.noExternalSources || !view.hasYoloModeSwitch || !view.hasSimulatorStage || !view.hasSimulatorControls || !view.hasCameraPresets || !view.hasHumanMode || !view.hasHumanCanvas || !view.hasSyntheticDisclosure || !view.hasSyntheticLabel || !view.hasScenarioTabs || !view.hasAnalytics || !view.hasActivityChart || !view.hasMiniMap || !view.hasKPIs || !view.hasNoMonitorBeforeYolo))) {
        throw Error('QA falló (' + width + ' px, ' + name + '): ' + JSON.stringify(view));
      }
      const capture = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      fs.writeFileSync(path.join(artifacts, name + '-' + width + '.png'), Buffer.from(capture.data, 'base64'));
      if (name === 'analisis') {
        await cdp.send('Runtime.evaluate', {
          expression: 'document.querySelector(".simulator-human-stage")?.scrollIntoView({block:"center"})'
        });
        await sleep(2200);
        const diagnostic = await cdp.send('Runtime.evaluate', {
          expression: '(() => { const stage=document.querySelector(".simulator-human-stage");'
            + ' const c=stage?.querySelector("canvas");'
            + ' const gl=c?.getContext("webgl2");'
            + ' return { webgl:!!gl,'
            + ' title:document.querySelector(".simulator-human-status")?.textContent||"",'
            + ' exception:!!stage?.querySelector("[role=alert]") };})()',
          returnByValue: true
        });
        const modelStatus = diagnostic.result?.value;
        if (!modelStatus?.webgl || modelStatus?.exception) {
          throw Error('Escena humana WebGL no disponible (' + width + '): ' + JSON.stringify(modelStatus));
        }
        const modelScreenshot = await cdp.send('Page.captureScreenshot', {
          format: 'png', captureBeyondViewport: false
        });
        fs.writeFileSync(path.join(artifacts, 'escena3d-' + width + '.png'),
          Buffer.from(modelScreenshot.data, 'base64'));
        console.log('Escena 3D OK a ' + width + ' px: ' + JSON.stringify(modelStatus));
        if (width === 1440) {
          await cdp.send('Runtime.evaluate', {
            expression: 'Array.from(document.querySelectorAll(".simulator-view-group button"))'
              + '.find(button => button.textContent.includes("Primer plano"))?.click()'
          });
          await sleep(700);
          const closeUp = await cdp.send('Page.captureScreenshot', {
            format: 'png', captureBeyondViewport: false
          });
          fs.writeFileSync(path.join(artifacts, 'personaje-primer-plano.png'),
            Buffer.from(closeUp.data, 'base64'));
          console.log('Primer plano del personaje capturado correctamente');
        }
      }
      if (name === 'resumen' && width === 1440) {
        // UI02: la navegación por teclado permite saltar al contenido.
        await cdp.send('Runtime.evaluate',{
          expression:'document.querySelector("a.skip")?.focus()'
        });
        await cdp.send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',
          windowsVirtualKeyCode:13});
        await cdp.send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',
          windowsVirtualKeyCode:13});
        const focused=await cdp.send('Runtime.evaluate',{
          expression:'document.activeElement?.id === "contenido"',returnByValue:true
        });
        if(focused.result?.value!==true)
          throw Error('UI02: enlace de salto no funciona al pulsar Enter con teclado.');
        // UI04: accesibilidad con movimiento reducido sin perder el contenido.
        await cdp.send('Emulation.setEmulatedMedia',{
          features:[{name:'prefers-reduced-motion',value:'reduce'}]
        });
        const reduced=await cdp.send('Runtime.evaluate',{
          expression:'({ enabled:matchMedia("(prefers-reduced-motion: reduce)").matches,'
            + ' transition:getComputedStyle(document.querySelector(".scenario-card")).transitionDuration,'
            + ' cards:document.querySelectorAll(".scenario-card").length })',
          returnByValue:true
        });
        if(!reduced.result?.value?.enabled||reduced.result.value.cards!==4||
          reduced.result.value.transition!=='0s')
          throw Error('UI04: el modo de movimiento reducido no conserva los controles: '+
            JSON.stringify(reduced.result?.value));
        await cdp.send('Emulation.setEmulatedMedia',{features:[]});
        console.log('UI02/UI04 OK: navegación por teclado y movimiento reducido');
        // UI01: rutas directas, títulos y estados iniciales comprobados en el navegador.
        for(const [hash,title] of [
          ['#Resumen','Una visión clara de tu operación'],
          ['#Visi%C3%B3n%20IA','Visión IA'],
          ['#Operaciones','Operaciones'],
          ['#Historial','Historial'],
          ['#Configuraci%C3%B3n','Configuración'],
          ['#Administraci%C3%B3n','Administración']
        ]){
          await cdp.send('Page.navigate',{url:'http://127.0.0.1:4173/'+hash});
          await eventually(async()=>{
            const r=await cdp.send('Runtime.evaluate',{
              expression:'document.querySelector("main h1")?.textContent',
              returnByValue:true
            });
            return r.result?.value===title;
          },'UI01 '+title);
        }
        await cdp.send('Page.navigate',{url:'http://127.0.0.1:4173/#Resumen'});
        console.log('UI01 OK: seis rutas comprobadas; Análisis en vivo se verifica en los recorridos');
      }
      if (name === 'analisis' && width === 1440) {
        // DA01: guardar una sesión 3D, navegar y recargar; debe persistir.
        const saved=await cdp.send('Runtime.evaluate',{
          expression:'(() => {const btn=Array.from(document.querySelectorAll(".simulator-persist-actions button"))'
           + '.find(x=>x.textContent.includes("Guardar sesión"));btn?.click();return !!btn;})()',
          returnByValue:true
        });
        if(!saved.result?.value)throw Error('DA01: falta control Guardar sesión');
        await eventually(async()=>{
          const r=await cdp.send('Runtime.evaluate',{
            expression:'document.querySelector(".simulator-save-message")?.textContent||""',
            returnByValue:true
          });
          return r.result?.value?.includes('Sesión guardada');
        },'DA01 confirmación de guardado IndexedDB');
        await cdp.send('Page.navigate',{url:'http://127.0.0.1:4173/#Historial'});
        await eventually(async()=>{
          const r=await cdp.send('Runtime.evaluate',{
            expression:'({ rows:document.querySelectorAll(".history-panel tbody tr").length,'
             + ' text:document.querySelector(".history-panel tbody")?.textContent||"" })',
            returnByValue:true
          });
          return r.result?.value?.text.includes('Seguridad industrial');
        },'DA01 historial después de navegar');
        await cdp.send('Page.reload',{ignoreCache:true});
        await eventually(async()=>{
          const r=await cdp.send('Runtime.evaluate',{
            expression:'document.querySelector(".history-panel tbody")?.textContent||""',
            returnByValue:true
          });
          return r.result?.value?.includes('Seguridad industrial');
        },'DA01 IndexedDB después de recarga completa');
        console.log('DA01 OK: simulación guardada, consultada y recuperada tras recarga del navegador');
        // Fase 8: el dashboard debe calcular SOLO la sesión recién persistida.
        await cdp.send('Page.navigate',{url:'http://127.0.0.1:4173/#Resumen'});
        await eventually(async()=>{
          const r=await cdp.send('Runtime.evaluate',{
           expression:'(() => ({'
            + ' values:Array.from(document.querySelectorAll(".saved-dashboard-metrics strong")).map(e=>e.textContent?.trim()),'
            + ' filters:document.querySelectorAll(".saved-dashboard-filters select").length'
            + ' }))()',
           returnByValue:true
          });
          const m=r.result?.value;
          return m?.values?.[0]==='1' && m.values[1]==='0' &&
           m.values[2]==='0' && m.values[3]==='—' && m.filters===3;
        },'Fase 8 dashboard sin datos de inferencia inventados');
        const sourceTrace=await cdp.send('Runtime.evaluate',{
          expression:'({days:document.querySelectorAll(".saved-dashboard-day").length,'
           + ' recent:document.querySelectorAll(".saved-dashboard-recent-row").length,'
           + ' hasOperationLink:!!document.querySelector(".saved-dashboard-recent-title button")})',
          returnByValue:true
        });
        if(sourceTrace.result?.value?.days!==1||
          sourceTrace.result.value.recent!==0||!sourceTrace.result.value.hasOperationLink)
          throw Error('Fase 8: serie temporal o evidencias vacías no corresponden a IndexedDB');
        await cdp.send('Runtime.evaluate',{
          expression:'(() => {const s=document.querySelector("select[aria-label=\\\"Escenario de indicadores\\\"]");'
           + 'if(s){s.value="warehouse";s.dispatchEvent(new Event("change",{bubbles:true}));}'
           + 'return !!s})()',
          returnByValue:true
        });
        await eventually(async()=>{
          const r=await cdp.send('Runtime.evaluate',{
           expression:'document.querySelector(".saved-dashboard-metrics strong")?.textContent?.trim()',
           returnByValue:true
          });return r.result?.value==='0';
        },'Fase 8 filtro sin sesiones, cero en vez de cifras demo');
        console.log('Fase 8 KPI inicial OK: sesiones, detecciones y filtros reales desde IndexedDB');
        // KP02: fixture interno de QA (no aparece en producción ni alimenta el
        // modelo); valida la transición real de persistencia de revisión.
        const reviewFixture=await cdp.send('Runtime.evaluate',{
          expression:"(async()=>{\n const db=await new Promise((ok,fail)=>{\n  const q=indexedDB.open('vision-ai-simulation-sessions',3);\n  q.onsuccess=()=>ok(q.result);q.onerror=()=>fail(q.error);\n });\n try{\n  const records=await new Promise((ok,fail)=>{\n   const q=db.transaction('sessions','readonly').objectStore('sessions').getAll();\n   q.onsuccess=()=>ok(q.result);q.onerror=()=>fail(q.error);\n  });\n  const base=records.find(x=>x.scenarioId==='safety'&&x.mode==='synthetic');\n  if(!base)throw Error('Falta una sesión sintética para validar KP02.');\n  const now=Date.now();\n  const item={...base,id:'qa-review-session',savedAt:new Date(now).toISOString(),\n   mode:'yolo',inference:{\n    model:'ppe',modelLabel:'YOLOv8s EPP',frameNumber:2,observedAtMs:now-1000,\n    inferenceMs:50,detections:[{id:'qa-person',classId:'person',label:'Persona',\n      confidence:.9,box:{x:.2,y:.2,width:.2,height:.4}}],\n    reviewLog:[{id:'no-hardhat-2',classId:'no-hardhat',\n      label:'Posible ausencia de casco',observedAtMs:now-1000,\n      frameNumber:2,supportingFrames:2,maxConfidence:.82}]\n   }};\n  const tx=db.transaction('sessions','readwrite');\n  const done=new Promise((ok,fail)=>{tx.oncomplete=ok;tx.onerror=()=>fail(tx.error)});\n  tx.objectStore('sessions').add(item);\n  await done;\n  return {id:item.id,event:item.inference.reviewLog[0].id};\n }finally{db.close();}\n})()",awaitPromise:true,returnByValue:true
        });
        if(reviewFixture.result?.value?.id!=='qa-review-session')
          throw Error('KP02 no pudo crear el caso controlado de revisión');
        await cdp.send('Page.navigate',{url:'http://127.0.0.1:4173/#Operaciones'});
        const reviewState=async()=>{
          const r=await cdp.send('Runtime.evaluate',{
           expression:"(() => ({\n open:document.querySelectorAll(\".operations-review-stats strong\")[0]?.textContent?.trim(),\n closed:document.querySelectorAll(\".operations-review-stats strong\")[1]?.textContent?.trim(),\n total:document.querySelectorAll(\".operations-review-stats strong\")[2]?.textContent?.trim(),\n cta:document.querySelector(\".operations-review-item button\")?.textContent?.trim(),\n items:document.querySelectorAll(\".operations-review-item\").length\n}))()",returnByValue:true
          });return r.result?.value;
        };
        await eventually(async()=>{
          const state=await reviewState();
          return state?.open==='1'&&state.closed==='0'&&state.total==='1'&&
            state.items===1&&state.cta?.includes('Marcar como revisado');
        },'KP02 indicio abierto, sin datos artificiales en la interfaz');
        await cdp.send('Runtime.evaluate',{
          expression:'(() => {const b=document.querySelector(".operations-review-item button");'
           + 'b?.click();b?.click();return !!b;})()'
        });
        await eventually(async()=>{
          const state=await reviewState();
          return state?.open==='0'&&state.closed==='1'&&state.total==='1'&&
           !state.cta;
        },'KP02 transición pendiente a revisado exactamente una vez');
        const savedReview=await cdp.send('Runtime.evaluate',{
          expression:"(async()=>{\n const db=await new Promise((ok,fail)=>{\n  const q=indexedDB.open('vision-ai-simulation-sessions',3);\n  q.onsuccess=()=>ok(q.result);q.onerror=()=>fail(q.error);\n });\n try{\n  const tx=db.transaction(['sessions','reviewClosures'],'readonly');\n  const data=await Promise.all([\n   new Promise((ok,fail)=>{\n    const r=tx.objectStore('sessions').get('qa-review-session');\n    r.onsuccess=()=>ok(r.result);r.onerror=()=>fail(r.error);\n   }),\n   new Promise((ok,fail)=>{\n    const r=tx.objectStore('reviewClosures').getAll();\n    r.onsuccess=()=>ok(r.result);r.onerror=()=>fail(r.error);\n   })\n  ]);\n  return {rows:data[1].length,existing:data[0]?.inference?.reviewLog?.length,\n   model:data[0]?.inference?.model,index:db.transaction('reviewClosures','readonly')\n    .objectStore('reviewClosures').indexNames.contains('sessionId')};\n }finally{db.close();}\n})()",awaitPromise:true,returnByValue:true
        });
        if(savedReview.result?.value?.rows!==1||savedReview.result.value.existing!==1||
          !savedReview.result.value.index)
          throw Error('KP02 cierre duplicado o mutación de la evidencia YOLO');
        await cdp.send('Page.reload',{ignoreCache:true});
        await eventually(async()=>{
          const state=await reviewState();
          return state?.open==='0'&&state.closed==='1'&&state.total==='1';
        },'KP02 revisión persistente sin conteos duplicados tras recarga');
        await cdp.send('Page.navigate',{url:'http://127.0.0.1:4173/#Resumen'});
        await eventually(async()=>{
          const r=await cdp.send('Runtime.evaluate',{
           expression:'({open:document.querySelector(".dashboard-open-reviews")?.textContent?.trim(),'
            + 'closed:document.querySelector(".dashboard-closed-reviews")?.textContent?.trim()})',
           returnByValue:true
          });
          return r.result?.value?.open==='0'&&r.result.value.closed==='1';
        },'KP02 actualización de dashboard tras revisión persistida');
        const visualHistory=await cdp.send('Runtime.evaluate',{
          expression:'({last:document.querySelector(".saved-dashboard-recent-row span")?.textContent?.trim(),'
           + 'series:document.querySelectorAll(".saved-dashboard-day").length,'
           + 'source:document.querySelector(".saved-dashboard-recent-row strong")?.textContent?.trim()})',
          returnByValue:true
        });
        if(visualHistory.result?.value?.last!=='Revisado'||
          visualHistory.result.value.series<1||
          !visualHistory.result.value.source?.includes('casco'))
          throw Error('Fase 8: revisión histórica y serie por fecha no se actualizan');
        console.log('KP02 OK: 1 pendiente → 1 revisado, sin duplicados; evidencia YOLO inmutable');



        // DA04: límite reproducible de 100 registros, sin simular una falsa
        // cuota del sistema operativo ni usar archivos/datasets.
        const limitFixture=await cdp.send('Runtime.evaluate',{
          expression:"(async()=>{\n const db=await new Promise((resolve,reject)=>{\n  const r=indexedDB.open('vision-ai-simulation-sessions',3);\n  r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);\n });\n try{\n  const before=await new Promise((resolve,reject)=>{\n   const r=db.transaction('sessions','readonly').objectStore('sessions').getAll();\n   r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);\n  });\n  if(!before.length)throw Error('No existe una sesión de referencia válida.');\n  const tx=db.transaction('sessions','readwrite');\n  const completed=new Promise((resolve,reject)=>{\n   tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);\n  });\n  for(let i=0;i<100-before.length;i++){\n   tx.objectStore('sessions').add({...before[0],id:'qa-cap-'+i,\n    savedAt:new Date(Date.now()-i*1000).toISOString()});\n  }\n  await completed;\n  const count=await new Promise((resolve,reject)=>{\n   const r=db.transaction('sessions','readonly').objectStore('sessions').count();\n   r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);\n  });\n  return {version:db.version,index:db.transaction('sessions','readonly')\n   .objectStore('sessions').indexNames.contains('scenarioId'),count};\n }finally{db.close();}\n})()",awaitPromise:true,returnByValue:true
        });
        if(limitFixture.result?.value?.count!==100||
           limitFixture.result.value.version!==3||!limitFixture.result.value.index)
          throw Error('DA04/migración: límite/indexación incorrectos '+JSON.stringify(limitFixture.result?.value));
        console.log('DA04: 100 registros en IndexedDB v3 con índices y estados humanos');
        await cdp.send('Page.navigate',{
          url:'http://127.0.0.1:4173/#An%C3%A1lisis%20en%20vivo'
        });
        await eventually(async()=>{
          const q=await cdp.send('Runtime.evaluate',{
            expression:'!!document.querySelector(".simulator-persist-actions button")',
            returnByValue:true
          });
          return q.result?.value===true;
        },'DA04 regreso al simulador');
        await cdp.send('Runtime.evaluate',{
          expression:'Array.from(document.querySelectorAll(".simulator-persist-actions button"))'
           + '.find(b=>b.textContent.includes("Guardar sesión"))?.click()'
        });
        await eventually(async()=>{
          const r=await cdp.send('Runtime.evaluate',{
           expression:'document.querySelector(".simulator-save-message")?.textContent||""',
           returnByValue:true
          });
          return r.result?.value?.includes('No se guardó: Se alcanzó el límite de 100 sesiones');
        },'DA04 mensaje real de capacidad alcanzada');
        const afterRejection=await cdp.send('Runtime.evaluate',{
          expression:"(async()=>{\n const db=await new Promise((resolve,reject)=>{\n  const r=indexedDB.open('vision-ai-simulation-sessions',3);\n  r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);\n });\n try{\n  return await new Promise((resolve,reject)=>{\n   const r=db.transaction('sessions','readonly').objectStore('sessions').count();\n   r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);\n  });\n }finally{db.close();}\n})()",awaitPromise:true,returnByValue:true
        });
        if(afterRejection.result?.value!==100)
          throw Error('DA04: el fallo cambió registros que ya estaban confirmados');
        const corrupted=await cdp.send('Runtime.evaluate',{
          expression:"(async()=>{\n const db=await new Promise((resolve,reject)=>{\n  const r=indexedDB.open('vision-ai-simulation-sessions',3);\n  r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);\n });\n try{\n  const tx=db.transaction('sessions','readwrite');\n  const done=new Promise((resolve,reject)=>{\n   tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);\n  });\n  const store=tx.objectStore('sessions');\n  const a=await new Promise((resolve,reject)=>{\n   const r=store.get('qa-cap-0');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);\n  });\n  if(!a)throw Error('Falta el registro para prueba de integridad.');\n  store.put({...a,source:{...a.source,fingerprint:'00000000'}});\n  const b=await new Promise((resolve,reject)=>{\n   const r=store.get('qa-cap-1');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);\n  });\n  if(!b)throw Error('Falta segundo registro para prueba de esquema.');\n  store.put({...b,schemaVersion:99});\n  await done;\n  return {corrupted:2};\n }finally{db.close();}\n})()",awaitPromise:true,returnByValue:true
        });
        if(corrupted.result?.value?.corrupted!==2)
          throw Error('DA04: no se pudo simular la corrupción');
        await cdp.send('Page.navigate',{url:'http://127.0.0.1:4173/#Historial'});
        const audit=async()=>{const r=await cdp.send('Runtime.evaluate',{
          expression:'({issues:document.querySelectorAll(".session-history-corrupt-list>div").length,'
            + 'valid:document.querySelectorAll(".history-panel tbody tr").length,'
            + 'title:document.querySelector(".session-history-integrity h3")?.textContent||""})',
          returnByValue:true
         });return r.result?.value;};
        await eventually(async()=>{
          const state=await audit();return state?.issues===2&&state.valid>0;
        },'DA04 aislar registros corruptos sin perder sesiones válidas');
        await cdp.send('Page.reload',{ignoreCache:true});
        await eventually(async()=>{
          const state=await audit();return state?.issues===2&&state.valid>0;
        },'DA04 corrupción aislada después de recarga');
        const persisted=await cdp.send('Runtime.evaluate',{
          expression:"(async()=>{\n const db=await new Promise((resolve,reject)=>{\n  const r=indexedDB.open('vision-ai-simulation-sessions',3);\n  r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);\n });\n try{\n  return await new Promise((resolve,reject)=>{\n   const r=db.transaction('sessions','readonly').objectStore('sessions').count();\n   r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);\n  });\n }finally{db.close();}\n})()",awaitPromise:true,returnByValue:true
        });
        if(persisted.result?.value!==100)
          throw Error('DA04: se borraron datos sin autorización explícita');
        await cdp.send('Runtime.evaluate',{
          expression:'document.querySelector(".session-history-corrupt-list button")?.click()'
        });
        await eventually(async()=>{
          const q=await cdp.send('Runtime.evaluate',{
            expression:'!!document.querySelector(".session-history-confirm .session-history-delete")',
            returnByValue:true
          });
          return q.result?.value===true;
        },'DA04 confirmación antes de eliminar');
        await cdp.send('Runtime.evaluate',{
          expression:'document.querySelector(".session-history-confirm .session-history-delete")?.click()'
        });
        await eventually(async()=>{
          const state=await audit();return state?.issues===1;
        },'DA04 recuperación por eliminación confirmada');
        await cdp.send('Page.navigate',{
          url:'http://127.0.0.1:4173/#An%C3%A1lisis%20en%20vivo'
        });
        await eventually(async()=>{
          const q=await cdp.send('Runtime.evaluate',{
            expression:'!!document.querySelector(".simulator-persist-actions button")',returnByValue:true
          });
          return q.result?.value===true;
        },'DA04 salida del modo recuperación');
        await cdp.send('Runtime.evaluate',{
          expression:'Array.from(document.querySelectorAll(".simulator-persist-actions button"))'
           + '.find(b=>b.textContent.includes("Guardar sesión"))?.click()'
        });
        await eventually(async()=>{
          const r=await cdp.send('Runtime.evaluate',{
            expression:'document.querySelector(".simulator-save-message")?.textContent||""',
            returnByValue:true
          });
          return r.result?.value?.includes('Sesión guardada');
        },'DA04 recuperación de escritura después de liberar espacio');
        console.log('DA04 OK: cuota de 100, rechazo sin falso guardado, corrupción aislada y recuperación explícita');
        await sleep(550);
        await cdp.send('Page.navigate',{
          url:'http://127.0.0.1:4173/#An%C3%A1lisis%20en%20vivo'
        });
        await eventually(async()=>{
          const r=await cdp.send('Runtime.evaluate',{
            expression:'!!document.querySelector(".simulator-human-stage canvas")',
            returnByValue:true
          });
          return r.result?.value===true;
        },'regreso al simulador después de DA01');
        await sleep(550);
        const clicked = await cdp.send('Runtime.evaluate', {
          expression: '(() => {'
            + 'window.__yoloQaErrors=[];'
            + 'window.addEventListener("error", event => window.__yoloQaErrors.push(event.message));'
            + 'window.addEventListener("unhandledrejection", event => window.__yoloQaErrors.push(String(event.reason)));'
            + 'const buttons=Array.from(document.querySelectorAll(".simulator-ai-switch button"));'
            + 'const b=buttons.find(button=>button.textContent.includes("YOLO real"));'
            + 'if(b) b.click();'
            + 'return { found:!!b, buttons:buttons.map(x=>x.textContent),'
            + ' selected:b?.getAttribute("aria-pressed") };'
            + '})()',
          returnByValue: true
        });
        console.log('DIAGNÓSTICO CTA YOLO: '+JSON.stringify(clicked.result?.value));
        await sleep(900);
        const modeState = await cdp.send('Runtime.evaluate', {
          expression: '(() => ({'
            + ' selected:document.querySelector(".simulator-ai-switch button:nth-child(2)")?.getAttribute("aria-pressed"),'
            + ' panel:!!document.querySelector(".browser-yolo-panel"),'
            + ' root:!!document.querySelector("#root"),'
            + ' pageText:document.body?.textContent?.slice(-500),'
            + ' errors:window.__yoloQaErrors||[]'
            + ' }))()',
          returnByValue: true
        });
        console.log('DIAGNÓSTICO DESPUÉS DEL CAMBIO: '+JSON.stringify(modeState.result?.value));
        const yoloUi = await eventually(async () => {
          const state = await cdp.send('Runtime.evaluate', {
            expression: '({ visible:!!document.querySelector(".browser-yolo-panel"),'
              + ' start:!!document.querySelector(".browser-yolo-panel button.primary"),'
              + ' source:!!document.querySelector(".simulator-human-stage canvas"),'
              + ' syntheticStatus:!!document.querySelector(".simulator-visual .simulator-event") })',
            returnByValue: true
          });
          return state.result?.value?.visible ? state.result.value : null;
        }, 'panel YOLO real');
        if (!yoloUi.start || !yoloUi.source || yoloUi.syntheticStatus)
          throw Error('El motor YOLO no está correctamente separado: '+JSON.stringify(yoloUi));
        const monitorBefore=await cdp.send('Runtime.evaluate',{
          expression:'(() => ({'
           + ' monitor:!!document.querySelector(".yolo-monitor"),'
           + ' simulated:!!document.querySelector(".sim-analytics"),'
           + ' initial:document.querySelector(".yolo-monitor-kpi.primary strong")?.textContent?.trim(),'
           + ' cards:document.querySelectorAll(".yolo-monitor-kpi").length,'
           + ' review:!!document.querySelector(".yolo-monitor-review"),'
           + ' reviewCount:document.querySelector(".yolo-monitor-review .yolo-monitor-sectionhead strong")?.textContent?.trim(),'
           + ' reviewLog:!!document.querySelector(".yolo-monitor-review-log")'
           + ' }))()',
          returnByValue:true
        });
        const monitorInitial=monitorBefore.result?.value;
        if(!monitorInitial?.monitor||monitorInitial.simulated||
          monitorInitial.initial!=='—'||monitorInitial.cards!==8||
          !monitorInitial.review||monitorInitial.reviewCount!=='—'||monitorInitial.reviewLog)
          throw Error('Monitor YOLO muestra datos sintéticos o cifras previas: '+JSON.stringify(monitorInitial));
        const safetyModelCheck=await cdp.send('Runtime.evaluate',{
          expression:'(() => ({ selected:Array.from(document.querySelectorAll(".browser-yolo-picker button"))'
            + '.find(b=>b.textContent.includes("EPP industrial"))?.getAttribute("aria-pressed"),'
            + ' noUploads:!document.querySelector(".browser-yolo-upload")'
            + ' && !document.querySelector(".ppe-evaluation")'
            + ' && !document.querySelector(".ppe-evaluation-uploads")'
            + ' && !Array.from(document.querySelectorAll(".browser-yolo-picker button"))'
            + '.some(b=>b.textContent.includes("Imagen real local"))'
            + ' }))()',
          returnByValue:true
        });
        console.log('Detector EPP seleccionado: '+JSON.stringify(safetyModelCheck.result?.value));
        if(safetyModelCheck.result?.value?.selected!=='true'||!safetyModelCheck.result?.value?.noUploads)
          throw Error('Seguridad debe utilizar EPP y no mostrar cargas externas');
        await cdp.send('Runtime.evaluate', {
          expression: 'document.querySelector(".browser-yolo-panel")?.scrollIntoView({block:"center"})'
        });
        await sleep(450);
        const yoloScreen = await cdp.send('Page.captureScreenshot', {
          format: 'png', captureBeyondViewport: false
        });
        fs.writeFileSync(path.join(artifacts, 'modo-yolo-1440.png'),
          Buffer.from(yoloScreen.data, 'base64'));
        console.log('UI YOLO OK: simulación 3D exclusiva, sin cargas ni overlays sintéticos');
        // Prueba real: ONNX + WASM debe ejecutar al menos un frame GPU.
        // No exigimos detecciones: un modelo COCO puede devolver cero objetos 3D.
        const startResponse = await cdp.send('Runtime.evaluate', {
          expression: '(() => { const button=document.querySelector(".browser-yolo-panel button.primary");'
            + 'button?.click();return !!button;})()',
          returnByValue: true
        });
        if (!startResponse.result?.value) throw Error('Botón de inicio YOLO inaccesible');
        let firstInference = null;
        let lastStatus = null;
        for (let attempt = 0; attempt < 470; attempt++) {
          const response = await cdp.send('Runtime.evaluate', {
            expression: '(() => ({'
              + ' frames:Number(document.querySelector(".browser-yolo-count b")?.textContent||0),'
              + ' status:document.querySelector(".browser-yolo-status")?.textContent||"",'
              + ' error:document.querySelector(".browser-yolo-error")?.textContent||"",'
              + ' phase:document.querySelector(".browser-yolo-phase")?.textContent||""'
              + ' }))()',
            returnByValue: true
          });
          lastStatus = response.result?.value;
          if (lastStatus?.error) throw Error('ONNX smoke test falló: '+JSON.stringify(lastStatus));
          if (lastStatus?.frames > 0) {
            firstInference = lastStatus;break;
          }
          await sleep(200);
        }
        if (!firstInference) throw Error('No hubo inferencia ONNX tras esperar: '+JSON.stringify(lastStatus));
        console.log('YOLO EPP REAL OK en Chromium: '+JSON.stringify(firstInference));
        await sleep(350);
        const resultMonitor=await cdp.send('Runtime.evaluate',{
          expression:'(() => ({'
           + ' detector:document.querySelector(".browser-yolo-kpis strong")?.textContent?.trim(),'
           + ' monitor:document.querySelector(".yolo-monitor-kpi.primary strong")?.textContent?.trim(),'
           + ' model:document.querySelector(".yolo-monitor-source")?.textContent?.trim(),'
           + ' synthetic:!!document.querySelector(".sim-analytics"),'
           + ' readings:document.querySelectorAll(".yolo-monitor-trend rect").length'
           + ' }))()',
          returnByValue:true
        });
        const numbers=resultMonitor.result?.value;
        if(!numbers||numbers.detector!==numbers.monitor||numbers.synthetic||numbers.readings<1||
          !numbers.model?.includes('EPP'))
          throw Error('El monitor YOLO no coincide con la inferencia ejecutada: '+JSON.stringify(numbers));
        console.log('MONITOR YOLO REAL OK: detecciones del frame vinculadas al panel operativo');
        const captureStats=await cdp.send('Runtime.evaluate',{
          expression:'(() => ({ kpis:Array.from(document.querySelectorAll(".yolo-monitor-kpi span"))'
           + '.map(x=>x.textContent?.trim()), captured:document.querySelectorAll(".yolo-monitor-kpi").length'
           + ' }))()',
          returnByValue:true
        });
        if(captureStats.result?.value?.captured!==8||
          !captureStats.result.value.kpis.some(x=>x?.includes('FPS de capturas'))||
          !captureStats.result.value.kpis.some(x=>x?.includes('Antigüedad de lectura')))
          throw Error('Fase 8: faltan indicadores medidos del ciclo YOLO');
        const ppeReviewUi=await cdp.send('Runtime.evaluate',{
          expression:'(() => ({'
           + ' review:!!document.querySelector(".yolo-monitor-review"),'
           + ' explanation:document.querySelector(".yolo-monitor-review-explain")?.textContent||"",'
           + ' invalid:document.querySelector(".simulator-controls .sim-analytics")!==null'
           + ' }))()',
          returnByValue:true
        });
        if(!ppeReviewUi.result?.value?.review||
          !ppeReviewUi.result.value.explanation.includes('2 de los últimos 3')||
          ppeReviewUi.result.value.invalid)
          throw Error('Revisión temporal de EPP no está bien separada de la simulación');
        const inferenceShot = await cdp.send('Page.captureScreenshot', {
          format: 'png', captureBeyondViewport: false
        });
        fs.writeFileSync(path.join(artifacts, 'yolo-inferencia-real-1440.png'),
          Buffer.from(inferenceShot.data,'base64'));
        await cdp.send('Runtime.evaluate', {
          expression: 'Array.from(document.querySelectorAll(".browser-yolo-panel button"))'
            + '.find(b=>b.textContent.includes("Detener inferencia"))?.click()'
        });

      }
      console.log('QA OK: ' + name + ' a ' + width + ' px; sin desbordamiento horizontal');
      checked++;
    }
  }
  console.log('QA terminado: ' + checked + ' recorridos; capturas en qa-artifacts/');
} finally {
  cdp?.close();
  if (chrome) {
    const exited = new Promise(resolve => chrome.once('exit', resolve));
    chrome.kill();
    await Promise.race([exited, sleep(2000)]);
  }
  server.kill();
  // Chrome puede recrear archivos temporales brevemente mientras se apaga.
  // No invalidar una batería completa por una carrera de limpieza del runner.
  try {
    fs.rmSync(profile, { recursive: true, force: true, maxRetries: 12, retryDelay: 150 });
  } catch (error) {
    console.warn('Aviso: carpeta temporal de Chromium pendiente de limpieza:', error.message);
  }
}
