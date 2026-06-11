import {
  corsHeaders,
  getParticipantStore,
  jsonResponse,
  addParticipantToIndex,
} from "./participant-blobs.js";

const MIN_AGE = 16;
const MAX_AGE = 99;

function validateBody(body) {
  const name = String(body?.name ?? "").trim();
  const age = parseInt(String(body?.age ?? "").trim(), 10);
  const email = String(body?.email ?? "").trim().toLowerCase();

  if (name.length < 2) return { error: "Navn må ha minst 2 tegn." };
  if (!Number.isFinite(age) || age < MIN_AGE || age > MAX_AGE) {
    return { error: `Alder må være ${MIN_AGE}–${MAX_AGE}.` };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Ugyldig e-postadresse." };
  }
  if (!body?.consent) {
    return { error: "Samtykke til lagring er påkrevd." };
  }

  return {
    record: {
      name,
      age,
      email,
      consent: true,
      consentAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      source: "sjelsscanner",
      analysisCompleted: false,
      analysisCompletedAt: null,
    },
  };
}

export default async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders("POST, OPTIONS") });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await request.json();
    const validated = validateBody(body);
    if (validated.error) {
      return jsonResponse({ error: validated.error }, 400);
    }

    const id = crypto.randomUUID();
    const store = getParticipantStore();
    const entry = { id, ...validated.record };

    // V1 – Atomic: skriv kun til deltakernes egen blob-nøkkel.
    // Ingen _index-blob — eliminerer race condition ved samtidige registreringer.
    await store.setJSON(id, entry);
    await addParticipantToIndex(store, entry);

    return jsonResponse({ ok: true, id });
  } catch (error) {
    console.error("save-participant:", error);
    const msg = String(error?.message || error);
    const blobsMissing = /blob|store|not configured/i.test(msg);
    return jsonResponse(
      {
        error: blobsMissing
          ? "Lagring er ikke aktivert på Netlify (Blobs). Aktiver Netlify Blobs for nettstedet, eller kjør via netlify dev."
          : `Kunne ikke lagre deltaker: ${msg}`,
      },
      500
    );
  }
};

export const config = {
  path: "/api/save-participant",
};