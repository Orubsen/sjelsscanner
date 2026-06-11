import {
  CATEGORIES,
  matchCategoryId,
  mergeCoveredCategories,
  MAX_QUESTIONS,
  MIN_QUESTIONS_SUGGEST,
} from "./analysisConfig.js";
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
      affective_temperature: "",
      diagnostic_confidence: "",
    };
  }
  return {
    type: "analysis",
    // Accept parsed.report / parsed.full_report as fallback aliases so that a
    // minor LLM hallucination on the root field name doesn't discard the full
    // analysis body. Precedence: analysis → report → full_report → "".
    analysis: parsed.analysis || parsed.report || parsed.full_report || "",
    frameworks: parsed.frameworks || null,
    overall_insight: parsed.overall_insight || "",
    key_themes: Array.isArray(parsed.key_themes) ? parsed.key_themes : [],
    short_summary: parsed.short_summary || "",
    conflicts: Array.isArray(parsed.conflicts) ? parsed.conflicts : [],
    clinical_followup: parsed.clinical_followup || "",
    // v2 fields (meta-prompt expansion)
    affective_temperature: parsed.affective_temperature || "",
    diagnostic_confidence: parsed.diagnostic_confidence || "",
    // Pass-through optional legacy fields
    forensic_flags: Array.isArray(parsed.forensic_flags) ? parsed.forensic_flags : [],
    dark_triad_assessment: parsed.dark_triad_assessment || null,
    object_relations_level: parsed.object_relations_level || "",
    mentalization_capacity: parsed.mentalization_capacity || "",
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

  // Anchor the tail to the last assistant message and take everything from there.
  // This gives toGeminiContents [assistant: Q(n-1)_json, user: answer, ...] which
  // produces proper alternating turns (User → Model → User).
  //
  // WHY NOT slice(-2): when the caller appends a retry user message —
  //   [...messages, retryMsg]
  // — slice(-2) yields [user: answer, user: retryMsg] (both same role).
  // toGeminiContents merges them into one blob with NO preceding assistant turn,
  // stripping Gemini of all Q(n-1) context → incomplete_response on every retry.
  // lastIndexOf("assistant") anchors to the real Q(n-1) JSON regardless of how
  // many trailing user messages follow it, so retries work correctly.
  const msgs = messages || [];
  const lastAssistantIdx = msgs.map((m) => m.role).lastIndexOf("assistant");
  const tail = lastAssistantIdx >= 0 ? msgs.slice(lastAssistantIdx) : [];

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

/**
 * Single-step analysis messages — no step1 required.
 * Sends ALL answers (maxDetailed=25) so the model has complete data.
 * Use with analysisMode:true and analysis_schema:true in callClaude.
 *
 * Why single-step instead of step1+step2:
 *   step1 was given getAnalysisSystemPrompt (which says type:"analysis")
 *   while its user message said type:"internal_summary" — a conflict that
 *   caused Gemini to generate a truncated type:"analysis" object. step2 then
 *   received that corrupted summary and generated custom fields
 *   (forensic_flags, dark_triad_assessment) while omitting the required
 *   "analysis" text and "frameworks" object. Removing step1 eliminates the
 *   conflict and lets step2's system prompt and responseSchema work cleanly.
 */
export function buildDirectAnalysisMessages(structuredAnswers, conversationTail, participant, locale = "nb") {
  const p = buildParticipantContext(participant, locale);
  const step2 = getAnalysisStep2(locale);
  // Include ALL answers (25 max) so the model has the full dataset for analysis.
  return [
    ...(conversationTail || []).slice(-4),
    {
      role: "user",
      content: `${p ? `${p}\n\n` : ""}${step2}\n\n${structuredAnswersLabel(locale)}\n${formatStructuredAnswersForApi(structuredAnswers, locale, 25)}`,
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
