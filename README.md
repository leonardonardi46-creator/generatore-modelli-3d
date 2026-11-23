# Forma — Generatore di modelli 3D

Generatore statico di geometrie procedurali eseguito nel browser, senza AI o API esterne. Prompt e libreria selezionano ricette di forme definite nel codice; varianti deterministiche esplorano combinazioni parametriche delle parti esistenti. Non crea arbitrariamente qualsiasi oggetto descritto.

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

## Varianti e modelli salvati

Nel pannello facoltativo **Parametri avanzati** trovi:

- **Seed riproducibile**: lo stesso prompt, forma e seed genera la stessa variante. Usa **Nuovo seed** per crearne una diversa.
- **Intensità variazione**: varia in modo deterministico, entro limiti controllati, scala e posizione delle parti della ricetta.
- **Salva nei miei modelli**: conserva fino a 30 configurazioni in `localStorage` del browser; puoi ricaricarle o eliminarle. I dati restano sul dispositivo/browser in cui sono stati salvati.
- Preset qualità, polycount manuale (100–50.000 triangoli), rugosità, smoothing e wireframe. GLB e STL esportano la mesh corrente.

La variazione non aggiunge semantica o parti che non siano già definite nella geometria della forma. Il polycount è un budget approssimativo; il conteggio effettivo è mostrato nell'interfaccia. I file STL vanno verificati in un software di slicing prima della stampa: l'app non certifica manifold, spessore pareti o tolleranze.
