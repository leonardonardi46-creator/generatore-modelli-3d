import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import { createShapeGroup, detectShape, promptColor, promptDimensions, SHAPE_CATEGORIES, SHAPE_NAMES } from './shape-library.js';
import { applyMeshOptions, triangleCount } from './model-options.js';
import './style.css';
import './options.css';

const $ = (selector) => document.querySelector(selector);
const viewport = $('#viewport');
const promptInput = $('#prompt');
const shapeSelect = $('#shape');
const dimensions = { width: $('#width'), height: $('#height'), depth: $('#depth') };
const colorInput = $('#color');
const statusText = $('#status-text');
const toast = $('#toast');
const loading = $('#loading');
const settings = {
  polygonBudget: $('#polygon-budget'), quality: $('#mesh-quality'), smooth: $('#smooth-shading'),
  wireframe: $('#wireframe'), roughness: $('#surface-roughness'), variation: $('#variation'), seed: $('#seed'),
};
const STORAGE_KEY = 'forma-saved-variants-v1';

for (const category of SHAPE_CATEGORIES) {
  const optgroup = document.createElement('optgroup'); optgroup.label = category.label;
  for (const [value, label] of category.shapes) {
    const option = document.createElement('option'); option.value = value; option.textContent = label; optgroup.appendChild(option);
  }
  shapeSelect.appendChild(optgroup);
}

const scene = new THREE.Scene();
scene.background = new THREE.Color('#15171b');
const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
camera.position.set(6.7, 5.3, 7.6);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, preserveDrawingBuffer: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
renderer.domElement.setAttribute('aria-label', 'Anteprima 3D del modello generato'); viewport.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.07; controls.minDistance = 3.5; controls.maxDistance = 18; controls.target.set(0, 0.15, 0);
scene.add(new THREE.HemisphereLight(0xe4e2ff, 0x38333e, 2.1));
const keyLight = new THREE.DirectionalLight(0xffffff, 3.2); keyLight.position.set(4, 7, 5); keyLight.castShadow = true; keyLight.shadow.mapSize.set(1024, 1024); scene.add(keyLight);
const fillLight = new THREE.PointLight(0xa58cff, 24, 20); fillLight.position.set(-4, 2, -3); scene.add(fillLight);
const grid = new THREE.GridHelper(12, 24, 0x403b49, 0x292a30); grid.position.y = -1.02; scene.add(grid);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.2 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -1.03; ground.receiveShadow = true; scene.add(ground);

let model = null;
let toastTimer;
let lastTriangleStats = { original: 0, actual: 0, budget: Number(settings.polygonBudget.value) };
function dimensionsValue() { return Object.fromEntries(Object.entries(dimensions).map(([key, input]) => [key, Number(input.value)])); }
function currentConfig() {
  return {
    prompt: promptInput.value, shape: shapeSelect.value, dimensions: dimensionsValue(), color: colorInput.value,
    polygonBudget: Number(settings.polygonBudget.value), quality: settings.quality.value,
    roughness: Number(settings.roughness.value), smooth: settings.smooth.checked, wireframe: settings.wireframe.checked,
    variation: Number(settings.variation.value), seed: normalizeSeed(settings.seed.value),
  };
}
function normalizeSeed(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.min(4294967295, Math.floor(numeric))) : 42;
}
function seededRandom(seed) {
  let state = seed >>> 0;
  return () => { state += 0x6D2B79F5; let t = state; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function applyProceduralVariation(root, seed, amount) {
  if (!amount) return;
  const random = seededRandom(seed);
  const strength = amount / 100;
  const meshes = [];
  root.traverse((object) => { if (object.isMesh) meshes.push(object); });
  for (const mesh of meshes) {
    // Deterministic, bounded part-level variation keeps object recipes recognizable.
    const scaleSpread = 1 + strength * 0.34;
    mesh.scale.x *= 1 + (random() * 2 - 1) * (scaleSpread - 1);
    mesh.scale.y *= 1 + (random() * 2 - 1) * (scaleSpread - 1);
    mesh.scale.z *= 1 + (random() * 2 - 1) * (scaleSpread - 1);
    const positionSpread = strength * 0.035;
    mesh.position.x += (random() * 2 - 1) * positionSpread;
    mesh.position.y += (random() * 2 - 1) * positionSpread;
    mesh.position.z += (random() * 2 - 1) * positionSpread;
    if (meshes.length > 1 && strength > 0.65) {
      const angle = (random() * 2 - 1) * strength * 0.055;
      mesh.rotation.y += angle;
    }
  }
}
function disposeObject(object) {
  object.traverse((child) => {
    if (!child.isMesh) return;
    child.geometry.dispose();
    if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose()); else child.material.dispose();
  });
}
function readOptions() {
  return { polygonBudget: Number(settings.polygonBudget.value), roughness: Number(settings.roughness.value), smoothShading: settings.smooth.checked, wireframe: settings.wireframe.checked };
}
function makeModel({ notify = true } = {}) {
  const config = currentConfig();
  const text = config.prompt.trim();
  const shape = config.shape === 'auto' ? detectShape(text) : config.shape;
  const size = promptDimensions(text, config.dimensions);
  const detectedColor = promptColor(text);
  if (detectedColor) { colorInput.value = detectedColor; config.color = detectedColor; }
  updateColorLabel();
  const metallic = /metallico|metallica|metal|acciaio|chrome/i.test(text);
  const material = new THREE.MeshStandardMaterial({ color: config.color, roughness: config.roughness, metalness: metallic ? 0.72 : 0.06, wireframe: config.wireframe, flatShading: !config.smooth });
  const nextModel = createShapeGroup(shape, material);
  applyProceduralVariation(nextModel, config.seed, config.variation);
  lastTriangleStats = applyMeshOptions(nextModel, readOptions());
  nextModel.scale.set(size.width, size.height, size.depth);
  nextModel.position.y = -1 + size.height / 2;
  nextModel.name = (text || SHAPE_NAMES[shape] || 'Modello').slice(0, 80);
  if (model) { scene.remove(model); disposeObject(model); }
  model = nextModel; scene.add(model);
  $('#model-name').textContent = model.name;
  updateMeshStats(); statusText.textContent = 'Modello pronto';
  if (notify) showToast(`${SHAPE_NAMES[shape] || 'Forma'} · seed ${config.seed} · ${lastTriangleStats.actual.toLocaleString('it-IT')} triangoli`);
}
function updateMeshStats() {
  const count = model ? triangleCount(model) : 0;
  $('#triangle-count').textContent = `${count.toLocaleString('it-IT')} / ${Number(settings.polygonBudget.value).toLocaleString('it-IT')}`;
  $('#triangle-count').title = `Triangoli correnti: ${count}; budget richiesto: ${settings.polygonBudget.value}`;
  $('#budget-value').value = Number(settings.polygonBudget.value).toLocaleString('it-IT');
  $('#roughness-value').value = Number(settings.roughness.value).toFixed(2);
  $('#variation-value').value = `${settings.variation.value}%`;
}
function resizeRenderer() { const { width, height } = viewport.getBoundingClientRect(); if (!width || !height) return; camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false); }
const resizeObserver = new ResizeObserver(resizeRenderer); resizeObserver.observe(viewport); window.addEventListener('resize', resizeRenderer);
function animate() { controls.update(); renderer.render(scene, camera); requestAnimationFrame(animate); }
function showToast(message) { toast.textContent = message; toast.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('visible'), 3200); }
function setExporting(isExporting, message = '') { loading.hidden = !isExporting; statusText.textContent = message || (isExporting ? 'Esportazione…' : 'Modello pronto'); $('#export-glb').disabled = isExporting; $('#export-stl').disabled = isExporting; $('#screenshot').disabled = isExporting; }
function downloadBlob(blob, filename) { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function safeFilename(value) { return value.toLocaleLowerCase('it-IT').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'modello-3d'; }
function exportGLB() {
  if (!model) return showToast('Genera prima un modello.');
  setExporting(true, 'Creazione GLB…');
  new GLTFExporter().parse(model, (result) => { downloadBlob(new Blob([result], { type: 'model/gltf-binary' }), `${safeFilename(model.name)}-seed-${normalizeSeed(settings.seed.value)}.glb`); setExporting(false); showToast('File GLB scaricato'); }, (error) => { console.error(error); setExporting(false); showToast('Esportazione GLB non riuscita. Riprova.'); }, { binary: true });
}
function exportSTL() {
  if (!model) return showToast('Genera prima un modello.');
  setExporting(true, 'Creazione STL…');
  try { const data = new STLExporter().parse(model, { binary: true }); const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength); downloadBlob(new Blob([buffer], { type: 'model/stl' }), `${safeFilename(model.name)}-seed-${normalizeSeed(settings.seed.value)}.stl`); setExporting(false); showToast('File STL scaricato'); }
  catch (error) { console.error(error); setExporting(false); showToast('Esportazione STL non riuscita. Riprova.'); }
}
function updateRangeOutputs() { for (const [key, input] of Object.entries(dimensions)) $(`#${key}-value`).value = Number(input.value).toFixed(1); }
function updateColorLabel() {
  const hex = colorInput.value.toLowerCase(); const names = { '#9b87f5': 'Lavanda', '#f28c72': 'Corallo', '#64c7b5': 'Menta', '#f1bf63': 'Ambra', '#dce1ea': 'Perla' };
  $('#color-value').textContent = names[hex] || hex.toUpperCase();
}
function applyQualityPreset() {
  const presets = { low: { budget: 1200, roughness: 0.72 }, medium: { budget: 8000, roughness: 0.48 }, high: { budget: 30000, roughness: 0.32 } };
  const preset = presets[settings.quality.value]; if (!preset) return;
  settings.polygonBudget.value = String(preset.budget); settings.roughness.value = String(preset.roughness); makeModel({ notify: false });
}
function readSavedVariants() {
  try { const values = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); return Array.isArray(values) ? values.filter((item) => item && typeof item.prompt === 'string') : []; }
  catch { return []; }
}
function renderSavedVariants() {
  const container = $('#saved-variants'); container.replaceChildren();
  const variants = readSavedVariants();
  if (!variants.length) { const empty = document.createElement('p'); empty.className = 'saved-empty'; empty.textContent = 'I modelli salvati appariranno qui.'; container.appendChild(empty); return; }
  variants.forEach((item, index) => {
    const row = document.createElement('div'); row.className = 'saved-variant-row';
    const load = document.createElement('button'); load.type = 'button'; load.className = 'saved-load'; load.textContent = `${item.prompt || SHAPE_NAMES[item.shape] || 'Modello'} · #${item.seed}`; load.title = 'Carica questa configurazione';
    load.addEventListener('click', () => loadVariant(item));
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'saved-remove'; remove.textContent = '×'; remove.setAttribute('aria-label', 'Elimina modello salvato');
    remove.addEventListener('click', () => { const updated = readSavedVariants(); updated.splice(index, 1); localStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); renderSavedVariants(); });
    row.append(load, remove); container.appendChild(row);
  });
}
function saveVariant() {
  const config = currentConfig();
  const variants = readSavedVariants();
  if (variants.length >= 30) return showToast('Hai raggiunto il limite di 30 modelli salvati. Elimina un elemento per salvarne un altro.');
  variants.unshift({ ...config, id: `${Date.now()}-${config.seed}` });
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(variants)); renderSavedVariants(); showToast('Configurazione salvata su questo dispositivo'); }
  catch { showToast('Spazio locale non disponibile: impossibile salvare.'); }
}
function loadVariant(item) {
  promptInput.value = item.prompt || ''; shapeSelect.value = item.shape || 'auto';
  if (item.dimensions) for (const [key, input] of Object.entries(dimensions)) input.value = String(item.dimensions[key] ?? 2);
  colorInput.value = item.color || '#9b87f5'; settings.polygonBudget.value = String(item.polygonBudget || 8000);
  settings.quality.value = item.quality || 'custom'; settings.roughness.value = String(item.roughness ?? 0.48);
  settings.smooth.checked = item.smooth !== false; settings.wireframe.checked = Boolean(item.wireframe);
  settings.variation.value = String(item.variation ?? 20); settings.seed.value = String(normalizeSeed(item.seed));
  updateRangeOutputs(); updateColorLabel(); makeModel();
}
function randomizeSeed() {
  const value = new Uint32Array(1);
  if (globalThis.crypto?.getRandomValues) crypto.getRandomValues(value); else value[0] = Math.floor(Math.random() * 4294967296);
  settings.seed.value = String(value[0]); makeModel();
}

$('#generate').addEventListener('click', () => makeModel());
$('#reset-dimensions').addEventListener('click', () => { dimensions.width.value = '2'; dimensions.height.value = '2'; dimensions.depth.value = '2'; updateRangeOutputs(); makeModel(); });
Object.values(dimensions).forEach((input) => input.addEventListener('input', updateRangeOutputs));
colorInput.addEventListener('input', () => { updateColorLabel(); if (model) makeModel({ notify: false }); });
shapeSelect.addEventListener('change', () => makeModel());
promptInput.addEventListener('keydown', (event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') makeModel(); });
settings.quality.addEventListener('change', applyQualityPreset);
settings.polygonBudget.addEventListener('input', () => { settings.quality.value = 'custom'; updateMeshStats(); });
settings.roughness.addEventListener('input', () => { settings.quality.value = 'custom'; updateMeshStats(); });
settings.polygonBudget.addEventListener('change', () => makeModel({ notify: false }));
settings.roughness.addEventListener('change', () => makeModel({ notify: false }));
settings.smooth.addEventListener('change', () => makeModel({ notify: false }));
settings.wireframe.addEventListener('change', () => makeModel({ notify: false }));
settings.variation.addEventListener('input', updateMeshStats);
settings.variation.addEventListener('change', () => makeModel({ notify: false }));
settings.seed.addEventListener('change', () => { settings.seed.value = String(normalizeSeed(settings.seed.value)); makeModel({ notify: false }); });
$('#random-seed').addEventListener('click', randomizeSeed);
$('#save-variant').addEventListener('click', saveVariant);
$('#export-glb').addEventListener('click', exportGLB); $('#export-stl').addEventListener('click', exportSTL);
$('#screenshot').addEventListener('click', () => renderer.domElement.toBlob((blob) => { if (blob) { downloadBlob(blob, `${safeFilename(model?.name || 'anteprima')}-seed-${normalizeSeed(settings.seed.value)}.png`); showToast('Immagine PNG scaricata'); } else showToast('Impossibile creare l’immagine.'); }, 'image/png'));

updateRangeOutputs(); updateColorLabel(); renderSavedVariants(); updateMeshStats(); resizeRenderer(); makeModel({ notify: false }); animate();
