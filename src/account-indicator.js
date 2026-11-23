const badge = document.querySelector('#account-identity');
if (badge) {
  function render() {
    const account = document.querySelector('#cloud-signed-in');
    const email = document.querySelector('#cloud-user-email')?.textContent?.trim();
    const authenticated = Boolean(account && !account.hidden && email);
    badge.textContent = authenticated ? email : 'Guest';
    badge.dataset.authenticated = String(authenticated);
    badge.title = authenticated ? `Accesso effettuato come ${email}` : 'Non hai effettuato l’accesso';
    badge.setAttribute('aria-label', badge.title);
  }
  render();
  new MutationObserver(render).observe(document.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['hidden'],
  });
}
