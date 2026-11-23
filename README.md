# Forma — Generatore di modelli 3D

Piccola applicazione web statica per creare ed esplorare geometrie parametriche reali direttamente nel browser. La descrizione riconosce le forme supportate (cubo/parallelepipedo, sfera, cilindro, cono e toro); dimensioni e colore sono configurabili. L'app non usa AI, non chiama API esterne e non richiede chiavi o servizi backend. I file GLB, STL e PNG vengono generati localmente.

## Avvio in locale

Requisiti: Node.js 18 o superiore e npm.

```bash
npm install
npm run dev
```

Apri l'indirizzo locale stampato da Vite nel terminale. Per provare la build di produzione in locale:

```bash
npm run build
npm run preview
```

La build produce il sito statico nella cartella `dist/`.

## Pubblicazione su Cloudflare Pages

1. Fai il push del repository su GitHub e, nella dashboard Cloudflare, vai su **Workers & Pages → Create application → Pages → Connect to Git**.
2. Seleziona questo repository. Imposta:
   - **Framework preset:** `Vite` (oppure `None`)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Root directory:** `/` (valore predefinito)
3. Salva e avvia il deployment. Cloudflare installerà le dipendenze da `package.json`, eseguirà la build e pubblicherà il contenuto di `dist/`.

Non servono variabili d'ambiente né funzioni Cloudflare Pages: è un sito statico. Per pubblicazioni successive basta fare push sul branch collegato.

## Nota sul generatore

La creazione è procedurale e deterministica: il testo serve a riconoscere una delle forme geometriche implementate, non viene interpretato da un modello AI. Il visualizzatore usa Three.js; GLB è esportato come scena 3D e STL come mesh per la stampa. L'esportazione richiede che JavaScript e WebGL siano disponibili nel browser.
