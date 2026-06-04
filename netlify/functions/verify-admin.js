import { checkAdminAuth, corsHeaders, jsonResponse } from "./participant-blobs.js";

/** Lightweight login check — same secret as list-participants. */
export default async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders("POST, OPTIONS") });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, "POST, OPTIONS");
  }

  const authErr = checkAdminAuth(request);
  if (authErr) {
    return jsonResponse({ error: authErr.error }, authErr.status, "POST, OPTIONS");
  }

  return jsonResponse({ ok: true }, 200, "POST, OPTIONS");
};

export const config = {
  path: "/api/verify-admin",
};