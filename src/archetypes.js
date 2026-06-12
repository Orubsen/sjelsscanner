export const ARCHETYPES = [
  {
    id: "B",
    code: "KK·B",
    name: "BÆREREN",
    subtitle: "Den omsorgsbærende",
    pct: 17,
    stars: [
      { x: 50, y: 20 },
      { x: 30, y: 40 },
      { x: 70, y: 40 },
      { x: 20, y: 65 },
      { x: 50, y: 60 },
      { x: 80, y: 65 },
    ],
    lines: [[0,1],[0,2],[1,4],[2,4],[1,3],[2,5]],
    desc: "Du bærer andres smerte som din egen. Omsorgen er ikke bare noe du gjør — det er hvem du er.",
    signals: ["omsorg","ansvar","bære","hjelpe","støtte","gi","andre","familie","plikt","ofre","empatisk","sensitiv","andres behov","ivareta"],
  },
  {
    id: "S",
    code: "KK·S",
    name: "SPEILET",
    subtitle: "Den relasjonelle",
    pct: 15,
    stars: [
      { x: 50, y: 15 },
      { x: 25, y: 38 },
      { x: 75, y: 38 },
      { x: 50, y: 55 },
      { x: 30, y: 75 },
      { x: 70, y: 75 },
    ],
    lines: [[0,1],[0,2],[1,3],[2,3],[3,4],[3,5]],
    desc: "Din identitet formes i møtet med andre. Du ser deg selv tydeligst i andres blikk.",
    signals: ["tilhørighet","relasjon","godkjenning","anerkjennelse","andres mening","sosial","vennskap","bekreftelse","fellesskap","aksept","avvisning","ensomhet"],
  },
  {
    id: "V",
    code: "KK·V",
    name: "VOKTEREN",
    subtitle: "Den selvforsynte",
    pct: 14,
    stars: [
      { x: 50, y: 12 },
      { x: 20, y: 35 },
      { x: 80, y: 35 },
      { x: 35, y: 62 },
      { x: 65, y: 62 },
      { x: 50, y: 82 },
    ],
    lines: [[0,1],[0,2],[1,3],[2,4],[3,5],[4,5]],
    desc: "Du har bygget sterke vegger — ikke av frykt, men av erfaring. Uavhengigheten er din kraft og ditt fengsel.",
    signals: ["uavhengig","alene","kontroll","grenser","beskytte","vegger","distanse","selvtilstrekkelighet","nærhet","sårbarhet","tillit","mistillit","isolasjon"],
  },
  {
    id: "A",
    code: "KK·A",
    name: "ARKITEKTEN",
    subtitle: "Den strukturerte",
    pct: 13,
    stars: [
      { x: 50, y: 10 },
      { x: 18, y: 42 },
      { x: 82, y: 42 },
      { x: 28, y: 78 },
      { x: 72, y: 78 },
      { x: 50, y: 55 },
    ],
    lines: [[0,1],[0,2],[1,5],[2,5],[1,3],[2,4],[3,5],[4,5]],
    desc: "Du bygger systemer for å forstå verden. Orden er ikke tvang — det er trygghet.",
    signals: ["system","struktur","orden","kontroll","planlegge","analyse","logikk","strategi","løsning","effektivitet","perfeksjonisme","kaos","forutsigbarhet"],
  },
  {
    id: "O",
    code: "KK·O",
    name: "OBSERVATØREN",
    subtitle: "Den vaktsomme",
    pct: 12,
    stars: [
      { x: 50, y: 18 },
      { x: 22, y: 44 },
      { x: 78, y: 44 },
      { x: 50, y: 68 },
      { x: 35, y: 85 },
      { x: 65, y: 85 },
    ],
    lines: [[0,1],[0,2],[1,3],[2,3],[3,4],[3,5]],
    desc: "Du ser alt — og holder deg litt utenfor. Observasjonen gir innsikt, men koster nærhet.",
    signals: ["observere","analysere","vakt","trygghet","fare","overvåke","kontroll","tilbaketrekking","tenke","forstå","distanse","innsikt","forsiktig","angst"],
  },
  {
    id: "U",
    code: "KK·U",
    name: "UTBRYTEREN",
    subtitle: "Den mønsterbrytende",
    pct: 11,
    stars: [
      { x: 30, y: 20 },
      { x: 70, y: 20 },
      { x: 50, y: 45 },
      { x: 20, y: 68 },
      { x: 80, y: 68 },
      { x: 50, y: 85 },
    ],
    lines: [[0,2],[1,2],[2,3],[2,4],[3,5],[4,5]],
    desc: "Du nekter å passe inn i andres former. Frihet er ikke et valg — det er et must.",
    signals: ["frihet","opprør","grenser","regler","bryte","autentisk","uavhengig","protest","annerledes","system","tvang","flukt","avsløre","mønster","konformitet"],
  },
  {
    id: "F",
    code: "KK·F",
    name: "FLAMMEN",
    subtitle: "Den intense",
    pct: 10,
    stars: [
      { x: 50, y: 8 },
      { x: 26, y: 30 },
      { x: 74, y: 30 },
      { x: 15, y: 60 },
      { x: 85, y: 60 },
      { x: 50, y: 78 },
    ],
    lines: [[0,1],[0,2],[1,3],[2,4],[1,5],[2,5]],
    desc: "Du føler alt fullt ut — glede, smerte, lidenskap. Intensiteten er din gave og din sår.",
    signals: ["intens","lidenskap","følelser","dypt","sterkt","eksistensielt","mening","autentisk","overveldende","kaos","kreativ","energi","brenne","sårbarhet","nærhet"],
  },
  {
    id: "P",
    code: "KK·P",
    name: "PILEGRIMEN",
    subtitle: "Den meningssøkende",
    pct: 8,
    stars: [
      { x: 50, y: 10 },
      { x: 30, y: 35 },
      { x: 70, y: 35 },
      { x: 50, y: 58 },
      { x: 22, y: 78 },
      { x: 78, y: 78 },
    ],
    lines: [[0,1],[0,2],[1,3],[2,3],[3,4],[3,5]],
    desc: "Du søker noe større enn deg selv. Vandringen er livet, ikke destinasjonen.",
    signals: ["mening","formål","eksistens","spirituell","søke","lengsel","tilhørighet","transcendens","sannhet","identitet","kall","verdier","dypere","tro","liv"],
  },
];

export function classifyArchetype(analysisData) {
  if (!analysisData) return ARCHETYPES[0];

  const primary = [
    analysisData.short_summary || "",
    analysisData.overall_insight || "",
    ...(Array.isArray(analysisData.key_themes) ? analysisData.key_themes : []),
    ...(Array.isArray(analysisData.conflicts) ? analysisData.conflicts : []),
    analysisData.clinical_followup || "",
  ].join(" ").toLowerCase();

  const secondary = [
    ...Object.values(
      analysisData.frameworks && typeof analysisData.frameworks === "object"
        ? analysisData.frameworks
        : {}
    ).flatMap((fw) =>
      typeof fw === "object"
        ? [fw.summary || "", ...(fw.key_patterns || []), fw.evidence_from_answers || ""]
        : [String(fw)]
    ),
    analysisData.analysis || "",
  ].join(" ").toLowerCase();

  const scores = ARCHETYPES.map((a) => {
    let score = 0;
    for (const signal of a.signals) {
      if (primary.includes(signal)) score += 3;
      else if (secondary.includes(signal)) score += 1;
    }
    return score;
  });

  const max = Math.max(...scores);
  if (max === 0) return ARCHETYPES[0];
  return ARCHETYPES[scores.indexOf(max)];
}
