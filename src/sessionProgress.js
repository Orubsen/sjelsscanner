import { CATEGORIES, MAX_QUESTIONS } from "./analysisConfig.js";

/** Combined progress: ~55% from questions, ~45% from category coverage. */
export function computeSessionProgressPercent(questionNumber, coveredCategoryIds) {
  const q = Math.min(100, (Math.max(0, questionNumber) / MAX_QUESTIONS) * 55);
  const covered = new Set(coveredCategoryIds || []).size;
  const c = Math.min(100, (covered / CATEGORIES.length) * 45);
  return Math.min(100, Math.round(q + c));
}