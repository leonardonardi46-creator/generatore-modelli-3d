# Forma — Generatore di modelli 3D

Applicazione web statica per creare ed esplorare modelli 3D procedurali direttamente nel browser. Non integra AI né invia richieste a servizi esterni: riconosce parole chiave e attributi supportati e costruisce geometrie reali usando Three.js.

La libreria include oltre 30 forme: cubo, sfera, ellissoide, cilindro, cono, capsula, toro, anello, tubo curvo; solidi platonici, piramide e prismi; cuore, stella, ingranaggio, molla, ciotola, vaso e nodo toroidale; oggetti composti come albero, casa, pupazzo di neve, razzo, tavolo, sedia, auto, lampada e tazza. Il prompt comprende sinonimi in italiano e inglese, colori, finitura metallica e dimensioni espresse come “alto 3” o “larghezza 2”. La libreria può essere ampliata aggiungendo forme procedurali a `src/shape-library.js`.

**Limite importante:** senza AI o un generatore geometrico generale, il programma non può creare qualsiasi oggetto descritto liberamente. Il prompt seleziona e configura modelli e forme definiti nel codice; per forme non incluse serve estendere la libreria. L'app non simula l'interpretazione di prompt non supportati.

## Avvio in locale

Requisiti: Node.js 18 o superiore e npm.

```bash
npm install
npm run dev
```

Apri l'indirizzo locale stampato da Vite. Per verificare la build di produzione in locale:

```bash
npm run build
npm run preview
```

La build statica viene generata nella cartella `dist/`.

## Pubblicazione su Cloudflare Pages

Collega il repository da **Workers & Pages → Create application → Pages → Connect to Git**, quindi configura:

- **Framework preset:** Vite (oppure None)
- **Build command:** `npm run build`
- **Build output directory:** `dist`
- **Root directory:** `/`

Cloudflare installa le dipendenze da `package.json`, compila il progetto e pubblica `dist/`. Non servono funzioni Pages, chiavi o variabili d'ambiente. I successivi push sul branch collegato avviano un nuovo deployment.

## Funzioni

- Visualizzazione 3D interattiva con rotazione e zoom (anche touch).
- Dimensioni configurabili; il prompt può contenere misure, ad esempio “alto 3”.
- Colori e finitura metallica riconosciuti nel prompt, oltre alla scelta manuale del colore.
- Esportazione locale in GLB, STL e immagine PNG.
- Compatibile con hosting statico Cloudflare Pages.
