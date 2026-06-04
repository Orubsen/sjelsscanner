/** Nynorsk UI and API message strings */
export const nn = {
  brand: {
    name: "Røsten",
    product: "Skyggelabyrinten",
    company: "RØSTEN ENT",
    tagline: "Kirurgisk psykoanalytisk kartlegging — ikkje ein personlegdomstest.",
    developedBy: "Utvikla av {company}. · {product}",
    contactEmail: "kontakt@xn--rubenrsten-5cb.no",
    websiteUrl: "https://rubenrøsten.no",
    websiteLabel: "rubenrøsten.no",
    siteUrl: "https://sjelescanner.netlify.app",
    rightsReserved: "Alle rettar reservert.",
  },
  frameworks: {
    attachment: "Tilknyting",
    defense_mechanisms: "Forsvarsmekanismar",
    jungian_archetypes: "Jungianske arketypar",
    freudian_analysis: "Freudiansk analyse",
    ace_impact: "ACE-påverknad",
  },
  frameworkList: [
    "Big Five",
    "Tilknytingsteori",
    "Forsvarsmekanismar",
    "Jungianske arketypar",
    "Freudiansk analyse",
    "ACE-forsking",
  ],
  crisis: {
    title: "TRENGER DU HJELP NO?",
    intro:
      "Skyggelabyrinten erstattar ikkje krisehjelp eller behandling. Ved akutt ubehag eller krise:",
    lines: [
      { label: "Mental Helse – Hjelpetelefonen", value: "116 123", href: "tel:116123" },
      { label: "Akutt medisinsk nødhjelp", value: "113", href: "tel:113" },
    ],
  },
  estimatedMinutes: { min: 15, max: 30 },
  estimatedTime: {
    label: "ESTIMERT TID · ",
    text: "ca. {min}–{max} minutt (avhengig av tal spørsmål før analyse).",
  },
  contact: { label: "KONTAKT · ", website: "Heimeside" },
  consent: {
    body:
      "Eg godtek personvernerklæringa og samtykkjer til at dataa mine vert brukte til denne kartlegginga.",
    privacyLink: "personvernerklæringa",
    required: "Du må samtykkje til lagring for å starte.",
  },
  validation: {
    nameMin: "Skriv minst 2 teikn.",
    ageRange: "Alder må vere {min}–{max}.",
    emailInvalid: "Ugyldig e-postadresse.",
  },
  ageGuidance: {
    default: "Tilpass språk til vaksen deltakar.",
    under20:
      "Deltakar er ung vaksen (under 20). Bruk klart, respektfullt språk utan nedlatande tone. Døme og alternativ kan knytast til skule, venner, familie og tidleg identitetsutforsking — ikkje barnespråk.",
    age20_29:
      "Deltakar er 20–29. Tilpass formuleringar til tidleg vaksenliv: studium, karrierestart, partnerskap, autonomi vs. tilhøyre.",
    age30_44:
      "Deltakar er 30–44. Tilpass til etablert vaksenliv: arbeid, relasjonar, ansvar, langsiktige mønster.",
    age45_59:
      "Deltakar er 45–59. Tilpass til midtliv: erfaring, prioriteringar, relasjons- og karrieremønster over tid.",
    age60plus:
      "Deltakar er 60+. Respekter livserfaring; unngå forenkling. Formuler alternativ som kan gjelde langvarige mønster, helse og livsfase — aldri aldersdiskriminerande eller nedlatande.",
  },
  footer: {
    privacy: "Personvern",
    contact: "Kontakt",
    crisis: "Krise 116 123",
  },
  lang: { label: "Språk" },
  intro: {
    version: "PSYKOANALYTISK SYSTEM v2.4.1",
    titleLine1: "SKYGGE",
    titleLine2: "LABYRINTEN",
    hint: "Vel det alternativet som liknar mest på deg. Systemet er designa for å identifisere sjølvbedraging.",
    beforeStart: "FØR VI STARTAR",
    name: "NAMN",
    age: "ALDER",
    email: "E-POST",
    namePlaceholder: "Førenamn og etternamn",
    emailPlaceholder: "din@epost.no",
    questionsFromTitle: "KOR KJEM SPØRSMÅLA FRÅ?",
    questionsFromBody:
      "Spørsmåla vert laga undervegs av Skyggelabyrinten — ikkje henta frå ein fast testbok eller quiz. For kvar person vel systemet neste spørsmål ut frå det du allereie har svara, med utgangspunkt i etablerte psykologiske rammeverk og 15 tematiske område (bl.a. barndom, tilknyting, grenser og skyggesida). Du får eitt spørsmål om gongen med fire alternativ; tal spørsmål tilpassast individuelt, vanlegvis mellom {minQ} og {maxQ}.",
    savedSessionTitle: "PÅBYGD ANALYSE FUNNE",
    savedSessionBody: "Spørsmål {n} · {covered}/{total} kategoriar dekt",
    continue: "FORTSET",
    startFresh: "START PÅ NYTT",
    saving: "LAGRAR OG STARTAR…",
    newAnalysis: "NY ANALYSE",
    start: "INITIER ANALYSE",
    disclaimer:
      "⚠ Ikkje diagnose eller behandling. Tal spørsmål tilpassast individuelt (opp til {maxQ}).",
  },
  progress: {
    dataCollection: "DATAINNSAMLING",
    progress: "FREMDRIFT",
    questionShort: "SPM",
    categoryCoverage: "KATEGORIDEKNING",
    readyPrefix: "◆ Klar for analyse: ",
    pendingPrefix: "○ ",
  },
  question: {
    categoryFallback: "ANALYSE",
    questionShort: "SPM",
    processing: "PROSESSERER",
    showFull: "VIS HEILE SPØRSMÅLET",
    customOption: "E — Ingen passar heilt · skriv eige svar",
    customTitle: "EIGE SVAR",
    customPlaceholder: "Skildre kort det som passar best for deg...",
    cancel: "AVBRYT",
    sendAnswer: "SEND SVAR",
    psychologistOpinion: "◆ PSYKOLOGEN SITT SYN",
    askPsychologist: "SPØR PSYKOLOGEN",
    askPlaceholder: "Kva meiner du om...?",
    waiting: "VENTAR...",
    ask: "SPØR",
    askBtn: "◆ Spør psykologen",
    rephraseBtn: "↻ Omformuler spørsmålet",
    metaLimit: "Maks {limit} ekstra førespurnader per analyse er brukt opp.",
    retryAnalysis: "Prøv analyse igjen",
    readyForAnalysis: "PSYKOLOGEN VURDERER AT DET ER NOK DATA FOR ANALYSE",
    canRequestAnalysis: "DU KAN BE OM ANALYSE (MIN. {min} SPØRSMÅL)",
    getAnalysisNow: "▶ FÅ ANALYSEN NO",
  },
  analyzing: {
    phases: [
      "KOMPRIMERER SVAR",
      "KARTLEGG MØNSTER",
      "IDENTIFISERER SPENNINGAR",
      "BYGGJER RAMMEVERK",
      "GENERERER RAPPORT",
    ],
    processingAnswers: "Behandlar {count} strukturerte svar",
    retry: "Prøv igjen",
    step1: "Steg 1/2: Komprimerer svar…",
    step2: "Steg 2/2: Genererer rapport…",
    reportReady: "Rapport klar",
  },
  report: {
    complete: "ANALYSE FULLFØRT",
    titleLine1: "PSYKOANALYTISK",
    titleLine2: "RAPPORT",
    disclaimer:
      "⚠ Dette er ikkje diagnose, behandling eller klinisk vurdering av helsepersonell. Rapporten er ei strukturert AI-kartlegging basert på svara dine.",
    shortSummary: "KORTVERSJON",
    copyShort: "Kopier kortversjon",
    tabFull: "Heilskapsrapport",
    tabFrameworks: "Etter rammeverk",
    overallInsight: "OVERORDNA INNSIKT",
    conflicts: "SPENNINGAR I SVARA",
    clinicalFollowup: "KLINISK VIDARE UTFORSKING",
    keyThemes: "NØKKELTEMA",
    frameworkSummaries: "RAMMEVERK-OPPSUMMERINGAR",
    keyPatterns: "Nøkkelmønster: ",
    evidence: "Belegg: ",
    questionRef: "— spm. {n}",
    observation: "Observasjon · ",
    interpretation: "Tolkning · ",
    uncertainty: "Usikkerheit · ",
    noSectionContent: "(inget innhald under denne overskrifta)",
    missingSections:
      "Rapporten mangla forventa ##-seksjonar. Sjå råtekst nedanfor.",
    noReportText: "Ingen rapporttekst motteke. Start på nytt eller prøv å generere analysen igjen.",
    copyRaw: "KOPIER RÅTEKST",
    downloadPdf: "LAST NED SOM PDF",
    generatingPdf: "GENERERER PDF…",
    showRaw: "VIS",
    hideRaw: "SKJUL",
    rawText: "RÅTEKST",
    newAnalysis: "NY ANALYSE",
    noCopyContent: "Ingen rapportinnhald.",
    pdfFilenamePrefix: "Røsten-Skyggelabyrinten-rapport",
  },
  errors: {
    analysisInterrupted:
      "Analysen vart avbroten. Prøv «Få analysen no» eller svar på fleire spørsmål.",
    requestTimeout: "Førespurnaden tok for lang tid. Prøv igjen.",
    analysisTimeout: "Analysen tok for lang tid. Sjekk nettverket og prøv igjen.",
    analysisFailed: "Analyse feila.",
    analysisNotGenerated:
      "Analysen vart ikkje generert. Prøv igjen eller svar på nokre fleire spørsmål.",
    fillParticipant: "Fyll inn namn, alder og gyldig e-post før du startar.",
    consentRequired: "Du må samtykkje til lagring av opplysningane før du startar.",
    startFailed: "Kunne ikkje starte analysen (ugyldig svar frå modellen). Prøv igjen.",
    startNetwork: "Kunne ikkje starte analysen. Sjekk API-nøkkel og nettverk.",
    unexpectedResponse: "Uventa svar frå psykologen. Du kan halde fram eller be om analyse.",
    couldNotRead: "Kunne ikkje lese svar ({detail}).",
    fetchFailed: "Kunne ikkje hente svar frå psykologen.",
    opinionFailed: "Kunne ikkje hente psykologen sitt svar. Prøv igjen.",
    generateFailed: "Kunne ikkje generere svar. Prøv igjen.",
    metaLimit: "Maks {limit} ekstra førespurnader per analyse.",
  },
  privacy: {
    title: "PERSONVERNERKLÆRING",
    back: "← TILBAKE TIL {product}",
    updated: "Sist oppdatert",
    sections: {
      controller: {
        title: "BEHANDLINGSANSVARLEG",
        body:
          "{company} ({name}) er behandlingsansvarleg for personopplysningar du oppgir i {product}. Kontakt:",
      },
      data: {
        title: "KVA DATA VI SAMLAR INN",
        items: [
          "Namn, alder og e-post (når du startar kartlegginga)",
          "Svara dine på spørsmål og den genererte rapporten (lagrast lokalt i nettlesaren under økta)",
          "Tekniske data via hosting (Netlify), t.d. IP-adresse i serverloggar",
        ],
      },
      purpose: {
        title: "FØREMÅL OG RETTSLIG GRUNNLAG",
        body:
          "Vi behandlar opplysningane for å gjennomføre kartlegginga du ber om, lagre registrering for oppfølging, og betre tenesta. Grunnlag: ditt samtykke (GDPR art. 6 nr. 1 bokstav a) og berettiga interesse i trygg drift.",
      },
      gemini: {
        title: "GOOGLE GEMINI (AI)",
        body:
          "Spørsmål og svar sendast til Google Gemini (Google sitt API) for å generere neste spørsmål og den psykoanalytiske rapporten. Google kan behandle data i tråd med vilkåra sine. Vi sender ikkje data til andre AI-leverandørar for denne tenesta. Ikkje oppgi sensitive personopplysningar du ikkje ønskjer delt med AI-systemet.",
      },
      storage: {
        title: "LAGRING OG HOSTING",
        body:
          "Namn, alder og e-post lagrast i Netlify Blobs (hosting hos Netlify). Økt-data (spørsmål/svar undervegs) lagrast primært lokalt på eininga di til du avsluttar eller slettar nettlesardata. Ved fullført analyse vert registreringa merka som fullført i systemet vårt.",
      },
      retention: {
        title: "KOR LENGE VI LAGRAR",
        body:
          "Deltakarregistreringar vert behaldne til du ber om sletting eller vi gjennomfører rutinemessig opprydding. Ta kontakt på e-post for sletting av opplysningane dine.",
      },
      rights: {
        title: "DINE RETTAR",
        body:
          "Du kan be om innsyn, retting, sletting, avgrensing, dataportabilitet og å trekke tilbake samtykke. Klage kan sendast til Datatilsynet. Kontakt oss først på",
      },
      notHealthcare: {
        title: "IKKE HELSETENESTE",
        body: "{product} er ikkje diagnose, behandling eller akutt hjelp. Ved krise, bruk nødnumra under.",
      },
    },
    footerScanner: "Skyggelabyrinten",
    footerPrivacy: "Personvern",
  },
  admin: {
    title: "ADMIN",
    backScanner: "← SKYGGE",
    refresh: "OPPDATER",
    refreshing: "HENTAR…",
    exportCsv: "EKSPORTER CSV",
    logout: "LOGG UT",
    passwordLabel: "ADMIN-PASSORD",
    login: "LOGG INN",
    checking: "SJEKKAR…",
    loginFailed: "Innlogging feila.",
    fetchFailed: "Kunne ikkje hente deltakarar.",
    count: "{n} registrering",
    countPlural: "{n} registreringar",
    countSuffix: " (nyaste først)",
    empty: "Ingen deltakarar lagra enno.",
    cols: {
      name: "Namn",
      age: "Alder",
      email: "E-post",
      registered: "Registrert",
      completed: "Fullført",
      id: "ID",
    },
    yes: "Ja",
    no: "Nei",
  },
  api: {
    noAnswersYet: "(ingen strukturerte svar enno)",
    answerLine: "#{index} [{category}] Spørsmål: {question}\nSvar: {answer}{custom}",
    customSuffix: " (eige svar)",
    answerMsg: "[Svar på spm {n} ({category}): {text}]",
    unknownCategory: "ukjend kategori",
    contextMsg:
      "[Kontekst frå app: Dette er svar #{n}. Maks {max} spørsmål totalt. Minst {min} før analyse kan foreslåast. Vurder dekning av 15 kategoriar individuelt denne gongen.]",
    sessionMsg:
      "[SESSION] {n} svar registrert. Neste steg: still spørsmål {next} (JSON type question). Dekka kategori-id: [{covered}].",
    noneCovered: "ingen",
    structuredAnswers: "STRUKTURERTE SVAR:",
    participantBlock:
      "[DELTAKAR]\nNamn: {name}\nAlder: {age}\nE-post: {email}\n\n[ALDERSJUSTERING]\n{guidance}\nTilpass spørsmålstekst og dei fire svaralternativa til alder og livssituasjon. Behold same 15 kategoriar og psykoanalytisk djupn.",
    invalidJsonRetry:
      "[SYSTEM: Førre svar var ugyldig eller avkorta JSON. Returner KUN eitt gyldig JSON-objekt på éi linje, utan markdown. Bruk \\n for linjeskift i strengar. For neste steg: type question med question, category, questionNumber, options (4 stk).]",
    forceAnalysis:
      "[SYSTEM: Dette er svar på spm {n}/{max}. Generer analysis NO — ikkje fleire spørsmål.]",
    generateAnalysis: "[Generer full analyse]",
    startSession:
      "Start analysen. Still spørsmål 1 med 4 alternativ. Maks {max} spørsmål totalt — tal før analyse vurderast individuelt. Tilpass språk til deltakaren sin alder.",
    metaOpinion: "[META-SPØRSMÅL – ikkje svar på aktivt spørsmål. JSON opinion-format]: {q}",
    metaRephrase:
      "[Omformuler spm {n} enklare. rephrase-format, same kategori, 4 nye alternativ.]",
    analysisRetry:
      "[KRITISK: Returner full analysis JSON no. Obligatorisk: frameworks med quote og question_index, short_summary, conflicts, clinical_followup, analysis med ## og Observasjon/Tolkning/Usikkerheit.]",
  },
  dateLocale: "nn-NO",
  htmlLang: "no",
};