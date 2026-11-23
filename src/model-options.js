import { SimplifyModifier } from 'three/addons/modifiers/SimplifyModifier.js';

const modifier = new SimplifyModifier();

export function triangleCount(root) {
  let count = 0;
  root.traverse((object) => {
    if (!object.isMesh) return;
    const geometry = object.geometry;
    const index = geometry.getIndex();
    const positions = geometry.getAttribute('position');
    if (positions) count += index ? Math.floor(index.count / 3) : Math.floor(positions.count / 3);
  });
  return count;
}

/** Reduce triangle count locally, distributing the requested budget among mesh parts. */
export function applyMeshOptions(root, { polygonBudget, roughness, smoothShading }) {
  const meshes = [];
  root.traverse((object) => { if (object.isMesh) meshes.push(object); });
  const originalTotal = triangleCount(root);

  for (const mesh of meshes) {
    const materialList = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materialList) {
      material.roughness = roughness;
      material.flatShading = !smoothShading;
      material.needsUpdate = true;
    }
  }

  if (originalTotal > polygonBudget && meshes.length) {
    for (const mesh of meshes) {
      const geometry = mesh.geometry;
      const position = geometry.getAttribute('position');
      if (!position) continue;
      const index = geometry.getIndex();
      const meshFaces = index ? Math.floor(index.count / 3) : Math.floor(position.count / 3);
      if (meshFaces <= 4) continue;
      const allowedFaces = Math.max(4, Math.floor(polygonBudget * meshFaces / originalTotal));
      if (meshFaces <= allowedFaces) continue;
      const collapseCount = Math.min(position.count - 4, Math.max(1, Math.ceil((meshFaces - allowedFaces) / 2)));
      if (collapseCount <= 0) continue;
      try {
        const reduced = modifier.modify(geometry, collapseCount);
        reduced.computeVertexNormals();
        mesh.geometry = reduced;
        geometry.dispose();
      } catch (error) {
        console.warn('Riduzione poligonale non applicata a una parte:', error);
      }
    }
  }

  return { original: originalTotal, actual: triangleCount(root), budget: polygonBudget };
}
