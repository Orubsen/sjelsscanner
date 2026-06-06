const DEFAULT_MODEL = "gemini-3.5-flash";

/** JSON Schema for mapping-phase responses — inlined (not a separate functions file). */
const QUESTION_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["question", "rephrase", "opinion"] },
    question: { type: "string", description: "Max 220 chars, use « » not ASCII quotes" },
    category: { type: "string" },
    questionNumber: { type: "integer" },
    options: {
      type: "array",
      items: { type: "string" },
      minItems: 4,
      maxItems: 4,
    },
    categories_covered: { type: "array", items: { type: "integer" } },
    missing_categories: { type: "array", items: { type: "string" } },
    analysis_ready: { type: "boolean" },
    readiness_note: { type: "string" },
    opinion: { type: "string" },
  },
  required: ["type", "question", "category", "questionNumber", "options", "analysis_ready"],
};

function toGeminiContents(messages) {
  const contents = [];
  for (const msg of messages || []) {
    const role = msg.role === "assistant" ? "model" : "user";
    const text = String(msg.content ?? "");
    if (!text) continue;
    const last = contents[contents.length - 1];
    if (last && last.role === role) {
      last.parts[0].text += "\n\n" + text;
    } else {
      contents.push({ role, parts: [{ text }] });
    }
  }
  if (contents.length && contents[0].role !== "user") {
    contents.unshift({ role: "user", parts: [{ text: "(session continues)" }] });
  }
  return contents;
}

function closeOpenString(s) {
  let inString = false;
  let escape = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (c === "\\") {
        escape = true;
        continue;
      }
      if (c === '"') inString = false;
      continue;
    }
    if (c === '"') inString = true;
  }
  return inString ? `${s}"` : s;
}

function repairJson(str) {
  let s = closeOpenString(String(str || "").trim());
  s = s.replace(/,\s*([}\]])/g, "$1");
  const opens = (s.match(/\{/g) || []).length;
  const closes = (s.match(/\}/g) || []).length;
  if (opens > closes) {
    s = s.replace(/,\s*"[^"]*":\s*("[^"]*)?$/, "");
    s = s.replace(/,\s*"[^"]*":\s*$/, "");
    s = s.replace(/,\s*$/, "");
    s += "}".repeat(opens - closes);
  }
  const openBrackets = (s.match(/\[/g) || []).length;
  const closeBrackets = (s.match(/\]/g) || []).length;
  if (openBrackets > closeBrackets) s += "]".repeat(openBrackets - closeBrackets);
  return s;
}

function salvageQuestionJson(text) {
  const raw = String(text || "").trim();
  const type = raw.match(/"type"\s*:\s*"(\w+)"/)?.[1];
  if (!type) return null;

  const questionNumber = Number(raw.match(/"questionNumber"\s*:\s*(\d+)/)?.[1]) || 1;
  const catM = raw.match(/"category"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  const category = catM ? catM[1].replace(/\\"/g, '"') : "";

  const qStart = raw.indexOf('"question":"');
  let question = "";
  if (qStart !== -1) {
    const from = qStart + '"question":"'.length;
    const endMarkers = ['","category"', '", "category"', '","options"', '", "options"'];
    let end = raw.length;
    for (const m of endMarkers) {
      const idx = raw.indexOf(m, from);
      if (idx !== -1 && idx < end) end = idx;
    }
    question = raw.slice(from, end).replace(/\\"/g, '"').replace(/\\n/g, "\n");
  }

  const options = [];
  const optBlock = raw.match(/"options"\s*:\s*\[([\s\S]*?)\]/);
  if (optBlock) {
    const re = /"((?:[^"\\]|\\.)*)"/g;
    let m;
    while ((m = re.exec(optBlock[1])) && options.length < 4) {
      options.push(m[1].replace(/\\"/g, '"'));
    }
  }

  if (type === "question" && question && options.length >= 4) {
    return {
      type: "question",
      question,
      category,
      questionNumber,
      options: options.slice(0, 4),
      categories_covered: [],
      missing_categories: [],
      analysis_ready: /"analysis_ready"\s*:\s*true/.test(raw),
      readiness_note: "",
    };
  }
  return null;
}

/** Ensure question JSON returned to the browser is always valid. */
function normalizeQuestionPayload(text) {
  const trimmed = String(text || "").trim();
  try {
    return JSON.stringify(JSON.parse(trimmed));
  } catch {
    try {
      return JSON.stringify(JSON.parse(repairJson(trimmed)));
    } catch {
      const salvaged = salvageQuestionJson(trimmed);
      if (salvaged) return JSON.stringify(salvaged);
      return null;
    }
  }
}

export default async (request) => {
  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error:
          "GEMINI_API_KEY not configured. Get a free key at https://aistudio.google.com/apikey",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await request.json();
    const model = body.model || DEFAULT_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const generationConfig = {
      maxOutputTokens: body.max_tokens ?? 4096,
      temperature: body.temperature ?? 0.7,
    };
    const useQuestionSchema = body.json_schema === "question";
    if (useQuestionSchema) {
      generationConfig.responseMimeType = "application/json";
      generationConfig.responseSchema = QUESTION_RESPONSE_SCHEMA;
      if (generationConfig.temperature > 0.5) {
        generationConfig.temperature = 0.35;
      }
    } else if (body.json_mode) {
      generationConfig.responseMimeType = "application/json";
    }

    const geminiBody = {
      systemInstruction: body.system
        ? { parts: [{ text: String(body.system) }] }
        : undefined,
      contents: toGeminiContents(body.messages),
      generationConfig,
    };

    const fetchSignal =
      typeof AbortSignal !== "undefined" && AbortSignal.timeout
        ? AbortSignal.timeout(120000)  // 2 minutes to accommodate longer prompts in late sessions
        : undefined;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody),
      signal: fetchSignal,
    });

    const rawText = await response.text();
    let data;
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      const preview = String(rawText || "").slice(0, 120);
      return new Response(
        JSON.stringify({
          error: `Gemini returnerte ugyldig svar: ${preview}`,
        }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!response.ok) {
      const message =
        data?.error?.message || data?.error || `Gemini HTTP ${response.status}`;
      return new Response(JSON.stringify({ error: message }), {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    const candidate = data?.candidates?.[0];
    const finishReason = candidate?.finishReason || "unknown";
    let text =
      candidate?.content?.parts
        ?.map((p) => p.text)
        .filter(Boolean)
        .join("") || "";

    if (!text) {
      return new Response(
        JSON.stringify({ error: `Empty Gemini response (finish: ${finishReason})` }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    if (useQuestionSchema) {
      let t = String(text || "").trim();
      // Strip markdown fences that Gemini sometimes adds despite schema
      t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
      const first = t.indexOf('{');
      if (first > 0) t = t.slice(first);
      const last = t.lastIndexOf('}');
      if (last > 0) t = t.slice(0, last + 1);

      const normalized = normalizeQuestionPayload(t);
      if (!normalized) {
        // Graceful fallback: if the model output an analysis response during a question call
        // (common when it decides analysis is ready around q15+), pass the text through so
        // the frontend can parse it as analysis instead of showing error to the user.
        const looksLikeAnalysis =
          /"type"\s*:\s*"analysis"/.test(t) ||
          /"frameworks"\s*:\s*\{/.test(t) ||
          /## DOMINERENDE|## IDENTIFISERTE FORSVARSMEKANISMER/.test(t);
        if (looksLikeAnalysis) {
          return new Response(
            JSON.stringify({
              content: [{ type: "text", text: t }],
              finishReason,
              truncated: finishReason === "MAX_TOKENS",
            }),
            {
              status: 200,
              headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
              },
            }
          );
        }
        return new Response(
          JSON.stringify({
            error:
              "Gemini returnerte ugyldig spørsmåls-JSON. Prøv igjen (appen ber om kompakt svar).",
            finishReason,
          }),
          { status: 502, headers: { "Content-Type": "application/json" } }
        );
      }
      text = normalized;
    }

    return new Response(
      JSON.stringify({
        content: [{ type: "text", text }],
        finishReason,
        truncated: finishReason === "MAX_TOKENS",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  } catch (error) {
    const msg = String(error?.message || error || "Unknown error");
    const isTimeout = /timeout|aborted/i.test(msg);
    return new Response(
      JSON.stringify({
        error: isTimeout
          ? "Gemini tok for lang tid. Prøv igjen – appen sender nå mindre data per runde."
          : msg,
      }),
      {
        status: isTimeout ? 504 : 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

export const config = {
  path: "/api/gemini",
};