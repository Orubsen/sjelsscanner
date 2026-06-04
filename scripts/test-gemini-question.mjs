import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnv() {
  try {
    const raw = readFileSync(resolve(root, ".env"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    /* no .env */
  }
}

loadEnv();
const key = process.env.GEMINI_API_KEY;
if (!key) {
  console.error("No GEMINI_API_KEY");
  process.exit(1);
}

const QUESTION_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["question", "rephrase", "opinion"] },
    question: { type: "string" },
    category: { type: "string" },
    questionNumber: { type: "integer" },
    options: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
    categories_covered: { type: "array", items: { type: "integer" } },
    missing_categories: { type: "array", items: { type: "string" } },
    analysis_ready: { type: "boolean" },
    readiness_note: { type: "string" },
  },
  required: ["type", "question", "category", "questionNumber", "options"],
};

const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${key}`;

const body = {
  systemInstruction: {
    parts: [
      {
        text: 'Return ONLY valid JSON type question. No raw " inside strings — use « ». One line.',
      },
    ],
  },
  contents: [
    {
      role: "user",
      parts: [
        {
          text: '[SESSION] 8 answers. Next: question 9. Category: Grenser. User last answer: "Jeg sier ofte nei når jeg egentlig mener ja."',
        },
      ],
    },
  ],
  generationConfig: {
    maxOutputTokens: 2048,
    temperature: 0.35,
    responseMimeType: "application/json",
    responseSchema: QUESTION_RESPONSE_SCHEMA,
  },
};

const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
const data = await res.json();
const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
console.log("HTTP", res.status, "finish", data?.candidates?.[0]?.finishReason);
console.log("len", text.length);
console.log("preview", text.slice(0, 240));
try {
  JSON.parse(text);
  console.log("JSON.parse: OK");
} catch (e) {
  console.log("JSON.parse: FAIL", e.message);
}