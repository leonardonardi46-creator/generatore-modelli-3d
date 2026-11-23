# Attivare account e sincronizzazione cloud

L'app continua a funzionare senza configurazione Supabase: in quel caso i dati restano nel browser. Per usare account email/password e sincronizzare progetti e galleria tra dispositivi, configura Supabase e Cloudflare una volta.

## 1. Crea il progetto Supabase

1. Vai su [supabase.com/dashboard](https://supabase.com/dashboard), accedi e crea un progetto.
2. Scegli una password per il database e una regione vicina ai tuoi utenti; conserva la password in un password manager.
3. Attendi che il progetto sia pronto.

## 2. Crea la tabella protetta

1. Nel progetto Supabase apri **SQL Editor → New query**.
2. Copia e incolla tutto il contenuto di `supabase/schema.sql`.
3. Premi **Run**. La tabella usa Row Level Security: ogni account può accedere solo ai propri progetti.

## 3. Abilita account email/password

1. In Supabase apri **Authentication → Providers → Email** e lascia abilitato Email.
2. In **Authentication → URL Configuration**, aggiungi l'URL pubblicato su Cloudflare Pages fra i **Redirect URLs** (ad esempio `https://nome-progetto.pages.dev/**`).
3. Imposta **Site URL** con il dominio pubblico corretto. Se usi un dominio personalizzato, aggiungi anche quello ai Redirect URLs.
4. La conferma email è raccomandata. L’utente dovrà cliccare il link ricevuto prima del primo accesso (se la conferma è attiva).

## 4. Imposta le variabili su Cloudflare Pages

1. Apri **Cloudflare Dashboard → Workers & Pages → il tuo progetto → Settings → Variables and Secrets**.
2. Aggiungi queste variabili per l’ambiente **Production** e, se serve, **Preview**:
   - `VITE_SUPABASE_URL`: URL del progetto Supabase, disponibile in **Project Settings → API**.
   - `VITE_SUPABASE_ANON_KEY`: chiave pubblica/anon del progetto, nella stessa pagina API. In dashboard recenti può essere chiamata **publishable key**.
3. Non inserire mai `service_role`, secret key o password del database in variabili `VITE_*` o nel codice del browser: sarebbero pubbliche. L’accesso è protetto da RLS, non dalla segretezza della chiave anon.
4. Salva le variabili e lancia un nuovo deploy. Vite le legge durante la build, quindi una modifica alle variabili richiede una nuova build.

## 5. Verifica

1. Apri il sito pubblicato e crea un account con email e password di almeno 8 caratteri.
2. Conferma l’email, se richiesto, poi accedi.
3. Salva un progetto e controlla in Supabase **Table Editor → user_workspaces** che compaia una riga con il tuo `user_id`.
4. Apri lo stesso sito da un altro browser/dispositivo, accedi allo stesso account e verifica che progetti e varianti compaiano.
5. Prova a creare un secondo account: non deve poter leggere la riga del primo account.

## Note sui dati e sulla sincronizzazione

- I progetti salvati in locale vengono uniti al workspace cloud al primo accesso; non vengono cancellati dal browser.
- Il cloud salva configurazioni e miniature, non file GLB/STL né modelli 3D completi: il modello si rigenera nel browser.
- La sincronizzazione controlla le modifiche ogni 15 secondi mentre la pagina è aperta. Al momento è una sincronizzazione di configurazioni/versioni recenti, non un sistema collaborativo in tempo reale.
- Per uso pubblico esteso conviene configurare limiti di registrazione e SMTP personalizzato in Supabase Auth.
