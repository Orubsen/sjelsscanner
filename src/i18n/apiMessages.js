import { nb } from "./locales/nb.js";
import { nn } from "./locales/nn.js";
import { en } from "./locales/en.js";
import { MAX_QUESTIONS, MIN_QUESTIONS_SUGGEST } from "../analysisConfig.js";

const PACKS = { nb, nn, en };

function pack(locale) {
  return PACKS[locale === "nn" || locale === "en" ? locale : "nb"];
}

function interpolate(str, vars) {
  if (!vars) return str;
  return Object.entries(vars).reduce(
    (s, [k, v]) => s.replaceAll(`{${k}}`, String(v)),
    str
  );
}

function t(locale, key, vars) {
  const parts = key.split(".");
  let o = pack(locale);
  for (const p of parts) o = o?.[p];
  return interpolate(String(o ?? key), vars);
}

export function formatStructuredAnswersForApi(answers, locale = "nb", maxDetailed = 10) {
  if (!answers?.length) return t(locale, "api.noAnswersYet");

  // Cap for long sessions to keep Gemini calls fast (prevents "tok for lang tid" timeouts).
  // For regular question turns: last ~10.
  // For analysis (step1/step2): allow more (up to 25) so the report has good data.
  let toFormat = answers;
  if (answers.length > maxDetailed + 5) {
    const older = answers.slice(0, -maxDetailed);
    const recent = answers.slice(-maxDetailed);
    const olderCats = [...new Set(older.map(a => a.categoryId).filter(Boolean))].sort((a,b)=>a-b);
    const olderNote = {
      index: 0,
      category: t(locale, "api.unknownCategory"),
      question: `(tidligere ${older.length} svar - komprimert)`,
      answer: olderCats.length ? `Kategorier dekket tidligere: ${olderCats.join(', ')}` : 'Mange tidligere svar',
      isCustom: false,
    };
    toFormat = [olderNote, ...recent];
  }

  return toFormat
    .map((a) =>
      t(locale, "api.answerLine", {
        index: a.index,
        category: a.category || "?",
        question: String(a.question || "").slice(0, 220),
        answer: String(a.answer || "").slice(0, 420),
        custom: a.isCustom ? t(locale, "api.customSuffix") : "",
      })
    )
    .join("\n\n");
}

export function buildAnswerUserMessage(questionNumber, category, answerText, locale = "nb") {
  // Cap at 500 chars so long custom answers don't crowd out Gemini's output budget for options.
  const text = String(answerText ?? "").slice(0, 500);
  return t(locale, "api.answerMsg", {
    n: questionNumber,
    category: category || t(locale, "api.unknownCategory"),
    text,
  });
}

export function buildQuestionContextMessage(questionNumber, locale = "nb") {
  return t(locale, "api.contextMsg", {
    n: questionNumber,
    max: MAX_QUESTIONS,
    min: MIN_QUESTIONS_SUGGEST,
  });
}

export function buildLeanSessionUserMessage(structuredAnswers, locale = "nb") {
  const n = structuredAnswers.length;
  const covered = [
    ...new Set(structuredAnswers.map((a) => a.categoryId).filter(Boolean)),
  ].sort((a, b) => a - b);
  return t(locale, "api.sessionMsg", {
    n,
    next: n + 1,
    covered: covered.length ? covered.join(",") : t(locale, "api.noneCovered"),
  });
}

export function structuredAnswersLabel(locale = "nb") {
  return t(locale, "api.structuredAnswers");
}

export function getAgeGuidance(age, locale = "nb") {
  const a = Number(age);
  const g = pack(locale).ageGuidance;
  if (!Number.isFinite(a)) return g.default;
  if (a < 20) return g.under20;
  if (a < 30) return g.age20_29;
  if (a < 45) return g.age30_44;
  if (a < 60) return g.age45_59;
  return g.age60plus;
}

export function buildParticipantContext(participant, locale = "nb") {
  const name = String(participant?.name ?? "").trim();
  const age = participant?.age;
  const email = String(participant?.email ?? "").trim().toLowerCase();
  if (name.length < 2 || !email) return "";
  return t(locale, "api.participantBlock", {
    name,
    age,
    email,
    guidance: getAgeGuidance(age, locale),
  });
}

export function getValidationMessages(locale = "nb") {
  const v = pack(locale).validation;
  return v;
}

export { t as apiT };