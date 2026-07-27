/**
 * WCO Connect-to-Enter Contest — Backend Module
 * =============================================
 * Production contest engine for the $250 giveaway (+ $100 social).
 *
 * KEYS:
 *   contest:config
 *   contest:count
 *   contest:entry:{accountId}
 *   contest:entry-by-n:{n}
 *   contest:day:{YYYY-MM-DD}
 *   contest:social-count
 *   contest:winners:v1
 *   contest:audit:{isoMs}:{rand}
 *   contest:export:{id}
 *
 * PRIVACY: Full wallet IDs only on admin routes. Public stats = counts only.
 */

import type { Context, Next } from "npm:hono";
import type { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";
import { acquireLock } from "./scaling.tsx";
import {
  isValidHederaAccountId,
  checkRateLimit,
  sanitizeString,
  sanitizeNumber,
  requireAdminSession,
} from "./admin-auth.tsx";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CONFIG_KEY = "contest:config";
const COUNT_KEY = "contest:count";
const SOCIAL_COUNT_KEY = "contest:social-count";
const WINNERS_KEY = "contest:winners:v1";
const MIN_HBAR_TINYBARS = 100_000_000;
const DEFAULT_CAP = 5000;
const TERMS_VERSION = "1.1.0";
const MIRROR_NODE_URL = "https://mainnet.mirrornode.hedera.com";
const BALANCE_INMEM_TTL_MS = 10_000;
const BALANCE_KV_TTL_MS = 60_000;

type ContestStatus =
  | "draft"
  | "open"
  | "full"
  | "closed"
  | "drawing"
  | "completed";

const VALID_STATUS = new Set<ContestStatus>([
  "draft",
  "open",
  "full",
  "closed",
  "drawing",
  "completed",
]);

interface ContestConfig {
  id: string;
  status: ContestStatus;
  title: string;
  entryCap: number;
  entryCount: number;
  minHbarTinybars: number;
  requireCaliSession: boolean;
  startedAt: string | null;
  endsAt: string | null;
  closedAt: string | null;
  closedReason: string | null;
  termsVersion: string;
  prizes: {
    main: Array<{ place: 1 | 2 | 3; amountUsd: number; label: string }>;
    social: { amountUsd: number; label: string };
  };
  claimWindowDays: number;
  updatedAt: string;
  updatedBy: string | null;
}

interface ContestEntry {
  accountId: string;
  entryNumber: number;
  enteredAt: string;
  hbarTinybarsAtEntry: number;
  termsVersion: string;
  source: "wallet_register" | "manual_admin" | "backfill";
  lastLoginAt?: string;
  loginCount?: number;
  socialQualified: boolean;
  socialQualifiedAt?: string;
  socialPlatform?: "x" | "native" | "other";
  socialPostUrl?: string;
  notes?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function nowIso(): string {
  return new Date().toISOString();
}

function dayKey(d = new Date()): string {
  return d.toISOString().slice(0, 10);
}

function extractClientIp(c: Context): string {
  const xf = c.req.header("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim().slice(0, 64);
  const real = c.req.header("x-real-ip");
  if (real) return real.slice(0, 64);
  return "unknown";
}

async function hashOpaque(scope: string, value: string): Promise<string> {
  const secret =
    Deno.env.get("BOTB_HASH_SALT") ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
    "contest-fallback-salt-min16";
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret.slice(0, 64)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    enc.encode(`${scope}|${value}`),
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 32);
}

const balanceMemCache = new Map<string, { tinybars: number; expiresAt: number }>();

async function getAccountBalanceTinybars(accountId: string): Promise<number> {
  const memHit = balanceMemCache.get(accountId);
  if (memHit && memHit.expiresAt > Date.now()) return memHit.tinybars;

  const kvKey = `contest:balcache:${accountId}`;
  try {
    const kvHit: any = await kv.get(kvKey);
    if (kvHit && typeof kvHit.tinybars === "number" && kvHit.expiresAt > Date.now()) {
      balanceMemCache.set(accountId, {
        tinybars: kvHit.tinybars,
        expiresAt: Date.now() + BALANCE_INMEM_TTL_MS,
      });
      return kvHit.tinybars;
    }
  } catch {
    /* ignore */
  }

  let res: Response;
  try {
    res = await fetch(`${MIRROR_NODE_URL}/api/v1/accounts/${accountId}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(3000),
    });
  } catch (err) {
    throw new Error(`Mirror node unreachable: ${err}`);
  }

  if (!res.ok) throw new Error(`Mirror node returned ${res.status}`);

  const data = await res.json();
  const tinybars = Number(data?.balance?.balance);
  if (!Number.isFinite(tinybars) || tinybars < 0) {
    throw new Error("Invalid balance payload");
  }

  balanceMemCache.set(accountId, {
    tinybars,
    expiresAt: Date.now() + BALANCE_INMEM_TTL_MS,
  });
  kv.set(kvKey, { tinybars, expiresAt: Date.now() + BALANCE_KV_TTL_MS }).catch(() => {});
  return tinybars;
}

function defaultConfig(): ContestConfig {
  const t = nowIso();
  return {
    id: "connect-to-enter-v1",
    status: "draft",
    title: "Connect to Enter — $250 Giveaway",
    entryCap: DEFAULT_CAP,
    entryCount: 0,
    minHbarTinybars: MIN_HBAR_TINYBARS,
    requireCaliSession: false,
    startedAt: null,
    endsAt: null,
    closedAt: null,
    closedReason: null,
    termsVersion: TERMS_VERSION,
    prizes: {
      main: [
        { place: 1, amountUsd: 150, label: "1st Place" },
        { place: 2, amountUsd: 75, label: "2nd Place" },
        { place: 3, amountUsd: 25, label: "3rd Place" },
      ],
      social: { amountUsd: 100, label: "Workout Share on X" },
    },
    claimWindowDays: 14,
    updatedAt: t,
    updatedBy: null,
  };
}

async function loadConfig(): Promise<ContestConfig> {
  try {
    const raw: any = await kv.get(CONFIG_KEY);
    if (raw && raw.id) {
      const count = Number(await kv.get(COUNT_KEY)) || raw.entryCount || 0;
      return { ...defaultConfig(), ...raw, entryCount: count };
    }
  } catch (err) {
    console.log(`[CONTEST] config load error: ${err}`);
  }
  const fresh = defaultConfig();
  await kv.set(CONFIG_KEY, fresh);
  await kv.set(COUNT_KEY, 0);
  await kv.set(SOCIAL_COUNT_KEY, 0);
  return fresh;
}

async function saveConfig(cfg: ContestConfig): Promise<void> {
  await kv.set(CONFIG_KEY, cfg);
  await kv.set(COUNT_KEY, cfg.entryCount);
}

async function writeAudit(
  actor: string,
  action: string,
  detail: Record<string, unknown> = {},
  ipHash?: string,
): Promise<void> {
  const at = nowIso();
  const rand = crypto.randomUUID().slice(0, 8);
  const id = `${Date.now()}-${rand}`;
  const key = `contest:audit:${Date.now()}:${rand}`;
  const event = { id, at, actor, action, detail, ipHash: ipHash || null };
  try {
    await kv.set(key, event);
  } catch (err) {
    console.log(`[CONTEST-AUDIT] write failed: ${err}`);
  }
  console.log(`[CONTEST-AUDIT] ${action} actor=${actor} ${JSON.stringify(detail)}`);
}

async function getWalletFromSession(c: Context): Promise<string | null> {
  const token = c.req.header("X-Wallet-Session");
  if (!token || token.length < 10) return null;
  try {
    const session: any = await kv.get(`wsession:${token}`);
    if (!session?.wallet) return null;
    if (Date.now() > session.expiresAt) {
      kv.del(`wsession:${token}`).catch(() => {});
      return null;
    }
    return session.wallet;
  } catch {
    return null;
  }
}

function publicStats(cfg: ContestConfig) {
  const remaining = Math.max(0, cfg.entryCap - cfg.entryCount);
  const progressPercent =
    cfg.entryCap > 0
      ? Math.min(100, Math.round((cfg.entryCount / cfg.entryCap) * 1000) / 10)
      : 0;
  return {
    status: cfg.status,
    title: cfg.title,
    entryCount: cfg.entryCount,
    entryCap: cfg.entryCap,
    remaining,
    startedAt: cfg.startedAt,
    endsAt: cfg.endsAt,
    prizes: cfg.prizes,
    progressPercent,
    isOpen: cfg.status === "open",
    isFull: cfg.status === "full" || remaining === 0,
  };
}

function isAcceptingEntries(cfg: ContestConfig): boolean {
  if (cfg.status !== "open") return false;
  if (cfg.entryCount >= cfg.entryCap) return false;
  if (cfg.endsAt) {
    const end = Date.parse(cfg.endsAt);
    if (Number.isFinite(end) && Date.now() > end) return false;
  }
  return true;
}

async function loadAllEntries(): Promise<ContestEntry[]> {
  const rows: any[] = (await kv.getByPrefix("contest:entry:")) ?? [];
  const entries: ContestEntry[] = [];
  for (const r of rows) {
    if (r && typeof r.accountId === "string" && typeof r.entryNumber === "number") {
      entries.push(r as ContestEntry);
    }
  }
  entries.sort((a, b) => a.entryNumber - b.entryNumber);
  return entries;
}

function escapeCsv(val: unknown): string {
  const s = val == null ? "" : String(val);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function entriesToCsv(entries: ContestEntry[]): string {
  const header =
    "entryNumber,accountId,enteredAt,hbarTinybarsAtEntry,socialQualified,socialQualifiedAt,lastLoginAt,termsVersion";
  const lines = entries.map((e) =>
    [
      e.entryNumber,
      e.accountId,
      e.enteredAt,
      e.hbarTinybarsAtEntry,
      e.socialQualified ? "true" : "false",
      e.socialQualifiedAt || "",
      e.lastLoginAt || "",
      e.termsVersion,
    ]
      .map(escapeCsv)
      .join(","),
  );
  return [header, ...lines].join("\n");
}

// ---------------------------------------------------------------------------
// Core enter
// ---------------------------------------------------------------------------

async function tryEnter(
  accountId: string,
  source: ContestEntry["source"],
  c: Context,
): Promise<
  | { ok: true; result: Record<string, unknown> }
  | { ok: false; status: number; body: Record<string, unknown> }
> {
  if (!isValidHederaAccountId(accountId)) {
    return {
      ok: false,
      status: 400,
      body: { success: false, error: "Invalid Hedera account ID", code: "INVALID_WALLET" },
    };
  }

  const existing: any = await kv.get(`contest:entry:${accountId}`);
  if (existing && existing.accountId === accountId) {
    const cfg = await loadConfig();
    return {
      ok: true,
      result: {
        entered: true,
        alreadyEntered: true,
        entryNumber: existing.entryNumber,
        entryCount: cfg.entryCount,
        remaining: Math.max(0, cfg.entryCap - cfg.entryCount),
        status: cfg.status,
        message: `Already entered as #${existing.entryNumber}`,
      },
    };
  }

  const ip = extractClientIp(c);
  const ipHash = await hashOpaque("contest-ip", ip);

  const release = await acquireLock("contest:enter");
  try {
    // Re-check under lock
    const again: any = await kv.get(`contest:entry:${accountId}`);
    if (again && again.accountId === accountId) {
      const cfg = await loadConfig();
      return {
        ok: true,
        result: {
          entered: true,
          alreadyEntered: true,
          entryNumber: again.entryNumber,
          entryCount: cfg.entryCount,
          remaining: Math.max(0, cfg.entryCap - cfg.entryCount),
          status: cfg.status,
          message: `Already entered as #${again.entryNumber}`,
        },
      };
    }

    let cfg = await loadConfig();

    if (!isAcceptingEntries(cfg)) {
      if (cfg.status === "open" && cfg.entryCount >= cfg.entryCap) {
        cfg = {
          ...cfg,
          status: "full",
          closedAt: cfg.closedAt || nowIso(),
          closedReason: "cap_reached",
          updatedAt: nowIso(),
        };
        await saveConfig(cfg);
      }
      await writeAudit(accountId, "entry_rejected", {
        reason: cfg.status === "full" || cfg.entryCount >= cfg.entryCap
          ? "cap_reached"
          : "not_open",
        status: cfg.status,
      }, ipHash);
      const code =
        cfg.entryCount >= cfg.entryCap || cfg.status === "full"
          ? "CONTEST_FULL"
          : "CONTEST_CLOSED";
      return {
        ok: false,
        status: code === "CONTEST_FULL" ? 409 : 403,
        body: {
          success: false,
          error:
            code === "CONTEST_FULL"
              ? "Contest is full — 5,000 wallets already entered."
              : "Contest is not open for entries.",
          code,
          data: publicStats(cfg),
        },
      };
    }

    let tinybars: number;
    try {
      tinybars = await getAccountBalanceTinybars(accountId);
    } catch (err) {
      console.log(`[CONTEST] balance check failed for ${accountId}: ${err}`);
      return {
        ok: false,
        status: 502,
        body: {
          success: false,
          error: "Eligibility check temporarily unavailable. Please try again.",
          code: "MIRROR_UNAVAILABLE",
        },
      };
    }

    if (tinybars < cfg.minHbarTinybars) {
      await writeAudit(accountId, "entry_rejected", {
        reason: "insufficient_hbar",
        tinybars,
        required: cfg.minHbarTinybars,
      }, ipHash);
      return {
        ok: false,
        status: 403,
        body: {
          success: false,
          error: "Hold at least 1 HBAR in your wallet to enter the contest.",
          code: "INSUFFICIENT_HBAR",
          data: {
            tinybars,
            requiredTinybars: cfg.minHbarTinybars,
          },
        },
      };
    }

    const entryNumber = cfg.entryCount + 1;
    const enteredAt = nowIso();
    const entry: ContestEntry = {
      accountId,
      entryNumber,
      enteredAt,
      hbarTinybarsAtEntry: tinybars,
      termsVersion: cfg.termsVersion,
      source,
      lastLoginAt: enteredAt,
      loginCount: 1,
      socialQualified: false,
    };

    await kv.set(`contest:entry:${accountId}`, entry);
    await kv.set(`contest:entry-by-n:${entryNumber}`, { accountId });

    const day = dayKey();
    const dayCount = (Number(await kv.get(`contest:day:${day}`)) || 0) + 1;
    await kv.set(`contest:day:${day}`, dayCount);

    cfg.entryCount = entryNumber;
    cfg.updatedAt = nowIso();

    if (entryNumber >= cfg.entryCap) {
      cfg.status = "full";
      cfg.closedAt = enteredAt;
      cfg.closedReason = "cap_reached";
      await writeAudit("system", "entry_cap_reached", {
        entryCount: entryNumber,
        lastAccount: accountId,
      });
    }

    await saveConfig(cfg);
    await writeAudit(accountId, "entry_accepted", {
      entryNumber,
      tinybars,
      source,
    }, ipHash);

    return {
      ok: true,
      result: {
        entered: true,
        alreadyEntered: false,
        entryNumber,
        entryCount: cfg.entryCount,
        remaining: Math.max(0, cfg.entryCap - cfg.entryCount),
        status: cfg.status,
        message: `You're entry #${entryNumber}. Welcome to the Connect-to-Enter contest.`,
      },
    };
  } finally {
    release();
  }
}

// ---------------------------------------------------------------------------
// Mount routes
// ---------------------------------------------------------------------------

export function mountContestRoutes(app: Hono, PREFIX: string) {
  // ── Public stats (no wallets) ──────────────────────────────────────────
  app.get(`${PREFIX}/contest/public-stats`, async (c) => {
    try {
      const rl = await checkRateLimit(`contest-public:${extractClientIp(c)}`, 60, 60_000);
      if (rl.limited) {
        return c.json(
          { success: false, error: "Too many requests", code: "RATE_LIMITED" },
          429,
        );
      }
      const cfg = await loadConfig();
      return c.json({ success: true, data: publicStats(cfg) });
    } catch (err) {
      console.log(`[CONTEST] public-stats error: ${err}`);
      return c.json({ success: false, error: "Failed to load contest stats" }, 500);
    }
  });

  // ── Enter ──────────────────────────────────────────────────────────────
  app.post(`${PREFIX}/contest/enter`, async (c) => {
    try {
      const accountId = await getWalletFromSession(c);
      if (!accountId) {
        return c.json(
          {
            success: false,
            error: "Wallet session required. Connect your wallet and try again.",
            code: "SESSION_REQUIRED",
          },
          401,
        );
      }

      const rl = await checkRateLimit(`contest-enter:${accountId}`, 10, 60_000);
      if (rl.limited) {
        return c.json(
          { success: false, error: "Too many entry attempts. Please wait.", code: "RATE_LIMITED" },
          429,
        );
      }

      const outcome = await tryEnter(accountId, "wallet_register", c);
      if (!outcome.ok) {
        return c.json(outcome.body, outcome.status as 400);
      }
      return c.json({ success: true, data: outcome.result });
    } catch (err) {
      console.log(`[CONTEST] enter error: ${err}`);
      return c.json({ success: false, error: "Failed to process contest entry" }, 500);
    }
  });

  // ── Me ─────────────────────────────────────────────────────────────────
  app.get(`${PREFIX}/contest/me`, async (c) => {
    try {
      const accountId = await getWalletFromSession(c);
      if (!accountId) {
        return c.json(
          { success: false, error: "Wallet session required", code: "SESSION_REQUIRED" },
          401,
        );
      }
      const cfg = await loadConfig();
      const entry: any = await kv.get(`contest:entry:${accountId}`);
      if (!entry || entry.accountId !== accountId) {
        return c.json({
          success: true,
          data: {
            entered: false,
            contestStatus: cfg.status,
            entryCount: cfg.entryCount,
            entryCap: cfg.entryCap,
            remaining: Math.max(0, cfg.entryCap - cfg.entryCount),
          },
        });
      }
      return c.json({
        success: true,
        data: {
          entered: true,
          entryNumber: entry.entryNumber,
          enteredAt: entry.enteredAt,
          socialQualified: !!entry.socialQualified,
          socialQualifiedAt: entry.socialQualifiedAt || null,
          contestStatus: cfg.status,
          entryCount: cfg.entryCount,
          entryCap: cfg.entryCap,
          remaining: Math.max(0, cfg.entryCap - cfg.entryCount),
        },
      });
    } catch (err) {
      console.log(`[CONTEST] me error: ${err}`);
      return c.json({ success: false, error: "Failed to load contest status" }, 500);
    }
  });

  // ── Login ping (claim eligibility tracking) ────────────────────────────
  app.post(`${PREFIX}/contest/me/login-ping`, async (c) => {
    try {
      const accountId = await getWalletFromSession(c);
      if (!accountId) {
        return c.json(
          { success: false, error: "Wallet session required", code: "SESSION_REQUIRED" },
          401,
        );
      }
      const entry: any = await kv.get(`contest:entry:${accountId}`);
      if (!entry || entry.accountId !== accountId) {
        return c.json({ success: true, data: { entered: false } });
      }
      const updated = {
        ...entry,
        lastLoginAt: nowIso(),
        loginCount: (Number(entry.loginCount) || 0) + 1,
      };
      await kv.set(`contest:entry:${accountId}`, updated);
      return c.json({
        success: true,
        data: {
          entered: true,
          lastLoginAt: updated.lastLoginAt,
          loginCount: updated.loginCount,
        },
      });
    } catch (err) {
      console.log(`[CONTEST] login-ping error: ${err}`);
      return c.json({ success: false, error: "Failed to update login" }, 500);
    }
  });

  // ── Social share qualify ───────────────────────────────────────────────
  app.post(`${PREFIX}/contest/share`, async (c) => {
    try {
      const accountId = await getWalletFromSession(c);
      if (!accountId) {
        return c.json(
          { success: false, error: "Wallet session required", code: "SESSION_REQUIRED" },
          401,
        );
      }

      const rl = await checkRateLimit(`contest-share:${accountId}`, 20, 60_000);
      if (rl.limited) {
        return c.json(
          { success: false, error: "Too many share requests", code: "RATE_LIMITED" },
          429,
        );
      }

      let body: any = {};
      try {
        body = await c.req.json();
      } catch {
        body = {};
      }
      const platformRaw = sanitizeString(body?.platform, 16).toLowerCase();
      const platform =
        platformRaw === "x" || platformRaw === "native" || platformRaw === "other"
          ? platformRaw
          : "x";

      let entry: any = await kv.get(`contest:entry:${accountId}`);

      // Auto-attempt enter if not yet entered and contest open
      if (!entry || entry.accountId !== accountId) {
        const outcome = await tryEnter(accountId, "wallet_register", c);
        if (!outcome.ok) {
          return c.json(
            {
              success: false,
              error:
                (outcome.body as any).error ||
                "Could not enter contest. Connect with ≥1 HBAR while the contest is open.",
              code: (outcome.body as any).code || "NOT_ENTERED",
              data: {
                socialQualified: false,
                alreadyQualified: false,
                entered: false,
                message: (outcome.body as any).error,
              },
            },
            outcome.status as 400,
          );
        }
        entry = await kv.get(`contest:entry:${accountId}`);
      }

      if (entry.socialQualified) {
        return c.json({
          success: true,
          data: {
            socialQualified: true,
            alreadyQualified: true,
            entered: true,
            message: "Already qualified for the social prize lane.",
          },
        });
      }

      const at = nowIso();
      const updated = {
        ...entry,
        socialQualified: true,
        socialQualifiedAt: at,
        socialPlatform: platform,
      };
      await kv.set(`contest:entry:${accountId}`, updated);

      const socialCount = (Number(await kv.get(SOCIAL_COUNT_KEY)) || 0) + 1;
      await kv.set(SOCIAL_COUNT_KEY, socialCount);

      await writeAudit(accountId, "social_qualify", { platform, at });

      return c.json({
        success: true,
        data: {
          socialQualified: true,
          alreadyQualified: false,
          entered: true,
          message: "Social prize entry unlocked — thanks for sharing your workout!",
        },
      });
    } catch (err) {
      console.log(`[CONTEST] share error: ${err}`);
      return c.json({ success: false, error: "Failed to record share" }, 500);
    }
  });

  // =========================================================================
  // ADMIN ROUTES
  // =========================================================================

  app.get(`${PREFIX}/admin/contest`, requireAdminSession, async (c) => {
    try {
      const cfg = await loadConfig();
      const socialQualifiedCount = Number(await kv.get(SOCIAL_COUNT_KEY)) || 0;
      const winners = (await kv.get(WINNERS_KEY)) || null;

      // Daily series — last 30 days
      const dailySeries: Array<{ date: string; count: number }> = [];
      for (let i = 0; i < 30; i++) {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() - i);
        const date = dayKey(d);
        const count = Number(await kv.get(`contest:day:${date}`)) || 0;
        if (count > 0 || i < 7) dailySeries.push({ date, count });
      }
      dailySeries.reverse();

      const today = dayKey();
      const entriesToday = Number(await kv.get(`contest:day:${today}`)) || 0;
      let entriesLast7d = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() - i);
        entriesLast7d += Number(await kv.get(`contest:day:${dayKey(d)}`)) || 0;
      }

      const entriesSinceStart = cfg.entryCount; // all entries after open are contest entries

      return c.json({
        success: true,
        data: {
          config: { ...cfg, socialQualifiedCount },
          metrics: {
            entryCount: cfg.entryCount,
            entryCap: cfg.entryCap,
            remaining: Math.max(0, cfg.entryCap - cfg.entryCount),
            socialQualifiedCount,
            entriesToday,
            entriesLast7d,
            entriesSinceStart,
            progressPercent:
              cfg.entryCap > 0
                ? Math.min(100, Math.round((cfg.entryCount / cfg.entryCap) * 1000) / 10)
                : 0,
          },
          winners,
          dailySeries,
        },
      });
    } catch (err) {
      console.log(`[CONTEST] admin overview error: ${err}`);
      return c.json({ success: false, error: "Failed to load contest admin data" }, 500);
    }
  });

  app.post(`${PREFIX}/admin/contest/status`, requireAdminSession, async (c) => {
    try {
      const adminWallet = c.get("adminWallet") as string;
      const body = await c.req.json();
      const status = sanitizeString(body?.status, 32) as ContestStatus;
      if (!VALID_STATUS.has(status)) {
        return c.json({ success: false, error: "Invalid status" }, 400);
      }

      const cfg = await loadConfig();
      const prev = cfg.status;
      cfg.status = status;
      cfg.updatedAt = nowIso();
      cfg.updatedBy = adminWallet;

      if (status === "open" && !cfg.startedAt) {
        cfg.startedAt = nowIso();
      }
      if (status === "closed" || status === "drawing" || status === "completed") {
        cfg.closedAt = cfg.closedAt || nowIso();
        cfg.closedReason = sanitizeString(body?.reason, 64) || "admin";
      }
      if (status === "open") {
        cfg.closedAt = null;
        cfg.closedReason = null;
      }

      await saveConfig(cfg);
      await writeAudit(adminWallet, status === "open" ? "contest_open" : "contest_close", {
        from: prev,
        to: status,
        reason: cfg.closedReason,
      });

      console.log(`[ADMIN] Contest status ${prev} → ${status}. Admin: ${adminWallet}`);
      return c.json({ success: true, data: { config: cfg } });
    } catch (err) {
      console.log(`[CONTEST] status update error: ${err}`);
      return c.json({ success: false, error: "Failed to update contest status" }, 500);
    }
  });

  app.post(`${PREFIX}/admin/contest/config`, requireAdminSession, async (c) => {
    try {
      const adminWallet = c.get("adminWallet") as string;
      const body = await c.req.json();
      const cfg = await loadConfig();

      if (body.entryCap != null) {
        cfg.entryCap = sanitizeNumber(body.entryCap, 1, 100_000, cfg.entryCap);
      }
      if (body.endsAt !== undefined) {
        cfg.endsAt = body.endsAt
          ? sanitizeString(body.endsAt, 40)
          : null;
      }
      if (typeof body.requireCaliSession === "boolean") {
        cfg.requireCaliSession = body.requireCaliSession;
      }
      if (body.title) {
        cfg.title = sanitizeString(body.title, 120);
      }
      if (body.claimWindowDays != null) {
        cfg.claimWindowDays = sanitizeNumber(body.claimWindowDays, 1, 90, 14);
      }

      cfg.updatedAt = nowIso();
      cfg.updatedBy = adminWallet;
      await saveConfig(cfg);
      await writeAudit(adminWallet, "config_update", {
        entryCap: cfg.entryCap,
        endsAt: cfg.endsAt,
        requireCaliSession: cfg.requireCaliSession,
      });

      console.log(`[ADMIN] Contest config updated. Admin: ${adminWallet}`);
      return c.json({ success: true, data: { config: cfg } });
    } catch (err) {
      console.log(`[CONTEST] config update error: ${err}`);
      return c.json({ success: false, error: "Failed to update contest config" }, 500);
    }
  });

  app.get(`${PREFIX}/admin/contest/entries`, requireAdminSession, async (c) => {
    try {
      const page = sanitizeNumber(c.req.query("page"), 1, 10_000, 1);
      const pageSize = sanitizeNumber(c.req.query("pageSize"), 1, 200, 50);
      const q = sanitizeString(c.req.query("q") || "", 64).toLowerCase();
      const socialOnly = c.req.query("social") === "1" || c.req.query("social") === "true";

      let entries = await loadAllEntries();
      if (socialOnly) entries = entries.filter((e) => e.socialQualified);
      if (q) entries = entries.filter((e) => e.accountId.toLowerCase().includes(q));

      const total = entries.length;
      const start = (page - 1) * pageSize;
      const items = entries.slice(start, start + pageSize);

      return c.json({
        success: true,
        data: {
          items,
          total,
          page,
          pageSize,
          hasMore: start + pageSize < total,
        },
      });
    } catch (err) {
      console.log(`[CONTEST] entries list error: ${err}`);
      return c.json({ success: false, error: "Failed to list entries" }, 500);
    }
  });

  app.get(`${PREFIX}/admin/contest/entries/export`, requireAdminSession, async (c) => {
    try {
      const adminWallet = c.get("adminWallet") as string;
      const format = (c.req.query("format") || "csv").toLowerCase();
      const socialOnly = c.req.query("social") === "1" || c.req.query("social") === "true";

      let entries = await loadAllEntries();
      if (socialOnly) entries = entries.filter((e) => e.socialQualified);

      const exportId = crypto.randomUUID();
      await kv.set(`contest:export:${exportId}`, {
        id: exportId,
        at: nowIso(),
        adminWallet,
        format,
        socialOnly,
        count: entries.length,
      });
      await writeAudit(adminWallet, "export_download", {
        exportId,
        format,
        socialOnly,
        count: entries.length,
      });

      console.log(
        `[ADMIN] Contest export ${format} count=${entries.length} socialOnly=${socialOnly}. Admin: ${adminWallet}`,
      );

      if (format === "json") {
        return new Response(JSON.stringify({ exportedAt: nowIso(), count: entries.length, entries }, null, 2), {
          headers: {
            "Content-Type": "application/json; charset=utf-8",
            "Content-Disposition": `attachment; filename="wco-contest-entries${socialOnly ? "-social" : ""}.json"`,
            "Cache-Control": "no-store",
          },
        });
      }

      const csv = entriesToCsv(entries);
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="wco-contest-entries${socialOnly ? "-social" : ""}.csv"`,
          "Cache-Control": "no-store",
        },
      });
    } catch (err) {
      console.log(`[CONTEST] export error: ${err}`);
      return c.json({ success: false, error: "Failed to export entries" }, 500);
    }
  });

  app.get(`${PREFIX}/admin/contest/audit`, requireAdminSession, async (c) => {
    try {
      const page = sanitizeNumber(c.req.query("page"), 1, 10_000, 1);
      const pageSize = sanitizeNumber(c.req.query("pageSize"), 1, 200, 50);
      const actionFilter = sanitizeString(c.req.query("action") || "", 64);

      let rows: any[] = (await kv.getByPrefix("contest:audit:")) ?? [];
      rows = rows.filter((r) => r && r.at && r.action);
      rows.sort((a, b) => String(b.at).localeCompare(String(a.at)));
      if (actionFilter) {
        rows = rows.filter((r) => r.action === actionFilter);
      }

      const total = rows.length;
      const start = (page - 1) * pageSize;
      const items = rows.slice(start, start + pageSize);

      return c.json({
        success: true,
        data: { items, total, page, pageSize, hasMore: start + pageSize < total },
      });
    } catch (err) {
      console.log(`[CONTEST] audit list error: ${err}`);
      return c.json({ success: false, error: "Failed to load audit log" }, 500);
    }
  });

  app.post(`${PREFIX}/admin/contest/winners`, requireAdminSession, async (c) => {
    try {
      const adminWallet = c.get("adminWallet") as string;
      const body = await c.req.json();

      const mainRaw = Array.isArray(body?.main) ? body.main : [];
      const main = [];
      for (const slot of mainRaw.slice(0, 3)) {
        const accountId = sanitizeString(slot?.accountId, 32);
        if (!isValidHederaAccountId(accountId)) {
          return c.json(
            { success: false, error: `Invalid winner wallet: ${accountId}` },
            400,
          );
        }
        const place = sanitizeNumber(slot?.place, 1, 3, 1) as 1 | 2 | 3;
        const amountUsd = sanitizeNumber(slot?.amountUsd, 1, 10_000, place === 1 ? 150 : place === 2 ? 75 : 25);
        main.push({
          place,
          accountId,
          amountUsd,
          status: (["pending", "claimed", "paid", "forfeited"].includes(slot?.status)
            ? slot.status
            : "pending") as string,
          claimedAt: slot?.claimedAt || undefined,
          paidAt: slot?.paidAt || undefined,
          payoutRef: slot?.payoutRef
            ? sanitizeString(slot.payoutRef, 200)
            : undefined,
        });
      }

      let social = null;
      if (body?.social?.accountId) {
        const sid = sanitizeString(body.social.accountId, 32);
        if (!isValidHederaAccountId(sid)) {
          return c.json({ success: false, error: "Invalid social winner wallet" }, 400);
        }
        social = {
          accountId: sid,
          amountUsd: sanitizeNumber(body.social.amountUsd, 1, 10_000, 100),
          status: (["pending", "claimed", "paid", "forfeited"].includes(body.social.status)
            ? body.social.status
            : "pending") as string,
          claimedAt: body.social.claimedAt || undefined,
          paidAt: body.social.paidAt || undefined,
          payoutRef: body.social.payoutRef
            ? sanitizeString(body.social.payoutRef, 200)
            : undefined,
        };
      }

      const winners = {
        drawnAt: nowIso(),
        drawnBy: adminWallet,
        method: body?.method === "admin_manual" ? "admin_manual" : "external_picker",
        seedNote: body?.seedNote ? sanitizeString(body.seedNote, 500) : undefined,
        main,
        social,
        publicAnnouncement: body?.publicAnnouncement
          ? {
              publishedAt: nowIso(),
              copy: sanitizeString(body.publicAnnouncement.copy || body.publicAnnouncement, 2000),
            }
          : undefined,
      };

      // Never put wallets into publicAnnouncement.copy validation beyond length —
      // admins are responsible for wallet-free copy. Soft-warn in audit if looks like account id.
      if (winners.publicAnnouncement?.copy && /0\.0\.\d{4,}/.test(winners.publicAnnouncement.copy)) {
        await writeAudit(adminWallet, "winner_set", {
          warning: "publicAnnouncement_may_contain_wallet",
        });
      }

      await kv.set(WINNERS_KEY, winners);
      await writeAudit(adminWallet, "winner_set", {
        mainPlaces: main.map((m) => m.place),
        hasSocial: !!social,
        method: winners.method,
        // wallets intentionally omitted from audit detail for log grepping safety in shared logs
        mainCount: main.length,
      });

      console.log(`[ADMIN] Contest winners set (${main.length} main, social=${!!social}). Admin: ${adminWallet}`);
      return c.json({ success: true, data: { winners } });
    } catch (err) {
      console.log(`[CONTEST] winners set error: ${err}`);
      return c.json({ success: false, error: "Failed to set winners" }, 500);
    }
  });

  app.post(`${PREFIX}/admin/contest/winners/status`, requireAdminSession, async (c) => {
    try {
      const adminWallet = c.get("adminWallet") as string;
      const body = await c.req.json();
      const winners: any = await kv.get(WINNERS_KEY);
      if (!winners) {
        return c.json({ success: false, error: "No winners recorded yet" }, 404);
      }

      const lane = sanitizeString(body?.lane, 16); // "main" | "social"
      const status = sanitizeString(body?.status, 32);
      if (!["pending", "claimed", "paid", "forfeited"].includes(status)) {
        return c.json({ success: false, error: "Invalid status" }, 400);
      }

      if (lane === "social" && winners.social) {
        winners.social.status = status;
        if (status === "claimed") winners.social.claimedAt = nowIso();
        if (status === "paid") {
          winners.social.paidAt = nowIso();
          if (body.payoutRef) winners.social.payoutRef = sanitizeString(body.payoutRef, 200);
        }
      } else if (lane === "main") {
        const place = sanitizeNumber(body?.place, 1, 3, 1);
        const slot = (winners.main || []).find((m: any) => m.place === place);
        if (!slot) return c.json({ success: false, error: "Place not found" }, 404);
        slot.status = status;
        if (status === "claimed") slot.claimedAt = nowIso();
        if (status === "paid") {
          slot.paidAt = nowIso();
          if (body.payoutRef) slot.payoutRef = sanitizeString(body.payoutRef, 200);
        }
      } else {
        return c.json({ success: false, error: "Invalid lane" }, 400);
      }

      await kv.set(WINNERS_KEY, winners);
      await writeAudit(adminWallet, "winner_status", { lane, place: body?.place, status });
      return c.json({ success: true, data: { winners } });
    } catch (err) {
      console.log(`[CONTEST] winner status error: ${err}`);
      return c.json({ success: false, error: "Failed to update winner status" }, 500);
    }
  });

  app.post(`${PREFIX}/admin/contest/social/verify`, requireAdminSession, async (c) => {
    try {
      const adminWallet = c.get("adminWallet") as string;
      const body = await c.req.json();
      const accountId = sanitizeString(body?.accountId, 32);
      const url = body?.url ? sanitizeString(body.url, 500) : "";
      if (!isValidHederaAccountId(accountId)) {
        return c.json({ success: false, error: "Invalid account" }, 400);
      }
      const entry: any = await kv.get(`contest:entry:${accountId}`);
      if (!entry) return c.json({ success: false, error: "Entry not found" }, 404);

      const updated = {
        ...entry,
        socialQualified: true,
        socialQualifiedAt: entry.socialQualifiedAt || nowIso(),
        socialPostUrl: url || entry.socialPostUrl,
        socialPlatform: entry.socialPlatform || "x",
      };
      await kv.set(`contest:entry:${accountId}`, updated);
      if (!entry.socialQualified) {
        const socialCount = (Number(await kv.get(SOCIAL_COUNT_KEY)) || 0) + 1;
        await kv.set(SOCIAL_COUNT_KEY, socialCount);
      }
      await writeAudit(adminWallet, "social_qualify", {
        accountId,
        via: "admin_verify",
        hasUrl: !!url,
      });
      return c.json({ success: true, data: { entry: updated } });
    } catch (err) {
      console.log(`[CONTEST] social verify error: ${err}`);
      return c.json({ success: false, error: "Failed to verify social" }, 500);
    }
  });

  app.get(`${PREFIX}/admin/contest/metrics`, requireAdminSession, async (c) => {
    try {
      const cfg = await loadConfig();
      const socialQualifiedCount = Number(await kv.get(SOCIAL_COUNT_KEY)) || 0;
      const dailySeries: Array<{ date: string; count: number }> = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() - i);
        const date = dayKey(d);
        dailySeries.push({
          date,
          count: Number(await kv.get(`contest:day:${date}`)) || 0,
        });
      }
      return c.json({
        success: true,
        data: {
          entryCount: cfg.entryCount,
          entryCap: cfg.entryCap,
          remaining: Math.max(0, cfg.entryCap - cfg.entryCount),
          status: cfg.status,
          startedAt: cfg.startedAt,
          socialQualifiedCount,
          dailySeries,
        },
      });
    } catch (err) {
      console.log(`[CONTEST] metrics error: ${err}`);
      return c.json({ success: false, error: "Failed to load metrics" }, 500);
    }
  });

  console.log("[CONTEST] Routes mounted");
}
