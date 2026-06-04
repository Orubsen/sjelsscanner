const DEFAULT_MODEL = "gemini-3.5-flash";

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
  // Gemini requires the first turn to be from the user
  if (contents.length && contents[0].role !== "user") {
    contents.unshift({ role: "user", parts: [{ text: "(session continues)" }] });
  }
  return contents;
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
    if (body.json_mode) {
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
        ? AbortSignal.timeout(55000)
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
    const text =
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

    // Anthropic-shaped envelope so App.jsx parsing stays unchanged
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