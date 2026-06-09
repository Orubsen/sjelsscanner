import { getStore } from "@netlify/blobs";

export const STORE_NAME = "sjelsscanner-participants";

export function getParticipantStore() {
  return getStore(STORE_NAME);
}

// ---------------------------------------------------------------------------
// K3 – CORS låst til eget domene i produksjon
// ---------------------------------------------------------------------------

/**
 * Returner tillatt origin.
 * - Lokalt (netlify dev): process.env.CONTEXT === "dev" → "*" for å ikke bremse utvikling.
 * - Produksjon / deploy-preview: låst til primær URL.
 *   Sett ALLOWED_ORIGIN i Netlify-miljøvariabler dersom domenet endres.
 */
function getAllowedOrigin() {
  if (process.env.CONTEXT === "dev") return "*";
  return process.env.ALLOWED_ORIGIN || "https://kjernekoden.netlify.app";
}

export function corsHeaders(methods = "GET, POST, OPTIONS") {
  return {
    "Access-Control-Allow-Origin": getAllowedOrigin(),
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": methods,
    "Vary": "Origin",
  };
}

export function jsonResponse(body, status = 200, methods) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders(methods) },
  });
}

// ---------------------------------------------------------------------------
// K2 – Konstant-tid strengsammenligning (motvirker timing-angrep)
// ---------------------------------------------------------------------------

function timingSafeEqual(a, b) {
  const enc = new TextEncoder();
  const aBytes = enc.encode(String(a));
  const bBytes = enc.encode(String(b));
  const maxLen = Math.max(aBytes.length, bBytes.length);
  let result = aBytes.length === bBytes.length ? 0 : 1;
  for (let i = 0; i < maxLen; i++) {
    result |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
  }
  return result === 0;
}

// ---------------------------------------------------------------------------
// K2 – In-memory rate-limiting (per IP, per funksjonsinstans)
// ---------------------------------------------------------------------------

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

const rateLimitMap = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { attempts: 0, lockUntil: 0 };
  if (now < entry.lockUntil) {
    const secsLeft = Math.ceil((entry.lockUntil - now) / 1000);
    return {
      error: "For mange forsøk. Prøv igjen om " + secsLeft + " sekunder.",
      status: 429,
    };
  }
  return null;
}

function recordFailedAttempt(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { attempts: 0, lockUntil: 0 };
  entry.attempts += 1;
  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.lockUntil = now + LOCKOUT_MS;
    entry.attempts = 0;
  }
  rateLimitMap.set(ip, entry);
}

function clearRateLimit(ip) {
  rateLimitMap.delete(ip);
}

// ---------------------------------------------------------------------------
// K2 – In-memory sesjonstoken-butikk
// ---------------------------------------------------------------------------

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const sessionStore = new Map();

function createSessionToken() {
  const token = crypto.randomUUID() + "-" + crypto.randomUUID();
  sessionStore.set(token, { expires: Date.now() + SESSION_TTL_MS });
  return token;
}

function isValidSessionToken(token) {
  const session = sessionStore.get(token);
  if (!session) return false;
  if (Date.now() > session.expires) {
    sessionStore.delete(token);
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// K2 – Verifiser passord og utsted token (brukes av verify-admin.js)
// ---------------------------------------------------------------------------

export function verifyPasswordAndCreateSession(providedPassword, ip) {
  const secret = process.env.PARTICIPANT_ADMIN_SECRET;
  if (!secret) {
    return { error: "Admin er ikke konfigurert (PARTICIPANT_ADMIN_SECRET).", status: 503 };
  }

  const rateLimitErr = checkRateLimit(ip);
  if (rateLimitErr) return rateLimitErr;

  if (!providedPassword || !timingSafeEqual(providedPassword, secret)) {
    recordFailedAttempt(ip);
    return { error: "Ugyldig passord.", status: 401 };
  }

  clearRateLimit(ip);
  return { token: createSessionToken() };
}

// ---------------------------------------------------------------------------
// K2 – Sjekk sesjonstoken (brukes av list-participants.js og andre)
// ---------------------------------------------------------------------------

export function checkAdminAuth(request) {
  const auth = request.headers.get("Authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || !isValidSessionToken(token)) {
    return { error: "Ugyldig eller utløpt sesjon. Logg inn på nytt.", status: 401 };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Deltaker-datalag (uendret)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// V1 – Ingen _index-blob. Iterer blob-nøkler direkte for å unngå race condition.
// ---------------------------------------------------------------------------

export async function loadAllParticipants(store) {
  // List alle nøkler i butikken. Filtrerer bort legacy "_index"-nøkkelen
  // slik at eventuelle gamle data ikke forstyrrer.
  const { blobs } = await store.list();
  const keys = blobs
    .map((b) => b.key)
    .filter((k) => k !== "_index");

  if (keys.length === 0) return [];

  const participants = await Promise.all(
    keys.map(async (key) => {
      const entry = await store.get(key, { type: "json" });
      return entry || null;
    })
  );

  return participants
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}
