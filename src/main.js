import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import './style.css';

const $ = (selector) => document.querySelector(selector);
const viewport = $('#viewport');
const promptInput = $('#prompt');
const shapeSelect = $('#shape');
const dimensions = { width: $('#width'), height: $('#height'), depth: $('#depth') };
const colorInput = $('#color');
const statusText = $('#status-text');
const toast = $('#toast');
const loading = $('#loading');

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
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 3.5;
controls.maxDistance = 18;
controls.target.set(0, 0.15, 0);

scene.add(new THREE.HemisphereLight(0xe4e2ff, 0x38333e, 2.1));
const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
keyLight.position.set(4, 7, 5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
scene.add(keyLight);
const fillLight = new THREE.PointLight(0xa58cff, 24, 20);
fillLight.position.set(-4, 2, -3);
scene.add(fillLight);

const grid = new THREE.GridHelper(12, 24, 0x403b49, 0x292a30);
grid.position.y = -1.02;
scene.add(grid);
const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.2 }));
ground.rotation.x = -Math.PI / 2;
ground.position.y = -1.03;
ground.receiveShadow = true;
scene.add(ground);

let model = null;
let toastTimer;
let currentShape = 'box';

function dimensionsValue() {
  return Object.fromEntries(Object.entries(dimensions).map(([key, input]) => [key, Number(input.value)]));
}

function detectShape(text) {
  const normalized = text.toLocaleLowerCase('it-IT');
  if (/\b(sfera|palla|sphere|ball)\b/.test(normalized)) return 'sphere';
  if (/\b(cilindro|cylinder)\b/.test(normalized)) return 'cylinder';
  if (/\b(cono|cone)\b/.test(normalized)) return 'cone';
  if (/\b(toro|ciambella|donut|torus)\b/.test(normalized)) return 'torus';
  return 'box';
}

function geometryFor(shape, { width, height, depth }) {
  const segments = 48;
  switch (shape) {
    case 'sphere': return new THREE.SphereGeometry(0.5, segments, 32);
    case 'cylinder': return new THREE.CylinderGeometry(0.5, 0.5, 1, segments, 1);
    case 'cone': return new THREE.ConeGeometry(0.5, 1, segments, 1);
    case 'torus': return new THREE.TorusGeometry(0.34, 0.16, 20, segments);
    default: return new THREE.BoxGeometry(1, 1, 1);
  }
}

function shapeTitle(shape) {
  return ({ box: 'Parallelepipedo', sphere: 'Sfera', cylinder: 'Cilindro', cone: 'Cono', torus: 'Toro' })[shape] || 'Modello';
}

function makeModel() {
  const chosenShape = shapeSelect.value === 'auto' ? detectShape(promptInput.value) : shapeSelect.value;
  const { width, height, depth } = dimensionsValue();
  const geometry = geometryFor(chosenShape, { width, height, depth });
  const material = new THREE.MeshStandardMaterial({ color: colorInput.value, roughness: 0.34, metalness: 0.08 });
  const nextModel = new THREE.Mesh(geometry, material);
  nextModel.scale.set(width, height, depth);
  nextModel.castShadow = true;
  nextModel.receiveShadow = true;
  nextModel.position.y = -1 + height / 2;
  nextModel.name = (promptInput.value.trim() || shapeTitle(chosenShape)).slice(0, 80);

  if (model) {
    scene.remove(model);
    model.geometry.dispose();
    model.material.dispose();
  }
  model = nextModel;
  currentShape = chosenShape;
  scene.add(model);
  $('#model-name').textContent = model.name;
  statusText.textContent = 'Modello pronto';
  showToast(`${shapeTitle(chosenShape)} creato nel browser`);
}

function resizeRenderer() {
  const { width, height } = viewport.getBoundingClientRect();
  if (!width || !height) return;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
}

const resizeObserver = new ResizeObserver(resizeRenderer);
resizeObserver.observe(viewport);
window.addEventListener('resize', resizeRenderer);

function animate() {
  controls.update();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2600);
}

function setExporting(isExporting, message = '') {
  loading.hidden = !isExporting;
  statusText.textContent = message || (isExporting ? 'Esportazione…' : 'Modello pronto');
  $('#export-glb').disabled = isExporting;
  $('#export-stl').disabled = isExporting;
  $('#screenshot').disabled = isExporting;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeFilename(value) {
  return value.toLocaleLowerCase('it-IT').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'modello-3d';
}

function exportGLB() {
  if (!model) return showToast('Genera prima un modello.');
  setExporting(true, 'Creazione GLB…');
  const exporter = new GLTFExporter();
  exporter.parse(scene, (result) => {
    const blob = new Blob([result], { type: 'model/gltf-binary' });
    downloadBlob(blob, `${safeFilename(model.name)}.glb`);
    setExporting(false);
    showToast('File GLB scaricato');
  }, (error) => {
    console.error('Esportazione GLB non riuscita:', error);
    setExporting(false);
    showToast('Esportazione GLB non riuscita. Riprova.');
  }, { binary: true, onlyVisible: true });
}

function exportSTL() {
  if (!model) return showToast('Genera prima un modello.');
  setExporting(true, 'Creazione STL…');
  try {
    const data = new STLExporter().parse(model, { binary: true });
    const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
    downloadBlob(new Blob([buffer], { type: 'model/stl' }), `${safeFilename(model.name)}.stl`);
    setExporting(false);
    showToast('File STL scaricato');
  } catch (error) {
    console.error('Esportazione STL non riuscita:', error);
    setExporting(false);
    showToast('Esportazione STL non riuscita. Riprova.');
  }
}

function updateRangeOutputs() {
  for (const [key, input] of Object.entries(dimensions)) $(`#${key}-value`).value = Number(input.value).toFixed(1);
}

function updateColorLabel() {
  const hex = colorInput.value.toLowerCase();
  const names = { '#9b87f5': 'Lavanda', '#f28c72': 'Corallo', '#64c7b5': 'Menta', '#f1bf63': 'Ambra', '#dce1ea': 'Perla' };
  $('#color-value').textContent = names[hex] || hex.toUpperCase();
}

$('#generate').addEventListener('click', makeModel);
$('#reset-dimensions').addEventListener('click', () => {
  dimensions.width.value = '2'; dimensions.height.value = '2'; dimensions.depth.value = '2';
  updateRangeOutputs();
  makeModel();
});
Object.values(dimensions).forEach((input) => input.addEventListener('input', updateRangeOutputs));
colorInput.addEventListener('input', updateColorLabel);
$('#export-glb').addEventListener('click', exportGLB);
$('#export-stl').addEventListener('click', exportSTL);
$('#screenshot').addEventListener('click', () => {
  renderer.domElement.toBlob((blob) => {
    if (blob) { downloadBlob(blob, `${safeFilename(model?.name || 'anteprima')}.png`); showToast('Immagine PNG scaricata'); }
    else showToast('Impossibile creare l’immagine.');
  }, 'image/png');
});

updateRangeOutputs();
updateColorLabel();
resizeRenderer();
makeModel();
animate();
