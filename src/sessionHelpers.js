import {
  CATEGORIES,
  matchCategoryId,
  mergeCoveredCategories,
  MAX_QUESTIONS,
  MIN_QUESTIONS_SUGGEST,
} from "./analysisConfig.js";
import { ANALYSIS_STEP1_PROMPT, ANALYSIS_STEP2_PROMPT } from "./systemPrompt.js";

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

import { compactMessagesForApi } from "./jsonUtils.js";
import { buildParticipantContext } from "./participantHelpers.js";

export function formatStructuredAnswersForApi(answers) {
  if (!answers?.length) return "(ingen strukturerte svar ennå)";
  return answers
    .map(
      (a) =>
        `#${a.index} [${a.category || "?"}] Spørsmål: ${a.question}\nSvar: ${a.answer}${a.isCustom ? " (eget svar)" : ""}`
    )
    .join("\n\n");
}

export function buildAnswerUserMessage(questionNumber, category, answerText) {
  return `[Svar på spm ${questionNumber} (${category || "ukjent kategori"}): ${answerText}]`;
}

export function buildQuestionContextMessage(questionNumber) {
  return `[Kontekst fra app: Dette er svar #${questionNumber}. Maks ${MAX_QUESTIONS} spørsmål totalt. Minst ${MIN_QUESTIONS_SUGGEST} før analyse kan foreslås. Vurder dekning av 15 kategorier individuelt denne gangen.]`;
}

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
export function prependParticipantMessages(messages, participant) {
  const ctx = buildParticipantContext(participant);
  if (!ctx) return messages;
  return [{ role: "user", content: ctx }, ...(messages || [])];
}

export function buildLeanQuestionMessages(structuredAnswers, messages, participant) {
  const summary = formatStructuredAnswersForApi(structuredAnswers);
  const covered = [
    ...new Set(structuredAnswers.map((a) => a.categoryId).filter(Boolean)),
  ].sort((a, b) => a - b);
  const n = structuredAnswers.length;
  const last = messages?.[messages.length - 1];
  const out = [
    {
      role: "user",
      content: `[SESSION] ${n} svar registrert. Neste steg: still spørsmål ${n + 1} (JSON type question). Dekket kategori-id: [${covered.join(",") || "ingen"}].`,
    },
    {
      role: "user",
      content: `STRUKTURERTE SVAR:\n${summary}`,
    },
  ];
  if (last?.role === "user") out.push(last);
  return prependParticipantMessages(out, participant);
}

export function prepareMessagesForApi(messages, structuredAnswers, participant) {
  let prepared;
  if (structuredAnswers?.length >= 4) {
    prepared = buildLeanQuestionMessages(structuredAnswers, messages, participant);
  } else {
    const keepRecentPairs = structuredAnswers?.length >= 10 ? 2 : 3;
    prepared = compactMessagesForApi(messages, { keepRecentPairs, minLength: 6 });
    prepared = prependParticipantMessages(prepared, participant);
  }
  return prepared;
}

export function buildStep1Messages(structuredAnswers, participant) {
  const p = buildParticipantContext(participant);
  return [
    {
      role: "user",
      content: `${p ? `${p}\n\n` : ""}${ANALYSIS_STEP1_PROMPT}\n\nSTRUKTURERTE SVAR:\n${formatStructuredAnswersForApi(structuredAnswers)}`,
    },
  ];
}

export function buildStep2Messages(structuredAnswers, step1Result, conversationTail, participant) {
  const summary =
    step1Result?.summary_text ||
    step1Result?.summary ||
    JSON.stringify(step1Result);
  const p = buildParticipantContext(participant);
  return [
    ...(conversationTail || []).slice(-4),
    {
      role: "user",
      content: `${p ? `${p}\n\n` : ""}${ANALYSIS_STEP2_PROMPT}\n\nINTERN OPPSUMMERING:\n${summary}\n\nSTRUKTURERTE SVAR:\n${formatStructuredAnswersForApi(structuredAnswers)}`,
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
  const obs = content.match(/\*\*Observasjon:\*\*\s*([\s\S]*?)(?=\*\*Tolkning:\*\*|$)/i);
  const tol = content.match(/\*\*Tolkning:\*\*\s*([\s\S]*?)(?=\*\*Usikkerhet:\*\*|$)/i);
  const usk = content.match(/\*\*Usikkerhet:\*\*\s*([\s\S]*?)$/i);
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