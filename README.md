# Forma — Generatore 3D procedurale

Applicazione web statica per creare ed esplorare geometrie procedurali nel browser. Nessuna AI o API esterna: forme, ricette di oggetti e texture sono costruite dal codice locale. Il parser riconosce le entità e gli attributi supportati e non inventa oggetti fuori dalle regole implementate.

## Suggerimenti per migliorare il prompt

Quando scrivi un oggetto supportato (ad esempio gatto, casa, albero, auto, sedia, tavolo, razzo o vaso), sotto al campo appare una scelta di descrizioni più precise. Selezionandone una, il testo viene inserito nel prompt e rimane modificabile prima di premere **Genera modello**. I suggerimenti sono ricette locali curate nel codice, non vengono generati da AI. Aggiungi nuove proposte nell'array `SUGGESTIONS` di `src/prompt-suggestions.js`.

Esempio per il gatto: puoi scegliere un gatto classico, tigrato o con cappello da strega. Il prompt suggerito per il cappello specifica colori diversi per pelo e cappello; l'oggetto resta stilizzato e segue solo le forme/parti supportate dal generatore.

## Texture e palette semantiche

Le texture canvas vengono generate localmente per finiture riconoscibili (legno, metallo spazzolato, tessuto, pietra, marmo e pelo). Quando il prompt nomina un materiale, l'applicazione crea una texture procedurale corrispondente; altrimenti assegna una palette deterministica in base a forma, prompt e seed. Gli oggetti composti possono usare colori separati per parte. GLB può contenere materiali e texture; STL esporta solo geometria, senza colore o texture.

## Avvio in locale

Richiede Node.js 18+ e npm:

```bash
npm install
npm run dev
```

Verifica la build di produzione:

```bash
npm run build
npm run preview
```

La build statica è `dist/`.

## Cloudflare Pages

- Framework preset: **Vite** (o None)
- Build command: **`npm run build`**
- Build output directory: **`dist`**
- Root directory: **`/`**

Non servono funzioni server, chiavi o variabili d'ambiente.

## Altre opzioni

Il pannello avanzato mantiene polycount manuale, preset qualità, rugosità, smoothing, wireframe, seed riproducibile, intensità delle varianti e fino a 30 configurazioni salvate in locale. GLB e STL esportano la mesh corrente. Il polycount è un budget, non un conteggio garantito; controllare gli STL in uno slicer prima della stampa.
