import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { createShapeGroup, detectShape, promptColor, promptDimensions, SHAPE_CATEGORIES, SHAPE_NAMES } from './shape-library.js';
import { applyMeshOptions, triangleCount } from './model-options.js';
import { createCatGroup } from './prompt-objects.js';
import { createProceduralTexture, semanticBaseColor, textureStyleFromPrompt } from './procedural-textures.js';
import './style.css';
import './options.css';
import './layout-guardrails.css';

const $ = (selector) => document.querySelector(selector);
const viewport = $('#viewport');
const promptInput = $('#prompt');
const shapeSelect = $('#shape');
const dimensions = { width: $('#width'), height: $('#height'), depth: $('#depth') };
const colorInput = $('#color');
const settings = {
  polygonBudget: $('#polygon-budget'), quality: $('#mesh-quality'), smooth: $('#smooth-shading'),
  wireframe: $('#wireframe'), roughness: $('#surface-roughness'), variation: $('#variation'), seed: $('#seed'),
};
const STORAGE_KEY = 'forma-saved-variants-v1';

if (!viewport || !promptInput || !shapeSelect) throw new Error('Elementi del generatore mancanti: verifica index.html e il deploy Vite.');
for (const category of SHAPE_CATEGORIES) {
  const group = document.createElement('optgroup'); group.label = category.label;
  for (const [value, label] of category.shapes) {
    const option = document.createElement('option'); option.value = value; option.textContent = label; group.append(option);
  }
  shapeSelect.append(group);
}
const objectGroup = [...shapeSelect.querySelectorAll('optgroup')].find((item) => item.label === 'Oggetti composti') || document.createElement('optgroup');
objectGroup.label = 'Oggetti composti';
if (!objectGroup.isConnected) shapeSelect.append(objectGroup);
const catOption = document.createElement('option'); catOption.value = 'cat'; catOption.textContent = 'Gatto (procedurale)'; objectGroup.append(catOption);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#15171b');
const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
camera.position.set(6.7, 5.3, 7.6);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
renderer.domElement.setAttribute('aria-label', 'Anteprima 3D del modello generato');
viewport.append(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.07; controls.minDistance = 3.5; controls.maxDistance = 18; controls.target.set(0, 0.15, 0);
scene.add(new THREE.HemisphereLight(0xe4e2ff, 0x38333e, 2.1));
const keyLight = new THREE.DirectionalLight(0xffffff, 3.2); keyLight.position.set(4, 7, 5); keyLight.castShadow = true; scene.add(keyLight);
const fillLight = new THREE.PointLight(0xa58cff, 24, 20); fillLight.position.set(-4, 2, -3); scene.add(fillLight);
const grid = new THREE.GridHelper(12, 24, 0x403b49, 0x292a30); grid.position.y = -1.02; scene.add(grid);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.2 }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -1.03; ground.receiveShadow = true; scene.add(ground);
let model = null;
let toastTimer;
function currentConfig() {
  return {
    prompt: promptInput.value, shape: shapeSelect.value,
    dimensions: Object.fromEntries(Object.entries(dimensions).map(([key, input]) => [key, Number(input.value)])),
    color: colorInput.value, polygonBudget: Number(settings.polygonBudget.value), quality: settings.quality.value,
    roughness: Number(settings.roughness.value), smooth: settings.smooth.checked, wireframe: settings.wireframe.checked,
    variation: Number(settings.variation.value), seed: Math.max(0, Math.min(4294967295, Math.floor(Number(settings.seed.value) || 0))),
  };
}
function showToast(message) {
  const toast = $('#toast'); if (!toast) return;
  toast.textContent = message; toast.classList.add('visible'); clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3500);
}
function makeModel({ notify = true } = {}) {
  const config = currentConfig();
  const text = config.prompt.trim();
  const isCat = config.shape === 'cat' || (config.shape === 'auto' && /\b(gatto|gatta|micio|felino|cat)\b/i.test(text));
  const shape = config.shape === 'auto' ? (isCat ? 'cat' : detectShape(text)) : config.shape;
  const size = promptDimensions(text, config.dimensions);
  const explicitColor = promptColor(text);
  const color = explicitColor || semanticBaseColor(text, isCat ? 'cat' : shape, config.seed);
  colorInput.value = color;
  const textureStyle = textureStyleFromPrompt(text);
  const metallic = /metallico|metallica|acciaio|chrome/i.test(text);
  const material = new THREE.MeshStandardMaterial({ color, map: createProceduralTexture(textureStyle, color, config.seed), roughness: config.roughness, metalness: metallic ? 0.72 : 0.06, wireframe: config.wireframe, flatShading: !config.smooth });
  const next = isCat ? createCatGroup(text, config.seed, config.smooth, config.wireframe) : createShapeGroup(shape, material);
  if (isCat) { material.map?.dispose(); material.dispose(); }
  applyMeshOptions(next, { polygonBudget: config.polygonBudget, roughness: config.roughness, smoothShading: config.smooth });
  next.scale.set(size.width, size.height, size.depth); next.position.y = -1 + size.height / 2;
  next.name = (text || SHAPE_NAMES[shape] || 'Modello').slice(0, 80);
  if (model) {
    scene.remove(model);
    model.traverse((part) => { if (part.isMesh) { part.geometry?.dispose(); for (const mat of (Array.isArray(part.material) ? part.material : [part.material])) { for (const value of Object.values(mat || {})) if (value?.isTexture) value.dispose(); mat?.dispose(); } } });
  }
  model = next; scene.add(model);
  $('#model-name').textContent = model.name;
  $('#triangle-count').textContent = `${triangleCount(model).toLocaleString('it-IT')} / ${config.polygonBudget.toLocaleString('it-IT')}`;
  $('#status-text').textContent = 'Modello pronto';
  const colorNames = { '#9b87f5': 'Lavanda', '#f28c72': 'Corallo', '#64c7b5': 'Menta', '#f1bf63': 'Ambra', '#dce1ea': 'Perla' };
  $('#color-value').textContent = colorNames[color.toLowerCase()] || color.toUpperCase();
  $('#budget-value').value = config.polygonBudget.toLocaleString('it-IT');
  $('#roughness-value').value = config.roughness.toFixed(2); $('#variation-value').value = `${config.variation}%`;
  if (notify) showToast(`${SHAPE_NAMES[shape] || 'Modello'} generato · ${triangleCount(model).toLocaleString('it-IT')} triangoli`);
}
function resize() {
  const { width, height } = viewport.getBoundingClientRect(); if (!width || !height) return;
  camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false);
}
new ResizeObserver(resize).observe(viewport); window.addEventListener('resize', resize);
function animate() { requestAnimationFrame(animate); controls.update(); renderer.render(scene, camera); }
function readSaved() {
  try { const items = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); return Array.isArray(items) ? items : []; }
  catch { return []; }
}
function renderSaved() {
  const container = $('#saved-variants'); if (!container) return;
  const items = readSaved(); container.replaceChildren();
  if (!items.length) { const empty = document.createElement('p'); empty.className = 'saved-empty'; empty.textContent = 'I modelli salvati appariranno qui.'; container.append(empty); return; }
  items.forEach((item, index) => {
    const row = document.createElement('div'); row.className = 'saved-variant-row';
    const load = document.createElement('button'); load.type = 'button'; load.className = 'saved-load'; load.textContent = `${item.prompt || SHAPE_NAMES[item.shape] || 'Modello'} · seed ${item.seed ?? 42}`;
    load.addEventListener('click', () => { promptInput.value = item.prompt || ''; shapeSelect.value = item.shape || 'auto'; for (const [axis, input] of Object.entries(dimensions)) input.value = String(item.dimensions?.[axis] ?? 2); colorInput.value = item.color || '#9b87f5'; settings.seed.value = String(item.seed ?? 42); settings.polygonBudget.value = String(item.polygonBudget || 8000); settings.roughness.value = String(item.roughness ?? 0.48); settings.smooth.checked = item.smooth !== false; settings.wireframe.checked = Boolean(item.wireframe); settings.variation.value = String(item.variation ?? 20); makeModel(); });
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'saved-remove'; remove.textContent = '×'; remove.setAttribute('aria-label', 'Elimina progetto salvato');
    remove.addEventListener('click', () => { const updated = readSaved(); updated.splice(index, 1); localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); renderSaved(); });
    row.append(load, remove); container.append(row);
  });
}
function saveVariant() {
  const items = readSaved(); if (items.length >= 30) return showToast('Limite di 30 progetti salvati raggiunto.');
  items.unshift({ ...currentConfig(), id: `${Date.now()}` });
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); renderSaved(); showToast('Progetto salvato su questo dispositivo.'); }
  catch { showToast('Spazio locale insufficiente per salvare il progetto.'); }
}
function download(blob, name) { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function safeName(value) { return (value || 'modello-3d').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-') || 'modello-3d'; }
$('#generate').addEventListener('click', () => makeModel());
$('#generate-alternative')?.addEventListener('click', () => { const seed = new Uint32Array(1); crypto.getRandomValues(seed); settings.seed.value = String(seed[0]); makeModel(); });
$('#save-variant')?.addEventListener('click', saveVariant);
$('#reset-dimensions')?.addEventListener('click', () => { for (const input of Object.values(dimensions)) input.value = '2'; makeModel(); });
shapeSelect.addEventListener('change', () => makeModel());
promptInput.addEventListener('keydown', (event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') makeModel(); });
for (const input of [...Object.values(dimensions), colorInput, ...Object.values(settings)]) input?.addEventListener('change', () => makeModel({ notify: false }));
$('#export-glb')?.addEventListener('click', () => {
  if (!model) return showToast('Genera prima un modello.');
  $('#status-text').textContent = 'Creazione GLB…';
  new GLTFExporter().parse(model, (result) => { download(new Blob([result], { type: 'model/gltf-binary' }), `${safeName(model.name)}.glb`); $('#status-text').textContent = 'Modello pronto'; }, (error) => { console.error(error); showToast('Esportazione GLB non riuscita.'); });
});
$('#export-stl')?.addEventListener('click', () => {
  if (!model) return showToast('Genera prima un modello.');
  try { const result = new STLExporter().parse(model, { binary: true }); download(new Blob([result], { type: 'model/stl' }), `${safeName(model.name)}.stl`); }
  catch (error) { console.error(error); showToast('Esportazione STL non riuscita.'); }
});
$('#screenshot')?.addEventListener('click', () => renderer.domElement.toBlob((blob) => { if (blob) download(blob, `${safeName(model?.name)}.png`); }));
$('#mesh-quality')?.addEventListener('change', () => {
  const presets = { low: [1200, 0.72], medium: [8000, 0.48], high: [30000, 0.32] };
  const preset = presets[settings.quality.value]; if (preset) { settings.polygonBudget.value = String(preset[0]); settings.roughness.value = String(preset[1]); makeModel({ notify: false }); }
});
updateOutputs(); renderSaved(); resize(); makeModel({ notify: false }); animate();
function updateOutputs() { for (const [axis, input] of Object.entries(dimensions)) { const output = $(`#${axis}-value`); if (output) output.value = Number(input.value).toFixed(1); } }
