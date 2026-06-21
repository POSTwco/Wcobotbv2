/**
 * Elite BoB Tech Vault — separate auth + workout namespace from regular Cali.
 * Gate: Governor NFT (0.0.9338241) OR athlete.eliteAccess whitelist. No HBAR.
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
} from "./admin-auth.tsx";
import {
  buildEliteWorkoutPlan,
  buildCustomElitePlan,
  exerciseIdsOfElitePlan,
  type EliteWorkoutPlan,
  type EliteSkillTrack,
  type EliteDurationTarget,
  type CaliEquipment,
} from "./elite_generator.tsx";
import {
  LIBRARY_VERSION,
  EXERCISES,
  getLiveExercises,
  getLiveExercise,
  getEliteExercises,
  mergeExercises,
  loadAddedExercises,
} from "./cali_library.tsx";

const GOVERNOR_NFT = "0.0.9338241";
const MIRROR_NODE_URL = "https://mainnet.mirrornode.hedera.com";
const ELITE_CHALLENGE_TTL_MS = 5 * 60 * 1000;
const ELITE_ELIGIBILITY_TTL_MS = 24 * 60 * 60 * 1000;
const ELITE_SESSION_TTL_MS = 24 * 60 * 60 * 1000;
const HEADCOUNT_MODE = !Deno.env.get("BOTB_TOKEN_ID");
const MAX_NOTE_LEN = 280;

function now() { return Date.now(); }

function generateNonce(): string {
  const a = new Uint8Array(32);
  crypto.getRandomValues(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, "0")).join("");
}

function getClientIp(c: Context): string {
  const xf = c.req.header("X-Forwarded-For") || "";
  return xf.split(",")[0].trim() || c.req.header("CF-Connecting-IP") || "unknown";
}

function getEliteHashSecret(): string {
  const secret = Deno.env.get("BOTB_HASH_SALT") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret || secret.length < 16) {
    throw new Error("Elite hash secret unavailable");
  }
  return secret;
}

function b64url(input: Uint8Array | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
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
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function issueEliteSessionToken(accountId: string): Promise<{ token: string; exp: number }> {
  const secret = getEliteHashSecret();
  const exp = now() + ELITE_SESSION_TTL_MS;
  const tag = await hmacSha256(secret, `elite|${accountId}|${exp}`);
  return { token: `v1.${b64url(accountId)}.${exp}.${b64url(tag)}`, exp };
}

async function verifyEliteSessionToken(token: string): Promise<{ accountId: string; exp: number } | null> {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "v1") return null;
  try {
    const accountId = new TextDecoder().decode(b64urlDecode(parts[1]));
    const exp = Number(parts[2]);
    const providedTag = b64urlDecode(parts[3]);
    if (!isValidHederaAccountId(accountId) || !Number.isFinite(exp) || exp < now()) return null;
    const expectedTag = await hmacSha256(getEliteHashSecret(), `elite|${accountId}|${exp}`);
    if (!constantTimeEqual(providedTag, expectedTag)) return null;
    return { accountId, exp };
  } catch {
    return null;
  }
}

async function fetchHasGovernorNFT(wallet: string): Promise<boolean> {
  try {
    let nextUrl: string | null = `${MIRROR_NODE_URL}/api/v1/accounts/${wallet}/nfts?limit=100`;
    let pages = 0;
    while (nextUrl && pages < 10) {
      const res = await fetch(nextUrl, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) break;
      const data = await res.json();
      for (const nft of data.nfts || []) {
        if (nft.token_id === GOVERNOR_NFT) return true;
      }
      nextUrl = data.links?.next ? `${MIRROR_NODE_URL}${data.links.next}` : null;
      pages++;
    }
  } catch (e) {
    console.log(`[ELITE-NFT] check failed for ${wallet}: ${e}`);
  }
  return false;
}

async function isEliteWhitelisted(wallet: string): Promise<boolean> {
  try {
    const athletes: any[] = await kv.getByPrefix("athlete:") || [];
    for (const a of athletes) {
      if (a?.wallet === wallet && a?.eliteAccess === true) return true;
    }
  } catch (e) {
    console.log(`[ELITE-WL] scan failed: ${e}`);
  }
  return false;
}

async function checkEliteAccess(wallet: string): Promise<{ allowed: boolean; via: "governor" | "whitelist" | null }> {
  if (await fetchHasGovernorNFT(wallet)) return { allowed: true, via: "governor" };
  if (await isEliteWhitelisted(wallet)) return { allowed: true, via: "whitelist" };
  return { allowed: false, via: null };
}

interface EliteEligibilityRecord {
  accountId: string;
  accessVia: "governor" | "whitelist";
  checkedAt: number;
  expiresAt: number;
}

async function setEliteEligibility(accountId: string, accessVia: "governor" | "whitelist"): Promise<EliteEligibilityRecord> {
  const record: EliteEligibilityRecord = { accountId, accessVia, checkedAt: now(), expiresAt: now() + ELITE_ELIGIBILITY_TTL_MS };
  await kv.set(`elite:eligible:${accountId}`, record);
  return record;
}

async function getEliteEligibility(accountId: string): Promise<EliteEligibilityRecord | null> {
  try {
    const rec: any = await kv.get(`elite:eligible:${accountId}`);
    if (!rec || rec.expiresAt < now() || rec.accountId !== accountId) return null;
    return rec as EliteEligibilityRecord;
  } catch {
    return null;
  }
}

export async function requireEliteSession(c: Context, next: Next) {
  const token = (c.req.header("X-Elite-Session") || "").trim();
  const payload = await verifyEliteSessionToken(token);
  if (!payload) {
    return c.json({ success: false, error: "Elite session required. Re-verify your wallet.", code: "ELITE_SESSION_REQUIRED" }, 401);
  }
  const eligibility = await getEliteEligibility(payload.accountId);
  if (!eligibility) {
    return c.json({ success: false, error: "Elite eligibility expired. Re-verify.", code: "ELITE_ELIGIBILITY_EXPIRED" }, 401);
  }
  const access = await checkEliteAccess(payload.accountId);
  if (!access.allowed) {
    await kv.del(`elite:eligible:${payload.accountId}`).catch(() => {});
    return c.json({ success: false, error: "Elite access revoked.", code: "ELITE_ACCESS_DENIED" }, 403);
  }
  c.set("eliteAccountId", payload.accountId);
  c.set("eliteEligibility", eligibility);
  await next();
}

interface EliteProfile {
  equipment: CaliEquipment[];
  skillTrack: Exclude<EliteSkillTrack, "auto">;
  durationTarget: EliteDurationTarget;
  displayName: string;
}

const DEFAULT_PROFILE: EliteProfile = {
  equipment: ["bar", "none"],
  skillTrack: "static",
  durationTarget: 90,
  displayName: "",
};

async function loadOrInitEliteProfile(accountId: string): Promise<EliteProfile> {
  try {
    const raw: any = await kv.get(`elite:user:${accountId}:profile`);
    if (raw && Array.isArray(raw.equipment)) {
      return { ...DEFAULT_PROFILE, ...raw };
    }
  } catch {}
  const p = { ...DEFAULT_PROFILE };
  await kv.set(`elite:user:${accountId}:profile`, p).catch(() => {});
  return p;
}

async function computeEliteWorkoutId(params: {
  accountId: string;
  seed: string;
  skillTrack: string;
  durationTarget: number;
  equipment: CaliEquipment[];
}): Promise<string> {
  const equipKey = [...params.equipment].sort().join(",");
  const tag = await hmacSha256(getEliteHashSecret(), `elite-wid|${params.accountId}|${params.seed}|${LIBRARY_VERSION}|${params.skillTrack}|${params.durationTarget}|${equipKey}`);
  return b64url(tag);
}

async function loadEliteWorkout(accountId: string, workoutId: string): Promise<EliteWorkoutPlan | null> {
  try {
    const stored: any = await kv.get(`elite:user:${accountId}:workout:${workoutId}`);
    if (!stored || stored.accountId !== accountId || stored.workoutId !== workoutId) return null;
    return stored as EliteWorkoutPlan;
  } catch {
    return null;
  }
}

function applyOverridesToPlan(plan: EliteWorkoutPlan, ov: Record<string, any>) {
  for (const block of plan.blocks || []) {
    for (const item of block.items || []) {
      const live = getLiveExercise(item.exerciseId, ov);
      if (live) {
        if (live.name) item.name = live.name;
        if (live.cues) item.cues = live.cues;
        if ((live as any).description) item.description = (live as any).description;
      }
    }
  }
}

interface ValidatedSet {
  blockIndex: number;
  itemIndex: number;
  setIndex: number;
  exerciseId: string;
  metric: "reps" | "time_sec";
  value: number;
  rpe?: number;
  note?: string;
  loggedAt: number;
}

function validateLoggedSet(raw: any, plan: EliteWorkoutPlan): { value: ValidatedSet } | { error: string; field: string } {
  const blockIndex = Number(raw?.blockIndex);
  const itemIndex = Number(raw?.itemIndex);
  const setIndex = Number(raw?.setIndex);
  if (!Number.isInteger(blockIndex) || blockIndex < 0 || blockIndex >= plan.blocks.length) {
    return { error: "blockIndex out of range", field: "blockIndex" };
  }
  const block = plan.blocks[blockIndex];
  if (!Number.isInteger(itemIndex) || itemIndex < 0 || itemIndex >= block.items.length) {
    return { error: "itemIndex out of range", field: "itemIndex" };
  }
  const item = block.items[itemIndex];
  if (!Number.isInteger(setIndex) || setIndex < 0 || setIndex >= item.sets) {
    return { error: "setIndex out of range", field: "setIndex" };
  }
  const value = Number(raw?.value);
  if (!Number.isFinite(value) || value < 0 || value > 100000) {
    return { error: "value must be 0..100000", field: "value" };
  }
  let rpe: number | undefined;
  if (raw?.rpe != null) {
    const n = Number(raw.rpe);
    if (!Number.isFinite(n) || n < 1 || n > 10) return { error: "rpe must be 1..10", field: "rpe" };
    rpe = Math.round(n * 10) / 10;
  }
  const note = raw?.note != null ? sanitizeString(raw.note, MAX_NOTE_LEN) : undefined;
  return {
    value: {
      blockIndex, itemIndex, setIndex,
      exerciseId: item.exerciseId,
      metric: item.target.metric,
      value: Math.round(value),
      rpe,
      note: note && note.length > 0 ? note : undefined,
      loggedAt: now(),
    },
  };
}

function mergeSets(existing: ValidatedSet[], incoming: ValidatedSet[]): ValidatedSet[] {
  const map = new Map<string, ValidatedSet>();
  const keyOf = (s: ValidatedSet) => `${s.blockIndex}|${s.itemIndex}|${s.setIndex}`;
  for (const s of existing) map.set(keyOf(s), s);
  for (const s of incoming) map.set(keyOf(s), s);
  return Array.from(map.values()).sort((a, b) => a.blockIndex - b.blockIndex || a.itemIndex - b.itemIndex || a.setIndex - b.setIndex);
}

const VALID_TRACKS = new Set(["static", "ascension", "dynamic", "flow", "auto"]);
const VALID_DURATIONS = new Set([60, 90, 120]);
const VALID_EQUIP = new Set(["none", "bar", "rings", "wall"]);

export function mountEliteRoutes(app: Hono, PREFIX: string) {
  // Public preflight — no sensitive detail in response
  app.get(`${PREFIX}/elite/access-check`, async (c) => {
    const wallet = sanitizeString(c.req.query("wallet") || "", 32);
    if (!isValidHederaAccountId(wallet)) {
      return c.json({ success: false, error: "Invalid wallet" }, 400);
    }
    const ip = getClientIp(c);
    const rl = await checkRateLimit(`elite-preflight-ip:${ip}`, 30, 60_000);
    if (rl.limited) return c.json({ success: false, error: "Rate limited", code: "RATE_LIMITED" }, 429);
    const access = await checkEliteAccess(wallet);
    return c.json({ success: true, data: { allowed: access.allowed } });
  });

  app.post(`${PREFIX}/elite/challenge`, async (c) => {
    let body: any;
    try { body = await c.req.json(); } catch { return c.json({ success: false, error: "Invalid JSON" }, 400); }
    const accountId = sanitizeString(body?.accountId, 32);
    if (!isValidHederaAccountId(accountId)) return c.json({ success: false, error: "Invalid wallet" }, 400);

    const ip = getClientIp(c);
    const wRl = await checkRateLimit(`elite-chal-w:${accountId}`, 10, 60_000);
    if (wRl.limited) return c.json({ success: false, error: "Rate limited", code: "RATE_LIMITED" }, 429);
    const ipRl = await checkRateLimit(`elite-chal-ip:${ip}`, 60, 60_000);
    if (ipRl.limited) return c.json({ success: false, error: "Rate limited", code: "RATE_LIMITED" }, 429);

    const nonce = generateNonce();
    const issuedAt = new Date().toISOString();
    const challenge =
      `BOTB-ELITE-VAULT-AUTH\nWallet: ${accountId}\nNonce: ${nonce}\nTimestamp: ${issuedAt}\nAction: Verify Elite Tech Vault access\nExpires: 5 minutes`;

    await kv.set(`elite:nonce:${nonce}`, { nonce, accountId, challenge, createdAt: now(), expiresAt: now() + ELITE_CHALLENGE_TTL_MS });
    return c.json({ success: true, data: { challenge, nonce, expiresAt: now() + ELITE_CHALLENGE_TTL_MS } });
  });

  app.post(`${PREFIX}/elite/verify`, async (c) => {
    let body: any;
    try { body = await c.req.json(); } catch { return c.json({ success: false, error: "Invalid JSON" }, 400); }
    const accountId = sanitizeString(body?.accountId, 32);
    const nonce = sanitizeString(body?.nonce, 128);
    const signature = typeof body?.signature === "string" ? body.signature : "";
    if (!isValidHederaAccountId(accountId) || !nonce || nonce.length < 32 || !signature || signature.length < 16) {
      return c.json({ success: false, error: "Invalid verify payload" }, 400);
    }

    const rl = await checkRateLimit(`elite-verify-w:${accountId}`, 5, 60_000);
    if (rl.limited) return c.json({ success: false, error: "Rate limited", code: "RATE_LIMITED" }, 429);

    const challengeRec: any = await kv.get(`elite:nonce:${nonce}`);
    if (!challengeRec || challengeRec.accountId !== accountId || challengeRec.expiresAt < now()) {
      return c.json({ success: false, error: "Challenge invalid or expired" }, 400);
    }

    if (!(await verifyWalletOnMirrorNode(accountId))) {
      return c.json({ success: false, error: "Wallet not found on Hedera mainnet" }, 400);
    }

    const access = await checkEliteAccess(accountId);
    if (!access.allowed || !access.via) {
      return c.json({
        success: false,
        error: "Elite Vault requires a WCO Governors NFT or admin-granted elite access.",
        code: "ELITE_ACCESS_DENIED",
      }, 403);
    }

    const sigResult = await verifyVoteSignature(accountId, challengeRec.challenge, signature);
    if (!sigResult.valid) {
      const keyKnown = sigResult.keyType === "ED25519" || sigResult.keyType === "ECDSA_SECP256K1";
      if (!(HEADCOUNT_MODE && keyKnown)) {
        return c.json({ success: false, error: "Signature verification failed" }, 400);
      }
    }

    await kv.del(`elite:nonce:${nonce}`).catch(() => {});
    const eligibility = await setEliteEligibility(accountId, access.via);
    const { token, exp } = await issueEliteSessionToken(accountId);

    console.log(`[ELITE-VERIFY] ${accountId} via ${access.via}`);
    return c.json({ success: true, data: { sessionToken: token, expiresAt: exp, eligibility } });
  });

  app.get(`${PREFIX}/elite/session/me`, requireEliteSession, async (c) => {
    const accountId = c.get("eliteAccountId") as string;
    const eligibility = c.get("eliteEligibility");
    return c.json({ success: true, data: { accountId, eligibility } });
  });

  app.get(`${PREFIX}/elite/profile`, requireEliteSession, async (c) => {
    const accountId = c.get("eliteAccountId") as string;
    const profile = await loadOrInitEliteProfile(accountId);
    return c.json({ success: true, data: { profile } });
  });

  app.put(`${PREFIX}/elite/profile`, requireEliteSession, async (c) => {
    const accountId = c.get("eliteAccountId") as string;
    let body: any = {};
    try { body = await c.req.json(); } catch {}
    const cur = await loadOrInitEliteProfile(accountId);
    if (Array.isArray(body?.equipment)) {
      cur.equipment = body.equipment.filter((e: string) => VALID_EQUIP.has(e));
      if (cur.equipment.length === 0) cur.equipment = ["bar", "none"];
    }
    if (body?.skillTrack && VALID_TRACKS.has(body.skillTrack) && body.skillTrack !== "auto") {
      cur.skillTrack = body.skillTrack;
    }
    if (VALID_DURATIONS.has(Number(body?.durationTarget))) {
      cur.durationTarget = Number(body.durationTarget) as EliteDurationTarget;
    }
    if (typeof body?.displayName === "string") {
      cur.displayName = sanitizeString(body.displayName, 64);
    }
    await kv.set(`elite:user:${accountId}:profile`, cur);
    return c.json({ success: true, data: { profile: cur } });
  });

  app.get(`${PREFIX}/elite/exercises`, requireEliteSession, async (c) => {
    const ov = (await kv.get("cali:overrides")) || {};
    const added = await loadAddedExercises(kv);
    const full = mergeExercises(getEliteExercises() as any, added.filter((a: any) => a.level === 4), ov as any);
    return c.json({ success: true, data: { exercises: full, libraryVersion: LIBRARY_VERSION } });
  });

  app.post(`${PREFIX}/elite/workout/generate`, requireEliteSession, async (c) => {
    const accountId = c.get("eliteAccountId") as string;
    const rl = await checkRateLimit(`elite-gen:${accountId}`, 6, 60 * 60 * 1000);
    if (rl.limited) return c.json({ success: false, error: "Rate limited", code: "RATE_LIMITED" }, 429);

    let body: any = {};
    try { body = await c.req.json(); } catch {}
    const profile = await loadOrInitEliteProfile(accountId);
    const skillTrack = VALID_TRACKS.has(body?.skillTrack) ? body.skillTrack as EliteSkillTrack : profile.skillTrack;
    const durationTarget = VALID_DURATIONS.has(Number(body?.durationTarget)) ? Number(body.durationTarget) as EliteDurationTarget : profile.durationTarget;
    const equipment = Array.isArray(body?.equipment)
      ? body.equipment.filter((e: string) => VALID_EQUIP.has(e))
      : profile.equipment;

    const seed = generateNonce();
    const workoutId = await computeEliteWorkoutId({ accountId, seed, skillTrack, durationTarget, equipment });
    const ov = (await kv.get("cali:overrides")) || {};
    const added = await loadAddedExercises(kv);
    const pool = mergeExercises(EXERCISES as any, added, ov as any).filter((e: any) => e.level === 4 || e.category === "mobility");

    const plan = buildEliteWorkoutPlan({
      accountId, skillTrack, durationTarget, equipment, seed, workoutId,
    }, pool as any);
    applyOverridesToPlan(plan, ov as any);
    await kv.set(`elite:user:${accountId}:workout:${workoutId}`, plan);
    return c.json({ success: true, data: { workout: plan } });
  });

  app.post(`${PREFIX}/elite/workout/custom`, requireEliteSession, async (c) => {
    const accountId = c.get("eliteAccountId") as string;
    const rl = await checkRateLimit(`elite-custom:${accountId}`, 10, 60 * 60 * 1000);
    if (rl.limited) return c.json({ success: false, error: "Rate limited", code: "RATE_LIMITED" }, 429);

    let body: any;
    try { body = await c.req.json(); } catch { return c.json({ success: false, error: "Invalid JSON" }, 400); }
    if (!Array.isArray(body?.slots) || body.slots.length === 0) {
      return c.json({ success: false, error: "slots array required" }, 400);
    }
    if (body.slots.length > 20) return c.json({ success: false, error: "Max 20 exercises" }, 400);

    const profile = await loadOrInitEliteProfile(accountId);
    const skillTrack = VALID_TRACKS.has(body?.skillTrack) && body.skillTrack !== "auto"
      ? body.skillTrack : profile.skillTrack;
    const durationTarget = VALID_DURATIONS.has(Number(body?.durationTarget))
      ? Number(body.durationTarget) : profile.durationTarget;
    const equipment = profile.equipment;
    const seed = generateNonce();
    const workoutId = await computeEliteWorkoutId({ accountId, seed, skillTrack, durationTarget, equipment });

    const ov = (await kv.get("cali:overrides")) || {};
    const added = await loadAddedExercises(kv);
    const pool = mergeExercises(getEliteExercises() as any, added.filter((a: any) => a.level === 4), ov as any);

    const slots = body.slots.map((s: any) => ({
      exerciseId: sanitizeString(s?.exerciseId, 64),
      sets: Number(s?.sets) || 3,
    }));

    const result = buildCustomElitePlan({
      accountId, workoutId, skillTrack, durationTarget, equipment, seed, slots, exercises: pool as any,
    });
    if ("error" in result) return c.json({ success: false, error: result.error }, 400);

    applyOverridesToPlan(result, ov as any);
    await kv.set(`elite:user:${accountId}:workout:${workoutId}`, result);
    return c.json({ success: true, data: { workout: result } });
  });

  app.get(`${PREFIX}/elite/workout/:id`, requireEliteSession, async (c) => {
    const accountId = c.get("eliteAccountId") as string;
    const workoutId = sanitizeString(c.req.param("id"), 128);
    const plan = await loadEliteWorkout(accountId, workoutId);
    if (!plan) return c.json({ success: false, error: "Workout not found" }, 404);
    return c.json({ success: true, data: { workout: plan } });
  });

  app.post(`${PREFIX}/elite/workout/:id/log`, requireEliteSession, async (c) => {
    const accountId = c.get("eliteAccountId") as string;
    const workoutId = sanitizeString(c.req.param("id"), 128);
    let body: any;
    try { body = await c.req.json(); } catch { return c.json({ success: false, error: "Invalid JSON" }, 400); }

    const plan = await loadEliteWorkout(accountId, workoutId);
    if (!plan) return c.json({ success: false, error: "Workout not found" }, 404);
    if (!Array.isArray(body?.sets) || body.sets.length > 100) {
      return c.json({ success: false, error: "Invalid sets array" }, 400);
    }

    const cleaned: ValidatedSet[] = [];
    for (let i = 0; i < body.sets.length; i++) {
      const r = validateLoggedSet(body.sets[i], plan);
      if ("error" in r) return c.json({ success: false, error: `sets[${i}]: ${r.error}` }, 400);
      cleaned.push(r.value);
    }

    const nowIso = new Date().toISOString();
    let completedAt = nowIso;
    if (typeof body?.completedAt === "string") {
      const parsed = Date.parse(body.completedAt);
      if (Number.isFinite(parsed)) completedAt = parsed > Date.now() ? nowIso : new Date(parsed).toISOString();
    }
    const dateKey = completedAt.slice(0, 10);
    const logKey = `elite:user:${accountId}:log:${dateKey}:${workoutId}`;
    const existing: any = await kv.get(logKey);
    const log = existing?.workoutId === workoutId
      ? existing
      : { workoutId, accountId, dateKey, sets: [], completedAt: null, updatedAt: now() };
    log.sets = mergeSets(log.sets, cleaned);
    log.updatedAt = now();
    if (body?.completed === true) log.completedAt = completedAt;
    await kv.set(logKey, log);

    return c.json({ success: true, data: { log } });
  });

  app.get(`${PREFIX}/elite/history`, requireEliteSession, async (c) => {
    const accountId = c.get("eliteAccountId") as string;
    const prefix = `elite:user:${accountId}:log:`;
    const all: any[] = await kv.getByPrefix(prefix) || [];
    const items = all
      .filter((l) => l?.workoutId)
      .map((l) => ({
        workoutId: l.workoutId,
        dateKey: l.dateKey,
        completedAt: l.completedAt,
        totalSets: (l.sets || []).length,
        updatedAt: l.updatedAt,
      }))
      .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
      .slice(0, 20);
    return c.json({ success: true, data: { items, total: items.length } });
  });

  console.log("[ELITE] Routes mounted under /elite/*");
}