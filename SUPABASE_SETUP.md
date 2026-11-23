## Diagnostica account e deploy

- `VITE_SUPABASE_URL` deve contenere l'URL base del progetto, per esempio `https://<project-ref>.supabase.co`. La app rimuove automaticamente un suffisso `/rest/v1` o `/auth/v1`, ma dopo una modifica alle variabili è comunque necessario un nuovo build/deploy.
- `VITE_SUPABASE_ANON_KEY` accetta la chiave pubblica `sb_publishable_...` o la legacy `anon`. Non usare mai `service_role` o una chiave secret.
- Il codice sorgente usa Vite: le variabili `VITE_*` devono essere disponibili alla fase di build. Se si pubblica un Cloudflare Worker, verificare che il Worker serva gli asset prodotti da `npm run build` in `dist/`; le variabili runtime del Worker non sostituiscono automaticamente le variabili Vite di build.
- In Supabase Authentication → URL Configuration, Site URL deve corrispondere all'origine del sito effettivo e quella stessa origine deve essere ammessa nei Redirect URLs.
- La scritta “Registrazione account avvenuta” è mostrata solo dopo una risposta di creazione utente da Supabase; l'email può dover essere confermata prima del login. Errori di rete, URL, chiave o policy vengono mostrati nel messaggio del pannello.
