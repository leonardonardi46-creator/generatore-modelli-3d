import * as THREE from 'three';
import { createShapeGroup, detectShape, promptColor, promptDimensions, SHAPE_NAMES } from './shape-library.js';
import { createCatGroup } from './prompt-objects.js';
import { applyMeshOptions } from './model-options.js';
import { semanticBaseColor } from './procedural-textures.js';

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => { state += 0x6D2B79F5; let t = state; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function varyParts(root, seed, amount) {
  if (!amount) return;
  const random = seededRandom(seed); const strength = amount / 100; const meshes = [];
  root.traverse((object) => { if (object.isMesh) meshes.push(object); });
  for (const mesh of meshes) {
    const spread = strength * 0.24;
    mesh.scale.x *= 1 + (random() * 2 - 1) * spread;
    mesh.scale.y *= 1 + (random() * 2 - 1) * spread;
    mesh.scale.z *= 1 + (random() * 2 - 1) * spread;
    const offset = strength * 0.03;
    mesh.position.x += (random() * 2 - 1) * offset;
    mesh.position.y += (random() * 2 - 1) * offset;
    mesh.position.z += (random() * 2 - 1) * offset;
  }
}
function serializeModel(root) {
  root.updateMatrixWorld(true);
  const meshes = []; const transfers = [];
  root.traverse((object) => {
    if (!object.isMesh) return;
    const geometry = object.geometry.clone();
    geometry.applyMatrix4(object.matrixWorld);
    const position = geometry.getAttribute('position');
    const normal = geometry.getAttribute('normal');
    const uv = geometry.getAttribute('uv');
    const positions = new Float32Array(position.array);
    const normals = normal ? new Float32Array(normal.array) : null;
    const uvs = uv ? new Float32Array(uv.array) : null;
    const sourceIndex = geometry.getIndex();
    const indices = sourceIndex ? new Uint32Array(sourceIndex.array) : null;
    const material = Array.isArray(object.material) ? object.material[0] : object.material;
    const item = { positions, normals, uvs, indices, color: `#${material.color.getHexString()}`, roughness: material.roughness, metalness: material.metalness, flatShading: material.flatShading, wireframe: material.wireframe, name: object.name };
    meshes.push(item);
    transfers.push(positions.buffer);
    if (normals) transfers.push(normals.buffer);
    if (uvs) transfers.push(uvs.buffer);
    if (indices) transfers.push(indices.buffer);
    geometry.dispose();
  });
  return { meshes, transfers };
}
self.onmessage = (event) => {
  const { id, config } = event.data;
  try {
    const text = (config.prompt || '').trim();
    const isCat = config.shape === 'cat' || (config.shape === 'auto' && /\b(gatto|gatta|micio|felino|cat)\b/i.test(text));
    const shape = config.shape === 'auto' ? (isCat ? 'cat' : detectShape(text)) : config.shape;
    const size = promptDimensions(text, config.dimensions || { width: 2, height: 2, depth: 2 });
    const color = promptColor(text) || semanticBaseColor(text, isCat ? 'cat' : shape, config.seed);
    const material = new THREE.MeshStandardMaterial({ color, roughness: config.roughness, metalness: /metallico|metallica|metallo|acciaio|chrome/i.test(text) ? 0.7 : 0.05, flatShading: !config.smooth, wireframe: config.wireframe });
    const root = isCat ? createCatGroup(text, config.seed, config.smooth, config.wireframe) : createShapeGroup(shape, material);
    if (isCat) material.dispose();
    varyParts(root, config.seed, config.variation);
    applyMeshOptions(root, { polygonBudget: config.polygonBudget, roughness: config.roughness, smoothShading: config.smooth });
    root.scale.set(size.width, size.height, size.depth);
    root.position.y = -1 + size.height / 2;
    root.name = (text || SHAPE_NAMES[shape] || 'Modello').slice(0, 80);
    const result = serializeModel(root);
    self.postMessage({ id, ok: true, modelName: root.name, shapeName: SHAPE_NAMES[shape] || 'Gatto', triangleCount: result.meshes.reduce((sum, mesh) => sum + (mesh.indices?.length || mesh.positions.length) / 3, 0), meshes: result.meshes }, result.transfers);
    root.traverse((object) => { if (object.isMesh) { object.geometry.dispose(); for (const material of (Array.isArray(object.material) ? object.material : [object.material])) material.dispose(); } });
  } catch (error) {
    self.postMessage({ id, ok: false, error: error instanceof Error ? error.message : String(error) });
  }
};
