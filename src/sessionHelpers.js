import {
  CATEGORIES,
  matchCategoryId,
  mergeCoveredCategories,
  MAX_QUESTIONS,
  MIN_QUESTIONS_SUGGEST,
} from "./analysisConfig.js";
import { compactMessagesForApi } from "./jsonUtils.js";
import {
  formatStructuredAnswersForApi,
  buildAnswerUserMessage,
  buildQuestionContextMessage,
  buildLeanSessionUserMessage,
  structuredAnswersLabel,
  buildParticipantContext,
} from "./i18n/apiMessages.js";
import { getAnalysisStep1, getAnalysisStep2 } from "./i18n/systemPrompts.js";

export function normalizeAnalysis(parsed) {
  if (!parsed || typeof parsed !== "object") {
    return {
      type: "analysis",
      analysis: "",
      frameworks: null,
      overall_insight: "",
      key_themes: [],
      short_summary: "",
      conflicts: [],
      clinical_followup: "",
    };
  }
  return {
    type: "analysis",
    analysis: parsed.analysis || "",
    frameworks: parsed.frameworks || null,
    overall_insight: parsed.overall_insight || "",
    key_themes: Array.isArray(parsed.key_themes) ? parsed.key_themes : [],
    short_summary: parsed.short_summary || "",
    conflicts: Array.isArray(parsed.conflicts) ? parsed.conflicts : [],
    clinical_followup: parsed.clinical_followup || "",
  };
}

export { formatStructuredAnswersForApi, buildAnswerUserMessage, buildQuestionContextMessage };

export function recordAnswer(structuredAnswers, entry) {
  return [...(structuredAnswers || []), entry];
}

export function createAnswerEntry({
  index,
  question,
  category,
  answer,
  isCustom = false,
}) {
  const categoryId = matchCategoryId(category);
  return {
    index,
    question,
    category: category || "",
    categoryId,
    answer,
    isCustom,
    at: Date.now(),
  };
}

export function applyQuestionMeta(state, result) {
  const covered = mergeCoveredCategories(
    state.coveredCategoryIds,
    result?.categories_covered
  );
  const fromCategory = matchCategoryId(result?.category);
  if (fromCategory) covered.push(fromCategory);
  const unique = [...new Set(covered)].sort((a, b) => a - b);

  return {
    coveredCategoryIds: unique,
    analysisReady: Boolean(result?.analysis_ready),
    readinessNote: result?.readiness_note || "",
    missingCategories: Array.isArray(result?.missing_categories)
      ? result.missing_categories
      : state.missingCategories,
  };
}

export function canSuggestAnalysis(questionNumber, analysisReady) {
  return (
    analysisReady ||
    (questionNumber >= MIN_QUESTIONS_SUGGEST && questionNumber < MAX_QUESTIONS)
  );
}

export function mustForceAnalysis(questionNumber) {
  return questionNumber >= MAX_QUESTIONS;
}

/** Minimal payload for question turns — avoids re-sending full JSON history. */
export function prependParticipantMessages(messages, participant, locale = "nb") {
  const ctx = buildParticipantContext(participant, locale);
  if (!ctx) return messages;
  return [{ role: "user", content: ctx }, ...(messages || [])];
}

export function buildLeanQuestionMessages(structuredAnswers, messages, participant, locale = "nb") {
  // For question turns, send max 3 detailed answers to keep input tokens minimal.
  // This prevents Gemini from degrading JSON schema adherence in long sessions (q16+).
  // Analysis calls (step1/step2) use their own messages with maxDetailed=25.
  const summary = formatStructuredAnswersForApi(structuredAnswers, locale, 3);

  // Take the last 2 messages from the original history. For Q2 this is typically
  // [assistant: Q1_json, user: Q1_answer], which gives toGeminiContents the data to
  // produce proper alternating turns (User → Model → User) instead of one merged blob.
  // Proper turn alternation significantly improves Gemini's JSON schema adherence.
  // On client retry the tail will be [user: answer, user: retryInstruction] — both
  // get merged by toGeminiContents, but crucially the original answer is no longer
  // dropped (fixes the context-loss bug on retry).
  const tail = (messages || []).slice(-2);

  const out = [
    {
      role: "user",
      content: buildLeanSessionUserMessage(structuredAnswers, locale),
    },
    {
      role: "user",
      content: `${structuredAnswersLabel(locale)}\n${summary}`,
    },
    ...tail,
  ];
  return prependParticipantMessages(out, participant, locale);
}

export function prepareMessagesForApi(messages, structuredAnswers, participant, locale = "nb") {
  let prepared;
  if (structuredAnswers?.length >= 1) {
    prepared = buildLeanQuestionMessages(structuredAnswers, messages, participant, locale);
  } else {
    prepared = prependParticipantMessages(messages, participant, locale);
  }
  return prepared;
}

export function buildStep1Messages(structuredAnswers, participant, locale = "nb") {
  const p = buildParticipantContext(participant, locale);
  const step1 = getAnalysisStep1(locale);
  // Cap at 3 detailed answers to keep input tokens minimal and stay under 10s function timeout.
  return [
    {
      role: "user",
      content: `${p ? `${p}\n\n` : ""}${step1}\n\n${structuredAnswersLabel(locale)}\n${formatStructuredAnswersForApi(structuredAnswers, locale, 3)}`,
    },
  ];
}

export function buildStep2Messages(structuredAnswers, step1Result, conversationTail, participant, locale = "nb") {
  const summary =
    step1Result?.summary_text ||
    step1Result?.summary ||
    JSON.stringify(step1Result);
  const p = buildParticipantContext(participant, locale);
  const step2 = getAnalysisStep2(locale);
  // Cap at 3 detailed answers to keep input tokens minimal and stay under 10s function timeout.
  return [
    ...(conversationTail || []).slice(-4),
    {
      role: "user",
      content: `${p ? `${p}\n\n` : ""}${step2}\n\nINTERN OPPSUMMERING:\n${summary}\n\n${structuredAnswersLabel(locale)}\n${formatStructuredAnswersForApi(structuredAnswers, locale, 3)}`,
    },
  ];
}

export function getSavedSessionSummary(state) {
  if (!state || state.phase === "intro") return null;
  if (state.phase === "result") return null;
  const n = state.questionNumber || 0;
  if (n < 1 && state.phase === "questions") return null;
  return {
    questionNumber: n,
    phase: state.phase,
    covered: state.coveredCategoryIds?.length || 0,
    totalCategories: CATEGORIES.length,
  };
}

export function parseSectionBlocks(content) {
  if (!content) return { observation: "", interpretation: "", uncertainty: "", raw: content };
  const obs = content.match(/\*\*Observasjon:\*\*\s*([\s\S]*?)(?=\*\*Tolkning:\*\*|$)/i)
    || content.match(/\*\*Observation:\*\*\s*([\s\S]*?)(?=\*\*Interpretation:\*\*|$)/i);
  const tol = content.match(/\*\*Tolkning:\*\*\s*([\s\S]*?)(?=\*\*Usikkerhet:\*\*|$)/i)
    || content.match(/\*\*Interpretation:\*\*\s*([\s\S]*?)(?=\*\*Uncertainty:\*\*|$)/i);
  const usk = content.match(/\*\*Usikkerhet:\*\*\s*([\s\S]*?)$/i)
    || content.match(/\*\*Usikkerheit:\*\*\s*([\s\S]*?)$/i)
    || content.match(/\*\*Uncertainty:\*\*\s*([\s\S]*?)$/i);
  if (obs || tol || usk) {
    return {
      observation: obs?.[1]?.trim() || "",
      interpretation: tol?.[1]?.trim() || "",
      uncertainty: usk?.[1]?.trim() || "",
      raw: content,
    };
  }
  return { observation: "", interpretation: "", uncertainty: "", raw: content };
}
