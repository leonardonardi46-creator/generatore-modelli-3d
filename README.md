# Forma — Generatore di modelli 3D

Generatore statico di geometrie procedurali che funziona nel browser senza AI e senza API esterne. Include una libreria di primitive, forme speciali e oggetti composti; il prompt seleziona forme e attributi codificati. Non interpreta oggetti arbitrari fuori dalla libreria.

## Avvio in locale

Richiede Node.js 18+ e npm:

```bash
npm install
npm run dev
```

Per verificare la versione di produzione:

```bash
npm run build
npm run preview
```

La build statica viene generata in `dist/`.

## Cloudflare Pages

Collega il repository a Cloudflare Pages e imposta:

- Framework preset: **Vite** (o None)
- Build command: **`npm run build`**
- Build output directory: **`dist`**
- Root directory: **`/`**

Non servono funzioni server, chiavi o variabili d'ambiente.

## Parametri mesh

Il pannello **Parametri avanzati** è facoltativo e include preset qualità, budget polycount manuale (100–50.000 triangoli), rugosità, ombreggiatura liscia e wireframe. Modificare le opzioni ricostruisce il modello; GLB e STL esportano la mesh corrente.

Il polycount è un obiettivo massimo approssimativo, non un conteggio garantito: la semplificazione preserva la geometria e può fermarsi prima del budget, specialmente per mesh composte. Il contatore mostra i triangoli attuali. Le impostazioni non assicurano mesh manifold, pareti cave o idoneità alla stampa: controlla il file in un software di slicing prima di stampare.
