/** Extract first top-level JSON object using brace balancing (not greedy regex). */
export function extractJsonObject(text) {
  let jsonText = String(text || "").trim();
  const fenceMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) jsonText = fenceMatch[1].trim();

  const start = jsonText.indexOf("{");
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < jsonText.length; i++) {
    const c = jsonText[i];
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
    if (c === '"') {
      inString = true;
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return jsonText.slice(start, i + 1);
    }
  }
  return jsonText.slice(start);
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

/** Best-effort fix for truncated or slightly malformed JSON from LLMs. */
export function repairJson(str) {
  let s = closeOpenString(String(str || "").trim());
  s = s.replace(/,\s*([}\]])/g, "$1");
  s = s.replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, " ");

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
  if (openBrackets > closeBrackets) {
    s += "]".repeat(openBrackets - closeBrackets);
  }
  return s;
}

export function parseLlmJson(text) {
  const trimmed = String(text || "").trim();
  const parts = [];
  if (trimmed.startsWith("{")) parts.push(trimmed);
  const extracted = extractJsonObject(text);
  if (extracted && !parts.includes(extracted)) parts.push(extracted);
  if (!parts.length) throw new Error("No JSON object found in LLM response");

  const candidates = [];
  for (const raw of parts) {
    candidates.push(raw, repairJson(raw));
  }

  let lastErr;
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("Invalid JSON from analyst");
}

/** Parse Netlify/Vite proxy body safely (timeouts return plain text, not JSON). */
export async function parseApiResponse(response) {
  const text = await response.text();
  if (!text?.trim()) {
    throw new Error("Tomt svar fra server");
  }
  const trimmed = text.trim();
  if (
    /^TimeoutErr/i.test(trimmed) ||
    (/timeout/i.test(trimmed) && !trimmed.startsWith("{"))
  ) {
    throw new Error("Forespørselen tok for lang tid (timeout). Prøv igjen.");
  }
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) {
      const preview = trimmed.slice(0, 120).replace(/\s+/g, " ");
      throw new Error(`Ugyldig svar fra server: ${preview}`);
    }
    throw new Error(`Kunne ikke lese svar (${e.message})`);
  }
}

/** Shrink long Q&A history so later turns stay within context and JSON stays reliable. */
export function compactMessagesForApi(
  messages,
  { keepRecentPairs = 3, minLength = 6 } = {}
) {
  if (!messages?.length || messages.length <= minLength) return messages;

  const first = messages[0];
  const keepCount = Math.min(messages.length, keepRecentPairs * 2 + 2);
  const recent = messages.slice(-keepCount);
  const middle = messages.slice(1, messages.length - recent.length);

  const lines = [];
  for (let i = 0; i < middle.length; i++) {
    const m = middle[i];
    if (m.role !== "assistant") continue;
    try {
      const p = JSON.parse(m.content);
      if (p.type !== "question") continue;
      const next = middle[i + 1];
      const ans =
        next?.role === "user" && !String(next.content).startsWith("[")
          ? String(next.content).slice(0, 280)
          : "(svar)";
      lines.push(
        `Spørsmål ${p.questionNumber} [${p.category || "?"}]: ${String(p.question).slice(0, 140)} → Svar: ${ans}`
      );
      if (next?.role === "user") i++;
    } catch {
      /* skip unparseable assistant turns */
    }
  }

  if (!lines.length) return messages;

  return [
    first,
    {
      role: "user",
      content: `[KOMPERTERT HISTORIKK – ${lines.length} tidligere spørsmål/svar. Fortsett sekvensen.]\n${lines.join("\n")}`,
    },
    ...recent,
  ];
}