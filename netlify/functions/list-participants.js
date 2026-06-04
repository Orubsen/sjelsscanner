import {
  checkAdminAuth,
  corsHeaders,
  getParticipantStore,
  jsonResponse,
  loadAllParticipants,
} from "./participant-blobs.js";

export default async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders("GET, OPTIONS") });
  }

  if (request.method !== "GET") {
    return jsonResponse({ error: "Method not allowed" }, 405, "GET, OPTIONS");
  }

  const authErr = checkAdminAuth(request);
  if (authErr) {
    return jsonResponse({ error: authErr.error }, authErr.status, "GET, OPTIONS");
  }

  try {
    const store = getParticipantStore();
    const participants = await loadAllParticipants(store);
    return jsonResponse(
      {
        ok: true,
        count: participants.length,
        participants,
      },
      200,
      "GET, OPTIONS"
    );
  } catch (error) {
    console.error("list-participants:", error);
    const msg = String(error?.message || error);
    return jsonResponse({ error: `Kunne ikke hente deltakere: ${msg}` }, 500, "GET, OPTIONS");
  }
};

export const config = {
  path: "/api/list-participants",
};