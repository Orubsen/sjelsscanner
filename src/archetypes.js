/* Kjernekoden arketypesystem, befolkningsdata og sosiale demo-data */

export const KK_AXES = [
  { id: "naerhet", left: "Nærhet", right: "Avstand" },
  { id: "kontroll", left: "Kontroll", right: "Overgivelse" },
  { id: "uttrykk", left: "Uttrykt", right: "Tilbakeholdt" },
  { id: "selv", left: "Selvkritisk", right: "Selvtilgivende" },
];

export const KK_ARCHETYPES = [
  {
    code: "V", key: "vokteren", name: "VOKTEREN", subtitle: "Den selvforsynte",
    line: "Den som aldri trenger noen, kan aldri bli forlatt — men blir heller aldri helt møtt.",
    summary: "Selvforsyning som forsvar, testing som tillitsmekanisme, og en indre kritiker med lånt stemme.",
    themes: ["Selvforsyning som forsvar", "Betinget nærhet", "Internalisert kritiker", "Frykt for full eksponering"],
    pos: { naerhet: 74, kontroll: 30, uttrykk: 70, selv: 26 },
    share: 14,
  },
  {
    code: "O", key: "observatoren", name: "OBSERVATØREN", subtitle: "Den vaktsomme",
    line: "Jeg ser alt utenfra, så ingenting kan ta meg på senga.",
    summary: "Vaktsomhet og avstand som strategi; nærhet holdes på armlengdes avstand til den er trygg.",
    themes: ["Vaktsomhet", "Kontroll gjennom avstand", "Analyse som forsvar"],
    pos: { naerhet: 66, kontroll: 38, uttrykk: 64, selv: 40 },
    share: 12,
  },
  {
    code: "B", key: "baereren", name: "BÆREREN", subtitle: "Den overansvarlige",
    line: "Hvis jeg holder alle andre oppe, slipper jeg å kjenne på min egen vekt.",
    summary: "Verdi hentet fra å bæres andres behov; egne grenser viskes ut for å holdes uunnværlig.",
    themes: ["Overansvar", "Utviskede grenser", "Verdi gjennom nytte", "Skjult slitasje"],
    pos: { naerhet: 24, kontroll: 44, uttrykk: 40, selv: 22 },
    share: 17,
  },
  {
    code: "A", key: "arkitekten", name: "ARKITEKTEN", subtitle: "Den styrende",
    line: "Hvis jeg planlegger nøye nok, kan ingenting gå galt — og ingen kan klandre meg.",
    summary: "Kontroll og struktur som vern mot kaos og skam; usikkerhet møtes med flere planer.",
    themes: ["Kontrollbehov", "Perfeksjonisme", "Skam som drivkraft", "Frykt for kaos"],
    pos: { naerhet: 58, kontroll: 14, uttrykk: 56, selv: 18 },
    share: 13,
  },
  {
    code: "S", key: "speilet", name: "SPEILET", subtitle: "Den tilpasningsdyktige",
    line: "Fortell meg hvem du trenger at jeg er, så blir jeg det.",
    summary: "Tilhørighet kjøpt med tilpasning; egne behov forsvinner bak andres forventninger.",
    themes: ["Tilpasning", "Konfliktunngåelse", "Diffust selvbilde", "Frykt for avvisning"],
    pos: { naerhet: 18, kontroll: 62, uttrykk: 30, selv: 34 },
    share: 15,
  },
  {
    code: "F", key: "flammen", name: "FLAMMEN", subtitle: "Den intense",
    line: "Alt eller ingenting — det lunkne er den eneste døden jeg frykter.",
    summary: "Intensitet og alt-eller-intet som livskraft og som risiko; nærhet og brudd ligger tett.",
    themes: ["Intensitet", "Alt-eller-intet", "Følelsesmessige svingninger", "Frykt for tomhet"],
    pos: { naerhet: 30, kontroll: 76, uttrykk: 16, selv: 48 },
    share: 10,
  },
  {
    code: "U", key: "utbryteren", name: "UTBRYTEREN", subtitle: "Den frihetssøkende",
    line: "I det noen kommer for nær, kjenner jeg etter nærmeste utgang.",
    summary: "Frihet og bevegelse som trygghet; binding oppleves som fare og møtes med avstand.",
    themes: ["Autonomi", "Bindingsangst", "Rastløshet", "Avstand ved nærhet"],
    pos: { naerhet: 82, kontroll: 54, uttrykk: 52, selv: 56 },
    share: 11,
  },
  {
    code: "P", key: "pilegrimen", name: "PILEGRIMEN", subtitle: "Den søkende",
    line: "Svaret ligger alltid rundt neste sving — derfor stopper jeg aldri helt opp.",
    summary: "Mening jaktet utover; uro stilnes av søken, men hvilen og det nære uteblir.",
    themes: ["Meningssøken", "Indre uro", "Idealisering", "Vansker med å hvile"],
    pos: { naerhet: 50, kontroll: 60, uttrykk: 46, selv: 52 },
    share: 8,
  },
];

export const kkArchByKey = (key) => KK_ARCHETYPES.find((a) => a.key === key) || KK_ARCHETYPES[0];

/* Befolkningsdata for «sammenlign med andre» */
export const KK_POPULATION = {
  total: 4218,
  themePrevalence: [
    { theme: "Selvforsyning som forsvar", pct: 71 },
    { theme: "Internalisert kritiker", pct: 64 },
    { theme: "Konfliktunngåelse", pct: 58 },
    { theme: "Betinget nærhet", pct: 52 },
    { theme: "Frykt for å bli forlatt", pct: 49 },
    { theme: "Overansvar", pct: 46 },
  ],
  axisAverage: { naerhet: 52, kontroll: 48, uttrykk: 50, selv: 38 },
  mostAvoided: { id: 15, name: "Det du aldri ville sagt høyt", pct: 63 },
};

/* Hjelper: din persentil på en akse */
export function kkAxisPercentile(axisId, pos) {
  const avg = KK_POPULATION.axisAverage[axisId];
  const d = pos - avg;
  const p = Math.round(50 + (d / 100) * 92);
  return Math.max(2, Math.min(98, p));
}

/* 15 dybdeområde-posisjoner (stjernekart) */
export const KK_STAR_POS = [
  { x: 8, y: 34 }, { x: 17, y: 16 }, { x: 29, y: 27 }, { x: 24, y: 56 },
  { x: 37, y: 68 }, { x: 46, y: 42 }, { x: 43, y: 14 }, { x: 57, y: 25 },
  { x: 65, y: 50 }, { x: 56, y: 74 }, { x: 73, y: 68 }, { x: 81, y: 38 },
  { x: 75, y: 14 }, { x: 89, y: 22 }, { x: 91, y: 60 },
];
export const KK_AREA_NAMES = [
  "Tidlig barndom", "Tilknytning", "Selvbilde", "Konflikt & stress",
  "Kontrollbehov", "Frykt & unngåelse", "Ambisjon", "Skyld & skam",
  "Grenser", "Repeterende mønstre", "Autoritet", "Selvbevaring",
  "Drømmer & behov", "Kropp & kontroll", "Det usagte",
];

/* Demo-personer som også har tatt analysen */
export const KK_PEOPLE = {
  mari: {
    id: "mari", name: "Mari Lindqvist", initial: "M", code: "MARI-7Q",
    archetypeKey: "speilet", covered: [1, 2, 3, 9, 10, 15],
    summaryOverride: "Tilhørighet kjøpt med tilpasning; jobber nå aktivt med å la egne behov få plass.",
    dateLabel: "4. mai 2026", publicDevelopment: true,
    sharing: { kjernekode: true, sammendrag: true, temaer: true, spekter: true, konstellasjon: true, spenninger: true, usagt: false },
    timeline: [
      { dateLabel: "Nov 2025", archetypeKey: "baereren", coveredCount: 3 },
      { dateLabel: "Feb 2026", archetypeKey: "speilet", coveredCount: 5 },
      { dateLabel: "Mai 2026", archetypeKey: "speilet", coveredCount: 6 },
    ],
  },
  jonas: {
    id: "jonas", name: "Jonas Berg", initial: "J", code: "JONAS-3F",
    archetypeKey: "arkitekten", covered: [4, 5, 7, 11],
    dateLabel: "28. mars 2026", publicDevelopment: false,
    sharing: { kjernekode: true, sammendrag: false, temaer: false, spekter: true, konstellasjon: false, spenninger: false, usagt: false },
    timeline: [],
  },
  sara: {
    id: "sara", name: "Sara Holm", initial: "S", code: "SARA-9K",
    archetypeKey: "flammen", covered: [2, 6, 8, 13, 15],
    dateLabel: "1. juni 2026", publicDevelopment: true,
    sharing: { kjernekode: true, sammendrag: true, temaer: true, spekter: true, konstellasjon: true, spenninger: false, usagt: false },
    timeline: [
      { dateLabel: "Jan 2026", archetypeKey: "flammen", coveredCount: 3 },
      { dateLabel: "Jun 2026", archetypeKey: "flammen", coveredCount: 5 },
    ],
  },
  emil: {
    id: "emil", name: "Emil Dahl", initial: "E", code: "EMIL-2T",
    archetypeKey: "utbryteren", covered: [1, 6, 12],
    dateLabel: "12. april 2026", publicDevelopment: false,
    sharing: { kjernekode: true, sammendrag: true, temaer: false, spekter: true, konstellasjon: false, spenninger: false, usagt: false },
    timeline: [],
  },
  ada: {
    id: "ada", name: "Ada Strand", initial: "A", code: "ADA-5R",
    archetypeKey: "pilegrimen", covered: [3, 7, 13, 14],
    dateLabel: "20. mai 2026", publicDevelopment: true,
    sharing: { kjernekode: true, sammendrag: true, temaer: true, spekter: true, konstellasjon: true, spenninger: true, usagt: false },
    timeline: [
      { dateLabel: "Des 2025", archetypeKey: "pilegrimen", coveredCount: 2 },
      { dateLabel: "Mai 2026", archetypeKey: "pilegrimen", coveredCount: 4 },
    ],
  },
};

export const kkDefaultSharing = () => ({
  kjernekode: true, sammendrag: true, temaer: true,
  spekter: true, konstellasjon: true, spenninger: false, usagt: false,
});

export const kkDefaultSocial = () => {
  const now = Date.now();
  const H = 3600000, D = 86400000;
  return {
    sharing: kkDefaultSharing(),
    friendIds: ["mari", "jonas"],
    followingIds: ["mari"],
    requestsIn: ["sara"],
    pendingOut: [],
    streakDays: 7,
    compare: { mari: "mutual", jonas: "incoming" },
    notifications: [
      { id: "n1", ts: now - 2 * H, type: "analysis_updated", who: "mari", read: false },
      { id: "n2", ts: now - 5 * H, type: "achievement", who: "mari", text: "oppnådde en milepæl — Selvinnsikt nivå 3", read: false },
      { id: "n3", ts: now - 9 * H, type: "compare_request", who: "jonas", read: false },
      { id: "n4", ts: now - 1 * D, type: "achievement", who: "sara", text: "låste opp en hemmelig analyse", read: true },
      { id: "n5", ts: now - 2 * D, type: "streak", who: "ada", text: "logget inn 7 dager på rad", read: true },
      { id: "n6", ts: now - 3 * D, type: "achievement", who: "mari", text: "nådde et nytt nivå — Speilet i tre andre", read: true },
    ],
  };
};

export function kkExpandPerson(src, fallbackName) {
  const arch = kkArchByKey(src.archetypeKey);
  const name = src.name || fallbackName || "Du";
  return {
    id: src.id || "me",
    name,
    initial: (name[0] || "D").toUpperCase(),
    archetypeKey: src.archetypeKey,
    arch,
    covered: src.covered || [],
    themes: (src.themes && src.themes.length ? src.themes : arch.themes),
    pos: arch.pos,
    summary: src.summaryOverride || src.summary || arch.summary,
    dateLabel: src.dateLabel,
    sharing: src.sharing || kkDefaultSharing(),
    publicDevelopment: !!src.publicDevelopment,
  };
}

/* Prestasjoner */
export const KK_ACHIEVEMENTS = [
  { id: "first", icon: "◈", name: "Første kjernekode", desc: "Fullførte din første analyse", test: (c) => c.analysisCount >= 1 },
  { id: "depth5", icon: "✶", name: "Dybdekartlegger", desc: "Kartla fem dybdeområder", test: (c) => c.areas >= 5 },
  { id: "evolve", icon: "⟳", name: "I bevegelse", desc: "Fullførte en ny analyse og så utviklingen din", test: (c) => c.analysisCount >= 2 },
  { id: "brave", icon: "❂", name: "Modig", desc: "Gikk inn i «Det du aldri ville sagt høyt»", test: (c) => c.covered.includes(15) },
  { id: "streak7", icon: "☼", name: "Tilbakevendende", desc: "Logget inn syv dager på rad", test: (c) => c.streak >= 7 },
  { id: "premium", icon: "◆", name: "Innvidd", desc: "Aktiverte Premium", test: (c) => c.premium },
  { id: "mirror", icon: "⟷", name: "Speilet i en annen", desc: "Sammenlignet analysen med en venn", test: (c) => c.hasCompared },
  { id: "depth10", icon: "✺", name: "Konstellasjonsbygger", desc: "Kartla ti dybdeområder", test: (c) => c.areas >= 10 },
  { id: "secret", icon: "✦", name: "Den skjulte analysen", desc: "Kartlegg alle 15 områdene for å låse opp", secret: true, test: (c) => c.areas >= 15 },
];

export function kkBuildContext({ saved, premium, social }) {
  const list = saved || [];
  const covered = Array.from(new Set(list.flatMap((a) => a.covered || []))).sort((a, b) => a - b);
  const hasCompared = !!(social && social.compare && Object.values(social.compare).some((v) => v === "mutual"));
  return {
    analysisCount: list.length,
    covered,
    areas: covered.length,
    streak: (social && social.streakDays) || 0,
    premium: !!premium,
    hasCompared,
  };
}

export function kkEarned(ctx) {
  return KK_ACHIEVEMENTS.filter((a) => a.test(ctx));
}

const KK_LEVEL_TITLES = ["Nyankommet", "Utforsker", "Kartlegger", "Dykker", "Innvidd", "Speiler", "Sjelegransker"];

export function kkLevel(ctx) {
  const earned = kkEarned(ctx).length;
  const points = ctx.areas * 8 + ctx.analysisCount * 16 + earned * 12 + ctx.streak * 2;
  const per = 70;
  const level = Math.floor(points / per) + 1;
  const into = points % per;
  return {
    level,
    title: KK_LEVEL_TITLES[Math.min(level - 1, KK_LEVEL_TITLES.length - 1)],
    progress: Math.round((into / per) * 100),
    toNext: per - into,
  };
}

/* Relativ tid */
export function kkRelTime(ts, locale) {
  const isEn = locale === "en";
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return isEn ? "just now" : "nå nettopp";
  const m = Math.floor(s / 60);
  if (m < 60) return m + (isEn ? " min ago" : " min siden");
  const h = Math.floor(m / 60);
  if (h < 24) {
    if (isEn) return h + (h === 1 ? " hour ago" : " hours ago");
    return h + (h === 1 ? " time siden" : " timer siden");
  }
  const d = Math.floor(h / 24);
  if (d < 7) {
    if (isEn) return d + (d === 1 ? " day ago" : " days ago");
    return d + (d === 1 ? " dag siden" : " dager siden");
  }
  const w = Math.floor(d / 7);
  if (isEn) return w + (w === 1 ? " week ago" : " weeks ago");
  return w + (w === 1 ? " uke siden" : " uker siden");
}

/**
 * Maps a Gemini analysis report to one of the 8 archetypes.
 * Seeks archetype name/key mentions or calculates keyword matches as fallback.
 */
export function mapAnalysisToArchetype(analysisData) {
  if (!analysisData) return KK_ARCHETYPES[0];

  const textToSearch = [
    analysisData.short_summary,
    analysisData.overall_insight,
    analysisData.frameworks?.jungian_archetypes?.summary,
    ...(analysisData.key_themes || [])
  ].filter(Boolean).join(" ").toLowerCase();

  // 1. Direct name match
  for (const arch of KK_ARCHETYPES) {
    if (textToSearch.includes(arch.name.toLowerCase()) || textToSearch.includes(arch.key)) {
      return arch;
    }
  }

  // 2. Score-based match
  const keywords = {
    vokteren: ["vokter", "selvforsyn", "avvisning", "mur", "testing", "tillit", "avstand", "uavhengig"],
    observatoren: ["observatør", "vaktsom", "betrakter", "utenfra", "avstand", "analyse", "intellektualisering", "passiv"],
    baereren: ["bærer", "overansvar", "hjelper", "andres behov", "slitasje", "plikt", "selvoppofrende", "grenseløs"],
    arkitekten: ["arkitekt", "styrende", "kontroll", "struktur", "perfeksjon", "planlegge", "orden", "kaos"],
    speilet: ["speilet", "tilpasning", "kamelon", "konfliktunngåelse", "behage", "andres forventninger", "avvisning"],
    flammen: ["flamme", "intens", "alt-eller-intet", "emosjonell", "svingning", "tomhet", "lidenskap"],
    utbryteren: ["utbryter", "frihet", "autonomi", "bindingsangst", "flukt", "rømme", "avstand", "klaustrofobi"],
    pilegrimen: ["pilegrim", "søker", "mening", "uro", "rastløs", "idealisering", "søkende", "flyktig"],
  };

  const scores = KK_ARCHETYPES.map((arch) => {
    let score = 0;
    const list = keywords[arch.key] || [];
    for (const kw of list) {
      const regex = new RegExp(kw, "gi");
      const matches = textToSearch.match(regex);
      if (matches) {
        score += matches.length;
      }
    }
    return { arch, score };
  });

  scores.sort((a, b) => b.score - a.score);
  return scores[0].score > 0 ? scores[0].arch : KK_ARCHETYPES[0];
}

/**
 * Builds a snapshot of the current analysis, ready to save in localStorage.
 */
export function buildSnapshot(name, analysisData, coveredCategoryIds) {
  const now = new Date();
  const arch = mapAnalysisToArchetype(analysisData);
  const covered = coveredCategoryIds || [];
  
  // Format: KK·V — 1·2·8
  const code = `KK·${arch.code} — ${covered.join("·")}`;

  return {
    id: "kk-" + now.getTime(),
    ts: now.getTime(),
    dateLabel: now.toLocaleDateString("no-NO", { day: "numeric", month: "long", year: "numeric" }),
    name: name || "Du",
    archetypeKey: arch.key,
    archetype: arch.name,
    subtitle: arch.subtitle,
    code: code,
    line: arch.line,
    summary: analysisData.short_summary || arch.summary,
    themes: (analysisData.key_themes && analysisData.key_themes.length) ? analysisData.key_themes.slice() : arch.themes.slice(),
    covered: covered,
    note: "",
  };
}

export function buildPriorSeed(name) {
  const d = new Date(); d.setMonth(d.getMonth() - 3);
  return {
    id: "kk-seed-prior",
    ts: d.getTime(),
    dateLabel: d.toLocaleDateString("no-NO", { day: "numeric", month: "long", year: "numeric" }),
    name: name || "Du",
    archetypeKey: "observatoren",
    archetype: "OBSERVATØREN",
    subtitle: "Den vaktsomme",
    code: "KK·O — 1·2·6",
    line: "Jeg ser alt utenfra, så ingenting kan ta meg på senga.",
    summary: "Vaktsomhet og avstand som strategi; nærhet holdes på armlengdes avstand til den er trygg.",
    themes: ["Selvforsyning som forsvar", "Vaktsomhet", "Kontroll gjennom avstand"],
    covered: [1, 2, 6],
    note: "",
    seed: true,
  };
}
