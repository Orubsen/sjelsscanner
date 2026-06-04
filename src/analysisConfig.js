export const STORAGE_KEY = "sjelsscanner_state_v2";

export const MAX_QUESTIONS = 50;
export const MIN_QUESTIONS_SUGGEST = 12;
export const META_CALL_LIMIT = 8;

export const BRAND = {
  name: "Røsten",
  product: "Sjelsscanner",
  company: "RØSTEN ENT",
  tagline: "Kirurgisk psykoanalytisk kartlegging — ikke en personlighetstest.",
  contactEmail: "kontakt@xn--rubenrsten-5cb.no",
  websiteUrl: "https://rubenrøsten.no",
  websiteLabel: "rubenrøsten.no",
  siteUrl: "https://sjelescanner.netlify.app",
};

/** Ca. tid for typisk økt (spørsmål + rapport). */
export const ESTIMATED_MINUTES = { min: 15, max: 30 };

export const CRISIS_LINES = [
  { label: "Mental Helse – Hjelpetelefonen", value: "116 123", href: "tel:116123" },
  { label: "Akutt medisinsk nødhjelp", value: "113", href: "tel:113" },
];

export const CATEGORIES = [
  { id: 1, name: "Tidlig barndom og primære omsorgspersoner" },
  { id: 2, name: "Tilknytningsstil og nære relasjoner" },
  { id: 3, name: "Selvbilde vs. andres oppfatning" },
  { id: 4, name: "Konflikt- og stresshåndtering" },
  { id: 5, name: "Kontrollbehov og beslutningstaking" },
  { id: 6, name: "Frykt, unngåelsesatferd og triggere" },
  { id: 7, name: "Ambisjon, motivasjon og indre drivkraft" },
  { id: 8, name: "Skyld, skam og selvkritikk" },
  { id: 9, name: "Grenser" },
  { id: 10, name: "Repeterende mønstre i relasjoner" },
  { id: 11, name: "Forholdet til autoritet" },
  { id: 12, name: "Selvdestruksjon vs. selvbevaring" },
  { id: 13, name: "Drømmer og uoppfylte behov" },
  { id: 14, name: "Forholdet til kropp og kontroll" },
  { id: 15, name: "Det du aldri ville sagt høyt" },
];

export const FRAMEWORK_LABELS = {
  attachment: "Tilknytning",
  defense_mechanisms: "Forsvarsmekanismer",
  jungian_archetypes: "Jungianske arketyper",
  freudian_analysis: "Freudiansk analyse",
  ace_impact: "ACE-påvirkning",
};

export const FRAMEWORK_ORDER = [
  "attachment",
  "defense_mechanisms",
  "jungian_archetypes",
  "freudian_analysis",
  "ace_impact",
];

export const CATEGORY_NAMES = CATEGORIES.map((c) => c.name);

export { matchCategoryId } from "./i18n/categories.js";

export function mergeCoveredCategories(existing, incoming) {
  const set = new Set(Array.isArray(existing) ? existing : []);
  for (const item of incoming || []) {
    const id = typeof item === "number" ? item : matchCategoryId(item);
    if (id) set.add(id);
    else if (typeof item === "string") {
      const m = matchCategoryId(item);
      if (m) set.add(m);
    }
  }
  return [...set].sort((a, b) => a - b);
}