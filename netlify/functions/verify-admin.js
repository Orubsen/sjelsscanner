import { verifyPasswordAndCreateSession, corsHeaders, jsonResponse } from "./participant-blobs.js";

/**
 * POST /api/verify-admin
 * Body: { password: string }
 * Respons: { ok: true, token: string } ved suksess.
 *
 * K2-tiltak:
 * - Passord sendes i request-body (ikke som Authorization-header med råpassord).
 * - Rate-limiting og konstant-tid sammenligning i verifyPasswordAndCreateSession().
 * - Returnerer et kortvarig sesjonstoken — ikke råpassordet.
 */
export default async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders("POST, OPTIONS") });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, "POST, OPTIONS");
  }

  let password = "";
  try {
    const body = await request.json();
    password = String(body?.password ?? "").trim();
  } catch {
    return jsonResponse({ error: "Ugyldig forespørselskropp." }, 400, "POST, OPTIONS");
  }

  if (!password) {
    return jsonResponse({ error: "Passord mangler." }, 400, "POST, OPTIONS");
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  const result = await verifyPasswordAndCreateSession(password, ip);
  if (result.error) {
    return jsonResponse({ error: result.error }, result.status, "POST, OPTIONS");
  }

  return jsonResponse({ ok: true, token: result.token }, 200, "POST, OPTIONS");
};

export const config = {
  path: "/api/verify-admin",
};
