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
  wireframe: $('#wireframe'), roughness: $('#surface-roughness'),
};

for (const category of SHAPE_CATEGORIES) {
  const optgroup = document.createElement('optgroup');
  optgroup.label = category.label;
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
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.domElement.setAttribute('aria-label', 'Anteprima 3D del modello generato');
viewport.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; controls.dampingFactor = 0.07; controls.minDistance = 3.5; controls.maxDistance = 18;
controls.target.set(0, 0.15, 0);
scene.add(new THREE.HemisphereLight(0xe4e2ff, 0x38333e, 2.1));
const keyLight = new THREE.DirectionalLight(0xffffff, 3.2); keyLight.position.set(4, 7, 5); keyLight.castShadow = true; keyLight.shadow.mapSize.set(1024, 1024); scene.add(keyLight);
const fillLight = new THREE.PointLight(0xa58cff, 24, 20); fillLight.position.set(-4, 2, -3); scene.add(fillLight);
const grid = new THREE.GridHelper(12, 24, 0x403b49, 0x292a30); grid.position.y = -1.02; scene.add(grid);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.2 })); ground.rotation.x = -Math.PI / 2; ground.position.y = -1.03; ground.receiveShadow = true; scene.add(ground);

let model = null;
let toastTimer;
let lastTriangleStats = { original: 0, actual: 0, budget: Number(settings.polygonBudget.value) };

function dimensionsValue() { return Object.fromEntries(Object.entries(dimensions).map(([key, input]) => [key, Number(input.value)])); }
function disposeObject(object) {
  object.traverse((child) => {
    if (!child.isMesh) return;
    child.geometry.dispose();
    if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose()); else child.material.dispose();
  });
}
function readOptions() {
  const budget = Number(settings.polygonBudget.value);
  const quality = settings.quality.value;
  return {
    polygonBudget: budget,
    roughness: Number(settings.roughness.value),
    smoothShading: settings.smooth.checked,
    wireframe: settings.wireframe.checked,
    quality,
  };
}
function makeModel({ notify = true } = {}) {
  const text = promptInput.value.trim();
  const shape = shapeSelect.value === 'auto' ? detectShape(text) : shapeSelect.value;
  const size = promptDimensions(text, dimensionsValue());
  const detectedColor = promptColor(text);
  if (detectedColor) colorInput.value = detectedColor;
  updateColorLabel();

  const options = readOptions();
  const metallic = /metallico|metallica|metal|acciaio|chrome/i.test(text);
  const material = new THREE.MeshStandardMaterial({ color: colorInput.value, roughness: options.roughness, metalness: metallic ? 0.72 : 0.06, wireframe: options.wireframe, flatShading: !options.smoothShading });
  const nextModel = createShapeGroup(shape, material);
  // The target polycount is applied before object scaling; exports use this same optimized geometry.
  lastTriangleStats = applyMeshOptions(nextModel, options);
  nextModel.scale.set(size.width, size.height, size.depth);
  nextModel.position.y = -1 + size.height / 2;
  nextModel.name = (text || SHAPE_NAMES[shape] || 'Modello').slice(0, 80);

  if (model) { scene.remove(model); disposeObject(model); }
  model = nextModel; scene.add(model);
  $('#model-name').textContent = model.name;
  updateMeshStats();
  statusText.textContent = 'Modello pronto';
  if (notify) showToast(`${SHAPE_NAMES[shape] || 'Forma'} generata · ${lastTriangleStats.actual.toLocaleString('it-IT')} triangoli`);
}
function updateMeshStats() {
  const count = triangleCount(model || new THREE.Group());
  $('#triangle-count').textContent = `${count.toLocaleString('it-IT')} / ${Number(settings.polygonBudget.value).toLocaleString('it-IT')}`;
  $('#triangle-count').title = `Triangoli effettivi: ${count}; budget richiesto: ${settings.polygonBudget.value}`;
  $('#budget-value').value = Number(settings.polygonBudget.value).toLocaleString('it-IT');
  $('#roughness-value').value = Number(settings.roughness.value).toFixed(2);
}
function resizeRenderer() {
  const { width, height } = viewport.getBoundingClientRect(); if (!width || !height) return;
  camera.aspect = width / height; camera.updateProjectionMatrix(); renderer.setSize(width, height, false);
}
const resizeObserver = new ResizeObserver(resizeRenderer); resizeObserver.observe(viewport); window.addEventListener('resize', resizeRenderer);
function animate() { controls.update(); renderer.render(scene, camera); requestAnimationFrame(animate); }
function showToast(message) { toast.textContent = message; toast.classList.add('visible'); clearTimeout(toastTimer); toastTimer = setTimeout(() => toast.classList.remove('visible'), 3200); }
function setExporting(isExporting, message = '') {
  loading.hidden = !isExporting; statusText.textContent = message || (isExporting ? 'Esportazione…' : 'Modello pronto');
  $('#export-glb').disabled = isExporting; $('#export-stl').disabled = isExporting; $('#screenshot').disabled = isExporting;
}
function downloadBlob(blob, filename) { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function safeFilename(value) { return value.toLocaleLowerCase('it-IT').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'modello-3d'; }
function exportGLB() {
  if (!model) return showToast('Genera prima un modello.');
  setExporting(true, 'Creazione GLB…');
  new GLTFExporter().parse(model, (result) => { downloadBlob(new Blob([result], { type: 'model/gltf-binary' }), `${safeFilename(model.name)}.glb`); setExporting(false); showToast('File GLB scaricato'); }, (error) => { console.error(error); setExporting(false); showToast('Esportazione GLB non riuscita. Riprova.'); }, { binary: true });
}
function exportSTL() {
  if (!model) return showToast('Genera prima un modello.');
  setExporting(true, 'Creazione STL…');
  try { const data = new STLExporter().parse(model, { binary: true }); const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength); downloadBlob(new Blob([buffer], { type: 'model/stl' }), `${safeFilename(model.name)}.stl`); setExporting(false); showToast('File STL scaricato'); }
  catch (error) { console.error(error); setExporting(false); showToast('Esportazione STL non riuscita. Riprova.'); }
}
function updateRangeOutputs() { for (const [key, input] of Object.entries(dimensions)) $(`#${key}-value`).value = Number(input.value).toFixed(1); }
function updateColorLabel() {
  const hex = colorInput.value.toLowerCase(); const names = { '#9b87f5': 'Lavanda', '#f28c72': 'Corallo', '#64c7b5': 'Menta', '#f1bf63': 'Ambra', '#dce1ea': 'Perla' };
  $('#color-value').textContent = names[hex] || hex.toUpperCase();
}
function applyQualityPreset() {
  const presets = { low: { budget: 1200, roughness: 0.72 }, medium: { budget: 8000, roughness: 0.48 }, high: { budget: 30000, roughness: 0.32 } };
  const preset = presets[settings.quality.value];
  if (!preset) return;
  settings.polygonBudget.value = String(preset.budget); settings.roughness.value = String(preset.roughness);
  updateMeshStats(); makeModel({ notify: false });
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
for (const control of [settings.polygonBudget, settings.smooth, settings.wireframe, settings.roughness]) control.addEventListener('change', () => { settings.quality.value = settings.quality.value === 'custom' ? 'custom' : settings.quality.value; if (model) makeModel({ notify: false }); });
$('#export-glb').addEventListener('click', exportGLB); $('#export-stl').addEventListener('click', exportSTL);
$('#screenshot').addEventListener('click', () => renderer.domElement.toBlob((blob) => { if (blob) { downloadBlob(blob, `${safeFilename(model?.name || 'anteprima')}.png`); showToast('Immagine PNG scaricata'); } else showToast('Impossibile creare l’immagine.'); }, 'image/png'));

updateRangeOutputs(); updateColorLabel(); updateMeshStats(); resizeRenderer(); makeModel({ notify: false }); animate();
