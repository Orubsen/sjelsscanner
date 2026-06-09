// F1 – Modellnavn kan overstyres via Netlify-miljøvariabel GEMINI_MODEL.
// Standard: "gemini-2.5-flash". Sett variabelen i Netlify-dashbordet
// under Site configuration → Environment variables dersom du vil bytte modell
// uten å endre kode.
const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

// ---------------------------------------------------------------------------
// K3 – CORS låst til eget domene i produksjon
// ---------------------------------------------------------------------------

function getAllowedOrigin() {
  if (process.env.CONTEXT === "dev") return "*";
  return process.env.ALLOWED_ORIGIN || "https://kjernekoden.netlify.app";
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": getAllowedOrigin(),
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

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
  // K3 – OPTIONS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders() },
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error:
          "GEMINI_API_KEY not configured. Get a free key at https://aistudio.google.com/apikey",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      }
    );
  }

  try {
    const body = await request.json();
    const model = body.model || DEFAULT_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const generationConfig = {
      maxOutputTokens: body.max_tokens ?? 512,
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
    } catch (parseErr) {
      // F5 – Logg råsvaret server-side; send generisk melding til klient.
      console.error("gemini: invalid JSON from Gemini API:", parseErr, "| raw:", String(rawText || "").slice(0, 500));
      return new Response(
        JSON.stringify({
          error: "Gemini returnerte eit ugyldig svar. Prøv igjen.",
        }),
        {
          status: 502,
          headers: { "Content-Type": "application/json", ...corsHeaders() },
        }
      );
    }

    if (!response.ok) {
      const message =
        data?.error?.message || data?.error || `Gemini HTTP ${response.status}`;
      return new Response(JSON.stringify({ error: message }), {
        status: response.status,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
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
        {
          status: 502,
          headers: { "Content-Type": "application/json", ...corsHeaders() },
        }
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

      // [DIAG] Logg finishReason og råtekstlengde rett før validering
      console.log('[DIAG] finishReason:', finishReason, 'rawLength:', t?.length);

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
              headers: { "Content-Type": "application/json", ...corsHeaders() },
            }
          );
        }
        // JSON kan ikkje parses i det heile – signaler retry så klienten prøver igjen
        // automatisk i staden for å vise ein feilmelding til brukaren.
        return new Response(
          JSON.stringify({
            error:
              "Gemini returnerte ugyldig spørsmåls-JSON. Prøv igjen (appen ber om kompakt svar).",
            finishReason,
            retry: true,
          }),
          {
            status: 502,
            headers: { "Content-Type": "application/json", ...corsHeaders() },
          }
        );
      }

      // Validate that question responses always include all 4 options.
      // Gemini sometimes ignores the responseSchema and returns {"type":"question"} without
      // "options" – this guard rejects that and signals the client to retry automatically.
      try {
        const parsedCheck = JSON.parse(normalized);
        if (
          parsedCheck.type === "question" &&
          (!Array.isArray(parsedCheck.options) || parsedCheck.options.length < 4)
        ) {
          console.error(
            "gemini: spørsmål manglar options – sender retry-signal. options=",
            parsedCheck.options,
            "| raw (200 tegn):", t.slice(0, 200)
          );
          return new Response(
            JSON.stringify({ error: "incomplete_response", retry: true, finishReason }),
            {
              status: 502,
              headers: { "Content-Type": "application/json", ...corsHeaders() },
            }
          );
        }
      } catch { /* normalized er garantert gyldig JSON frå normalizeQuestionPayload */ }

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
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      }
    );
  } catch (error) {
    // F5 – Logg full feil server-side; send generisk melding til klient.
    console.error("gemini function error:", error);
    const msg = String(error?.message || error || "Unknown error");
    const isTimeout = /timeout|aborted/i.test(msg);
    return new Response(
      JSON.stringify({
        error: isTimeout
          ? "Gemini tok for lang tid. Prøv igjen – appen sender nå mindre data per runde."
          : "Intern serverfeil. Prøv igjen.",
      }),
      {
        status: isTimeout ? 504 : 500,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      }
    );
  }
};

export const config = {
  path: "/api/gemini",
};
