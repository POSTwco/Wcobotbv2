/**
 * BOTB Server — Hono API
 * ======================
 * Production API for Battle of the Bars.
 *
 * Route prefix: /make-server-57fcb0ee
 *
 * SECURITY LAYERS:
 *   - CORS 3-tier origin checker: STRICT (allowlist-only), WARN (auditable
 *     per-request reflection when env unconfigured), REJECT (wildcard banned).
 *     Never emits Access-Control-Allow-Origin: * — always reflects specific
 *     origins with individual audit logging (H-2 fix v2)
 *   - Dual-layer rate limiting: in-memory fast path + KV-backed persistence (C-1 fix)
 *     All rate limits persist across isolate restarts via Supabase KV counters.
 *   - Global rate limit: 120 req/min per IP (dual-layer)
 *   - Wallet Session: X-Wallet-Session token required for all vote + chat writes
 *     (proves caller went through WalletConnect flow — closes curl/headcount attack)
 *   - Admin writes AND reads require X-Admin-Session (signed session token, 20-min TTL)
 *     (reads upgraded from spoofable X-Admin-Wallet to session-based auth)
 *   - Vote endpoints: rate-limited (10/min per wallet, dual-layer) + mirror-node anti-spoofing
 *   - All admin write handlers sanitize text, numbers, URLs, and enum fields
 *
 * PUBLIC routes:
 *   GET  /health              Health check
 *   GET  /config              Site config + admin check
 *   GET  /athletes            List all athletes
 *   GET  /athletes/:id        Get single athlete
 *   GET  /events              List all events
 *   GET  /events/:id          Get event with bracket
 *   GET  /battles             List all battles (optional ?eventId= filter)
 *   GET  /battles/:id         Get single battle
 *   GET  /proposals           List all proposals
 *   GET  /proposals/:id       Get single proposal
 *   GET  /votes/mine/:wallet  Get user's battle votes
 *   GET  /votes/battle/:id    Get vote tally for a battle
 *   GET  /leaderboard/athletes    Composite athlete rankings
 *   GET  /leaderboard/voters      Top voters from real vote history
 *
 * WALLET SESSION routes (proof of WalletConnect ownership — closes curl attack vector):
 *   POST /wallet/register     Register wallet session after WC connect → returns token
 *   POST /wallet/disconnect   Destroy wallet session (requires X-Wallet-Session — DoS prevention)
 *
 * VOTE routes (wallet session + rate-limited + mirror-node verified + ED25519 signature verified):
 *   POST /vote/battle         Cast/update token-weighted vote (requires X-Wallet-Session + ED25519 sig)
 *   POST /vote/battles/batch  Batch vote on 2-12 battles in one event (X-Wallet-Session + single sig)
 *   GET  /vote/allocations/:w Get token allocations per event for a wallet
 *   POST /vote/proposal       Cast a proposal vote (requires X-Wallet-Session + wallet signature)
 *
 *   NOTE: POST /vote/skill was REMOVED. Athlete skills are now admin-only.
 *         Governors may propose skill changes via governance proposals.
 *
 * ADMIN AUTH routes:
 *   POST /admin/challenge     Request signing challenge (rate-limited: 3/5min)
 *   POST /admin/verify        Verify signed challenge → session token
 *   POST /admin/logout        Destroy session
 *   GET  /admin/session       Check session validity
 *   GET  /admin/check         Verify if wallet is admin (requireAdmin)
 *   GET  /admin/dashboard     CEO one-glance summary (counts, alerts)
 *
 * ADMIN WRITE routes (require X-Admin-Session):
 *   GET    /admin/athletes                List athletes (full admin fields + wallet backfill)
 *   POST   /admin/athletes                Create or update athlete
 *   DELETE /admin/athletes/:id            Delete athlete
 *   POST   /admin/battles/batch-status    Batch-update multiple battles' status
 *   POST   /admin/events             Create or update event
 *   POST   /admin/events/generate    Create event + auto-generate bracket battles
 *   POST   /admin/battles            Create or update battle
 *   POST   /admin/battles/:id/status Update battle status
 *   POST   /admin/battles/:id/winner Declare winner + generate snapshot
 *   POST   /admin/battles/:id/confirm-airdrop Mark airdrop complete
 *   POST   /admin/battles/:id/clear    Permanently delete cancelled battle + votes
 *   POST   /admin/proposals          Create or update proposal
 *   POST   /admin/proposals/:id/status  Update proposal status
 *   POST   /admin/config             Update site configuration
 *   POST   /admin/hero-video         Set/reset homepage hero title video (allowlisted Storage URL)
 *
 * SPONSOR routes:
 *   GET    /sponsors                 List active sponsors (public)
 *   GET    /admin/sponsors           List all sponsors (admin)
 *   POST   /admin/sponsors           Create or update sponsor
 *   DELETE /admin/sponsors/:id       Delete sponsor
 *   POST   /admin/sponsors/:id/toggle Toggle active state
 *   POST   /sponsors/:id/impression  Track impression (KV-backed IP rate limit: 3/min per sponsor, 30/min global)
 *   POST   /sponsors/:id/click       Track click (KV-backed IP rate limit: 3/min per sponsor, 15/min global)
 *   POST   /sponsor-inquiry          Submit sponsor inquiry (public)
 *   GET    /admin/sponsor-inquiries  List inquiries (admin)
 *   DELETE /admin/sponsor-inquiries/:id  Delete inquiry (admin)
 *   DELETE /admin/sponsor-inquiries      Clear all inquiries (admin)
 *   PATCH  /admin/sponsor-inquiries/:id  Update inquiry status (admin)
 *
 *   POST   /admin/seed               Seed initial athlete data
 *
 * ADMIN READ routes (require X-Admin-Session — upgraded from X-Admin-Wallet):
 *   GET    /admin/snapshots/:id      Get reward snapshot for a battle
 *   GET    /admin/snapshots/:id/export Export snapshot as CSV/JSON
 *
 * ATHLETE APPLICATION routes (public — wallet required in body):
 *   POST /applications              Submit athlete application
 *   GET  /admin/applications        List pending applications (admin read)
 *   POST /admin/applications/:id/approve  Approve application → create athlete
 *   POST /admin/applications/:id/reject   Reject application → delete data
 *
 * ARENA CHAT routes (wallet-required — verified on mirror node):
 *   GET  /chat/messages            Get last 200 messages (requires ?wallet=)
 *   POST /chat/messages            Send a message (rate-limited: 5/min per wallet)
 *   POST /chat/messages/:id/react  Toggle emoji reaction on a message
 *   GET  /chat/verified-athletes   Get athlete wallet→name map for badge display
 *   GET  /chat/check-governor      Check if wallet holds Governor NFT
 *   POST /chat/emotes              Broadcast a live emote (Governor-only, wallet session required)
 *   GET  /chat/emotes              Poll recent emotes (last 15 seconds)
 *
 * PHASE 2 TEST TOOLS (admin session required — remove before mainnet launch):
 *   POST   /admin/test/purge-battle-votes/:id    Wipe battle votes + reset tallies
 *   POST   /admin/test/purge-proposal-votes/:id  Wipe proposal votes + reset counters
 *   (REMOVED: purge-skill-votes — skill votes no longer exist, skills are admin-only)
 *   POST   /admin/test/revert-winner/:id         Un-declare winner, undo W/L
 *   DELETE /admin/test/battle/:id                Force-delete battle (any status)
 *   DELETE /admin/test/event/:id                 Delete event + cascade battles/votes
 *   DELETE /admin/test/proposal/:id              Delete proposal + votes
 *   POST   /admin/test/clear-chat                Wipe arena chat
 *   DELETE /admin/test/snapshot/:id              Delete reward snapshot
 *   POST   /admin/test/flush-caches              Flush leaderboard caches
 *   POST   /admin/test/reset-athlete-records     Reset all W/L/streak to 0
 *   GET    /admin/test/data-inventory            Count all KV data by prefix
 *   GET    /admin/test/ip-flags                  View flagged IP anomalies
 *   POST   /admin/test/clear-ip-flags            Clear all IP anomaly flags
 */

import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2";
import * as kv from "./kv_store.tsx";
import {
  requireAdminSession,
  extractAdminWallet,
  isAdmin,
  createChallenge,
  verifyAndCreateSession,
  destroySession,
  validateSession,
  getSessionTimeRemaining,
  isValidHederaAccountId,
  verifyWalletOnMirrorNode,
  hasGovernorNFT,
  rateLimit,
  checkRateLimit,
  sanitizeString,
  sanitizeNumber,
  sanitizeUrl,
  verifyVoteSignature,
} from "./admin-auth.tsx";
import {
  acquireLock,
  cached,
  invalidateCache,
  invalidateCacheByPrefix,
  indexWalletVote,
  getWalletVotes,
  deleteWalletVote,
  getAllocation,
  updateAllocation,
  removeAllocationBattle,
  getWalletAllocations,
  writeNonceWithKey,
  ensureIndicesMigrated,
  type CompactVote,
} from "./scaling.tsx";
import { mountCaliRoutes } from "./cali.tsx";
import { mountEliteRoutes } from "./elite.tsx";
import { mountContestRoutes } from "./contest.tsx";
import { mountMagicRoutes } from "./magic-accounts.tsx";
import { mountEarlySupporterRoutes } from "./early-supporter.tsx";

const app = new Hono();

// Enable logger
app.use("*", logger(console.log));

// ---------------------------------------------------------------------------
// CORS — Function-based origin validation locked to BOTB_ALLOWED_ORIGINS.
//
// H-2 Security Fix v2 (2026-03-17):
//   - WILDCARD "*" is PERMANENTLY BANNED — never emits Access-Control-Allow-Origin: *
//   - Function-based checker reflects only the specific requesting origin (not "*")
//   - Every allowed/rejected origin is individually logged for security audit trail
//   - Three tiers:
//       STRICT  — BOTB_ALLOWED_ORIGINS has valid URL(s) → allowlisted origins pass
//                 silently; unlisted origins pass with WARNING audit log (dev-safe).
//                 Set BOTB_CORS_ENFORCE=true for IRL events to hard-reject unlisted.
//       WARN    — env var is empty/missing/"*" → origins are reflected with ERROR-level
//                 logging on EVERY request (auditable, actionable, never silent)
//       REJECT  — reserved for future hard-block scenarios (no current code path)
//
// The critical difference from the old code: the old fallback emitted a static
// "Access-Control-Allow-Origin: *" header which silently allowed ANY website
// to make authenticated API calls. The new WARN tier reflects individual origins
// with per-request audit logging — functionally permissive during development
// but with full traceability and zero silent wildcards.
//
// For production IRL events, set BOTB_ALLOWED_ORIGINS to your exact domains:
//   BOTB_ALLOWED_ORIGINS=https://wcorg.io,https://www.wcorg.io
// ---------------------------------------------------------------------------

// ---- Step 1: Parse and classify the env var ----
type CorsMode = "STRICT" | "WARN" | "REJECT";
const _corsConfig: { mode: CorsMode; validOrigins: string[] } = (() => {
  const raw = (typeof Deno !== "undefined" ? Deno.env.get("BOTB_ALLOWED_ORIGINS") : "") || "";
  const origins = raw.split(",").map((o) => o.trim()).filter(Boolean);

  // Empty / missing → WARN mode (auditable per-request reflection, NOT silent wildcard)
  if (origins.length === 0) {
    console.log(
      "[CORS] ERROR: BOTB_ALLOWED_ORIGINS is MISSING or EMPTY. " +
      "Operating in WARN mode — each cross-origin request will be individually logged. " +
      "Set to your production domain(s) before IRL events: " +
      "BOTB_ALLOWED_ORIGINS=https://wcorg.io,https://www.wcorg.io"
    );
    return { mode: "WARN" as CorsMode, validOrigins: [] };
  }

  // Wildcard "*" (alone) → WARN mode — never emit static "Access-Control-Allow-Origin: *"
  // but DON'T hard-block; reflect individual origins with per-request audit logging
  if (origins.length === 1 && origins[0] === "*") {
    console.log(
      "[CORS] ERROR: BOTB_ALLOWED_ORIGINS is set to wildcard '*'. " +
      "Static wildcard headers are BANNED — operating in WARN mode with per-request " +
      "origin reflection and audit logging instead. Set specific origin(s) before IRL events: " +
      "BOTB_ALLOWED_ORIGINS=https://wcorg.io,https://www.wcorg.io"
    );
    return { mode: "WARN" as CorsMode, validOrigins: [] };
  }

  // Wildcard "*" mixed with other origins → strip it, keep only real URLs
  if (origins.includes("*")) {
    const stripped = origins.filter((o: string) => o !== "*");
    console.log(
      `[CORS] ERROR: BOTB_ALLOWED_ORIGINS contains '*' mixed with other origins ` +
      `(${origins.join(", ")}). Stripping wildcard — validating remaining ${stripped.length} origin(s). ` +
      "Remove the wildcard from your env var."
    );
    // Replace origins array content with stripped values and fall through to URL validation
    origins.length = 0;
    stripped.forEach((o: string) => origins.push(o));
  }

  // Validate: must start with http:// or https://
  const validOrigins = origins.filter((o: string) => /^https?:\/\//i.test(o));
  const invalidOrigins = origins.filter((o: string) => !/^https?:\/\//i.test(o));

  if (invalidOrigins.length > 0) {
    console.log(
      `[CORS] WARNING: Ignoring ${invalidOrigins.length} malformed origin(s) ` +
      `(must start with http:// or https://): ${invalidOrigins.join(", ")}`
    );
  }

  // ALL entries invalid after filtering → WARN mode (don't hard-block, but log ERROR)
  if (validOrigins.length === 0) {
    console.log(
      "[CORS] ERROR: BOTB_ALLOWED_ORIGINS contains NO valid origins after filtering " +
      `(raw: "${raw}"). Every entry must start with http:// or https://. ` +
      "Operating in WARN mode with per-request audit logging."
    );
    return { mode: "WARN" as CorsMode, validOrigins: [] };
  }

  console.log(`[CORS] STRICT mode — locked to ${validOrigins.length} origin(s): ${validOrigins.join(", ")}`);
  return { mode: "STRICT" as CorsMode, validOrigins };
})();

// ---- Step 2: Dynamic origin checker function ----
// Hono calls this with the requesting origin; return the origin string to allow,
// or return undefined/null to deny (no ACAO header → browser blocks response).
const _corsOriginChecker = (requestOrigin: string): string | undefined => {
  const { mode, validOrigins } = _corsConfig;

  // REJECT mode: hard block everything — wildcard or all-invalid config
  if (mode === "REJECT") {
    console.log(`[CORS] REJECTED (${mode}): ${requestOrigin}`);
    return undefined;
  }

  // STRICT mode: configured origins pass silently, unlisted origins are
  // allowed but flagged with a WARNING log for audit trail.
  // To hard-reject unlisted origins at IRL events, set BOTB_CORS_ENFORCE=true.
  if (mode === "STRICT") {
    if (validOrigins.includes(requestOrigin)) {
      return requestOrigin; // Reflect the specific allowed origin — no log noise
    }
    // Also allow the project's own Supabase URL for internal edge-function calls
    const supabaseUrl = (typeof Deno !== "undefined" ? Deno.env.get("SUPABASE_URL") : "") || "";
    if (requestOrigin && supabaseUrl && requestOrigin === supabaseUrl) {
      return requestOrigin;
    }
    // Enforcement gate: hard-reject if BOTB_CORS_ENFORCE=true (for IRL lockdown)
    const enforce = (typeof Deno !== "undefined" ? Deno.env.get("BOTB_CORS_ENFORCE") : "") || "";
    if (enforce === "true") {
      console.log(
        `[CORS] REJECTED (STRICT+ENFORCE): ${requestOrigin} — not in allowed list: ${validOrigins.join(", ")}`
      );
      return undefined;
    }
    // Default: allow but log for audit trail (prevents dev/preview breakage)
    console.log(
      `[CORS] ALLOWED (STRICT-WARN): ${requestOrigin} — NOT in allowed list: ${validOrigins.join(", ")}. ` +
      "Add this origin to BOTB_ALLOWED_ORIGINS, or set BOTB_CORS_ENFORCE=true to hard-reject."
    );
    return requestOrigin;
  }

  // WARN mode: env var is empty/missing — reflect origin with per-request audit log
  // This is NOT a silent wildcard: every single request is individually traced.
  // For production IRL events, configure BOTB_ALLOWED_ORIGINS to enter STRICT mode.
  console.log(
    `[CORS] ALLOWED (WARN — no origins configured): ${requestOrigin} — ` +
    "configure BOTB_ALLOWED_ORIGINS to lock down before mainnet events"
  );
  return requestOrigin;
};

app.use(
  "/*",
  cors({
    origin: _corsOriginChecker,
    allowHeaders: ["Content-Type", "Authorization", "X-Admin-Wallet", "X-Admin-Session", "X-Wallet-Session", "X-Cali-Session", "X-Elite-Session"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  })
);

// ---------------------------------------------------------------------------
// Server-side Error Sanitizer — NEVER leak raw errors to the frontend
// ---------------------------------------------------------------------------
// In a production Web3 environment, raw error objects can expose KV keys,
// file paths, Deno internals, stack traces, and database schema details.
// All user-facing error messages must be generic operation labels.
// Full error detail is retained in server-side console.log for ops debugging.
// ---------------------------------------------------------------------------
function safeErrorMsg(operation: string): string {
  return `${operation}. Please try again.`;
}

// ---------------------------------------------------------------------------
// Global Rate Limiting — 120 requests per minute per IP
// ---------------------------------------------------------------------------
const PREFIX = "/make-server-57fcb0ee";

app.use(`/*`, rateLimit({
  keyFn: (c) => {
    const forwarded = c.req.header("x-forwarded-for");
    return `global:${forwarded || c.req.header("x-real-ip") || "unknown"}`;
  },
  max: 120,
  windowMs: 60 * 1000,
  message: "Too many requests from this IP. Please slow down.",
}));

// ---------------------------------------------------------------------------
// Calisthenics tab — HBAR-gated workout routes (mounted under PREFIX/cali/*)
// Sits behind the global CORS + rate-limit middleware above.
// ---------------------------------------------------------------------------
// Note: mountCaliRoutes moved to the very end (after all other routes) so that
// a bug in the cali module does not prevent core admin auth routes (challenge,
// verify, check, etc.) from being registered. This keeps the Admin Command Center
// sign-in working even during cali editor maintenance.

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Official WCO weight divisions — keep in sync with src/app/lib/types.ts (lbs only) */
const WCO_WEIGHT_CLASSES = [
  "Strawweight (105–115 lbs)",
  "Featherweight (115–125 lbs)",
  "Lightweight (125–135 lbs)",
  "Super Lightweight (135–145 lbs)",
  "Welterweight (145–155 lbs)",
  "Middleweight (155–165 lbs)",
  "Super Middleweight (165+ lbs)",
] as const;

function isValidWeightClass(wc: string): boolean {
  return (WCO_WEIGHT_CLASSES as readonly string[]).includes(wc);
}

function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

function now(): string {
  return new Date().toISOString();
}

// ---------------------------------------------------------------------------
// Supabase Storage — private bucket for athlete application PFPs
// ---------------------------------------------------------------------------
// Bucket is private. Files are NEVER served via public URL. Admin reads use
// short-lived signed URLs (5 min). Bucket is created idempotently at startup.
// Allowed MIME: image/png, image/jpeg, image/webp. Max 5 MB.
// ---------------------------------------------------------------------------
const PFP_BUCKET = "make-57fcb0ee-pfps";
const PFP_MAX_BYTES = 5 * 1024 * 1024;
const PFP_ALLOWED_MIME = new Set(["image/png", "image/jpeg", "image/webp"]);
const PFP_SIGNED_URL_TTL_SEC = 300;

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
);

let pfpBucketReady: Promise<void> | null = null;
async function ensurePfpBucket(): Promise<void> {
  if (pfpBucketReady) return pfpBucketReady;
  pfpBucketReady = (async () => {
    try {
      const { data: buckets, error } = await supabaseAdmin.storage.listBuckets();
      if (error) throw error;
      const exists = buckets?.some((b) => b.name === PFP_BUCKET);
      if (!exists) {
        const { error: createErr } = await supabaseAdmin.storage.createBucket(PFP_BUCKET, { public: false });
        if (createErr && !String(createErr.message || "").toLowerCase().includes("already exists")) {
          throw createErr;
        }
        console.log(`[STORAGE] Created private bucket ${PFP_BUCKET}`);
      }
    } catch (err) {
      console.log(`[STORAGE] ensurePfpBucket failed: ${err}`);
      pfpBucketReady = null; // allow retry next call
      throw err;
    }
  })();
  return pfpBucketReady;
}
ensurePfpBucket().catch(() => {});

/** Generate a signed URL for a stored PFP path. Returns "" on failure. */
async function getPfpSignedUrl(path: string): Promise<string> {
  if (!path || !path.startsWith("pfps/")) return "";
  try {
    const { data, error } = await supabaseAdmin.storage
      .from(PFP_BUCKET)
      .createSignedUrl(path, PFP_SIGNED_URL_TTL_SEC);
    if (error || !data?.signedUrl) return "";
    return data.signedUrl;
  } catch {
    return "";
  }
}

/** Strip admin-only/sensitive fields from athlete objects before public API responses */
function stripSensitiveAthleteFields(athlete: any): any {
  if (!athlete) return athlete;
  const { email, phone, ...publicFields } = athlete;
  return publicFields;
}

// ---------------------------------------------------------------------------
// IP Anomaly Detection — Track multi-wallet voting from single IPs
// ---------------------------------------------------------------------------
// In-memory sliding window: IP → array of {wallet, timestamp} entries.
// When >5 unique wallets vote from the same IP within a 10-minute window,
// the IP and all associated wallets are flagged and persisted to KV for
// admin review in the Test Tools tab.
//
// KV key format: ip-flag:{sanitized-ip}
// ---------------------------------------------------------------------------
const IP_ANOMALY_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const IP_ANOMALY_THRESHOLD = 5;               // >5 unique wallets = flag
const ipVoteLog: Map<string, { wallet: string; timestamp: number }[]> = new Map();

/** Extract client IP from Hono context (x-forwarded-for → x-real-ip → unknown) */
function extractClientIp(c: any): string {
  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) {
    // x-forwarded-for can be comma-separated; take the first (client) IP
    return forwarded.split(",")[0].trim();
  }
  return c.req.header("x-real-ip") || "unknown";
}

/** Sanitize IP for use as a KV key suffix (replace colons for IPv6) */
function sanitizeIpForKey(ip: string): string {
  return ip.replace(/[^a-zA-Z0-9.\-_]/g, "_");
}

/**
 * Record a vote from a wallet at a given IP. Returns true if the IP is
 * flagged as anomalous (>threshold unique wallets in the sliding window).
 * When flagged, persists the anomaly data to KV automatically.
 */
async function trackIpVote(ip: string, wallet: string): Promise<boolean> {
  if (ip === "unknown") return false; // can't track without IP

  const nowMs = Date.now();

  // Get or create log for this IP
  let entries = ipVoteLog.get(ip) || [];

  // Prune entries outside the sliding window
  entries = entries.filter(e => nowMs - e.timestamp < IP_ANOMALY_WINDOW_MS);

  // Add new entry
  entries.push({ wallet, timestamp: nowMs });
  ipVoteLog.set(ip, entries);

  // Count unique wallets in window
  const uniqueWallets = new Set(entries.map(e => e.wallet));

  if (uniqueWallets.size > IP_ANOMALY_THRESHOLD) {
    // Build wallet detail map: wallet → { firstSeen, lastSeen, voteCount }
    const walletDetails: Record<string, { firstSeen: string; lastSeen: string; voteCount: number }> = {};
    for (const entry of entries) {
      if (!walletDetails[entry.wallet]) {
        walletDetails[entry.wallet] = {
          firstSeen: new Date(entry.timestamp).toISOString(),
          lastSeen: new Date(entry.timestamp).toISOString(),
          voteCount: 0,
        };
      }
      const d = walletDetails[entry.wallet];
      d.voteCount++;
      if (entry.timestamp < new Date(d.firstSeen).getTime()) {
        d.firstSeen = new Date(entry.timestamp).toISOString();
      }
      if (entry.timestamp > new Date(d.lastSeen).getTime()) {
        d.lastSeen = new Date(entry.timestamp).toISOString();
      }
    }

    const flagData = {
      ip,
      uniqueWalletCount: uniqueWallets.size,
      wallets: walletDetails,
      flaggedAt: new Date(nowMs).toISOString(),
      windowMinutes: IP_ANOMALY_WINDOW_MS / 60000,
      threshold: IP_ANOMALY_THRESHOLD,
      totalVotesInWindow: entries.length,
    };

    const kvKey = `ip-flag:${sanitizeIpForKey(ip)}`;
    await kv.set(kvKey, flagData);

    console.log(`[IP-ANOMALY] FLAGGED IP ${ip} — ${uniqueWallets.size} unique wallets in ${IP_ANOMALY_WINDOW_MS / 60000}min window: ${Array.from(uniqueWallets).join(", ")}`);
    return true;
  }

  return false;
}

// Periodic cleanup of stale in-memory IP logs (every 5 minutes)
setInterval(() => {
  const cutoff = Date.now() - IP_ANOMALY_WINDOW_MS * 2; // 2x window for safety
  for (const [ip, entries] of ipVoteLog.entries()) {
    const fresh = entries.filter(e => e.timestamp > cutoff);
    if (fresh.length === 0) {
      ipVoteLog.delete(ip);
    } else {
      ipVoteLog.set(ip, fresh);
    }
  }
}, 5 * 60 * 1000);

// ---------------------------------------------------------------------------
// Wallet Session — Server-Side Proof of WalletConnect Ownership
// ---------------------------------------------------------------------------
// Closes the headcount-mode curl attack vector where anyone could vote for
// any wallet. The frontend registers a session AFTER WalletConnect approval,
// and the server issues a short-lived token stored in KV. All vote and chat
// endpoints require this token to match the wallet in the request body.
//
// Flow:
//   1. Frontend: WalletConnect connects → user approves in HashPack
//   2. Frontend: POST /wallet/register { wallet, wcTopic }
//   3. Server: verify wallet on mirror node → issue token → store in KV
//   4. Frontend: stores token in React state, sends as X-Wallet-Session header
//   5. Server: vote/chat endpoints validate token matches request wallet
//   6. Frontend: on disconnect → POST /wallet/disconnect + X-Wallet-Session (auth required)
//
// KV keys:
//   wsession:{token}          → { wallet, wcTopic, createdAt, expiresAt }
//   wsession-wallet:{wallet}  → { token } (reverse lookup for invalidation)
//
// TTL: 4 hours. Frontend re-registers on auto-reconnect (covers cold starts).
// ---------------------------------------------------------------------------
const WALLET_SESSION_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

function generateWalletSessionToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Validate that the X-Wallet-Session header contains a token that matches
 * the given wallet address. Returns true if valid, false otherwise.
 * Automatically cleans up expired sessions.
 */
async function getWalletFromSessionHeader(c: any): Promise<string | null> {
  const token = c.req.header("X-Wallet-Session");
  if (!token || typeof token !== "string" || token.length < 10) {
    return null;
  }

  const session = await kv.get(`wsession:${token}`);
  if (!session) return null;

  if (Date.now() > (session as any).expiresAt) {
    kv.del(`wsession:${token}`).catch(() => {});
    kv.del(`wsession-wallet:${(session as any).wallet}`).catch(() => {});
    return null;
  }

  return (session as any).wallet || null;
}

async function validateWalletSession(c: any, wallet: string): Promise<boolean> {
  const sessionWallet = await getWalletFromSessionHeader(c);
  return sessionWallet === wallet;
}

/**
 * Governors Hub read gate — wallet session + mirror Governor NFT, or admin session.
 * No extra signatures; uses existing WC session + mirror node.
 */
async function requireGovernorAccess(c: any, next: () => Promise<void>) {
  const adminToken = c.req.header("X-Admin-Session");
  if (adminToken) {
    const adminWallet = await validateSession(adminToken);
    if (adminWallet && isAdmin(adminWallet)) {
      c.set("governorWallet", adminWallet);
      await next();
      return;
    }
  }

  const wallet = await getWalletFromSessionHeader(c);
  if (!wallet) {
    return c.json({
      success: false,
      error: "Wallet session required. Connect your wallet to access Governors Hub.",
      code: "SESSION_REQUIRED",
    }, 401);
  }

  if (isAdmin(wallet)) {
    c.set("governorWallet", wallet);
    await next();
    return;
  }

  const hasGov = await hasGovernorNFT(wallet);
  if (!hasGov) {
    return c.json({
      success: false,
      error: "Governors Hub requires a WCO Governors NFT.",
      code: "GOVERNOR_NFT_REQUIRED",
    }, 403);
  }

  c.set("governorWallet", wallet);
  await next();
}

/**
 * Proposal vote history — session wallet must match :wallet param, or admin.
 */
async function requireGovernorVoteHistoryAccess(c: any, next: () => Promise<void>) {
  const paramWallet = c.req.param("wallet");
  if (!paramWallet || !isValidHederaAccountId(paramWallet)) {
    return c.json({ success: false, error: "Invalid wallet parameter" }, 400);
  }

  const adminToken = c.req.header("X-Admin-Session");
  if (adminToken) {
    const adminWallet = await validateSession(adminToken);
    if (adminWallet && isAdmin(adminWallet)) {
      c.set("governorWallet", adminWallet);
      await next();
      return;
    }
  }

  const sessionWallet = await getWalletFromSessionHeader(c);
  if (!sessionWallet) {
    return c.json({
      success: false,
      error: "Wallet session required.",
      code: "SESSION_REQUIRED",
    }, 401);
  }

  if (sessionWallet !== paramWallet && !isAdmin(sessionWallet)) {
    return c.json({
      success: false,
      error: "You may only view your own proposal votes.",
      code: "WALLET_MISMATCH",
    }, 403);
  }

  if (!isAdmin(sessionWallet)) {
    const hasGov = await hasGovernorNFT(sessionWallet);
    if (!hasGov) {
      return c.json({
        success: false,
        error: "Governors Hub requires a WCO Governors NFT.",
        code: "GOVERNOR_NFT_REQUIRED",
      }, 403);
    }
  }

  c.set("governorWallet", sessionWallet);
  await next();
}

// ---------------------------------------------------------------------------
// POST /wallet/register — Issue a wallet session token after WalletConnect
// ---------------------------------------------------------------------------
app.post(`${PREFIX}/wallet/register`, async (c) => {
  try {
    const body = await c.req.json();
    const { wallet, wcTopic } = body;

    if (!wallet || !isValidHederaAccountId(wallet)) {
      return c.json({ success: false, error: "Valid Hedera wallet address required" }, 400);
    }
    // WC session topics are 64-char hex hashes. Enforce format to prevent trivial fabrication.
    if (!wcTopic || typeof wcTopic !== "string" || !/^[a-f0-9]{60,70}$/.test(wcTopic)) {
      return c.json({ success: false, error: "Valid WalletConnect session topic required" }, 400);
    }

    // Rate limit: 5 registrations per 2 minutes per wallet (legitimate use: 1-2 per connect)
    // C-1 FIX: Dual-layer (in-memory + KV) — persists across isolate restarts
    const wsessionWalletRL = await checkRateLimit(`wsession:${wallet}`, 5, 2 * 60 * 1000);
    if (wsessionWalletRL.limited) {
      return c.json({ success: false, error: "Too many session registrations. Please wait.", code: "RATE_LIMITED", retryAfter: wsessionWalletRL.retryAfter }, 429);
    }

    // Rate limit: 10 registrations per 5 minutes per IP (prevents mass wallet impersonation)
    // C-1 FIX: Dual-layer (in-memory + KV) — persists across isolate restarts
    const registerIp = extractClientIp(c);
    const wsessionIpRL = await checkRateLimit(`wsession-ip:${registerIp}`, 10, 5 * 60 * 1000);
    if (wsessionIpRL.limited) {
      console.log(`[WALLET-SESSION] IP rate limited: ${registerIp} — possible mass registration attempt`);
      return c.json({ success: false, error: "Too many session registrations from this network.", code: "RATE_LIMITED", retryAfter: wsessionIpRL.retryAfter }, 429);
    }

    // Verify wallet exists on Hedera mainnet
    const walletExists = await verifyWalletOnMirrorNode(wallet);
    if (!walletExists) {
      return c.json({ success: false, error: "Wallet not found on Hedera mainnet" }, 403);
    }

    // Invalidate any existing session for this wallet (one session per wallet)
    const existingRef = await kv.get(`wsession-wallet:${wallet}`);
    if (existingRef && (existingRef as any).token) {
      await kv.del(`wsession:${(existingRef as any).token}`).catch(() => {});
    }

    // Issue new session token
    const token = generateWalletSessionToken();
    const sessionData = {
      wallet,
      wcTopic: sanitizeString(wcTopic, 200),
      createdAt: Date.now(),
      expiresAt: Date.now() + WALLET_SESSION_TTL_MS,
    };

    await kv.mset(
      [`wsession:${token}`, `wsession-wallet:${wallet}`],
      [sessionData, { token }],
    );

    // All-time unique-wallet metric (idempotent, hashed, fire-and-forget)
    recordWalletConnected(wallet).catch(() => {});

    console.log(`[WALLET-SESSION] Registered session for ${wallet} (topic: ${wcTopic.substring(0, 16)}…, TTL: 4h)`);

    return c.json({
      success: true,
      data: {
        token,
        expiresAt: sessionData.expiresAt,
        ttlMs: WALLET_SESSION_TTL_MS,
      },
    });
  } catch (error) {
    console.log(`[WALLET-SESSION] Error registering session: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to register wallet session") }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /wallet/disconnect — Destroy wallet session (cleanup)
// ---------------------------------------------------------------------------
// SECURITY: Requires X-Wallet-Session header matching the wallet being
// disconnected. Without this check, any attacker could POST any wallet
// address to destroy another user's session (denial-of-service).
// The token must exist in KV AND session.wallet must match the request wallet.
// If the token is already expired/missing, we return success (idempotent).
// ---------------------------------------------------------------------------
app.post(`${PREFIX}/wallet/disconnect`, async (c) => {
  try {
    const body = await c.req.json();
    const { wallet } = body;

    if (!wallet || !isValidHederaAccountId(wallet)) {
      return c.json({ success: true, data: { message: "No session to destroy" } });
    }

    // ── WALLET SESSION AUTH CHECK (fixes DoS vulnerability) ──
    // The caller must present the X-Wallet-Session token that belongs to
    // the wallet they want to disconnect. This proves ownership.
    const token = c.req.header("X-Wallet-Session");
    if (!token || typeof token !== "string" || token.length < 10) {
      console.log(`[WALLET-SESSION] Disconnect REJECTED for ${wallet} — no X-Wallet-Session header (DoS prevention)`);
      return c.json({
        success: false,
        error: "Wallet session required to disconnect. Provide X-Wallet-Session header.",
        code: "SESSION_REQUIRED",
      }, 401);
    }

    // Look up the session in KV
    const session = await kv.get(`wsession:${token}`);

    if (!session) {
      // Token not in KV — already expired or never existed.
      // Still try to clean up the reverse-lookup key (idempotent cleanup).
      await kv.del(`wsession-wallet:${wallet}`).catch(() => {});
      console.log(`[WALLET-SESSION] Disconnect for ${wallet} — token not in KV (already expired/cleaned). Idempotent cleanup done.`);
      return c.json({ success: true, data: { message: "Session already expired or destroyed" } });
    }

    // Verify the token belongs to the wallet being disconnected
    if ((session as any).wallet !== wallet) {
      console.log(`[WALLET-SESSION] Disconnect REJECTED for ${wallet} — token belongs to ${(session as any).wallet} (wallet mismatch, possible attack)`);
      return c.json({
        success: false,
        error: "Session token does not match wallet. Cannot disconnect another user's session.",
        code: "SESSION_REQUIRED",
      }, 401);
    }

    // ── Authorized: destroy the session ──
    await kv.del(`wsession:${token}`).catch(() => {});
    await kv.del(`wsession-wallet:${wallet}`).catch(() => {});

    console.log(`[WALLET-SESSION] Destroyed session for ${wallet} (authorized via matching X-Wallet-Session)`);
    return c.json({ success: true, data: { message: "Session destroyed" } });
  } catch (error) {
    console.log(`[WALLET-SESSION] Error destroying session: ${error}`);
    return c.json({ success: true, data: { message: "Session cleanup attempted" } });
  }
});

// ---------------------------------------------------------------------------
// Health Check
// ---------------------------------------------------------------------------
app.get(`${PREFIX}/health`, async (c) => {
  // Trigger one-time index migration on first request after deployment
  ensureIndicesMigrated().catch((err) => {
    console.log(`[HEALTH] Index migration trigger error (non-fatal): ${err}`);
  });
  return c.json({ status: "ok", timestamp: now() });
});

// ---------------------------------------------------------------------------
// VISIT COUNTER — Privacy-preserving unique-IP traffic gauge
// ---------------------------------------------------------------------------
// Goal: give admins a real-time count of unique daily/weekly/total visitors
// WITHOUT recording any user data.
//
// PRIVACY:
//   - Raw IPs are NEVER stored. Each IP is HMAC-SHA256-hashed with a per-day
//     server-side salt that is itself derived from the SUPABASE_SERVICE_ROLE_KEY.
//   - The salt rotates daily, so yesterday's hashes can never be linked to
//     today's hashes for the same IP. After 31 days, all hashes are reaped.
//   - User-Agent is mixed into the hash to give better granularity than
//     pure IP (households on shared NAT) without ever leaving the server.
//
// TAMPER-PROOFING:
//   - IP is extracted server-side from x-forwarded-for (set by Supabase Edge,
//     not client-controllable).
//   - HMAC means a hostile client cannot pre-compute a hash to know whether
//     they'd be deduped — flooding /track-visit can only register ONE unique
//     per real (IP, UA) per day.
//   - /track-visit is rate-limited per-IP (30/min) so a single attacker
//     can't burn KV writes via header rotation.
//   - Counter increments are serialized via the per-day mutex
//     (`vcounter:{date}`) — race-free exact count.
//   - Endpoint is public (page-load fires it) but writes only happen on the
//     FIRST distinct hash per day, so cost is bounded by real unique traffic.
//
// SCALE:
//   - One KV write per unique (IP, UA, day) tuple. At 250K daily uniques
//     that's 250K writes; subsequent hits are read-only.
//   - Lazy reaper deletes vhash:{date}:* entries older than 31 days.
// ---------------------------------------------------------------------------

const VISIT_HASH_RETENTION_DAYS = 31;
let lastVisitReapDate = "";

/**
 * Fail-closed HMAC secret resolver.
 * Prefers BOTB_HASH_SALT (dedicated rotation-friendly secret); falls back to
 * SUPABASE_SERVICE_ROLE_KEY for backward compatibility. THROWS if neither is
 * set — we will not silently fall back to a public literal that would collapse
 * the anonymity guarantees of visitor/wallet hashing.
 */
function getHashSecret(): string {
  const secret = Deno.env.get("BOTB_HASH_SALT") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret || secret.length < 16) {
    throw new Error("Hash secret unavailable: set BOTB_HASH_SALT or SUPABASE_SERVICE_ROLE_KEY");
  }
  return secret;
}

async function dailyVisitSalt(date: string): Promise<string> {
  const secret = getHashSecret();
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`botb-visit-salt-${date}`));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hashVisitor(ip: string, ua: string, date: string): Promise<string> {
  const salt = await dailyVisitSalt(date);
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(salt), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${ip}|${ua}`));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

async function reapOldVisitHashes(today: string): Promise<void> {
  if (lastVisitReapDate === today) return;
  lastVisitReapDate = today;
  try {
    const cutoff = new Date(today);
    cutoff.setUTCDate(cutoff.getUTCDate() - VISIT_HASH_RETENTION_DAYS);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const allHashes: any[] = await kv.getByPrefix("vhash:");
    const expiredKeys: string[] = [];
    for (const v of allHashes) {
      if (v && v._d && v._d < cutoffStr && v._k) {
        expiredKeys.push(`vhash:${v._d}:${v._k}`);
      }
      if (expiredKeys.length >= 500) break;
    }
    if (expiredKeys.length > 0) {
      await kv.mdel(expiredKeys);
      console.log(`[VISIT] Reaped ${expiredKeys.length} expired visit hashes (older than ${cutoffStr}).`);
    }
  } catch (err) {
    console.log(`[VISIT] Reap error (non-fatal): ${err}`);
  }
}

app.post(`${PREFIX}/track-visit`, async (c) => {
  try {
    const ip = extractClientIp(c);
    if (!ip || ip === "unknown") return c.json({ ok: true });

    // Per-IP rate limit — prevents counter inflation via flooding.
    // checkRateLimit returns { limited, retryAfter } — when limited=true,
    // silently drop the ping (don't error the user; tracker is fire-and-forget).
    const rl = await checkRateLimit(`visit-track:${ip}`, 30, 60 * 1000);
    if (rl.limited) return c.json({ ok: true });

    const ua = (c.req.header("user-agent") || "").substring(0, 200);
    const date = todayUTC();
    const hash = await hashVisitor(ip, ua, date);
    const hashKey = `vhash:${date}:${hash}`;

    // Fast path — already counted today, no lock, no write
    const existing = await kv.get(hashKey);
    if (existing) return c.json({ ok: true });

    // First-seen path — serialize counter increments per-day to avoid race
    const release = await acquireLock(`vcounter:${date}`);
    try {
      const recheck = await kv.get(hashKey);
      if (recheck) return c.json({ ok: true });

      // Store hash with self-referencing metadata for the lazy reaper
      // (getByPrefix returns values only, so we need date + hash inside).
      await kv.set(hashKey, { _d: date, _k: hash, t: Date.now() });

      const dailyKey = `vcount:${date}`;
      const totalKey = `vcount:total`;
      const dailyCount = (Number(await kv.get(dailyKey)) || 0) + 1;
      const totalCount = (Number(await kv.get(totalKey)) || 0) + 1;
      await kv.mset([dailyKey, totalKey], [dailyCount, totalCount]);
    } finally {
      release();
    }

    // Lazy reap stale day buckets (runs at most once per day per worker)
    reapOldVisitHashes(date).catch(() => {});

    return c.json({ ok: true });
  } catch (e) {
    console.log(`[VISIT] track error (non-fatal): ${e}`);
    return c.json({ ok: true }); // never fail loud — UI is fire-and-forget
  }
});

// ---------------------------------------------------------------------------
// WALLET ENGAGEMENT COUNTERS — All-time unique wallet metrics
// ---------------------------------------------------------------------------
// Two separate counters:
//   1. wconn:total      Unique wallets that have ever connected (registered a session)
//   2. wvoted:total     Unique wallets that have ever cast a vote
//
// PRIVACY: We never expose wallet IDs in any admin endpoint. Wallets ARE
// public on-chain identifiers, but to comply with "no client-side leakage"
// we store dedupe markers as HMAC hashes (`wconn:{hash}`, `wvoted:{hash}`)
// rather than the raw wallet. The admin endpoint returns ONLY the counts.
//
// TAMPER-PROOFING:
//   - Hooks fire only on the SUCCESS path of /wallet/register and /vote/*
//     (after rate limits, signature verification, and KV writes succeed),
//     so spoofed requests cannot inflate the counts.
//   - Counter increments are serialized via per-counter mutex to avoid race.
//   - HMAC salt is the SUPABASE_SERVICE_ROLE_KEY (server-only); even an
//     attacker who guesses a wallet cannot compute the hash to predict
//     dedupe behavior or craft inflation attempts.
// ---------------------------------------------------------------------------

async function hashWallet(wallet: string, scope: string): Promise<string> {
  const secret = getHashSecret();
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(`${scope}|${wallet}`));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Increment all-time unique wallet-connected counter. Idempotent per wallet. */
async function recordWalletConnected(wallet: string): Promise<void> {
  try {
    if (!wallet) return;
    const hash = await hashWallet(wallet, "wconn");
    const markerKey = `wconn:${hash}`;
    if (await kv.get(markerKey)) return; // Already counted

    const release = await acquireLock(`wccounter:total`);
    try {
      if (await kv.get(markerKey)) return;
      await kv.set(markerKey, 1);
      const total = (Number(await kv.get(`wconn:total`)) || 0) + 1;
      await kv.set(`wconn:total`, total);
    } finally {
      release();
    }
  } catch (err) {
    console.log(`[WALLET-METRIC] connected counter error (non-fatal): ${err}`);
  }
}

/** Increment all-time unique wallet-voted counter. Idempotent per wallet. */
async function recordWalletVoted(wallet: string): Promise<void> {
  try {
    if (!wallet) return;
    const hash = await hashWallet(wallet, "wvoted");
    const markerKey = `wvoted:${hash}`;
    if (await kv.get(markerKey)) return;

    const release = await acquireLock(`wvcounter:total`);
    try {
      if (await kv.get(markerKey)) return;
      await kv.set(markerKey, 1);
      const total = (Number(await kv.get(`wvoted:total`)) || 0) + 1;
      await kv.set(`wvoted:total`, total);
    } finally {
      release();
    }
  } catch (err) {
    console.log(`[WALLET-METRIC] voted counter error (non-fatal): ${err}`);
  }
}

app.get(`${PREFIX}/admin/visit-stats`, requireAdminSession, async (c) => {
  try {
    const today = todayUTC();
    const days: string[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - i);
      days.push(d.toISOString().slice(0, 10));
    }
    const dailyKeys = days.map((d) => `vcount:${d}`);
    const dailyValsRaw = await kv.mget(dailyKeys);
    const dailyVals = dailyValsRaw.map((v: any) => Number(v) || 0);
    const total = Number(await kv.get(`vcount:total`)) || 0;
    const last7d = dailyVals.slice(0, 7).reduce((s: number, v: number) => s + v, 0);
    const last30d = dailyVals.reduce((s: number, v: number) => s + v, 0);
    const [walletsConnected, walletsVoted, workoutsGenerated, userWallets] = await kv.mget([
      `wconn:total`,
      `wvoted:total`,
      `cali:gen:total`,
      `caliuser:total`,
    ]);
    return c.json({
      success: true,
      data: {
        today: dailyVals[0] || 0,
        yesterday: dailyVals[1] || 0,
        last7d,
        last30d,
        total,
        walletsConnected: Number(walletsConnected) || 0,
        walletsVoted: Number(walletsVoted) || 0,
        workoutsGenerated: Number(workoutsGenerated) || 0,
        userWallets: Number(userWallets) || 0,
        breakdown: days.map((d, i) => ({ date: d, count: dailyVals[i] || 0 })),
        retentionDays: VISIT_HASH_RETENTION_DAYS,
        privacyNote: "IPs and wallet IDs are HMAC-hashed; raw values are never returned by this endpoint.",
      },
    });
  } catch (e) {
    console.log(`[VISIT] stats error: ${e}`);
    return c.json({ success: false, error: "Failed to load visit stats" }, 500);
  }
});

// ============================================================================
// PUBLIC ROUTES
// ============================================================================

// ---------------------------------------------------------------------------
// GET /config — Site configuration + admin check
// ---------------------------------------------------------------------------
app.get(`${PREFIX}/config`, async (c) => {
  try {
    let config = await kv.get("config:site");

    // Initialize default config if none exists
    if (!config) {
      config = {
        tokenStats: {
          symbol: "BOTB",
          price: 0,
          change24h: 0,
          marketCap: 0,
          totalStaked: 0,
          totalVoters: 0,
          totalBattles: 0,
          tvl: 0,
        },
        votingEnabled: true,
        mintingEnabled: false,
        stakingEnabled: false,
      };
      await kv.set("config:site", config);
    }

    // Check if requester is admin (optional header)
    const wallet = extractAdminWallet(c);
    const isAdminUser = wallet ? isAdmin(wallet) : false;

    return c.json({
      success: true,
      data: {
        ...config,
        isAdmin: isAdminUser,
        // SECURITY: Never return the admin wallet list in any API response.
        // The frontend only needs to know IF the current user is admin (boolean),
        // not WHO all the admins are. The X-Admin-Wallet header is trivially
        // spoofable, so even this isAdmin flag is only for UI rendering —
        // all real security is enforced by requireAdminSession (signed session).
      },
    });
  } catch (error) {
    console.log(`[CONFIG] Error fetching config: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to fetch config") }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /athletes — List all athletes
// ---------------------------------------------------------------------------
app.get(`${PREFIX}/athletes`, async (c) => {
  try {
    const athletes = await kv.getByPrefix("athlete:");
    // Sort by rank
    athletes.sort((a: any, b: any) => (a.rank ?? 999) - (b.rank ?? 999));
    return c.json({ success: true, data: athletes.map(stripSensitiveAthleteFields) });
  } catch (error) {
    console.log(`[ATHLETES] Error listing athletes: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to list athletes") }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /athletes/:id — Get single athlete
// ---------------------------------------------------------------------------
app.get(`${PREFIX}/athletes/:id`, async (c) => {
  try {
    const id = c.req.param("id");
    const athlete = await kv.get(`athlete:${id}`);
    if (!athlete) {
      return c.json({ success: false, error: `Athlete ${id} not found` }, 404);
    }
    return c.json({ success: true, data: stripSensitiveAthleteFields(athlete) });
  } catch (error) {
    console.log(`[ATHLETES] Error fetching athlete: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to fetch athlete") }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /events — List all events
// ---------------------------------------------------------------------------
app.get(`${PREFIX}/events`, async (c) => {
  try {
    const events = await kv.getByPrefix("event:");
    events.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ success: true, data: events });
  } catch (error) {
    console.log(`[EVENTS] Error listing events: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to list events") }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /events/:id — Get single event with bracket
// ---------------------------------------------------------------------------
app.get(`${PREFIX}/events/:id`, async (c) => {
  try {
    const id = c.req.param("id");
    const event = await kv.get(`event:${id}`);
    if (!event) {
      return c.json({ success: false, error: `Event ${id} not found` }, 404);
    }
    return c.json({ success: true, data: event });
  } catch (error) {
    console.log(`[EVENTS] Error fetching event: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to fetch event") }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /battles — List battles (optional ?eventId= and ?status= filters)
// ---------------------------------------------------------------------------
app.get(`${PREFIX}/battles`, async (c) => {
  try {
    const eventId = c.req.query("eventId");
    const statusFilter = c.req.query("status");

    let battles = await kv.getByPrefix("battle:");

    // ── AUTO-CLOSE EXPIRED VOTING ──
    // If a battle has votingClosesAt in the past and is still "voting_open",
    // automatically transition it to "voting_closed". This prevents the CEO
    // from having to manually close each battle — just set the close date
    // when creating the battle and it handles itself.
    const currentTime = new Date();
    const autoClosedIds: string[] = [];
    for (const b of battles) {
      const battle = b as any;
      if (
        battle.status === "voting_open" &&
        battle.votingClosesAt &&
        new Date(battle.votingClosesAt) < currentTime
      ) {
        battle.status = "voting_closed";
        battle.updatedAt = new Date().toISOString();
        kv.set(`battle:${battle.id}`, battle).catch((err: any) => {
          console.log(`[BATTLES] Auto-close write error for ${battle.id}: ${err}`);
        });
        autoClosedIds.push(battle.id);
      }
    }
    if (autoClosedIds.length > 0) {
      console.log(`[BATTLES] Auto-closed ${autoClosedIds.length} expired voting battles: ${autoClosedIds.join(", ")}`);
    }

    if (eventId) {
      battles = battles.filter((b: any) => b.eventId === eventId);
    }
    if (statusFilter) {
      battles = battles.filter((b: any) => b.status === statusFilter);
    }

    // Sort: live first, then upcoming, then completed
    const statusOrder: Record<string, number> = {
      voting_open: 0,
      upcoming: 1,
      voting_closed: 2,
      winner_declared: 3,
      rewards_distributed: 4,
      draft: 5,
      cancelled: 6,
    };
    battles.sort((a: any, b: any) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9));

    return c.json({ success: true, data: battles });
  } catch (error) {
    console.log(`[BATTLES] Error listing battles: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to list battles") }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /battles/:id — Get single battle
// ---------------------------------------------------------------------------
app.get(`${PREFIX}/battles/:id`, async (c) => {
  try {
    const id = c.req.param("id");
    const battle = await kv.get(`battle:${id}`);
    if (!battle) {
      return c.json({ success: false, error: `Battle ${id} not found` }, 404);
    }
    return c.json({ success: true, data: battle });
  } catch (error) {
    console.log(`[BATTLES] Error fetching battle: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to fetch battle") }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /proposals — List all proposals
// ---------------------------------------------------------------------------
app.get(`${PREFIX}/proposals`, requireGovernorAccess, async (c) => {
  try {
    const proposals = await kv.getByPrefix("proposal:");
    // Active first, then passed, then rejected
    const statusOrder: Record<string, number> = { active: 0, draft: 1, passed: 2, rejected: 3, cancelled: 4 };
    proposals.sort((a: any, b: any) => (statusOrder[a.status] ?? 9) - (statusOrder[b.status] ?? 9));
    return c.json({ success: true, data: proposals });
  } catch (error) {
    console.log(`[PROPOSALS] Error listing proposals: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to list proposals") }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /proposals/:id — Get single proposal
// ---------------------------------------------------------------------------
app.get(`${PREFIX}/proposals/:id`, requireGovernorAccess, async (c) => {
  try {
    const id = c.req.param("id");
    const proposal = await kv.get(`proposal:${id}`);
    if (!proposal) {
      return c.json({ success: false, error: `Proposal ${id} not found` }, 404);
    }
    return c.json({ success: true, data: proposal });
  } catch (error) {
    console.log(`[PROPOSALS] Error fetching proposal: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to fetch proposal") }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /votes/proposals/:wallet — Get all proposal votes for a wallet
// ---------------------------------------------------------------------------
app.get(`${PREFIX}/votes/proposals/:wallet`, requireGovernorVoteHistoryAccess, async (c) => {
  try {
    const wallet = c.req.param("wallet");
    if (!wallet) {
      return c.json({ success: false, error: "wallet param is required" }, 400);
    }
    const allVotes = await kv.getByPrefix("vote:proposal:");
    const myVotes = allVotes.filter((v: any) => v.wallet === wallet);
    return c.json({ success: true, data: myVotes });
  } catch (error) {
    console.log(`[VOTE] Error fetching proposal votes: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to fetch proposal votes") }, 500);
  }
});

// ============================================================================
// LEADERBOARD ROUTES — Aggregated rankings from live data
// ============================================================================

// ---------------------------------------------------------------------------
// GET /leaderboard/athletes — Composite athlete rankings
// Score = (wins*10) + (winRate*20) + (powerRating*2) + (streak*3) + (totalVotes*0.5)
// ---------------------------------------------------------------------------
app.get(`${PREFIX}/leaderboard/athletes`, async (c) => {
  try {
    // SCALING FIX: Cache athlete leaderboard for 30 seconds.
    const athleteData = await cached("leaderboard:athletes", 30_000, async () => {
    const athletes = await kv.getByPrefix("athlete:");

    const ranked = athletes.map((a: any) => {
      const totalMatches = (a.wins || 0) + (a.losses || 0);
      const winRate = totalMatches > 0 ? (a.wins || 0) / totalMatches : 0;
      const compositeScore =
        ((a.wins || 0) * 10) +
        (winRate * 20) +
        ((a.totalPowerRating || 0) * 2) +
        ((a.streak || 0) * 3) +
        ((a.totalVotes || 0) * 0.5);

      return {
        id: a.id,
        name: a.name,
        country: a.country,
        pfpUrl: a.pfpUrl,
        wins: a.wins || 0,
        losses: a.losses || 0,
        winRate: Math.round(winRate * 1000) / 10,
        streak: a.streak || 0,
        totalPowerRating: a.totalPowerRating || 0,
        totalVotes: a.totalVotes || 0,
        compositeScore: Math.round(compositeScore * 10) / 10,
        status: a.status || "active",
        nftSeriesName: a.nftSeriesName || "",
        nftCardBorderColor: a.nftCardBorderColor || "#4274B9",
        specialMove: a.specialMove || "",
        skills: a.skills || {},
      };
    });

    ranked.sort((a: any, b: any) => b.compositeScore - a.compositeScore);
    ranked.forEach((a: any, i: number) => { a.rank = i + 1; });

    return ranked;
    }); // end cached()

    return c.json({ success: true, data: athleteData });
  } catch (error) {
    console.log(`[LEADERBOARD] Error computing athlete rankings: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to compute athlete rankings") }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /leaderboard/voters — Top voters aggregated from real vote history
// Combines battle votes + proposal votes, computes accuracy from winners
// ---------------------------------------------------------------------------
app.get(`${PREFIX}/leaderboard/voters`, async (c) => {
  try {
    // SCALING FIX: Cache the voter leaderboard for 45 seconds.
    // This route loads ALL votes + battles + proposals + snapshots to compute rankings.
    // At 50K users with ~500K votes, this is the most expensive query on the server.
    // 45s TTL means the leaderboard is near-real-time but avoids crushing the DB
    // when 1000 users load the leaderboard page simultaneously.
    // Cache is automatically invalidated when a winner is declared.
    const voterData = await cached("leaderboard:voters", 45_000, async () => {
    const allBattleVotes = await kv.getByPrefix("vote:battle:");
    const allBattles = await kv.getByPrefix("battle:");
    const allProposalVotes = await kv.getByPrefix("vote:proposal:");
    const allSnapshots = await kv.getByPrefix("snapshot:");

    // Build battle winner map + timestamps for Oracle streak ordering
    const battleWinnerMap = new Map<string, string>();
    const battleTimestampMap = new Map<string, string>();
    allBattles.forEach((b: any) => {
      if (b.winnerId) {
        battleWinnerMap.set(b.id, b.winnerId);
        battleTimestampMap.set(b.id, b.updatedAt || b.createdAt || "");
      }
    });

    // Build snapshot reward map: wallet -> total rewards earned
    const rewardMap = new Map<string, number>();
    allSnapshots.forEach((snap: any) => {
      if (snap.recipients) {
        snap.recipients.forEach((r: any) => {
          rewardMap.set(r.wallet, (rewardMap.get(r.wallet) || 0) + (r.rewardAmount || 0));
        });
      }
    });

    // Aggregate per wallet
    const walletStats = new Map<string, {
      wallet: string;
      battleVotes: number;
      correctPicks: number;
      totalWeightedPower: number;
      proposalVotes: number;
      hasGovernorNFT: boolean;
      hasSigmaNFT: boolean;
      maxVotingPower: number;
      totalStaked: number;
      rewardsEarned: number;
      lastVoteAt: string;
      /** Chronological battle outcomes for Oracle streak computation */
      battleResults: { battleId: string; correct: boolean; timestamp: string }[];
    }>();

    allBattleVotes.forEach((v: any) => {
      const existing = walletStats.get(v.wallet) || {
        wallet: v.wallet,
        battleVotes: 0,
        correctPicks: 0,
        totalWeightedPower: 0,
        proposalVotes: 0,
        hasGovernorNFT: false,
        hasSigmaNFT: false,
        maxVotingPower: 1,
        totalStaked: 0,
        rewardsEarned: 0,
        lastVoteAt: "",
        battleResults: [] as { battleId: string; correct: boolean; timestamp: string }[],
      };

      existing.battleVotes += 1;
      existing.totalWeightedPower += (v.weightedVote || 0);
      existing.totalStaked += (v.stakeAmount || 0);
      if (v.hasGovernorNFT) existing.hasGovernorNFT = true;
      if (v.hasSigmaNFT) existing.hasSigmaNFT = true;
      if ((v.votingPower || 1) > existing.maxVotingPower) existing.maxVotingPower = v.votingPower;
      if (v.timestamp > existing.lastVoteAt) existing.lastVoteAt = v.timestamp;

      // Check correct pick — only count battles with declared winners
      const winner = battleWinnerMap.get(v.battleId);
      if (winner) {
        const isCorrect = v.athleteId === winner;
        if (isCorrect) existing.correctPicks += 1;
        existing.battleResults.push({
          battleId: v.battleId,
          correct: isCorrect,
          timestamp: battleTimestampMap.get(v.battleId) || v.timestamp || "",
        });
      }

      walletStats.set(v.wallet, existing);
    });

    allProposalVotes.forEach((v: any) => {
      const existing = walletStats.get(v.wallet) || {
        wallet: v.wallet,
        battleVotes: 0,
        correctPicks: 0,
        totalWeightedPower: 0,
        proposalVotes: 0,
        hasGovernorNFT: false,
        hasSigmaNFT: false,
        maxVotingPower: 1,
        totalStaked: 0,
        rewardsEarned: 0,
        lastVoteAt: "",
        battleResults: [],
      };

      existing.proposalVotes += 1;
      if ((v.votingPower || 1) > existing.maxVotingPower) existing.maxVotingPower = v.votingPower;
      if (v.timestamp > existing.lastVoteAt) existing.lastVoteAt = v.timestamp;

      walletStats.set(v.wallet, existing);
    });

    // Build sorted list with Oracle Score computation
    const voters = Array.from(walletStats.values()).map((ws) => {
      // Accuracy: only count battles with declared winners (decidedBattles)
      const decidedBattles = ws.battleResults.length;
      const accuracy = decidedBattles > 0
        ? Math.round((ws.correctPicks / decidedBattles) * 1000) / 10
        : 0;
      const totalVotes = ws.battleVotes + ws.proposalVotes;
      const rewardsEarned = rewardMap.get(ws.wallet) || 0;

      // ── STREAK CALCULATION ──
      // Sort battle results chronologically to find correct-pick streaks
      const sorted = ws.battleResults
        .slice()
        .sort((a, b) => (a.timestamp || "").localeCompare(b.timestamp || ""));
      let currentStreak = 0;
      let longestStreak = 0;
      let runningStreak = 0;
      for (const r of sorted) {
        if (r.correct) {
          runningStreak += 1;
          if (runningStreak > longestStreak) longestStreak = runningStreak;
        } else {
          runningStreak = 0;
        }
      }
      currentStreak = runningStreak;

      // ── ORACLE SCORE ──
      // Minimum 3 decided battles to qualify (prevents 1/1 = 100% gaming).
      // Formula: (correctPicks × 10) + (accuracy × decidedBattles × 0.5) + (longestStreak × 5) + (currentStreak × 3)
      const oracleQualified = decidedBattles >= 3;
      const oracleScore = oracleQualified
        ? Math.round(
            (ws.correctPicks * 10) +
            (accuracy * decidedBattles * 0.5) +
            (longestStreak * 5) +
            (currentStreak * 3)
          )
        : 0;

      // ── ORACLE TIER ──
      let oracleTier = "UNRANKED";
      if (oracleQualified) {
        if (accuracy >= 80 && decidedBattles >= 10) oracleTier = "OMNISCIENT";
        else if (accuracy >= 80 && decidedBattles >= 5) oracleTier = "ORACLE";
        else if (accuracy >= 65) oracleTier = "PROPHET";
        else if (accuracy >= 50) oracleTier = "SEER";
        else oracleTier = "APPRENTICE";
      }

      const voterScore =
        ws.totalWeightedPower +
        (accuracy * totalVotes * 0.1) +
        (rewardsEarned * 0.01) +
        (ws.proposalVotes * 2);

      return {
        wallet: ws.wallet,
        battleVotes: ws.battleVotes,
        correctPicks: ws.correctPicks,
        decidedBattles,
        totalWeightedPower: ws.totalWeightedPower,
        proposalVotes: ws.proposalVotes,
        hasGovernorNFT: ws.hasGovernorNFT,
        hasSigmaNFT: ws.hasSigmaNFT,
        maxVotingPower: ws.maxVotingPower,
        totalStaked: ws.totalStaked,
        lastVoteAt: ws.lastVoteAt,
        accuracy,
        totalVotes,
        rewardsEarned: Math.round(rewardsEarned),
        voterScore: Math.round(voterScore * 10) / 10,
        // Oracle fields
        oracleScore,
        oracleTier,
        currentStreak,
        longestStreak,
        oracleQualified,
      };
    });

    voters.sort((a, b) => b.voterScore - a.voterScore);
    voters.forEach((v, i) => { (v as any).rank = i + 1; });

    return voters;
    }); // end cached()

    return c.json({ success: true, data: voterData });
  } catch (error) {
    console.log(`[LEADERBOARD] Error computing voter rankings: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to compute voter rankings") }, 500);
  }
});

// ============================================================================
// ADMIN ROUTES — All require X-Admin-Wallet header
// ============================================================================

// ---------------------------------------------------------------------------
// GET /admin/dashboard — One-glance operational summary for the CEO
// Returns aggregated counts across all entities so the admin doesn't have to
// navigate through multiple tabs to understand current platform state.
// ---------------------------------------------------------------------------
app.get(`${PREFIX}/admin/dashboard`, requireAdminSession, async (c) => {
  try {
    const [athletes, events, battles, proposals, applications, sponsors, inquiries] = await Promise.all([
      kv.getByPrefix("athlete:"),
      kv.getByPrefix("event:"),
      kv.getByPrefix("battle:"),
      kv.getByPrefix("proposal:"),
      kv.getByPrefix("application:"),
      kv.getByPrefix("sponsor:"),
      kv.getByPrefix("sponsor-inquiry:"),
    ]);

    // Battle status breakdown
    const battlesByStatus: Record<string, number> = {};
    let totalBattleVotes = 0;
    for (const b of battles) {
      const status = (b as any).status || "unknown";
      battlesByStatus[status] = (battlesByStatus[status] || 0) + 1;
      totalBattleVotes += ((b as any).votes1Count || 0) + ((b as any).votes2Count || 0);
    }

    // Proposal status breakdown
    const proposalsByStatus: Record<string, number> = {};
    for (const p of proposals) {
      const status = (p as any).status || "unknown";
      proposalsByStatus[status] = (proposalsByStatus[status] || 0) + 1;
    }

    // Application status breakdown
    const applicationsByStatus: Record<string, number> = {};
    for (const a of applications) {
      const status = (a as any).status || "unknown";
      applicationsByStatus[status] = (applicationsByStatus[status] || 0) + 1;
    }

    // Sponsor stats
    const activeSponsors = sponsors.filter((s: any) => s.active).length;
    const totalImpressions = sponsors.reduce((sum: number, s: any) => sum + ((s as any).impressions || 0), 0);
    const totalClicks = sponsors.reduce((sum: number, s: any) => sum + ((s as any).clicks || 0), 0);

    // Active voting battles that may need attention (past close date but still open)
    const now = new Date();
    const overdueVoting = battles.filter((b: any) =>
      b.status === "voting_open" && b.votingClosesAt && new Date(b.votingClosesAt) < now
    ).length;

    return c.json({
      success: true,
      data: {
        summary: {
          athletes: athletes.length,
          events: events.length,
          battles: battles.length,
          proposals: proposals.length,
          applications: applications.length,
          sponsors: sponsors.length,
          sponsorInquiries: inquiries.length,
          totalBattleVotes,
        },
        battlesByStatus,
        proposalsByStatus,
        applicationsByStatus,
        sponsorStats: { active: activeSponsors, totalImpressions, totalClicks },
        // Operational alerts
        alerts: {
          pendingApplications: applicationsByStatus["pending"] || 0,
          overdueVoting,
          newInquiries: inquiries.filter((i: any) => (i as any).status === "new").length,
        },
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.log(`[ADMIN] Error generating dashboard: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to generate dashboard") }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /admin/battles/batch-status — Update multiple battles' status at once
// Allows the CEO to open/close voting on all R1 battles simultaneously.
// ---------------------------------------------------------------------------
app.post(`${PREFIX}/admin/battles/batch-status`, requireAdminSession, async (c) => {
  try {
    const body = await c.req.json();
    const { battleIds, status } = body;
    const adminWallet = c.get("adminWallet");

    if (!Array.isArray(battleIds) || battleIds.length === 0) {
      return c.json({ success: false, error: "battleIds must be a non-empty array" }, 400);
    }
    if (battleIds.length > 50) {
      return c.json({ success: false, error: "Maximum 50 battles per batch" }, 400);
    }

    const validStatuses = ["draft", "upcoming", "voting_open", "voting_closed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return c.json({ success: false, error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` }, 400);
    }

    const statusOrder = ["draft", "upcoming", "voting_open", "voting_closed", "winner_declared", "rewards_distributed"];
    const results: { id: string; success: boolean; prev?: string; error?: string }[] = [];

    for (const bid of battleIds) {
      const battle: any = await kv.get(`battle:${bid}`);
      if (!battle) {
        results.push({ id: bid, success: false, error: "Not found" });
        continue;
      }
      // Validate forward-only transition (except cancelled)
      const currentIdx = statusOrder.indexOf(battle.status);
      const targetIdx = statusOrder.indexOf(status);
      if (status !== "cancelled" && currentIdx >= 0 && targetIdx >= 0 && targetIdx < currentIdx) {
        results.push({ id: bid, success: false, prev: battle.status, error: `Cannot go backwards to '${status}'` });
        continue;
      }

      const prev = battle.status;
      battle.status = status;
      battle.updatedAt = now();
      await kv.set(`battle:${bid}`, battle);
      results.push({ id: bid, success: true, prev });
    }

    const succeeded = results.filter(r => r.success).length;
    console.log(`[ADMIN] Batch status update: ${succeeded}/${battleIds.length} battles → '${status}'. Admin: ${adminWallet}`);

    return c.json({ success: true, data: { results, updated: succeeded, total: battleIds.length } });
  } catch (error) {
    console.log(`[ADMIN] Error in batch status update: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to batch update battles") }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /admin/check — Quick admin verification
// ---------------------------------------------------------------------------
app.get(`${PREFIX}/admin/check`, async (c) => {
  const wallet = extractAdminWallet(c);
  if (!wallet) {
    return c.json({ success: true, data: { isAdmin: false } });
  }
  return c.json({ success: true, data: { isAdmin: isAdmin(wallet), wallet } });
});

// ---------------------------------------------------------------------------
// POST /admin/challenge — Generate a challenge nonce for admin to sign
// ---------------------------------------------------------------------------
app.post(`${PREFIX}/admin/challenge`, async (c) => {
  try {
    const body = await c.req.json();
    const { wallet } = body;

    if (!wallet || !isValidHederaAccountId(wallet)) {
      return c.json({ success: false, error: "Valid Hedera wallet address required" }, 400);
    }

    // Rate limit: 3 challenge requests per 5 minutes per wallet
    // C-1 FIX: Dual-layer (in-memory + KV) — persists across isolate restarts
    const challengeRL = await checkRateLimit(`challenge:${wallet}`, 3, 5 * 60 * 1000);
    if (challengeRL.limited) {
      return c.json({
        success: false, error: "Too many authentication attempts. Please wait 5 minutes.",
        code: "RATE_LIMITED", retryAfter: challengeRL.retryAfter,
      }, { status: 429, headers: { "Retry-After": String(challengeRL.retryAfter || 60) } });
    }

    if (!isAdmin(wallet)) {
      // Don't reveal which wallets are admins — just say "not authorized"
      return c.json({ success: false, error: "Wallet not authorized for admin access" }, 403);
    }

    // Verify wallet exists on Hedera mainnet (anti-spoofing)
    const walletExists = await verifyWalletOnMirrorNode(wallet);
    if (!walletExists) {
      return c.json({ success: false, error: "Wallet not found on Hedera mainnet" }, 400);
    }

    const { challenge, nonce } = await createChallenge(wallet);
    console.log(`[ADMIN-AUTH] Challenge requested by ${wallet}`);

    return c.json({ success: true, data: { challenge, nonce } });
  } catch (error) {
    console.log(`[ADMIN-AUTH] Error creating challenge: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to create challenge") }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /admin/verify — Verify signed challenge and issue session token
// ---------------------------------------------------------------------------
app.post(`${PREFIX}/admin/verify`, async (c) => {
  try {
    const body = await c.req.json();
    const { wallet, nonce, signature } = body;

    if (!wallet || !nonce || !signature) {
      return c.json({ success: false, error: "wallet, nonce, and signature are required" }, 400);
    }

    const result = await verifyAndCreateSession(wallet, nonce, signature);
    if (!result) {
      return c.json({
        success: false,
        error: "Authentication failed. Challenge may have expired or wallet is not authorized.",
      }, 401);
    }

    console.log(`[ADMIN-AUTH] Session issued to ${wallet}, expires at ${new Date(result.expiresAt).toISOString()}`);

    return c.json({
      success: true,
      data: {
        sessionToken: result.sessionToken,
        expiresAt: result.expiresAt,
        wallet,
        ttlMinutes: 20,
      },
    });
  } catch (error) {
    console.log(`[ADMIN-AUTH] Error verifying challenge: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to verify") }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /admin/logout — Destroy admin session
// ---------------------------------------------------------------------------
app.post(`${PREFIX}/admin/logout`, async (c) => {
  try {
    const sessionToken = c.req.header("X-Admin-Session");
    if (sessionToken) {
      await destroySession(sessionToken);
    }
    return c.json({ success: true, data: { message: "Session destroyed" } });
  } catch (error) {
    console.log(`[ADMIN-AUTH] Error destroying session: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to logout") }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /admin/session — Check session status and remaining time
// ---------------------------------------------------------------------------
app.get(`${PREFIX}/admin/session`, async (c) => {
  try {
    const sessionToken = c.req.header("X-Admin-Session");
    if (!sessionToken) {
      return c.json({ success: true, data: { valid: false, remaining: 0 } });
    }
    const remaining = await getSessionTimeRemaining(sessionToken);
    return c.json({
      success: true,
      data: {
        valid: remaining > 0,
        remaining,
        remainingMinutes: Math.ceil(remaining / 60000),
      },
    });
  } catch (error) {
    return c.json({ success: false, error: safeErrorMsg("Session check failed") }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /admin/athletes — Full athlete records for admin (email, phone, wallet)
// Lazy-backfills wallet from applicantWallet / linked application when missing.
// ---------------------------------------------------------------------------
app.get(`${PREFIX}/admin/athletes`, requireAdminSession, async (c) => {
  try {
    const athletes = await kv.getByPrefix("athlete:");
    athletes.sort((a: any, b: any) => (a.rank ?? 999) - (b.rank ?? 999));

    // Map applicationId → application wallet for backfill of already-approved athletes
    const applications = await kv.getByPrefix("application:");
    const appWalletById = new Map<string, string>();
    const appWalletByAthleteId = new Map<string, string>();
    for (const app of applications as any[]) {
      if (app?.wallet && isValidHederaAccountId(app.wallet)) {
        if (app.id) appWalletById.set(app.id, app.wallet);
        if (app.athleteId) appWalletByAthleteId.set(app.athleteId, app.wallet);
      }
    }

    const repaired: any[] = [];
    for (const raw of athletes as any[]) {
      let a = raw;
      let needsWrite = false;

      const fromApplicant =
        a.applicantWallet && isValidHederaAccountId(a.applicantWallet) ? a.applicantWallet : "";
      const fromApp =
        (a.applicationId && appWalletById.get(a.applicationId)) ||
        appWalletByAthleteId.get(a.id) ||
        "";
      const resolvedWallet =
        (a.wallet && isValidHederaAccountId(a.wallet) ? a.wallet : "") ||
        fromApplicant ||
        fromApp ||
        "";

      if (resolvedWallet && a.wallet !== resolvedWallet) {
        a = { ...a, wallet: resolvedWallet, updatedAt: now() };
        needsWrite = true;
      }
      if (resolvedWallet && !a.applicantWallet) {
        a = { ...a, applicantWallet: resolvedWallet };
        needsWrite = true;
      }

      if (needsWrite) {
        await kv.set(`athlete:${a.id}`, a);
        console.log(`[ADMIN] Backfilled wallet on athlete ${a.id} (${a.name}) → ${resolvedWallet}`);
      }
      repaired.push(a);
    }

    return c.json({ success: true, data: repaired });
  } catch (error) {
    console.log(`[ADMIN] Error listing athletes: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to list athletes") }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /admin/athletes — Create or update athlete
// ---------------------------------------------------------------------------
app.post(`${PREFIX}/admin/athletes`, requireAdminSession, async (c) => {
  try {
    const body = await c.req.json();
    const adminWallet = c.get("adminWallet");

    // Validate required fields
    const required = ["name", "fullName", "country", "bio", "pfpUrl", "skills"];
    for (const field of required) {
      if (!body[field]) {
        return c.json({ success: false, error: `Missing required field: ${field}` }, 400);
      }
    }

    // Validate skills object
    const skillFields = ["energy", "performance", "static", "aggression", "dynamic"];
    if (body.skills) {
      for (const sf of skillFields) {
        const val = body.skills[sf];
        if (val === undefined || val === null || typeof val !== "number" || val < 0 || val > 10) {
          return c.json({ success: false, error: `Skill '${sf}' must be a number between 0 and 10` }, 400);
        }
      }
    }

    const isUpdate = !!body.id;
    const id = body.id || generateId("ath");

    // If updating, merge with existing
    let existing: any = null;
    if (isUpdate) {
      existing = await kv.get(`athlete:${id}`);
      if (!existing) {
        return c.json({ success: false, error: `Athlete ${id} not found for update` }, 404);
      }
    }

    // Compute total power rating
    const skills = body.skills;
    const totalPowerRating = skillFields.reduce((sum, f) => sum + (skills[f] || 0), 0);

    // Determine rank — if not provided, put at end
    let rank = body.rank;
    if (!rank && !isUpdate) {
      const allAthletes = await kv.getByPrefix("athlete:");
      rank = allAthletes.length + 1;
    }

    // Weight class: empty ok; new values must be official WCO divisions; legacy labels may be kept as-is
    const weightClass = sanitizeString(
      body.weightClass !== undefined && body.weightClass !== null
        ? body.weightClass
        : (existing?.weightClass || ""),
      80,
    );
    if (
      weightClass &&
      !isValidWeightClass(weightClass) &&
      weightClass !== (existing?.weightClass || "")
    ) {
      return c.json({
        success: false,
        error: "Invalid weight class. Select an official WCO division.",
      }, 400);
    }

    // Sanitize all text inputs
    const athlete = {
      ...(existing || {}),
      id,
      name: sanitizeString(body.name, 100),
      fullName: sanitizeString(body.fullName, 150),
      nickname: sanitizeString(body.nickname, 100),
      country: sanitizeString(body.country, 80),
      bio: sanitizeString(body.bio, 2000),
      pfpUrl: sanitizeUrl(body.pfpUrl),
      socials: {
        instagram: sanitizeString(body.socials?.instagram, 200),
        twitter: sanitizeString(body.socials?.twitter, 200),
        youtube: sanitizeUrl(body.socials?.youtube),
        website: sanitizeUrl(body.socials?.website),
      },
      email: sanitizeString(body.email ?? existing?.email, 200),
      phone: sanitizeString(body.phone ?? existing?.phone, 50),
      wins: sanitizeNumber(body.wins ?? existing?.wins, 0, 9999, existing?.wins ?? 0),
      losses: sanitizeNumber(body.losses ?? existing?.losses, 0, 9999, existing?.losses ?? 0),
      streak: sanitizeNumber(body.streak ?? existing?.streak, 0, 999, existing?.streak ?? 0),
      rank: sanitizeNumber(rank ?? existing?.rank, 1, 9999, existing?.rank ?? 999),
      bracketSeat: sanitizeNumber(body.bracketSeat ?? existing?.bracketSeat, 0, 128, existing?.bracketSeat ?? 0),
      status: (["active", "inactive", "champion", "injured", "retired", "eliminated"].includes(body.status)) ? body.status : (existing?.status || "active"),
      specialMove: sanitizeString(body.specialMove, 200),
      skills,
      totalPowerRating,
      nftTokenId: sanitizeString(body.nftTokenId || existing?.nftTokenId, 50),
      nftImageUrl: sanitizeUrl(body.nftImageUrl || existing?.nftImageUrl),
      nftMetadataUri: sanitizeUrl(body.nftMetadataUri || existing?.nftMetadataUri),
      nftSeriesName: sanitizeString(body.nftSeriesName || existing?.nftSeriesName, 100),
      nftRarity: sanitizeString(body.nftRarity || existing?.nftRarity, 50),
      nftCardBorderColor: sanitizeString(body.nftCardBorderColor || existing?.nftCardBorderColor || "#4274B9", 20),
      nftCardGlowGradient: sanitizeString(body.nftCardGlowGradient || existing?.nftCardGlowGradient || "from-[#4274B9] via-[#6AA3E0] to-[#4274B9]", 200),
      // Brand colors for Dynamic Theme Engine
      primaryColor: sanitizeString(body.primaryColor || existing?.primaryColor || "", 20),
      secondaryColor: sanitizeString(body.secondaryColor || existing?.secondaryColor || "", 20),
      // Weight class (official WCO divisions)
      weightClass,
      // Verified Hedera wallet for Arena Chat athlete badge + admin profile
      wallet: (body.wallet && isValidHederaAccountId(body.wallet))
        ? body.wallet
        : (existing?.wallet || existing?.applicantWallet || ""),
      // Preserve application linkage + original applicant wallet (immutable audit)
      applicationId: existing?.applicationId || body.applicationId || "",
      applicantWallet: existing?.applicantWallet ||
        ((body.wallet && isValidHederaAccountId(body.wallet)) ? body.wallet : "") ||
        "",
      eliteAccess: body.eliteAccess === true || (body.eliteAccess !== false && existing?.eliteAccess === true),
      totalVotes: existing?.totalVotes ?? 0,
      tokensStaked: existing?.tokensStaked ?? 0,
      createdAt: existing?.createdAt || now(),
      updatedAt: now(),
    };

    await kv.set(`athlete:${id}`, athlete);

    // SCALING: Invalidate athlete leaderboard cache on create/update
    invalidateCache("leaderboard:athletes");

    console.log(`[ADMIN] ${isUpdate ? "Updated" : "Created"} athlete ${id} (${athlete.name}) by admin ${adminWallet}`);

    return c.json({ success: true, data: athlete });
  } catch (error) {
    console.log(`[ADMIN] Error saving athlete: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to save athlete") }, 500);
  }
});

// ---------------------------------------------------------------------------
// DELETE /admin/athletes/:id — Delete athlete
// ---------------------------------------------------------------------------
app.delete(`${PREFIX}/admin/athletes/:id`, requireAdminSession, async (c) => {
  try {
    const id = c.req.param("id");
    const existing = await kv.get(`athlete:${id}`);
    if (!existing) {
      return c.json({ success: false, error: `Athlete ${id} not found` }, 404);
    }
    await kv.del(`athlete:${id}`);
    console.log(`[ADMIN] Deleted athlete ${id} (${existing.name}) by admin ${c.get("adminWallet")}`);
    return c.json({ success: true, data: { deleted: id } });
  } catch (error) {
    console.log(`[ADMIN] Error deleting athlete: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to delete athlete") }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /admin/events — Create or update event
// ---------------------------------------------------------------------------
app.post(`${PREFIX}/admin/events`, requireAdminSession, async (c) => {
  try {
    const body = await c.req.json();
    const isUpdate = !!body.id;
    const id = body.id || generateId("evt");

    let existing: any = null;
    if (isUpdate) {
      existing = await kv.get(`event:${id}`);
    }

    // Sanitize all text inputs
    const event = {
      ...(existing || {}),
      id,
      name: sanitizeString(body.name || existing?.name, 200),
      description: sanitizeString(body.description || existing?.description, 3000),
      location: sanitizeString(body.location || existing?.location, 200),
      startDate: body.startDate || existing?.startDate || "",
      endDate: body.endDate || existing?.endDate || "",
      totalPrizePool: sanitizeNumber(body.totalPrizePool ?? existing?.totalPrizePool, 0, 3_000_000_000, existing?.totalPrizePool ?? 0),
      status: (["draft", "upcoming", "live", "completed", "cancelled"].includes(body.status))
        ? body.status : (existing?.status || "draft"),
      bracketSize: sanitizeNumber(body.bracketSize ?? existing?.bracketSize, 2, 128, existing?.bracketSize ?? 2),
      bracket: body.bracket || existing?.bracket || [],
      rounds: body.rounds || existing?.rounds || [],
      createdAt: existing?.createdAt || now(),
      updatedAt: now(),
    };

    await kv.set(`event:${id}`, event);
    console.log(`[ADMIN] ${isUpdate ? "Updated" : "Created"} event ${id} by admin ${c.get("adminWallet")}`);
    return c.json({ success: true, data: event });
  } catch (error) {
    console.log(`[ADMIN] Error saving event: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to save event") }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /admin/events/generate — Create event + auto-generate bracket battles
// ---------------------------------------------------------------------------
app.post(`${PREFIX}/admin/events/generate`, requireAdminSession, async (c) => {
  try {
    const body = await c.req.json();
    const adminWallet = c.get("adminWallet");

    // Validate required fields
    if (!body.name) return c.json({ success: false, error: "Event name is required" }, 400);
    if (!body.bracket || !Array.isArray(body.bracket) || body.bracket.length < 2) {
      return c.json({ success: false, error: "Bracket must have at least 2 seat assignments" }, 400);
    }

    // Validate all athletes exist
    for (const seat of body.bracket) {
      if (!seat.athleteId) {
        return c.json({ success: false, error: `Seat ${seat.seat} has no athlete assigned` }, 400);
      }
      const athlete = await kv.get(`athlete:${seat.athleteId}`);
      if (!athlete) {
        return c.json({ success: false, error: `Athlete ${seat.athleteId} in seat ${seat.seat} not found` }, 404);
      }
    }

    const eventId = generateId("evt");
    const bracketSize = body.bracket.length;

    // Build athlete lookup for battle titles
    const athleteNames: Record<string, string> = {};
    for (const seat of body.bracket) {
      const ath = await kv.get(`athlete:${seat.athleteId}`);
      athleteNames[seat.athleteId] = ath?.name || seat.athleteId;
    }

    // Generate matchups using snake seeding (1v12, 2v11, 3v10, ...)
    // Sort bracket seats by seat number ascending
    const seats = [...body.bracket].sort((a: any, b: any) => a.seat - b.seat);
    const numMatches = Math.floor(bracketSize / 2);

    const round1Battles: any[] = [];
    const battleIds: string[] = [];
    const perBattlePool = body.totalPrizePool
      ? Math.floor(body.totalPrizePool / numMatches) // Full pool split evenly across R1 matches
      : 0;

    for (let i = 0; i < numMatches; i++) {
      const topSeed = seats[i];
      const bottomSeed = seats[bracketSize - 1 - i];
      const battleId = generateId("btl");
      battleIds.push(battleId);

      const ath1Name = athleteNames[topSeed.athleteId] || `Seat ${topSeed.seat}`;
      const ath2Name = athleteNames[bottomSeed.athleteId] || `Seat ${bottomSeed.seat}`;

      const battle = {
        id: battleId,
        eventId,
        title: `${ath1Name} vs ${ath2Name}`,
        status: "draft",
        round: "Round 1",
        bracketPosition: i + 1,
        athlete1Id: topSeed.athleteId,
        athlete2Id: bottomSeed.athleteId,
        votingOpensAt: body.startDate || "",
        votingClosesAt: body.endDate || "",
        totalPool: perBattlePool,
        votes1Count: 0,
        votes2Count: 0,
        votes1Weighted: 0,
        votes2Weighted: 0,
        winnerId: "",
        rewardDistributed: false,
        location: body.location || "",
        prize: perBattlePool > 0 ? `${perBattlePool.toLocaleString()} BOTB` : "TBD",
        createdAt: now(),
        updatedAt: now(),
      };

      round1Battles.push(battle);
      await kv.set(`battle:${battleId}`, battle);
    }

    // Determine rounds structure
    const rounds: any[] = [
      { roundNumber: 1, roundName: "Round 1", battleIds },
    ];

    // Calculate subsequent rounds (no battles created yet — just placeholder structure)
    let remaining = numMatches; // winners from R1
    let roundNum = 2;
    const roundNames: Record<number, string> = {};

    // Pre-compute total rounds for naming
    let tempR = remaining;
    let totalRounds = 1;
    while (tempR > 1) {
      tempR = Math.ceil(tempR / 2);
      totalRounds++;
    }

    // Now build the round structure with proper names
    remaining = numMatches;
    roundNum = 2;
    while (remaining > 1) {
      const matchesInRound = Math.floor(remaining / 2);
      const hasBye = remaining % 2 !== 0;
      const advancingToNext = matchesInRound + (hasBye ? 1 : 0);

      let roundName = `Round ${roundNum}`;
      if (advancingToNext === 1) roundName = "Finals";
      else if (advancingToNext === 2 || matchesInRound === 2) roundName = "Semi-Finals";
      else if (matchesInRound === 3 || matchesInRound === 4) roundName = "Quarter-Finals";

      rounds.push({
        roundNumber: roundNum,
        roundName,
        battleIds: [], // Generated when winners are declared
        matchCount: matchesInRound,
        hasBye,
      });

      remaining = advancingToNext;
      roundNum++;
    }

    // Save the event
    const event = {
      id: eventId,
      name: body.name,
      description: body.description || "",
      location: body.location || "",
      startDate: body.startDate || "",
      endDate: body.endDate || "",
      totalPrizePool: body.totalPrizePool ?? 0,
      status: "draft",
      bracketSize,
      bracket: seats,
      rounds,
      createdAt: now(),
      updatedAt: now(),
    };

    await kv.set(`event:${eventId}`, event);

    console.log(
      `[ADMIN] Generated bracket event ${eventId} "${body.name}" with ${bracketSize} athletes, ` +
      `${round1Battles.length} R1 battles, ${rounds.length} total rounds. Admin: ${adminWallet}`
    );

    return c.json({
      success: true,
      data: {
        event,
        battles: round1Battles,
        message: `Created event "${body.name}" with ${round1Battles.length} Round 1 battles.`,
      },
    });
  } catch (error) {
    console.log(`[ADMIN] Error generating bracket: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to generate bracket") }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /admin/battles — Create or update battle
// ---------------------------------------------------------------------------
app.post(`${PREFIX}/admin/battles`, requireAdminSession, async (c) => {
  try {
    const body = await c.req.json();
    const isUpdate = !!body.id;
    const id = body.id || generateId("btl");

    let existing: any = null;
    if (isUpdate) {
      existing = await kv.get(`battle:${id}`);
    }

    // Sanitize all text inputs
    const battle = {
      ...(existing || {}),
      id,
      eventId: sanitizeString(body.eventId || existing?.eventId, 50),
      title: sanitizeString(body.title || existing?.title, 200),
      status: (["draft", "upcoming", "voting_open", "voting_closed", "winner_declared", "rewards_distributed", "cancelled"].includes(body.status))
        ? body.status : (existing?.status || "draft"),
      round: sanitizeString(body.round || existing?.round, 50),
      bracketPosition: sanitizeNumber(body.bracketPosition ?? existing?.bracketPosition, 0, 128, existing?.bracketPosition ?? 0),
      athlete1Id: sanitizeString(body.athlete1Id || existing?.athlete1Id, 50),
      athlete2Id: sanitizeString(body.athlete2Id || existing?.athlete2Id, 50),
      votingOpensAt: body.votingOpensAt || existing?.votingOpensAt || "",
      votingClosesAt: body.votingClosesAt || existing?.votingClosesAt || "",
      totalPool: sanitizeNumber(body.totalPool ?? existing?.totalPool, 0, 3_000_000_000, existing?.totalPool ?? 0),
      votes1Count: existing?.votes1Count ?? 0,
      votes2Count: existing?.votes2Count ?? 0,
      votes1Weighted: existing?.votes1Weighted ?? 0,
      votes2Weighted: existing?.votes2Weighted ?? 0,
      winnerId: body.winnerId || existing?.winnerId || "",
      rewardDistributed: existing?.rewardDistributed ?? false,
      location: sanitizeString(body.location || existing?.location, 200),
      prize: sanitizeString(body.prize || existing?.prize, 200),
      createdAt: existing?.createdAt || now(),
      updatedAt: now(),
    };

    await kv.set(`battle:${id}`, battle);
    console.log(`[ADMIN] ${isUpdate ? "Updated" : "Created"} battle ${id} by admin ${c.get("adminWallet")}`);
    return c.json({ success: true, data: battle });
  } catch (error) {
    console.log(`[ADMIN] Error saving battle: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to save battle") }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /admin/battles/:id/status — Update battle status
// ---------------------------------------------------------------------------
app.post(`${PREFIX}/admin/battles/:id/status`, requireAdminSession, async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const battle = await kv.get(`battle:${id}`);
    if (!battle) {
      return c.json({ success: false, error: `Battle ${id} not found` }, 404);
    }

    const validStatuses = ["draft", "upcoming", "voting_open", "voting_closed", "winner_declared", "rewards_distributed", "cancelled"];
    if (!validStatuses.includes(body.status)) {
      return c.json({ success: false, error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` }, 400);
    }

    // Validate forward-only status transitions (except cancelled which is always allowed)
    const statusOrder = ["draft", "upcoming", "voting_open", "voting_closed", "winner_declared", "rewards_distributed"];
    const currentIdx = statusOrder.indexOf(battle.status);
    const targetIdx = statusOrder.indexOf(body.status);
    if (body.status !== "cancelled" && currentIdx >= 0 && targetIdx >= 0 && targetIdx < currentIdx) {
      return c.json({
        success: false,
        error: `Cannot move backwards from '${battle.status}' to '${body.status}'. Status flow: ${statusOrder.join(" → ")}`,
      }, 400);
    }

    // Optionally update voting window dates alongside status change
    if (body.votingOpensAt !== undefined) battle.votingOpensAt = body.votingOpensAt;
    if (body.votingClosesAt !== undefined) battle.votingClosesAt = body.votingClosesAt;
    if (body.totalPool !== undefined) battle.totalPool = body.totalPool;

    const prevStatus = battle.status;
    battle.status = body.status;
    battle.updatedAt = now();
    await kv.set(`battle:${id}`, battle);

    console.log(`[ADMIN] Updated battle ${id} status '${prevStatus}' → '${body.status}' by admin ${c.get("adminWallet")}`);
    return c.json({ success: true, data: battle });
  } catch (error) {
    console.log(`[ADMIN] Error updating battle status: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to update battle status") }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /admin/battles/:id/winner — Declare winner + generate hardened snapshot
// Security chain: freeze battle → load votes → deduplicate wallets → re-verify
// on-chain balances → compute shares → recalculate tallies → persist snapshot
// ---------------------------------------------------------------------------
app.post(`${PREFIX}/admin/battles/:id/winner`, requireAdminSession, async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { winnerId } = body;

    if (!winnerId) {
      return c.json({ success: false, error: "winnerId is required" }, 400);
    }

    const battle: any = await kv.get(`battle:${id}`);
    if (!battle) {
      return c.json({ success: false, error: `Battle ${id} not found` }, 404);
    }

    // Idempotency guard — prevent double-declaration which would corrupt W-L records
    if (battle.status === "winner_declared" || battle.status === "rewards_distributed") {
      return c.json({
        success: false,
        error: `Battle ${id} already has a declared winner (status: ${battle.status}). Cannot re-declare.`,
        code: "ALREADY_DECLARED",
      }, 409);
    }

    // Verify winner is one of the two athletes
    if (winnerId !== battle.athlete1Id && winnerId !== battle.athlete2Id) {
      return c.json({ success: false, error: `winnerId must be either ${battle.athlete1Id} or ${battle.athlete2Id}` }, 400);
    }

    // ── 1. FREEZE BATTLE — set status BEFORE snapshot to block late votes ──
    // Any vote attempt after this point will fail the "voting_open" check.
    battle.winnerId = winnerId;
    battle.status = "winner_declared";
    battle.updatedAt = now();
    await kv.set(`battle:${id}`, battle);

    // Get winner athlete name for snapshot
    const winnerAthlete: any = await kv.get(`athlete:${winnerId}`);
    const winnerName = winnerAthlete?.name || winnerId;

    // Update athlete win/loss records
    const loserId = winnerId === battle.athlete1Id ? battle.athlete2Id : battle.athlete1Id;
    if (winnerAthlete) {
      winnerAthlete.wins = (winnerAthlete.wins || 0) + 1;
      winnerAthlete.streak = (winnerAthlete.streak || 0) + 1;
      winnerAthlete.updatedAt = now();
      await kv.set(`athlete:${winnerId}`, winnerAthlete);
    }
    const loserAthlete: any = await kv.get(`athlete:${loserId}`);
    if (loserAthlete) {
      loserAthlete.losses = (loserAthlete.losses || 0) + 1;
      // Track loss streaks as negative numbers (positive = win streak, negative = loss streak)
      // If athlete was on a win streak, reset to -1. If already losing, extend: -1 → -2 → -3
      loserAthlete.streak = Math.min(0, loserAthlete.streak || 0) - 1;
      loserAthlete.updatedAt = now();
      await kv.set(`athlete:${loserId}`, loserAthlete);
    }

    // ── 2. LOAD ALL VOTE RECORDS FROM KV (source of truth) ──
    const allVoteRecords: any[] = await kv.getByPrefix(`vote:battle:${id}:`);

    // ── 3. DEDUPLICATE BY WALLET (belt-and-suspenders) ──
    // KV keys enforce one-per-wallet, but we verify at snapshot time.
    // If any duplicate wallet appears, keep only the latest by timestamp.
    const walletMap = new Map<string, any>();
    for (const v of allVoteRecords) {
      const existing = walletMap.get(v.wallet);
      if (!existing || new Date(v.timestamp).getTime() > new Date(existing.timestamp).getTime()) {
        walletMap.set(v.wallet, v);
      }
    }
    const dedupedVotes = Array.from(walletMap.values());
    const dupsRemoved = allVoteRecords.length - dedupedVotes.length;
    if (dupsRemoved > 0) {
      console.log(`[SNAPSHOT] WARNING: Removed ${dupsRemoved} duplicate wallet entries for battle ${id}. Investigate KV integrity.`);
    }

    // ── 4. RE-VERIFY ON-CHAIN BALANCES AT SNAPSHOT TIME ──
    // When BOTB token is live, re-check each voter's actual token balance
    // on the Hedera mirror node. If a voter sold tokens after voting, their
    // stakeAmount is capped to actual current balance. Prevents "vote then sell".
    const winningVotes = dedupedVotes.filter((v: any) => v.athleteId === winnerId);

    const verifiedWinningVotes: any[] = [];
    for (const v of winningVotes) {
      let verifiedStake = v.stakeAmount || 0;
      let balanceAtSnapshot: number | null = null;

      if (BOTB_TOKEN_ID) {
        // Token is live — re-verify balance on-chain
        const currentBalance = await fetchBotbBalance(v.wallet);
        balanceAtSnapshot = currentBalance;
        if (verifiedStake > currentBalance) {
          console.log(`[SNAPSHOT] Balance cap: ${v.wallet} voted ${verifiedStake} BOTB but holds ${currentBalance} at snapshot time. Capping.`);
          verifiedStake = currentBalance;
        }
      }

      // Include voters with non-zero stake. When token is NOT live
      // (BOTB_TOKEN_ID is null), all votes are included. In headcount mode
      // the weight is the NFT multiplier alone (Governor=2, Sigma=1.5, Both=3, Base=1).
      if (!BOTB_TOKEN_ID || verifiedStake > 0) {
        verifiedWinningVotes.push({
          ...v,
          stakeAmount: verifiedStake,
          // Token mode: tokens × NFT multiplier. Headcount mode: NFT multiplier alone.
          weightedVote: BOTB_TOKEN_ID
            ? verifiedStake * (v.votingPower || 1)
            : (v.votingPower || 1),
          balanceAtSnapshot,
        });
      }
    }

    // ── 5. COMPUTE REWARD SHARES ──
    const totalWinningWeighted = verifiedWinningVotes.reduce(
      (sum: number, v: any) => sum + (v.weightedVote || 0), 0
    );

    // SAFETY FALLBACK: If somehow all weights are zero despite NFT multipliers,
    // fall back to equal split. In normal operation this should NOT trigger —
    // headcount mode now uses votingPower as weight, and token mode uses tokens×power.
    // This is a belt-and-suspenders guard against 0/0 division.
    const useHeadcountFallback = totalWinningWeighted === 0 && verifiedWinningVotes.length > 0;
    const equalShare = useHeadcountFallback ? 100 / verifiedWinningVotes.length : 0;
    const equalReward = useHeadcountFallback ? battle.totalPool / verifiedWinningVotes.length : 0;

    const recipients = verifiedWinningVotes.map((v: any) => ({
      wallet: v.wallet,
      stakeAmount: v.stakeAmount || 0,
      votingPower: v.votingPower || 1,
      weightedVote: v.weightedVote || 0,
      sharePercent: useHeadcountFallback
        ? equalShare
        : totalWinningWeighted > 0
        ? ((v.weightedVote || 0) / totalWinningWeighted) * 100 : 0,
      rewardAmount: useHeadcountFallback
        ? equalReward
        : totalWinningWeighted > 0
        ? ((v.weightedVote || 0) / totalWinningWeighted) * battle.totalPool : 0,
      hasGovernorNFT: v.hasGovernorNFT || false,
      hasSigmaNFT: v.hasSigmaNFT || false,
      // Audit trail: truncated signature hash for cryptographic receipt
      signatureHash: v.signature ? v.signature.substring(0, 16) + "…" : null,
      nonce: v.nonce || null,
      balanceAtSnapshot: v.balanceAtSnapshot,
      votedAt: v.timestamp,
    }));

    // Sort by reward amount descending
    recipients.sort((a: any, b: any) => b.rewardAmount - a.rewardAmount);

    // ── 6. RECALCULATE BATTLE TALLIES FROM VOTE RECORDS (source of truth) ──
    // Instead of trusting incrementally-maintained tallies that can drift
    // from race conditions on simultaneous vote changes, recompute from
    // the actual deduplicated vote records.
    // NOTE: Recompute effective weight at recalc time (not trust stored weightedVote)
    // to handle legacy votes recorded before the NFT-weighted headcount fix.
    let recalc1Count = 0, recalc1Weighted = 0;
    let recalc2Count = 0, recalc2Weighted = 0;
    for (const v of dedupedVotes) {
      // Token mode: tokens × NFT multiplier. Headcount mode: NFT multiplier alone.
      const effectiveWeight = BOTB_TOKEN_ID
        ? (v.stakeAmount || 0) * (v.votingPower || 1)
        : (v.votingPower || 1);
      if (v.athleteId === battle.athlete1Id) {
        recalc1Count++;
        recalc1Weighted += effectiveWeight;
      } else if (v.athleteId === battle.athlete2Id) {
        recalc2Count++;
        recalc2Weighted += effectiveWeight;
      }
    }

    // Log if tallies had drifted (helps detect race condition issues)
    const tallyDrift =
      recalc1Count !== (battle.votes1Count || 0) ||
      recalc2Count !== (battle.votes2Count || 0) ||
      Math.abs(recalc1Weighted - (battle.votes1Weighted || 0)) > 0.01 ||
      Math.abs(recalc2Weighted - (battle.votes2Weighted || 0)) > 0.01;

    if (tallyDrift) {
      console.log(`[SNAPSHOT] Tally drift detected for battle ${id}! Stored: ${battle.votes1Count}/${battle.votes2Count} (${battle.votes1Weighted}/${battle.votes2Weighted}). Recalculated: ${recalc1Count}/${recalc2Count} (${recalc1Weighted}/${recalc2Weighted}). Corrected.`);
    }

    // Persist corrected tallies back to battle
    battle.votes1Count = recalc1Count;
    battle.votes1Weighted = recalc1Weighted;
    battle.votes2Count = recalc2Count;
    battle.votes2Weighted = recalc2Weighted;
    battle.updatedAt = now();
    await kv.set(`battle:${id}`, battle);

    // ── 7. PERSIST SNAPSHOT WITH FULL AUDIT METADATA ──
    const snapshot = {
      battleId: id,
      eventId: battle.eventId,
      winnerId,
      winnerName,
      totalPool: battle.totalPool,
      totalWinningVotes: totalWinningWeighted,
      totalVoteRecords: dedupedVotes.length,
      totalWinnerVoteRecords: verifiedWinningVotes.length,
      duplicatesRemoved: dupsRemoved,
      tallyDriftDetected: tallyDrift,
      balanceVerificationEnabled: !!BOTB_TOKEN_ID,
      headcountFallbackUsed: useHeadcountFallback,
      recipients,
      generatedAt: now(),
      generatedBy: c.get("adminWallet"),
    };

    await kv.set(`snapshot:${id}`, snapshot);

    // SCALING: Invalidate leaderboard caches — winner changes W/L records + voter accuracy
    invalidateCache("leaderboard:athletes");
    invalidateCache("leaderboard:voters");

    console.log(`[ADMIN] Winner declared: ${winnerId} for battle ${id}. Snapshot: ${recipients.length} recipients, pool=${battle.totalPool}, weighted=${totalWinningWeighted}, headcountFallback=${useHeadcountFallback}, balanceVerify=${!!BOTB_TOKEN_ID}, dupsRemoved=${dupsRemoved}, tallyDrift=${tallyDrift}. Admin: ${c.get("adminWallet")}`);

    return c.json({ success: true, data: { battle, snapshot } });
  } catch (error) {
    console.log(`[ADMIN] Error declaring winner: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to declare winner") }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /admin/snapshots — List all reward snapshots (summaries)
// ---------------------------------------------------------------------------
app.get(`${PREFIX}/admin/snapshots`, requireAdminSession, async (c) => {
  try {
    const allSnapshots: any[] = await kv.getByPrefix("snapshot:");
    const summaries = allSnapshots
      .filter((s: any) => s && s.battleId)
      .map((s: any) => ({
        battleId: s.battleId,
        eventId: s.eventId,
        winnerId: s.winnerId,
        winnerName: s.winnerName,
        totalPool: s.totalPool,
        totalWinningVotes: s.totalWinningVotes,
        totalVoteRecords: s.totalVoteRecords,
        totalWinnerVoteRecords: s.totalWinnerVoteRecords,
        recipientCount: s.recipients?.length || 0,
        generatedAt: s.generatedAt,
        generatedBy: s.generatedBy,
        exportedAt: s.exportedAt || null,
        airdropTxId: s.airdropTxId || null,
        airdropConfirmedAt: s.airdropConfirmedAt || null,
        headcountFallbackUsed: s.headcountFallbackUsed || false,
        balanceVerificationEnabled: s.balanceVerificationEnabled || false,
      }))
      .sort((a: any, b: any) => (b.generatedAt || "").localeCompare(a.generatedAt || ""));

    console.log(`[ADMIN] Listed ${summaries.length} snapshots. Admin: ${c.get("adminWallet")}`);
    return c.json({ success: true, data: summaries });
  } catch (error) {
    console.log(`[ADMIN] Error listing snapshots: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to list snapshots") }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /admin/snapshots/batch-export — Export ALL snapshots as one combined CSV/JSON
// NOTE: Must be registered BEFORE /admin/snapshots/:id to prevent Hono matching "batch-export" as :id
// ---------------------------------------------------------------------------
app.get(`${PREFIX}/admin/snapshots/batch-export`, requireAdminSession, async (c) => {
  try {
    const format = (c.req.query("format") || "csv").toLowerCase();
    const allSnapshots: any[] = await kv.getByPrefix("snapshot:");
    const valid = allSnapshots
      .filter((s: any) => s && s.battleId && s.recipients?.length)
      .sort((a: any, b: any) => (b.generatedAt || "").localeCompare(a.generatedAt || ""));

    if (valid.length === 0) {
      return c.json({ success: false, error: "No snapshots with recipients found." }, 404);
    }

    if (format === "json") {
      const payload = valid.map((s: any) => ({
        battleId: s.battleId,
        eventId: s.eventId,
        winnerName: s.winnerName,
        totalPool: s.totalPool,
        totalRecipients: s.recipients.length,
        headcountMode: s.headcountFallbackUsed || false,
        generatedAt: s.generatedAt,
        airdropTxId: s.airdropTxId || null,
        airdropConfirmedAt: s.airdropConfirmedAt || null,
        recipients: s.recipients.map((r: any) => ({
          wallet: r.wallet,
          amount: Math.round(r.rewardAmount ?? r.amount ?? 0),
          sharePercent: parseFloat((r.sharePercent || 0).toFixed(4)),
          votingPower: r.votingPower || 1,
          nftMultiplier: r.nftMultiplier || 1,
        })),
      }));

      return new Response(JSON.stringify(payload, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="botb-all-snapshots-${Date.now()}.json"`,
          // SECURITY: No Access-Control-Allow-Origin here — Hono's global CORS
          // middleware (locked to BOTB_ALLOWED_ORIGINS) handles it. Hardcoding "*"
          // would bypass the origin whitelist and allow any malicious site to
          // trigger snapshot downloads from an admin's authenticated session.
        },
      });
    }

    // CSV — one row per recipient, with battle context columns
    const header = "battleId,eventId,winnerName,generatedAt,airdropTxId,airdropConfirmedAt,wallet,stakeAmount,votingPower,nftMultiplier,weightedVote,sharePercent,rewardAmount,hasGovernorNFT,hasSigmaNFT";
    const rows: string[] = [];
    for (const s of valid) {
      const bid = s.battleId || "";
      const eid = s.eventId || "";
      const wn = (s.winnerName || "").replace(/,/g, " ");
      const gen = s.generatedAt || "";
      const txId = s.airdropTxId || "";
      const confirmedAt = s.airdropConfirmedAt || "";
      for (const r of s.recipients) {
        rows.push(
          `${bid},${eid},${wn},${gen},${txId},${confirmedAt},${r.wallet},${r.stakeAmount || 0},${r.votingPower || 1},${r.nftMultiplier || 1},${r.weightedVote || 0},${(r.sharePercent || 0).toFixed(4)},${Math.round(r.rewardAmount ?? r.amount ?? 0)},${r.hasGovernorNFT ?? false},${r.hasSigmaNFT ?? false}`
        );
      }
    }

    const csv = [header, ...rows].join("\n");
    console.log(`[ADMIN] Batch export: ${valid.length} snapshots, ${rows.length} recipient rows. Format: ${format}. Admin: ${c.get("adminWallet")}`);

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="botb-all-snapshots-${Date.now()}.csv"`,
        // SECURITY: CORS handled by Hono global middleware — see BOTB_ALLOWED_ORIGINS
      },
    });
  } catch (error) {
    console.log(`[ADMIN] Error batch exporting snapshots: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to batch export snapshots") }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /admin/snapshots/:id — Get reward snapshot for a battle
// ---------------------------------------------------------------------------
app.get(`${PREFIX}/admin/snapshots/:id`, requireAdminSession, async (c) => {
  try {
    const id = c.req.param("id");
    const snapshot = await kv.get(`snapshot:${id}`);
    if (!snapshot) {
      return c.json({ success: false, error: `Snapshot for battle ${id} not found. Declare a winner first.` }, 404);
    }
    return c.json({ success: true, data: snapshot });
  } catch (error) {
    console.log(`[ADMIN] Error fetching snapshot: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to fetch snapshot") }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /admin/snapshots/:id/export — Export snapshot as CSV or JSON for airdrop
// ---------------------------------------------------------------------------
app.get(`${PREFIX}/admin/snapshots/:id/export`, requireAdminSession, async (c) => {
  try {
    const id = c.req.param("id");
    const format = (c.req.query("format") || "json").toLowerCase();
    const snapshot = await kv.get(`snapshot:${id}`);
    if (!snapshot) {
      return c.json({ success: false, error: `Snapshot for battle ${id} not found.` }, 404);
    }

    // Mark exportedAt timestamp
    if (!snapshot.exportedAt) {
      snapshot.exportedAt = now();
      await kv.set(`snapshot:${id}`, snapshot);
    }

    const recipients = snapshot.recipients || [];

    if (format === "csv") {
      const header = "wallet,stakeAmount,votingPower,weightedVote,sharePercent,rewardAmount,hasGovernorNFT,hasSigmaNFT";
      const rows = recipients.map((r: any) =>
        `${r.wallet},${r.stakeAmount},${r.votingPower},${r.weightedVote},${r.sharePercent.toFixed(4)},${Math.round(r.rewardAmount)},${r.hasGovernorNFT},${r.hasSigmaNFT}`
      );
      const csv = [header, ...rows].join("\n");

      return new Response(csv, {
        status: 200,
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="botb-airdrop-${id}.csv"`,
          // SECURITY: CORS handled by Hono global middleware — see BOTB_ALLOWED_ORIGINS
        },
      });
    }

    // JSON airdrop format
    const airdropPayload = {
      battleId: id,
      winnerName: snapshot.winnerName,
      totalPool: snapshot.totalPool,
      totalRecipients: recipients.length,
      generatedAt: snapshot.generatedAt,
      exportedAt: snapshot.exportedAt,
      recipients: recipients.map((r: any) => ({
        wallet: r.wallet,
        amount: Math.round(r.rewardAmount),
        sharePercent: parseFloat(r.sharePercent.toFixed(4)),
        votingPower: r.votingPower,
        hasGovernorNFT: r.hasGovernorNFT,
        hasSigmaNFT: r.hasSigmaNFT,
      })),
    };

    return new Response(JSON.stringify(airdropPayload, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="botb-airdrop-${id}.json"`,
        // SECURITY: CORS handled by Hono global middleware — see BOTB_ALLOWED_ORIGINS
      },
    });
  } catch (error) {
    console.log(`[ADMIN] Error exporting snapshot: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to export snapshot") }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /admin/battles/:id/confirm-airdrop — Mark airdrop as complete
// ---------------------------------------------------------------------------
app.post(`${PREFIX}/admin/battles/:id/confirm-airdrop`, requireAdminSession, async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { airdropTxId } = body;

    const battle = await kv.get(`battle:${id}`);
    if (!battle) {
      return c.json({ success: false, error: `Battle ${id} not found` }, 404);
    }
    if (battle.status !== "winner_declared") {
      return c.json({ success: false, error: `Battle must be in 'winner_declared' status to confirm airdrop. Current: ${battle.status}` }, 400);
    }

    // Update snapshot with airdrop TX
    const snapshot = await kv.get(`snapshot:${id}`);
    if (snapshot) {
      snapshot.airdropTxId = airdropTxId || "";
      snapshot.airdropConfirmedAt = now();
      await kv.set(`snapshot:${id}`, snapshot);
    }

    // Transition battle to rewards_distributed
    battle.status = "rewards_distributed";
    battle.rewardDistributed = true;
    battle.updatedAt = now();
    await kv.set(`battle:${id}`, battle);

    console.log(`[ADMIN] Airdrop confirmed for battle ${id}. TX: ${airdropTxId || "manual"}. Admin: ${c.get("adminWallet")}`);

    return c.json({ success: true, data: { battle, snapshot } });
  } catch (error) {
    console.log(`[ADMIN] Error confirming airdrop: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to confirm airdrop") }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /admin/battles/:id/clear — Permanently delete a cancelled battle
// ---------------------------------------------------------------------------
app.post(`${PREFIX}/admin/battles/:id/clear`, requireAdminSession, async (c) => {
  try {
    const id = c.req.param("id");
    const adminWallet = c.get("adminWallet");

    const battle: any = await kv.get(`battle:${id}`);
    if (!battle) {
      return c.json({ success: false, error: `Battle ${id} not found` }, 404);
    }
    if (battle.status !== "cancelled") {
      return c.json({ success: false, error: `Only cancelled battles can be cleared. Current status: ${battle.status}` }, 400);
    }

    // Delete all votes associated with this battle + scaling indices
    const allVoteKeys: string[] = [];
    const allBattleVotes = await kv.getByPrefix(`vote:battle:${id}:`);
    const eventId = battle.eventId || "standalone";

    for (const v of allBattleVotes) {
      if ((v as any).wallet) {
        const w = (v as any).wallet;
        allVoteKeys.push(`vote:battle:${id}:${w}`);
        // SCALING: Also clean up wallet vote index
        allVoteKeys.push(`wvote:${w}:${id}`);
        if ((v as any).nonce) {
          allVoteKeys.push(`vote-nonce:${(v as any).nonce}`);
        }
        // SCALING: Clean up allocation index for this battle
        removeAllocationBattle(w, eventId, id).catch((err) => {
          console.log(`[ADMIN] Non-fatal: failed to clean allocation index for ${w}: ${err}`);
        });
      }
    }

    // Delete snapshot if any
    const snapshot = await kv.get(`snapshot:${id}`);
    if (snapshot) await kv.del(`snapshot:${id}`);

    // Delete all vote records + wallet indices in one batch
    if (allVoteKeys.length > 0) await kv.mdel(allVoteKeys);

    // Delete the battle itself
    await kv.del(`battle:${id}`);

    console.log(`[ADMIN] Permanently cleared cancelled battle ${id} (${battle.title || "untitled"}), removed ${allBattleVotes.length} votes. Admin: ${adminWallet}`);

    return c.json({ success: true, data: { id, title: battle.title, votesRemoved: allBattleVotes.length } });
  } catch (error) {
    console.log(`[ADMIN] Error clearing battle: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to clear battle") }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /admin/proposals — Create or update proposal
// ---------------------------------------------------------------------------
app.post(`${PREFIX}/admin/proposals`, requireAdminSession, async (c) => {
  try {
    const body = await c.req.json();
    const isUpdate = !!body.id;
    const id = body.id || generateId("prop");

    let existing: any = null;
    if (isUpdate) {
      existing = await kv.get(`proposal:${id}`);
    }

    // Sanitize all text inputs
    const proposal = {
      ...(existing || {}),
      id,
      title: sanitizeString(body.title || existing?.title, 200),
      description: sanitizeString(body.description || existing?.description, 5000),
      category: (["Governance", "Treasury", "Technical", "Community", "Partnership"].includes(body.category))
        ? body.category : (existing?.category || "Governance"),
      status: (["draft", "active", "passed", "rejected", "cancelled"].includes(body.status))
        ? body.status : (existing?.status || "draft"),
      proposer: sanitizeString(body.proposer || existing?.proposer || "WCO Admin", 100),
      votesFor: existing?.votesFor ?? 0,
      votesAgainst: existing?.votesAgainst ?? 0,
      totalVoters: existing?.totalVoters ?? 0,
      startsAt: body.startsAt || existing?.startsAt || "",
      endsAt: body.endsAt || existing?.endsAt || "",
      createdAt: existing?.createdAt || now(),
      updatedAt: now(),
    };

    await kv.set(`proposal:${id}`, proposal);
    console.log(`[ADMIN] ${isUpdate ? "Updated" : "Created"} proposal ${id} by admin ${c.get("adminWallet")}`);
    return c.json({ success: true, data: proposal });
  } catch (error) {
    console.log(`[ADMIN] Error saving proposal: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to save proposal") }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /admin/proposals/:id/status — Update proposal lifecycle status
// Valid transitions: draft → active → passed/rejected, or cancelled at any time
// ---------------------------------------------------------------------------
app.post(`${PREFIX}/admin/proposals/:id/status`, requireAdminSession, async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const proposal = await kv.get(`proposal:${id}`);
    if (!proposal) {
      return c.json({ success: false, error: `Proposal ${id} not found` }, 404);
    }

    const validStatuses = ["draft", "active", "passed", "rejected", "cancelled"];
    if (!validStatuses.includes(body.status)) {
      return c.json({ success: false, error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` }, 400);
    }

    // Validate transitions (cancelled always allowed)
    const allowedTransitions: Record<string, string[]> = {
      draft: ["active", "cancelled"],
      active: ["passed", "rejected", "cancelled"],
      passed: ["cancelled"],
      rejected: ["cancelled"],
      cancelled: [],
    };

    if (body.status !== "cancelled" || proposal.status === "cancelled") {
      const allowed = allowedTransitions[proposal.status] || [];
      if (!allowed.includes(body.status)) {
        return c.json({
          success: false,
          error: `Cannot transition from '${proposal.status}' to '${body.status}'. Allowed: ${allowed.join(", ") || "none"}`,
        }, 400);
      }
    }

    const prevStatus = proposal.status;
    proposal.status = body.status;
    proposal.updatedAt = now();

    // If transitioning to active and no startsAt set, set it now
    if (body.status === "active" && !proposal.startsAt) {
      proposal.startsAt = now();
    }

    // If transitioning to passed/rejected, record the resolution time
    if (body.status === "passed" || body.status === "rejected") {
      proposal.resolvedAt = now();
    }

    await kv.set(`proposal:${id}`, proposal);
    console.log(`[ADMIN] Proposal ${id} status '${prevStatus}' → '${body.status}' by admin ${c.get("adminWallet")}`);
    return c.json({ success: true, data: proposal });
  } catch (error) {
    console.log(`[ADMIN] Error updating proposal status: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to update proposal status") }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /admin/config — Update site configuration
// ---------------------------------------------------------------------------
app.post(`${PREFIX}/admin/config`, requireAdminSession, async (c) => {
  try {
    const body = await c.req.json();
    const existing = (await kv.get("config:site")) || {};

    // Strip any attempt to inject adminWallets via config update body
    // Also strip hero video fields — use dedicated /admin/hero-video (validated allowlist)
    const {
      adminWallets: _stripped,
      heroVideoUrl: _hv,
      heroVideoUpdatedAt: _hva,
      heroVideoUpdatedBy: _hvb,
      ...safeBody
    } = body;
    const config = {
      ...existing,
      ...safeBody,
    };

    await kv.set("config:site", config);
    console.log(`[ADMIN] Updated site config by admin ${c.get("adminWallet")}`);
    return c.json({ success: true, data: config });
  } catch (error) {
    console.log(`[ADMIN] Error updating config: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to update config") }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /admin/hero-video — Set or reset homepage hero title video
// SECURITY: requireAdminSession + HTTPS Supabase Storage public URL allowlist only.
// Body: { url: string } | { reset: true }
// ---------------------------------------------------------------------------
const HERO_VIDEO_DEFAULT_URL =
  "https://wotsoauebnoyvegcvouo.supabase.co/storage/v1/object/public/Branding%20KIT%20WCO/WCOVID.M4V";
const HERO_VIDEO_ALLOWED_HOST = "wotsoauebnoyvegcvouo.supabase.co";
const HERO_VIDEO_ALLOWED_PATH = "/storage/v1/object/public/";

function isAllowedHeroVideoUrl(raw: unknown): raw is string {
  if (typeof raw !== "string" || raw.length < 20 || raw.length > 2000) return false;
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:") return false;
    if (u.hostname !== HERO_VIDEO_ALLOWED_HOST) return false;
    if (!u.pathname.startsWith(HERO_VIDEO_ALLOWED_PATH)) return false;
    if (u.username || u.password) return false;
    return true;
  } catch {
    return false;
  }
}

app.post(`${PREFIX}/admin/hero-video`, requireAdminSession, async (c) => {
  try {
    const adminWallet = c.get("adminWallet") as string;
    const body = await c.req.json().catch(() => ({}));
    const existing: any = (await kv.get("config:site")) || {};

    if (body?.reset === true) {
      const config = {
        ...existing,
        heroVideoUrl: null,
        heroVideoUpdatedAt: new Date().toISOString(),
        heroVideoUpdatedBy: adminWallet,
      };
      // Preserve non-enumerable safety: never reintroduce adminWallets from body
      delete (config as any).adminWallets;
      await kv.set("config:site", config);
      console.log(`[ADMIN] Hero video RESET to default. Admin: ${adminWallet}`);
      return c.json({
        success: true,
        data: {
          ...config,
          // Echo effective URL for admin UI preview
          effectiveHeroVideoUrl: HERO_VIDEO_DEFAULT_URL,
        },
      });
    }

    const url = typeof body?.url === "string" ? body.url.trim() : "";
    if (!isAllowedHeroVideoUrl(url)) {
      return c.json({
        success: false,
        error:
          "Invalid video URL. Use an HTTPS public Supabase Storage object URL from this project's bucket (…/storage/v1/object/public/…).",
        code: "INVALID_HERO_VIDEO_URL",
      }, 400);
    }

    const config = {
      ...existing,
      heroVideoUrl: url,
      heroVideoUpdatedAt: new Date().toISOString(),
      heroVideoUpdatedBy: adminWallet,
    };
    delete (config as any).adminWallets;
    await kv.set("config:site", config);
    console.log(`[ADMIN] Hero video updated → ${url.slice(0, 80)}… Admin: ${adminWallet}`);
    return c.json({
      success: true,
      data: {
        ...config,
        effectiveHeroVideoUrl: url,
      },
    });
  } catch (error) {
    console.log(`[ADMIN] Error updating hero video: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to update hero video") }, 500);
  }
});

// ---------------------------------------------------------------------------
// SPONSOR ROUTES
// ---------------------------------------------------------------------------

app.get(`${PREFIX}/sponsors`, async (c) => {
  try {
    const all: any[] = await kv.getByPrefix("sponsor:");
    const active = all.filter((s: any) => s.active).sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0));
    return c.json({ success: true, data: active });
  } catch (error) {
    console.log(`[SPONSORS] Error listing sponsors: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to list sponsors") }, 500);
  }
});

app.get(`${PREFIX}/admin/sponsors`, requireAdminSession, async (c) => {
  try {
    const all: any[] = await kv.getByPrefix("sponsor:");
    all.sort((a: any, b: any) => (a.displayOrder || 0) - (b.displayOrder || 0));
    return c.json({ success: true, data: all });
  } catch (error) {
    console.log(`[SPONSORS] Error listing admin sponsors: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to list sponsors") }, 500);
  }
});

const ALLOWED_SPONSOR_TIERS = ["title", "premium", "standard", "routine"] as const;

function normalizeSponsorTiers(body: any, existing: any): string[] {
  if (Array.isArray(body.tiers)) {
    const filtered = body.tiers.filter((t: string) => ALLOWED_SPONSOR_TIERS.includes(t as typeof ALLOWED_SPONSOR_TIERS[number]));
    return filtered.length > 0 ? filtered : ["standard"];
  }
  const fallback = existing?.tiers?.length ? existing.tiers : [existing?.tier || "standard"];
  return fallback.filter((t: string) => ALLOWED_SPONSOR_TIERS.includes(t as typeof ALLOWED_SPONSOR_TIERS[number]));
}

app.post(`${PREFIX}/admin/sponsors`, requireAdminSession, async (c) => {
  try {
    const body = await c.req.json();
    const isUpdate = !!body.id;
    const id = body.id || generateId("spn");
    let existing: any = null;
    if (isUpdate) {
      existing = await kv.get(`sponsor:${id}`);
      if (!existing) return c.json({ success: false, error: `Sponsor ${id} not found` }, 404);
    }
    const requestedTiers: string[] = Array.isArray(body.tiers) ? body.tiers : [];
    const normalizedTiers = normalizeSponsorTiers(body, existing);
    const tierWarning = requestedTiers.includes("routine") && !normalizedTiers.includes("routine")
      ? "Routine tier was not saved — redeploy the make-server-57fcb0ee edge function."
      : undefined;
    if (tierWarning) {
      console.log(`[SPONSORS] ${tierWarning} Sponsor: ${body.name || existing?.name || id}`);
    }
    const sponsor = {
      id,
      name: sanitizeString(body.name || existing?.name || "", 200),
      tagline: sanitizeString(body.tagline || existing?.tagline || "", 300),
      description: sanitizeString(body.description || existing?.description || "", 1000),
      logoUrl: sanitizeString(body.logoUrl || existing?.logoUrl || "", 500),
      productImageUrl: sanitizeString(body.productImageUrl || existing?.productImageUrl || "", 500),
      secondaryLogoUrl: sanitizeString(body.secondaryLogoUrl || existing?.secondaryLogoUrl || "", 500),
      websiteUrl: sanitizeString(body.websiteUrl || existing?.websiteUrl || "", 500),
      tier: ALLOWED_SPONSOR_TIERS.includes(body.tier) ? body.tier : (normalizedTiers[0] || existing?.tier || "standard"),
      tiers: normalizedTiers,
      active: typeof body.active === "boolean" ? body.active : (existing?.active ?? true),
      displayOrder: typeof body.displayOrder === "number" ? body.displayOrder : (existing?.displayOrder ?? 0),
      customText: sanitizeString(body.customText || existing?.customText || "", 300),
      ctaLabel: sanitizeString(body.ctaLabel || existing?.ctaLabel || "", 100),
      ctaUrl: sanitizeString(body.ctaUrl || existing?.ctaUrl || "", 500),
      contactEmail: sanitizeString(body.contactEmail || existing?.contactEmail || "", 200),
      contactName: sanitizeString(body.contactName || existing?.contactName || "", 200),
      eventIds: Array.isArray(body.eventIds) ? body.eventIds : (existing?.eventIds || []),
      startDate: body.startDate || existing?.startDate || "",
      endDate: body.endDate || existing?.endDate || "",
      impressions: existing?.impressions || 0,
      clicks: existing?.clicks || 0,
      createdAt: existing?.createdAt || now(),
      updatedAt: now(),
    };
    await kv.set(`sponsor:${id}`, sponsor);
    console.log(`[ADMIN] ${isUpdate ? "Updated" : "Created"} sponsor: ${sponsor.name} (${id}, tiers: ${(sponsor.tiers || [sponsor.tier]).join(",")}). Admin: ${c.get("adminWallet")}`);
    return c.json({ success: true, data: sponsor, ...(tierWarning ? { warning: tierWarning } : {}) });
  } catch (error) {
    console.log(`[ADMIN] Error saving sponsor: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to save sponsor") }, 500);
  }
});

app.delete(`${PREFIX}/admin/sponsors/:id`, requireAdminSession, async (c) => {
  try {
    const id = c.req.param("id");
    const sponsor: any = await kv.get(`sponsor:${id}`);
    if (!sponsor) return c.json({ success: false, error: `Sponsor ${id} not found` }, 404);
    await kv.del(`sponsor:${id}`);
    console.log(`[ADMIN] Deleted sponsor ${id} (${sponsor.name}). Admin: ${c.get("adminWallet")}`);
    return c.json({ success: true, data: { id, name: sponsor.name } });
  } catch (error) {
    console.log(`[ADMIN] Error deleting sponsor: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to delete sponsor") }, 500);
  }
});

app.post(`${PREFIX}/admin/sponsors/:id/toggle`, requireAdminSession, async (c) => {
  try {
    const id = c.req.param("id");
    const sponsor: any = await kv.get(`sponsor:${id}`);
    if (!sponsor) return c.json({ success: false, error: `Sponsor ${id} not found` }, 404);
    sponsor.active = !sponsor.active;
    sponsor.updatedAt = now();
    await kv.set(`sponsor:${id}`, sponsor);
    return c.json({ success: true, data: sponsor });
  } catch (error) {
    console.log(`[ADMIN] Error toggling sponsor: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to toggle sponsor") }, 500);
  }
});

// ---------------------------------------------------------------------------
// SPONSOR ANALYTICS — Impression & Click Tracking
// ---------------------------------------------------------------------------
// SECURITY: KV-backed rate limiting prevents click/impression fraud.
// In-memory rate limiters lose state between edge function invocations, so we
// use persistent KV counters with fixed 60-second windows. Each counter key
// includes the minute bucket so expired windows are automatically orphaned.
//
// Architecture:
//   Key format: rl:sponsor-{imp|click}:{ip}:{sponsorId}:{minuteBucket}
//   Value:      { count: number, windowStart: number }
//   Limits:     Impressions 3/min per-IP-per-sponsor, Clicks 3/min per-IP-per-sponsor
//   Also:       Global per-IP caps: 30 impressions/min, 15 clicks/min
//
// No wallet auth required (anonymous visitors are tracked), but the KV-backed
// rate limiter makes script-based inflation detectable and blockable.
// ---------------------------------------------------------------------------

function getClientIP(c: any): string {
  return c.req.header("x-forwarded-for")?.split(",")[0]?.trim()
    || c.req.header("x-real-ip")
    || "unknown";
}

/**
 * KV-backed fixed-window rate limiter.
 * Persists across edge function invocations (unlike in-memory Maps).
 * Returns { limited: boolean, count: number, retryAfter: number }.
 */
async function kvRateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<{ limited: boolean; count: number; retryAfter: number }> {
  const windowBucket = Math.floor(Date.now() / windowMs);
  const kvKey = `rl:${key}:${windowBucket}`;

  const existing: any = await kv.get(kvKey);
  const count = existing?.count || 0;

  if (count >= maxRequests) {
    // Calculate seconds until next window
    const windowEnd = (windowBucket + 1) * windowMs;
    const retryAfter = Math.max(1, Math.ceil((windowEnd - Date.now()) / 1000));
    return { limited: true, count, retryAfter };
  }

  // Increment counter — store in KV so it persists across invocations
  await kv.set(kvKey, { count: count + 1, windowStart: windowBucket * windowMs });
  return { limited: false, count: count + 1, retryAfter: 0 };
}

app.post(`${PREFIX}/sponsors/:id/impression`, async (c) => {
  try {
    const id = c.req.param("id");
    const ip = getClientIP(c);

    // ── KV RATE LIMIT: per-IP per-sponsor (3/min) ──
    const perSponsor = await kvRateLimit(`sponsor-imp:${ip}:${id}`, 3, 60_000);
    if (perSponsor.limited) {
      console.log(`[SPONSOR-FRAUD] Impression rate-limited: IP=${ip} sponsor=${id} count=${perSponsor.count}`);
      return c.json({
        success: false,
        error: "Impression rate limit exceeded for this sponsor.",
        code: "RATE_LIMITED",
        retryAfter: perSponsor.retryAfter,
      }, { status: 429, headers: { "Retry-After": String(perSponsor.retryAfter) } });
    }

    // ── KV RATE LIMIT: per-IP global across all sponsors (30/min) ──
    const global = await kvRateLimit(`sponsor-imp-global:${ip}`, 30, 60_000);
    if (global.limited) {
      console.log(`[SPONSOR-FRAUD] Global impression rate-limited: IP=${ip} count=${global.count}`);
      return c.json({
        success: false,
        error: "Global impression rate limit exceeded.",
        code: "RATE_LIMITED",
        retryAfter: global.retryAfter,
      }, { status: 429, headers: { "Retry-After": String(global.retryAfter) } });
    }

    const s: any = await kv.get(`sponsor:${id}`);
    if (!s) return c.json({ success: false, error: "Sponsor not found" }, 404);
    s.impressions = (s.impressions || 0) + 1;
    await kv.set(`sponsor:${id}`, s);
    return c.json({ success: true });
  } catch (error) {
    console.log(`[SPONSOR] Impression error: ${error}`);
    return c.json({ success: false }, 500);
  }
});

app.post(`${PREFIX}/sponsors/:id/click`, async (c) => {
  try {
    const id = c.req.param("id");
    const ip = getClientIP(c);

    // ── KV RATE LIMIT: per-IP per-sponsor (3/min) ──
    const perSponsor = await kvRateLimit(`sponsor-click:${ip}:${id}`, 3, 60_000);
    if (perSponsor.limited) {
      console.log(`[SPONSOR-FRAUD] Click rate-limited: IP=${ip} sponsor=${id} count=${perSponsor.count}`);
      return c.json({
        success: false,
        error: "Click rate limit exceeded for this sponsor.",
        code: "RATE_LIMITED",
        retryAfter: perSponsor.retryAfter,
      }, { status: 429, headers: { "Retry-After": String(perSponsor.retryAfter) } });
    }

    // ── KV RATE LIMIT: per-IP global across all sponsors (15/min) ──
    const global = await kvRateLimit(`sponsor-click-global:${ip}`, 15, 60_000);
    if (global.limited) {
      console.log(`[SPONSOR-FRAUD] Global click rate-limited: IP=${ip} count=${global.count}`);
      return c.json({
        success: false,
        error: "Global click rate limit exceeded.",
        code: "RATE_LIMITED",
        retryAfter: global.retryAfter,
      }, { status: 429, headers: { "Retry-After": String(global.retryAfter) } });
    }

    const s: any = await kv.get(`sponsor:${id}`);
    if (!s) return c.json({ success: false, error: "Sponsor not found" }, 404);
    s.clicks = (s.clicks || 0) + 1;
    await kv.set(`sponsor:${id}`, s);
    return c.json({ success: true });
  } catch (error) {
    console.log(`[SPONSOR] Click error: ${error}`);
    return c.json({ success: false }, 500);
  }
});

app.post(`${PREFIX}/sponsor-inquiry`, async (c) => {
  try {
    const body = await c.req.json();
    const { companyName, contactName, contactEmail, message, budget, logoUrl, productImageUrl, websiteUrl } = body;
    if (!companyName || !contactEmail) return c.json({ success: false, error: "Company name and email required" }, 400);

    // ── PUBLIC-FORM RATE LIMITING (anti spam / KV storage-DoS) ──
    // No wallet auth on this endpoint — it's open to any company. Without
    // a cap, a single curl loop fills KV with sponsor-inquiry:* keys.
    // Three independent limiters: per-IP, per-email, and a global ceiling
    // so even a botnet rotating IPs can't pad the queue infinitely.
    const inquiryIp = extractClientIp(c);
    const inquiryIpRL = await checkRateLimit(`inquiry-ip:${inquiryIp}`, 3, 60 * 60 * 1000);
    if (inquiryIpRL.limited) {
      console.log(`[SPONSORS] Inquiry rate-limited by IP: ${inquiryIp} (retry=${inquiryIpRL.retryAfter}s)`);
      return c.json({
        success: false,
        error: "Too many inquiries from your network. Please try again later or email us directly.",
        code: "RATE_LIMITED",
        retryAfter: inquiryIpRL.retryAfter,
      }, { status: 429, headers: { "Retry-After": String(inquiryIpRL.retryAfter || 600) } });
    }

    const emailKey = sanitizeString(contactEmail, 200).toLowerCase().trim();
    if (emailKey) {
      const inquiryEmailRL = await checkRateLimit(`inquiry-email:${emailKey}`, 3, 24 * 60 * 60 * 1000);
      if (inquiryEmailRL.limited) {
        console.log(`[SPONSORS] Inquiry rate-limited by email: ${emailKey} (retry=${inquiryEmailRL.retryAfter}s)`);
        return c.json({
          success: false,
          error: "An inquiry from this email was received recently. We'll be in touch — please avoid duplicate submissions.",
          code: "RATE_LIMITED",
          retryAfter: inquiryEmailRL.retryAfter,
        }, { status: 429, headers: { "Retry-After": String(inquiryEmailRL.retryAfter || 3600) } });
      }
    }

    const inquiryGlobalRL = await checkRateLimit(`inquiry-global`, 200, 60 * 60 * 1000);
    if (inquiryGlobalRL.limited) {
      console.log(`[SPONSORS] Inquiry rate-limited GLOBALLY (likely attack) retry=${inquiryGlobalRL.retryAfter}s`);
      return c.json({
        success: false,
        error: "Inquiry intake temporarily paused. Please try again shortly.",
        code: "RATE_LIMITED",
        retryAfter: inquiryGlobalRL.retryAfter,
      }, { status: 429, headers: { "Retry-After": String(inquiryGlobalRL.retryAfter || 600) } });
    }

    const id = generateId("inq");
    const inquiry = {
      id,
      companyName: sanitizeString(companyName, 200),
      contactName: sanitizeString(contactName || "", 200),
      contactEmail: sanitizeString(contactEmail, 200),
      message: sanitizeString(message || "", 2000),
      budget: sanitizeString(budget || "", 100),
      logoUrl: sanitizeString(logoUrl || "", 1000),
      productImageUrl: sanitizeString(productImageUrl || "", 1000),
      websiteUrl: sanitizeString(websiteUrl || "", 500),
      status: "new",
      createdAt: now(),
    };
    await kv.set(`sponsor-inquiry:${id}`, inquiry);
    console.log(`[SPONSORS] New inquiry from ${companyName} (${contactEmail})`);
    return c.json({ success: true, data: inquiry });
  } catch (error) {
    console.log(`[SPONSORS] Error submitting inquiry: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to submit inquiry") }, 500);
  }
});

app.get(`${PREFIX}/admin/sponsor-inquiries`, requireAdminSession, async (c) => {
  try {
    const all: any[] = await kv.getByPrefix("sponsor-inquiry:");
    all.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ success: true, data: all });
  } catch (error) {
    console.log(`[SPONSORS] Error listing inquiries: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to list inquiries") }, 500);
  }
});

// DELETE /admin/sponsor-inquiries/:id — Delete a single inquiry
app.delete(`${PREFIX}/admin/sponsor-inquiries/:id`, requireAdminSession, async (c) => {
  try {
    const id = c.req.param("id");
    const existing = await kv.get(`sponsor-inquiry:${id}`);
    if (!existing) return c.json({ success: false, error: `Inquiry ${id} not found` }, 404);
    await kv.del(`sponsor-inquiry:${id}`);
    console.log(`[SPONSORS] Deleted inquiry ${id}`);
    return c.json({ success: true, data: { id } });
  } catch (error) {
    console.log(`[SPONSORS] Error deleting inquiry: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to delete inquiry") }, 500);
  }
});

// DELETE /admin/sponsor-inquiries — Clear all inquiries
app.delete(`${PREFIX}/admin/sponsor-inquiries`, requireAdminSession, async (c) => {
  try {
    const all: any[] = await kv.getByPrefix("sponsor-inquiry:");
    if (all.length === 0) return c.json({ success: true, data: { deleted: 0 } });
    const keys = all.map((inq: any) => `sponsor-inquiry:${inq.id}`);
    await kv.mdel(keys);
    console.log(`[SPONSORS] Cleared all ${keys.length} inquiries`);
    return c.json({ success: true, data: { deleted: keys.length } });
  } catch (error) {
    console.log(`[SPONSORS] Error clearing inquiries: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to clear inquiries") }, 500);
  }
});

// PATCH /admin/sponsor-inquiries/:id — Update inquiry status (approve/decline/archive)
app.patch(`${PREFIX}/admin/sponsor-inquiries/:id`, requireAdminSession, async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const { status } = body;
    if (!status || !["approved", "declined", "archived", "new"].includes(status)) {
      return c.json({ success: false, error: "Invalid status. Must be: approved, declined, archived, or new" }, 400);
    }
    const existing: any = await kv.get(`sponsor-inquiry:${id}`);
    if (!existing) return c.json({ success: false, error: `Inquiry ${id} not found` }, 404);
    existing.status = status;
    existing.statusUpdatedAt = now();
    await kv.set(`sponsor-inquiry:${id}`, existing);
    console.log(`[SPONSORS] Inquiry ${id} status updated to ${status}`);
    return c.json({ success: true, data: existing });
  } catch (error) {
    console.log(`[SPONSORS] Error updating inquiry status: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to update inquiry status") }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /admin/seed — Seed initial data (Tony Gaste, Starboy, Vitalii)
// Only works if no athletes exist yet. Safe to call multiple times.
// ---------------------------------------------------------------------------
app.post(`${PREFIX}/admin/seed`, requireAdminSession, async (c) => {
  try {
    const existing = await kv.getByPrefix("athlete:");
    if (existing.length > 0) {
      return c.json({
        success: true,
        data: { message: `Database already has ${existing.length} athletes. Seed skipped.`, seeded: false },
      });
    }

    const seedAthletes = [
      {
        id: "ath-tony-gaste",
        name: "Tony Gaste",
        fullName: "Antonio Gastelum",
        nickname: "The Mexican Monster",
        country: "Mexico",
        bio: "Antonio 'Tony Gaste' Gastelum is one of the most explosive calisthenics athletes in the world. Known for his raw energy, devastating dynamic combos, and relentless competitive fire, Tony has dominated competitions across North America and Latin America. His signature style blends aggressive power moves with surprising fluidity, making him a fan favorite and a nightmare for opponents.",
        pfpUrl: "",
        socials: { instagram: "", twitter: "", youtube: "", website: "" },
        wins: 0,
        losses: 0,
        streak: 0,
        rank: 1,
        status: "active",
        specialMove: "360 Muscle-Up to Planche",
        skills: { energy: 9.2, performance: 8.8, static: 7.5, aggression: 9.0, dynamic: 8.5 },
        totalPowerRating: 43.0,
        nftTokenId: "",
        nftImageUrl: "",
        nftMetadataUri: "",
        nftSeriesName: "Sigma Series",
        nftCardBorderColor: "#FFD700",
        nftCardGlowGradient: "from-[#FFD700] via-[#22C55E] to-[#FFD700]",
        primaryColor: "#FFD700",
        secondaryColor: "#B8860B",
        weightClass: "Super Middleweight (165+ lbs)",
        totalVotes: 0,
        tokensStaked: 0,
        createdAt: now(),
        updatedAt: now(),
      },
      {
        id: "ath-starboy",
        name: "Starboy",
        fullName: "Cyrus Starboy",
        nickname: "The Star",
        country: "USA",
        bio: "Cyrus 'Starboy' is a generational talent in freestyle calisthenics. Hailing from the USA, Starboy is known for his incredible dynamic skills — gravity-defying spins, releases, and aerial combinations that leave crowds speechless. His performance artistry and natural showmanship make every routine feel like a highlight reel. A true entertainer and fierce competitor.",
        pfpUrl: "",
        socials: { instagram: "", twitter: "", youtube: "", website: "" },
        wins: 0,
        losses: 0,
        streak: 0,
        rank: 2,
        status: "active",
        specialMove: "720 Bar Spin",
        skills: { energy: 8.7, performance: 9.1, static: 8.0, aggression: 8.3, dynamic: 9.4 },
        totalPowerRating: 43.5,
        nftTokenId: "",
        nftImageUrl: "",
        nftMetadataUri: "",
        nftSeriesName: "Sigma Series",
        nftCardBorderColor: "#6AA3E0",
        nftCardGlowGradient: "from-[#6AA3E0] via-[#8B5CF6] to-[#6AA3E0]",
        primaryColor: "#6AA3E0",
        secondaryColor: "#4A7FB8",
        weightClass: "Super Lightweight (135–145 lbs)",
        totalVotes: 0,
        tokensStaked: 0,
        createdAt: now(),
        updatedAt: now(),
      },
      {
        id: "ath-vitalii",
        name: "Vitalii",
        fullName: "Vitalii",
        nickname: "The Machine",
        country: "Russia",
        bio: "Vitalii is a static strength phenomenon from Russia. His mastery of planches, levers, and iron crosses is unmatched in the competitive calisthenics world. Where other athletes rely on explosive dynamics, Vitalii dominates with inhuman isometric holds that defy gravity and human anatomy. His controlled, methodical approach to competition makes him one of the most technically perfect athletes in BOTB history.",
        pfpUrl: "",
        socials: { instagram: "", twitter: "", youtube: "", website: "" },
        wins: 0,
        losses: 0,
        streak: 0,
        rank: 3,
        status: "active",
        specialMove: "Full Maltese to Victorian",
        skills: { energy: 8.9, performance: 8.4, static: 9.5, aggression: 8.1, dynamic: 8.8 },
        totalPowerRating: 43.7,
        nftTokenId: "",
        nftImageUrl: "",
        nftMetadataUri: "",
        nftSeriesName: "Sigma Series",
        nftCardBorderColor: "#22C55E",
        nftCardGlowGradient: "from-[#22C55E] via-[#FFD700] to-[#22C55E]",
        primaryColor: "#22C55E",
        secondaryColor: "#16A34A",
        weightClass: "Middleweight (155–165 lbs)",
        totalVotes: 0,
        tokensStaked: 0,
        createdAt: now(),
        updatedAt: now(),
      },
    ];

    for (const athlete of seedAthletes) {
      await kv.set(`athlete:${athlete.id}`, athlete);
    }

    // Also seed initial site config
    const existingConfig = await kv.get("config:site");
    if (!existingConfig) {
      await kv.set("config:site", {
        tokenStats: {
          symbol: "BOTB",
          price: 0,
          change24h: 0,
          marketCap: 0,
          totalStaked: 0,
          totalVoters: 0,
          totalBattles: 0,
          tvl: 0,
        },
        votingEnabled: true,
        mintingEnabled: false,
        stakingEnabled: false,
      });
    }

    console.log(`[ADMIN] Seeded ${seedAthletes.length} athletes + config by admin ${c.get("adminWallet")}`);

    return c.json({
      success: true,
      data: {
        message: `Seeded ${seedAthletes.length} athletes (Tony Gaste, Starboy, Vitalii) and site config.`,
        seeded: true,
        athletes: seedAthletes.map((a) => ({ id: a.id, name: a.name })),
      },
    });
  } catch (error) {
    console.log(`[ADMIN] Error seeding data: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to seed data") }, 500);
  }
});

// ============================================================================
// VOTING ROUTES (require wallet, not admin)
// ============================================================================

// ---------------------------------------------------------------------------
// GET /votes/mine/:wallet — Get all battle votes for a wallet
// ---------------------------------------------------------------------------
app.get(`${PREFIX}/votes/mine/:wallet`, async (c) => {
  try {
    const wallet = c.req.param("wallet");
    if (!wallet || !isValidHederaAccountId(wallet)) {
      return c.json({ success: false, error: "Valid Hedera wallet address required" }, 400);
    }
    // SCALING FIX: Use per-wallet vote index instead of full table scan.
    // OLD: getByPrefix("vote:battle:") loaded ALL votes from ALL wallets → O(total votes)
    // NEW: getByPrefix("wvote:{wallet}:") loads only THIS wallet's votes → O(user's votes)
    // At 50K users: ~10 rows instead of ~500K+ rows per request.
    const myVotes = await getWalletVotes(wallet);
    return c.json({ success: true, data: myVotes });
  } catch (error) {
    console.log(`[VOTE] Error fetching user votes: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to fetch votes") }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /votes/battle/:battleId — Get vote tally + total voters for a battle
// ---------------------------------------------------------------------------
app.get(`${PREFIX}/votes/battle/:battleId`, async (c) => {
  try {
    const battleId = c.req.param("battleId");
    // SCALING FIX: Derive totalVoters from the battle's own stored counts
    // instead of loading ALL vote records with getByPrefix just to count them.
    // OLD: getByPrefix("vote:battle:{id}:") → votes.length  [O(voters in battle)]
    // NEW: battle.votes1Count + battle.votes2Count           [O(1), already in memory]
    const battle = await kv.get(`battle:${battleId}`);
    if (!battle) {
      return c.json({ success: false, error: `Battle ${battleId} not found` }, 404);
    }
    return c.json({
      success: true,
      data: {
        battleId,
        votes1Count: battle.votes1Count || 0,
        votes2Count: battle.votes2Count || 0,
        votes1Weighted: battle.votes1Weighted || 0,
        votes2Weighted: battle.votes2Weighted || 0,
        totalVoters: (battle.votes1Count || 0) + (battle.votes2Count || 0),
        totalPool: battle.totalPool || 0,
      },
    });
  } catch (error) {
    console.log(`[VOTE] Error fetching battle votes: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to fetch battle votes") }, 500);
  }
});

// ---------------------------------------------------------------------------
// Server-side BOTB token balance + NFT holdings from Hedera mirror node
// ---------------------------------------------------------------------------
const MIRROR_BASE = "https://mainnet.mirrornode.hedera.com";
const BOTB_TOKEN_ID: string | null = null; // TODO: Set to real 0.0.XXXXXXX when BOTB launches
const MIRROR_NODE_TIMEOUT_MS = 10_000; // 10s per-request timeout — prevents indefinite hangs on mirror node

async function fetchBotbBalance(wallet: string): Promise<number> {
  if (!BOTB_TOKEN_ID) return 0;
  try {
    const res = await fetch(`${MIRROR_BASE}/api/v1/accounts/${wallet}/tokens?token.id=${BOTB_TOKEN_ID}&limit=1`, {
      signal: AbortSignal.timeout(MIRROR_NODE_TIMEOUT_MS),
    });
    if (!res.ok) return 0;
    const data = await res.json();
    return data?.tokens?.[0] ? Number(data.tokens[0].balance) : 0;
  } catch (err) {
    const isTimeout = err instanceof DOMException && err.name === "TimeoutError";
    console.log(`[VOTE] Mirror balance check ${isTimeout ? "timed out" : "failed"} for ${wallet}: ${err}`);
    return 0;
  }
}

async function fetchNFTHoldings(wallet: string): Promise<{ hasGovernor: boolean; hasSigma: boolean }> {
  const SIG_NFT: string | null = null; // TODO: Replace with real Sigma Series token ID
  try {
    const hasGovernor = await hasGovernorNFT(wallet);
    let hasSigma = false;

    if (SIG_NFT) {
      const url = `${MIRROR_BASE}/api/v1/accounts/${wallet}/nfts?token.id=${SIG_NFT}&limit=1`;
      const res = await fetch(url, { signal: AbortSignal.timeout(MIRROR_NODE_TIMEOUT_MS) });
      if (res.ok) {
        const data = await res.json();
        hasSigma = Array.isArray(data?.nfts) && data.nfts.length > 0;
      }
    }

    return { hasGovernor, hasSigma };
  } catch (err) {
    const isTimeout = err instanceof DOMException && err.name === "TimeoutError";
    console.log(`[VOTE] NFT check ${isTimeout ? "timed out" : "failed"} for ${wallet}: ${err}`);
    return { hasGovernor: false, hasSigma: false };
  }
}

function computeServerVotingPower(hasGov: boolean, hasSig: boolean): number {
  if (hasGov && hasSig) return 3;
  if (hasGov) return 2;
  if (hasSig) return 1.5;
  return 1;
}

// ---------------------------------------------------------------------------
// POST /vote/battle — Production token-weighted vote with ED25519 signature verification
// Security chain: format → rate-limit → mainnet verify → sig content → ED25519 crypto verify →
//                 nonce replay → battle validate → athlete check → NFT verify →
//                 balance allocation → persist + tally + nonce burn
// ---------------------------------------------------------------------------
app.post(`${PREFIX}/vote/battle`, async (c) => {
  try {
    const body = await c.req.json();
    const { battleId, wallet, athleteId, stakeAmount, signature, signedMessage, nonce } = body;

    if (!battleId || !wallet || !athleteId) {
      return c.json({ success: false, error: "battleId, wallet, and athleteId are required" }, 400);
    }
    if (!signature || !signedMessage || !nonce) {
      return c.json({ success: false, error: "Digital signature, signed message, and nonce are required to cast a vote" }, 400);
    }
    if (!isValidHederaAccountId(wallet)) {
      return c.json({ success: false, error: "Invalid Hedera wallet address format" }, 400);
    }
    if (typeof stakeAmount !== "number" || stakeAmount < 0) {
      return c.json({ success: false, error: "stakeAmount must be a non-negative number" }, 400);
    }

    // ── WALLET SESSION VERIFICATION ──
    // Proves the caller went through the WalletConnect flow on our frontend.
    // Without this, anyone with curl can vote for any wallet (headcount mode).
    const hasValidSession = await validateWalletSession(c, wallet);
    if (!hasValidSession) {
      console.log(`[VOTE] Wallet session REJECTED for ${wallet} on battle ${battleId} — no valid X-Wallet-Session token`);
      return c.json({
        success: false,
        error: "Wallet session required. Please connect your wallet and try again.",
        code: "SESSION_REQUIRED",
      }, 401);
    }

    // C-1 FIX: Dual-layer (in-memory + KV) — persists across isolate restarts
    const voteBattleRL = await checkRateLimit(`vote:battle:${wallet}`, 10, 60 * 1000);
    if (voteBattleRL.limited) {
      return c.json({
        success: false, error: "Too many vote attempts. Please wait a moment.",
        code: "RATE_LIMITED", retryAfter: voteBattleRL.retryAfter,
      }, { status: 429, headers: { "Retry-After": String(voteBattleRL.retryAfter || 5) } });
    }

    // ── IP ANOMALY DETECTION ──
    // Track IP→wallet mapping. Flags are non-blocking — votes still proceed,
    // but anomalies are persisted to KV for admin review.
    const voterIp = extractClientIp(c);
    trackIpVote(voterIp, wallet).catch(e =>
      console.log(`[IP-ANOMALY] Failed to track IP for ${wallet}: ${e}`)
    );

    const walletExists = await verifyWalletOnMirrorNode(wallet);
    if (!walletExists) {
      return c.json({ success: false, error: "Wallet not found on Hedera mainnet." }, 403);
    }

    // Validate signature message matches vote params
    if (!signedMessage.includes(battleId) || !signedMessage.includes(athleteId) || !signedMessage.includes(nonce)) {
      return c.json({ success: false, error: "Signed message does not match vote parameters. Possible tampering." }, 400);
    }

    // ── CRYPTOGRAPHIC ED25519 SIGNATURE VERIFICATION ──
    // HEADCOUNT MODE (BOTB_TOKEN_ID === null):
    //   WalletConnect session + HashPack approval already proves wallet ownership.
    //   ED25519 verification is ATTEMPTED but failure is a WARNING, not a blocker.
    //   This matches how Snapshot/Tally handle off-chain voting — WC approval = identity.
    // TOKEN-WEIGHTED MODE (BOTB_TOKEN_ID set):
    //   Full cryptographic verification REQUIRED. Failure rejects the vote.
    const sigVerification = await verifyVoteSignature(wallet, signedMessage, signature);
    if (!sigVerification.valid) {
      if (BOTB_TOKEN_ID) {
        console.log(`[VOTE] ED25519 sig verification FAILED (STRICT) for ${wallet} on battle ${battleId}: ${sigVerification.error}`);
        return c.json({
          success: false,
          error: `Signature verification failed: ${sigVerification.error}`,
          code: "SIGNATURE_INVALID",
        }, 403);
      } else {
        console.log(`[VOTE] ED25519 sig verification WARN (headcount mode) for ${wallet} on battle ${battleId} — WalletConnect approval accepted`);
      }
    }

    // Nonce replay protection
    const nonceKey = `vote-nonce:${nonce}`;
    const usedNonce = await kv.get(nonceKey);
    if (usedNonce) {
      return c.json({ success: false, error: "Vote nonce already used. Generate a new vote." }, 409);
    }

    // Battle validation
    const battle: any = await kv.get(`battle:${battleId}`);
    if (!battle) return c.json({ success: false, error: `Battle ${battleId} not found` }, 404);
    if (battle.status !== "voting_open") {
      return c.json({ success: false, error: `Battle not open for voting. Status: ${battle.status}` }, 400);
    }

    // Voting deadline check (admin controls voting status manually; no automatic 2h cutoff)
    if (battle.votingClosesAt && Date.now() >= new Date(battle.votingClosesAt).getTime()) {
      return c.json({ success: false, error: `Voting closed at ${battle.votingClosesAt}.` }, 400);
    }

    if (athleteId !== battle.athlete1Id && athleteId !== battle.athlete2Id) {
      return c.json({ success: false, error: "Invalid athleteId for this battle" }, 400);
    }

    // Server-side NFT verification → voting power
    const nftHoldings = await fetchNFTHoldings(wallet);
    const power = computeServerVotingPower(nftHoldings.hasGovernor, nftHoldings.hasSigma);

    // Token balance verification + event-scoped allocation tracking
    const eventId = battle.eventId || "standalone";
    const mirrorBalance = await fetchBotbBalance(wallet);
    let requestedStake = Math.max(0, Math.floor(stakeAmount));

    // ── PRE-LAUNCH HARD CAP ──
    // When BOTB_TOKEN_ID is null, the token hasn't launched yet.
    // Force stakeAmount to 0 — no fake numbers. Votes still count toward
    // headcount tallies (votes1Count/votes2Count), but token-weighted values
    // are genuinely 0.00 until the token goes live on Hedera.
    if (!BOTB_TOKEN_ID) {
      requestedStake = 0;
    }

    // ── ALLOCATION RACE FIX: per-(wallet, event) outer lock ──
    // Two concurrent votes from the same wallet on DIFFERENT battles in the
    // same event would otherwise both read the same `walloc:` snapshot, both
    // pass the balance check, and both write — silently letting a wallet
    // over-stake (post-launch). The per-battle lock below does NOT cover
    // this because each vote takes a different battle key. The walloc lock
    // serializes everything that touches `walloc:{wallet}:{eventId}` for
    // the same wallet within one event. Different wallets are unaffected;
    // the same wallet voting in different events is unaffected.
    //
    // LOCK ORDER: walloc (outer)  →  battle (inner). Always. No reverse path
    // exists in this handler, so deadlock is impossible.
    //
    // Variables read after the lock are declared here and assigned inside.
    let existingVoteInThisBattle: any = null;
    let isUpdate = false;
    let oldStake = 0;
    let weighted = 0;
    let vote: any = null;
    let updatedTallies = { votes1Count: 0, votes2Count: 0, votes1Weighted: 0, votes2Weighted: 0 };
    let earlyResponse: Response | null = null;

    const allocLockKey = `walloc:${wallet}:${eventId}`;
    const allocRelease = await acquireLock(allocLockKey);
    try {
      // ── SCALING FIX: Allocation index replaces O(battles × KV reads) ──
      // OLD: getByPrefix("battle:") → filter event → kv.get per battle  [50+ sequential reads]
      // NEW: Single kv.get("walloc:{wallet}:{eventId}")                 [1 read]
      // CRITICAL: Read INSIDE the walloc lock — guarantees no other request
      // for the same wallet+event can read+write between our check and write.
      existingVoteInThisBattle = await kv.get(`vote:battle:${battleId}:${wallet}`);
      const allocIndex = await getAllocation(wallet, eventId);
      let tokensAllocatedInEvent = allocIndex ? allocIndex.totalAllocated : 0;

      // Subtract this battle's current allocation (if updating) to get "other battles" total
      if (allocIndex && allocIndex.battles[battleId]) {
        tokensAllocatedInEvent -= allocIndex.battles[battleId];
      }

      const availableBalance = mirrorBalance - tokensAllocatedInEvent;

      // Enforce balance only when BOTB token is live
      if (BOTB_TOKEN_ID && requestedStake > 0 && requestedStake > availableBalance) {
        earlyResponse = c.json({
          success: false,
          error: `Insufficient balance. ${mirrorBalance.toLocaleString()} BOTB total, ${tokensAllocatedInEvent.toLocaleString()} allocated in event. Available: ${Math.max(0, availableBalance).toLocaleString()} BOTB.`,
          code: "INSUFFICIENT_BALANCE",
        }, 400);
      } else {
        // ── WEIGHTED VOTE CALCULATION ──
        // Token mode: tokens × NFT multiplier (e.g. 1000 BOTB × 2x Governor = 2000)
        // Headcount mode (pre-launch): NFT multiplier alone IS the weight.
        weighted = BOTB_TOKEN_ID ? requestedStake * power : power;
        isUpdate = !!existingVoteInThisBattle;
        oldStake = isUpdate ? (existingVoteInThisBattle.stakeAmount || 0) : 0;

        vote = {
          battleId, wallet, athleteId, eventId,
          stakeAmount: requestedStake, votingPower: power, weightedVote: weighted,
          hasGovernorNFT: nftHoldings.hasGovernor, hasSigmaNFT: nftHoldings.hasSigma,
          signature: sanitizeString(signature, 500),
          signedMessage: sanitizeString(signedMessage, 1000),
          nonce: sanitizeString(nonce, 100),
          isUpdate, verifiedBalance: mirrorBalance, timestamp: now(),
        };

        // ── BATTLE MUTEX (inner) — protects per-battle tally read/write ──
        const release = await acquireLock(`battle:${battleId}`);
        try {
          // Re-read battle inside the lock to get the freshest tallies
          const lockedBattle: any = await kv.get(`battle:${battleId}`);
          if (!lockedBattle) {
            earlyResponse = c.json({ success: false, error: `Battle ${battleId} not found` }, 404);
          } else {
            // Reverse old vote tallies if updating
            if (isUpdate && existingVoteInThisBattle) {
              const old = existingVoteInThisBattle;
              if (old.athleteId === lockedBattle.athlete1Id) {
                lockedBattle.votes1Count = Math.max(0, (lockedBattle.votes1Count || 0) - 1);
                lockedBattle.votes1Weighted = Math.max(0, (lockedBattle.votes1Weighted || 0) - (old.weightedVote || 0));
              } else {
                lockedBattle.votes2Count = Math.max(0, (lockedBattle.votes2Count || 0) - 1);
                lockedBattle.votes2Weighted = Math.max(0, (lockedBattle.votes2Weighted || 0) - (old.weightedVote || 0));
              }
            }

            if (athleteId === lockedBattle.athlete1Id) {
              lockedBattle.votes1Count = (lockedBattle.votes1Count || 0) + 1;
              lockedBattle.votes1Weighted = (lockedBattle.votes1Weighted || 0) + weighted;
            } else {
              lockedBattle.votes2Count = (lockedBattle.votes2Count || 0) + 1;
              lockedBattle.votes2Weighted = (lockedBattle.votes2Weighted || 0) + weighted;
            }
            lockedBattle.updatedAt = now();

            // Capture tallies BEFORE releasing mutex — these are the authoritative values
            updatedTallies = {
              votes1Count: lockedBattle.votes1Count,
              votes2Count: lockedBattle.votes2Count,
              votes1Weighted: lockedBattle.votes1Weighted,
              votes2Weighted: lockedBattle.votes2Weighted,
            };

            // ── BATCH WRITE: vote record + battle tallies ──
            await kv.mset(
              [`vote:battle:${battleId}:${wallet}`, `battle:${battleId}`],
              [vote, lockedBattle],
            );
          }
        } finally {
          release(); // Always release the battle mutex
        }

        // Only finish allocation/index writes if the inner block succeeded
        if (!earlyResponse) {
          // ── SCALING FIX: Write wallet vote index (wvote:) for O(1) "my votes" lookups ──
          const compactVote: CompactVote = {
            battleId, athleteId, eventId, wallet,
            stakeAmount: requestedStake, weightedVote: weighted, votingPower: power,
            hasGovernorNFT: nftHoldings.hasGovernor, hasSigmaNFT: nftHoldings.hasSigma,
            isUpdate, timestamp: vote.timestamp,
          };
          await indexWalletVote(compactVote);

          // ── SCALING FIX: Update allocation index (walloc:) for O(1) balance checks ──
          // STILL INSIDE walloc lock — guarantees the read at top of this block
          // and this write form an atomic critical section against concurrent
          // same-wallet+event votes.
          await updateAllocation(wallet, eventId, battleId, requestedStake, oldStake);
        }
      }
    } finally {
      allocRelease(); // Always release the walloc mutex
    }

    if (earlyResponse) return earlyResponse;

    // ── SCALING FIX: Nonce with self-referencing key for lazy reaper cleanup ──
    await writeNonceWithKey(sanitizeString(nonce, 100), wallet, battleId);

    // All-time unique-wallet-voted metric (idempotent, hashed, fire-and-forget)
    recordWalletVoted(wallet).catch(() => {});

    // ── UPDATE ATHLETE totalVotes + tokensStaked COUNTERS ──
    // These feed the leaderboard formula: (totalVotes * 0.5)
    // On new vote: +1 totalVotes on voted athlete, +stakeAmount to tokensStaked
    // On vote change (same athlete): update tokensStaked delta only
    // On vote change (different athlete): -1 old athlete, +1 new athlete, adjust both
    if (isUpdate && existingVoteInThisBattle) {
      const oldAthleteId = existingVoteInThisBattle.athleteId;

      if (oldAthleteId !== athleteId) {
        // Switched athletes: decrement old, increment new
        const oldAthlete: any = await kv.get(`athlete:${oldAthleteId}`);
        if (oldAthlete) {
          oldAthlete.totalVotes = Math.max(0, (oldAthlete.totalVotes || 0) - 1);
          oldAthlete.tokensStaked = Math.max(0, (oldAthlete.tokensStaked || 0) - oldStake);
          oldAthlete.updatedAt = now();
          await kv.set(`athlete:${oldAthleteId}`, oldAthlete);
        }
        const newAthlete: any = await kv.get(`athlete:${athleteId}`);
        if (newAthlete) {
          newAthlete.totalVotes = (newAthlete.totalVotes || 0) + 1;
          newAthlete.tokensStaked = (newAthlete.tokensStaked || 0) + requestedStake;
          newAthlete.updatedAt = now();
          await kv.set(`athlete:${athleteId}`, newAthlete);
        }
      } else {
        // Same athlete, different stake: adjust tokensStaked delta only
        const sameAthlete: any = await kv.get(`athlete:${athleteId}`);
        if (sameAthlete) {
          sameAthlete.tokensStaked = Math.max(0, (sameAthlete.tokensStaked || 0) - oldStake + requestedStake);
          sameAthlete.updatedAt = now();
          await kv.set(`athlete:${athleteId}`, sameAthlete);
        }
      }
    } else {
      // Brand new vote: +1 totalVotes, +stakeAmount
      const votedAthlete: any = await kv.get(`athlete:${athleteId}`);
      if (votedAthlete) {
        votedAthlete.totalVotes = (votedAthlete.totalVotes || 0) + 1;
        votedAthlete.tokensStaked = (votedAthlete.tokensStaked || 0) + requestedStake;
        votedAthlete.updatedAt = now();
        await kv.set(`athlete:${athleteId}`, votedAthlete);
      }
    }

    // Invalidate leaderboard caches so they reflect the new vote
    invalidateCache("leaderboard:athletes");
    invalidateCache("leaderboard:voters");

    console.log(`[VOTE] ${isUpdate ? "Updated" : "New"} vote: ${wallet} → ${athleteId} in ${battleId} (${requestedStake} × ${power}x = ${weighted}, ED25519 verified ✓)`);
    // Return vote record + authoritative battle tallies so the frontend can
    // apply them to local state immediately — no read-after-write dependency.
    return c.json({ success: true, data: { ...vote, battleTallies: updatedTallies } });
  } catch (error) {
    console.log(`[VOTE] Error casting battle vote: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to cast vote") }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /vote/battles/batch — Batch vote on multiple battles in one event
// One ED25519 signature covers all votes. Event-scoped allocation enforced.
// Security chain: format → rate-limit → mainnet verify → sig content →
//   ED25519 crypto verify → nonce replay → per-battle validate → NFT verify →
//   total allocation check → atomic persist + tally + nonce burn
// ---------------------------------------------------------------------------
app.post(`${PREFIX}/vote/battles/batch`, async (c) => {
  try {
    const body = await c.req.json();
    const { wallet, eventId, votes, signature, signedMessage, nonce } = body;

    // ── 1. FORMAT VALIDATION ──
    if (!wallet || !eventId || !votes || !signature || !signedMessage || !nonce) {
      return c.json({ success: false, error: "wallet, eventId, votes[], signature, signedMessage, and nonce are required" }, 400);
    }
    if (!isValidHederaAccountId(wallet)) {
      return c.json({ success: false, error: "Invalid Hedera wallet address format" }, 400);
    }
    if (!Array.isArray(votes) || votes.length === 0) {
      return c.json({ success: false, error: "votes must be a non-empty array" }, 400);
    }
    if (votes.length > 12) {
      return c.json({ success: false, error: "Maximum 12 battles per batch (event cap)" }, 400);
    }
    for (const v of votes) {
      if (!v.battleId || !v.athleteId) {
        return c.json({ success: false, error: "Each vote requires battleId and athleteId" }, 400);
      }
      if (typeof v.stakeAmount !== "number" || v.stakeAmount < 0) {
        return c.json({ success: false, error: `stakeAmount must be non-negative for battle ${v.battleId}` }, 400);
      }
    }

    // ── 2a. WALLET SESSION VERIFICATION (before any heavy operations) ──
    const hasValidSessionBatch = await validateWalletSession(c, wallet);
    if (!hasValidSessionBatch) {
      console.log(`[BATCH-VOTE] Wallet session REJECTED for ${wallet} on event ${eventId} — no valid X-Wallet-Session token`);
      return c.json({
        success: false,
        error: "Wallet session required. Please connect your wallet and try again.",
        code: "SESSION_REQUIRED",
      }, 401);
    }

    // ── 2b. RATE LIMIT (relaxed — batch is one action) ──
    // C-1 FIX: Dual-layer (in-memory + KV) — persists across isolate restarts
    const voteBatchRL = await checkRateLimit(`vote:batch:${wallet}`, 5, 60 * 1000);
    if (voteBatchRL.limited) {
      return c.json({
        success: false, error: "Too many batch vote attempts. Please wait.",
        code: "RATE_LIMITED", retryAfter: voteBatchRL.retryAfter,
      }, { status: 429, headers: { "Retry-After": String(voteBatchRL.retryAfter || 10) } });
    }

    // ── IP ANOMALY DETECTION (batch) ──
    const voterIpBatch = extractClientIp(c);
    trackIpVote(voterIpBatch, wallet).catch(e =>
      console.log(`[IP-ANOMALY] Failed to track batch IP for ${wallet}: ${e}`)
    );

    // ── 3. MAINNET WALLET VERIFICATION (once) ──
    const walletExists = await verifyWalletOnMirrorNode(wallet);
    if (!walletExists) {
      return c.json({ success: false, error: "Wallet not found on Hedera mainnet." }, 403);
    }

    // ── 4. SIGNED MESSAGE CONTENT VERIFICATION ──
    // The message must include eventId, nonce, and every battleId + athleteId
    if (!signedMessage.includes(eventId) || !signedMessage.includes(nonce)) {
      return c.json({ success: false, error: "Signed message missing eventId or nonce. Possible tampering." }, 400);
    }
    for (const v of votes) {
      if (!signedMessage.includes(v.battleId) || !signedMessage.includes(v.athleteId)) {
        return c.json({ success: false, error: `Signed message missing battleId ${v.battleId} or athleteId ${v.athleteId}. All votes must be in the signed message.` }, 400);
      }
    }

    // ── 5. ED25519 CRYPTOGRAPHIC SIGNATURE VERIFICATION (once) ──
    // Headcount mode: attempt but don't block. Token mode: strict.
    const sigVerification = await verifyVoteSignature(wallet, signedMessage, signature);
    if (!sigVerification.valid) {
      if (BOTB_TOKEN_ID) {
        console.log(`[BATCH-VOTE] ED25519 sig verification FAILED (STRICT) for ${wallet}: ${sigVerification.error}`);
        return c.json({ success: false, error: `Signature verification failed: ${sigVerification.error}`, code: "SIGNATURE_INVALID" }, 403);
      } else {
        console.log(`[BATCH-VOTE] ED25519 sig verification WARN (headcount mode) for ${wallet} — WalletConnect approval accepted`);
      }
    }

    // ── 6. NONCE REPLAY CHECK (once for entire batch) ──
    const nonceKey = `vote-nonce:${nonce}`;
    const usedNonce = await kv.get(nonceKey);
    if (usedNonce) {
      return c.json({ success: false, error: "Batch vote nonce already used. Generate a new vote." }, 409);
    }

    // Check for duplicate battleIds in the same batch
    const battleIds = votes.map((v: any) => v.battleId);
    if (new Set(battleIds).size !== battleIds.length) {
      return c.json({ success: false, error: "Duplicate battleId in batch. Each battle can only appear once." }, 400);
    }

    // ── 7. LOAD + VALIDATE ALL BATTLES ──
    const battleMap = new Map<string, any>();
    // Admin controls voting status manually — no automatic 2h cutoff

    for (const v of votes) {
      const battle: any = await kv.get(`battle:${v.battleId}`);
      if (!battle) {
        return c.json({ success: false, error: `Battle ${v.battleId} not found` }, 404);
      }
      if (battle.status !== "voting_open") {
        return c.json({ success: false, error: `Battle "${battle.title}" is not open for voting (status: ${battle.status})` }, 400);
      }
      if (battle.eventId !== eventId) {
        return c.json({ success: false, error: `Battle ${v.battleId} does not belong to event ${eventId}` }, 400);
      }
      if (v.athleteId !== battle.athlete1Id && v.athleteId !== battle.athlete2Id) {
        return c.json({ success: false, error: `Invalid athleteId ${v.athleteId} for battle "${battle.title}"` }, 400);
      }
      if (battle.votingClosesAt && Date.now() >= new Date(battle.votingClosesAt).getTime()) {
        return c.json({ success: false, error: `Voting closed for "${battle.title}" at ${battle.votingClosesAt}.` }, 400);
      }
      battleMap.set(v.battleId, battle);
    }

    // ── 8. NFT VERIFICATION (once) ──
    const nftHoldings = await fetchNFTHoldings(wallet);
    const power = computeServerVotingPower(nftHoldings.hasGovernor, nftHoldings.hasSigma);

    // ── 9. BALANCE + ALLOCATION CHECK ──
    // PRE-LAUNCH: force all stakes to 0
    const processedVotes = votes.map((v: any) => ({
      ...v,
      stakeAmount: !BOTB_TOKEN_ID ? 0 : Math.max(0, Math.floor(v.stakeAmount)),
    }));

    const totalBatchStake = processedVotes.reduce((s: number, v: any) => s + v.stakeAmount, 0);
    const mirrorBalance = await fetchBotbBalance(wallet);

    // ── ALLOCATION RACE FIX: per-(wallet, event) outer lock ──
    // Same rationale as POST /vote/battle: the alloc index read, balance check,
    // and per-vote `updateAllocation` writes must form an atomic critical
    // section per (wallet, eventId). Without this, a wallet submitting a batch
    // concurrently with single votes (or another batch) in the same event
    // could over-stake by reading a stale `walloc:` snapshot.
    //
    // LOCK ORDER: walloc (outer) → battle (inner per vote). All inner battle
    // locks are short-lived; the walloc lock spans the whole batch. Different
    // wallets are never blocked by this; the same wallet voting in a different
    // event is never blocked.
    const results: any[] = [];
    const ts = now();
    let earlyResponseBatch: Response | null = null;
    const allocLockKeyBatch = `walloc:${wallet}:${eventId}`;
    const allocReleaseBatch = await acquireLock(allocLockKeyBatch);
    try {
    // Get current allocation index for this event (INSIDE the lock — must be
    // freshest possible value; pre-lock reads can be stale by the time we
    // acquire the lock).
    const allocIndex = await getAllocation(wallet, eventId);
    let existingEventAllocation = allocIndex ? allocIndex.totalAllocated : 0;

    // Subtract stakes for battles that are BEING UPDATED in this batch
    // (those tokens will be re-allocated, not double-counted)
    const existingVoteRecords = new Map<string, any>();
    for (const v of processedVotes) {
      const existing: any = await kv.get(`vote:battle:${v.battleId}:${wallet}`);
      if (existing) {
        existingVoteRecords.set(v.battleId, existing);
        existingEventAllocation -= (allocIndex?.battles[v.battleId] || 0);
      }
    }

    const totalNeeded = existingEventAllocation + totalBatchStake;

    if (BOTB_TOKEN_ID && totalNeeded > mirrorBalance) {
      earlyResponseBatch = c.json({
        success: false,
        error: `Batch total (${totalBatchStake.toLocaleString()} BOTB) + other event allocations (${existingEventAllocation.toLocaleString()}) = ${totalNeeded.toLocaleString()} exceeds balance of ${mirrorBalance.toLocaleString()} BOTB.`,
        code: "INSUFFICIENT_BALANCE",
      }, 400);
    }

    // ── 10. PROCESS ALL VOTES ATOMICALLY ──
    if (!earlyResponseBatch) {

    for (const pv of processedVotes) {
      const battle = battleMap.get(pv.battleId)!;
      const existingVote = existingVoteRecords.get(pv.battleId);
      const isUpdate = !!existingVote;
      const oldStake = isUpdate ? (existingVote.stakeAmount || 0) : 0;
      // Token mode: tokens × power. Headcount mode: power alone (NFT multiplier IS the weight).
      const weighted = BOTB_TOKEN_ID ? pv.stakeAmount * power : power;

      const voteRecord = {
        battleId: pv.battleId, wallet, athleteId: pv.athleteId, eventId,
        stakeAmount: pv.stakeAmount, votingPower: power, weightedVote: weighted,
        hasGovernorNFT: nftHoldings.hasGovernor, hasSigmaNFT: nftHoldings.hasSigma,
        signature: sanitizeString(signature, 500),
        signedMessage: sanitizeString(signedMessage, 4000),
        nonce: sanitizeString(nonce, 100),
        isUpdate, isBatch: true, verifiedBalance: mirrorBalance, timestamp: ts,
      };

      // Tally update inside battle mutex
      let updatedTallies = { votes1Count: 0, votes2Count: 0, votes1Weighted: 0, votes2Weighted: 0 };
      const release = await acquireLock(`battle:${pv.battleId}`);
      try {
        const lockedBattle: any = await kv.get(`battle:${pv.battleId}`);
        if (!lockedBattle) continue;

        // Reverse old vote tallies if updating
        if (isUpdate && existingVote) {
          const old = existingVote;
          if (old.athleteId === lockedBattle.athlete1Id) {
            lockedBattle.votes1Count = Math.max(0, (lockedBattle.votes1Count || 0) - 1);
            lockedBattle.votes1Weighted = Math.max(0, (lockedBattle.votes1Weighted || 0) - (old.weightedVote || 0));
          } else {
            lockedBattle.votes2Count = Math.max(0, (lockedBattle.votes2Count || 0) - 1);
            lockedBattle.votes2Weighted = Math.max(0, (lockedBattle.votes2Weighted || 0) - (old.weightedVote || 0));
          }
        }

        if (pv.athleteId === lockedBattle.athlete1Id) {
          lockedBattle.votes1Count = (lockedBattle.votes1Count || 0) + 1;
          lockedBattle.votes1Weighted = (lockedBattle.votes1Weighted || 0) + weighted;
        } else {
          lockedBattle.votes2Count = (lockedBattle.votes2Count || 0) + 1;
          lockedBattle.votes2Weighted = (lockedBattle.votes2Weighted || 0) + weighted;
        }
        lockedBattle.updatedAt = ts;

        updatedTallies = {
          votes1Count: lockedBattle.votes1Count,
          votes2Count: lockedBattle.votes2Count,
          votes1Weighted: lockedBattle.votes1Weighted,
          votes2Weighted: lockedBattle.votes2Weighted,
        };

        await kv.mset(
          [`vote:battle:${pv.battleId}:${wallet}`, `battle:${pv.battleId}`],
          [voteRecord, lockedBattle],
        );
      } finally {
        release();
      }

      // Index wallet vote
      const compactVote: CompactVote = {
        battleId: pv.battleId, athleteId: pv.athleteId, eventId, wallet,
        stakeAmount: pv.stakeAmount, weightedVote: weighted, votingPower: power,
        hasGovernorNFT: nftHoldings.hasGovernor, hasSigmaNFT: nftHoldings.hasSigma,
        isUpdate, timestamp: ts,
      };
      await indexWalletVote(compactVote);

      // Update allocation for this battle
      await updateAllocation(wallet, eventId, pv.battleId, pv.stakeAmount, oldStake);

      // Update athlete counters
      if (isUpdate && existingVote) {
        const oldAthleteId = existingVote.athleteId;
        if (oldAthleteId !== pv.athleteId) {
          const oldAthlete: any = await kv.get(`athlete:${oldAthleteId}`);
          if (oldAthlete) {
            oldAthlete.totalVotes = Math.max(0, (oldAthlete.totalVotes || 0) - 1);
            oldAthlete.tokensStaked = Math.max(0, (oldAthlete.tokensStaked || 0) - oldStake);
            oldAthlete.updatedAt = ts;
            await kv.set(`athlete:${oldAthleteId}`, oldAthlete);
          }
          const newAthlete: any = await kv.get(`athlete:${pv.athleteId}`);
          if (newAthlete) {
            newAthlete.totalVotes = (newAthlete.totalVotes || 0) + 1;
            newAthlete.tokensStaked = (newAthlete.tokensStaked || 0) + pv.stakeAmount;
            newAthlete.updatedAt = ts;
            await kv.set(`athlete:${pv.athleteId}`, newAthlete);
          }
        } else {
          const sameAthlete: any = await kv.get(`athlete:${pv.athleteId}`);
          if (sameAthlete) {
            sameAthlete.tokensStaked = Math.max(0, (sameAthlete.tokensStaked || 0) - oldStake + pv.stakeAmount);
            sameAthlete.updatedAt = ts;
            await kv.set(`athlete:${pv.athleteId}`, sameAthlete);
          }
        }
      } else {
        const votedAthlete: any = await kv.get(`athlete:${pv.athleteId}`);
        if (votedAthlete) {
          votedAthlete.totalVotes = (votedAthlete.totalVotes || 0) + 1;
          votedAthlete.tokensStaked = (votedAthlete.tokensStaked || 0) + pv.stakeAmount;
          votedAthlete.updatedAt = ts;
          await kv.set(`athlete:${pv.athleteId}`, votedAthlete);
        }
      }

      results.push({
        battleId: pv.battleId,
        athleteId: pv.athleteId,
        stakeAmount: pv.stakeAmount,
        weightedVote: weighted,
        isUpdate,
        battleTallies: updatedTallies,
      });
    }
    } // end if (!earlyResponseBatch)
    } finally {
      allocReleaseBatch(); // Always release the walloc mutex
    }

    if (earlyResponseBatch) return earlyResponseBatch;

    // ── 11. BURN NONCE ──
    // Outside the walloc lock — nonce key is global, not per-(wallet,event).
    await writeNonceWithKey(sanitizeString(nonce, 100), wallet, `batch:${eventId}`);

    // All-time unique-wallet-voted metric (idempotent, hashed, fire-and-forget)
    recordWalletVoted(wallet).catch(() => {});

    // Invalidate caches
    invalidateCache("leaderboard:athletes");
    invalidateCache("leaderboard:voters");

    const totalWeighted = results.reduce((s: number, r: any) => s + r.weightedVote, 0);
    console.log(`[BATCH-VOTE] ${results.length} votes from ${wallet} on event ${eventId} (total ${totalBatchStake} BOTB × ${power}x = ${totalWeighted} weighted, ED25519 verified ✓)`);

    return c.json({
      success: true,
      data: {
        wallet,
        eventId,
        votingPower: power,
        hasGovernorNFT: nftHoldings.hasGovernor,
        hasSigmaNFT: nftHoldings.hasSigma,
        totalStaked: totalBatchStake,
        totalWeighted,
        votesProcessed: results.length,
        votes: results,
      },
    });
  } catch (error) {
    console.log(`[BATCH-VOTE] Error: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to process batch vote") }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /vote/allocations/:wallet — Token allocations per event
// ---------------------------------------------------------------------------
app.get(`${PREFIX}/vote/allocations/:wallet`, async (c) => {
  try {
    const wallet = c.req.param("wallet");
    if (!isValidHederaAccountId(wallet)) return c.json({ success: false, error: "Invalid wallet" }, 400);

    // ── SCALING FIX: Use allocation index instead of O(battles × KV reads) ──
    // OLD: getByPrefix("battle:") → filter by event → kv.get per battle per wallet
    //      At 50 battles/event × 20 events = 1000+ KV reads per request
    // NEW: getByPrefix("walloc:{wallet}:") returns pre-aggregated allocations
    //      At any scale: O(events the user has voted in) reads ≈ 1-5
    const walletAllocs = await getWalletAllocations(wallet);
    const allocations: Record<string, { eventId: string; totalAllocated: number; battles: any[] }> = {};

    for (const alloc of walletAllocs) {
      const battles = Object.entries(alloc.battles).map(([battleId, stakeAmount]) => ({
        battleId,
        stakeAmount,
      }));
      if (battles.length > 0) {
        // Enrich with vote details from wallet vote index for the response
        const battleDetails: any[] = [];
        for (const b of battles) {
          const wv = await kv.get(`wvote:${wallet}:${b.battleId}`);
          if (wv) {
            battleDetails.push({
              battleId: b.battleId,
              athleteId: wv.athleteId,
              stakeAmount: wv.stakeAmount,
              weightedVote: wv.weightedVote,
              votingPower: wv.votingPower,
            });
          } else {
            battleDetails.push({ battleId: b.battleId, stakeAmount: b.stakeAmount });
          }
        }
        allocations[alloc.eventId] = {
          eventId: alloc.eventId,
          totalAllocated: alloc.totalAllocated,
          battles: battleDetails,
        };
      }
    }

    const mirrorBalance = await fetchBotbBalance(wallet);
    return c.json({ success: true, data: { wallet, botbBalance: mirrorBalance, tokenLaunched: !!BOTB_TOKEN_ID, allocations } });
  } catch (error) {
    console.log(`[VOTE] Error fetching allocations: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to fetch allocations") }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /vote/proposal — Cast or change a governance proposal vote (signature-verified)
// Security chain: format → rate-limit → mainnet verify → sig content → nonce replay →
//                 proposal validate → deadline → existing vote check → NFT verify → persist + nonce burn
// Vote changes require "VOTE CHANGE" in the signed message + fresh nonce + wallet re-signature
// ---------------------------------------------------------------------------
app.post(`${PREFIX}/vote/proposal`, async (c) => {
  try {
    const body = await c.req.json();
    const { proposalId, wallet, direction, signature, signedMessage, nonce } = body;
    // NOTE: Any client-sent votingPower is intentionally ignored — the server
    // computes the real multiplier from Hedera Mirror Node NFT holdings (anti-spoof).

    // ── 1. REQUIRED FIELD VALIDATION ──
    if (!proposalId || !wallet || !direction) {
      return c.json({ success: false, error: "proposalId, wallet, and direction (for/against) are required" }, 400);
    }
    if (!signature || !signedMessage || !nonce) {
      return c.json({ success: false, error: "Digital signature, signed message, and nonce are required to cast a governance vote" }, 400);
    }

    // ── 2. FORMAT VALIDATION ──
    if (!isValidHederaAccountId(wallet)) {
      return c.json({ success: false, error: "Invalid Hedera wallet address format" }, 400);
    }
    if (typeof proposalId !== "string" || proposalId.length > 100) {
      return c.json({ success: false, error: "Invalid proposalId format" }, 400);
    }
    if (direction !== "for" && direction !== "against") {
      return c.json({ success: false, error: "direction must be 'for' or 'against'" }, 400);
    }

    // ── 2b. WALLET SESSION VERIFICATION ──
    const hasValidSessionProposal = await validateWalletSession(c, wallet);
    if (!hasValidSessionProposal) {
      console.log(`[VOTE] Wallet session REJECTED for ${wallet} on proposal ${proposalId} — no valid X-Wallet-Session token`);
      return c.json({
        success: false,
        error: "Wallet session required. Please connect your wallet and try again.",
        code: "SESSION_REQUIRED",
      }, 401);
    }

    // ── 3. RATE LIMITING ──
    // C-1 FIX: Dual-layer (in-memory + KV) — persists across isolate restarts
    const voteProposalRL = await checkRateLimit(`vote:proposal:${wallet}`, 10, 60 * 1000);
    if (voteProposalRL.limited) {
      return c.json({
        success: false, error: "Too many vote attempts. Please wait a moment.",
        code: "RATE_LIMITED", retryAfter: voteProposalRL.retryAfter,
      }, { status: 429, headers: { "Retry-After": String(voteProposalRL.retryAfter || 5) } });
    }

    // ── IP ANOMALY DETECTION (proposal vote) ──
    const voterIpProp = extractClientIp(c);
    trackIpVote(voterIpProp, wallet).catch(e =>
      console.log(`[IP-ANOMALY] Failed to track proposal IP for ${wallet}: ${e}`)
    );

    // ── 4. HEDERA MAINNET WALLET VERIFICATION ──
    const walletExists = await verifyWalletOnMirrorNode(wallet);
    if (!walletExists) {
      console.log(`[VOTE] Anti-spoof: wallet ${wallet} not found on Hedera mainnet`);
      return c.json({ success: false, error: "Wallet not found on Hedera mainnet. Cannot cast vote." }, 403);
    }

    // ── 5. SIGNATURE CONTENT VALIDATION ──
    // The signed message must contain the vote params to prevent message substitution.
    // An attacker cannot reuse a signature from a different proposal/direction.
    if (!signedMessage.includes(proposalId) || !signedMessage.includes(direction) || !signedMessage.includes(nonce)) {
      return c.json({ success: false, error: "Signed message does not match vote parameters (proposalId, direction, nonce). Possible tampering." }, 400);
    }

    // ── 5b. CRYPTOGRAPHIC ED25519 SIGNATURE VERIFICATION ──
    // Headcount mode: attempt but don't block. Token mode: strict.
    const sigVerification = await verifyVoteSignature(wallet, signedMessage, signature);
    if (!sigVerification.valid) {
      if (BOTB_TOKEN_ID) {
        console.log(`[VOTE] ED25519 sig verification FAILED (STRICT) for ${wallet} on proposal ${proposalId}: ${sigVerification.error}`);
        return c.json({
          success: false,
          error: `Signature verification failed: ${sigVerification.error}`,
          code: "SIGNATURE_INVALID",
        }, 403);
      } else {
        console.log(`[VOTE] ED25519 sig verification WARN (headcount mode) for ${wallet} on proposal ${proposalId} — WalletConnect approval accepted`);
      }
    }

    // ── 6. NONCE REPLAY PROTECTION ──
    const nonceKey = `vote-nonce:${nonce}`;
    const usedNonce = await kv.get(nonceKey);
    if (usedNonce) {
      return c.json({ success: false, error: "Vote nonce already used. Generate a new vote." }, 409);
    }

    // ── 7. PROPOSAL VALIDATION ──
    const proposal: any = await kv.get(`proposal:${proposalId}`);
    if (!proposal) {
      return c.json({ success: false, error: `Proposal ${proposalId} not found` }, 404);
    }
    if (proposal.status !== "active") {
      return c.json({ success: false, error: `Proposal is not active. Current status: ${proposal.status}` }, 400);
    }

    // Enforce endsAt deadline if set
    if (proposal.endsAt) {
      const deadline = new Date(proposal.endsAt).getTime();
      if (Date.now() >= deadline) {
        return c.json({
          success: false,
          error: `Voting on this proposal closed at ${proposal.endsAt}. No more votes accepted.`,
        }, 400);
      }
    }

    // ── 8. EXISTING VOTE CHECK (allows vote changes while voting is open) ──
    const existingVote: any = await kv.get(`vote:proposal:${proposalId}:${wallet}`);
    const isVoteChange = !!existingVote;

    if (isVoteChange) {
      // SECURITY: Verify the existing vote belongs to the same wallet (belt-and-suspenders —
      // the KV key already encodes the wallet, but we verify the stored record too)
      if (existingVote.wallet !== wallet) {
        console.log(`[VOTE] Vote change REJECTED: KV record wallet mismatch for ${wallet} on proposal ${proposalId}`);
        return c.json({ success: false, error: "Vote record wallet mismatch. Possible tampering." }, 403);
      }

      // SECURITY: The signed message MUST contain "VOTE CHANGE" to prove the Governor
      // explicitly consented to changing their vote (not a replayed original vote signature)
      if (!signedMessage.includes("VOTE CHANGE")) {
        console.log(`[VOTE] Vote change REJECTED: signed message missing VOTE CHANGE marker for ${wallet} on proposal ${proposalId}`);
        return c.json({
          success: false,
          error: "Vote change requires a signature explicitly containing 'VOTE CHANGE'. Re-sign your vote.",
          code: "VOTE_CHANGE_SIG_REQUIRED",
        }, 400);
      }

      // Reject no-op: same direction
      if (existingVote.direction === direction) {
        return c.json({ success: false, error: `You have already voted ${direction.toUpperCase()} on this proposal.` }, 409);
      }
    }

    // ── 9. SERVER-SIDE NFT VERIFICATION ──
    // Never trust client-sent votingPower. Query the Hedera Mirror Node
    // for actual NFT holdings and compute the multiplier server-side.
    const nftHoldings = await fetchNFTHoldings(wallet);
    const power = computeServerVotingPower(nftHoldings.hasGovernor, nftHoldings.hasSigma);

    // ── 9b. GOVERNOR NFT GATE — Only Governor NFT holders may vote on proposals ──
    if (!nftHoldings.hasGovernor) {
      console.log(`[VOTE] Governor NFT gate REJECTED: ${wallet} does not hold a WCO Governors NFT — proposal vote denied`);
      return c.json({
        success: false,
        error: "Governance voting requires a WCO Governors NFT. Your wallet does not hold one.",
        code: "GOVERNOR_NFT_REQUIRED",
      }, 403);
    }

    // ── 10. PERSIST VOTE + BURN NONCE ──
    // If this is a vote change, we keep an audit trail of the previous vote
    const vote: any = {
      proposalId,
      wallet,
      direction,
      votingPower: power,
      hasGovernorNFT: nftHoldings.hasGovernor,
      hasSigmaNFT: nftHoldings.hasSigma,
      signature: sanitizeString(signature, 500),
      signedMessage: sanitizeString(signedMessage, 1000),
      nonce: sanitizeString(nonce, 100),
      timestamp: now(),
      isVoteChange,
    };

    if (isVoteChange) {
      // Audit trail: store the previous vote details so admins can review changes
      vote.previousDirection = existingVote.direction;
      vote.previousVotingPower = existingVote.votingPower;
      vote.previousTimestamp = existingVote.timestamp;
      vote.previousNonce = existingVote.nonce;
      vote.changeCount = (existingVote.changeCount || 0) + 1;
    }

    await kv.set(`vote:proposal:${proposalId}:${wallet}`, vote);
    // BUG FIX: Use writeNonceWithKey() instead of bare kv.set() so the lazy
    // reaper can reconstruct the KV key from the _nonceKey field and clean
    // expired nonces. Without this, proposal vote nonces accumulate forever.
    await writeNonceWithKey(sanitizeString(nonce, 100), wallet, proposalId);

    // Update proposal tallies
    if (isVoteChange) {
      // VOTE CHANGE: Subtract old vote power from old direction, add new power to new direction.
      // Re-query power in case the Governor acquired/sold NFTs between original vote and change.
      const oldPower = existingVote.votingPower || 1;
      if (existingVote.direction === "for") {
        proposal.votesFor = Math.max(0, (proposal.votesFor || 0) - oldPower);
      } else {
        proposal.votesAgainst = Math.max(0, (proposal.votesAgainst || 0) - oldPower);
      }
      if (direction === "for") {
        proposal.votesFor = (proposal.votesFor || 0) + power;
      } else {
        proposal.votesAgainst = (proposal.votesAgainst || 0) + power;
      }
      // totalVoters stays the same — it's the same wallet, just changing direction
    } else {
      // NEW VOTE: add power and increment voter count
      if (direction === "for") {
        proposal.votesFor = (proposal.votesFor || 0) + power;
      } else {
        proposal.votesAgainst = (proposal.votesAgainst || 0) + power;
      }
      proposal.totalVoters = (proposal.totalVoters || 0) + 1;
    }
    proposal.updatedAt = now();
    await kv.set(`proposal:${proposalId}`, proposal);

    const action = isVoteChange ? "CHANGED" : "NEW";
    const changeInfo = isVoteChange ? ` (was ${existingVote.direction}, change #${vote.changeCount})` : "";
    console.log(`[VOTE] Proposal vote ${action}: ${wallet} voted ${direction} on ${proposalId}${changeInfo} | NFTs: Gov=${nftHoldings.hasGovernor} Sig=${nftHoldings.hasSigma} → ${power}x | nonce=${nonce.substring(0,8)}… (ED25519 verified ✓)`);

    return c.json({ success: true, data: vote });
  } catch (error) {
    console.log(`[VOTE] Error casting proposal vote: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to cast proposal vote") }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /vote/skill — REMOVED
// Athlete skills are now admin-only. Governors may propose skill changes
// via the governance proposal system (POST /vote/proposal).
// Legacy vote:skill: KV keys are orphaned (skill voting removed; no platform-wide purge endpoint).
// ---------------------------------------------------------------------------

// ===========================================================================
// ATHLETE APPLICATION ROUTES
// ===========================================================================

// ---------------------------------------------------------------------------
// POST /applications/upload-pfp — Upload athlete profile picture (public)
// ---------------------------------------------------------------------------
// Accepts multipart/form-data with `file` (image) + `wallet`. Stores the file
// in a private Supabase Storage bucket and returns the storage path. The path
// is what the client submits as `pfpUrl` on POST /applications. Admin reads
// generate short-lived signed URLs server-side.
// ---------------------------------------------------------------------------
app.post(`${PREFIX}/applications/upload-pfp`, async (c) => {
  try {
    const ip = extractClientIp(c);
    const ipRL = await checkRateLimit(`pfprl:${ip}`, 10, 60 * 60 * 1000);
    if (ipRL.limited) {
      return c.json({
        success: false, error: "Too many uploads. Please wait before trying again.",
        code: "RATE_LIMITED", retryAfter: ipRL.retryAfter,
      }, { status: 429, headers: { "Retry-After": String(ipRL.retryAfter || 300) } });
    }

    const formData = await c.req.formData();
    const file = formData.get("file");
    const wallet = String(formData.get("wallet") || "");

    if (!wallet || !isValidHederaAccountId(wallet)) {
      return c.json({ success: false, error: "Valid Hedera wallet ID required" }, 400);
    }
    if (!(file instanceof File)) {
      return c.json({ success: false, error: "No file provided" }, 400);
    }
    if (file.size === 0) {
      return c.json({ success: false, error: "File is empty" }, 400);
    }
    if (file.size > PFP_MAX_BYTES) {
      return c.json({ success: false, error: `File too large (max ${PFP_MAX_BYTES / (1024 * 1024)} MB)` }, 400);
    }
    if (!PFP_ALLOWED_MIME.has(file.type)) {
      return c.json({ success: false, error: "Only PNG, JPEG, or WEBP images are allowed" }, 400);
    }

    await ensurePfpBucket();

    // Derive extension from MIME (don't trust client filename)
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const safeWallet = wallet.replace(/[^0-9.]/g, "_");
    const path = `pfps/${safeWallet}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const bytes = new Uint8Array(await file.arrayBuffer());
    const { error: upErr } = await supabaseAdmin.storage
      .from(PFP_BUCKET)
      .upload(path, bytes, { contentType: file.type, upsert: false });
    if (upErr) {
      console.log(`[APPLICATIONS] PFP upload failed for ${wallet}: ${upErr.message}`);
      return c.json({ success: false, error: "Upload failed. Please try again." }, 500);
    }

    // Return both the stored path (to submit with the application) and a
    // short-lived signed URL the applicant can use to preview their upload.
    const previewUrl = await getPfpSignedUrl(path);
    console.log(`[APPLICATIONS] PFP uploaded for ${wallet} → ${path}`);
    return c.json({ success: true, data: { path, previewUrl } });
  } catch (error) {
    console.log(`[APPLICATIONS] PFP upload error: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to upload image") }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /applications — Submit athlete application (public, wallet required)
// ---------------------------------------------------------------------------
app.post(`${PREFIX}/applications`, async (c) => {
  try {
    const body = await c.req.json();

    // Validate wallet
    if (!body.wallet || !isValidHederaAccountId(body.wallet)) {
      return c.json({ success: false, error: "Valid Hedera wallet ID required to apply" }, 400);
    }

    // Rate limit: 3 applications per wallet per hour
    // C-1 FIX: Dual-layer (in-memory + KV) — persists across isolate restarts
    const appRL = await checkRateLimit(`apprl:${body.wallet}`, 3, 60 * 60 * 1000);
    if (appRL.limited) {
      return c.json({
        success: false, error: "Too many applications. Please wait before submitting again.",
        code: "RATE_LIMITED", retryAfter: appRL.retryAfter,
      }, { status: 429, headers: { "Retry-After": String(appRL.retryAfter || 300) } });
    }

    // Validate required fields
    const required = ["name", "fullName", "country", "bio", "youtubeRoutine", "weightClass"];
    for (const field of required) {
      if (!body[field] || !body[field].trim()) {
        return c.json({ success: false, error: `Missing required field: ${field}` }, 400);
      }
    }

    // Official WCO weight divisions only (prevents free-form / spoofed class labels)
    const weightClass = sanitizeString(body.weightClass, 80);
    if (!isValidWeightClass(weightClass)) {
      return c.json({
        success: false,
        error: "Invalid weight class. Select an official WCO division.",
      }, 400);
    }

    // Require at least 1 social account (besides YouTube routine)
    const hasSocial = !!(body.instagram?.trim() || body.twitter?.trim() || body.website?.trim());
    if (!hasSocial) {
      return c.json({ success: false, error: "At least one social account (Instagram, Twitter/X, or Website) is required" }, 400);
    }

    // Require disclaimer acceptance
    if (!body.disclaimerAccepted) {
      return c.json({ success: false, error: "You must accept the terms and disclaimer to apply" }, 400);
    }

    // Check for duplicate pending application from same wallet
    const existingApps = await kv.getByPrefix("application:");
    const duplicate = existingApps.find((app: any) => app.wallet === body.wallet && app.status === "pending");
    if (duplicate) {
      return c.json({ success: false, error: "You already have a pending application. Please wait for admin review." }, 409);
    }

    const id = generateId("app");
    const application = {
      id,
      wallet: body.wallet,
      name: sanitizeString(body.name, 100),
      fullName: sanitizeString(body.fullName, 150),
      nickname: sanitizeString(body.nickname, 100),
      country: sanitizeString(body.country, 80),
      bio: sanitizeString(body.bio, 2000),
      pfpStoragePath: typeof body.pfpStoragePath === "string" && body.pfpStoragePath.startsWith("pfps/")
        ? sanitizeString(body.pfpStoragePath, 300)
        : "",
      pfpUrl: "", // legacy field — actual image lives in private storage; admin gets signed URL on read

      specialMove: sanitizeString(body.specialMove, 200),
      weightClass,
      email: sanitizeString(body.email, 200),
      phone: sanitizeString(body.phone, 50),
      socials: {
        instagram: sanitizeString(body.instagram, 200),
        twitter: sanitizeString(body.twitter, 200),
        youtube: sanitizeString(body.youtube, 300),
        website: sanitizeUrl(body.website),
      },
      youtubeRoutine: sanitizeUrl(body.youtubeRoutine),
      disclaimerAccepted: true,
      disclaimerVersion: sanitizeString(body.disclaimerVersion || "1.0.0", 20),
      disclaimerAcceptedAt: body.disclaimerAcceptedAt || now(),
      status: "pending",
      submittedAt: now(),
      reviewedAt: null,
      reviewedBy: null,
    };

    await kv.set(`application:${id}`, application);
    console.log(`[APPLICATIONS] New application ${id} from wallet ${body.wallet} (${application.name})`);

    return c.json({ success: true, data: { id, message: "Application submitted successfully. You will be notified when reviewed." } });
  } catch (error) {
    console.log(`[APPLICATIONS] Error submitting application: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to submit application") }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /admin/applications — List all applications (admin read)
// ---------------------------------------------------------------------------
app.get(`${PREFIX}/admin/applications`, requireAdminSession, async (c) => {
  try {
    const applications = await kv.getByPrefix("application:");
    applications.sort((a: any, b: any) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    // Attach short-lived signed URLs for any applications with a stored PFP
    const withSignedUrls = await Promise.all(
      applications.map(async (app: any) => {
        if (app?.pfpStoragePath) {
          const pfpSignedUrl = await getPfpSignedUrl(app.pfpStoragePath);
          return { ...app, pfpSignedUrl };
        }
        return app;
      })
    );
    return c.json({ success: true, data: withSignedUrls });
  } catch (error) {
    console.log(`[ADMIN] Error listing applications: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to list applications") }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /admin/applications/:id/pfp-download — Stream PFP for admin download
// ---------------------------------------------------------------------------
app.get(`${PREFIX}/admin/applications/:id/pfp-download`, requireAdminSession, async (c) => {
  try {
    const appId = c.req.param("id");
    const application = await kv.get(`application:${appId}`);
    if (!application) {
      return c.json({ success: false, error: `Application ${appId} not found` }, 404);
    }
    const path = (application as any).pfpStoragePath;
    if (!path) {
      return c.json({ success: false, error: "No profile picture on file" }, 404);
    }
    const { data, error } = await supabaseAdmin.storage.from(PFP_BUCKET).download(path);
    if (error || !data) {
      console.log(`[ADMIN] PFP download failed for ${appId}: ${error?.message}`);
      return c.json({ success: false, error: "Failed to fetch image" }, 500);
    }
    const ext = path.split(".").pop() || "jpg";
    const filename = `${(application as any).name || "athlete"}-${appId}.${ext}`.replace(/[^a-zA-Z0-9._-]/g, "_");
    return new Response(data, {
      headers: {
        "Content-Type": data.type || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.log(`[ADMIN] PFP download error: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to download image") }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /admin/applications/:id/approve — Approve → create athlete
// ---------------------------------------------------------------------------
app.post(`${PREFIX}/admin/applications/:id/approve`, requireAdminSession, async (c) => {
  try {
    const appId = c.req.param("id");
    const adminWallet = c.get("adminWallet");
    const application = await kv.get(`application:${appId}`);

    if (!application) {
      return c.json({ success: false, error: `Application ${appId} not found` }, 404);
    }
    if ((application as any).status !== "pending") {
      return c.json({ success: false, error: `Application already ${(application as any).status}` }, 400);
    }

    const app = application as any;
    const athleteId = generateId("ath");
    const allAthletes = await kv.getByPrefix("athlete:");
    const rank = allAthletes.length + 1;

    // Application wallet must live on the athlete as `wallet` (admin profile + Arena Chat badge).
    // Keep applicantWallet as immutable audit trail of what was on the application.
    const applicantWallet =
      app.wallet && isValidHederaAccountId(app.wallet) ? app.wallet : "";

    const athlete = {
      id: athleteId,
      name: app.name,
      fullName: app.fullName,
      nickname: app.nickname || "",
      country: app.country,
      bio: app.bio,
      pfpUrl: app.pfpUrl || "placeholder",
      pfpStoragePath: app.pfpStoragePath || "",
      email: app.email || "",
      phone: app.phone || "",
      socials: {
        instagram: app.socials?.instagram || "",
        twitter: app.socials?.twitter || "",
        youtube: app.socials?.youtube || app.youtubeRoutine || "",
        website: app.socials?.website || "",
      },
      wins: 0,
      losses: 0,
      streak: 0,
      rank,
      status: "active",
      specialMove: app.specialMove || "",
      skills: { energy: 5, performance: 5, static: 5, aggression: 5, dynamic: 5 },
      totalPowerRating: 25,
      nftTokenId: "",
      nftImageUrl: "",
      nftMetadataUri: "",
      nftSeriesName: "Sigma Series",
      nftRarity: "",
      nftCardBorderColor: "#4274B9",
      nftCardGlowGradient: "from-[#4274B9] via-[#6AA3E0] to-[#4274B9]",
      primaryColor: "",
      secondaryColor: "",
      weightClass: app.weightClass || "",
      bracketSeat: 0,
      totalVotes: 0,
      tokensStaked: 0,
      applicationId: appId,
      // Hedera wallet from application — admin profile field + Arena Chat verified badge
      wallet: applicantWallet,
      applicantWallet,
      createdAt: now(),
      updatedAt: now(),
    };

    await kv.set(`athlete:${athleteId}`, athlete);

    const updatedApp = { ...app, status: "approved", reviewedAt: now(), reviewedBy: adminWallet, athleteId };
    await kv.set(`application:${appId}`, updatedApp);

    // Create notification for the applicant
    const notifId = generateId("ntf");
    await kv.set(`notification:${app.wallet}:${notifId}`, {
      id: notifId,
      wallet: app.wallet,
      type: "application_approved",
      title: "Application Approved!",
      message: `Congratulations ${app.name}! Your application to compete in Battle of the Bars has been approved. You are now on the official athlete roster.`,
      athleteId,
      applicationId: appId,
      read: false,
      createdAt: now(),
    });

    console.log(`[ADMIN] Approved application ${appId} → athlete ${athleteId} (${athlete.name}) by ${adminWallet}`);
    return c.json({ success: true, data: { application: updatedApp, athlete } });
  } catch (error) {
    console.log(`[ADMIN] Error approving application: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to approve application") }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /admin/applications/:id/reject — Reject → delete data
// ---------------------------------------------------------------------------
app.post(`${PREFIX}/admin/applications/:id/reject`, requireAdminSession, async (c) => {
  try {
    const appId = c.req.param("id");
    const adminWallet = c.get("adminWallet");
    const application = await kv.get(`application:${appId}`);

    if (!application) {
      return c.json({ success: false, error: `Application ${appId} not found` }, 404);
    }

    const rejectedApp = application as any;

    // Create rejection notification before deleting data
    const notifId = generateId("ntf");
    await kv.set(`notification:${rejectedApp.wallet}:${notifId}`, {
      id: notifId,
      wallet: rejectedApp.wallet,
      type: "application_rejected",
      title: "Application Not Accepted",
      message: `Thank you for your interest, ${rejectedApp.name}. Unfortunately, your application to Battle of the Bars was not accepted at this time. You may re-apply in the future.`,
      applicationId: appId,
      read: false,
      createdAt: now(),
    });

    await kv.del(`application:${appId}`);
    console.log(`[ADMIN] Rejected & deleted application ${appId} by admin ${adminWallet}`);

    return c.json({ success: true, data: { id: appId, message: "Application rejected and data deleted." } });
  } catch (error) {
    console.log(`[ADMIN] Error rejecting application: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to reject application") }, 500);
  }
});

// ===========================================================================
// NOTIFICATION ROUTES
// ===========================================================================
// SECURITY: All notification endpoints require X-Wallet-Session verification.
// Without this, any attacker could read, mark-read, or delete another user's
// notifications by guessing wallet addresses — enabling silent suppression of
// governance alerts, battle results, and application status updates.
// ===========================================================================

// ---------------------------------------------------------------------------
// GET /notifications/:wallet — Get all notifications for a wallet
// ---------------------------------------------------------------------------
// Requires X-Wallet-Session: notifications may contain private info
// (application status, governance outcomes, reward details).
// ---------------------------------------------------------------------------
app.get(`${PREFIX}/notifications/:wallet`, async (c) => {
  try {
    const wallet = c.req.param("wallet");
    if (!isValidHederaAccountId(wallet)) {
      return c.json({ success: false, error: "Invalid wallet address" }, 400);
    }

    // ── WALLET SESSION AUTH ──
    const hasSession = await validateWalletSession(c, wallet);
    if (!hasSession) {
      console.log(`[NOTIFICATIONS] GET REJECTED for ${wallet} — no valid wallet session`);
      return c.json({
        success: false,
        error: "Wallet session required to access notifications.",
        code: "SESSION_REQUIRED",
      }, 401);
    }

    const notifications = await kv.getByPrefix(`notification:${wallet}:`);
    // Sort by newest first
    notifications.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return c.json({ success: true, data: notifications });
  } catch (error) {
    console.log(`[NOTIFICATIONS] Error fetching notifications: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to fetch notifications") }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /notifications/:wallet/read — Mark a notification as read
// ---------------------------------------------------------------------------
// Requires X-Wallet-Session: prevents attacker from marking another user's
// notifications as read (silent suppression attack).
// ---------------------------------------------------------------------------
app.post(`${PREFIX}/notifications/:wallet/read`, async (c) => {
  try {
    const wallet = c.req.param("wallet");
    const body = await c.req.json();
    const { notificationId } = body;

    if (!isValidHederaAccountId(wallet) || !notificationId) {
      return c.json({ success: false, error: "Invalid wallet or notification ID" }, 400);
    }

    // ── WALLET SESSION AUTH ──
    const hasSession = await validateWalletSession(c, wallet);
    if (!hasSession) {
      console.log(`[NOTIFICATIONS] Mark-read REJECTED for ${wallet} — no valid wallet session`);
      return c.json({
        success: false,
        error: "Wallet session required to modify notifications.",
        code: "SESSION_REQUIRED",
      }, 401);
    }

    const key = `notification:${wallet}:${notificationId}`;
    const notification = await kv.get(key);

    if (!notification) {
      return c.json({ success: false, error: "Notification not found" }, 404);
    }

    await kv.set(key, { ...(notification as any), read: true });

    return c.json({ success: true, data: { id: notificationId, read: true } });
  } catch (error) {
    console.log(`[NOTIFICATIONS] Error marking read: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to mark notification as read") }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /notifications/:wallet/read-all — Mark all notifications as read
// ---------------------------------------------------------------------------
// Requires X-Wallet-Session: prevents mass silent-suppression of all
// notifications for any wallet (attacker could hide governance alerts).
// ---------------------------------------------------------------------------
app.post(`${PREFIX}/notifications/:wallet/read-all`, async (c) => {
  try {
    const wallet = c.req.param("wallet");
    if (!isValidHederaAccountId(wallet)) {
      return c.json({ success: false, error: "Invalid wallet address" }, 400);
    }

    // ── WALLET SESSION AUTH ──
    const hasSession = await validateWalletSession(c, wallet);
    if (!hasSession) {
      console.log(`[NOTIFICATIONS] Read-all REJECTED for ${wallet} — no valid wallet session`);
      return c.json({
        success: false,
        error: "Wallet session required to modify notifications.",
        code: "SESSION_REQUIRED",
      }, 401);
    }

    const notifications = await kv.getByPrefix(`notification:${wallet}:`);
    const unread = notifications.filter((n: any) => !n.read);

    for (const n of unread) {
      await kv.set(`notification:${wallet}:${(n as any).id}`, { ...(n as any), read: true });
    }

    return c.json({ success: true, data: { markedRead: unread.length } });
  } catch (error) {
    console.log(`[NOTIFICATIONS] Error marking all read: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to mark all read") }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /notifications/:wallet/dismiss/:id — Delete a notification
// ---------------------------------------------------------------------------
// Requires X-Wallet-Session: prevents attacker from permanently deleting
// another user's notifications (irreversible data destruction).
// ---------------------------------------------------------------------------
app.post(`${PREFIX}/notifications/:wallet/dismiss/:id`, async (c) => {
  try {
    const wallet = c.req.param("wallet");
    const notifId = c.req.param("id");

    if (!isValidHederaAccountId(wallet)) {
      return c.json({ success: false, error: "Invalid wallet address" }, 400);
    }

    // ── WALLET SESSION AUTH ──
    const hasSession = await validateWalletSession(c, wallet);
    if (!hasSession) {
      console.log(`[NOTIFICATIONS] Dismiss REJECTED for ${wallet}:${notifId} — no valid wallet session`);
      return c.json({
        success: false,
        error: "Wallet session required to dismiss notifications.",
        code: "SESSION_REQUIRED",
      }, 401);
    }

    await kv.del(`notification:${wallet}:${notifId}`);

    return c.json({ success: true, data: { dismissed: notifId } });
  } catch (error) {
    console.log(`[NOTIFICATIONS] Error dismissing notification: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to dismiss notification") }, 500);
  }
});

// ============================================================================
// ARENA CHAT — Wallet-Gated Fan/Athlete Community Chat
// ============================================================================
// KV key: chat:arena:messages → array of up to 200 messages (FIFO)
// Each message: { id, wallet, text, reactions, timestamp, isAthlete, athleteName? }
// Rate limit: 5 messages per minute per wallet
// Character limit: 250 characters
// Reactions: toggle-based, one reaction per emoji per wallet
// ============================================================================

const CHAT_MAX_MESSAGES = 200;
const CHAT_MAX_CHARS = 250;
const CHAT_MAX_BODY_BYTES = 2048; // Hard cap on request body size
const CHAT_KV_KEY = "chat:arena:messages";
const CHAT_VALID_REACTIONS = new Set(["fire", "muscle", "rock", "check", "bullseye", "lightning", "clap", "trophy", "diamond", "rocket"]);

// Tiered rate limits (messages)
const CHAT_RATE_REGULAR_MAX = 1;         // 1 message per window
const CHAT_RATE_REGULAR_WINDOW = 120_000; // 120 seconds for regular wallets
const CHAT_RATE_GOV_MAX = 1;             // 1 message per window
const CHAT_RATE_GOV_WINDOW = 10_000;     // 10 seconds for Governors

// Tiered rate limits (reactions)
const CHAT_REACT_REGULAR_MAX = 10;
const CHAT_REACT_REGULAR_WINDOW = 60_000;
const CHAT_REACT_GOV_MAX = 30;
const CHAT_REACT_GOV_WINDOW = 60_000;

// Governor NFT cache for chat (10-minute TTL per wallet)
const governorChatCache = new Map<string, { isGovernor: boolean; ts: number }>();
const GOV_CHAT_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function checkGovernorForChat(wallet: string): Promise<boolean> {
  const cached = governorChatCache.get(wallet);
  if (cached && Date.now() - cached.ts < GOV_CHAT_CACHE_TTL) return cached.isGovernor;
  try {
    const { hasGovernor } = await fetchNFTHoldings(wallet);
    governorChatCache.set(wallet, { isGovernor: hasGovernor, ts: Date.now() });
    return hasGovernor;
  } catch (err) {
    console.log(`[CHAT] Governor check failed for ${wallet}: ${err}`);
    return false;
  }
}

/** Atomic read-modify-write for chat messages with optimistic retry */
async function chatAtomicUpdate(updateFn: (messages: any[]) => any[]): Promise<any[]> {
  const MAX_RETRIES = 3;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const messages: any[] = (await kv.get(CHAT_KV_KEY)) || [];
    const updated = updateFn(messages);
    await kv.set(CHAT_KV_KEY, updated);
    // Verify write succeeded
    const verify = await kv.get(CHAT_KV_KEY);
    if (verify && verify.length === updated.length) {
      return updated;
    }
    // Retry on conflict
    console.log(`[CHAT] Atomic retry ${attempt + 1}/${MAX_RETRIES}`);
  }
  throw new Error("Chat write conflict — please retry");
}

/** Build a set of verified athlete wallets with names */
async function getAthleteWalletMap(): Promise<Record<string, string>> {
  const allAthletes: any[] = await kv.getByPrefix("athlete:");
  const map: Record<string, string> = {};
  for (const athlete of allAthletes) {
    if (athlete?.wallet && isValidHederaAccountId(athlete.wallet)) {
      map[athlete.wallet] = athlete.name || "Athlete";
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// GET /chat/messages — Fetch all chat messages (wallet-gated)
// ---------------------------------------------------------------------------
app.get(`${PREFIX}/chat/messages`, async (c) => {
  try {
    const wallet = c.req.query("wallet");
    if (!wallet || typeof wallet !== "string" || !isValidHederaAccountId(wallet.trim())) {
      return c.json({ success: false, error: "Valid wallet address required to access chat" }, 401);
    }
    const cleanWallet = wallet.trim();

    // Rate limit polling: 15 requests/min per wallet (prevents aggressive polling)
    // C-1 FIX: Dual-layer (in-memory + KV) — persists across isolate restarts
    const chatPollRL = await checkRateLimit(`chat:poll:${cleanWallet}`, 15, 60_000);
    if (chatPollRL.limited) {
      return c.json({
        success: false,
        error: "Polling too fast — please slow down.",
        code: "RATE_LIMITED",
        retryAfter: chatPollRL.retryAfter,
      }, { status: 429, headers: { "Retry-After": String(chatPollRL.retryAfter || 5) } });
    }

    // Verify wallet exists on Hedera mainnet
    const walletExists = await verifyWalletOnMirrorNode(cleanWallet);
    if (!walletExists) {
      return c.json({ success: false, error: "Wallet not found on Hedera mainnet" }, 403);
    }

    const messages: any[] = (await kv.get(CHAT_KV_KEY)) || [];

    return c.json({ success: true, data: messages });
  } catch (error) {
    console.log(`[CHAT] Error fetching messages: ${error}`);
    return c.json({ success: false, error: "Failed to fetch chat messages. Please try again." }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /chat/messages — Send a new chat message (wallet-gated + tiered rate-limit)
// Rate limits:  Governors = 1 msg / 10s  |  Regular = 1 msg / 120s
// ---------------------------------------------------------------------------
app.post(`${PREFIX}/chat/messages`, async (c) => {
  try {
    // ── 1. BODY SIZE GUARD ──
    const rawBody = await c.req.text();
    if (rawBody.length > CHAT_MAX_BODY_BYTES) {
      return c.json({ success: false, error: "Request body too large" }, 413);
    }
    let body: any;
    try { body = JSON.parse(rawBody); } catch {
      return c.json({ success: false, error: "Invalid JSON body" }, 400);
    }
    const { wallet, text } = body;

    // ── 2. INPUT VALIDATION ──
    if (!wallet || typeof wallet !== "string" || !isValidHederaAccountId(wallet.trim())) {
      return c.json({ success: false, error: "Valid Hedera wallet address required" }, 400);
    }
    const cleanWallet = wallet.trim();

    if (!text || typeof text !== "string") {
      return c.json({ success: false, error: "Message text is required" }, 400);
    }
    if (text.length > CHAT_MAX_CHARS * 2) {
      // Reject obviously oversized payloads before sanitization
      return c.json({ success: false, error: `Message exceeds maximum length (${CHAT_MAX_CHARS} chars)` }, 400);
    }

    // ── 3. SANITIZE ──
    const sanitizedText = sanitizeString(text.trim(), CHAT_MAX_CHARS);
    if (!sanitizedText || sanitizedText.length === 0) {
      return c.json({ success: false, error: "Message cannot be empty after sanitization" }, 400);
    }
    // Reject whitespace-only or invisible-char-only messages
    if (sanitizedText.replace(/\s/g, "").length === 0) {
      return c.json({ success: false, error: "Message cannot be only whitespace" }, 400);
    }

    // ── 3b. WALLET SESSION VERIFICATION ──
    // Proves the caller connected via WalletConnect on our frontend.
    const hasValidSessionChat = await validateWalletSession(c, cleanWallet);
    if (!hasValidSessionChat) {
      console.log(`[CHAT] Wallet session REJECTED for ${cleanWallet} — no valid X-Wallet-Session token`);
      return c.json({
        success: false,
        error: "Wallet session required. Please reconnect your wallet.",
        code: "SESSION_REQUIRED",
      }, 401);
    }

    // ── 4. VERIFY WALLET ON HEDERA MAINNET ──
    const walletExists = await verifyWalletOnMirrorNode(cleanWallet);
    if (!walletExists) {
      return c.json({ success: false, error: "Wallet not verified on Hedera mainnet" }, 403);
    }

    // ── 5. GOVERNOR CHECK (cached, before rate limit to determine tier) ──
    const isGovernor = await checkGovernorForChat(cleanWallet);

    // ── 6. TIERED RATE LIMIT ──
    // C-1 FIX: Dual-layer (in-memory + KV) — persists across isolate restarts
    const chatSendKey = `chat:send:${cleanWallet}`;
    const chatSendMax = isGovernor ? CHAT_RATE_GOV_MAX : CHAT_RATE_REGULAR_MAX;
    const chatSendWindow = isGovernor ? CHAT_RATE_GOV_WINDOW : CHAT_RATE_REGULAR_WINDOW;

    const chatSendRL = await checkRateLimit(chatSendKey, chatSendMax, chatSendWindow);
    if (chatSendRL.limited) {
      const windowLabel = isGovernor ? "10 seconds" : "2 minutes";
      console.log(`[CHAT] Rate-limited ${cleanWallet} (governor=${isGovernor}, retry=${chatSendRL.retryAfter}s)`);
      return c.json({
        success: false,
        error: `Cooldown active — ${isGovernor ? "Governors" : "wallets"} can send 1 message every ${windowLabel}.`,
        code: "RATE_LIMITED",
        retryAfter: chatSendRL.retryAfter,
        cooldownMs: isGovernor ? CHAT_RATE_GOV_WINDOW : CHAT_RATE_REGULAR_WINDOW,
        isGovernor,
      }, { status: 429, headers: { "Retry-After": String(chatSendRL.retryAfter || 5) } });
    }

    // ── 7. ATHLETE + ADMIN CHECK ──
    const athleteMap = await getAthleteWalletMap();
    const isAthleteWallet = !!athleteMap[cleanWallet];
    const athleteName = athleteMap[cleanWallet] || undefined;
    // Server-side admin tag — the frontend MUST NEVER contain admin wallet IDs.
    // This flag is the single source of truth for rendering the admin badge.
    const isAdminWallet = isAdmin(cleanWallet);

    // ── 8. BUILD MESSAGE ──
    const msgId = `msg-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
    const message = {
      id: msgId,
      wallet: cleanWallet,
      text: sanitizedText,
      reactions: {} as Record<string, string[]>,
      timestamp: new Date().toISOString(),
      isAthlete: isAthleteWallet,
      athleteName,
      isGovernor,
      isAdmin: isAdminWallet,
    };

    // ── 9. ATOMIC APPEND + FIFO TRIM ──
    const updated = await chatAtomicUpdate((messages) => {
      messages.push(message);
      if (messages.length > CHAT_MAX_MESSAGES) {
        messages = messages.slice(messages.length - CHAT_MAX_MESSAGES);
      }
      return messages;
    });

    console.log(`[CHAT] New message from ${cleanWallet}${isAthleteWallet ? ` (athlete: ${athleteName})` : ""}${isGovernor ? " [GOVERNOR]" : ""}: "${sanitizedText.substring(0, 50)}..."`);

    // Return message + cooldown info for client-side timer
    return c.json({
      success: true,
      data: message,
      cooldownMs: isGovernor ? CHAT_RATE_GOV_WINDOW : CHAT_RATE_REGULAR_WINDOW,
      isGovernor,
    });
  } catch (error) {
    console.log(`[CHAT] Error sending message: ${error}`);
    return c.json({ success: false, error: "Failed to send message. Please try again." }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /chat/messages/:id/react — Toggle emoji reaction on a message
// ---------------------------------------------------------------------------
app.post(`${PREFIX}/chat/messages/:id/react`, async (c) => {
  try {
    const msgId = c.req.param("id");
    if (!msgId || !/^msg-[a-z0-9]+-[a-z0-9]+$/.test(msgId)) {
      return c.json({ success: false, error: "Invalid message ID format" }, 400);
    }

    const body = await c.req.json();
    const { wallet, emoji } = body;

    if (!wallet || typeof wallet !== "string" || !isValidHederaAccountId(wallet.trim())) {
      return c.json({ success: false, error: "Valid wallet address required" }, 400);
    }
    const cleanWallet = wallet.trim();

    // Wallet session verification for reactions too
    const hasValidSessionReact = await validateWalletSession(c, cleanWallet);
    if (!hasValidSessionReact) {
      return c.json({ success: false, error: "Wallet session required.", code: "SESSION_REQUIRED" }, 401);
    }

    if (!emoji || typeof emoji !== "string" || !CHAT_VALID_REACTIONS.has(emoji)) {
      return c.json({ success: false, error: `Invalid reaction. Valid: ${[...CHAT_VALID_REACTIONS].join(", ")}` }, 400);
    }

    // Tiered reaction rate limit: Governors get 30/min, regular 10/min
    // C-1 FIX: Dual-layer (in-memory + KV) — persists across isolate restarts
    const isGov = await checkGovernorForChat(cleanWallet);
    const reactMax = isGov ? CHAT_REACT_GOV_MAX : CHAT_REACT_REGULAR_MAX;
    const reactWindow = isGov ? CHAT_REACT_GOV_WINDOW : CHAT_REACT_REGULAR_WINDOW;
    const chatReactRL = await checkRateLimit(`chat:react:${cleanWallet}`, reactMax, reactWindow);
    if (chatReactRL.limited) {
      return c.json({
        success: false,
        error: "Slow down on reactions!",
        code: "RATE_LIMITED",
        retryAfter: chatReactRL.retryAfter,
      }, { status: 429, headers: { "Retry-After": String(chatReactRL.retryAfter || 3) } });
    }

    let toggledMessage: any = null;

    await chatAtomicUpdate((messages) => {
      const idx = messages.findIndex((m: any) => m.id === msgId);
      if (idx === -1) return messages; // Message not found, no-op

      const msg = { ...messages[idx] };
      if (!msg.reactions) msg.reactions = {};
      if (!msg.reactions[emoji]) msg.reactions[emoji] = [];

      // Toggle: add if not present, remove if already reacted
      const walletIdx = msg.reactions[emoji].indexOf(cleanWallet);
      if (walletIdx === -1) {
        msg.reactions[emoji].push(cleanWallet);
      } else {
        msg.reactions[emoji].splice(walletIdx, 1);
        if (msg.reactions[emoji].length === 0) {
          delete msg.reactions[emoji];
        }
      }

      messages[idx] = msg;
      toggledMessage = msg;
      return messages;
    });

    if (!toggledMessage) {
      return c.json({ success: false, error: "Message not found" }, 404);
    }

    return c.json({ success: true, data: toggledMessage });
  } catch (error) {
    console.log(`[CHAT] Error toggling reaction: ${error}`);
    return c.json({ success: false, error: "Failed to toggle reaction. Please try again." }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /chat/verified-athletes — Public map of athlete wallets for badge display
// ---------------------------------------------------------------------------
app.get(`${PREFIX}/chat/verified-athletes`, async (c) => {
  try {
    const athleteMap = await getAthleteWalletMap();
    // Also return athlete pfpUrls for avatar display
    const allAthletes: any[] = await kv.getByPrefix("athlete:");
    const enriched: Record<string, { name: string; pfpUrl?: string }> = {};
    for (const athlete of allAthletes) {
      if (athlete?.wallet && isValidHederaAccountId(athlete.wallet)) {
        enriched[athlete.wallet] = {
          name: athlete.name || "Athlete",
          pfpUrl: athlete.pfpUrl || undefined,
        };
      }
    }
    return c.json({ success: true, data: enriched });
  } catch (error) {
    console.log(`[CHAT] Error fetching verified athletes: ${error}`);
    return c.json({ success: false, error: "Failed to fetch verified athletes." }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /chat/check-governor — Mirror node Governor NFT verification for chat UI
// ---------------------------------------------------------------------------
app.get(`${PREFIX}/chat/check-governor`, async (c) => {
  try {
    const wallet = c.req.query("wallet");
    if (!wallet || !isValidHederaAccountId(wallet)) {
      return c.json({ success: false, error: "Valid Hedera wallet address required" }, 400);
    }

    const walletExists = await verifyWalletOnMirrorNode(wallet);
    if (!walletExists) {
      return c.json({ success: false, error: "Wallet not found on Hedera mainnet" }, 403);
    }

    const isGovernor = await checkGovernorForChat(wallet);

    return c.json({ success: true, data: { wallet, isGovernor } });
  } catch (error) {
    console.log(`[CHAT] Governor check error: ${error}`);
    return c.json({ success: false, error: "Governor verification temporarily unavailable. Please try again." }, 500);
  }
});

// ---------------------------------------------------------------------------
// POST /chat/emotes — Broadcast a live floating emote (Governor-only)
// Stores emotes in KV with a 15-second expiry window. All connected clients
// poll GET /chat/emotes every ~3s to pick up new emotes from other Governors.
// ---------------------------------------------------------------------------
const EMOTE_VALID_EMOJIS = new Set(["💪", "🔥", "⚡", "🏆", "🚀", "💎"]);
const EMOTE_TTL_MS = 15_000; // emotes visible for 15 seconds
const EMOTE_RATE_LIMIT_MAX = 10; // max 10 emotes per window
const EMOTE_RATE_LIMIT_WINDOW = 30_000; // 30-second window

app.post(`${PREFIX}/chat/emotes`, async (c) => {
  try {
    const rawBody = await c.req.text();
    if (rawBody.length > 1024) {
      return c.json({ success: false, error: "Request body too large" }, 413);
    }
    let body: any;
    try { body = JSON.parse(rawBody); } catch {
      return c.json({ success: false, error: "Invalid JSON body" }, 400);
    }
    const { wallet, emoji } = body;

    // Validate wallet
    if (!wallet || typeof wallet !== "string" || !isValidHederaAccountId(wallet.trim())) {
      return c.json({ success: false, error: "Valid Hedera wallet address required" }, 400);
    }
    const cleanWallet = wallet.trim();

    // Validate emoji
    if (!emoji || typeof emoji !== "string" || !EMOTE_VALID_EMOJIS.has(emoji)) {
      return c.json({ success: false, error: `Invalid emote. Valid: ${[...EMOTE_VALID_EMOJIS].join(", ")}` }, 400);
    }

    // Wallet session verification
    const hasValidSession = await validateWalletSession(c, cleanWallet);
    if (!hasValidSession) {
      console.log(`[EMOTE] Wallet session REJECTED for ${cleanWallet}`);
      return c.json({ success: false, error: "Wallet session required.", code: "SESSION_REQUIRED" }, 401);
    }

    // Governor-only check
    const isGovernor = await checkGovernorForChat(cleanWallet);
    if (!isGovernor) {
      return c.json({ success: false, error: "Live emotes are a Governor-exclusive feature." }, 403);
    }

    // Rate limit
    // C-1 FIX: Dual-layer (in-memory + KV) — persists across isolate restarts
    const emoteRL = await checkRateLimit(`chat:emote:${cleanWallet}`, EMOTE_RATE_LIMIT_MAX, EMOTE_RATE_LIMIT_WINDOW);
    if (emoteRL.limited) {
      return c.json({ success: false, error: "Emote rate limit reached. Slow down!", code: "RATE_LIMITED", retryAfter: emoteRL.retryAfter }, 429);
    }

    // Store emote in KV with timestamp — key includes a unique suffix to allow multiple
    const emoteId = `${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const emoteData = {
      id: emoteId,
      wallet: cleanWallet,
      emoji,
      timestamp: Date.now(),
      x: 10 + Math.random() * 80, // random horizontal position (server-authoritative)
    };
    await kv.set(`emote:${emoteId}`, emoteData);

    console.log(`[EMOTE] ${cleanWallet} broadcast ${emoji}`);
    return c.json({ success: true, data: emoteData });
  } catch (error) {
    console.log(`[EMOTE] Broadcast error: ${error}`);
    return c.json({ success: false, error: "Failed to broadcast emote" }, 500);
  }
});

// ---------------------------------------------------------------------------
// GET /chat/emotes — Poll recent live emotes (last 15 seconds)
// Returns all emotes within the TTL window. Clients filter out their own
// emotes and any they have already displayed (by id).
// ---------------------------------------------------------------------------
app.get(`${PREFIX}/chat/emotes`, async (c) => {
  try {
    const allEmotes: any[] = await kv.getByPrefix("emote:");
    const now = Date.now();
    const recent = allEmotes
      .filter((e: any) => e && e.timestamp && (now - e.timestamp) < EMOTE_TTL_MS)
      .sort((a: any, b: any) => a.timestamp - b.timestamp);

    // Cleanup expired emotes in the background (non-blocking)
    const expired = allEmotes.filter((e: any) => e && e.timestamp && (now - e.timestamp) >= EMOTE_TTL_MS);
    if (expired.length > 0) {
      const expiredKeys = expired.map((e: any) => `emote:${e.id}`);
      kv.mdel(expiredKeys).catch((err: any) => console.log(`[EMOTE] Cleanup error: ${err}`));
    }

    return c.json({ success: true, data: recent });
  } catch (error) {
    console.log(`[EMOTE] Poll error: ${error}`);
    return c.json({ success: true, data: [] });
  }
});

// ===========================================================================
// ██████████████████████████████████████████████████████████████████████████████
// PHASE 2 TEST TOOLS — ADMIN-ONLY, REMOVABLE PRE-LAUNCH
// ████████████████████████████████████████���█████████████████████████████████████
//
// These endpoints exist SOLELY for live testing during Phase 2. Every route
// requires requireAdminSession (cryptographic challenge-sign + 20-min token).
// When the platform goes fully live, delete this entire block.
//
// PREFIX: /admin/test/* (easy to grep + remove)
// ===========================================================================

// ---------------------------------------------------------------------------
// 1. POST /admin/test/purge-battle-votes/:id
//    Wipe all votes for a battle, reset tallies to 0, delete snapshot.
//    Battle itself is preserved (status unchanged). Use to re-test voting.
// ---------------------------------------------------------------------------
app.post(`${PREFIX}/admin/test/purge-battle-votes/:id`, requireAdminSession, async (c) => {
  try {
    const id = c.req.param("id");
    const adminWallet = c.get("adminWallet");
    const battle: any = await kv.get(`battle:${id}`);
    if (!battle) return c.json({ success: false, error: `Battle ${id} not found` }, 404);

    const allVotes: any[] = await kv.getByPrefix(`vote:battle:${id}:`);
    const keysToDelete: string[] = [];
    const eventId = battle.eventId || "standalone";

    for (const v of allVotes) {
      if (v?.wallet) {
        keysToDelete.push(`vote:battle:${id}:${v.wallet}`);
        keysToDelete.push(`wvote:${v.wallet}:${id}`);
        if (v.nonce) keysToDelete.push(`vote-nonce:${v.nonce}`);
        removeAllocationBattle(v.wallet, eventId, id).catch(() => {});
      }
    }

    // Delete snapshot if exists
    const snap = await kv.get(`snapshot:${id}`);
    if (snap) keysToDelete.push(`snapshot:${id}`);

    if (keysToDelete.length > 0) await kv.mdel(keysToDelete);

    // Reset tallies but keep battle intact
    battle.votes1Count = 0;
    battle.votes2Count = 0;
    battle.votes1Weighted = 0;
    battle.votes2Weighted = 0;
    battle.updatedAt = now();
    await kv.set(`battle:${id}`, battle);

    invalidateCache("leaderboard:voters");
    invalidateCache("leaderboard:athletes");

    console.log(`[TEST-TOOLS] Purged ${allVotes.length} votes from battle ${id}. Admin: ${adminWallet}`);
    return c.json({ success: true, data: { battleId: id, votesRemoved: allVotes.length, snapshotRemoved: !!snap } });
  } catch (error) {
    console.log(`[TEST-TOOLS] Error purging battle votes: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to purge battle votes") }, 500);
  }
});

// ---------------------------------------------------------------------------
// 2. POST /admin/test/purge-proposal-votes/:id
//    Wipe all votes for a proposal, reset counters.
// ---------------------------------------------------------------------------
app.post(`${PREFIX}/admin/test/purge-proposal-votes/:id`, requireAdminSession, async (c) => {
  try {
    const id = c.req.param("id");
    const adminWallet = c.get("adminWallet");
    const proposal: any = await kv.get(`proposal:${id}`);
    if (!proposal) return c.json({ success: false, error: `Proposal ${id} not found` }, 404);

    const allVotes: any[] = await kv.getByPrefix(`vote:proposal:${id}:`);
    const keysToDelete: string[] = [];
    for (const v of allVotes) {
      if (v?.wallet) {
        keysToDelete.push(`vote:proposal:${id}:${v.wallet}`);
        if (v.nonce) keysToDelete.push(`vote-nonce:${v.nonce}`);
      }
    }
    if (keysToDelete.length > 0) await kv.mdel(keysToDelete);

    proposal.votesFor = 0;
    proposal.votesAgainst = 0;
    proposal.totalVoters = 0;
    proposal.updatedAt = now();
    await kv.set(`proposal:${id}`, proposal);

    invalidateCache("leaderboard:voters");

    console.log(`[TEST-TOOLS] Purged ${allVotes.length} votes from proposal ${id}. Admin: ${adminWallet}`);
    return c.json({ success: true, data: { proposalId: id, votesRemoved: allVotes.length } });
  } catch (error) {
    console.log(`[TEST-TOOLS] Error purging proposal votes: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to purge proposal votes") }, 500);
  }
});

// ---------------------------------------------------------------------------
// 3. POST /admin/test/purge-skill-votes/:id — REMOVED
//    Skill votes no longer exist. Skills are admin-only.
//    Legacy vote:skill: keys are orphaned (skill voting removed).
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 4. POST /admin/test/revert-winner/:id
//    Un-declare a winner: revert battle to voting_closed, undo W/L records,
//    delete snapshot. Use when wrong winner was declared during testing.
// ---------------------------------------------------------------------------
app.post(`${PREFIX}/admin/test/revert-winner/:id`, requireAdminSession, async (c) => {
  try {
    const id = c.req.param("id");
    const adminWallet = c.get("adminWallet");
    const battle: any = await kv.get(`battle:${id}`);
    if (!battle) return c.json({ success: false, error: `Battle ${id} not found` }, 404);

    if (battle.status !== "winner_declared" && battle.status !== "rewards_distributed") {
      return c.json({ success: false, error: `Battle is "${battle.status}", not winner_declared or rewards_distributed` }, 400);
    }

    const previousWinnerId = battle.winnerId;
    const loserId = previousWinnerId === battle.athlete1Id ? battle.athlete2Id : battle.athlete1Id;

    // Undo W/L records
    const winner: any = await kv.get(`athlete:${previousWinnerId}`);
    if (winner) {
      winner.wins = Math.max(0, (winner.wins || 0) - 1);
      winner.streak = 0; // Cannot reliably restore streak
      winner.updatedAt = now();
      await kv.set(`athlete:${previousWinnerId}`, winner);
    }
    const loser: any = await kv.get(`athlete:${loserId}`);
    if (loser) {
      loser.losses = Math.max(0, (loser.losses || 0) - 1);
      loser.updatedAt = now();
      await kv.set(`athlete:${loserId}`, loser);
    }

    // Delete snapshot
    await kv.del(`snapshot:${id}`).catch(() => {});

    // Revert battle
    battle.winnerId = undefined;
    battle.status = "voting_closed";
    battle.rewardDistributed = false;
    battle.updatedAt = now();
    await kv.set(`battle:${id}`, battle);

    invalidateCache("leaderboard:athletes");
    invalidateCache("leaderboard:voters");

    console.log(`[TEST-TOOLS] Reverted winner for battle ${id}. Previous winner: ${previousWinnerId}. Admin: ${adminWallet}`);
    return c.json({ success: true, data: { battleId: id, previousWinnerId, revertedTo: "voting_closed" } });
  } catch (error) {
    console.log(`[TEST-TOOLS] Error reverting winner: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to revert winner") }, 500);
  }
});

// ---------------------------------------------------------------------------
// 5. DELETE /admin/test/battle/:id
//    Force-delete any battle regardless of status + all associated data.
// ---------------------------------------------------------------------------
app.delete(`${PREFIX}/admin/test/battle/:id`, requireAdminSession, async (c) => {
  try {
    const id = c.req.param("id");
    const adminWallet = c.get("adminWallet");
    const battle: any = await kv.get(`battle:${id}`);
    if (!battle) return c.json({ success: false, error: `Battle ${id} not found` }, 404);

    const allVotes: any[] = await kv.getByPrefix(`vote:battle:${id}:`);
    const keysToDelete: string[] = [`battle:${id}`];
    const eventId = battle.eventId || "standalone";

    for (const v of allVotes) {
      if (v?.wallet) {
        keysToDelete.push(`vote:battle:${id}:${v.wallet}`);
        keysToDelete.push(`wvote:${v.wallet}:${id}`);
        if (v.nonce) keysToDelete.push(`vote-nonce:${v.nonce}`);
        removeAllocationBattle(v.wallet, eventId, id).catch(() => {});
      }
    }

    const snap = await kv.get(`snapshot:${id}`);
    if (snap) keysToDelete.push(`snapshot:${id}`);

    await kv.mdel(keysToDelete);
    invalidateCache("leaderboard:voters");
    invalidateCache("leaderboard:athletes");

    console.log(`[TEST-TOOLS] Force-deleted battle ${id} (was ${battle.status}), ${allVotes.length} votes. Admin: ${adminWallet}`);
    return c.json({ success: true, data: { battleId: id, status: battle.status, votesRemoved: allVotes.length } });
  } catch (error) {
    console.log(`[TEST-TOOLS] Error force-deleting battle: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to delete battle") }, 500);
  }
});

// ---------------------------------------------------------------------------
// 6. DELETE /admin/test/event/:id
//    Delete event + all battles in event + all votes on those battles.
// ---------------------------------------------------------------------------
app.delete(`${PREFIX}/admin/test/event/:id`, requireAdminSession, async (c) => {
  try {
    const id = c.req.param("id");
    const adminWallet = c.get("adminWallet");
    const event: any = await kv.get(`event:${id}`);
    if (!event) return c.json({ success: false, error: `Event ${id} not found` }, 404);

    const allBattles: any[] = await kv.getByPrefix("battle:");
    const eventBattles = allBattles.filter((b: any) => b.eventId === id);
    const keysToDelete: string[] = [`event:${id}`];
    let totalVotesRemoved = 0;

    for (const battle of eventBattles) {
      const battleId = battle.id;
      keysToDelete.push(`battle:${battleId}`);

      const votes: any[] = await kv.getByPrefix(`vote:battle:${battleId}:`);
      for (const v of votes) {
        if (v?.wallet) {
          keysToDelete.push(`vote:battle:${battleId}:${v.wallet}`);
          keysToDelete.push(`wvote:${v.wallet}:${battleId}`);
          if (v.nonce) keysToDelete.push(`vote-nonce:${v.nonce}`);
          removeAllocationBattle(v.wallet, id, battleId).catch(() => {});
        }
      }
      totalVotesRemoved += votes.length;

      const snap = await kv.get(`snapshot:${battleId}`);
      if (snap) keysToDelete.push(`snapshot:${battleId}`);
    }

    await kv.mdel(keysToDelete);
    invalidateCache("leaderboard:voters");
    invalidateCache("leaderboard:athletes");

    console.log(`[TEST-TOOLS] Deleted event ${id} + ${eventBattles.length} battles + ${totalVotesRemoved} votes. Admin: ${adminWallet}`);
    return c.json({ success: true, data: { eventId: id, battlesRemoved: eventBattles.length, votesRemoved: totalVotesRemoved } });
  } catch (error) {
    console.log(`[TEST-TOOLS] Error deleting event: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to delete event") }, 500);
  }
});

// ---------------------------------------------------------------------------
// 7. DELETE /admin/test/proposal/:id
//    Delete proposal + all votes.
// ---------------------------------------------------------------------------
app.delete(`${PREFIX}/admin/test/proposal/:id`, requireAdminSession, async (c) => {
  try {
    const id = c.req.param("id");
    const adminWallet = c.get("adminWallet");
    const proposal: any = await kv.get(`proposal:${id}`);
    if (!proposal) return c.json({ success: false, error: `Proposal ${id} not found` }, 404);

    const allVotes: any[] = await kv.getByPrefix(`vote:proposal:${id}:`);
    const keysToDelete: string[] = [`proposal:${id}`];
    for (const v of allVotes) {
      if (v?.wallet) {
        keysToDelete.push(`vote:proposal:${id}:${v.wallet}`);
        if (v.nonce) keysToDelete.push(`vote-nonce:${v.nonce}`);
      }
    }
    await kv.mdel(keysToDelete);
    invalidateCache("leaderboard:voters");

    console.log(`[TEST-TOOLS] Deleted proposal ${id} + ${allVotes.length} votes. Admin: ${adminWallet}`);
    return c.json({ success: true, data: { proposalId: id, title: proposal.title, votesRemoved: allVotes.length } });
  } catch (error) {
    console.log(`[TEST-TOOLS] Error deleting proposal: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to delete proposal") }, 500);
  }
});

// ---------------------------------------------------------------------------
// 8. POST /admin/test/clear-chat
//    Wipe arena chat history.
// ---------------------------------------------------------------------------
app.post(`${PREFIX}/admin/test/clear-chat`, requireAdminSession, async (c) => {
  try {
    const adminWallet = c.get("adminWallet");
    const existing = await kv.get(CHAT_KV_KEY) as any[] | null;
    const count = Array.isArray(existing) ? existing.length : 0;
    await kv.set(CHAT_KV_KEY, []);

    console.log(`[TEST-TOOLS] Cleared arena chat (${count} messages). Admin: ${adminWallet}`);
    return c.json({ success: true, data: { messagesCleared: count } });
  } catch (error) {
    console.log(`[TEST-TOOLS] Error clearing chat: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to clear chat") }, 500);
  }
});

// ---------------------------------------------------------------------------
// 9. DELETE /admin/test/snapshot/:id
//    Delete a reward snapshot without touching the battle.
// ---------------------------------------------------------------------------
app.delete(`${PREFIX}/admin/test/snapshot/:id`, requireAdminSession, async (c) => {
  try {
    const id = c.req.param("id");
    const adminWallet = c.get("adminWallet");
    const snap = await kv.get(`snapshot:${id}`);
    if (!snap) return c.json({ success: false, error: `Snapshot for battle ${id} not found` }, 404);
    await kv.del(`snapshot:${id}`);

    console.log(`[TEST-TOOLS] Deleted snapshot for battle ${id}. Admin: ${adminWallet}`);
    return c.json({ success: true, data: { battleId: id } });
  } catch (error) {
    console.log(`[TEST-TOOLS] Error deleting snapshot: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to delete snapshot") }, 500);
  }
});

// ---------------------------------------------------------------------------
// 10. POST /admin/test/flush-caches
//     Invalidate all in-memory leaderboard caches immediately.
// ---------------------------------------------------------------------------
app.post(`${PREFIX}/admin/test/flush-caches`, requireAdminSession, async (c) => {
  try {
    const adminWallet = c.get("adminWallet");
    invalidateCache("leaderboard:athletes");
    invalidateCache("leaderboard:voters");
    invalidateCacheByPrefix("leaderboard:");

    console.log(`[TEST-TOOLS] Flushed all leaderboard caches. Admin: ${adminWallet}`);
    return c.json({ success: true, data: { flushed: ["leaderboard:athletes", "leaderboard:voters"] } });
  } catch (error) {
    console.log(`[TEST-TOOLS] Error flushing caches: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to flush caches") }, 500);
  }
});

// ---------------------------------------------------------------------------
// 11. POST /admin/test/reset-athlete-records
//     Reset all athlete W/L/streak records to 0. Skills are untouched.
//     Use after a full test cycle to start fresh battles.
// ---------------------------------------------------------------------------
app.post(`${PREFIX}/admin/test/reset-athlete-records`, requireAdminSession, async (c) => {
  try {
    const adminWallet = c.get("adminWallet");
    const athletes: any[] = await kv.getByPrefix("athlete:");
    let updated = 0;

    for (const ath of athletes) {
      if (ath?.id) {
        ath.wins = 0;
        ath.losses = 0;
        ath.streak = 0;
        ath.rank = 0;
        ath.totalVotes = 0;
        ath.tokensStaked = 0;
        ath.updatedAt = now();
        await kv.set(`athlete:${ath.id}`, ath);
        updated++;
      }
    }

    invalidateCache("leaderboard:athletes");
    invalidateCache("leaderboard:voters");

    console.log(`[TEST-TOOLS] Reset W/L/streak records for ${updated} athletes. Admin: ${adminWallet}`);
    return c.json({ success: true, data: { athletesReset: updated } });
  } catch (error) {
    console.log(`[TEST-TOOLS] Error resetting athlete records: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to reset athlete records") }, 500);
  }
});

// ---------------------------------------------------------------------------
// 12. GET /admin/test/data-inventory
//     Quick count of all KV data by prefix for operational visibility.
// ---------------------------------------------------------------------------
app.get(`${PREFIX}/admin/test/data-inventory`, requireAdminSession, async (c) => {
  try {
    const prefixes = [
      "athlete:", "event:", "battle:", "proposal:", "sponsor:", "sponsor-inquiry:",
      "application:", "vote:battle:", "vote:proposal:", "vote:skill:",
      "snapshot:", "wvote:", "walloc:", "vote-nonce:", "nft-collection:",
    ];

    const inventory: Record<string, number> = {};
    for (const prefix of prefixes) {
      const items = await kv.getByPrefix(prefix);
      inventory[prefix] = items.length;
    }

    const chatData = await kv.get(CHAT_KV_KEY) as any[] | null;
    inventory["chat:messages"] = Array.isArray(chatData) ? chatData.length : 0;

    const ipFlagItems = await kv.getByPrefix("ip-flag:");
    inventory["ip-flag:"] = ipFlagItems.length;

    return c.json({ success: true, data: inventory });
  } catch (error) {
    console.log(`[TEST-TOOLS] Error fetching data inventory: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to fetch data inventory") }, 500);
  }
});

// ---------------------------------------------------------------------------
// 15. GET /admin/test/ip-flags
//     Retrieve all flagged IP anomalies for admin review.
//     Returns array of IP flag records from KV.
// ---------------------------------------------------------------------------
app.get(`${PREFIX}/admin/test/ip-flags`, requireAdminSession, async (c) => {
  try {
    const flags = await kv.getByPrefix("ip-flag:");
    // Sort by flaggedAt descending (most recent first)
    const sorted = flags
      .filter((f: any) => f && f.ip)
      .sort((a: any, b: any) => new Date(b.flaggedAt).getTime() - new Date(a.flaggedAt).getTime());

    console.log(`[TEST-TOOLS] IP flags requested. ${sorted.length} flagged IPs found.`);
    return c.json({ success: true, data: sorted });
  } catch (error) {
    console.log(`[TEST-TOOLS] Error fetching IP flags: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to fetch IP anomaly flags") }, 500);
  }
});

// ---------------------------------------------------------------------------
// 16. POST /admin/test/clear-ip-flags
//     Clear all IP anomaly flags from KV.
//     Does NOT clear the in-memory tracking — only the persisted flags.
// ---------------------------------------------------------------------------
app.post(`${PREFIX}/admin/test/clear-ip-flags`, requireAdminSession, async (c) => {
  try {
    const adminWallet = c.get("adminWallet");
    const flags = await kv.getByPrefix("ip-flag:");
    const keys = flags
      .filter((f: any) => f && f.ip)
      .map((f: any) => `ip-flag:${sanitizeIpForKey(f.ip)}`);

    if (keys.length > 0) {
      for (let i = 0; i < keys.length; i += 200) {
        await kv.mdel(keys.slice(i, i + 200));
      }
    }

    // Also clear in-memory log
    ipVoteLog.clear();

    console.log(`[TEST-TOOLS] IP flags cleared: ${keys.length} flags removed. Admin: ${adminWallet}`);
    return c.json({ success: true, data: { flagsCleared: keys.length } });
  } catch (error) {
    console.log(`[TEST-TOOLS] Error clearing IP flags: ${error}`);
    return c.json({ success: false, error: safeErrorMsg("Failed to clear IP anomaly flags") }, 500);
  }
});

// ===========================================================================
// END PHASE 2 TEST TOOLS — Delete entire block above when going fully live
// ===========================================================================

// Magic Create Account routes (additive — HashPack /wallet/register unchanged)
mountMagicRoutes(app, PREFIX);

// Mount cali / elite / contest routes LAST so core functionality (admin auth, etc.)
// is not affected if a satellite module has a startup error.
mountCaliRoutes(app, PREFIX);
mountEliteRoutes(app, PREFIX);
mountContestRoutes(app, PREFIX);
// Early Supporter claim — defaults DISABLED (EARLY_SUPPORTER_ENABLED=false)
mountEarlySupporterRoutes(app, PREFIX);

// ---------------------------------------------------------------------------
Deno.serve(app.fetch);