import * as THREE from 'three';

export const SHAPE_CATEGORIES = [
  { label: 'Base', shapes: [['auto', 'Rileva dal prompt'], ['box', 'Cubo / parallelepipedo'], ['sphere', 'Sfera'], ['ellipsoid', 'Ellissoide'], ['cylinder', 'Cilindro'], ['cone', 'Cono'], ['capsule', 'Capsula'], ['torus', 'Toro / ciambella'], ['ring', 'Anello'], ['tube', 'Tubo curvo']] },
  { label: 'Poliedri', shapes: [['tetrahedron', 'Tetraedro'], ['octahedron', 'Ottaedro'], ['icosahedron', 'Icosaedro'], ['dodecahedron', 'Dodecaedro'], ['pyramid', 'Piramide'], ['triangular-prism', 'Prisma triangolare'], ['hex-prism', 'Prisma esagonale'], ['octagonal-prism', 'Prisma ottagonale']] },
  { label: 'Forme speciali', shapes: [['heart', 'Cuore'], ['star', 'Stella'], ['gear', 'Ingranaggio'], ['spring', 'Molla'], ['bowl', 'Ciotola'], ['vase', 'Vaso'], ['torus-knot', 'Nodo toroidale']] },
  { label: 'Oggetti composti', shapes: [['tree', 'Albero'], ['house', 'Casa'], ['snowman', 'Pupazzo di neve'], ['rocket', 'Razzo'], ['table', 'Tavolo'], ['chair', 'Sedia'], ['car', 'Auto'], ['lamp', 'Lampada'], ['mug', 'Tazza']] },
];

export const SHAPE_NAMES = Object.fromEntries(SHAPE_CATEGORIES.flatMap((category) => category.shapes).map(([id, name]) => [id, name]));

const WORDS = {
  tree: /\b(albero|abete|pino|tree|pine tree)\b/i,
  house: /\b(casa|casetta|house|cottage)\b/i,
  snowman: /\b(pupazzo di neve|snowman)\b/i,
  rocket: /\b(razzo|missile|rocket)\b/i,
  table: /\b(tavolo|scrivania|table|desk)\b/i,
  chair: /\b(sedia|seggiola|chair)\b/i,
  car: /\b(auto|automobile|macchina|macchinina|car)\b/i,
  lamp: /\b(lampada|lamp)\b/i,
  mug: /\b(tazza|boccale|mug|cup)\b/i,
  'torus-knot': /\b(nodo toroidale|nodo|torus knot)\b/i,
  'triangular-prism': /\b(prisma triangolare|triangular prism)\b/i,
  'hex-prism': /\b(prisma esagonale|prisma a sei lati|hexagonal prism)\b/i,
  'octagonal-prism': /\b(prisma ottagonale|prisma a otto lati|octagonal prism)\b/i,
  tetrahedron: /\b(tetraedro|tetrahedron)\b/i,
  octahedron: /\b(ottaedro|octahedron)\b/i,
  icosahedron: /\b(icosaedro|icosahedron)\b/i,
  dodecahedron: /\b(dodecaedro|dodecahedron)\b/i,
  ellipsoid: /\b(ellissoide|ovale|uovo|ellipsoid|oval)\b/i,
  capsule: /\b(capsula|pillola|capsule)\b/i,
  cylinder: /\b(cilindro|lattina|batteria|cylinder|can)\b/i,
  cone: /\b(cono|conetto|cone)\b/i,
  torus: /\b(toro|ciambella|donut|ciambell[ae]|torus)\b/i,
  ring: /\b(anello|anellino|ring)\b/i,
  tube: /\b(tubo|tubazione|pipe|tube)\b/i,
  heart: /\b(cuore|heart)\b/i,
  star: /\b(stella|star)\b/i,
  gear: /\b(ingranaggio|ruota dentata|gear|cog)\b/i,
  spring: /\b(molla|spring)\b/i,
  bowl: /\b(ciotola|scodella|bowl)\b/i,
  vase: /\b(vaso|vase)\b/i,
  pyramid: /\b(piramide|pyramid)\b/i,
  sphere: /\b(sfera|palla|globo|ball|sphere)\b/i,
  box: /\b(cubo|cuboide|scatola|blocco|box|cube|block)\b/i,
};

export function detectShape(text) {
  const normalized = text.toLocaleLowerCase('it-IT');
  return Object.entries(WORDS).find(([, pattern]) => pattern.test(normalized))?.[0] || 'box';
}

const shape2D = (points) => {
  const shape = new THREE.Shape();
  points.forEach(([x, y], index) => index ? shape.lineTo(x, y) : shape.moveTo(x, y));
  shape.closePath();
  return shape;
};

function heartGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(0, -0.42);
  shape.bezierCurveTo(-0.15, -0.28, -0.5, -0.05, -0.5, 0.22);
  shape.bezierCurveTo(-0.5, 0.55, -0.08, 0.57, 0, 0.29);
  shape.bezierCurveTo(0.13, 0.58, 0.5, 0.53, 0.5, 0.22);
  shape.bezierCurveTo(0.5, -0.05, 0.14, -0.3, 0, -0.42);
  return new THREE.ExtrudeGeometry(shape, { depth: 0.22, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.035, bevelThickness: 0.035, curveSegments: 16 });
}

function starGeometry() {
  const points = Array.from({ length: 10 }, (_, index) => {
    const angle = Math.PI / 2 + index * Math.PI / 5;
    const radius = index % 2 ? 0.23 : 0.5;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius];
  });
  return new THREE.ExtrudeGeometry(shape2D(points), { depth: 0.2, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.025, bevelThickness: 0.025 });
}

function gearGeometry(teeth = 12) {
  const points = Array.from({ length: teeth * 4 }, (_, index) => {
    const angle = index * Math.PI * 2 / (teeth * 4);
    const radius = [0.39, 0.39, 0.5, 0.5][index % 4];
    return [Math.cos(angle) * radius, Math.sin(angle) * radius];
  });
  const shape = shape2D(points);
  const hole = new THREE.Path();
  hole.absarc(0, 0, 0.16, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  return new THREE.ExtrudeGeometry(shape, { depth: 0.18, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.02, bevelThickness: 0.02 });
}

function addMesh(group, geometry, material, position = [0, 0, 0], scale = [1, 1, 1], rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function primitive(shape, material) {
  const group = new THREE.Group();
  const segments = 48;
  switch (shape) {
    case 'sphere': addMesh(group, new THREE.SphereGeometry(0.5, segments, 32), material); break;
    case 'ellipsoid': addMesh(group, new THREE.SphereGeometry(0.5, segments, 32), material, [0, 0, 0], [1, 0.72, 0.82]); break;
    case 'cylinder': addMesh(group, new THREE.CylinderGeometry(0.5, 0.5, 1, segments), material); break;
    case 'cone': addMesh(group, new THREE.ConeGeometry(0.5, 1, segments), material); break;
    case 'capsule': addMesh(group, new THREE.CapsuleGeometry(0.28, 0.45, 8, 24), material); break;
    case 'torus': addMesh(group, new THREE.TorusGeometry(0.34, 0.16, 20, segments), material); break;
    case 'ring': addMesh(group, new THREE.TorusGeometry(0.38, 0.11, 16, segments), material); break;
    case 'tube': {
      const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.42, -0.3, 0), new THREE.Vector3(-0.15, -0.3, 0), new THREE.Vector3(0.12, 0.32, 0), new THREE.Vector3(0.42, 0.32, 0)]);
      addMesh(group, new THREE.TubeGeometry(curve, 64, 0.12, 16, false), material); break;
    }
    case 'tetrahedron': addMesh(group, new THREE.TetrahedronGeometry(0.58), material); break;
    case 'octahedron': addMesh(group, new THREE.OctahedronGeometry(0.58), material); break;
    case 'icosahedron': addMesh(group, new THREE.IcosahedronGeometry(0.58), material); break;
    case 'dodecahedron': addMesh(group, new THREE.DodecahedronGeometry(0.58), material); break;
    case 'pyramid': addMesh(group, new THREE.ConeGeometry(0.55, 1, 4), material, [0, 0, 0], [1, 1, 1], [0, Math.PI / 4, 0]); break;
    case 'triangular-prism': addMesh(group, new THREE.CylinderGeometry(0.62, 0.62, 1, 3), material, [0, 0, 0], [1, 1, 1], [0, Math.PI / 2, 0]); break;
    case 'hex-prism': addMesh(group, new THREE.CylinderGeometry(0.56, 0.56, 1, 6), material, [0, 0, 0], [1, 1, 1], [0, Math.PI / 6, 0]); break;
    case 'octagonal-prism': addMesh(group, new THREE.CylinderGeometry(0.56, 0.56, 1, 8), material, [0, 0, 0], [1, 1, 1], [0, Math.PI / 8, 0]); break;
    case 'heart': addMesh(group, heartGeometry(), material, [0, 0, -0.11], [1, 1, 1], [0, 0, 0]); break;
    case 'star': addMesh(group, starGeometry(), material, [0, 0, -0.1]); break;
    case 'gear': addMesh(group, gearGeometry(), material, [0, 0, -0.09]); break;
    case 'spring': {
      const points = [];
      for (let i = 0; i <= 160; i++) { const t = i / 160; const a = t * Math.PI * 10; points.push(new THREE.Vector3(0.34 * Math.cos(a), t - 0.5, 0.34 * Math.sin(a))); }
      addMesh(group, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 240, 0.055, 8, false), material); break;
    }
    case 'bowl': {
      const points = [new THREE.Vector2(0.08, -0.48), new THREE.Vector2(0.32, -0.42), new THREE.Vector2(0.48, -0.16), new THREE.Vector2(0.5, 0.25), new THREE.Vector2(0.43, 0.25), new THREE.Vector2(0.38, -0.12), new THREE.Vector2(0.25, -0.31), new THREE.Vector2(0.08, -0.34)];
      addMesh(group, new THREE.LatheGeometry(points, 48), material); break;
    }
    case 'vase': {
      const points = [new THREE.Vector2(0.12, -0.5), new THREE.Vector2(0.36, -0.46), new THREE.Vector2(0.46, -0.2), new THREE.Vector2(0.26, 0.12), new THREE.Vector2(0.2, 0.34), new THREE.Vector2(0.29, 0.42), new THREE.Vector2(0.29, 0.5), new THREE.Vector2(0.2, 0.5), new THREE.Vector2(0.16, 0.36), new THREE.Vector2(0.2, 0.08), new THREE.Vector2(0.34, -0.2), new THREE.Vector2(0.27, -0.39), new THREE.Vector2(0.12, -0.41)];
      addMesh(group, new THREE.LatheGeometry(points, 48), material); break;
    }
    case 'torus-knot': addMesh(group, new THREE.TorusKnotGeometry(0.32, 0.12, 128, 16, 2, 3), material); break;
    default: addMesh(group, new THREE.BoxGeometry(1, 1, 1), material);
  }
  return group;
}

function composite(shape, material) {
  const group = new THREE.Group();
  const box = (p, s, r = [0, 0, 0]) => addMesh(group, new THREE.BoxGeometry(1, 1, 1), material, p, s, r);
  const sphere = (p, s) => addMesh(group, new THREE.SphereGeometry(0.5, 24, 16), material, p, s);
  const cylinder = (p, s, r = [0, 0, 0]) => addMesh(group, new THREE.CylinderGeometry(0.5, 0.5, 1, 24), material, p, s, r);
  const cone = (p, s) => addMesh(group, new THREE.ConeGeometry(0.5, 1, 24), material, p, s);
  switch (shape) {
    case 'tree':
      cylinder([0, -0.32, 0], [0.18, 0.36, 0.18]);
      cone([0, -0.08, 0], [0.62, 0.55, 0.62]); cone([0, 0.2, 0], [0.48, 0.48, 0.48]); cone([0, 0.43, 0], [0.32, 0.42, 0.32]); break;
    case 'house':
      box([0, -0.08, 0], [0.85, 0.62, 0.7]);
      cone([0, 0.38, 0], [1.12, 0.55, 0.88]);
      box([0, -0.26, 0.356], [0.18, 0.36, 0.035]);
      box([-0.25, 0.02, 0.356], [0.16, 0.16, 0.035]); box([0.25, 0.02, 0.356], [0.16, 0.16, 0.035]); break;
    case 'snowman':
      sphere([0, -0.22, 0], [0.72, 0.72, 0.72]); sphere([0, 0.24, 0], [0.5, 0.5, 0.5]); sphere([0, 0.58, 0], [0.34, 0.34, 0.34]);
      cone([0, 0.58, 0.2], [0.16, 0.26, 0.16]);
      for (const x of [-0.08, 0.08]) sphere([x, 0.64, 0.15], [0.035, 0.035, 0.035]); break;
    case 'rocket':
      cylinder([0, -0.08, 0], [0.42, 0.72, 0.42]); cone([0, 0.42, 0], [0.42, 0.34, 0.42]);
      for (const x of [-0.25, 0.25]) box([x, -0.32, 0], [0.14, 0.34, 0.12]);
      cylinder([0, -0.48, 0], [0.18, 0.16, 0.18]); break;
    case 'table':
      box([0, 0.12, 0], [0.9, 0.12, 0.72]);
      for (const x of [-0.36, 0.36]) for (const z of [-0.27, 0.27]) box([x, -0.28, z], [0.09, 0.65, 0.09]); break;
    case 'chair':
      box([0, -0.12, 0], [0.62, 0.1, 0.58]); box([0, 0.24, -0.25], [0.62, 0.65, 0.1]);
      for (const x of [-0.24, 0.24]) for (const z of [-0.22, 0.22]) box([x, -0.36, z], [0.08, 0.48, 0.08]); break;
    case 'car':
      box([0, -0.1, 0], [0.95, 0.27, 0.48]); box([0.08, 0.12, 0], [0.53, 0.28, 0.4]);
      for (const x of [-0.3, 0.3]) for (const z of [-0.27, 0.27]) cylinder([x, -0.24, z], [0.17, 0.12, 0.17], [Math.PI / 2, 0, 0]); break;
    case 'lamp':
      cylinder([0, -0.39, 0], [0.62, 0.12, 0.5]); cylinder([0, -0.04, 0], [0.08, 0.62, 0.08]);
      cone([0, 0.36, 0], [0.54, 0.42, 0.54]); sphere([0, 0.19, 0], [0.16, 0.16, 0.16]); break;
    case 'mug':
      cylinder([0, 0, 0], [0.62, 0.76, 0.62]);
      addMesh(group, new THREE.TorusGeometry(0.23, 0.07, 12, 32), material, [0.39, 0.02, 0], [1, 1, 1], [Math.PI / 2, 0, 0]); break;
  }
  return group;
}

export function createShapeGroup(shape, material) {
  const group = ['tree', 'house', 'snowman', 'rocket', 'table', 'chair', 'car', 'lamp', 'mug'].includes(shape)
    ? composite(shape, material)
    : primitive(shape, material);
  group.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(group);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  group.position.sub(center);
  group.scale.set(1 / Math.max(size.x, 0.001), 1 / Math.max(size.y, 0.001), 1 / Math.max(size.z, 0.001));
  group.updateMatrixWorld(true);
  return group;
}

export function promptDimensions(text, fallback) {
  const normalized = text.toLocaleLowerCase('it-IT');
  const next = { ...fallback };
  const patterns = {
    width: /(?:larghezza|largo|larga|wide|width)\s*(?:di|:|=)?\s*(\d+(?:[.,]\d+)?)/i,
    height: /(?:altezza|alto|alta|height|tall)\s*(?:di|:|=)?\s*(\d+(?:[.,]\d+)?)/i,
    depth: /(?:profondita|profondo|profonda|depth|deep)\s*(?:di|:|=)?\s*(\d+(?:[.,]\d+)?)/i,
  };
  for (const [axis, pattern] of Object.entries(patterns)) {
    const match = normalized.match(pattern);
    if (match) next[axis] = THREE.MathUtils.clamp(Number(match[1].replace(',', '.')), 0.5, 5);
  }
  return next;
}

export function promptColor(text) {
  const colors = [
    [/\b(rosso|rossa|red)\b/i, '#e45d5d'], [/\b(blu|azzurro|azzurra|blue)\b/i, '#5687e8'],
    [/\b(verde|green)\b/i, '#62b883'], [/\b(giallo|gialla|yellow)\b/i, '#efc34f'],
    [/\b(arancione|orange)\b/i, '#ed9252'], [/\b(rosa|pink)\b/i, '#e77caf'],
    [/\b(viola|purple)\b/i, '#9b87f5'], [/\b(nero|nera|black)\b/i, '#292a30'],
    [/\b(bianco|bianca|white)\b/i, '#e8e5df'], [/\b(grigio|grigia|gray|grey)\b/i, '#888b96'],
    [/\b(marrone|brown)\b/i, '#8a6045'], [/\b(oro|dorato|gold)\b/i, '#d6ae52'],
    [/\b(argento|argentato|silver)\b/i, '#b8c0ce'], [/\b(turchese|turquoise)\b/i, '#54c4bd'],
  ];
  return colors.find(([pattern]) => pattern.test(text))?.[1] || null;
}
