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

export function formatStructuredAnswersForApi(answers, locale = "nb") {
  if (!answers?.length) return t(locale, "api.noAnswersYet");
  return answers
    .map((a) =>
      t(locale, "api.answerLine", {
        index: a.index,
        category: a.category || "?",
        question: a.question,
        answer: a.answer,
        custom: a.isCustom ? t(locale, "api.customSuffix") : "",
      })
    )
    .join("\n\n");
}

export function buildAnswerUserMessage(questionNumber, category, answerText, locale = "nb") {
  return t(locale, "api.answerMsg", {
    n: questionNumber,
    category: category || t(locale, "api.unknownCategory"),
    text: answerText,
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