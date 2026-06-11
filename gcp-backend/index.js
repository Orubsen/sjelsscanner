import functions from "@google-cloud/functions-framework";

const DEFAULT_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const ANALYSIS_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    type: { type: "string", enum: ["analysis"] },
    short_summary: { type: "string" },
    overall_insight: { type: "string" },
    key_themes: { type: "array", items: { type: "string" } },
    conflicts: { type: "array", items: { type: "string" } },
    clinical_followup: { type: "string" },
    affective_temperature: {
      type: "string",
      description: "Emotional temperature across answers: kald/nøytral/varm/overopphetet + observasjon",
    },
    diagnostic_confidence: {
      type: "string",
      description: "Triangulation quality: lav/moderat/høy + begrunnelse (hvilke hypoteser er triangulert vs. enkeltobservasjoner)",
    },
    analysis: {
      type: "string",
      description: "Full psychoanalytic analysis with all 13 required ## headings (10 original + OVERFØRING OG MOTOVERFØRING, RISIKOVURDERING, RESSURSER OG MOTSTANDSKRAFT), each containing Observasjon/Tolkning/Usikkerhet blocks. Every Tolkning claim must cite [Q{n}] or be marked [strukturell hypotese]. Usikkerhet must contain a concrete limitation.",
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
  required: ["type", "short_summary", "overall_insight", "key_themes", "conflicts", "clinical_followup", "affective_temperature", "diagnostic_confidence", "analysis", "frameworks"],
};

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

function normalizeAnalysisPayload(text) {
  const trimmed = String(text || "").trim();
  try {
    return JSON.stringify(JSON.parse(trimmed));
  } catch {
    try {
      return JSON.stringify(JSON.parse(repairJson(trimmed)));
    } catch {
      return null;
    }
  }
}

functions.http("geminiBackend", async (req, res) => {
  // CORS configuration
  const origin = req.headers.origin || "*";
  res.set("Access-Control-Allow-Origin", origin);
  res.set("Access-Control-Allow-Headers", "Content-Type");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Vary", "Origin");

  if (req.method === "OPTIONS") {
    return res.status(204).send("");
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY is not configured on the server.",
    });
  }

  try {
    const handlerStart = Date.now();
    const body = req.body;
    const model = body.model || DEFAULT_MODEL;
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const generationConfig = {
      maxOutputTokens: body.max_tokens ?? 512,
      temperature: body.temperature ?? 0.7,
    };
    const useQuestionSchema = body.json_schema === "question";
    const clientQuestionCount = Number(body.question_count) || 0;
    const clientRetryAttempt = Number(body.retry_attempt) || 0;

    if (useQuestionSchema) {
      generationConfig.responseMimeType = "application/json";
      generationConfig.responseSchema = QUESTION_RESPONSE_SCHEMA;
      generationConfig.temperature = clientRetryAttempt > 0 ? 0 : 0.35;
      generationConfig.thinkingConfig = { thinkingBudget: 0 };
      generationConfig.maxOutputTokens = 1024;
    } else if (body.json_mode) {
      generationConfig.responseMimeType = "application/json";
      generationConfig.thinkingConfig = { thinkingBudget: 0 };
      // Google Cloud allows much longer executions, but we still cap at 8192 (model maximum output)
      generationConfig.maxOutputTokens = Math.min(body.max_tokens ?? 512, 8192);
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
        ? AbortSignal.timeout(240000) // 4 minutes timeout for GCP
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
      console.error("gcp-gemini: invalid JSON from Gemini API:", parseErr, "| raw:", String(rawText || "").slice(0, 500));
      return res.status(502).json({
        error: "Gemini returnerte eit ugyldig svar. Prøv igjen.",
      });
    }

    if (!response.ok) {
      const message = data?.error?.message || data?.error || `Gemini HTTP ${response.status}`;
      return res.status(response.status).json({ error: message });
    }

    const candidate = data?.candidates?.[0];
    const finishReason = candidate?.finishReason || "unknown";
    let text = candidate?.content?.parts?.map((p) => p.text).filter(Boolean).join("") || "";

    if (!text) {
      return res.status(502).json({ error: `Empty Gemini response (finish: ${finishReason})` });
    }

    text = String(text).trim()
      .replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    {
      const _first = text.indexOf("{");
      if (_first > 0) text = text.slice(_first);
      const _last = text.lastIndexOf("}");
      if (_last >= 0 && _last < text.length - 1) text = text.slice(0, _last + 1);
    }

    if (!useQuestionSchema && body.json_mode && finishReason === "MAX_TOKENS") {
      console.error("gcp-gemini: analyse trunkert (MAX_TOKENS) – sender 413 til klient for retry");
      const normalizedPartial = normalizeAnalysisPayload(text);
      return res.status(413).json({
        error: "Analysesvaret ble trunkert pga. token-grense. Prøver igjen automatisk.",
        truncated: true,
        retry: true,
        partial: normalizedPartial ? JSON.parse(normalizedPartial) : null,
        finishReason,
      });
    }

    if (useQuestionSchema) {
      let t = String(text).trim();
      const first = t.indexOf("{");
      if (first > 0) t = t.slice(first);
      const last = t.lastIndexOf("}");
      if (last >= 0) t = t.slice(0, last + 1);

      console.log("[DIAG] finishReason:", finishReason, "rawLength:", t?.length);

      const normalized = normalizeQuestionPayload(t);
      if (!normalized) {
        const looksLikeAnalysis =
          /"type"\s*:\s*"analysis"/.test(t) ||
          /"frameworks"\s*:\s*\{/.test(t) ||
          /## DOMINERENDE|## IDENTIFISERTE FORSVARSMEKANISMER/.test(t);
        if (looksLikeAnalysis) {
          return res.status(200).json({
            content: [{ type: "text", text: t }],
            finishReason,
            truncated: finishReason === "MAX_TOKENS",
          });
        }
        return res.status(502).json({
          error: "Gemini returnerte ugyldig spørsmåls-JSON. Prøv igjen (appen ber om kompakt svar).",
          finishReason,
          retry: true,
        });
      }

      let effectiveNorm = normalized;
      try {
        const parsedCheck = JSON.parse(normalized);
        if (
          parsedCheck.type === "question" &&
          (!Array.isArray(parsedCheck.options) || parsedCheck.options.length < 4)
        ) {
          console.error(
            "gcp-gemini: spørsmål manglar options – prøver server-side retry. options=",
            parsedCheck.options,
            "| raw (200 tegn):", t.slice(0, 200)
          );

          if (clientQuestionCount >= 15) {
            console.log("gcp-gemini: auto_analysis_trigger – clientQuestionCount=", clientQuestionCount);
            return res.status(200).json({
              content: [{ type: "text", text: JSON.stringify({ type: "auto_analysis_trigger", analysis_ready: true }) }],
              finishReason,
            });
          }

          const retryInstruction =
            "[CRITICAL ERROR / KRISK FEIL: options missing. Return ONE valid JSON object — same question, same questionNumber — but NOW include EXACTLY 4 non-empty concrete answer strings in the \"options\" array.]";

          const retryContents = [
            ...geminiBody.contents,
            { role: "model", parts: [{ text: t }] },
            { role: "user", parts: [{ text: retryInstruction }] },
          ];

          const retryGeminiBody = {
            ...geminiBody,
            contents: retryContents,
            generationConfig: {
              maxOutputTokens: 1024,
              temperature: 0,
              responseMimeType: "application/json",
              thinkingConfig: { thinkingBudget: 0 },
            },
          };

          const elapsed = Date.now() - handlerStart;
          const retryBudget = Math.min(25000, Math.max(5000, 55000 - elapsed));
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
                retryText = String(retryText).trim()
                  .replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
                const ri = retryText.indexOf("{");
                if (ri > 0) retryText = retryText.slice(ri);
                const rl = retryText.lastIndexOf("}");
                if (rl >= 0) retryText = retryText.slice(0, rl + 1);

                const retryNorm = normalizeQuestionPayload(retryText);
                if (retryNorm) {
                  const retryParsed = JSON.parse(retryNorm);
                  if (Array.isArray(retryParsed.options) && retryParsed.options.length >= 4) {
                    console.log("gcp-gemini: server-side retry lykkast – options OK");
                    effectiveNorm = retryNorm;
                    retryOk = true;
                  }
                }
              }
            }
          } catch (retryErr) {
            console.error("gcp-gemini: server-side retry feilet:", retryErr?.message);
          }

          if (!retryOk) {
            console.error("gcp-gemini: server-side retry feilet – sender retry-signal til klient");
            return res.status(502).json({ error: "incomplete_response", retry: true, finishReason });
          }
        }
      } catch (err) {}

      text = effectiveNorm;
    }

    return res.status(200).json({
      content: [{ type: "text", text }],
      finishReason,
      truncated: finishReason === "MAX_TOKENS",
    });
  } catch (error) {
    console.error("gcp-gemini function error:", error);
    const msg = String(error?.message || error || "Unknown error");
    const isTimeout = /timeout|aborted/i.test(msg);
    return res.status(isTimeout ? 504 : 500).json({
      error: isTimeout
        ? "Gemini tok for lang tid. Prøv igjen – appen sender nå mindre data per runde."
        : "Intern serverfeil. Prøv igjen.",
    });
  }
});
