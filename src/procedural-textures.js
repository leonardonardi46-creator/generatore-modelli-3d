import * as THREE from 'three';

const clampByte = (value) => Math.max(0, Math.min(255, Math.round(value)));
function rgb(hex) {
  const color = new THREE.Color(hex);
  return { r: clampByte(color.r * 255), g: clampByte(color.g * 255), b: clampByte(color.b * 255) };
}

/** Creates a small deterministic canvas texture for local, prompt-guided material appearance. */
export function createProceduralTexture(style, baseColor, seed = 1) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  const size = 128;
  canvas.width = size; canvas.height = size;
  const context = canvas.getContext('2d');
  if (!context) return null;
  const base = rgb(baseColor);
  const random = (() => { let state = seed >>> 0; return () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296; }; })();
  context.fillStyle = `rgb(${base.r},${base.g},${base.b})`;
  context.fillRect(0, 0, size, size);
  const tint = (amount) => `rgba(${amount > 0 ? 255 : 0},${amount > 0 ? 255 : 0},${amount > 0 ? 255 : 0},${Math.abs(amount)})`;

  if (style === 'wood') {
    for (let i = 0; i < 32; i++) {
      context.strokeStyle = tint((random() > 0.5 ? 1 : -1) * (0.03 + random() * 0.1));
      context.lineWidth = 1 + random() * 3;
      context.beginPath(); context.moveTo(0, i * 4 + random() * 8);
      context.bezierCurveTo(40, i * 4 + random() * 5, 88, i * 4 + random() * 7, size, i * 4 + random() * 8); context.stroke();
    }
  } else if (style === 'fur' || style === 'fur-stripes') {
    for (let i = 0; i < 750; i++) {
      const x = random() * size; const y = random() * size;
      context.strokeStyle = tint((random() > 0.5 ? 1 : -1) * (0.05 + random() * 0.16));
      context.lineWidth = 0.4 + random() * 1.2;
      context.beginPath(); context.moveTo(x, y); context.lineTo(x + (random() - 0.5) * 2.5, y + 2 + random() * 4); context.stroke();
    }
    if (style === 'fur-stripes') {
      context.lineWidth = 7; context.strokeStyle = 'rgba(32,23,20,0.42)';
      for (let x = -30; x < size + 30; x += 28) { context.beginPath(); context.moveTo(x, 0); context.quadraticCurveTo(x + 24, 45, x - 5, size); context.stroke(); }
    }
  } else if (style === 'fabric') {
    context.lineWidth = 1;
    for (let i = 0; i < size; i += 4) {
      context.strokeStyle = 'rgba(255,255,255,0.075)'; context.beginPath(); context.moveTo(i, 0); context.lineTo(i, size); context.stroke();
      context.strokeStyle = 'rgba(0,0,0,0.08)'; context.beginPath(); context.moveTo(0, i); context.lineTo(size, i); context.stroke();
    }
  } else if (style === 'stone' || style === 'marble') {
    for (let i = 0; i < 340; i++) {
      const x = random() * size; const y = random() * size;
      context.fillStyle = tint((random() > 0.5 ? 1 : -1) * (0.025 + random() * 0.09));
      context.beginPath(); context.ellipse(x, y, 0.5 + random() * 2.4, 0.5 + random() * 2.4, random() * Math.PI, 0, Math.PI * 2); context.fill();
    }
    if (style === 'marble') {
      context.lineWidth = 1.2; context.strokeStyle = 'rgba(255,255,255,0.32)';
      for (let i = 0; i < 5; i++) { const y = random() * size; context.beginPath(); context.moveTo(0, y); context.bezierCurveTo(35, y - 25, 82, y + 28, size, y - 5); context.stroke(); }
    }
  } else if (style === 'metal') {
    for (let y = 0; y < size; y++) {
      const alpha = 0.025 + random() * 0.055;
      context.strokeStyle = `rgba(255,255,255,${alpha})`; context.beginPath(); context.moveTo(0, y); context.lineTo(size, y); context.stroke();
    }
  } else if (style === 'smooth') {
    const gradient = context.createRadialGradient(size * 0.35, size * 0.32, 2, size * 0.5, size * 0.5, size * 0.75);
    gradient.addColorStop(0, 'rgba(255,255,255,0.15)'); gradient.addColorStop(1, 'rgba(0,0,0,0.12)');
    context.fillStyle = gradient; context.fillRect(0, 0, size, size);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.anisotropy = 4;
  return texture;
}

export function textureStyleFromPrompt(prompt) {
  const text = prompt.toLocaleLowerCase('it-IT');
  if (/\b(legno|wood|rovere|quercia)\b/.test(text)) return 'wood';
  if (/\b(marmo|marble)\b/.test(text)) return 'marble';
  if (/\b(pietra|pietroso|stone|roccia)\b/.test(text)) return 'stone';
  if (/\b(tessuto|stoffa|velluto|fabric|cloth)\b/.test(text)) return 'fabric';
  if (/\b(metallo|metallico|metallica|acciaio|chrome|cromato)\b/.test(text)) return 'metal';
  if (/\b(peloso|pelosa|pelo|pelliccia|fur)\b/.test(text)) return 'fur';
  return 'smooth';
}

export function semanticBaseColor(prompt, shape, seed = 42) {
  const text = prompt.toLocaleLowerCase('it-IT');
  const palettes = {
    tree: ['#46734b', '#528552', '#789447'], house: ['#c89a70', '#b77b60', '#d2b88b'],
    car: ['#527db8', '#b6534f', '#d2aa4f'], rocket: ['#dadde5', '#6485bd', '#cf5e55'],
    vase: ['#7493a0', '#b86b59', '#c4a56a'], lamp: ['#d7c69d', '#a88e6a', '#b9c1c8'],
    mug: ['#d7e0e5', '#b56a5d', '#6e8d75'], cat: ['#bd8157', '#8e8d91', '#d2c4a7'],
  };
  const palette = palettes[shape] || ['#9b87f5', '#64a99a', '#d89b64', '#6685bb', '#c87976'];
  let hash = seed >>> 0;
  for (const char of text) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return palette[hash % palette.length];
}
