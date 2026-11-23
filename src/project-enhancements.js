const $ = (selector) => document.querySelector(selector);
const prompt = $('#prompt');
const generateButton = $('#generate');
const alternativeButton = $('#generate-alternative');
const projects = $('#saved-variants');

// Add the previously missing projects/style controls without requiring a build plugin.
const styleField = document.createElement('div');
styleField.className = 'field-row style-row';
styleField.innerHTML = '<label class="field-label" for="model-style">Stile del modello</label><select id="model-style" aria-label="Scegli lo stile"><option value="standard">Standard</option><option value="low-poly">Low-poly</option><option value="cartoon">Cartoon</option><option value="geometric">Geometrico</option><option value="organic">Organico</option></select>';
$('#shape').closest('.field-row')?.insertAdjacentElement('beforebegin', styleField);

const styleBehaviors = {
  standard: { smooth: true, wireframe: false, variation: 20 },
  'low-poly': { smooth: false, wireframe: false, variation: 38 },
  cartoon: { smooth: true, wireframe: false, variation: 14 },
  geometric: { smooth: false, wireframe: false, variation: 8 },
  organic: { smooth: true, wireframe: false, variation: 62 },
};
const styleLabel = () => $('#model-style').selectedOptions[0].textContent;
const styleMarker = /\s*\[Stile: [^\]]+\]/g;
function applyStyle() {
  const style = $('#model-style')?.value || 'standard';
  const behavior = styleBehaviors[style] || styleBehaviors.standard;
  $('#smooth-shading').checked = behavior.smooth;
  $('#wireframe').checked = behavior.wireframe;
  $('#variation').value = String(behavior.variation);
  $('#variation-value').value = `${behavior.variation}%`;
  const basePrompt = (prompt.dataset.basePrompt ?? prompt.value).replace(styleMarker, '').trim();
  prompt.dataset.basePrompt = basePrompt;
  const marker = style === 'standard' ? '' : ` [Stile: ${styleLabel()}]`;
  prompt.value = `${basePrompt}${marker}`.slice(0, 240);
}

// Apply the selected visual recipe before the generator reads the form values.
generateButton?.addEventListener('click', applyStyle, true);
$('#model-style')?.addEventListener('change', applyStyle);
prompt?.addEventListener('input', () => {
  prompt.dataset.basePrompt = prompt.value.replace(styleMarker, '').trim();
});

alternativeButton?.addEventListener('click', () => {
  const seed = $('#seed');
  const value = new Uint32Array(1);
  if (globalThis.crypto?.getRandomValues) crypto.getRandomValues(value);
  else value[0] = Math.floor(Math.random() * 4294967296);
  seed.value = String(value[0]);
  generateButton?.click();
});

function updateProjectCount() {
  const count = projects?.querySelectorAll('.saved-variant-row').length || 0;
  const label = $('#projects-count');
  if (label) label.textContent = `${count} ${count === 1 ? 'progetto salvato' : 'progetti salvati'}`;
}
if (projects) {
  new MutationObserver(updateProjectCount).observe(projects, { childList: true });
  updateProjectCount();
}

const css = document.createElement('style');
css.textContent = `
.style-row{display:block;margin:14px 0}.style-row select{width:100%;margin-top:7px}
.generation-actions{display:grid;gap:9px}.alternative-button{width:100%;padding:12px;border:1px solid #494451;border-radius:7px;background:#1a191f;color:#e8e4f0;font:600 13px 'DM Sans',sans-serif;cursor:pointer}.alternative-button:hover{border-color:#9b87f5;color:#fff}
.projects-section{margin:34px 0;padding:24px;border:1px solid #302e36;border-radius:10px;background:#151519}.projects-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.projects-heading h2{margin:6px 0;font:700 22px 'Manrope',sans-serif}.projects-heading p{margin:0;color:#a6a2af;font-size:13px}.projects-count{color:#aaa3b8;font-size:12px}.projects-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:8px;margin-top:18px}.saved-variant-row{display:flex;gap:8px;align-items:stretch;padding:9px;border:1px solid #34313c;border-radius:7px;background:#19181e}.saved-load{flex:1;min-width:0;border:0;background:transparent;color:#e9e5ef;text-align:left;overflow-wrap:anywhere;cursor:pointer}.saved-remove{width:34px;border:1px solid #494451;border-radius:5px;background:#201e25;color:#d9d4e0;cursor:pointer}.saved-empty{grid-column:1/-1;color:#aaa3b8;font-size:13px}
@media(max-width:600px){.projects-section{padding:17px}.projects-heading{display:block}.projects-count{display:inline-block;margin-top:12px}}
`;
document.head.appendChild(css);
