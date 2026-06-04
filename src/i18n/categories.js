/** Category ids are stable across locales; names vary by language. */
export const CATEGORY_TRANSLATIONS = {
  1: {
    nb: "Tidlig barndom og primære omsorgspersoner",
    nn: "Tidleg barndom og primære omsorgspersonar",
    en: "Early childhood and primary caregivers",
  },
  2: {
    nb: "Tilknytningsstil og nære relasjoner",
    nn: "Tilknytingsstil og nære relasjonar",
    en: "Attachment style and close relationships",
  },
  3: {
    nb: "Selvbilde vs. andres oppfatning",
    nn: "Sjølvbilete vs. andres oppfatning",
    en: "Self-image vs. others' perception",
  },
  4: {
    nb: "Konflikt- og stresshåndtering",
    nn: "Konflikt- og stresshandtering",
    en: "Conflict and stress management",
  },
  5: {
    nb: "Kontrollbehov og beslutningstaking",
    nn: "Kontrollbehov og beslutningstaking",
    en: "Need for control and decision-making",
  },
  6: {
    nb: "Frykt, unngåelsesatferd og triggere",
    nn: "Frykt, unngåingsåtferd og triggere",
    en: "Fear, avoidance behaviour and triggers",
  },
  7: {
    nb: "Ambisjon, motivasjon og indre drivkraft",
    nn: "Ambisjon, motivasjon og indre drivkraft",
    en: "Ambition, motivation and inner drive",
  },
  8: {
    nb: "Skyld, skam og selvkritikk",
    nn: "Skuld, skam og sjølvkritikk",
    en: "Guilt, shame and self-criticism",
  },
  9: {
    nb: "Grenser",
    nn: "Grenser",
    en: "Boundaries",
  },
  10: {
    nb: "Repeterende mønstre i relasjoner",
    nn: "Repeterande mønster i relasjonar",
    en: "Repeating patterns in relationships",
  },
  11: {
    nb: "Forholdet til autoritet",
    nn: "Høvet til autoritet",
    en: "Relationship to authority",
  },
  12: {
    nb: "Selvdestruksjon vs. selvbevaring",
    nn: "Sjølvdestruksjon vs. sjølvbevaring",
    en: "Self-destruction vs. self-preservation",
  },
  13: {
    nb: "Drømmer og uoppfylte behov",
    nn: "Drømmar og uoppfylte behov",
    en: "Dreams and unmet needs",
  },
  14: {
    nb: "Forholdet til kropp og kontroll",
    nn: "Høvet til kropp og kontroll",
    en: "Relationship to body and control",
  },
  15: {
    nb: "Det du aldri ville sagt høyt",
    nn: "Det du aldri ville sagt høgt",
    en: "What you would never say aloud",
  },
};

export function getCategories(locale) {
  const loc = locale === "nn" || locale === "en" ? locale : "nb";
  return Object.entries(CATEGORY_TRANSLATIONS).map(([id, names]) => ({
    id: Number(id),
    name: names[loc],
  }));
}

export function getCategoryNames(locale) {
  return getCategories(locale).map((c) => c.name);
}

export function matchCategoryId(name, locale = "nb") {
  if (!name) return null;
  const n = String(name).trim().toLowerCase();
  for (const loc of ["nb", "nn", "en"]) {
    for (const [id, names] of Object.entries(CATEGORY_TRANSLATIONS)) {
      const catName = names[loc].toLowerCase();
      if (
        catName === n ||
        catName.includes(n) ||
        n.includes(catName.slice(0, 12))
      ) {
        return Number(id);
      }
    }
  }
  return null;
}