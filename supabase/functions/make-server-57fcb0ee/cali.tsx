/**
 * BOTB Calisthenics — Backend Module (Slice 1: Auth Gate)
 * ========================================================
 *
 * SCOPE OF THIS SLICE:
 *   - HBAR-gated wallet authentication for the /calisthenics tab
 *   - Reuses admin-auth's mirror-node, rate-limit, signature, and sanitization
 *     helpers verbatim — no duplicated crypto code
 *   - Stateless HMAC session token (revocable by deleting the eligibility KV
 *     key OR rotating BOTB_HASH_SALT)
 *
 * GATE REQUIREMENTS (all enforced server-side, never trusted from client):
 *   1. Wallet ID matches Hedera account-ID format
 *   2. Wallet exists on Hedera mainnet (mirror node)
 *   3. Wallet HBAR balance >= MIN_HBAR_TINYBARS (1 HBAR = 100_000_000 tinybars)
 *   4. Wallet signed a fresh, single-use challenge nonce via WalletConnect
 *   5. Signature payload is non-trivially long (proves wallet UI approval)
 *   6. (Post-launch when BOTB_TOKEN_ID is set) Full ED25519 crypto verify
 *
 * RATE LIMITS (sliding window, dual-layer per admin-auth.tsx):
 *   - /cali/challenge       : 10 / wallet / min,  60 / IP / min
 *   - /cali/verify          :  5 / wallet / min
 *   - /cali/session/refresh : 12 / wallet / hour
 *
 * KEY NAMESPACE in kv_store_57fcb0ee:
 *   cali:nonce:<nonce>           short-lived challenge record (5 min TTL marker)
 *   cali:eligible:<accountId>    { balance, checkedAt, expiresAt } — 24h TTL
 *   cali:rl:<key>:<window>       rate-limit counters (delegated to admin-auth)
 *
 * SESSION TOKEN FORMAT:
 *   v1.<b64url(accountId)>.<exp>.<b64url(hmac)>
 *   HMAC = HMAC-SHA256(secret, `cali|${accountId}|${exp}`)
 *   Verified by recomputation — no server-side session table needed for the
 *   token itself; the eligibility KV key is the revocable layer.
 *
 *   IMPORTANT: Token is sent via the `X-Cali-Session` header, NOT
 *   `Authorization`. The Authorization header must remain `Bearer <anonKey>`
 *   for Supabase's edge-function gateway to accept the request at all. This
 *   matches the X-Admin-Session pattern used everywhere else in this server.
 *
 * FUTURE SLICES (NOT IN THIS FILE YET):
 *   - Exercise library + workout generator
 *   - Logging, PR, streak routes
 *   - History/PR query routes
 *   - Anchor stubs + (later) HCS shared-topic anchoring
 */

import type { Context, Next } from "npm:hono";
import type { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";
import {
  isValidHederaAccountId,
  verifyWalletOnMirrorNode,
  checkRateLimit,
  sanitizeString,
  verifyVoteSignature,
  requireAdminSession,
  validateSession,
} from "./admin-auth.tsx";
import {
  buildWorkoutPlan,
  exerciseIdsOfPlan,
  type WorkoutPlan,
  type CaliEquipment as GenEquipment,
  type CaliLevel as GenLevel,
} from "./cali_generator.tsx";
import {
  LIBRARY_VERSION,
  EXERCISES,
  getLiveExercises,
  getLiveExercise,
  applyExerciseOverride,
  loadAddedExercises,
  mergeExercises,
  type ExerciseOverride,
} from "./cali_library.tsx";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** 1 HBAR in tinybars — gate threshold (per product spec, stricter than dust). */
const MIN_HBAR_TINYBARS = 100_000_000;

/** Challenge nonce TTL — mirrors admin-auth (5 min). */
const CALI_CHALLENGE_TTL_MS = 5 * 60 * 1000;

/** Eligibility cache TTL — 24h. Re-checked on refresh or on first sensitive write. */
const CALI_ELIGIBILITY_TTL_MS = 24 * 60 * 60 * 1000;

/** Stateless session token TTL — 24h, refreshable. */
const CALI_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

/** Mirror node balance cache TTL (in-memory layer). */
const BALANCE_INMEM_TTL_MS = 10 * 1000;
/** Mirror node balance cache TTL (KV layer). */
const BALANCE_KV_TTL_MS = 60 * 1000;

const MIRROR_NODE_URL = "https://mainnet.mirrornode.hedera.com";

/**
 * Mirrors the platform-wide HEADCOUNT_MODE flag used in admin-auth + index.tsx.
 * Pre-token-launch, the same ECDSA/HashPack signature bypass logic applies here
 * because the gate's other layers (mirror node + balance + nonce + non-empty
 * sig + rate limits) remain enforced.
 */
const HEADCOUNT_MODE = !Deno.env.get("BOTB_TOKEN_ID");

// ---------------------------------------------------------------------------
// Fail-closed HMAC secret resolver (local copy of index.tsx's getHashSecret)
// ---------------------------------------------------------------------------
//
// Duplicated here rather than imported so this module has no inbound dependency
// on index.tsx (avoids circular imports as cali grows). The resolver behavior
// MUST match getHashSecret() in index.tsx exactly — both prefer BOTB_HASH_SALT
// and reject if the secret is missing or too short.
function getCaliHashSecret(): string {
  const secret =
    Deno.env.get("BOTB_HASH_SALT") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret || secret.length < 16) {
    throw new Error(
      "Cali hash secret unavailable: set BOTB_HASH_SALT (preferred) or SUPABASE_SERVICE_ROLE_KEY (>=16 chars)",
    );
  }
  return secret;
}

// ---------------------------------------------------------------------------
// Low-level primitives
// ---------------------------------------------------------------------------

function now(): number {
  return Date.now();
}

function generateNonce(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

// --- Calisthenics live ops counters (sign-ins + generated totals for admin panel + ops console) ---
async function incrCaliSignin() {
  try {
    const day = new Date().toISOString().slice(0, 10);
    const dkey = `cali:signin:d:${day}`;
    const tkey = `cali:signin:total`;
    const [dval, tval] = await Promise.all([kv.get(dkey), kv.get(tkey)]);
    await Promise.all([
      kv.set(dkey, Number(dval || 0) + 1),
      kv.set(tkey, Number(tval || 0) + 1),
    ]);
  } catch (e) {
    console.log("[CALI] signin counter incr non-fatal:", e);
  }
}

async function incrCaliWorkoutGenerated() {
  try {
    const day = new Date().toISOString().slice(0, 10);
    const dkey = `cali:gen:d:${day}`;
    const tkey = `cali:gen:total`;
    const [dval, tval] = await Promise.all([kv.get(dkey), kv.get(tkey)]);
    await Promise.all([
      kv.set(dkey, Number(dval || 0) + 1),
      kv.set(tkey, Number(tval || 0) + 1),
    ]);
  } catch (e) {
    console.log("[CALI] gen counter incr non-fatal:", e);
  }
}

/** base64url encode without padding — URL/header-safe. */
function b64url(input: Uint8Array | string): string {
  const bytes =
    typeof input === "string" ? new TextEncoder().encode(input) : input;
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(input: string): Uint8Array {
  const pad = "=".repeat((4 - (input.length % 4)) % 4);
  const b64 = (input + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

async function hmacSha256(secret: string, message: string): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return new Uint8Array(sig);
}

/** Constant-time byte comparison — prevents timing oracle on the HMAC tag. */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

// ---------------------------------------------------------------------------
// Mirror Node — HBAR balance lookup with dual-layer cache
// ---------------------------------------------------------------------------

interface BalanceCacheEntry {
  tinybars: number;
  expiresAt: number;
}
const balanceMemCache = new Map<string, BalanceCacheEntry>();

/**
 * Fetch an account's HBAR balance from the Hedera mainnet mirror node.
 * Returns tinybars (integer). Throws on hard failure so the caller can map
 * to a 502 — we intentionally do NOT fall back to 0 (which would block a
 * legitimate user) nor to "any number" (which would let an attacker pass the
 * gate by stalling the mirror node).
 *
 * CACHE: 10s in-memory + 60s KV. KV-layer survives isolate cold starts.
 */
async function getAccountBalanceTinybars(accountId: string): Promise<number> {
  // Layer 1: in-memory
  const memHit = balanceMemCache.get(accountId);
  if (memHit && memHit.expiresAt > now()) return memHit.tinybars;

  // Layer 2: KV
  const kvKey = `cali:balcache:${accountId}`;
  try {
    const kvHit: any = await kv.get(kvKey);
    if (kvHit && typeof kvHit.tinybars === "number" && kvHit.expiresAt > now()) {
      balanceMemCache.set(accountId, {
        tinybars: kvHit.tinybars,
        expiresAt: now() + BALANCE_INMEM_TTL_MS,
      });
      return kvHit.tinybars;
    }
  } catch (err) {
    console.log(`[CALI-BAL] KV cache read error for ${accountId}: ${err}`);
  }

  // Layer 3: Mirror node (authoritative)
  let res: Response;
  try {
    res = await fetch(`${MIRROR_NODE_URL}/api/v1/accounts/${accountId}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(3000),
    });
  } catch (err) {
    console.log(`[CALI-BAL] Mirror node fetch error for ${accountId}: ${err}`);
    throw new Error(`Mirror node unreachable for ${accountId}: ${err}`);
  }

  if (!res.ok) {
    console.log(`[CALI-BAL] Mirror node returned ${res.status} for ${accountId}`);
    throw new Error(`Mirror node returned ${res.status} for ${accountId}`);
  }

  const data = await res.json();
  const tinybars = Number(data?.balance?.balance);
  if (!Number.isFinite(tinybars) || tinybars < 0) {
    console.log(`[CALI-BAL] Invalid balance payload for ${accountId}: ${JSON.stringify(data?.balance)}`);
    throw new Error(`Invalid balance payload for ${accountId}`);
  }

  // Populate both caches
  const memExpiresAt = now() + BALANCE_INMEM_TTL_MS;
  const kvExpiresAt = now() + BALANCE_KV_TTL_MS;
  balanceMemCache.set(accountId, { tinybars, expiresAt: memExpiresAt });
  try {
    await kv.set(kvKey, { tinybars, expiresAt: kvExpiresAt });
  } catch (err) {
    console.log(`[CALI-BAL] KV cache write error for ${accountId}: ${err}`);
  }

  return tinybars;
}

// ---------------------------------------------------------------------------
// Session tokens (stateless HMAC)
// ---------------------------------------------------------------------------

interface CaliSessionPayload {
  accountId: string;
  exp: number;
}

async function issueSessionToken(accountId: string): Promise<{ token: string; exp: number }> {
  const secret = getCaliHashSecret();
  const exp = now() + CALI_SESSION_TTL_MS;
  const payloadStr = `cali|${accountId}|${exp}`;
  const tag = await hmacSha256(secret, payloadStr);
  const token = `v1.${b64url(accountId)}.${exp}.${b64url(tag)}`;
  return { token, exp };
}

async function verifySessionToken(token: string): Promise<CaliSessionPayload | null> {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return null;

  let accountId: string;
  let exp: number;
  let providedTag: Uint8Array;
  try {
    accountId = new TextDecoder().decode(b64urlDecode(parts[1]));
    exp = Number(parts[2]);
    providedTag = b64urlDecode(parts[3]);
  } catch {
    return null;
  }

  if (!isValidHederaAccountId(accountId)) return null;
  if (!Number.isFinite(exp) || exp < now()) return null;

  let secret: string;
  try {
    secret = getCaliHashSecret();
  } catch {
    return null;
  }
  const expectedTag = await hmacSha256(secret, `cali|${accountId}|${exp}`);
  if (!constantTimeEqual(providedTag, expectedTag)) return null;

  return { accountId, exp };
}

// ---------------------------------------------------------------------------
// Eligibility cache (server-side authoritative)
// ---------------------------------------------------------------------------

interface EligibilityRecord {
  accountId: string;
  tinybars: number;
  checkedAt: number;
  expiresAt: number;
}

async function setEligibility(accountId: string, tinybars: number): Promise<EligibilityRecord> {
  const record: EligibilityRecord = {
    accountId,
    tinybars,
    checkedAt: now(),
    expiresAt: now() + CALI_ELIGIBILITY_TTL_MS,
  };
  await kv.set(`cali:eligible:${accountId}`, record);
  return record;
}

async function getEligibility(accountId: string): Promise<EligibilityRecord | null> {
  try {
    const rec: any = await kv.get(`cali:eligible:${accountId}`);
    if (!rec || typeof rec.expiresAt !== "number") return null;
    if (rec.expiresAt < now()) return null;
    if (rec.accountId !== accountId) return null;
    return rec as EligibilityRecord;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Hono middleware
// ---------------------------------------------------------------------------

/**
 * requireCaliSession — Bearer token + live eligibility check.
 *
 * Reads `Authorization: Bearer <token>`. Validates HMAC tag, expiry,
 * AND that the wallet still has an unexpired eligibility record in KV.
 * Either failing the HMAC (expired/tampered) OR a missing/expired
 * eligibility record results in 401. The eligibility record is the
 * revocable layer — deleting it forces the user to re-verify HBAR balance.
 */
export async function requireCaliSession(c: Context, next: Next) {
  // Read from X-Cali-Session header (not Authorization — that stays the
  // Supabase anon key so the edge-function gateway routes the request).
  const token = (c.req.header("X-Cali-Session") || "").trim();

  const payload = await verifySessionToken(token);
  if (!payload) {
    return c.json(
      {
        success: false,
        error: "Calisthenics session token missing, expired, or invalid. Reconnect your wallet and re-verify.",
        code: "CALI_SESSION_REQUIRED",
      },
      401,
    );
  }

  const eligibility = await getEligibility(payload.accountId);
  if (!eligibility) {
    return c.json(
      {
        success: false,
        error: "Eligibility record expired or revoked. Re-verify your wallet to continue.",
        code: "CALI_ELIGIBILITY_EXPIRED",
      },
      401,
    );
  }

  c.set("caliAccountId", payload.accountId);
  c.set("caliEligibility", eligibility);
  await next();
}

// ---------------------------------------------------------------------------
// IP helper for per-IP rate limiting (matches existing index.tsx pattern)
// ---------------------------------------------------------------------------

function getClientIp(c: Context): string {
  const xf = c.req.header("X-Forwarded-For") || "";
  const ip = xf.split(",")[0].trim();
  return ip || c.req.header("CF-Connecting-IP") || c.req.header("X-Real-IP") || "unknown";
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/**
 * Mount Calisthenics auth-gate routes on the main Hono app.
 *
 * Called once from index.tsx after the global rate limit + CORS middleware:
 *   mountCaliRoutes(app, PREFIX);
 *
 * All routes are nested under `${PREFIX}/cali/...` so they inherit the
 * platform-wide CORS, logger, and per-prefix rate limiting already in place.
 */
export function mountCaliRoutes(app: Hono, PREFIX: string) {
  // ─────────────────────────────────────────────────────────────────────────
  // POST /cali/challenge — issue a challenge nonce for the wallet to sign
  // ─────────────────────────────────────────────────────────────────────────
  app.post(`${PREFIX}/cali/challenge`, async (c) => {
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ success: false, error: "Invalid JSON body" }, 400);
    }

    const accountId = sanitizeString(body?.accountId, 32);
    if (!isValidHederaAccountId(accountId)) {
      return c.json(
        { success: false, error: "Invalid Hedera account ID format" },
        400,
      );
    }

    // Per-wallet rate limit (10 / min) + per-IP rate limit (60 / min)
    const ip = getClientIp(c);
    const walletRl = await checkRateLimit(`cali-chal-w:${accountId}`, 10, 60_000);
    if (walletRl.limited) {
      return c.json(
        {
          success: false,
          error: "Too many challenge requests for this wallet. Slow down.",
          code: "RATE_LIMITED",
          retryAfter: walletRl.retryAfter,
        },
        { status: 429, headers: { "Retry-After": String(walletRl.retryAfter || 5) } },
      );
    }
    const ipRl = await checkRateLimit(`cali-chal-ip:${ip}`, 60, 60_000);
    if (ipRl.limited) {
      return c.json(
        {
          success: false,
          error: "Too many challenge requests from this network. Slow down.",
          code: "RATE_LIMITED",
          retryAfter: ipRl.retryAfter,
        },
        { status: 429, headers: { "Retry-After": String(ipRl.retryAfter || 5) } },
      );
    }

    // Mint a fresh nonce + challenge string
    const nonce = generateNonce();
    const issuedAt = new Date().toISOString();
    const expiresAt = now() + CALI_CHALLENGE_TTL_MS;
    const challenge =
      `BOTB-CALI-AUTH\n` +
      `Wallet: ${accountId}\n` +
      `Nonce: ${nonce}\n` +
      `Timestamp: ${issuedAt}\n` +
      `Action: Verify HBAR holder for free workout access\n` +
      `Expires: 5 minutes`;

    try {
      await kv.set(`cali:nonce:${nonce}`, {
        nonce,
        accountId,
        challenge,
        createdAt: now(),
        expiresAt,
      });
    } catch (err) {
      console.log(`[CALI-CHAL] KV write failed for nonce: ${err}`);
      return c.json({ success: false, error: "Failed to issue challenge — try again" }, 503);
    }

    console.log(`[CALI-CHAL] Issued challenge for ${accountId} (nonce=${nonce.slice(0, 12)}…)`);
    return c.json({
      success: true,
      data: { challenge, nonce, expiresAt },
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /cali/verify — verify signature, check HBAR balance, issue session
  // ─────────────────────────────────────────────────────────────────────────
  app.post(`${PREFIX}/cali/verify`, async (c) => {
    let body: any;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ success: false, error: "Invalid JSON body" }, 400);
    }

    const accountId = sanitizeString(body?.accountId, 32);
    const nonce = sanitizeString(body?.nonce, 128);
    // Signature is opaque base64 (HIP-820 SignatureMap) — don't strip
    const signature = typeof body?.signature === "string" ? body.signature : "";

    if (!isValidHederaAccountId(accountId)) {
      return c.json({ success: false, error: "Invalid Hedera account ID format" }, 400);
    }
    if (!nonce || nonce.length < 32) {
      return c.json({ success: false, error: "Missing or malformed nonce" }, 400);
    }
    if (!signature || signature.length < 16) {
      return c.json(
        {
          success: false,
          error: "Signature missing — please approve the request in HashPack and retry",
        },
        400,
      );
    }

    // Per-wallet rate limit (5 / min)
    const rl = await checkRateLimit(`cali-verify-w:${accountId}`, 5, 60_000);
    if (rl.limited) {
      return c.json(
        {
          success: false,
          error: "Too many verification attempts. Wait a minute and try again.",
          code: "RATE_LIMITED",
          retryAfter: rl.retryAfter,
        },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter || 5) } },
      );
    }

    // 1. Challenge nonce must exist, match wallet, and be unexpired
    let challengeRec: any;
    try {
      challengeRec = await kv.get(`cali:nonce:${nonce}`);
    } catch (err) {
      console.log(`[CALI-VERIFY] KV nonce read failed: ${err}`);
      return c.json({ success: false, error: "Verification storage unavailable" }, 503);
    }

    if (!challengeRec) {
      return c.json(
        { success: false, error: "Challenge not found or already consumed. Start over." },
        400,
      );
    }
    if (challengeRec.accountId !== accountId) {
      console.log(
        `[CALI-VERIFY] Nonce/wallet mismatch — nonce belongs to ${challengeRec.accountId}, request claims ${accountId}`,
      );
      // Don't reveal the real owner — generic error
      return c.json({ success: false, error: "Challenge does not match this wallet" }, 400);
    }
    if (challengeRec.expiresAt < now()) {
      await kv.del(`cali:nonce:${nonce}`).catch(() => {});
      return c.json({ success: false, error: "Challenge expired — request a new one" }, 400);
    }

    // 2. Wallet must exist on Hedera mainnet (anti-spoof)
    const walletExists = await verifyWalletOnMirrorNode(accountId);
    if (!walletExists) {
      console.log(`[CALI-VERIFY] Mirror node says ${accountId} does not exist`);
      return c.json(
        { success: false, error: "Wallet not found on Hedera mainnet" },
        400,
      );
    }

    // 3. HBAR balance gate (>= 1 HBAR)
    let tinybars: number;
    try {
      tinybars = await getAccountBalanceTinybars(accountId);
    } catch (err) {
      console.log(`[CALI-VERIFY] Balance fetch failed for ${accountId}: ${err}`);
      return c.json(
        {
          success: false,
          error: "Unable to verify HBAR balance right now. Please retry in a moment.",
          code: "MIRROR_NODE_UNAVAILABLE",
        },
        502,
      );
    }
    if (tinybars < MIN_HBAR_TINYBARS) {
      console.log(
        `[CALI-VERIFY] Balance ${tinybars} tinybars (<${MIN_HBAR_TINYBARS}) for ${accountId} — gate failed`,
      );
      return c.json(
        {
          success: false,
          error: `Calisthenics access requires at least 1 HBAR in your wallet. Current balance: ${(
            tinybars / 100_000_000
          ).toFixed(8)} ℏ.`,
          code: "INSUFFICIENT_HBAR",
          tinybars,
          requiredTinybars: MIN_HBAR_TINYBARS,
        },
        403,
      );
    }

    // 4. Signature verification — full ED25519 when possible, headcount-mode
    //    bypass otherwise (same logic the rest of the platform uses).
    //
    // HARDENING (audit HIGH #2): the bypass MUST require that the failure
    // came from a real wallet-key path (ED25519 or ECDSA), not from a key-
    // fetch outage where keyType is undefined. Otherwise an attacker could
    // ride a transient Mirror Node 5xx + any ≥16-char base64 to pass.
    const sigResult = await verifyVoteSignature(accountId, challengeRec.challenge, signature);
    if (!sigResult.valid) {
      const keyKnown = sigResult.keyType === "ED25519" || sigResult.keyType === "ECDSA_SECP256K1";
      if (HEADCOUNT_MODE && keyKnown) {
        console.log(
          `[CALI-VERIFY] ⚠️ HEADCOUNT MODE: signature verify did not pass for ${accountId} ` +
            `(keyType=${sigResult.keyType}) — ` +
            `other layers OK (mirror-node + balance + nonce + non-empty sig). Allowing.`,
        );
      } else if (HEADCOUNT_MODE && !keyKnown) {
        console.log(
          `[CALI-VERIFY] ❌ Bypass refused for ${accountId}: keyType missing ` +
            `(likely Mirror Node key-fetch failure). Rejecting.`,
        );
        await kv.del(`cali:nonce:${nonce}`).catch(() => {});
        return c.json(
          {
            success: false,
            error: "Unable to verify your wallet key right now. Please retry shortly.",
            code: "WALLET_KEY_UNAVAILABLE",
          },
          502,
        );
      } else {
        console.log(
          `[CALI-VERIFY] ❌ Signature verify failed strict-mode for ${accountId}: ${sigResult.error}`,
        );
        await kv.del(`cali:nonce:${nonce}`).catch(() => {});
        return c.json(
          {
            success: false,
            error: "Signature verification failed. Please re-approve in your wallet.",
            code: "SIG_INVALID",
          },
          401,
        );
      }
    } else {
      console.log(`[CALI-VERIFY] ✅ Signature verified for ${accountId} (${sigResult.keyType})`);
    }

    // 5. Consume the nonce (single-use)
    await kv.del(`cali:nonce:${nonce}`).catch(() => {});

    // 6. Record eligibility + mint session token
    const eligibility = await setEligibility(accountId, tinybars);
    const session = await issueSessionToken(accountId);

    console.log(
      `[CALI-VERIFY] ✅ Session issued for ${accountId} ` +
        `(balance=${tinybars} tinybars, exp=${new Date(session.exp).toISOString()})`,
    );

    // Track live sign-in for admin operations panel (sign-ins + generated counts)
    incrCaliSignin().catch(() => {});

    return c.json({
      success: true,
      data: {
        sessionToken: session.token,
        expiresAt: session.exp,
        eligibility: {
          accountId,
          tinybars: eligibility.tinybars,
          checkedAt: eligibility.checkedAt,
          expiresAt: eligibility.expiresAt,
        },
      },
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /cali/session/refresh — re-check balance, extend session
  // ─────────────────────────────────────────────────────────────────────────
  //
  // Requires a still-valid (HMAC + eligibility) session. Re-fetches the live
  // balance from Mirror Node — if the wallet has drained below the gate
  // threshold, eligibility is revoked and the session becomes useless.
  // ─────────────────────────────────────────────────────────────────────────
  app.post(`${PREFIX}/cali/session/refresh`, requireCaliSession, async (c) => {
    const accountId = c.get("caliAccountId") as string;

    const rl = await checkRateLimit(`cali-refresh-w:${accountId}`, 12, 60 * 60 * 1000);
    if (rl.limited) {
      return c.json(
        {
          success: false,
          error: "Too many session refreshes this hour.",
          code: "RATE_LIMITED",
          retryAfter: rl.retryAfter,
        },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter || 5) } },
      );
    }

    let tinybars: number;
    try {
      tinybars = await getAccountBalanceTinybars(accountId);
    } catch (err) {
      console.log(`[CALI-REFRESH] Balance fetch failed for ${accountId}: ${err}`);
      return c.json(
        {
          success: false,
          error: "Unable to verify HBAR balance right now. Please retry shortly.",
          code: "MIRROR_NODE_UNAVAILABLE",
        },
        502,
      );
    }

    if (tinybars < MIN_HBAR_TINYBARS) {
      // Revoke eligibility immediately
      await kv.del(`cali:eligible:${accountId}`).catch(() => {});
      console.log(
        `[CALI-REFRESH] Balance dropped below gate (${tinybars} < ${MIN_HBAR_TINYBARS}) for ${accountId} — revoking eligibility`,
      );
      return c.json(
        {
          success: false,
          error: `HBAR balance fell below 1 HBAR (currently ${(tinybars / 100_000_000).toFixed(8)} ℏ). Access revoked until you top up.`,
          code: "INSUFFICIENT_HBAR",
          tinybars,
          requiredTinybars: MIN_HBAR_TINYBARS,
        },
        403,
      );
    }

    const eligibility = await setEligibility(accountId, tinybars);
    const session = await issueSessionToken(accountId);

    return c.json({
      success: true,
      data: {
        sessionToken: session.token,
        expiresAt: session.exp,
        eligibility: {
          accountId,
          tinybars: eligibility.tinybars,
          checkedAt: eligibility.checkedAt,
          expiresAt: eligibility.expiresAt,
        },
      },
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /cali/session/me — cheap "am I still in?" probe for the frontend
  // ─────────────────────────────────────────────────────────────────────────
  //
  // Does NOT hit Mirror Node — purely reads the HMAC token + cached eligibility.
  // Frontend uses this on mount to decide gate-open vs. show-connect.
  // ─────────────────────────────────────────────────────────────────────────
  app.get(`${PREFIX}/cali/session/me`, requireCaliSession, async (c) => {
    const accountId = c.get("caliAccountId") as string;
    const rl = await checkRateLimit(`cali-me:${accountId}`, 60, 60_000);
    if (rl.limited) {
      return c.json(
        { success: false, error: "Too many session probes.", code: "RATE_LIMITED", retryAfter: rl.retryAfter },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter || 5) } },
      );
    }
    const eligibility = c.get("caliEligibility") as EligibilityRecord;
    return c.json({
      success: true,
      data: {
        accountId,
        eligibility: {
          accountId,
          tinybars: eligibility.tinybars,
          checkedAt: eligibility.checkedAt,
          expiresAt: eligibility.expiresAt,
        },
      },
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /cali/profile — read the caller's profile (lazy-create on first read)
  // ─────────────────────────────────────────────────────────────────────────
  app.get(`${PREFIX}/cali/profile`, requireCaliSession, async (c) => {
    const accountId = c.get("caliAccountId") as string;
    const rl = await checkRateLimit(`cali-profile-get:${accountId}`, 60, 60_000);
    if (rl.limited) {
      return c.json(
        { success: false, error: "Too many profile reads.", code: "RATE_LIMITED", retryAfter: rl.retryAfter },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter || 5) } },
      );
    }
    const profile = await loadOrInitProfile(accountId);
    return c.json({ success: true, data: { profile } });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PUT /cali/profile — update level / equipment / display name
  // ─────────────────────────────────────────────────────────────────────────
  app.put(`${PREFIX}/cali/profile`, requireCaliSession, async (c) => {
    const accountId = c.get("caliAccountId") as string;

    const rl = await checkRateLimit(`cali-profile-put:${accountId}`, 20, 60_000);
    if (rl.limited) {
      return c.json(
        {
          success: false,
          error: "Too many profile updates. Slow down.",
          code: "RATE_LIMITED",
          retryAfter: rl.retryAfter,
        },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter || 5) } },
      );
    }

    let body: any;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ success: false, error: "Invalid JSON body" }, 400);
    }

    const current = await loadOrInitProfile(accountId);
    const patch = validateProfilePatch(body);
    if ("error" in patch) {
      return c.json({ success: false, error: patch.error, field: patch.field }, 400);
    }

    const updated: CaliProfile = {
      ...current,
      ...patch.value,
      accountId,
      updatedAt: now(),
    };

    try {
      await kv.set(`cali:user:${accountId}:profile`, updated);
    } catch (err) {
      console.log(`[CALI-PROFILE] KV write failed for ${accountId}: ${err}`);
      return c.json({ success: false, error: "Profile storage unavailable" }, 503);
    }

    console.log(
      `[CALI-PROFILE] Updated ${accountId} — level=${updated.level}, equipment=[${updated.equipment.join(",")}], displayName=${updated.displayName ? "set" : "none"}`,
    );
    return c.json({ success: true, data: { profile: updated } });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /cali/workout/generate — produce a fresh deterministic workout
  // ─────────────────────────────────────────────────────────────────────────
  app.post(`${PREFIX}/cali/workout/generate`, requireCaliSession, async (c) => {
    const accountId = c.get("caliAccountId") as string;

    const rl = await checkRateLimit(`cali-gen:${accountId}`, 6, 60 * 60 * 1000);
    if (rl.limited) {
      return c.json(
        {
          success: false,
          error: "Workout generation rate limit reached for this hour.",
          code: "RATE_LIMITED",
          retryAfter: rl.retryAfter,
        },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter || 5) } },
      );
    }

    let body: any = {};
    try {
      body = (await c.req.json()) || {};
    } catch {
      // Generate with profile defaults if body is empty/invalid
    }

    const profile = await loadOrInitProfile(accountId);
    const level = pickLevelOverride(body?.level, profile.level);
    const equipment = pickEquipmentOverride(body?.equipment, profile.equipment);

    // Build full live exercise pool (base + operator-added + overrides) so new exercises and edits participate immediately
    const ovForGen = (await kv.get("cali:overrides")) || {};
    const addedForGen = await loadAddedExercises(kv);
    const fullExercisesForGen = mergeExercises(EXERCISES as any, addedForGen, ovForGen as any);

    const plan = await generateAndStoreWorkout({
      accountId,
      level,
      equipment,
      excludeIds: [],
      exercisesOverride: fullExercisesForGen,
    });
    if ("error" in plan) {
      return c.json({ success: false, error: plan.error }, 500);
    }

    return c.json({ success: true, data: { workout: plan.value } });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /cali/workout/regenerate — new seed, exclude exercises from prior
  // ─────────────────────────────────────────────────────────────────────────
  app.post(`${PREFIX}/cali/workout/regenerate`, requireCaliSession, async (c) => {
    const accountId = c.get("caliAccountId") as string;

    const rl = await checkRateLimit(`cali-regen:${accountId}`, 10, 60 * 60 * 1000);
    if (rl.limited) {
      return c.json(
        {
          success: false,
          error: "Regenerate rate limit reached for this hour.",
          code: "RATE_LIMITED",
          retryAfter: rl.retryAfter,
        },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter || 5) } },
      );
    }

    let body: any = {};
    try {
      body = (await c.req.json()) || {};
    } catch {
      // Treat missing previousWorkoutId as a plain re-generate
    }

    const previousWorkoutId = sanitizeString(body?.previousWorkoutId, 128);

    let excludeIds: string[] = [];
    let level: GenLevel | undefined;
    let equipment: GenEquipment[] | undefined;
    if (previousWorkoutId) {
      const prev = await loadWorkoutForOwner(accountId, previousWorkoutId);
      if (prev) {
        excludeIds = exerciseIdsOfPlan(prev);
        level = prev.level;
        equipment = prev.equipment;
      }
    }

    const profile = await loadOrInitProfile(accountId);
    const finalLevel = pickLevelOverride(body?.level, level ?? profile.level);
    const finalEquipment = pickEquipmentOverride(
      body?.equipment,
      equipment ?? profile.equipment,
    );

    const ov = (await kv.get("cali:overrides")) || {};
    const added = await loadAddedExercises(kv);
    const full = mergeExercises(EXERCISES as any, added, ov as any);
    const plan = await generateAndStoreWorkout({
      accountId,
      level: finalLevel,
      equipment: finalEquipment,
      excludeIds,
      exercisesOverride: full,
    });
    if ("error" in plan) {
      return c.json({ success: false, error: plan.error }, 500);
    }

    return c.json({ success: true, data: { workout: plan.value } });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /cali/workout/:id — fetch a stored workout (owner-only)
  // ─────────────────────────────────────────────────────────────────────────
  app.get(`${PREFIX}/cali/workout/:id`, requireCaliSession, async (c) => {
    const accountId = c.get("caliAccountId") as string;
    const workoutId = sanitizeString(c.req.param("id"), 128);

    if (!workoutId || workoutId.length < 16) {
      return c.json({ success: false, error: "Invalid workoutId" }, 400);
    }

    const rl = await checkRateLimit(`cali-wget:${accountId}`, 60, 60_000);
    if (rl.limited) {
      return c.json(
        {
          success: false,
          error: "Too many workout reads. Slow down.",
          code: "RATE_LIMITED",
          retryAfter: rl.retryAfter,
        },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter || 5) } },
      );
    }

    const plan = await loadWorkoutForOwner(accountId, workoutId);
    if (!plan) {
      // Generic 404 — never reveal whether the workout exists under another wallet
      return c.json({ success: false, error: "Workout not found" }, 404);
    }
    return c.json({ success: true, data: { workout: plan } });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /cali/workout/:id/log — submit per-set actuals; update PRs + streak
  // ─────────────────────────────────────────────────────────────────────────
  //
  // Idempotent by (workoutId, blockIndex, itemIndex, setIndex) — re-logging
  // the same set just overwrites the prior actual value. PR detection runs
  // against the post-merge log so re-logs cannot double-count a record.
  //
  // The frontend may call this on every blur (autosave), so the request
  // shape allows a partial array of sets — not the whole workout.
  // ─────────────────────────────────────────────────────────────────────────
  app.post(`${PREFIX}/cali/workout/:id/log`, requireCaliSession, async (c) => {
    const accountId = c.get("caliAccountId") as string;
    const workoutId = sanitizeString(c.req.param("id"), 128);

    if (!workoutId || workoutId.length < 16) {
      return c.json({ success: false, error: "Invalid workoutId" }, 400);
    }

    const rl = await checkRateLimit(`cali-log:${accountId}`, 60, 60_000);
    if (rl.limited) {
      return c.json(
        {
          success: false,
          error: "Too many log writes. Slow down.",
          code: "RATE_LIMITED",
          retryAfter: rl.retryAfter,
        },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter || 5) } },
      );
    }

    let body: any;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ success: false, error: "Invalid JSON body" }, 400);
    }

    const plan = await loadWorkoutForOwner(accountId, workoutId);
    if (!plan) return c.json({ success: false, error: "Workout not found" }, 404);

    // Validate + clean every submitted set against the plan structure.
    // Anything that doesn't index into a real (block, item, set) is rejected.
    const cleanedSets: ValidatedSet[] = [];
    if (!Array.isArray(body?.sets)) {
      return c.json({ success: false, error: "Body.sets must be an array" }, 400);
    }
    if (body.sets.length > 100) {
      return c.json({ success: false, error: "Too many sets in one request (max 100)" }, 400);
    }
    for (let i = 0; i < body.sets.length; i++) {
      const result = validateLoggedSet(body.sets[i], plan);
      if ("error" in result) {
        return c.json(
          { success: false, error: `sets[${i}]: ${result.error}`, field: result.field },
          400,
        );
      }
      cleanedSets.push(result.value);
    }

    // markedComplete is set by the frontend when the user taps "Complete".
    // It triggers streak math but does not lock the log — additional sets can
    // still be appended after completion (e.g. corrections).
    const markedComplete = body?.completed === true;

    // Merge into the stored log record (key per ISO date so history is paginatable).
    // HARDENING (audit MEDIUM): clamp completedAt to "now" — never let a
    // client-supplied future date land in storage, history sort, or streak math.
    // Reject anything that isn't a parseable ISO-ish string.
    const nowIso = new Date().toISOString();
    let completedAt = nowIso;
    if (typeof body?.completedAt === "string") {
      const parsed = Date.parse(body.completedAt);
      if (Number.isFinite(parsed)) {
        completedAt = parsed > Date.now() ? nowIso : new Date(parsed).toISOString();
      }
    }
    const dateKey = completedAt.slice(0, 10); // YYYY-MM-DD UTC

    const logKey = `cali:user:${accountId}:log:${dateKey}:${workoutId}`;
    let log: WorkoutLog;
    try {
      const existing: any = await kv.get(logKey);
      log = existing && existing.workoutId === workoutId
        ? (existing as WorkoutLog)
        : { workoutId, accountId, dateKey, sets: [], completedAt: null, updatedAt: now() };
    } catch (err) {
      console.log(`[CALI-LOG] KV read failed for ${logKey}: ${err}`);
      return c.json({ success: false, error: "Log storage unavailable" }, 503);
    }

    log.sets = mergeSets(log.sets, cleanedSets);
    log.updatedAt = now();
    if (markedComplete) log.completedAt = completedAt;

    // PR detection — runs over the post-merge log so re-logs don't double-count.
    const prChanges: PRChange[] = await updatePRsForLog(accountId, log, plan);

    // Streak — only when the user marks the workout complete with >=1 logged set.
    let streak: StreakRecord | null = null;
    if (markedComplete && log.sets.length > 0) {
      streak = await updateStreak(accountId, dateKey);
    }

    try {
      await kv.set(logKey, log);
    } catch (err) {
      console.log(`[CALI-LOG] KV write failed for ${logKey}: ${err}`);
      return c.json({ success: false, error: "Log storage unavailable" }, 503);
    }

    console.log(
      `[CALI-LOG] ${accountId}/${workoutId} → +${cleanedSets.length} sets ` +
        `(total=${log.sets.length}, complete=${markedComplete}, prs=${prChanges.length})`,
    );

    return c.json({
      success: true,
      data: { log, prChanges, streak },
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /cali/history — paginated list of past workouts (most-recent first)
  // ─────────────────────────────────────────────────────────────────────────
  //
  // Backed by getByPrefix on `cali:user:<id>:log:` — each log key already
  // embeds the date, which is enough for chronological ordering. We return
  // a small projection (no per-set details) to keep payloads under a page.
  // ─────────────────────────────────────────────────────────────────────────
  app.get(`${PREFIX}/cali/history`, requireCaliSession, async (c) => {
    const accountId = c.get("caliAccountId") as string;

    const rl = await checkRateLimit(`cali-hist:${accountId}`, 30, 60_000);
    if (rl.limited) {
      return c.json(
        {
          success: false,
          error: "Too many history reads. Slow down.",
          code: "RATE_LIMITED",
          retryAfter: rl.retryAfter,
        },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter || 5) } },
      );
    }

    const limit = clampInt(c.req.query("limit"), 1, 50, 20);
    // Cursor = the dateKey we already saw — return entries strictly older.
    const beforeRaw = c.req.query("before") || "";
    const before = /^\d{4}-\d{2}-\d{2}$/.test(beforeRaw) ? beforeRaw : "";

    let rows: any[];
    try {
      rows = (await kv.getByPrefix(`cali:user:${accountId}:log:`)) ?? [];
    } catch (err) {
      console.log(`[CALI-HIST] getByPrefix failed for ${accountId}: ${err}`);
      return c.json({ success: false, error: "History unavailable" }, 503);
    }

    // Defensive: every row should already belong to this wallet (prefix is
    // scoped), but verify accountId on the value too in case of legacy drift.
    const logs: WorkoutLog[] = rows
      .filter((r) => r && r.accountId === accountId && typeof r.dateKey === "string")
      .sort((a, b) => {
        if (a.dateKey !== b.dateKey) return b.dateKey.localeCompare(a.dateKey);
        return (b.updatedAt ?? 0) - (a.updatedAt ?? 0);
      });

    const filtered = before ? logs.filter((l) => l.dateKey < before) : logs;
    const page = filtered.slice(0, limit);

    const items = page.map((l) => projectHistoryItem(l));
    const nextCursor =
      page.length === limit && page.length > 0 ? page[page.length - 1].dateKey : null;

    return c.json({
      success: true,
      data: { items, nextCursor, total: logs.length },
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /cali/prs — every personal record for the caller, grouped by category
  // ─────────────────────────────────────────────────────────────────────────
  app.get(`${PREFIX}/cali/prs`, requireCaliSession, async (c) => {
    const accountId = c.get("caliAccountId") as string;

    const rl = await checkRateLimit(`cali-prs:${accountId}`, 30, 60_000);
    if (rl.limited) {
      return c.json(
        {
          success: false,
          error: "Too many PR reads. Slow down.",
          code: "RATE_LIMITED",
          retryAfter: rl.retryAfter,
        },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter || 5) } },
      );
    }

    let rows: any[];
    try {
      rows = (await kv.getByPrefix(`cali:user:${accountId}:pr:`)) ?? [];
    } catch (err) {
      console.log(`[CALI-PRS] getByPrefix failed for ${accountId}: ${err}`);
      return c.json({ success: false, error: "PRs unavailable" }, 503);
    }

    const prs: PRRecord[] = rows.filter(
      (r) =>
        r &&
        typeof r.exerciseId === "string" &&
        typeof r.value === "number" &&
        (r.metric === "reps" || r.metric === "time_sec"),
    );

    // Decorate with display info from the library (read-only, server-owned)
    const decorated = prs.map((pr) => {
      const ex = getExerciseSafe(pr.exerciseId);
      return {
        exerciseId: pr.exerciseId,
        name: ex?.name ?? pr.exerciseId,
        category: ex?.category ?? "unknown",
        metric: pr.metric,
        value: pr.value,
        achievedAt: pr.achievedAt,
        workoutId: pr.workoutId,
      };
    });

    decorated.sort((a, b) => b.achievedAt - a.achievedAt);

    return c.json({ success: true, data: { prs: decorated, count: decorated.length } });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /cali/streak — current + longest streak for the dashboard
  // ─────────────────────────────────────────────────────────────────────────
  app.get(`${PREFIX}/cali/streak`, requireCaliSession, async (c) => {
    const accountId = c.get("caliAccountId") as string;
    const rl = await checkRateLimit(`cali-streak-get:${accountId}`, 60, 60_000);
    if (rl.limited) {
      return c.json(
        { success: false, error: "Too many streak reads.", code: "RATE_LIMITED", retryAfter: rl.retryAfter },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter || 5) } },
      );
    }
    let rec: StreakRecord | null = null;
    try {
      const raw: any = await kv.get(`cali:user:${accountId}:streak`);
      if (raw && typeof raw.current === "number") rec = raw as StreakRecord;
    } catch (err) {
      console.log(`[CALI-STREAK-GET] read failed for ${accountId}: ${err}`);
    }
    return c.json({
      success: true,
      data: { streak: rec ?? { current: 0, longest: 0, lastDate: "", updatedAt: 0 } },
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // POST /cali/workout/:id/anchor — STUB until HCS operator keys are set
  // ─────────────────────────────────────────────────────────────────────────
  //
  // The frontend can wire the "Anchor to Hedera" button immediately. While
  // HEDERA_OPERATOR_ID / HEDERA_OPERATOR_KEY are unset, this returns 503 with
  // a friendly code so the UI can show "Anchoring coming soon — your workout
  // is saved locally and will be anchorable later" without bespoke handling.
  // Replaced with real HCS submission in the final slice.
  // ─────────────────────────────────────────────────────────────────────────
  app.post(`${PREFIX}/cali/workout/:id/anchor`, requireCaliSession, async (c) => {
    const accountId = c.get("caliAccountId") as string;
    const workoutId = sanitizeString(c.req.param("id"), 128);

    if (!workoutId || workoutId.length < 16) {
      return c.json({ success: false, error: "Invalid workoutId" }, 400);
    }

    const rl = await checkRateLimit(`cali-anchor:${accountId}`, 5, 24 * 60 * 60 * 1000);
    if (rl.limited) {
      return c.json(
        {
          success: false,
          error: "Daily anchor limit reached.",
          code: "RATE_LIMITED",
          retryAfter: rl.retryAfter,
        },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter || 5) } },
      );
    }

    // Confirm ownership before responding "service unavailable" — same 404
    // shape as other workout routes so the existence of an unrelated wallet's
    // workout never leaks.
    const plan = await loadWorkoutForOwner(accountId, workoutId);
    if (!plan) return c.json({ success: false, error: "Workout not found" }, 404);

    const operatorReady =
      Boolean(Deno.env.get("HEDERA_OPERATOR_ID")) &&
      Boolean(Deno.env.get("HEDERA_OPERATOR_KEY"));
    if (!operatorReady) {
      return c.json(
        {
          success: false,
          code: "ANCHOR_UNAVAILABLE",
          error:
            "On-graph anchoring isn't live yet. Your workout is saved — you'll be able to anchor it once Hedera Consensus Service is wired.",
        },
        503,
      );
    }

    // Operator keys exist but HCS submit code is the final slice — keep the
    // safe stub response until then so a deploy with the keys set doesn't
    // half-implement anchoring.
    return c.json(
      {
        success: false,
        code: "ANCHOR_NOT_IMPLEMENTED",
        error: "HCS submit is implemented in the final deploy slice. Keys are detected — endpoint will go live shortly.",
      },
      503,
    );
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /cali/verify-anchor/:workoutId — STUB matching the future shape
  // ─────────────────────────────────────────────────────────────────────────
  app.get(`${PREFIX}/cali/verify-anchor/:id`, requireCaliSession, async (c) => {
    const accountId = c.get("caliAccountId") as string;
    const rl = await checkRateLimit(`cali-vanchor:${accountId}`, 30, 60_000);
    if (rl.limited) {
      return c.json(
        { success: false, error: "Too many verify-anchor reads.", code: "RATE_LIMITED", retryAfter: rl.retryAfter },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter || 5) } },
      );
    }
    const workoutId = sanitizeString(c.req.param("id"), 128);
    const plan = await loadWorkoutForOwner(accountId, workoutId);
    if (!plan) return c.json({ success: false, error: "Workout not found" }, 404);
    return c.json({
      success: false,
      code: "ANCHOR_UNAVAILABLE",
      error: "Anchor verification isn't live yet — no on-graph record exists for this workout.",
      workoutId,
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // GET /admin/cali/stats — command-center metrics card (admin-session gated)
  // ─────────────────────────────────────────────────────────────────────────
  //
  // Aggregates KV scans over the cali namespace. Each scan is O(N keys) — fine
  // until the user base grows large; revisit with a denormalized counter then.
  // All counts are integer; topExercises is the 5 most-logged exercise ids.
  // ─────────────────────────────────────────────────────────────────────────
  app.get(`${PREFIX}/admin/cali/stats`, requireAdminSession, async (c) => {
    // Admin-only + full-prefix scan; throttle hard so a stuck-on-refresh
    // browser tab can't beat KV with O(N) reads.
    const adminWallet = (c.get("adminWallet") as string) ?? "admin";
    const rl = await checkRateLimit(`cali-admin-stats:${adminWallet}`, 12, 60_000);
    if (rl.limited) {
      return c.json(
        { success: false, error: "Too many admin stats requests.", code: "RATE_LIMITED", retryAfter: rl.retryAfter },
        { status: 429, headers: { "Retry-After": String(rl.retryAfter || 5) } },
      );
    }
    try {
      // One scan, then bucket each row by its shape (KV doesn't return keys
      // here, so we infer the record type from the value structure).
      const all = ((await kv.getByPrefix("cali:user:").catch(() => [])) ?? []) as any[];
      let totalProfiles = 0;
      let totalWorkouts = 0;
      let totalLogs = 0;
      let totalAnchored = 0;
      let totalPRs = 0;
      let totalSetsLogged = 0;
      let workoutsLast24h = 0;
      const sinceMs = Date.now() - 24 * 60 * 60 * 1000;
      const exerciseCounts = new Map<string, number>();
      const activeWallets = new Set<string>();

      for (const row of all) {
        if (!row || typeof row !== "object") continue;
        // Discriminate by shape (KV rows don't carry their key here)
        if (row.workoutId && Array.isArray(row.blocks) && row.accountId) {
          totalWorkouts++;
          activeWallets.add(row.accountId);
          if (typeof row.createdAt === "number" && row.createdAt >= sinceMs) {
            workoutsLast24h++;
          }
        } else if (row.workoutId && Array.isArray(row.sets) && row.dateKey) {
          totalLogs++;
          totalSetsLogged += row.sets.length;
          if (row.accountId) activeWallets.add(row.accountId);
          for (const s of row.sets) {
            if (s?.exerciseId) {
              exerciseCounts.set(s.exerciseId, (exerciseCounts.get(s.exerciseId) ?? 0) + 1);
            }
          }
        } else if (row.exerciseId && typeof row.value === "number" && row.workoutId) {
          totalPRs++;
        } else if (row.level && Array.isArray(row.equipment)) {
          totalProfiles++;
        } else if (row.txId && row.sequenceNumber !== undefined) {
          totalAnchored++;
        }
      }

      const topExercises = Array.from(exerciseCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([exerciseId, count]) => ({
          exerciseId,
          name: getExerciseSafe(exerciseId)?.name ?? exerciseId,
          count,
        }));

      // Live ops counters (sign-ins for "how many people are signing in", gens for "workouts generated total")
      const day = new Date().toISOString().slice(0, 10);
      const [signinToday, signinTotal, genTotal] = await Promise.all([
        kv.get(`cali:signin:d:${day}`),
        kv.get(`cali:signin:total`),
        kv.get(`cali:gen:total`),
      ]);

      return c.json({
        success: true,
        data: {
          totalProfiles,
          totalWorkouts,
          totalLogs,
          totalSetsLogged,
          totalPRs,
          totalAnchored,
          workoutsLast24h,
          activeWallets: activeWallets.size,
          topExercises,
          libraryVersion: LIBRARY_VERSION,
          // NEW for admin ops live zone + dedicated calisthenics admin page
          caliSignInsToday: Number(signinToday || 0),
          caliSignInsTotal: Number(signinTotal || 0),
          workoutsGeneratedTotal: Number(genTotal || 0),
        },
      });
    } catch (err) {
      console.log(`[CALI-ADMIN] stats failed: ${err}`);
      return c.json({ success: false, error: "Stats unavailable" }, 500);
    }
  });

  console.log(
    "[CALI] Routes mounted: /cali/challenge, /cali/verify, /cali/session/refresh, /cali/session/me, " +
      "/cali/profile (GET/PUT), /cali/workout/generate, /cali/workout/regenerate, /cali/workout/:id, " +
      "/cali/workout/:id/log, /cali/history, /cali/prs, /cali/streak, " +
      "/cali/workout/:id/anchor (stub), /cali/verify-anchor/:id (stub), /admin/cali/stats",
  );

  // ==========================================================================
  // ADMIN OPERATIONS ENDPOINTS — full control of workouts + photos (ops console)
  // ==========================================================================

  // GET /admin/cali/library — return base + (if authed) added + overrides merged.
  // IMPORTANT: Always returns at least the full base list (111+) so the admin editor
  // scroll selector can always show and let the operator pick every exercise.
  // Private operator data (overrides, added, photoMap) only included when a valid
  // X-Admin-Session is provided. No auth required for the base names/ids/cues.
  app.get(`${PREFIX}/admin/cali/library`, async (c) => {
    let adminWallet = "public";
    let overridesRaw: any = {};
    let photoMap: any = {};
    let added: any[] = [];

    const sessionToken = c.req.header("X-Admin-Session");
    if (sessionToken) {
      try {
        const wallet = await validateSession(sessionToken);
        if (wallet) {
          adminWallet = wallet;
          const rl = await checkRateLimit(`cali-admin-lib:${adminWallet}`, 30, 60_000);
          if (rl.limited) return c.json({ success: false, error: "Rate limited" }, 429);

          overridesRaw = (await kv.get("cali:overrides")) || {};
          photoMap = (await kv.get("cali:photoMap")) || {};
          added = await loadAddedExercises(kv);
        }
      } catch (e) {
        // invalid/expired token — fall back to public base list only
      }
    }

    try {
      const live = mergeExercises(EXERCISES as any, added, overridesRaw as any);

      const enriched = live.map((ex: any) => ({
        ...ex,
        previewImageRef: (overridesRaw as any)[ex.id]?.previewImageRef || (photoMap as any)[ex.id] || ex.previewImageRef || null,
        previewImageRefMale: (overridesRaw as any)[ex.id]?.previewImageRefMale || (overridesRaw as any)[ex.id]?.previewImageRef || (photoMap as any)[ex.id] || ex.previewImageRefMale || ex.previewImageRef || null,
        previewImageRefFemale: (overridesRaw as any)[ex.id]?.previewImageRefFemale || (overridesRaw as any)[ex.id]?.previewImageRef || (photoMap as any)[ex.id] || ex.previewImageRefFemale || ex.previewImageRef || null,
      }));

      return c.json({
        success: true,
        data: {
          libraryVersion: LIBRARY_VERSION,
          exercises: enriched,
          overrides: overridesRaw,
          photoMap,
          addedCount: added.length,
          totalCount: enriched.length,
          maxTotal: 250,
        },
      });
    } catch (e) {
      console.log("[ADMIN-CALI] library read error", e);
      return c.json({ success: false, error: "Failed to load library" }, 500);
    }
  });

  // POST /admin/cali/override — save one or more exercise overrides (name, cues, pattern, photo etc)
  app.post(`${PREFIX}/admin/cali/override`, requireAdminSession, async (c) => {
    const adminWallet = (c.get("adminWallet") as string) ?? "admin";
    const rl = await checkRateLimit(`cali-admin-override:${adminWallet}`, 60, 60_000);
    if (rl.limited) return c.json({ success: false, error: "Rate limited" }, 429);

    let body: any = {};
    try { body = await c.req.json(); } catch {}

    const single = body?.override as ExerciseOverride | undefined;
    const batch = body?.overrides as Record<string, ExerciseOverride> | undefined;

    try {
      const current = (await kv.get("cali:overrides")) || {};
      if (single && single.id) {
        (current as any)[single.id] = { ...(current as any)[single.id], ...single };
      }
      if (batch) {
        for (const [id, ov] of Object.entries(batch)) {
          (current as any)[id] = { ...(current as any)[id], ...ov, id };
        }
      }
      await kv.set("cali:overrides", current);
      return c.json({ success: true, data: { saved: Object.keys(batch || (single ? { [single.id]: 1 } : {})).length } });
    } catch (e) {
      console.log("[ADMIN-CALI] override save error", e);
      return c.json({ success: false, error: "Save failed" }, 500);
    }
  });

  // POST /admin/cali/exercise — add a brand new custom exercise (operator can extend the engine)
  app.post(`${PREFIX}/admin/cali/exercise`, requireAdminSession, async (c) => {
    const adminWallet = (c.get("adminWallet") as string) ?? "admin";
    const rl = await checkRateLimit(`cali-admin-add-ex:${adminWallet}`, 30, 60_000);
    if (rl.limited) return c.json({ success: false, error: "Rate limited" }, 429);

    let body: any = {};
    try { body = await c.req.json(); } catch {}
    const newEx = body?.exercise;
    if (!newEx || !newEx.id || !newEx.name || !newEx.category || !newEx.pattern) {
      return c.json({ success: false, error: "Missing required fields (id, name, category, pattern)" }, 400);
    }

    try {
      const added = (await kv.get("cali:addedExercises")) || [];
      if (added.some((e: any) => e.id === newEx.id)) {
        return c.json({ success: false, error: "Exercise id already exists" }, 400);
      }
      if (EXERCISES.some((e: any) => e.id === newEx.id)) {
        return c.json({ success: false, error: "Conflicts with built-in id" }, 400);
      }
      const totalNow = EXERCISES.length + added.length;
      if (totalNow >= 250) {
        return c.json({ success: false, error: "Max 250 exercises reached" }, 400);
      }

      const toStore = {
        id: newEx.id,
        name: newEx.name,
        category: newEx.category,
        pattern: newEx.pattern,
        level: newEx.level || 1,
        difficulty: newEx.difficulty || 5,
        equipment: newEx.equipment || "none",
        unilateral: !!newEx.unilateral,
        metric: newEx.metric || "reps",
        defaultDose: newEx.defaultDose || [3,3,8,12],
        cues: Array.isArray(newEx.cues) ? newEx.cues : ["Perform with control"],
        description: newEx.description || "",
        previewImageRef: newEx.previewImageRef || null,
      };
      added.push(toStore);
      await kv.set("cali:addedExercises", added);

      return c.json({ success: true, data: { id: toStore.id, total: EXERCISES.length + added.length } });
    } catch (e) {
      console.log("[ADMIN-CALI] add exercise error", e);
      return c.json({ success: false, error: "Failed to add exercise" }, 500);
    }
  });

  // GET /admin/cali/photos — list assignments + known refs for gallery UI
  app.get(`${PREFIX}/admin/cali/photos`, requireAdminSession, async (c) => {
    try {
      const photoMap = (await kv.get("cali:photoMap")) || {};
      // Known female refs (hardcoded from assets for ops UI; add new by filename on disk)
      const knownRefs = [
        "Base Female.jpg", "push up F.jpg", "Wide grip push up.jpg", "Planche pushup F.jpg", "One arm PU F.jpg",
        "Door way rows F.jpg", "Row pull F.jpg", "L sit - bars F.jpg",
        "squat posture F.jpg", "squat relaxed F.jpg", "Squat jump.jpg", "lunge F.jpg",
        "Nordic curl F.jpg", "sprint F.jpg", "high knees.jpg", "Bear walk F.jpg", "Crab walk core F.jpg",
        "Climmber F.jpg", "boxing  F.jpg", "Lateral bounds.jpg",
        "Core leg raises.jpg", "Core twists.jpg", "Floor windshield wipers.jpg", "Sit up F.jpg",
        "The greatest stretch.jpg", "Hip 90-90 F.jpg", "cat cow F.jpg", "Pigeon Stretch F.jpg",
        "Shoulder disloactes F.jpg", "Half-Kneeling Ankle Rocks F.jpg", "Jefferson curl body weight.jpg",
      ];
      return c.json({ success: true, data: { photoMap, knownRefs } });
    } catch (e) {
      return c.json({ success: false, error: "Failed to load photo map" }, 500);
    }
  });

  // POST /admin/cali/photos — save photo assignment map (exerciseId -> ref filename)
  app.post(`${PREFIX}/admin/cali/photos`, requireAdminSession, async (c) => {
    const adminWallet = (c.get("adminWallet") as string) ?? "admin";
    const rl = await checkRateLimit(`cali-admin-photos:${adminWallet}`, 40, 60_000);
    if (rl.limited) return c.json({ success: false, error: "Rate limited" }, 429);

    let body: any = {};
    try { body = await c.req.json(); } catch {}
    try {
      const map = body?.photoMap || {};
      await kv.set("cali:photoMap", map);
      // Also write into overrides as previewImageRef for consistency
      const overrides = (await kv.get("cali:overrides")) || {};
      for (const [id, ref] of Object.entries(map)) {
        if (! (overrides as any)[id]) (overrides as any)[id] = { id };
        (overrides as any)[id].previewImageRef = ref;
      }
      await kv.set("cali:overrides", overrides);
      return c.json({ success: true, data: { assigned: Object.keys(map).length } });
    } catch (e) {
      return c.json({ success: false, error: "Photo map save failed" }, 500);
    }
  });

  // POST /admin/cali/custom-routine — save a hand-crafted routine template
  app.post(`${PREFIX}/admin/cali/custom-routine`, requireAdminSession, async (c) => {
    let body: any = {};
    try { body = await c.req.json(); } catch {}
    const id = (body?.id as string) || `custom-${Date.now()}`;
    try {
      const key = `cali:custom:${id}`;
      await kv.set(key, { ...body, id, savedAt: new Date().toISOString() });
      return c.json({ success: true, data: { id } });
    } catch (e) {
      return c.json({ success: false, error: "Save custom failed" }, 500);
    }
  });

  // GET /admin/cali/custom-routines — list saved hand made routines
  app.get(`${PREFIX}/admin/cali/custom-routines`, requireAdminSession, async (c) => {
    try {
      const all = (await kv.getByPrefix("cali:custom:") || []) as any[];
      return c.json({ success: true, data: { routines: all } });
    } catch {
      return c.json({ success: true, data: { routines: [] } });
    }
  });
}

// ---------------------------------------------------------------------------
// History/PR helpers
// ---------------------------------------------------------------------------

function clampInt(raw: unknown, min: number, max: number, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

interface HistoryItem {
  workoutId: string;
  dateKey: string;
  completedAt: string | null;
  totalSets: number;
  uniqueExercises: number;
  topVolumeSet: { exerciseId: string; metric: "reps" | "time_sec"; value: number } | null;
  updatedAt: number;
}

function projectHistoryItem(l: WorkoutLog): HistoryItem {
  const exSet = new Set<string>();
  let top: HistoryItem["topVolumeSet"] = null;
  for (const s of l.sets) {
    exSet.add(s.exerciseId);
    if (!top || s.value > top.value) {
      top = { exerciseId: s.exerciseId, metric: s.metric, value: s.value };
    }
  }
  return {
    workoutId: l.workoutId,
    dateKey: l.dateKey,
    completedAt: l.completedAt,
    totalSets: l.sets.length,
    uniqueExercises: exSet.size,
    topVolumeSet: top,
    updatedAt: l.updatedAt,
  };
}

/**
 * Slim id → display projection of the library, built once at module load.
 * PR/history responses use this to attach names + categories without shipping
 * cues/dose data the frontend doesn't need.
 */
const libExercises: Map<string, { name: string; category: string }> = (() => {
  const m = new Map<string, { name: string; category: string }>();
  for (const e of EXERCISES) m.set(e.id, { name: e.name, category: e.category });
  return m;
})();

/**
 * Safe library lookup — returns undefined for legacy ids (e.g. a log written
 * under an older LIBRARY_VERSION whose id was later removed). Callers fall
 * back to the raw id string for display.
 */
function getExerciseSafe(id: string) {
  return libExercises.get(id);
}

// ---------------------------------------------------------------------------
// Log model + validation
// ---------------------------------------------------------------------------

interface ValidatedSet {
  blockIndex: number;
  itemIndex: number;
  setIndex: number;
  exerciseId: string;
  metric: "reps" | "time_sec";
  value: number; // reps OR seconds
  rpe?: number; // 1..10
  note?: string;
  loggedAt: number;
}

interface WorkoutLog {
  workoutId: string;
  accountId: string;
  dateKey: string; // YYYY-MM-DD UTC
  sets: ValidatedSet[];
  completedAt: string | null;
  updatedAt: number;
}

const MAX_NOTE_LEN = 280;

type SetValidationResult =
  | { value: ValidatedSet }
  | { error: string; field: string };

function validateLoggedSet(raw: any, plan: WorkoutPlan): SetValidationResult {
  if (!raw || typeof raw !== "object") return { error: "must be an object", field: "(set)" };

  const blockIndex = Number(raw.blockIndex);
  const itemIndex = Number(raw.itemIndex);
  const setIndex = Number(raw.setIndex);
  if (!Number.isInteger(blockIndex) || blockIndex < 0 || blockIndex >= plan.blocks.length) {
    return { error: "blockIndex out of range", field: "blockIndex" };
  }
  const block = plan.blocks[blockIndex];
  if (!Number.isInteger(itemIndex) || itemIndex < 0 || itemIndex >= block.items.length) {
    return { error: "itemIndex out of range", field: "itemIndex" };
  }
  const item = block.items[itemIndex];
  if (!Number.isInteger(setIndex) || setIndex < 0 || setIndex >= item.sets) {
    return { error: "setIndex out of range for this item", field: "setIndex" };
  }

  const value = Number(raw.value);
  if (!Number.isFinite(value) || value < 0 || value > 100000) {
    return { error: "value must be 0..100000", field: "value" };
  }

  let rpe: number | undefined;
  if (raw.rpe !== undefined && raw.rpe !== null) {
    const n = Number(raw.rpe);
    if (!Number.isFinite(n) || n < 1 || n > 10) {
      return { error: "rpe must be 1..10", field: "rpe" };
    }
    rpe = Math.round(n * 10) / 10;
  }

  const note = raw.note !== undefined ? sanitizeString(raw.note, MAX_NOTE_LEN) : undefined;

  return {
    value: {
      blockIndex,
      itemIndex,
      setIndex,
      exerciseId: item.exerciseId,
      metric: item.target.metric,
      value: item.target.metric === "reps" ? Math.round(value) : Math.round(value),
      rpe,
      note: note && note.length > 0 ? note : undefined,
      loggedAt: now(),
    },
  };
}

/**
 * Merge incoming validated sets into the existing log array using
 * (blockIndex, itemIndex, setIndex) as the identity key.
 * Last-write-wins per set — autosave on the frontend means we expect many
 * partial requests for the same workout.
 */
function mergeSets(existing: ValidatedSet[], incoming: ValidatedSet[]): ValidatedSet[] {
  const map = new Map<string, ValidatedSet>();
  const keyOf = (s: ValidatedSet) => `${s.blockIndex}|${s.itemIndex}|${s.setIndex}`;
  for (const s of existing) map.set(keyOf(s), s);
  for (const s of incoming) map.set(keyOf(s), s);
  return Array.from(map.values()).sort((a, b) => {
    if (a.blockIndex !== b.blockIndex) return a.blockIndex - b.blockIndex;
    if (a.itemIndex !== b.itemIndex) return a.itemIndex - b.itemIndex;
    return a.setIndex - b.setIndex;
  });
}

// ---------------------------------------------------------------------------
// Personal Records
// ---------------------------------------------------------------------------

interface PRRecord {
  exerciseId: string;
  metric: "reps" | "time_sec";
  value: number;
  achievedAt: number;
  workoutId: string;
}

interface PRChange {
  exerciseId: string;
  metric: "reps" | "time_sec";
  previous: number | null;
  current: number;
}

/**
 * For each exercise touched in this log, compute the best single set
 * (max reps OR max time) across ALL sets in this log, then compare to
 * the stored PR. Higher → write back, return a PRChange. Equal → no-op
 * (a tie isn't a new record). Lower → no-op.
 */
async function updatePRsForLog(
  accountId: string,
  log: WorkoutLog,
  plan: WorkoutPlan,
): Promise<PRChange[]> {
  // Group best value per exerciseId from this log
  const bestByExercise = new Map<string, { metric: "reps" | "time_sec"; value: number }>();
  for (const s of log.sets) {
    const prior = bestByExercise.get(s.exerciseId);
    if (!prior || s.value > prior.value) {
      bestByExercise.set(s.exerciseId, { metric: s.metric, value: s.value });
    }
  }

  const changes: PRChange[] = [];
  for (const [exerciseId, best] of bestByExercise) {
    if (best.value <= 0) continue;
    const prKey = `cali:user:${accountId}:pr:${exerciseId}`;
    let existing: PRRecord | null = null;
    try {
      const raw: any = await kv.get(prKey);
      if (raw && raw.exerciseId === exerciseId) existing = raw as PRRecord;
    } catch (err) {
      console.log(`[CALI-PR] read failed for ${prKey}: ${err}`);
    }

    if (existing && existing.value >= best.value) continue;

    const next: PRRecord = {
      exerciseId,
      metric: best.metric,
      value: best.value,
      achievedAt: now(),
      workoutId: plan.workoutId,
    };
    try {
      await kv.set(prKey, next);
      changes.push({
        exerciseId,
        metric: best.metric,
        previous: existing?.value ?? null,
        current: best.value,
      });
    } catch (err) {
      console.log(`[CALI-PR] write failed for ${prKey}: ${err}`);
    }
  }
  return changes;
}

// ---------------------------------------------------------------------------
// Streak
// ---------------------------------------------------------------------------

interface StreakRecord {
  current: number;
  longest: number;
  lastDate: string; // YYYY-MM-DD UTC
  updatedAt: number;
}

/**
 * Daily streak — increments on a new calendar day, holds when re-completing
 * the same day, breaks when the user skips a day.
 * Future-dated completions are clamped to today to prevent streak inflation
 * via a client-supplied completedAt.
 */
async function updateStreak(accountId: string, dateKey: string): Promise<StreakRecord> {
  const todayUTC = new Date().toISOString().slice(0, 10);
  if (dateKey > todayUTC) dateKey = todayUTC;

  const key = `cali:user:${accountId}:streak`;
  let cur: StreakRecord;
  try {
    const raw: any = await kv.get(key);
    cur = raw && typeof raw.current === "number"
      ? (raw as StreakRecord)
      : { current: 0, longest: 0, lastDate: "", updatedAt: now() };
  } catch (err) {
    console.log(`[CALI-STREAK] read failed for ${key}: ${err}`);
    cur = { current: 0, longest: 0, lastDate: "", updatedAt: now() };
  }

  if (cur.lastDate === dateKey) {
    // Same day — keep streak as-is, just touch updatedAt
    cur.updatedAt = now();
  } else {
    const prev = cur.lastDate ? Date.parse(`${cur.lastDate}T00:00:00Z`) : 0;
    const curDay = Date.parse(`${dateKey}T00:00:00Z`);
    const oneDayMs = 24 * 60 * 60 * 1000;
    const diff = prev > 0 ? Math.round((curDay - prev) / oneDayMs) : Infinity;

    if (diff <= 0) {
      // Backfilling a prior day — DO NOT mutate lastDate/current/longest, or
      // a subsequent same-day complete would re-anchor diff=1 and inflate
      // the streak (audit HIGH #1). Just touch updatedAt and return.
      cur.updatedAt = now();
      try {
        await kv.set(key, cur);
      } catch (err) {
        console.log(`[CALI-STREAK] write failed for ${key}: ${err}`);
      }
      return cur;
    }

    if (diff === 1) cur.current += 1;
    else cur.current = 1; // gap → restart

    if (cur.current > cur.longest) cur.longest = cur.current;
    cur.lastDate = dateKey;
    cur.updatedAt = now();
  }

  try {
    await kv.set(key, cur);
  } catch (err) {
    console.log(`[CALI-STREAK] write failed for ${key}: ${err}`);
  }
  return cur;
}

// ---------------------------------------------------------------------------
// Generator helpers
// ---------------------------------------------------------------------------

const RECENT_WORKOUTS_CAP = 5;

type Result<T> = { value: T } | { error: string };

function pickLevelOverride(raw: unknown, fallback: GenLevel): GenLevel {
  if (raw === undefined || raw === null) return fallback;
  const n = Number(raw);
  if (n === 1 || n === 2 || n === 3) return n as GenLevel;
  return fallback;
}

const VALID_GEN_EQUIPMENT = new Set<GenEquipment>(["none", "bar", "rings", "wall"]);

function pickEquipmentOverride(
  raw: unknown,
  fallback: GenEquipment[],
): GenEquipment[] {
  if (!Array.isArray(raw)) return fallback;
  const cleaned: GenEquipment[] = [];
  for (const e of raw) {
    if (typeof e === "string" && VALID_GEN_EQUIPMENT.has(e as GenEquipment)) {
      if (!cleaned.includes(e as GenEquipment)) cleaned.push(e as GenEquipment);
    }
  }
  return cleaned.length > 0 ? cleaned : fallback;
}

async function loadWorkoutForOwner(
  accountId: string,
  workoutId: string,
): Promise<WorkoutPlan | null> {
  try {
    const stored: any = await kv.get(`cali:user:${accountId}:workout:${workoutId}`);
    if (!stored || stored.accountId !== accountId) return null;
    if (stored.workoutId !== workoutId) return null;
    return stored as WorkoutPlan;
  } catch (err) {
    console.log(`[CALI-WLOAD] KV read failed for ${accountId}/${workoutId}: ${err}`);
    return null;
  }
}

/**
 * Compute a stable workoutId = HMAC(salt, accountId|seed|libVersion|level|equipment).
 * Two different seeds for the same wallet produce different ids, so storage
 * collisions are impossible. The HMAC also guarantees the id can't be forged
 * client-side to overwrite another user's workout.
 */
async function computeWorkoutId(params: {
  accountId: string;
  seed: string;
  level: GenLevel;
  equipment: GenEquipment[];
}): Promise<string> {
  const secret = getCaliHashSecret();
  const equipKey = [...params.equipment].sort().join(",");
  const payload = `cali-wid|${params.accountId}|${params.seed}|${LIBRARY_VERSION}|${params.level}|${equipKey}`;
  const tag = await hmacSha256(secret, payload);
  return b64url(tag);
}

async function generateAndStoreWorkout(args: {
  accountId: string;
  level: GenLevel;
  equipment: GenEquipment[];
  excludeIds: string[];
  exercisesOverride?: any[];
}): Promise<Result<WorkoutPlan>> {
  const seed = generateNonce(); // 32-byte hex — easily enough entropy

  let workoutId: string;
  try {
    workoutId = await computeWorkoutId({
      accountId: args.accountId,
      seed,
      level: args.level,
      equipment: args.equipment,
    });
  } catch (err) {
    console.log(`[CALI-GEN] HMAC failure for ${args.accountId}: ${err}`);
    return { error: "Server crypto unavailable" };
  }

  let plan: WorkoutPlan;
  try {
    plan = buildWorkoutPlan({
      accountId: args.accountId,
      level: args.level,
      equipment: args.equipment,
      seed,
      excludeIds: args.excludeIds,
      workoutId,
    }, args.exercisesOverride as any);
  } catch (err) {
    console.log(`[CALI-GEN] Plan build failure for ${args.accountId}: ${err}`);
    return { error: "Workout generation failed" };
  }

  // Apply any live operator overrides (names, cues, description, photo ref) so manual edits are immediately visible to users
  try {
    const ov = (await kv.get("cali:overrides")) || {};
    if (ov && Object.keys(ov).length > 0) {
      for (const block of plan.blocks || []) {
        for (const item of (block.items || [])) {
          const live = getLiveExercise(item.exerciseId, ov as any);
          if (live) {
            if (live.name) item.name = live.name;
            if ((live as any).cues) item.cues = (live as any).cues;
            if ((live as any).description) (item as any).description = (live as any).description;
            if ((live as any).previewImageRef) (item as any).previewImageRef = (live as any).previewImageRef;
            if ((live as any).previewImageRefMale) (item as any).previewImageRefMale = (live as any).previewImageRefMale;
            if ((live as any).previewImageRefFemale) (item as any).previewImageRefFemale = (live as any).previewImageRefFemale;
            if ((live as any).category) item.category = (live as any).category;
          }
        }
      }
    }
  } catch {}

  // Persist the immutable plan + bump the recent-workouts ring
  try {
    await kv.set(`cali:user:${args.accountId}:workout:${workoutId}`, plan);
  } catch (err) {
    console.log(`[CALI-GEN] KV write failed for ${args.accountId}/${workoutId}: ${err}`);
    return { error: "Workout storage unavailable" };
  }

  try {
    const recentKey = `cali:user:${args.accountId}:recentWorkouts`;
    const existing: any = await kv.get(recentKey);
    const arr: string[] = Array.isArray(existing?.ids) ? existing.ids : [];
    const next = [workoutId, ...arr.filter((id) => id !== workoutId)].slice(
      0,
      RECENT_WORKOUTS_CAP,
    );
    await kv.set(recentKey, { ids: next, updatedAt: now() });
  } catch (err) {
    // Non-fatal — regenerate will still work without the ring.
    console.log(`[CALI-GEN] Recent-workouts ring update failed for ${args.accountId}: ${err}`);
  }

  console.log(
    `[CALI-GEN] ${args.accountId} → ${workoutId} (level=${args.level}, equip=[${args.equipment.join(",")}], ` +
      `blocks=${plan.blocks.length}, est=${plan.estimatedDurationSec}s)`,
  );

  // Track generated workout for live ops stats (admin panel + dedicated console)
  incrCaliWorkoutGenerated().catch(() => {});

  return { value: plan };
}

// ---------------------------------------------------------------------------
// Profile model + validation
// ---------------------------------------------------------------------------

type CaliLevel = 1 | 2 | 3;
type CaliEquipment = "none" | "bar" | "rings" | "wall";

const VALID_LEVELS: ReadonlySet<number> = new Set([1, 2, 3]);
const VALID_EQUIPMENT: ReadonlySet<string> = new Set([
  "none",
  "bar",
  "rings",
  "wall",
]);
const DISPLAY_NAME_MAX = 24;

interface CaliProfile {
  accountId: string;
  level: CaliLevel;
  equipment: CaliEquipment[];
  displayName: string; // empty string = not set (opt-in)
  createdAt: number;
  updatedAt: number;
}

function defaultProfile(accountId: string): CaliProfile {
  return {
    accountId,
    level: 1,
    equipment: ["none"],
    displayName: "",
    createdAt: now(),
    updatedAt: now(),
  };
}

async function loadOrInitProfile(accountId: string): Promise<CaliProfile> {
  try {
    const existing: any = await kv.get(`cali:user:${accountId}:profile`);
    if (existing && existing.accountId === accountId) {
      return normalizeProfile(existing, accountId);
    }
  } catch (err) {
    console.log(`[CALI-PROFILE] KV read failed for ${accountId}: ${err}`);
  }
  const fresh = defaultProfile(accountId);
  try {
    await kv.set(`cali:user:${accountId}:profile`, fresh);
  } catch (err) {
    console.log(`[CALI-PROFILE] Lazy-init KV write failed for ${accountId}: ${err}`);
    // Non-fatal — return the in-memory default; next PUT will retry persistence.
  }
  return fresh;
}

/**
 * Repair any drift in a stored profile so older records always come back to
 * the frontend in a known-good shape. Unknown fields are dropped.
 */
function normalizeProfile(raw: any, accountId: string): CaliProfile {
  const level = VALID_LEVELS.has(Number(raw.level)) ? (Number(raw.level) as CaliLevel) : 1;
  const equipment: CaliEquipment[] = Array.isArray(raw.equipment)
    ? Array.from(
        new Set(
          raw.equipment
            .filter((e: unknown) => typeof e === "string" && VALID_EQUIPMENT.has(e))
            .map((e: string) => e as CaliEquipment),
        ),
      )
    : ["none"];
  return {
    accountId,
    level,
    equipment: equipment.length > 0 ? equipment : ["none"],
    displayName: sanitizeString(raw.displayName, DISPLAY_NAME_MAX),
    createdAt: typeof raw.createdAt === "number" ? raw.createdAt : now(),
    updatedAt: typeof raw.updatedAt === "number" ? raw.updatedAt : now(),
  };
}

type PatchResult =
  | { value: Partial<CaliProfile> }
  | { error: string; field: string };

function validateProfilePatch(body: any): PatchResult {
  const patch: Partial<CaliProfile> = {};

  if (body?.level !== undefined) {
    const n = Number(body.level);
    if (!VALID_LEVELS.has(n)) {
      return { error: "level must be 1, 2, or 3", field: "level" };
    }
    patch.level = n as CaliLevel;
  }

  if (body?.equipment !== undefined) {
    if (!Array.isArray(body.equipment)) {
      return { error: "equipment must be an array", field: "equipment" };
    }
    if (body.equipment.length > 8) {
      return { error: "equipment list too long", field: "equipment" };
    }
    const cleaned: CaliEquipment[] = [];
    for (const e of body.equipment) {
      if (typeof e !== "string" || !VALID_EQUIPMENT.has(e)) {
        return {
          error: `equipment items must be one of: ${Array.from(VALID_EQUIPMENT).join(", ")}`,
          field: "equipment",
        };
      }
      if (!cleaned.includes(e as CaliEquipment)) cleaned.push(e as CaliEquipment);
    }
    patch.equipment = cleaned.length > 0 ? cleaned : ["none"];
  }

  if (body?.displayName !== undefined) {
    // displayName === "" is the explicit "clear it" signal
    const clean = sanitizeString(body.displayName, DISPLAY_NAME_MAX);
    patch.displayName = clean;
  }

  if (Object.keys(patch).length === 0) {
    return { error: "no recognized fields to update", field: "(body)" };
  }
  return { value: patch };
}
