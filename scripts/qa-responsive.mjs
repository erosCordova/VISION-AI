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
        await cdp.send('Runtime.evaluate', {
          expression: 'Array.from(document.querySelectorAll(".simulator-ai-switch button"))'
            + '.find(button => button.textContent.includes("YOLO real"))?.click()'
        });
        const yoloUi = await eventually(async () => {
          const state = await cdp.send('Runtime.evaluate', {
            expression: '({ visible:!!document.querySelector(".browser-yolo-panel"),'
              + ' start:!!document.querySelector(".browser-yolo-panel button.primary"),'
              + ' source:!!document.querySelector(".simulator-human-stage canvas"),'
              + ' syntheticStatus:!!document.querySelector(".simulator-visual .simulator-event") })()',
            returnByValue: true
          });
          return state.result?.value?.visible ? state.result.value : null;
        }, 'panel YOLO real');
        if (!yoloUi.start || !yoloUi.source || yoloUi.syntheticStatus)
          throw Error('El motor YOLO no está correctamente separado: '+JSON.stringify(yoloUi));
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
