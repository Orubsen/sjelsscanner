import { validateParticipant } from "./participantHelpers.js";

export const ADMIN_TOKEN_KEY = "sjelsscanner_admin_token";

async function parseJsonResponse(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error(
      /timeout/i.test(text)
        ? "Forespørselen tok for lang tid."
        : "Serveren returnerte ugyldig svar."
    );
  }
}

export async function saveParticipantToServer(participant, { consent = false } = {}) {
  const check = validateParticipant(participant);
  if (!check.valid) {
    throw new Error("Ugyldige deltakeropplysninger.");
  }

  const response = await fetch("/api/save-participant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...check.normalized,
      consent: Boolean(consent),
    }),
  });

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(data?.error || `Lagring feilet (HTTP ${response.status})`);
  }

  if (!data?.ok || !data?.id) {
    throw new Error("Lagring feilet (manglende bekreftelse fra server).");
  }

  return { id: data.id, participant: check.normalized };
}

export async function markParticipantAnalysisComplete(participantId, questionCount) {
  if (!participantId) return;
  try {
    const response = await fetch("/api/complete-participant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: participantId, questionCount }),
    });
    await parseJsonResponse(response);
  } catch (e) {
    console.warn("Kunne ikke markere fullført analyse:", e);
  }
}

export async function verifyAdminPassword(password) {
  const response = await fetch("/api/verify-admin", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${password}`,
    },
    body: JSON.stringify({}),
  });
  const data = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(data?.error || "Feil passord eller ingen tilgang.");
  }
  return true;
}

export async function fetchParticipantsList(adminToken) {
  const response = await fetch("/api/list-participants", {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const data = await parseJsonResponse(response);
  if (!response.ok) {
    throw new Error(data?.error || `Kunne ikke hente liste (HTTP ${response.status})`);
  }
  return data.participants || [];
}

export function participantsToCsv(rows) {
  const header = ["id", "navn", "alder", "e-post", "registrert", "fullført", "fullført_dato", "samtykke"];
  const escape = (v) => {
    const s = String(v ?? "");
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        r.id,
        r.name,
        r.age,
        r.email,
        r.createdAt,
        r.analysisCompleted ? "ja" : "nei",
        r.analysisCompletedAt || "",
        r.consent ? "ja" : "nei",
      ]
        .map(escape)
        .join(",")
    ),
  ];
  return lines.join("\r\n");
}

export function downloadCsv(filename, csvText) {
  const blob = new Blob(["\uFEFF" + csvText], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}