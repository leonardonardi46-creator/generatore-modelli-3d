# Forma — Generatore 3D procedurale

Applicazione web statica per creare ed esplorare geometrie procedurali nel browser. Nessuna AI o API esterna: forme, ricette di oggetti e texture sono costruite dal codice locale. Il parser riconosce le entità e gli attributi supportati e non inventa oggetti fuori dalle regole implementate.

## Texture e palette semantiche

Le texture canvas vengono generate localmente per finiture riconoscibili (legno, metallo spazzolato, tessuto, pietra, marmo e pelo). Quando il prompt nomina un materiale, l'applicazione crea una texture procedurale corrispondente; altrimenti assegna una palette deterministica in base a forma, prompt e seed.

Gli oggetti composti possono usare materiali diversi per parte. Per esempio, un gatto con cappello da strega ha texture da pelo e colore predefinito per il gatto, e tessuto/colore separato per il cappello. I colori scritti vicino al nome della parte prevalgono: “gatto nero con cappello viola”. In assenza di colore esplicito, usa colori di default coerenti (gatto ocra, cappello viola). La geometria del gatto è stilizzata/procedurale, non una ricostruzione fotorealistica.

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

Il pannello avanzato mantiene polycount manuale, preset qualità, rugosità, smoothing, wireframe, seed riproducibile, intensità delle varianti e fino a 30 configurazioni salvate in locale. GLB esporta texture e materiali; STL contiene solo geometria, senza colore o texture. La qualità delle mesh, il manifold e la stampabilità non sono certificati: controllare gli STL in uno slicer.
