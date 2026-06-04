import { getStore } from "@netlify/blobs";

export const STORE_NAME = "sjelsscanner-participants";

export function getParticipantStore() {
  return getStore(STORE_NAME);
}

export function corsHeaders(methods = "GET, POST, OPTIONS") {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": methods,
  };
}

export function jsonResponse(body, status = 200, methods) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(methods) },
  });
}

export function checkAdminAuth(request) {
  const secret = process.env.PARTICIPANT_ADMIN_SECRET;
  if (!secret) {
    return { error: "Admin er ikke konfigurert (PARTICIPANT_ADMIN_SECRET).", status: 503 };
  }
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || token !== secret) {
    return { error: "Ugyldig eller manglende admin-passord.", status: 401 };
  }
  return null;
}

export async function loadAllParticipants(store) {
  const index = (await store.get("_index", { type: "json" })) ?? [];
  const ordered = [...index].reverse();
  const participants = await Promise.all(
    ordered.map(async (row) => {
      const id = row?.id || row;
      if (!id || id === "_index") return null;
      const entry = await store.get(String(id), { type: "json" });
      return entry || { id: String(id) };
    })
  );
  return participants.filter(Boolean);
}