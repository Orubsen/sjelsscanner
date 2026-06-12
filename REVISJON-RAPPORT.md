# Revisjonsrapport – Kjernekoden (sjelsscanner)

**Dato:** 11. juni 2026  
**Omfang:** Full gjennomgang av kildekode i `sjelsscanner`-mappen (frontend, Netlify-funksjoner, konfigurasjon).  
**Status:** Revisjon fullført. Tidligere kritiske og viktige feil (K1, V1) er verifisert som løst i kildekoden. Nye utfordringer knyttet til serverless-arkitektur og ytelse er identifisert og dokumentert under.

---

## [KRITISK]

### K1 – Ikke-persistent (in-memory) admin-sesjon og rate-limiting i serverless backend
* **Problem:** I [participant-blobs.js](file:///c:/Users/Røsten_9unxm1t/.gemini/antigravity-ide/scratch/sjelsscanner/netlify/functions/participant-blobs.js#L98-L114) lagres sesjonstokene (`sessionStore = new Map()`) og rate-limiting-forsøk (`rateLimitMap = new Map()`) i minnet (in-memory variables) på Node.js-kjøretiden.
* **Konsekvens:** Netlify Functions kjører i serverless-miljøer (ephemere, stateless containere). Når funksjonen skaleres ned, startes på nytt (cold start) eller kjøres på tvers av flere instanser (horisontal skalering):
  1. Sesjonene vil tilfeldig slettes eller avvises. En admin som nettopp logget inn, vil plutselig oppleve `401 Ugyldig eller utløpt sesjon. Logg inn på nytt` om neste forespørsel treffer en annen instans.
  2. Rate-limiting vil være upålitelig og lett å omgå fordi hver instans har sitt eget minne.
* **Anbefaling:** Bruk enten en stateless token-signering (f.eks. **JWT - JSON Web Tokens** signert med en hemmelig miljøvariabel `JWT_SECRET`) som lar alle uavhengige instanser verifisere tokens uten felles tilstand, eller lagre aktive sesjonsnøkler persistent i en database eller via Netlify Blobs.

---

## [VIKTIG]

### V1 – Ytelses- og timeout-risiko ved listing av deltakere (`loadAllParticipants`)
* **Problem:** I [participant-blobs.js](file:///c:/Users/Røsten_9unxm1t/.gemini/antigravity-ide/scratch/sjelsscanner/netlify/functions/participant-blobs.js#L159-L179) henter funksjonen `loadAllParticipants` først alle nøkler fra butikken, og gjør deretter en individuell `store.get(key)` i parallell via `Promise.all` for hver eneste deltaker.
* **Konsekvens:** Dersom det lagres mange deltakere i databasen (f.eks. 50+), vil dette utløse dusinvis eller hundrevis av parallelle HTTP-forespørsler til Netlify Blobs innenfor én enkelt funksjonskjøring. Dette vil:
  1. Føre til ekstremt høy ventetid for administratoren.
  2. Raskt overskride Netlifys standard tidsavbrudd for funksjoner (10 sekunder på gratis/standard, 26 sekunder på Pro), noe som gjør at hele admin-panelet slutter å virke.
* **Anbefaling:** Implementer paginering (pagination), eller lagre en samlet metadata-indeksfil (f.eks. `_index` eller ukentlige indekser) som oppdateres kontrollert ved registrering, slik at listen kan vises raskt uten å måtte laste ned hver enkelt deltaker-blob individuelt.

---

## [FORBEDRING]

### F1 – Unødvendig duplisering av Google Fonts-forespørsler
* **Problem:** Fontene `IBM Plex Mono`, `Crimson Pro` og `Cormorant Garamond` hentes og lastes inn i to uavhengige stiler: via `<link>`-tagger i [index.html](file:///c:/Users/Røsten_9unxm1t/.gemini/antigravity-ide/scratch/sjelsscanner/index.html#L12) og via en `@import`-regel øverst i [theme.css](file:///c:/Users/Røsten_9unxm1t/.gemini/antigravity-ide/scratch/sjelsscanner/src/theme.css#L8).
* **Konsekvens:** Nettleseren utfører unødvendige dupliserte nettverkskall, noe som gir marginalt tregere sidelasting.
* **Anbefaling:** Fjern `@import`-linjen øverst i `theme.css` og behold `<link>`-taggene i `index.html` (siden disse også drar nytte av `preconnect`).

### F2 – Død/ubrukt kodefil `ParticleField.jsx`
* **Problem:** Kildekoden inneholder filen [src/ParticleField.jsx](file:///c:/Users/Røsten_9unxm1t/.gemini/antigravity-ide/scratch/sjelsscanner/src/ParticleField.jsx) som definerer `ParticleField`-komponenten. Denne filen er imidlertid helt ubrukt da frontend-applikasjonen importerer `ParticleField` fra [BrandChrome.jsx](file:///c:/Users/Røsten_9unxm1t/.gemini/antigravity-ide/scratch/sjelsscanner/src/BrandChrome.jsx#L10) der koden er duplisert.
* **Konsekvens:** Død kode øker bundle-størrelsen og skaper forvirring under vedlikehold.
* **Anbefaling:** Slett [src/ParticleField.jsx](file:///c:/Users/Røsten_9unxm1t/.gemini/antigravity-ide/scratch/sjelsscanner/src/ParticleField.jsx).

### F3 – Ubrukt funksjon `compactMessagesForApi`
* **Problem:** I [jsonUtils.js](file:///c:/Users/Røsten_9unxm1t/.gemini/antigravity-ide/scratch/sjelsscanner/src/jsonUtils.js#L225) er funksjonen `compactMessagesForApi` deklarert for å komprimere historikk. Den importeres i `sessionHelpers.js`, men blir aldri kalt.
* **Anbefaling:** Fjern funksjonen og dens tilhørende importlinje for å holde koden ren.

### F4 – Hardkodet ugyldig modellnavn i testskript
* **Problem:** I testskriptet [test-gemini-question.mjs](file:///c:/Users/Røsten_9unxm1t/.gemini/antigravity-ide/scratch/sjelsscanner/scripts/test-gemini-question.mjs#L43) er API-forespørselen hardkodet mot `gemini-3.5-flash` i URL-en.
* **Konsekvens:** Modellen eksisterer ikke offisielt i Gemini API-et på denne formen, noe som gjør at testskriptet feiler med HTTP 404/400.
* **Anbefaling:** Endre til et gyldig modellnavn som `gemini-2.5-flash` eller les fra miljøvariabel.

---

## Status for tidligere identifiserte punkter (9. juni)

* **K1 (Åpen AI-proxy):** **LØST.** `claude.js` er fjernet.
* **K2 (Svakt admin-passord/GDPR):** **LØST.** Passord-overføring og konstant-tid-sammenligning er implementert på server-siden. (Men se ny [KRITISK] feil over vedrørende lagring av sesjonstokenet).
* **K3 (CORS *):** **LØST.** Låst til `ALLOWED_ORIGIN` i produksjon.
* **K1 (React asynkron tilstandsoppdatering siste spørsmål):** **LØST.** Både `triggerAnalysis` og `finishAnalysis` i `App.jsx` er oppdatert til å ta imot `answersToUse`/`nextStructured` direkte under innsending av siste svar.
* **V1 (Hardkodet modellnavn i frontend):** **LØST.** `model: "gemini-2.5-flash"` er fjernet fra fetch-bodyen i `App.jsx`, og faller nå korrekt tilbake på miljøvariabelen `GEMINI_MODEL` på serveren.
* **V1 (Race condition i Netlify Blobs _index):** **LØST.** Slettet `_index`-avhengighet. Henter og sorterer blobs dynamisk.
* **V2 (Utdatert delingsmetadata):** **LØST.** Open Graph-lenker peker på riktig domene og bruker PNG.
* **V3 (Stor logofil):** **LØST.** `rosten-logo.svg` er optimalisert.
* **V4 (Død kode):** **LØST.** Gamle filer slettet.
* **V5 (Tastaturfokus/a11y):** **LØST.** `:focus-visible` lagt til i `theme.css`.
* **F2, F3 (Inline-styles og font-duplisering):** **LØST.** Sentralisert i `theme.css`.
* **F5 (Rå feilmeldinger):** **LØST.** Serversiden logger feil og returnerer sikre feilmeldinger til klienten.
* **F6 (Språktag nynorsk):** **LØST.** html-tag `lang` settes nå dynamisk via `I18nContext.jsx`.
