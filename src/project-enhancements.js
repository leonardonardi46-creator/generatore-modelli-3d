import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';

const $ = (selector) => document.querySelector(selector);
const prompt = $('#prompt');
const generateButton = $('#generate');
const alternativeButton = $('#generate-alternative');
const projects = $('#saved-variants');
const viewport = $('#viewport');
const status = $('#status-text');
const loading = $('#loading');
const seedInput = $('#seed');

// A selectable procedural style, applied before each worker request.
const styleField = document.createElement('div');
styleField.className = 'field-row style-row';
styleField.innerHTML = '<label class="field-label" for="model-style">Stile del modello</label><select id="model-style" aria-label="Scegli lo stile"><option value="standard">Standard</option><option value="low-poly">Low-poly</option><option value="cartoon">Cartoon</option><option value="geometric">Geometrico</option><option value="organic">Organico</option></select>';
$('#shape')?.closest('.field-row')?.insertAdjacentElement('beforebegin', styleField);

const styleBehaviors = {
  standard: { smooth: true, wireframe: false, variation: 20 },
  'low-poly': { smooth: false, wireframe: false, variation: 38 },
  cartoon: { smooth: true, wireframe: false, variation: 14 },
  geometric: { smooth: false, wireframe: false, variation: 8 },
  organic: { smooth: true, wireframe: false, variation: 62 },
};
const styleLabel = () => $('#model-style').selectedOptions[0].textContent;
const styleMarker = /\s*\[Stile: [^\]]+\]/g;
function applyStyle() {
  const promptBase = (prompt.dataset.basePrompt ?? prompt.value).replace(styleMarker, '').trim();
  prompt.dataset.basePrompt = promptBase;
  const style = $('#model-style').value;
  const behavior = styleBehaviors[style] || styleBehaviors.standard;
  $('#smooth-shading').checked = behavior.smooth;
  $('#wireframe').checked = behavior.wireframe;
  $('#variation').value = String(behavior.variation);
  $('#variation-value').value = `${behavior.variation}%`;
  prompt.value = `${promptBase}${style === 'standard' ? '' : ` [Stile: ${styleLabel()}]`}`.slice(0, 240);
}
$('#model-style').addEventListener('change', applyStyle);
prompt.addEventListener('input', () => { prompt.dataset.basePrompt = prompt.value.replace(styleMarker, '').trim(); });

// The main-thread renderer already exists; replace its canvas only when a worker result is ready.
const workerRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
workerRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
workerRenderer.outputColorSpace = THREE.SRGBColorSpace;
workerRenderer.toneMapping = THREE.ACESFilmicToneMapping;
workerRenderer.toneMappingExposure = 1.15;
workerRenderer.domElement.setAttribute('aria-label', 'Anteprima 3D del modello generato');
workerRenderer.domElement.className = 'worker-preview-canvas';
const workerScene = new THREE.Scene();
workerScene.background = new THREE.Color('#15171b');
workerScene.add(new THREE.HemisphereLight(0xe4e2ff, 0x38333e, 2.1));
const keyLight = new THREE.DirectionalLight(0xffffff, 3.2); keyLight.position.set(4, 7, 5); workerScene.add(keyLight);
const fillLight = new THREE.PointLight(0xa58cff, 24, 20); fillLight.position.set(-4, 2, -3); workerScene.add(fillLight);
const grid = new THREE.GridHelper(12, 24, 0x403b49, 0x292a30); grid.position.y = -1.02; workerScene.add(grid);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.2 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -1.03; ground.receiveShadow = true; workerScene.add(ground);
const workerCamera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
workerCamera.position.set(6.7, 5.3, 7.6);
const workerControls = new OrbitControls(workerCamera, workerRenderer.domElement);
workerControls.enableDamping = true; workerControls.dampingFactor = 0.07; workerControls.minDistance = 3.5; workerControls.maxDistance = 18; workerControls.target.set(0, 0.15, 0);
let displayedModel = null;
let activeWorker = null;
let jobStarted = 0;
let countdownTimer = null;
let jobSequence = 0;

function resizeWorkerRenderer() {
  const { width, height } = viewport.getBoundingClientRect();
  if (!width || !height) return;
  workerCamera.aspect = width / height;
  workerCamera.updateProjectionMatrix();
  workerRenderer.setSize(width, height, false);
}
new ResizeObserver(resizeWorkerRenderer).observe(viewport);
window.addEventListener('resize', resizeWorkerRenderer);
function renderLoop() {
  requestAnimationFrame(renderLoop);
  workerControls.update();
  workerRenderer.render(workerScene, workerCamera);
}
renderLoop();

function collectConfig() {
  return {
    prompt: prompt.value,
    shape: $('#shape').value,
    dimensions: { width: Number($('#width').value), height: Number($('#height').value), depth: Number($('#depth').value) },
    color: $('#color').value,
    polygonBudget: Number($('#polygon-budget').value),
    roughness: Number($('#surface-roughness').value),
    smooth: $('#smooth-shading').checked,
    wireframe: $('#wireframe').checked,
    variation: Number($('#variation').value),
    seed: Math.max(0, Math.min(4294967295, Math.floor(Number(seedInput.value) || 0))),
  };
}
function estimateKey(config) {
  const shape = config.shape === 'auto' ? (/gatt[oa]|micio|felino|cat/i.test(config.prompt) ? 'cat' : 'auto') : config.shape;
  const qualityBand = config.polygonBudget < 5000 ? 'low' : config.polygonBudget < 20000 ? 'medium' : 'high';
  return `${shape}:${qualityBand}`;
}
const ETA_STORAGE_KEY = 'forma-generation-times-v1';
function estimateSeconds(config) {
  // Use device-local completed jobs when available. First-run estimates are explicitly conservative.
  try {
    const history = JSON.parse(localStorage.getItem(ETA_STORAGE_KEY) || '{}');
    const samples = history[estimateKey(config)];
    if (Array.isArray(samples) && samples.length) {
      const sorted = [...samples].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      return Math.max(1, Math.ceil(median * 1.2 + 0.5));
    }
  } catch { /* Use the conservative first-run estimate below. */ }
  const complexity = config.shape === 'cat' || /gatt[oa]|micio|felino|cat/i.test(config.prompt) ? 2.4 : /casa|auto|albero|sedia|tavolo|razzo/i.test(config.prompt) ? 1.8 : 1;
  const quality = Math.max(0.7, Math.min(3.2, config.polygonBudget / 12000));
  return Math.max(2, Math.ceil((1.5 + complexity * 1.3) * quality));
}
function recordDuration(config, elapsedMs) {
  try {
    const history = JSON.parse(localStorage.getItem(ETA_STORAGE_KEY) || '{}');
    const key = estimateKey(config);
    history[key] = [...(Array.isArray(history[key]) ? history[key] : []), Math.max(0.1, elapsedMs / 1000)].slice(-9);
    localStorage.setItem(ETA_STORAGE_KEY, JSON.stringify(history));
  } catch { /* Generation should work even if storage is unavailable. */ }
}
function setBusy(busy) {
  generateButton.disabled = busy;
  if (alternativeButton) alternativeButton.disabled = busy;
  $('#random-seed').disabled = busy;
  $('#save-variant').disabled = busy;
  for (const button of document.querySelectorAll('.saved-load')) button.disabled = busy;
  loading.hidden = !busy;
}
function addWorkerModel(data) {
  const group = new THREE.Group();
  group.name = data.modelName;
  for (const part of data.meshes) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(part.positions, 3));
    if (part.normals) geometry.setAttribute('normal', new THREE.BufferAttribute(part.normals, 3));
    if (part.uvs) geometry.setAttribute('uv', new THREE.BufferAttribute(part.uvs, 2));
    if (part.indices) geometry.setIndex(new THREE.BufferAttribute(part.indices, 1));
    else geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({ color: part.color, roughness: part.roughness, metalness: part.metalness, flatShading: part.flatShading, wireframe: part.wireframe });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = part.name || '';
    mesh.castShadow = true; mesh.receiveShadow = true;
    group.add(mesh);
  }
  if (displayedModel) {
    workerScene.remove(displayedModel);
    displayedModel.traverse((object) => { if (object.isMesh) { object.geometry.dispose(); object.material.dispose(); } });
  }
  displayedModel = group;
  workerScene.add(group);
  // Hide the original canvas once the worker model is ready.
  viewport.querySelector('canvas:not(.worker-preview-canvas)')?.classList.add('legacy-preview-hidden');
  if (!workerRenderer.domElement.isConnected) viewport.appendChild(workerRenderer.domElement);
  resizeWorkerRenderer();
  $('#model-name').textContent = data.modelName;
  $('#triangle-count').textContent = Number(data.triangleCount).toLocaleString('it-IT');
}
function cancelGeneration() {
  if (!activeWorker) return;
  activeWorker.terminate();
  activeWorker = null;
  clearInterval(countdownTimer);
  countdownTimer = null;
  setBusy(false);
  status.textContent = 'Generazione annullata; modello precedente mantenuto';
}
function startGeneration(config) {
  if (activeWorker) cancelGeneration();
  applyStyle();
  config = collectConfig();
  const id = ++jobSequence;
  const estimate = estimateSeconds(config);
  jobStarted = performance.now();
  setBusy(true);
  const cancel = $('#cancel-generation');
  if (cancel) cancel.hidden = false;
  const updateEta = () => {
    const remaining = Math.max(0, estimate - (performance.now() - jobStarted) / 1000);
    status.textContent = remaining > 0
      ? `Stima: circa ${Math.ceil(remaining)} s · generazione in corso`
      : 'Stima superata · completamento in corso…';
  };
  clearInterval(countdownTimer);
  updateEta();
  countdownTimer = setInterval(updateEta, 200);
  const worker = new Worker(new URL('./generation-worker.js', import.meta.url), { type: 'module' });
  activeWorker = worker;
  worker.onmessage = ({ data }) => {
    if (data.id !== id || activeWorker !== worker) return;
    const elapsed = performance.now() - jobStarted;
    clearInterval(countdownTimer); countdownTimer = null;
    activeWorker = null; worker.terminate();
    setBusy(false);
    if ($('#cancel-generation')) $('#cancel-generation').hidden = true;
    if (!data.ok) {
      status.textContent = 'Generazione non riuscita';
      showNotice(`Errore di generazione: ${data.error}`);
      return;
    }
    addWorkerModel(data);
    recordDuration(config, elapsed);
    status.textContent = `Modello pronto · ${Math.max(0.1, elapsed / 1000).toFixed(1)} s`;
  };
  worker.onerror = (error) => {
    if (activeWorker !== worker) return;
    clearInterval(countdownTimer); countdownTimer = null;
    activeWorker = null; worker.terminate(); setBusy(false);
    if ($('#cancel-generation')) $('#cancel-generation').hidden = true;
    status.textContent = 'Errore durante la generazione';
    showNotice(error.message || 'Il Web Worker non è riuscito ad avviare la generazione.');
  };
  worker.postMessage({ id, config });
}
function showNotice(message) {
  const toast = $('#toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 4500);
}

// Capture before main.js handlers, so procedural geometry is always produced in the worker.
generateButton.addEventListener('click', (event) => {
  event.preventDefault(); event.stopImmediatePropagation();
  startGeneration(collectConfig());
}, true);
if (alternativeButton) alternativeButton.addEventListener('click', (event) => {
  event.preventDefault(); event.stopImmediatePropagation();
  const value = new Uint32Array(1);
  if (globalThis.crypto?.getRandomValues) crypto.getRandomValues(value);
  else value[0] = Math.floor(Math.random() * 4294967296);
  seedInput.value = String(value[0]);
  startGeneration(collectConfig());
}, true);
let cancelButton = $('#cancel-generation');
if (!cancelButton) {
  cancelButton = document.createElement('button');
  cancelButton.id = 'cancel-generation'; cancelButton.type = 'button'; cancelButton.textContent = 'Annulla generazione';
  cancelButton.hidden = true; cancelButton.setAttribute('aria-label', 'Annulla la generazione corrente');
  status?.parentElement?.appendChild(cancelButton);
}
cancelButton.addEventListener('click', cancelGeneration);

// Saved projects are loaded into the worker pipeline too, not the old synchronous handler.
projects?.addEventListener('click', (event) => {
  const button = event.target.closest('.saved-load');
  if (!button) return;
  event.preventDefault(); event.stopImmediatePropagation();
  const index = [...projects.querySelectorAll('.saved-variant-row')].findIndex((row) => row.contains(button));
  let variants = [];
  try { variants = JSON.parse(localStorage.getItem('forma-saved-variants-v1') || '[]'); } catch { /* ignored */ }
  const item = variants[index];
  if (!item) return;
  prompt.value = item.prompt || ''; $('#shape').value = item.shape || 'auto';
  for (const axis of ['width', 'height', 'depth']) if (item.dimensions?.[axis]) $(`#${axis}`).value = String(item.dimensions[axis]);
  $('#color').value = item.color || '#9b87f5'; $('#polygon-budget').value = String(item.polygonBudget || 8000);
  $('#surface-roughness').value = String(item.roughness ?? 0.48); $('#smooth-shading').checked = item.smooth !== false;
  $('#wireframe').checked = Boolean(item.wireframe); $('#variation').value = String(item.variation ?? 20); seedInput.value = String(item.seed ?? 42);
  startGeneration(collectConfig());
}, true);

function safeFilename(value) {
  return (value || 'modello-3d').toLocaleLowerCase('it-IT').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'modello-3d';
}
function download(blob, filename) {
  const url = URL.createObjectURL(blob); const link = document.createElement('a');
  link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('#export-glb')?.addEventListener('click', (event) => {
  if (!displayedModel) return;
  event.preventDefault(); event.stopImmediatePropagation();
  new GLTFExporter().parse(displayedModel, (result) => download(new Blob([result], { type: 'model/gltf-binary' }), `${safeFilename(displayedModel.name)}.glb`), (error) => showNotice(error.message), { binary: true });
}, true);
$('#export-stl')?.addEventListener('click', (event) => {
  if (!displayedModel) return;
  event.preventDefault(); event.stopImmediatePropagation();
  try { const result = new STLExporter().parse(displayedModel, { binary: true }); download(new Blob([result], { type: 'model/stl' }), `${safeFilename(displayedModel.name)}.stl`); }
  catch (error) { showNotice(error.message || 'Esportazione STL non riuscita'); }
}, true);
$('#screenshot')?.addEventListener('click', (event) => {
  if (!displayedModel) return;
  event.preventDefault(); event.stopImmediatePropagation();
  workerRenderer.domElement.toBlob((blob) => { if (blob) download(blob, `${safeFilename(displayedModel.name)}.png`); });
}, true);

function updateProjectCount() {
  const count = projects?.querySelectorAll('.saved-variant-row').length || 0;
  const label = $('#projects-count');
  if (label) label.textContent = `${count} ${count === 1 ? 'progetto salvato' : 'progetti salvati'}`;
}
if (projects) { new MutationObserver(updateProjectCount).observe(projects, { childList: true }); updateProjectCount(); }

const css = document.createElement('style');
css.textContent = `
.style-row{display:block;margin:14px 0}.style-row select{width:100%;margin-top:7px}
.generation-actions{display:grid;gap:10px}.alternative-button{width:100%;padding:12px;border:1px solid #494451;border-radius:8px;background:#201f26;color:#ebe8f1;font:600 13px 'DM Sans',sans-serif;cursor:pointer}
.projects-section{margin:34px 0;padding:24px;border:1px solid #302e36;border-radius:10px;background:#151519}.projects-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.projects-heading h2{margin:6px 0;font:700 22px 'Manrope',sans-serif}.projects-heading p{margin:0;color:#a6a2af;font-size:13px}.projects-count{color:#aaa3b8;font-size:12px}.projects-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:8px;margin-top:18px}.saved-variant-row{display:flex;gap:8px;align-items:stretch;padding:9px;border:1px solid #34313c;border-radius:7px;background:#19181e}.saved-load{flex:1;min-width:0;border:0;background:transparent;color:#e9e5ef;text-align:left;overflow-wrap:anywhere;cursor:pointer}.saved-remove{width:34px;border:1px solid #494451;border-radius:5px;background:#201e25;color:#d9d4e0;cursor:pointer}.saved-empty{grid-column:1/-1;color:#aaa3b8;font-size:13px}
.worker-preview-canvas{position:absolute;inset:0;width:100%;height:100%;z-index:2}.legacy-preview-hidden{visibility:hidden!important}.viewport-wrap{position:relative}#cancel-generation{margin-left:auto;padding:7px 12px;border:1px solid #ad5660;border-radius:7px;background:#2c191d;color:#ffdce0;font:600 12px 'DM Sans',sans-serif;cursor:pointer}#cancel-generation:hover{background:#442127}
button{font-family:'DM Sans',sans-serif;font-weight:600;transition:background-color .18s ease,border-color .18s ease,color .18s ease,transform .18s ease,box-shadow .18s ease}button:not(:disabled){cursor:pointer}button:not(:disabled):active{transform:translateY(1px)}button:focus-visible,select:focus-visible,input:focus-visible,textarea:focus-visible{outline:2px solid #a995ff;outline-offset:2px}
.create-button,.export-actions button{border:1px solid #a996ff;border-radius:8px;background:linear-gradient(135deg,#9b87f5,#765fe0);color:#fff;box-shadow:0 5px 16px #8067ec30}.create-button:hover,.export-actions button:hover{background:linear-gradient(135deg,#ad9cff,#826df0);box-shadow:0 7px 20px #8067ec50;transform:translateY(-1px)}.alternative-button,#random-seed,#screenshot,.text-button{border:1px solid #45424d;border-radius:8px;background:#201f26;color:#ebe8f1}.alternative-button:hover,#random-seed:hover,#screenshot:hover,.text-button:hover{border-color:#8171ba;background:#292733;color:#fff}#save-variant,.save-variant-button{border:1px solid #4d806a;border-radius:8px;background:#1b2b25;color:#d3f0df}#save-variant:hover,.save-variant-button:hover{background:#234031;border-color:#65a782}.export-actions{display:flex;gap:10px}.export-actions button{padding:10px 15px}button:disabled{opacity:.52;cursor:not-allowed;box-shadow:none}
@media(max-width:600px){.projects-section{padding:17px}.projects-heading{display:block}.projects-count{display:inline-block;margin-top:12px}.export-actions{flex-wrap:wrap}}
`;
document.head.appendChild(css);

// Start one initial worker generation so the page's first preview uses the same cancellable pipeline.
setTimeout(() => startGeneration(collectConfig()), 0);
