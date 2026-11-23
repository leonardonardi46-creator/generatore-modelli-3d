const SUGGESTIONS = [
  {
    match: /\b(gatto|gatta|micio|felino|cat)\b/i,
    title: 'Gatto',
    options: [
      { title: 'Gatto classico', prompt: 'Gatto marrone ocra con pelo morbido, occhi ambra e naso rosa' },
      { title: 'Gatto stregato', prompt: 'Gatto nero con cappello da strega viola in tessuto, fascia dorata e stelle' },
      { title: 'Gatto tigrato', prompt: 'Gatto arancione tigrato con pelo striato, occhi ambra e naso rosa' },
      { title: 'Gatto elegante', prompt: 'Gatto grigio argentato con cappello da strega blu in tessuto e fascia dorata' },
    ],
  },
  {
    match: /\b(casa|casetta|house|cottage)\b/i,
    title: 'Casa',
    options: [
      { title: 'Casa di campagna', prompt: 'Casetta di campagna in legno marrone con tetto rosso e due finestre' },
      { title: 'Casa moderna', prompt: 'Casa moderna bianca con tetto grigio e grandi finestre blu' },
      { title: 'Casa nel bosco', prompt: 'Casa in legno marrone con tetto verde e finestre gialle' },
    ],
  },
  {
    match: /\b(albero|abete|pino|tree)\b/i,
    title: 'Albero',
    options: [
      { title: 'Abete', prompt: 'Abete verde alto 3 con tronco marrone' },
      { title: 'Albero autunnale', prompt: 'Albero arancione alto 3 con tronco marrone' },
      { title: 'Albero fantastico', prompt: 'Albero viola alto 3 con tronco dorato' },
    ],
  },
  {
    match: /\b(auto|automobile|macchina|car)\b/i,
    title: 'Auto',
    options: [
      { title: 'Auto sportiva', prompt: 'Auto sportiva rossa metallica con quattro ruote nere' },
      { title: 'Auto classica', prompt: 'Automobile blu lucida con quattro ruote nere' },
      { title: 'Auto elettrica', prompt: 'Auto elettrica verde metallica con quattro ruote nere' },
    ],
  },
  {
    match: /\b(sedia|seggiola|chair)\b/i,
    title: 'Sedia',
    options: [
      { title: 'Sedia in legno', prompt: 'Sedia in legno marrone con seduta e schienale alto' },
      { title: 'Sedia moderna', prompt: 'Sedia moderna blu con quattro gambe e schienale alto' },
      { title: 'Sedia metallica', prompt: 'Sedia rossa con struttura in metallo' },
    ],
  },
  {
    match: /\b(tavolo|scrivania|table|desk)\b/i,
    title: 'Tavolo',
    options: [
      { title: 'Tavolo in rovere', prompt: 'Tavolo in legno marrone con piano largo e quattro gambe' },
      { title: 'Scrivania moderna', prompt: 'Scrivania nera metallica con piano largo e quattro gambe' },
      { title: 'Tavolo colorato', prompt: 'Tavolo verde con piano spesso e quattro gambe' },
    ],
  },
  {
    match: /\b(razzo|rocket)\b/i,
    title: 'Razzo',
    options: [
      { title: 'Razzo spaziale', prompt: 'Razzo bianco metallico con punta rossa e pinne blu' },
      { title: 'Razzo lunare', prompt: 'Razzo argentato con punta dorata e pinne rosse' },
      { title: 'Razzo giocattolo', prompt: 'Razzo blu con punta gialla e pinne arancioni' },
    ],
  },
  {
    match: /\b(vaso|vase)\b/i,
    title: 'Vaso',
    options: [
      { title: 'Vaso in marmo', prompt: 'Vaso alto in marmo bianco con venature grigie' },
      { title: 'Vaso in ceramica', prompt: 'Vaso in ceramica blu lucida' },
      { title: 'Vaso rustico', prompt: 'Vaso in pietra marrone ruvida' },
    ],
  },
];

const prompt = document.querySelector('#prompt');
if (prompt) {
  const style = document.createElement('style');
  style.textContent = `
    .prompt-suggestions{display:none;margin:-8px 0 16px;padding:11px;border:1px solid #383442;border-radius:8px;background:#1d1b23}
    .prompt-suggestions.is-visible{display:block}.prompt-suggestions-head{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px}
    .prompt-suggestions-title{font-size:10px;font-weight:600;color:#ded9ed}.prompt-suggestions-note{font-size:8px;color:#8f8b99;line-height:1.5;margin:0 0 8px}
    .prompt-suggestion-list{display:grid;gap:6px}.prompt-suggestion{display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;padding:8px 9px;border:1px solid #35323e;border-radius:6px;background:#17161b;color:#e5e2eb;text-align:left;cursor:pointer}
    .prompt-suggestion:hover,.prompt-suggestion:focus-visible{border-color:#a594fa;background:#25222e;outline:none}.prompt-suggestion-copy{min-width:0}.prompt-suggestion-name{display:block;color:#c5b7ff;font-size:9px;font-weight:600;margin-bottom:3px}.prompt-suggestion-text{display:block;color:#aaa7b2;font-size:8px;line-height:1.45}.prompt-suggestion-apply{flex:none;color:#b9aaff;font-size:8px}
    @media(max-width:650px){.prompt-suggestions{margin-top:-6px}.prompt-suggestion{padding:10px}.prompt-suggestion-apply{font-size:9px}}
  `;
  document.head.appendChild(style);

  const panel = document.createElement('section');
  panel.className = 'prompt-suggestions';
  panel.setAttribute('aria-label', 'Suggerimenti per descrivere il modello');
  panel.setAttribute('aria-live', 'polite');
  prompt.insertAdjacentElement('afterend', panel);

  let hideTimer;
  function updateSuggestions() {
    clearTimeout(hideTimer);
    const value = prompt.value.trim();
    const entry = SUGGESTIONS.find((item) => item.match.test(value));
    panel.replaceChildren();
    if (!value || !entry) {
      panel.classList.remove('is-visible');
      return;
    }

    const header = document.createElement('div');
    header.className = 'prompt-suggestions-head';
    const title = document.createElement('span');
    title.className = 'prompt-suggestions-title';
    title.textContent = `Idee per: ${entry.title}`;
    const close = document.createElement('button');
    close.type = 'button'; close.className = 'text-button'; close.textContent = 'Nascondi';
    close.setAttribute('aria-label', 'Nascondi i suggerimenti');
    close.addEventListener('click', () => panel.classList.remove('is-visible'));
    header.append(title, close);
    const note = document.createElement('p');
    note.className = 'prompt-suggestions-note';
    note.textContent = 'Scegli una descrizione dettagliata: verrà inserita nel prompt e potrai modificarla prima di generare.';
    const list = document.createElement('div');
    list.className = 'prompt-suggestion-list';

    for (const suggestion of entry.options) {
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'prompt-suggestion';
      const copy = document.createElement('span'); copy.className = 'prompt-suggestion-copy';
      const name = document.createElement('span'); name.className = 'prompt-suggestion-name'; name.textContent = suggestion.title;
      const text = document.createElement('span'); text.className = 'prompt-suggestion-text'; text.textContent = suggestion.prompt;
      const apply = document.createElement('span'); apply.className = 'prompt-suggestion-apply'; apply.textContent = 'Usa →';
      copy.append(name, text); button.append(copy, apply);
      button.addEventListener('click', () => {
        prompt.value = suggestion.prompt;
        prompt.dispatchEvent(new Event('input', { bubbles: true }));
        prompt.focus();
        panel.classList.remove('is-visible');
      });
      list.appendChild(button);
    }
    panel.append(header, note, list);
    panel.classList.add('is-visible');
  }
  prompt.addEventListener('input', () => {
    hideTimer = setTimeout(updateSuggestions, 180);
  });
  prompt.addEventListener('focus', updateSuggestions);
}
