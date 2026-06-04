/** JSON Schema for mapping-phase question responses (Gemini structured output). */
export const QUESTION_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["question", "rephrase", "opinion"] },
    question: { type: "string", description: "Question text, max 220 chars, no raw double quotes" },
    category: { type: "string" },
    questionNumber: { type: "integer" },
    options: {
      type: "array",
      items: { type: "string" },
      minItems: 4,
      maxItems: 4,
    },
    categories_covered: {
      type: "array",
      items: { type: "integer" },
    },
    missing_categories: {
      type: "array",
      items: { type: "string" },
      maxItems: 5,
    },
    analysis_ready: { type: "boolean" },
    readiness_note: { type: "string", description: "Max 60 chars" },
    opinion: { type: "string" },
  },
  required: ["type"],
};