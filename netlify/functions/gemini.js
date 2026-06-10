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

/**
 * JSON Schema for analysis-phase responses.
 * Used when body.analysis_schema === true (direct analysis call, no step1).
 * Enforces the presence of "analysis" (10 ## sections) and "frameworks" (5 keys)
 * which Gemini otherwise tends to omit in favour of custom fields like
 * forensic_flags / dark_triad_assessment that normalizeAnalysis cannot handle.
 */
const ANALYSIS_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["analysis"] },
    short_summary: { type: "string" },
    overall_insight: { type: "string" },
    key_themes: { type: "array", items: { type: "string" } },
    conflicts: { type: "array", items: { type: "string" } },
    clinical_followup: { type: "string" },
    analysis: {
      type: "string",
      description: "Full psychoanalytic analysis with all 10 required ## headings, each containing Observasjon/Tolkning/Usikkerhet blocks",
    },
    frameworks: {
      type: "object",
      properties: {
        attachment: {
          type: "object",
          properties: {
            summary: { type: "string" },
            key_patterns: { type: "array", items: { type: "string" } },
            evidence_from_answers: { type: "string" },
            quote: { type: "string" },
            question_index: { type: "integer" },
          },
          required: ["summary", "key_patterns", "evidence_from_answers", "quote", "question_index"],
        },
        defense_mechanisms: {
          type: "object",
          properties: {
            summary: { type: "string" },
            key_patterns: { type: "array", items: { type: "string" } },
            evidence_from_answers: { type: "string" },
            quote: { type: "string" },
            question_index: { type: "integer" },
          },
          required: ["summary", "key_patterns", "evidence_from_answers", "quote", "question_index"],
        },
        jungian_archetypes: {
          type: "object",
          properties: {
            summary: { type: "string" },
            key_patterns: { type: "array", items: { type: "string" } },
            evidence_from_answers: { type: "string" },
            quote: { type: "string" },
            question_index: { type: "integer" },
          },
          required: ["summary", "key_patterns", "evidence_from_answers", "quote", "question_index"],
        },
        freudian_analysis: {
          type: "object",
          properties: {
            summary: { type: "string" },
            key_patterns: { type: "array", items: { type: "string" } },
            evidence_from_answers: { type: "string" },
            quote: { type: "string" },
            question_index: { type: "integer" },
          },
          required: ["summary", "key_patterns", "evidence_from_answers", "quote", "question_index"],
        },
        ace_impact: {
          type: "object",
          properties: {
            summary: { type: "string" },
            key_patterns: { type: "array", items: { type: "string" } },
            evidence_from_answers: { type: "string" },
            quote: { type: "string" },
            question_index: { type: "integer" },
          },
          required: ["summary", "key_patterns", "evidence_from_answers", "quote", "question_index"],
        },
      },
      required: ["attachment", "defense_mechanisms", "jungian_archetypes", "freudian_analysis", "ace_impact"],
    },
  },
  required: ["type", "short_summary", "overall_insight", "key_themes", "conflicts", "clinical_followup", "analysis", "frameworks"],
};

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
    const handlerStart = Date.now();
    const body = await request.json();
    const model = body.model || DEFAULT_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const generationConfig = {
      maxOutputTokens: body.max_tokens ?? 512,
      temperature: body.temperature ?? 0.7,
    };
    const useQuestionSchema = body.json_schema === "question";
    // Client passes this so the server knows when analysis is appropriate
    // even if Gemini's truncated JSON omits the analysis_ready field.
    const clientQuestionCount = Number(body.question_count) || 0;
    // Client passes retry_attempt (0=first attempt, 1+=retry). Use temperature=0 on
    // retries to maximise schema adherence: the client already dropped the retry message
    // for incomplete_response, so a more deterministic call is the best recovery path.
    const clientRetryAttempt = Number(body.retry_attempt) || 0;
    if (useQuestionSchema) {
      generationConfig.responseMimeType = "application/json";
      generationConfig.responseSchema = QUESTION_RESPONSE_SCHEMA;
      // temperature=0 on retries: fully deterministic → better schema adherence.
      // temperature=0.35 on first attempt: enough creativity for diverse questions.
      generationConfig.temperature = clientRetryAttempt > 0 ? 0 : 0.35;
      // Disable thinking for schema-mode question calls.
      // Gemini 2.5 Flash thinking tokens count toward maxOutputTokens. If the model
      // "thinks" for 1500+ tokens, only ~500 remain for the actual JSON — not enough
      // to reliably generate all 4 options. Disabling thinking makes schema adherence
      // faster and more reliable. Question JSON doesn't benefit from deep reasoning.
      generationConfig.thinkingConfig = { thinkingBudget: 0 };
      // Ensure enough output room for a full question JSON (~300 tokens typical).
      // Use a fixed value instead of body.max_tokens (which is sized for analysis).
      generationConfig.maxOutputTokens = 1024;
    } else if (body.json_mode) {
      generationConfig.responseMimeType = "application/json";
      // Analysis calls (direct single-step): disable thinking to maximise generation speed.
      // Gemini 2.5 Flash thinking tokens can consume 2-5 extra seconds before output starts.
      // Without thinking, the model generates at full speed (~200-300 tokens/sec), allowing
      // more output tokens to fit within the Netlify function timeout.
      // Quality is maintained by the detailed system prompt (getAnalysisSystemPrompt).
      generationConfig.thinkingConfig = { thinkingBudget: 0 };
      // Override maxOutputTokens for analysis: use client value capped at 8192.
      // A full analysis JSON (10 ## sections + 5 frameworks) is ~6000-7000 tokens.
      // Cap raised from 6000 to 8192 to accommodate complete output.
      generationConfig.maxOutputTokens = Math.min(body.max_tokens ?? 512, 8192);
      // Apply analysis response schema when requested (body.analysis_schema === true).
      // The schema enforces "analysis" and "frameworks" fields that Gemini otherwise omits
      // in favour of custom fields like forensic_flags / dark_triad_assessment.
      if (body.analysis_schema === true) {
        generationConfig.responseSchema = ANALYSIS_RESPONSE_SCHEMA;
      }
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

    // Strip markdown fences Gemini sometimes adds (applies to all response types).
    text = String(text).trim()
      .replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    {
      const _first = text.indexOf('{');
      if (_first > 0) text = text.slice(_first);
      const _last = text.lastIndexOf('}');
      if (_last >= 0 && _last < text.length - 1) text = text.slice(0, _last + 1);
    }

    if (useQuestionSchema) {
      // Re-strip locally to guarantee clean input regardless of global strip edge cases.
      let t = String(text).trim();
      const first = t.indexOf('{');
      if (first > 0) t = t.slice(first);
      const last = t.lastIndexOf('}');
      if (last >= 0) t = t.slice(0, last + 1);

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
      // "options" – attempt an immediate server-side retry at temperature=0 before
      // falling back to the client-side retry signal.
      // effectiveNorm tracks which normalised payload to use (original or retry).
      let effectiveNorm = normalized;
      try {
        const parsedCheck = JSON.parse(normalized);
        if (
          parsedCheck.type === "question" &&
          (!Array.isArray(parsedCheck.options) || parsedCheck.options.length < 4)
        ) {
          console.error(
            "gemini: spørsmål manglar options – prøver server-side retry. options=",
            parsedCheck.options,
            "| raw (200 tegn):", t.slice(0, 200)
          );

          // Server-side immediate retry: append the bad response + explicit correction prompt,
          // then call Gemini again at temperature=0 (fully deterministic schema adherence).
          // Bilingual: covers both Norwegian and English sessions.
          const retryInstruction =
            "[CRITICAL ERROR / KRITISK FEIL: options missing. Return ONE valid JSON object — same question, same questionNumber — but NOW include EXACTLY 4 non-empty concrete answer strings in the \"options\" array. Example: {\"type\":\"question\",\"question\":\"...\",\"category\":\"...\",\"questionNumber\":8,\"options\":[\"A. ...\",\"B. ...\",\"C. ...\",\"D. ...\"],\"categories_covered\":[],\"missing_categories\":[],\"analysis_ready\":false,\"readiness_note\":\"\"}. JSON only, no other text.]";

          // If the client has >= 15 answers, honour the intent by returning auto_analysis_trigger.
          // We intentionally do NOT check parsedCheck.analysis_ready here: without thinking,
          // Gemini sometimes sets analysis_ready:true at Q1-Q2 (insufficient data). Firing
          // auto_analysis_trigger that early would skip all remaining questions.
          // The "get analysis now" button already handles the analysis_ready:true signal from
          // normal (4-option) question responses — no need to duplicate it here.
          if (clientQuestionCount >= 15) {
            console.log("gemini: auto_analysis_trigger – analysis_ready=", parsedCheck.analysis_ready, "clientQuestionCount=", clientQuestionCount);
            return new Response(
              JSON.stringify({
                content: [{ type: "text", text: JSON.stringify({ type: "auto_analysis_trigger", analysis_ready: true }) }],
                finishReason,
              }),
              { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders() } }
            );
          }

          const retryContents = [
            ...geminiBody.contents,
            { role: "model", parts: [{ text: t }] },
            { role: "user", parts: [{ text: retryInstruction }] },
          ];
          // Retry WITHOUT responseSchema — the schema constraint may be causing Gemini
          // to generate partial JSON. Free-form JSON mode with explicit text instructions
          // gives better options adherence on retry.
          const retryGeminiBody = {
            ...geminiBody,
            contents: retryContents,
            generationConfig: {
              maxOutputTokens: 1024,
              temperature: 0,
              responseMimeType: "application/json",
              thinkingConfig: { thinkingBudget: 0 },
              // responseSchema intentionally omitted
            },
          };
          // Dynamic timeout for server-side retry: use remaining wall-clock budget.
          // Netlify Pro allows 26s per function invocation, so give the retry up to
          // 15s if the main call was fast, or 2s minimum if it was slow.
          const elapsed = Date.now() - handlerStart;
          const retryBudget = Math.min(15000, Math.max(2000, 25000 - elapsed));
          const retrySignal = typeof AbortSignal !== "undefined" && AbortSignal.timeout
            ? AbortSignal.timeout(retryBudget)
            : undefined;

          let retryOk = false;
          try {
            const retryResp = await fetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(retryGeminiBody),
              signal: retrySignal,
            });
            if (retryResp.ok) {
              const retryData = await retryResp.json();
              let retryText = retryData?.candidates?.[0]?.content?.parts?.map(p => p.text).filter(Boolean).join("") || "";
              if (retryText) {
                // Strip fences and normalise
                retryText = String(retryText).trim()
                  .replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
                const ri = retryText.indexOf('{');
                if (ri > 0) retryText = retryText.slice(ri);
                const rl = retryText.lastIndexOf('}');
                if (rl >= 0) retryText = retryText.slice(0, rl + 1);

                const retryNorm = normalizeQuestionPayload(retryText);
                if (retryNorm) {
                  const retryParsed = JSON.parse(retryNorm);
                  if (Array.isArray(retryParsed.options) && retryParsed.options.length >= 4) {
                    console.log("gemini: server-side retry lykkast – options OK");
                    effectiveNorm = retryNorm;
                    retryOk = true;
                  }
                }
              }
            }
          } catch (retryErr) {
            console.error("gemini: server-side retry feilet:", retryErr?.message);
          }

          if (!retryOk) {
            // Server-side retry also failed – fall back to client-side retry signal.
            console.error("gemini: server-side retry gav ikkje 4 options – sender retry-signal til klient");
            return new Response(
              JSON.stringify({ error: "incomplete_response", retry: true, finishReason }),
              {
                status: 502,
                headers: { "Content-Type": "application/json", ...corsHeaders() },
              }
            );
          }
        }
      } catch { /* normalized er garantert gyldig JSON frå normalizeQuestionPayload */ }

      text = effectiveNorm;
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
