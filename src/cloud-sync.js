import { createClient } from '@supabase/supabase-js';

const $ = (selector) => document.querySelector(selector);
const PROJECTS_KEY = 'forma-saved-variants-v1';
const GALLERY_KEY = 'forma-variant-gallery-v1';
const CONFIG = import.meta.env || {};
const SUPABASE_URL = String(CONFIG.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '');
const SUPABASE_ANON_KEY = String(CONFIG.VITE_SUPABASE_ANON_KEY || '').trim();
const badge = $('#account-identity');
const shell = document.createElement('section');
shell.id = 'cloud-account';
shell.className = 'cloud-account';
shell.setAttribute('aria-labelledby', 'cloud-title');

function el(tag, attrs = {}, text = '') {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (key === 'className') node.className = value;
    else if (key === 'htmlFor') node.htmlFor = value;
    else node.setAttribute(key, value);
  }
  if (text) node.textContent = text;
  return node;
}
function showMessage(message, kind = 'info') {
  const node = $('#cloud-message');
  if (!node) return;
  node.textContent = message;
  node.dataset.kind = kind;
}
function updateIdentity(email = '') {
  if (!badge) return;
  const loggedIn = Boolean(email);
  badge.textContent = email || 'Guest';
  badge.dataset.authenticated = String(loggedIn);
  badge.title = loggedIn ? `Accesso effettuato come ${email}` : 'Non hai effettuato l’accesso';
  badge.setAttribute('aria-label', badge.title);
}
updateIdentity();
function readArray(key) {
  try { const data = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(data) ? data : []; }
  catch { return []; }
}
function writeArray(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { showMessage('Spazio locale insufficiente: libera spazio e riprova.', 'error'); return false; }
}
function itemKey(item, index) {
  if (item?.id) return String(item.id);
  const data = item?.config || item || {};
  return `${data.prompt || data['#prompt'] || 'item'}:${data.seed || data['#seed'] || index}`;
}
function mergeItems(local, remote) {
  const merged = new Map();
  for (const [index, item] of [...remote, ...local].entries()) {
    const key = itemKey(item, index);
    const previous = merged.get(key);
    if (!previous || Number(item.updatedAt || item.createdAt || 0) >= Number(previous.updatedAt || previous.createdAt || 0)) {
      merged.set(key, { ...item, id: item.id || key });
    }
  }
  return [...merged.values()].sort((a, b) => Number(b.updatedAt || b.createdAt || 0) - Number(a.updatedAt || a.createdAt || 0));
}
function fingerprint(projects, variants) { return JSON.stringify([projects, variants]); }
function setupUI() {
  const heading = el('div', { className: 'cloud-heading' });
  const copy = el('div');
  copy.append(el('span', { className: 'step-label' }, 'ACCESSO E SINCRONIZZAZIONE'), el('h2', { id: 'cloud-title' }, 'I tuoi progetti ovunque'), el('p', {}, 'Accedi per sincronizzare progetti e varianti tra i tuoi dispositivi.'));
  const state = el('span', { id: 'cloud-state', className: 'cloud-state' }, 'Solo su questo dispositivo');
  heading.append(copy, state);
  const message = el('p', { id: 'cloud-message', className: 'cloud-message', role: 'status', 'aria-live': 'polite' });
  shell.append(heading, message);
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    shell.classList.add('cloud-unconfigured');
    message.textContent = 'Configurazione Supabase mancante. Controlla VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY su Cloudflare e poi avvia un nuovo deploy.';
    $('#projects-section')?.insertAdjacentElement('beforebegin', shell);
    return null;
  }
  let parsedUrl;
  try { parsedUrl = new URL(SUPABASE_URL); }
  catch {
    message.textContent = 'VITE_SUPABASE_URL non è un URL valido. Inserisci l’URL base del progetto, per esempio https://<project-ref>.supabase.co.';
    message.dataset.kind = 'error';
    $('#projects-section')?.insertAdjacentElement('beforebegin', shell);
    return null;
  }
  if (!['https:', 'http:'].includes(parsedUrl.protocol) || (parsedUrl.pathname !== '/' && parsedUrl.pathname !== '')) {
    message.textContent = 'URL Supabase non valido: usa solo l’URL base del progetto senza /rest/v1, /auth/v1 o altri percorsi.';
    message.dataset.kind = 'error';
    $('#projects-section')?.insertAdjacentElement('beforebegin', shell);
    return null;
  }
  const form = el('form', { id: 'cloud-auth-form' });
  const emailLabel = el('label', { htmlFor: 'cloud-email' }, 'Email');
  const email = el('input', { id: 'cloud-email', type: 'email', autocomplete: 'email', required: 'required', placeholder: 'nome@esempio.it' });
  const passwordLabel = el('label', { htmlFor: 'cloud-password' }, 'Password');
  const password = el('input', { id: 'cloud-password', type: 'password', autocomplete: 'current-password', required: 'required', minlength: '8', placeholder: 'Almeno 8 caratteri' });
  const actions = el('div', { className: 'cloud-actions' });
  const signIn = el('button', { type: 'submit', id: 'cloud-sign-in', className: 'cloud-primary' }, 'Accedi');
  const signUp = el('button', { type: 'button', id: 'cloud-sign-up' }, 'Crea account');
  actions.append(signIn, signUp);
  form.append(emailLabel, email, passwordLabel, password, actions);
  const account = el('div', { id: 'cloud-signed-in', hidden: 'hidden' });
  const accountLabel = el('span', { id: 'cloud-user-email' });
  const signOut = el('button', { id: 'cloud-sign-out', type: 'button' }, 'Esci');
  account.append(accountLabel, signOut);
  shell.append(form, account);
  $('#projects-section')?.insertAdjacentElement('beforebegin', shell);
  return { form, email, password, signIn, signUp, account, accountLabel, signOut };
}

const ui = setupUI();
const cloudStyle = el('style');
cloudStyle.textContent = `
.cloud-account{margin:28px 0;padding:22px;border:1px solid #34313c;border-radius:10px;background:#17161c;color:#eeeaf5}.cloud-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.cloud-heading h2{margin:6px 0;font:700 20px Manrope,sans-serif}.cloud-heading p{margin:0;color:#a6a2af;font-size:13px}.cloud-state{padding:7px 10px;border:1px solid #494451;border-radius:20px;color:#c5bfce;font-size:12px;white-space:nowrap}.cloud-state[data-online="true"]{border-color:#4d806a;color:#c1e6d0}.cloud-message{min-height:1.4em;margin:12px 0;color:#c4bfd0;font-size:13px}.cloud-message[data-kind="error"]{color:#ffb5bd}.cloud-message[data-kind="success"]{color:#a7e0bd}#cloud-auth-form{display:grid;grid-template-columns:1fr 1fr;gap:8px 12px;max-width:680px}#cloud-auth-form label{grid-column:span 2;color:#d7d2df;font-size:12px}#cloud-auth-form input{grid-column:span 2;padding:10px 12px;border:1px solid #393640;border-radius:7px;background:#111115;color:#f5f2f8}#cloud-auth-form button,#cloud-signed-in button{padding:9px 14px;border:1px solid #494451;border-radius:7px;background:#211f27;color:#eeeaf5;cursor:pointer}.cloud-actions{grid-column:span 2;display:flex;gap:9px;margin-top:5px}.cloud-actions .cloud-primary{border-color:#9b87f5;background:#8069e8;color:white}#cloud-signed-in{align-items:center;gap:12px;color:#dcd7e4;font-size:13px}#cloud-signed-in:not([hidden]){display:flex}.cloud-unconfigured{background:#151519}.account-identity{display:inline-flex;align-items:center;gap:7px;max-width:min(36vw,300px);padding:7px 11px;border:1px solid #494451;border-radius:20px;background:#1a191f;color:#e8e4f0;font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.account-identity::before{content:'';width:7px;height:7px;flex:none;border-radius:50%;background:#9993a4}.account-identity[data-authenticated="true"]{border-color:#4d806a;color:#d3f0df}.account-identity[data-authenticated="true"]::before{background:#75d39b;box-shadow:0 0 8px #75d39b70}@media(max-width:600px){.cloud-account{padding:16px}.cloud-heading{flex-direction:column}.cloud-state{white-space:normal}#cloud-auth-form{grid-template-columns:1fr}#cloud-auth-form label,#cloud-auth-form input,.cloud-actions{grid-column:1}.account-identity{max-width:42vw;padding:6px 8px;font-size:11px}}
`;
document.head.append(cloudStyle);

if (ui) {
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  let currentUser = null;
  let syncing = false;
  let lastLocalFingerprint = '';
  let lastRemoteUpdatedAt = '';
  let pollTimer = null;

  async function getWorkspace() {
    const { data, error } = await supabase.from('user_workspaces').select('projects, variants, updated_at').eq('user_id', currentUser.id).maybeSingle();
    if (error) throw error;
    return data;
  }
  async function saveWorkspace(projects, variants) {
    const updatedAt = new Date().toISOString();
    const { error } = await supabase.from('user_workspaces').upsert({ user_id: currentUser.id, projects, variants, updated_at: updatedAt }, { onConflict: 'user_id' });
    if (error) throw error;
    lastRemoteUpdatedAt = updatedAt;
  }
  async function synchronize({ initial = false } = {}) {
    if (!currentUser || syncing) return;
    syncing = true;
    try {
      let localProjects = readArray(PROJECTS_KEY);
      let localVariants = readArray(GALLERY_KEY);
      const localBefore = fingerprint(localProjects, localVariants);
      const remote = await getWorkspace();
      if (initial) {
        localProjects = mergeItems(localProjects, remote?.projects || []);
        localVariants = mergeItems(localVariants, remote?.variants || []);
      } else {
        localProjects = mergeItems(localProjects, remote?.projects || []);
        localVariants = mergeItems(localVariants, remote?.variants || []);
      }
      writeArray(PROJECTS_KEY, localProjects);
      writeArray(GALLERY_KEY, localVariants);
      const mergedFingerprint = fingerprint(localProjects, localVariants);
      if (!remote || mergedFingerprint !== fingerprint(remote.projects || [], remote.variants || [])) await saveWorkspace(localProjects, localVariants);
      else lastRemoteUpdatedAt = remote.updated_at || '';
      lastLocalFingerprint = mergedFingerprint;
      showMessage('Progetti e varianti sincronizzati.', 'success');
      document.dispatchEvent(new CustomEvent('forma:cloud-synced'));
    } catch (error) {
      showMessage(`Accesso effettuato, ma sincronizzazione non riuscita: ${error.message || 'controlla la tabella e le policy RLS.'}`, 'error');
    } finally { syncing = false; }
  }
  function updateAuthUI(session) {
    currentUser = session?.user || null;
    const email = currentUser?.email || '';
    updateIdentity(email);
    $('#cloud-auth-form').hidden = Boolean(currentUser);
    $('#cloud-signed-in').hidden = !currentUser;
    $('#cloud-user-email').textContent = email;
    $('#cloud-state').textContent = currentUser ? 'Cloud attivo' : 'Solo su questo dispositivo';
    $('#cloud-state').dataset.online = String(Boolean(currentUser));
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
    if (currentUser) {
      showMessage('Accesso avvenuto. Caricamento e unione dei progetti locali e cloud…', 'success');
      synchronize({ initial: true });
      pollTimer = setInterval(() => synchronize(), 15000);
    } else {
      showMessage('Guest: i progetti restano disponibili in locale. Accedi per sincronizzarli.');
      lastLocalFingerprint = '';
      lastRemoteUpdatedAt = '';
    }
  }
  ui.form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!ui.form.reportValidity()) return;
    ui.signIn.disabled = true; ui.signUp.disabled = true;
    showMessage('Verifica delle credenziali…');
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: ui.email.value.trim(), password: ui.password.value });
      if (error) throw error;
      if (!data?.session || !data?.user) throw new Error('Supabase non ha restituito una sessione attiva. Controlla se l’email è stata confermata.');
      updateAuthUI(data.session);
      showMessage(`Accesso avvenuto come ${data.user.email}.`, 'success');
    } catch (error) { showMessage(`Accesso non riuscito: ${error.message || 'errore di autenticazione.'}`, 'error'); }
    finally { ui.signIn.disabled = false; ui.signUp.disabled = false; }
  });
  ui.signUp.addEventListener('click', async () => {
    if (!ui.form.reportValidity()) return;
    ui.signIn.disabled = true; ui.signUp.disabled = true;
    showMessage('Invio della richiesta di registrazione…');
    try {
      const { data, error } = await supabase.auth.signUp({ email: ui.email.value.trim(), password: ui.password.value, options: { emailRedirectTo: window.location.origin } });
      if (error) throw error;
      if (!data?.user) throw new Error('Supabase non ha confermato la creazione dell’account. Riprova.');
      if (data.session) {
        updateAuthUI(data.session);
        showMessage(`Registrazione account avvenuta e accesso effettuato come ${data.user.email}.`, 'success');
      } else {
        showMessage(`Registrazione account avvenuta per ${data.user.email}. Controlla la posta e conferma l’indirizzo prima di accedere.`, 'success');
      }
    } catch (error) { showMessage(`Registrazione non riuscita: ${error.message || 'errore di autenticazione.'}`, 'error'); }
    finally { ui.signIn.disabled = false; ui.signUp.disabled = false; }
  });
  ui.signOut.addEventListener('click', async () => {
    ui.signOut.disabled = true;
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      updateIdentity();
      showMessage('Disconnessione avvenuta. I dati locali restano su questo dispositivo.', 'success');
    } catch (error) { showMessage(`Disconnessione non riuscita: ${error.message || 'errore.'}`, 'error'); }
    finally { ui.signOut.disabled = false; }
  });
  supabase.auth.onAuthStateChange((_event, session) => updateAuthUI(session));
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) { updateIdentity(); showMessage(`Impossibile verificare la sessione: ${error.message}`, 'error'); }
    else updateAuthUI(data.session);
  });
}
