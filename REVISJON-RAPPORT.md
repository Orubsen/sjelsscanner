# Revisjonsrapport – Kjernekoden (sjelsscanner)

**Dato:** 9. juni 2026
**Omfang:** Full gjennomgang av kildekode i `sjelsscanner`-mappen (frontend, Netlify-funksjoner, konfigurasjon).
**Status:** Kun analyse – **ingen filer er endret.**

> Merk om arkitektur: Prosjektreglene beskriver siden som «statisk HTML, CSS og JavaScript». I praksis er dette et **React + Vite-prosjekt** med Netlify serverless-funksjoner og en Netlify Blobs-database for deltakerdata. Det er ikke en feil i seg selv, men reglene bør oppdateres så de stemmer med faktisk stack. Funnene under er prioritert: **[KRITISK]** = må fikses før videre drift, **[VIKTIG]** = bør fikses snart, **[FORBEDRING]** = kvalitet/vedlikehold.

---

## [KRITISK]

### K1 – Åpen AI-proxy uten autentisering (`netlify/functions/claude.js`)
Funksjonen videresender en **vilkårlig request-body** rett til Anthropic API med din `ANTHROPIC_API_KEY`, har `Access-Control-Allow-Origin: *` og **ingen validering eller tilgangskontroll**. Hvis nøkkelen er satt i Netlify, kan hvem som helst kalle `/api/claude` fra hvilken som helst nettside og bruke (og fakturere) AI-kontoen din fritt.
Endepunktet brukes **ikke** av frontend lenger (appen kjører mot `/api/gemini`).
**Anbefaling:** Fjern `claude.js` helt, eller lås den med samme validering/CORS-begrensning som resten. Sjekk samtidig at `ANTHROPIC_API_KEY` ikke ligger igjen i Netlify-miljøet unødvendig.

### K2 – Deltakerregister (persondata) beskyttet kun av ett passord uten forsøksgrense
`/api/list-participants` og `/api/verify-admin` beskytter navn, alder og e-post (persondata, GDPR) bak ett delt passord. Problemer:
- **Ingen rate-limiting / brute-force-beskyttelse** – passordet kan gjettes ubegrenset.
- Passordet sammenlignes med vanlig `!==` (ikke konstant-tid).
- `Access-Control-Allow-Origin: *` gjør at angrep kan kjøres fra hvilken som helst origin.
- Admin-«token» som lagres i `sessionStorage` **er selve passordet** i klartekst, og sendes som `Bearer` på hvert kall.
**Anbefaling:** Legg på forsøksgrense/forsinkelse, lås CORS til eget domene, bruk konstant-tid-sammenligning, og vurder en reell øktbasert token i stedet for å lagre råpassordet i nettleseren.

### K3 – CORS `*` på endepunkter som håndterer persondata
Samtlige funksjoner (`save-participant`, `list-participants`, `complete-participant`, `gemini`, `claude`) svarer med `Access-Control-Allow-Origin: *`. For endepunkter som lagrer/leser persondata bør dette låses til ditt eget domene (f.eks. `https://kjernekoden.netlify.app`).

---

## [VIKTIG]

### V1 – Race condition i deltaker-indeksen (Netlify Blobs)
Både `save-participant.js` og `complete-participant.js` gjør **les → endre → skriv** på `_index`-blobben uten lås. To samtidige forespørsler kan overskrive hverandre, slik at deltakere **forsvinner fra listen** (selv om enkeltpostene fortsatt finnes). Sjelden ved lav trafikk, men reell datatap-risiko.
**Anbefaling:** Vurder atomisk oppdatering, eller bygg listen ved å iterere over blob-nøkler i stedet for å vedlikeholde én delt indeks-blob.

### V2 – Feil/utdatert domene i delingsmetadata (Open Graph)
`index.html` og språkfilene bruker `https://sjelescanner.netlify.app` (merk: «sjele», ikke «sjels»), mens live-domenet ifølge prosjektet er `kjernekoden.netlify.app`. Konsekvens: feil canonical/`og:url` og **brutt delingsbilde**.
I tillegg er `og:image` en **`.svg`-fil**, som de fleste sosiale plattformer (Facebook, LinkedIn, X) **ikke rendrer** – forhåndsvisningen blir tom. `og:image:width/height` mangler også.
**Anbefaling:** Rett domenet alle steder, bytt `og:image` til PNG/JPG (1200×630) og legg til bredde/høyde.

### V3 – Logo på 1,9 MB lastes tre ganger per sidevisning
`public/rosten-logo.svg` er **1,9 MB** og brukes i `BrandWatermark`, `BrandHeader` og `IntroBrandMark` – altså tre `<img>`-referanser på intro-skjermen. Dette gir treg første innlasting, spesielt på mobil.
**Anbefaling:** Optimaliser SVG-en (SVGO) eller erstatt med en liten PNG/optimalisert SVG. En filstørrelse i denne størrelsesorden tyder på innebygde rasterdata.

### V4 – Død kode forvirrer og blåser opp repoet
- `src/psychoanalysis_app.jsx` (480 linjer): en **gammel, ubrukt versjon** av appen som kaller `/api/claude` med et annet skjema. Importeres ingen steder.
- `src/systemPrompt.js`: eksporterer `SYSTEM_PROMPT`, men appen bruker i18n-versjonen (`src/i18n/systemPrompts.js`). Ubrukt.
- `netlify/functions/claude.js`: ikke i bruk (se K1).
**Anbefaling:** Fjern de tre for å unngå forvirring og fremtidige feilkoblinger.

### V5 – Manglende fokus-tilstand for tastatur/skjermleser
Svaralternativ-knappene i `QuestionScreen` viser tilstand kun via `onMouseEnter`/`onMouseLeave` (hover). Det finnes **ingen `:focus`/`:focus-visible`-stil**, så tastatur- og skjermleserbrukere ser ikke hvilket element som er i fokus. Dette er et direkte tilgjengelighetsproblem (prosjektmål 3).
**Anbefaling:** Legg til synlig fokusmarkering på alle interaktive elementer.

---

## [FORBEDRING]

### F1 – Hardkodet modellnavn to steder
`gemini-3.5-flash` er hardkodet både i `src/App.jsx` (linje ~1123) og som `DEFAULT_MODEL` i `netlify/functions/gemini.js`. Modellnavnet er gyldig (GA siden mai 2026), men duplisering gjør bytte tungvint.
**Anbefaling:** Samle i én konstant eller miljøvariabel.

### F2 – Inline-styles med gjentatte hardkodede farger
Komponentene bruker svært mye inline-`style`, og feil-/aksentfarger som `#f87171`, `#fecaca`, `rgba(129,140,248,…)` er hardkodet mange steder i stedet for CSS-variabler. Temaet finnes delvis som `:root`-variabler, men ikke konsekvent.
**Anbefaling:** Flytt fargene til CSS-variabler i `theme.css` (prosjektmål 2). Bevarer eksakt samme uttrykk.

### F3 – Tema og fonter dupliseres per side
`App.jsx`, `AdminScreen.jsx` og `PersonvernPage.jsx` deklarerer hver sin `:root`-blokk og `@import` av Google Fonts inne i en `<style>`-tag. Det gir duplisering og kan gi FOUT / dobbel fontlasting.
**Anbefaling:** Sentraliser variabler og fontimport i `theme.css`.

### F4 – `zoom`-basert desktop-skalering
`theme.css` skalerer hele `.app-root` med `zoom: 1.75–2` på desktop. Det fungerer i moderne nettlesere (med en `transform`-fallback for eldre Firefox), men `zoom` er en ikke-standard egenskap og gir mindre forutsigbar layout.
**Anbefaling:** Vurder `rem`/`clamp()`-basert skalering på sikt. Ikke kritisk.

### F5 – Rå feilmeldinger fra Gemini sendes til klient
`gemini.js` returnerer Gemini sine feilmeldinger direkte til nettleseren. Lav risiko, men kan lekke intern info.
**Anbefaling:** Logg detaljer server-side, vis generisk melding til bruker.

### F6 – `<html lang>` skiller ikke nynorsk
`I18nContext` setter `document.documentElement.lang` til `"en"` eller `"no"`; nynorsk (`nn`) faller til `"no"`. Liten a11y-presisjon.

### F7 – Opprydding i arbeidsmappen
- `deno.lock` ligger i et npm/Vite-prosjekt → forvirrende, bør fjernes.
- En nøstet `sjelsscanner/`-mappe med eget `.git` og en lokal `.netlify/`-DB ligger i arbeidsmappen. Begge er gitignored, men roter til mappestrukturen.

---

## Positivt / ikke et problem
- `.env` er korrekt utelatt fra Git (ikke sporet). Ingen hemmeligheter funnet i versjonskontroll.
- Inputvalidering på `save-participant` (navn, alder 16–99, e-post, samtykke) er på plass.
- God feilhåndtering og JSON-«reparasjon» i `gemini.js` for robuste AI-svar.
- Solid i18n-struktur (nb/nn/en) og dedikert personvernside med samtykkeflyt.
- Modellnavnet `gemini-3.5-flash` er gyldig – ingen feil der.

---

## Foreslått rekkefølge for utbedring
1. **K1** (fjern/lås åpen proxy) og **K3** (CORS) – raskt og fjerner størst eksponering.
2. **K2** (admin/brute-force + persondata) – viktigst for GDPR.
3. **V2** (delingsdomene/og:image) og **V3** (logo-størrelse) – synlige, lavrisiko gevinster.
4. **V4** (død kode) – gir renere base før refaktorering.
5. **V1** (race condition), **V5** (fokus-a11y), deretter **F1–F7**.

*Ingen kodeendringer er utført. Si fra hvilke punkter du vil at jeg skal fikse først, så lager jeg komplette, ferdige filer i tråd med prosjektreglene.*
