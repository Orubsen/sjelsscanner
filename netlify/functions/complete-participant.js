import {
  corsHeaders,
  getParticipantStore,
  jsonResponse,
} from "./participant-blobs.js";

export default async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders("POST, OPTIONS") });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, "POST, OPTIONS");
  }

  try {
    const body = await request.json();
    const id = String(body?.id ?? "").trim();
    if (!id) {
      return jsonResponse({ error: "Mangler deltaker-id." }, 400, "POST, OPTIONS");
    }

    const store = getParticipantStore();
    const entry = await store.get(id, { type: "json" });
    if (!entry) {
      return jsonResponse({ error: "Deltaker ikke funnet." }, 404, "POST, OPTIONS");
    }

    const updated = {
      ...entry,
      analysisCompleted: true,
      analysisCompletedAt: new Date().toISOString(),
      lastQuestionCount: body.questionCount ?? entry.lastQuestionCount ?? null,
    };

    await store.setJSON(id, updated);

    const index = (await store.get("_index", { type: "json" })) ?? [];
    const nextIndex = index.map((row) =>
      row?.id === id
        ? { ...row, analysisCompleted: true, analysisCompletedAt: updated.analysisCompletedAt }
        : row
    );
    await store.setJSON("_index", nextIndex);

    return jsonResponse({ ok: true, id }, 200, "POST, OPTIONS");
  } catch (error) {
    console.error("complete-participant:", error);
    return jsonResponse(
      { error: `Kunne ikke oppdatere deltaker: ${error?.message || error}` },
      500,
      "POST, OPTIONS"
    );
  }
};

export const config = {
  path: "/api/complete-participant",
};