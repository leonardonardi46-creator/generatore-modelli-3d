import * as THREE from 'three';
import { createProceduralTexture } from './procedural-textures.js';

const COLOR_WORDS = [
  [/\b(rosso|rossa|rossi|rosse|red)\b/i, '#d95757'], [/\b(blu|bluette|azzurro|azzurra|blue)\b/i, '#4f79d8'],
  [/\b(verde|green)\b/i, '#54965c'], [/\b(giallo|gialla|yellow)\b/i, '#e8bd45'],
  [/\b(arancione|orange)\b/i, '#e88742'], [/\b(rosa|pink)\b/i, '#dc78a3'],
  [/\b(viola|purple)\b/i, '#7854a8'], [/\b(nero|nera|black)\b/i, '#25232d'],
  [/\b(bianco|bianca|white)\b/i, '#e9e2d5'], [/\b(grigio|grigia|gray|grey)\b/i, '#85858d'],
  [/\b(marrone|marroni|brown)\b/i, '#80583f'], [/\b(oro|dorato|dorata|gold)\b/i, '#c6a14e'],
  [/\b(argento|argentato|silver)\b/i, '#aeb8c4'], [/\b(turchese|turquoise)\b/i, '#48aaa6'],
  [/\b(crema|beige)\b/i, '#d7c3a0'],
];

function explicitColor(text, nounPattern) {
  const match = text.match(new RegExp(`(?:${nounPattern})(?:\\s+(?:da\\s+strega|di\\s+colore|colore|color)\\s+)?\\s+(rosso|rossa|rossi|rosse|red|blu|azzurro|azzurra|blue|verde|green|giallo|gialla|yellow|arancione|orange|rosa|pink|viola|purple|nero|nera|black|bianco|bianca|white|grigio|grigia|gray|grey|marrone|brown|oro|dorato|gold|argento|argentato|silver|turchese|turquoise|crema|beige)\\b`, 'i'));
  if (!match) return null;
  return COLOR_WORDS.find(([pattern]) => pattern.test(match[1]))?.[1] || null;
}

function material(color, texture, seed, roughness = 0.78, metalness = 0) {
  return new THREE.MeshStandardMaterial({
    color,
    map: createProceduralTexture(texture, color, seed),
    roughness,
    metalness,
  });
}

function addMesh(group, geometry, material, position, scale = [1, 1, 1], rotation = [0, 0, 0], name = '') {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.rotation.set(...rotation);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

export function createCatGroup(prompt, seed = 42, smooth = true, wireframe = false) {
  const text = prompt.toLocaleLowerCase('it-IT');
  const hasWitchHat = /\b(cappello|berretto|hat)\b/i.test(text) && /\b(strega|witch|magico|magica)\b/i.test(text);
  const catColor = explicitColor(text, 'gatto|gatta|micio|felino|cat') || '#bd8157';
  const hatColor = explicitColor(text, 'cappello|berretto|hat') || '#49345f';
  const fur = material(catColor, /tigrat|strisc|tabby/i.test(text) ? 'fur-stripes' : 'fur', seed, 0.92);
  fur.flatShading = !smooth;
  fur.wireframe = wireframe;
  const group = new THREE.Group();
  group.name = 'Gatto';

  // Stylized, recognizable cat assembled from individually named procedural parts.
  addMesh(group, new THREE.SphereGeometry(0.39, 32, 24), fur, [0, -0.02, 0], [0.83, 1.08, 0.63], [0, 0, 0], 'Corpo');
  addMesh(group, new THREE.SphereGeometry(0.3, 32, 24), fur, [0, 0.45, 0.02], [1, 0.94, 0.82], [0, 0, 0], 'Testa');
  const ears = [];
  for (const x of [-0.19, 0.19]) {
    const ear = addMesh(group, new THREE.ConeGeometry(0.105, 0.28, 4), fur, [x, 0.72, 0.015], [1, 1, 0.72], [0, 0, x < 0 ? 0.2 : -0.2], x < 0 ? 'Orecchio sinistro' : 'Orecchio destro');
    ears.push(ear);
  }
  for (const x of [-0.21, 0.21]) {
    addMesh(group, new THREE.SphereGeometry(0.075, 20, 14), fur, [x, -0.36, 0.015], [0.78, 1.55, 0.78], [0, 0, 0], 'Zampa');
  }
  const tailCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.22, -0.05, -0.02), new THREE.Vector3(0.48, -0.05, -0.02),
    new THREE.Vector3(0.57, 0.19, -0.02), new THREE.Vector3(0.45, 0.3, -0.02),
  ]);
  addMesh(group, new THREE.TubeGeometry(tailCurve, 28, 0.065, 10, false), fur, [0, 0, 0], [1, 1, 1], [0, 0, 0], 'Coda');

  const noseMaterial = material('#e58f96', 'smooth', seed + 2, 0.45);
  const eyeMaterial = material('#e9c85d', 'smooth', seed + 3, 0.3);
  const pupilMaterial = new THREE.MeshStandardMaterial({ color: '#211d24', roughness: 0.3 });
  addMesh(group, new THREE.SphereGeometry(0.055, 16, 12), noseMaterial, [0, 0.42, 0.276], [1, 0.72, 0.55], [0, 0, 0], 'Naso');
  for (const x of [-0.13, 0.13]) {
    addMesh(group, new THREE.SphereGeometry(0.052, 16, 12), eyeMaterial, [x, 0.53, 0.257], [1, 1, 0.55], [0, 0, 0], 'Occhio');
    addMesh(group, new THREE.SphereGeometry(0.018, 12, 8), pupilMaterial, [x, 0.53, 0.284], [1, 1, 0.6], [0, 0, 0], 'Pupilla');
  }
  const whiskerMaterial = new THREE.MeshStandardMaterial({ color: '#ddd2c4', roughness: 0.8 });
  for (const side of [-1, 1]) for (const offset of [-0.035, 0.025]) {
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.09, 0.38 + offset, 0.27),
      new THREE.Vector3(side * 0.27, 0.39 + offset, 0.27),
      new THREE.Vector3(side * 0.38, 0.42 + offset * 1.5, 0.25),
    ]);
    addMesh(group, new THREE.TubeGeometry(curve, 10, 0.006, 5, false), whiskerMaterial, [0, 0, 0], [1, 1, 1], [0, 0, 0], 'Baffi');
  }

  if (hasWitchHat) {
    const hat = material(hatColor, 'fabric', seed + 11, 0.9);
    hat.flatShading = !smooth;
    hat.wireframe = wireframe;
    const brimMaterial = material(hatColor, 'fabric', seed + 12, 0.86);
    brimMaterial.flatShading = !smooth;
    brimMaterial.wireframe = wireframe;
    // Cone sits above the ears; the wide torus is the separate brim so colors can be inferred independently.
    addMesh(group, new THREE.ConeGeometry(0.22, 0.48, 32), hat, [0, 0.88, 0.015], [1, 1, 0.82], [0, 0, -0.12], 'Cappello da strega');
    addMesh(group, new THREE.TorusGeometry(0.235, 0.045, 10, 36), brimMaterial, [0, 0.68, 0.015], [1, 1, 0.78], [Math.PI / 2, 0, 0], 'Fal ​​da cappello');
    const bandColor = /notte|witch|strega/i.test(text) ? '#d2ad54' : '#70513d';
    const band = material(bandColor, 'smooth', seed + 13, 0.48, 0.12);
    addMesh(group, new THREE.TorusGeometry(0.14, 0.018, 8, 28), band, [0, 0.78, 0.015], [1, 1, 0.82], [Math.PI / 2, 0, 0], 'Fascia del cappello');
    if (/stella|stelle|stellato|stellata/i.test(text)) {
      const stars = new THREE.MeshStandardMaterial({ color: '#efcf69', roughness: 0.42, metalness: 0.18 });
      for (const [x, y] of [[-0.09, 0.84], [0.07, 0.96], [0.12, 0.81]]) addMesh(group, new THREE.OctahedronGeometry(0.027, 0), stars, [x, y, 0.19], [1, 1, 0.45], [0, 0, 0], 'Decorazione stella');
    }
  }

  group.userData = { objectType: 'cat', hasWitchHat };
  return group;
}
