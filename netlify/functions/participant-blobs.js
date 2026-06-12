import crypto from "crypto";
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
// K2 – Persistent rate-limiting med Netlify Blobs (motvirker brute-force)
// ---------------------------------------------------------------------------

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

async function checkRateLimit(ip) {
  const store = getParticipantStore();
  const now = Date.now();
  let entry = null;
  try {
    entry = await store.get("ratelimit-" + ip, { type: "json" });
  } catch (_) {}
  if (!entry) return null;
  if (now < entry.lockUntil) {
    const secsLeft = Math.ceil((entry.lockUntil - now) / 1000);
    return {
      error: "For mange forsøk. Prøv igjen om " + secsLeft + " sekunder.",
      status: 429,
    };
  }
  return null;
}

async function recordFailedAttempt(ip) {
  const store = getParticipantStore();
  const now = Date.now();
  let entry = null;
  try {
    entry = await store.get("ratelimit-" + ip, { type: "json" });
  } catch (_) {}
  if (!entry) {
    entry = { attempts: 0, lockUntil: 0 };
  }
  entry.attempts += 1;
  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.lockUntil = now + LOCKOUT_MS;
    entry.attempts = 0;
  }
  try {
    await store.set("ratelimit-" + ip, JSON.stringify(entry));
  } catch (_) {}
}

async function clearRateLimit(ip) {
  const store = getParticipantStore();
  try {
    await store.delete("ratelimit-" + ip);
  } catch (_) {}
}

// ---------------------------------------------------------------------------
// K2 – Statisk signering av JWT-lignende sesjonstoken (stateless)
// ---------------------------------------------------------------------------

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function signToken(payload, secret) {
  const payloadStr = JSON.stringify(payload);
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payloadStr);
  const signature = hmac.digest("base64url");
  return Buffer.from(payloadStr).toString("base64url") + "." + signature;
}

function verifyToken(token, secret) {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const payloadStr = Buffer.from(parts[0], "base64url").toString("utf8");
    const signature = parts[1];
    
    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(payloadStr);
    const expectedSignature = hmac.digest("base64url");
    
    if (!timingSafeEqual(signature, expectedSignature)) {
      return null;
    }
    
    return JSON.parse(payloadStr);
  } catch (e) {
    return null;
  }
}

function createSessionToken() {
  const secret = process.env.JWT_SECRET || process.env.PARTICIPANT_ADMIN_SECRET || "default_jwt_fallback_secret_key";
  const payload = { expires: Date.now() + SESSION_TTL_MS };
  return signToken(payload, secret);
}

function isValidSessionToken(token) {
  const secret = process.env.JWT_SECRET || process.env.PARTICIPANT_ADMIN_SECRET || "default_jwt_fallback_secret_key";
  const payload = verifyToken(token, secret);
  if (!payload) return false;
  return Date.now() <= payload.expires;
}

// ---------------------------------------------------------------------------
// K2 – Verifiser passord og utsted token (brukes av verify-admin.js)
// ---------------------------------------------------------------------------

export async function verifyPasswordAndCreateSession(providedPassword, ip) {
  const secret = process.env.PARTICIPANT_ADMIN_SECRET;
  if (!secret) {
    return { error: "Admin er ikke konfigurert (PARTICIPANT_ADMIN_SECRET).", status: 503 };
  }

  const rateLimitErr = await checkRateLimit(ip);
  if (rateLimitErr) return rateLimitErr;

  if (!providedPassword || !timingSafeEqual(providedPassword, secret)) {
    await recordFailedAttempt(ip);
    return { error: "Ugyldig passord.", status: 401 };
  }

  await clearRateLimit(ip);
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

export async function addParticipantToIndex(store, participant) {
  try {
    let index = await store.get("_index", { type: "json" });
    if (!Array.isArray(index)) index = [];
    index = index.filter((p) => p.id !== participant.id);
    index.push({
      id: participant.id,
      name: participant.name,
      age: participant.age,
      email: participant.email,
      createdAt: participant.createdAt,
      analysisCompleted: participant.analysisCompleted,
      analysisCompletedAt: participant.analysisCompletedAt,
    });
    await store.setJSON("_index", index);
  } catch (e) {
    console.error("Index update failed:", e);
  }
}

export async function updateParticipantInIndex(store, id, completedAt) {
  try {
    let index = await store.get("_index", { type: "json" });
    if (Array.isArray(index)) {
      const item = index.find((p) => p.id === id);
      if (item) {
        item.analysisCompleted = true;
        item.analysisCompletedAt = completedAt;
        await store.setJSON("_index", index);
      }
    }
  } catch (e) {
    console.error("Index complete update failed:", e);
  }
}

export async function loadAllParticipants(store) {
  try {
    const index = await store.get("_index", { type: "json" });
    if (Array.isArray(index)) {
      return index.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
  } catch (_) {}

  // Fallback: If index is missing or corrupted, scan blobs in parallel
  const { blobs } = await store.list();
  const keys = blobs.map((b) => b.key).filter((k) => k !== "_index");
  if (keys.length === 0) return [];

  const participants = await Promise.all(
    keys.map(async (key) => {
      try {
        return await store.get(key, { type: "json" });
      } catch (_) {
        return null;
      }
    })
  );

  const list = participants.filter(Boolean);

  // Self-heal: Write new index
  try {
    const indexData = list.map((p) => ({
      id: p.id,
      name: p.name,
      age: p.age,
      email: p.email,
      createdAt: p.createdAt,
      analysisCompleted: p.analysisCompleted,
      analysisCompletedAt: p.analysisCompletedAt,
    }));
    await store.setJSON("_index", indexData);
  } catch (_) {}

  return list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}
