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
          + 'hasSimulationModes: !!document.querySelector(".simulation-source-tabs button[aria-pressed=true]"), '
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
          + 'hasKPIs: document.querySelectorAll(".sim-analytics-kpis .sim-kpi").length === 3 }; '
          + '})()';
        const response = await cdp.send('Runtime.evaluate', { expression, returnByValue: true });
        return response.result?.value ?? null;
      }, name + ' ' + width);
      if (view.viewport !== width || view.pageWidth > width + 1
          || view.elementLeft < -1 || view.elementLeft + view.elementWidth > width + 1
          || !view.hasFocusableMain || !view.hasSkip || !view.hasText
          || (name === 'analisis' && (!view.hasSimulationModes || !view.hasYoloModeSwitch || !view.hasSimulatorStage || !view.hasSimulatorControls || !view.hasCameraPresets || !view.hasHumanMode || !view.hasHumanCanvas || !view.hasSyntheticDisclosure || !view.hasSyntheticLabel || !view.hasScenarioTabs || !view.hasAnalytics || !view.hasActivityChart || !view.hasMiniMap || !view.hasKPIs))) {
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
      if (name === 'analisis' && width === 1440) {
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
        const safetyModelCheck=await cdp.send('Runtime.evaluate',{
          expression:'(() => ({ selected:Array.from(document.querySelectorAll(".browser-yolo-picker button"))'
            + '.find(b=>b.textContent.includes("EPP industrial"))?.getAttribute("aria-pressed"),'
            + ' photoOption:!!Array.from(document.querySelectorAll(".browser-yolo-picker button"))'
            + '.find(b=>b.textContent.includes("Imagen real local"))'
            + ' }))()',
          returnByValue:true
        });
        const evaluationPresence=await cdp.send('Runtime.evaluate',{
          expression:'(() => ({ panel:!!document.querySelector(".ppe-evaluation"),'
            + ' uploads:document.querySelectorAll(".ppe-evaluation-uploads input[type=file]").length,'
            + ' hasFakeMetrics:!!document.querySelector(".ppe-eval-summary"),'
            + ' startDisabled:document.querySelector(".ppe-eval-start")?.disabled'
            + ' }))()',
          returnByValue:true
        });
        const evalBefore=evaluationPresence.result?.value;
        if(!evalBefore?.panel||evalBefore.uploads!==3||evalBefore.hasFakeMetrics||!evalBefore.startDisabled)
         throw Error('El evaluador EPP no inicia sin dataset real: '+JSON.stringify(evalBefore));
        console.log('Detector EPP seleccionado: '+JSON.stringify(safetyModelCheck.result?.value));
        if(safetyModelCheck.result?.value?.selected!=='true'||!safetyModelCheck.result?.value?.photoOption)
          throw Error('Seguridad no eligió el detector EPP ni permite imágenes reales');
        await cdp.send('Runtime.evaluate', {
          expression: 'document.querySelector(".browser-yolo-panel")?.scrollIntoView({block:"center"})'
        });
        await sleep(450);
        const yoloScreen = await cdp.send('Page.captureScreenshot', {
          format: 'png', captureBeyondViewport: false
        });
        fs.writeFileSync(path.join(artifacts, 'modo-yolo-1440.png'),
          Buffer.from(yoloScreen.data, 'base64'));
        console.log('UI YOLO OK: modo independiente, sin overlays sintéticos');
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
        const inferenceShot = await cdp.send('Page.captureScreenshot', {
          format: 'png', captureBeyondViewport: false
        });
        fs.writeFileSync(path.join(artifacts, 'yolo-inferencia-real-1440.png'),
          Buffer.from(inferenceShot.data,'base64'));
        await cdp.send('Runtime.evaluate', {
          expression: 'Array.from(document.querySelectorAll(".browser-yolo-panel button"))'
            + '.find(b=>b.textContent.includes("Detener inferencia"))?.click()'
        });
        // Fixture de QA, NO evidencia de precisión: imagen blanca y anotación vacía.
        // Se comprueba el pipeline real del evaluador sin atribuirle objetos inventados.
        const injected=await cdp.send('Runtime.evaluate',{
          expression:'(async () => {'
           + 'const canvas=document.createElement("canvas");canvas.width=64;canvas.height=64;'
           + 'const ctx=canvas.getContext("2d");ctx.fillStyle="white";ctx.fillRect(0,0,64,64);'
           + 'const blob=await new Promise(resolve=>canvas.toBlob(resolve,"image/png"));'
           + 'const files=['
           + 'new File([blob],"qa-blanco.png",{type:"image/png"}),'
           + 'new File([""],"qa-blanco.txt",{type:"text/plain"}),'
           + 'new File(["names: [person]"],"data.yaml",{type:"text/yaml"})];'
           + 'const inputs=Array.from(document.querySelectorAll(".ppe-evaluation-uploads input[type=file]"));'
           + 'if(inputs.length!==3)return {loaded:false};'
           + 'for(let i=0;i<3;i++){const dt=new DataTransfer();dt.items.add(files[i]);'
           + 'inputs[i].files=dt.files;inputs[i].dispatchEvent(new Event("change",{bubbles:true}));}'
           + 'return {loaded:true,names:files.map(f=>f.name)}'
           + '})()',
          awaitPromise:true,returnByValue:true
        });
        if(!injected.result?.value?.loaded)throw Error('El dataset de QA no se pudo cargar.');
        await sleep(450);
        const evalStart=await cdp.send('Runtime.evaluate',{
          expression:'(() => {const button=document.querySelector(".ppe-eval-start");'
           + 'if(button&&!button.disabled)button.click();'
           + 'return {found:!!button,disabled:button?.disabled};})()',
          returnByValue:true
        });
        if(!evalStart.result?.value?.found||evalStart.result.value.disabled)
         throw Error('El evaluador no aceptó un dataset YOLO de prueba.');
        let evaluationFinished=null;
        for(let attempt=0;attempt<170;attempt++){
         const response=await cdp.send('Runtime.evaluate',{
           expression:'(() => ({'
            + ' status:document.querySelector(".ppe-eval-status")?.textContent||"",'
            + ' error:document.querySelector(".ppe-eval-error")?.textContent||"",'
            + ' metrics:Array.from(document.querySelectorAll(".ppe-eval-summary strong")).map(e=>e.textContent),'
            + ' rows:document.querySelectorAll(".ppe-eval-class-performance tbody tr").length'
            + ' }))()',
           returnByValue:true
         });
         evaluationFinished=response.result?.value;
         if(evaluationFinished?.error)throw Error('Evaluador EPP falló: '+JSON.stringify(evaluationFinished));
         if(evaluationFinished?.status?.includes('Evaluación completa'))break;
         await sleep(200);
        }
        if(!evaluationFinished?.status?.includes('Evaluación completa')||
          evaluationFinished.rows!==1||evaluationFinished.metrics?.[0]!=='—')
         throw Error('Evaluación sin GT generó métricas inventadas o no terminó: '+JSON.stringify(evaluationFinished));
        console.log('EVALUACIÓN EPP OK en Chromium: pipeline real de imagen vacía sin mAP inventado.');

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
