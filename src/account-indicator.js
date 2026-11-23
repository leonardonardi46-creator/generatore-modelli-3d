const badge = document.querySelector('#account-identity');
if (badge) {
  const style = document.createElement('style');
  style.textContent = `.account-identity{display:inline-flex;align-items:center;gap:7px;max-width:min(36vw,300px);padding:7px 11px;border:1px solid #494451;border-radius:20px;background:#1a191f;color:#e8e4f0;font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.account-identity::before{content:'';width:7px;height:7px;flex:none;border-radius:50%;background:#9993a4}.account-identity[data-authenticated="true"]{border-color:#4d806a;color:#d3f0df}.account-identity[data-authenticated="true"]::before{background:#75d39b;box-shadow:0 0 8px #75d39b70}@media(max-width:600px){.account-identity{max-width:42vw;padding:6px 8px;font-size:11px}}`;
  document.head.append(style);

  function updateIdentity() {
    const account = document.querySelector('#cloud-signed-in');
    const email = document.querySelector('#cloud-user-email')?.textContent?.trim();
    const loggedIn = Boolean(account && !account.hidden && email);
    badge.textContent = loggedIn ? email : 'Guest';
    badge.dataset.authenticated = String(loggedIn);
    badge.title = loggedIn ? `Accesso effettuato come ${email}` : 'Non hai effettuato l’accesso';
    badge.setAttribute('aria-label', badge.title);
  }
  const observer = new MutationObserver(updateIdentity);
  observer.observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['hidden'] });
  updateIdentity();
}
