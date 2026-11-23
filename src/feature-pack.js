const $ = (selector) => document.querySelector(selector);
const STORAGE_KEY = 'forma-saved-variants-v1';
const GALLERY_KEY = 'forma-variant-gallery-v1';
const formControls = ['#prompt', '#shape', '#width', '#height', '#depth', '#color', '#polygon-budget', '#mesh-quality', '#surface-roughness', '#smooth-shading', '#wireframe', '#variation', '#seed', '#model-style'];
const status = $('#status-text');
const readConfig = () => Object.fromEntries(formControls.map((selector) => {
  const element = $(selector);
  return [selector, element ? (element.type === 'checkbox' ? element.checked : element.value) : null];
}));
function applyConfig(config, { generate = true } = {}) {
  for (const [selector, value] of Object.entries(config || {})) {
    const element = $(selector);
    if (!element || value === null || value === undefined) continue;
    if (element.type === 'checkbox') element.checked = Boolean(value);
    else element.value = String(value);
  }
  $('#prompt')?.dispatchEvent(new Event('input', { bubbles: true }));
  if (generate) $('#generate')?.click();
}
function readList(key) {
  try { const result = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(result) ? result : []; }
  catch { return []; }
}
function writeList(key, list) {
  try { localStorage.setItem(key, JSON.stringify(list)); return true; }
  catch { notify('Memoria locale piena: elimina qualche anteprima o progetto salvato.'); return false; }
}
function notify(message) {
  const toast = $('#toast');
  if (!toast) return;
  toast.textContent = message; toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 3500);
}
function captureThumbnail() {
  const canvas = $('.worker-preview-canvas') || $('#viewport canvas');
  if (!canvas) return '';
  try {
    const thumb = document.createElement('canvas'); thumb.width = 120; thumb.height = 84;
    const context = thumb.getContext('2d');
    context.fillStyle = '#15171b'; context.fillRect(0, 0, thumb.width, thumb.height);
    context.drawImage(canvas, 0, 0, thumb.width, thumb.height);
    return thumb.toDataURL('image/jpeg', 0.58);
  } catch { return ''; }
}

// History: keep a compact local undo/redo stack of form states.
const history = { entries: [readConfig()], index: 0, restoring: false };
function pushHistory() {
  if (history.restoring) return;
  const next = readConfig();
  if (JSON.stringify(next) === JSON.stringify(history.entries[history.index])) return;
  history.entries = history.entries.slice(0, history.index + 1);
  history.entries.push(next);
  if (history.entries.length > 40) history.entries.shift();
  history.index = history.entries.length - 1;
  updateHistoryButtons();
}
function restoreHistory(direction) {
  const index = history.index + direction;
  if (index < 0 || index >= history.entries.length) return;
  history.restoring = true; history.index = index;
  applyConfig(history.entries[index], { generate: false });
  history.restoring = false; updateHistoryButtons();
  $('#generate')?.click();
}
const historyBar = document.createElement('div');
historyBar.className = 'history-actions';
historyBar.innerHTML = '<button type="button" id="undo-model" aria-label="Annulla ultima modifica">↶ Indietro</button><button type="button" id="redo-model" aria-label="Ripristina modifica">↷ Ripeti</button>';
$('#prompt')?.insertAdjacentElement('afterend', historyBar);
function updateHistoryButtons() {
  $('#undo-model').disabled = history.index <= 0;
  $('#redo-model').disabled = history.index >= history.entries.length - 1;
}
$('#undo-model').addEventListener('click', () => restoreHistory(-1));
$('#redo-model').addEventListener('click', () => restoreHistory(1));
for (const selector of formControls) {
  $(selector)?.addEventListener('change', pushHistory);
  if (selector === '#prompt') $(selector)?.addEventListener('blur', pushHistory);
}
window.addEventListener('keydown', (event) => {
  if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
  const key = event.key.toLowerCase();
  if (key === 'z' && event.shiftKey) { event.preventDefault(); restoreHistory(1); }
  else if (key === 'z') { event.preventDefault(); restoreHistory(-1); }
  else if (key === 'y') { event.preventDefault(); restoreHistory(1); }
});
updateHistoryButtons();

// Quality levels are explicit and repeatable; the generator's mesh budget is the actual control.
const quality = $('#mesh-quality');
if (quality) {
  const labels = { low: 'Bozza · rapida', medium: 'Standard · consigliata', high: 'Alta · più dettagli' };
  for (const option of quality.options) if (labels[option.value]) option.textContent = labels[option.value];
}

// Render real saved-project screenshots as compact local cards.
function renderSavedThumbnails() {
  const rows = [...document.querySelectorAll('#saved-variants .saved-variant-row')];
  const saved = readList(STORAGE_KEY);
  rows.forEach((row, index) => {
    const imageData = saved[index]?.thumbnail;
    if (!imageData || row.querySelector('.saved-thumbnail')) return;
    const image = document.createElement('img'); image.className = 'saved-thumbnail'; image.src = imageData;
    image.alt = `Anteprima di ${saved[index]?.prompt || 'progetto salvato'}`;
    row.prepend(image);
  });
}
$('#save-variant')?.addEventListener('click', () => {
  setTimeout(() => {
    const saved = readList(STORAGE_KEY);
    if (!saved.length) return;
    const thumbnail = captureThumbnail();
    if (!thumbnail) return;
    saved[0].thumbnail = thumbnail;
    writeList(STORAGE_KEY, saved);
    renderSavedThumbnails();
  }, 80);
});
const savedContainer = $('#saved-variants');
if (savedContainer) new MutationObserver(renderSavedThumbnails).observe(savedContainer, { childList: true, subtree: true });
renderSavedThumbnails();

// A compare gallery keeps up to four generated previews/configurations on this device.
const gallery = document.createElement('section');
gallery.className = 'variant-gallery';
gallery.innerHTML = '<div class="gallery-heading"><div><span class="step-label">ESPLORA LE IDEE</span><h2>Varianti da confrontare</h2><p>Genera quattro alternative e scegli quella da tenere.</p></div><button type="button" id="make-gallery">Genera 4 varianti</button></div><div class="gallery-grid" id="gallery-grid"></div>';
$('#projects-section')?.insertAdjacentElement('beforebegin', gallery);
const galleryGrid = $('#gallery-grid');
function renderGallery() {
  const items = readList(GALLERY_KEY).slice(0, 4);
  galleryGrid.replaceChildren();
  if (!items.length) {
    const empty = document.createElement('p'); empty.className = 'gallery-empty'; empty.textContent = 'Le varianti generate appariranno qui.'; galleryGrid.append(empty); return;
  }
  items.forEach((item, index) => {
    const card = document.createElement('article'); card.className = 'variant-card';
    const image = document.createElement('img'); image.className = 'variant-thumbnail'; image.src = item.thumbnail; image.alt = `Anteprima variante ${index + 1}`;
    const title = document.createElement('strong'); title.textContent = `Variante ${index + 1}`;
    const detail = document.createElement('span'); detail.textContent = `${item.config['#prompt'] || 'Modello'} · seed ${item.config['#seed']}`;
    const actions = document.createElement('div'); actions.className = 'variant-card-actions';
    const use = document.createElement('button'); use.type = 'button'; use.textContent = 'Apri'; use.addEventListener('click', () => applyConfig(item.config));
    const save = document.createElement('button'); save.type = 'button'; save.textContent = 'Salva progetto'; save.addEventListener('click', () => {
      applyConfig(item.config, { generate: false });
      const existing = readList(STORAGE_KEY);
      if (existing.length >= 30) return notify('Limite dei progetti salvati raggiunto.');
      existing.unshift({ prompt: item.config['#prompt'] || '', shape: item.config['#shape'] || 'auto', dimensions: { width: Number(item.config['#width']), height: Number(item.config['#height']), depth: Number(item.config['#depth']) }, color: item.config['#color'], polygonBudget: Number(item.config['#polygon-budget']), quality: item.config['#mesh-quality'], roughness: Number(item.config['#surface-roughness']), smooth: item.config['#smooth-shading'], wireframe: item.config['#wireframe'], variation: Number(item.config['#variation']), seed: Number(item.config['#seed']), thumbnail: item.thumbnail, id: `${Date.now()}-${item.config['#seed']}` });
      if (writeList(STORAGE_KEY, existing)) { $('#save-variant')?.click(); notify('Variante aggiunta ai progetti salvati.'); }
    });
    actions.append(use, save); card.append(image, title, detail, actions); galleryGrid.append(card);
  });
}
function waitForGeneration(timeoutMs = 120000) {
  return new Promise((resolve, reject) => {
    let sawBusy = false;
    const started = Date.now();
    const poll = setInterval(() => {
      const text = status?.textContent || '';
      if (/generazione|stima superata/i.test(text)) sawBusy = true;
      if (sawBusy && /modello pronto/i.test(text)) { clearInterval(poll); resolve(); }
      if (/annullata|non riuscita|errore durante/i.test(text)) { clearInterval(poll); reject(new Error(text)); }
      if (Date.now() - started > timeoutMs) { clearInterval(poll); reject(new Error('La generazione ha superato il tempo massimo di attesa.')); }
    }, 100);
  });
}
function randomSeed() {
  const value = new Uint32Array(1);
  if (globalThis.crypto?.getRandomValues) crypto.getRandomValues(value);
  else value[0] = Math.floor(Math.random() * 4294967296);
  return value[0];
}
$('#make-gallery').addEventListener('click', async (event) => {
  const button = event.currentTarget;
  if (button.disabled) return;
  button.disabled = true;
  const generated = [];
  const initial = readConfig();
  try {
    for (let index = 0; index < 4; index += 1) {
      $('#seed').value = String(randomSeed());
      $('#generate').click();
      await waitForGeneration();
      generated.push({ config: readConfig(), thumbnail: captureThumbnail() });
    }
    writeList(GALLERY_KEY, generated);
    renderGallery();
    notify('Quattro varianti pronte per il confronto.');
  } catch (error) {
    notify(`Galleria interrotta: ${error.message}`);
  } finally {
    applyConfig(initial, { generate: false });
    button.disabled = false;
  }
});
renderGallery();

// Batch download: all locally saved projects are regenerated one by one and exported in both formats.
const batchButton = document.createElement('button');
batchButton.type = 'button'; batchButton.id = 'export-saved-batch'; batchButton.textContent = 'Esporta progetti salvati (GLB + STL)';
$('#projects-section')?.append(batchButton);
$('#export-batch-current')?.remove();
async function exportSavedBatch() {
  const items = readList(STORAGE_KEY);
  if (!items.length) return notify('Non ci sono progetti salvati da esportare.');
  batchButton.disabled = true;
  const original = readConfig();
  try {
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index];
      applyConfig({
        '#prompt': item.prompt, '#shape': item.shape || 'auto', '#width': item.dimensions?.width || 2, '#height': item.dimensions?.height || 2, '#depth': item.dimensions?.depth || 2,
        '#color': item.color || '#9b87f5', '#polygon-budget': item.polygonBudget || 8000, '#mesh-quality': item.quality || 'custom', '#surface-roughness': item.roughness ?? 0.48,
        '#smooth-shading': item.smooth !== false, '#wireframe': Boolean(item.wireframe), '#variation': item.variation ?? 20, '#seed': item.seed ?? 42,
      }, { generate: false });
      $('#generate').click(); await waitForGeneration();
      $('#export-glb').click(); $('#export-stl').click();
      status.textContent = `Esportazione progetto ${index + 1} di ${items.length}`;
      await new Promise((resolve) => setTimeout(resolve, 450));
    }
    notify(`Esportati ${items.length} progetti in GLB e STL.`);
  } catch (error) { notify(`Esportazione batch interrotta: ${error.message}`); }
  finally { applyConfig(original, { generate: true }); batchButton.disabled = false; }
}
batchButton.addEventListener('click', exportSavedBatch);

const css = document.createElement('style');
css.textContent = `
.history-actions{display:flex;gap:8px;margin:6px 0 14px}.history-actions button,.gallery-heading button,#export-saved-batch,.variant-card-actions button{padding:9px 13px;border:1px solid #45424d;border-radius:8px;background:#201f26;color:#ebe8f1}.history-actions button:hover,.gallery-heading button:hover,#export-saved-batch:hover,.variant-card-actions button:hover{border-color:#9b87f5;background:#292733}.history-actions button:disabled,.gallery-heading button:disabled,#export-saved-batch:disabled{opacity:.5;cursor:not-allowed}
.variant-gallery{margin:28px 0;padding:22px;border:1px solid #302e36;border-radius:10px;background:#151519}.gallery-heading{display:flex;justify-content:space-between;align-items:center;gap:18px}.gallery-heading h2{margin:5px 0;font:700 21px 'Manrope',sans-serif}.gallery-heading p{margin:0;color:#a6a2af;font-size:13px}.gallery-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:18px}.gallery-empty{grid-column:1/-1;color:#aaa3b8;font-size:13px}.variant-card{display:grid;gap:8px;padding:10px;border:1px solid #34313c;border-radius:8px;background:#19181e;min-width:0}.variant-thumbnail,.saved-thumbnail{width:100%;height:120px;object-fit:cover;border-radius:6px;background:#15171b}.variant-card strong{font-size:13px}.variant-card>span{font-size:11px;color:#a6a2af;overflow-wrap:anywhere}.variant-card-actions{display:flex;gap:6px}.variant-card-actions button{flex:1;padding:7px 6px;font-size:11px}.saved-thumbnail{width:58px;height:48px;flex:none}.saved-variant-row{align-items:center}#export-saved-batch{margin-top:16px;background:#201f26;color:#f2effa}.variant-card-actions button:last-child{border-color:#4d806a;color:#d3f0df}
@media(max-width:850px){.gallery-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:560px){.gallery-heading{align-items:flex-start;flex-direction:column}.gallery-grid{grid-template-columns:1fr 1fr}.variant-thumbnail{height:92px}.variant-gallery{padding:16px}}
`;
document.head.appendChild(css);
