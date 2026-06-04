import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { nb } from "./locales/nb.js";
import { nn } from "./locales/nn.js";
import { en } from "./locales/en.js";
import { getCategories, getCategoryNames } from "./categories.js";
import { getSystemPrompt, getAnalysisStep1, getAnalysisStep2 } from "./systemPrompts.js";

const LOCALE_KEY = "sjelsscanner_locale";

export const LOCALE_OPTIONS = [
  { code: "nb", label: "Bokmål", short: "NB" },
  { code: "nn", label: "Nynorsk", short: "NN" },
  { code: "en", label: "English", short: "EN" },
];

const PACKS = { nb, nn, en };

function getNested(obj, path) {
  return String(path)
    .split(".")
    .reduce((o, k) => (o != null ? o[k] : undefined), obj);
}

function interpolate(str, vars) {
  if (!vars) return str;
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replaceAll(`{${k}}`, String(v)),
    str
  );
}

const I18nContext = createContext(null);

function detectInitialLocale() {
  try {
    const saved = localStorage.getItem(LOCALE_KEY);
    if (saved && PACKS[saved]) {
      document.documentElement.lang = saved === "en" ? "en" : "no";
      return saved;
    }
  } catch (_) {}
  document.documentElement.lang = "no";
  return "nb";
}

export function I18nProvider({ children }) {
  const [locale, setLocaleState] = useState(detectInitialLocale);

  const setLocale = useCallback((code) => {
    if (!PACKS[code]) return;
    setLocaleState(code);
    try {
      localStorage.setItem(LOCALE_KEY, code);
    } catch (_) {}
    document.documentElement.lang = code === "en" ? "en" : "no";
  }, []);

  const pack = PACKS[locale] || PACKS.nb;

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      locales: LOCALE_OPTIONS,
      t: (key, vars) => {
        const raw = getNested(pack, key);
        if (raw == null) return key;
        return interpolate(String(raw), vars);
      },
      categories: getCategories(locale),
      categoryNames: getCategoryNames(locale),
      crisisLines: pack.crisis.lines,
      brand: { ...pack.brand, estimatedMinutes: pack.estimatedMinutes },
      frameworkLabels: pack.frameworks,
      frameworkList: pack.frameworkList,
      analyzingPhases: pack.analyzing.phases,
      dateLocale: pack.dateLocale,
      privacySections: pack.privacy.sections,
      systemPrompt: getSystemPrompt(locale),
      analysisStep1: getAnalysisStep1(locale),
      analysisStep2: getAnalysisStep2(locale),
    }),
    [locale, pack, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}