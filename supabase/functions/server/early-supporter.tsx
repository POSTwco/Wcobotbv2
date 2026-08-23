/**
 * Early Supporter NFT Claim — Phase 1 (mock mint, production-safe defaults)
 * ========================================================================
 * Routes:
 *   GET  /nft/early-supporter/status
 *   GET  /nft/early-supporter/eligibility   (X-Wallet-Session)
 *   POST /nft/early-supporter/claim         (X-Wallet-Session)
 *   POST /admin/nft/early-supporter/reset-claim  (admin + EARLY_SUPPORTER_DEBUG)
 *   GET  /admin/nft/early-supporter/inventory    (admin + EARLY_SUPPORTER_DEBUG)
 *
 * Flags (Edge secrets — all default OFF / safe):
 *   EARLY_SUPPORTER_ENABLED=false       — allow claim writes
 *   EARLY_SUPPORTER_MINT_ENABLED=false  — real HTS (stubbed; never on in Phase 1)
 *   EARLY_SUPPORTER_REQUIRE_ACTIVITY=false
 *   EARLY_SUPPORTER_DEBUG=false
 *
 * NO operator private keys in this module.
 */

import type { Context } from "npm:hono";
import type { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";
import { acquireLock } from "./scaling.tsx";
import {
  checkRateLimit,
  isValidHederaAccountId,
  requireAdminSession,
} from "./admin-auth.tsx";

const MAX_SUPPLY = 5_000;
const COUNT_KEY = "nft:early-supporter:count";
const CLAIMED_PREFIX = "nft:early-supporter:claimed:";
const SERIAL_PREFIX = "nft:early-supporter:serial:";

const DEFAULT_TREASURY = "0.0.10821146";

const THUMBNAIL_URL =
  "https://wotsoauebnoyvegcvouo.supabase.co/storage/v1/object/public/NFT's/WCO%20EARLY%20SUPPORTER%20thumbnail.jpg";

const ANIMATION_URL =
  "https://wotsoauebnoyvegcvouo.supabase.co/storage/v1/object/public/NFT's/WCO%20EARLY%20SUPPORTER.mp4";

interface ClaimRecord {
  accountId: string;
  serial: number;
  claimedAt: string;
  mode: "mock" | "hts";
  tokenId: string | null;
  txId: string | null;
  metadata: {
    name: string;
    image: string;
    animation_url: string;
  };
  walletProvider?: string;
}

function envFlag(name: string, defaultValue = false): boolean {
  const v = (Deno.env.get(name) || "").trim().toLowerCase();
  if (!v) return defaultValue;
  return v === "true" || v === "1" || v === "yes";
}

function featureEnabled(): boolean {
  return envFlag("EARLY_SUPPORTER_ENABLED", false);
}

function mintEnabled(): boolean {
  return envFlag("EARLY_SUPPORTER_MINT_ENABLED", false);
}

function requireActivity(): boolean {
  return envFlag("EARLY_SUPPORTER_REQUIRE_ACTIVITY", false);
}

function debugEnabled(): boolean {
  return envFlag("EARLY_SUPPORTER_DEBUG", false);
}

function treasuryId(): string {
  const v = (Deno.env.get("EARLY_SUPPORTER_TREASURY_ACCOUNT_ID") || "").trim();
  if (v && /^0\.0\.\d+$/.test(v)) return v;
  return DEFAULT_TREASURY;
}

function tokenIdEnv(): string | null {
  const v = (Deno.env.get("EARLY_SUPPORTER_NFT_TOKEN_ID") || "").trim();
  if (v && /^0\.0\.\d+$/.test(v)) return v;
  return null;
}

function nowIso(): string {
  return new Date().toISOString();
}

function extractClientIp(c: Context): string {
  const xf = c.req.header("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim().slice(0, 64);
  const real = c.req.header("x-real-ip");
  if (real) return real.slice(0, 64);
  return "unknown";
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

async function getClaimedCount(): Promise<number> {
  const raw = await kv.get(COUNT_KEY);
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

function claimedKey(accountId: string): string {
  return `${CLAIMED_PREFIX}${accountId}`;
}

function buildMetadata() {
  return {
    name: "WCO Early Supporter",
    image: THUMBNAIL_URL,
    animation_url: ANIMATION_URL,
  };
}

function statusPayload(count: number) {
  const remaining = Math.max(0, MAX_SUPPLY - count);
  const enabled = featureEnabled();
  const mint = mintEnabled();
  return {
    enabled,
    mintEnabled: mint,
    mode: !enabled ? ("disabled" as const) : mint ? ("hts" as const) : ("mock" as const),
    claimedCount: count,
    maxSupply: MAX_SUPPLY,
    remaining,
    soldOut: remaining === 0,
    treasuryAccountId: treasuryId(),
    tokenId: tokenIdEnv(),
  };
}

/**
 * PRODUCTION ONLY — currently disabled.
 * Requires EARLY_SUPPORTER_MINT_ENABLED=true, token ID, and an isolated
 * operator/treasury key store. Do NOT put private keys in this Edge function
 * in Phase 1.
 */
async function mintEarlySupporterHts(_accountId: string): Promise<never> {
  throw new Error(
    "HTS mint path not implemented — Phase 2. EARLY_SUPPORTER_MINT_ENABLED must stay false.",
  );
}

async function hasMeaningfulActivity(accountId: string): Promise<boolean> {
  // Soft checks — Cali profile / contest entry markers if present
  try {
    const contest = await kv.get(`contest:entry:${accountId}`);
    if (contest?.accountId === accountId) return true;
  } catch {
    /* ignore */
  }
  try {
    const cali = await kv.get(`cali:profile:${accountId}`);
    if (cali) return true;
  } catch {
    /* ignore */
  }
  // Workout history prefix varies — treat any cali session profile as enough when required
  return false;
}

export function mountEarlySupporterRoutes(app: Hono, PREFIX: string) {
  // ── Public status ──────────────────────────────────────────────────────
  app.get(`${PREFIX}/nft/early-supporter/status`, async (c) => {
    try {
      const rl = await checkRateLimit(
        `es-status:${extractClientIp(c)}`,
        60,
        60_000,
      );
      if (rl.limited) {
        return c.json(
          { success: false, error: "Too many requests", code: "RATE_LIMITED" },
          429,
        );
      }
      const count = await getClaimedCount();
      return c.json({ success: true, data: statusPayload(count) });
    } catch (err) {
      console.log(`[EARLY-SUPPORTER] status error: ${err}`);
      return c.json({ success: false, error: "Failed to load status" }, 500);
    }
  });

  // ── Eligibility ────────────────────────────────────────────────────────
  app.get(`${PREFIX}/nft/early-supporter/eligibility`, async (c) => {
    try {
      const accountId = await getWalletFromSession(c);
      if (!accountId || !isValidHederaAccountId(accountId)) {
        return c.json(
          {
            success: false,
            error: "Wallet session required",
            code: "SESSION_REQUIRED",
          },
          401,
        );
      }

      const rl = await checkRateLimit(`es-elig:${accountId}`, 30, 60_000);
      if (rl.limited) {
        return c.json(
          { success: false, error: "Too many requests", code: "RATE_LIMITED" },
          429,
        );
      }

      const count = await getClaimedCount();
      const remaining = Math.max(0, MAX_SUPPLY - count);
      const existing: ClaimRecord | null =
        (await kv.get(claimedKey(accountId))) || null;

      if (!featureEnabled()) {
        return c.json({
          success: true,
          data: {
            eligible: false,
            reason: "Early Supporter claims are not enabled.",
            code: "FEATURE_DISABLED",
            claimed: !!existing,
            claim: existing,
            claimedCount: count,
            maxSupply: MAX_SUPPLY,
            remaining,
          },
        });
      }

      if (existing) {
        return c.json({
          success: true,
          data: {
            eligible: false,
            reason: "This wallet already claimed an Early Supporter NFT.",
            code: "ALREADY_CLAIMED",
            claimed: true,
            claim: existing,
            claimedCount: count,
            maxSupply: MAX_SUPPLY,
            remaining,
          },
        });
      }

      if (remaining === 0) {
        return c.json({
          success: true,
          data: {
            eligible: false,
            reason: "All 5,000 Early Supporter NFTs have been claimed.",
            code: "SOLD_OUT",
            claimed: false,
            claim: null,
            claimedCount: count,
            maxSupply: MAX_SUPPLY,
            remaining: 0,
          },
        });
      }

      if (requireActivity()) {
        const ok = await hasMeaningfulActivity(accountId);
        if (!ok) {
          return c.json({
            success: true,
            data: {
              eligible: false,
              reason:
                "Complete a calisthenics workout or contest entry first.",
              code: "ACTIVITY_REQUIRED",
              claimed: false,
              claim: null,
              claimedCount: count,
              maxSupply: MAX_SUPPLY,
              remaining,
            },
          });
        }
      }

      return c.json({
        success: true,
        data: {
          eligible: true,
          reason: null,
          code: "OK",
          claimed: false,
          claim: null,
          claimedCount: count,
          maxSupply: MAX_SUPPLY,
          remaining,
        },
      });
    } catch (err) {
      console.log(`[EARLY-SUPPORTER] eligibility error: ${err}`);
      return c.json({ success: false, error: "Failed to check eligibility" }, 500);
    }
  });

  // ── Claim ──────────────────────────────────────────────────────────────
  app.post(`${PREFIX}/nft/early-supporter/claim`, async (c) => {
    try {
      if (!featureEnabled()) {
        return c.json(
          {
            success: false,
            error: "Early Supporter claims are not enabled.",
            code: "FEATURE_DISABLED",
          },
          403,
        );
      }

      const accountId = await getWalletFromSession(c);
      if (!accountId || !isValidHederaAccountId(accountId)) {
        return c.json(
          {
            success: false,
            error: "Wallet session required. Connect your wallet and try again.",
            code: "SESSION_REQUIRED",
          },
          401,
        );
      }

      const ipRl = await checkRateLimit(
        `es-claim-ip:${extractClientIp(c)}`,
        20,
        60_000,
      );
      if (ipRl.limited) {
        return c.json(
          { success: false, error: "Too many requests", code: "RATE_LIMITED" },
          429,
        );
      }
      const wlRl = await checkRateLimit(`es-claim:${accountId}`, 5, 60_000);
      if (wlRl.limited) {
        return c.json(
          {
            success: false,
            error: "Too many claim attempts. Please wait.",
            code: "RATE_LIMITED",
          },
          429,
        );
      }

      if (requireActivity()) {
        const ok = await hasMeaningfulActivity(accountId);
        if (!ok) {
          return c.json(
            {
              success: false,
              error:
                "Complete a calisthenics workout or contest entry first.",
              code: "ACTIVITY_REQUIRED",
            },
            403,
          );
        }
      }

      const release = await acquireLock(`es-claim:${accountId}`);
      try {
        const existing: ClaimRecord | null =
          (await kv.get(claimedKey(accountId))) || null;
        if (existing) {
          return c.json(
            {
              success: false,
              error: "This wallet already claimed an Early Supporter NFT.",
              code: "ALREADY_CLAIMED",
              data: { claim: existing },
            },
            409,
          );
        }

        const count = await getClaimedCount();
        if (count >= MAX_SUPPLY) {
          return c.json(
            {
              success: false,
              error: "All 5,000 Early Supporter NFTs have been claimed.",
              code: "SOLD_OUT",
            },
            409,
          );
        }

        // Real HTS path — stubbed. Stay on mock unless Phase 2 implements mint.
        if (mintEnabled()) {
          try {
            await mintEarlySupporterHts(accountId);
          } catch (e) {
            console.log(`[EARLY-SUPPORTER] HTS stub rejected: ${e}`);
            return c.json(
              {
                success: false,
                error:
                  "On-chain minting is not available yet. Mint flag is on but HTS path is unimplemented.",
                code: "MINT_NOT_IMPLEMENTED",
              },
              501,
            );
          }
        }

        const serial = count + 1;
        const claim: ClaimRecord = {
          accountId,
          serial,
          claimedAt: nowIso(),
          mode: "mock",
          tokenId: tokenIdEnv(),
          txId: null,
          metadata: buildMetadata(),
        };

        // Write claim marker first, then counter + serial index
        await kv.set(claimedKey(accountId), claim);
        // Re-read to detect rare race (another isolate wrote first)
        const verify: ClaimRecord | null =
          (await kv.get(claimedKey(accountId))) || null;
        if (verify && verify.serial !== serial) {
          return c.json(
            {
              success: false,
              error: "This wallet already claimed an Early Supporter NFT.",
              code: "ALREADY_CLAIMED",
              data: { claim: verify },
            },
            409,
          );
        }

        await kv.mset(
          [COUNT_KEY, `${SERIAL_PREFIX}${serial}`],
          [serial, { accountId, claimedAt: claim.claimedAt }],
        );

        console.log(
          `[EARLY-SUPPORTER] claim ok account=${accountId} serial=${serial} mode=mock`,
        );

        return c.json({
          success: true,
          data: {
            claim,
            claimedCount: serial,
            remaining: Math.max(0, MAX_SUPPLY - serial),
          },
        });
      } finally {
        release();
      }
    } catch (err) {
      console.log(`[EARLY-SUPPORTER] claim error: ${err}`);
      return c.json({ success: false, error: "Failed to process claim" }, 500);
    }
  });

  // ── Admin debug: reset one claim ───────────────────────────────────────
  app.post(
    `${PREFIX}/admin/nft/early-supporter/reset-claim`,
    requireAdminSession,
    async (c) => {
      try {
        if (!debugEnabled()) {
          return c.json(
            {
              success: false,
              error: "Debug endpoints disabled (EARLY_SUPPORTER_DEBUG)",
              code: "DEBUG_DISABLED",
            },
            403,
          );
        }
        const body = await c.req.json().catch(() => ({}));
        const accountId = String(body?.accountId || "").trim();
        if (!isValidHederaAccountId(accountId)) {
          return c.json(
            { success: false, error: "Invalid accountId", code: "BAD_REQUEST" },
            400,
          );
        }
        const existing: ClaimRecord | null =
          (await kv.get(claimedKey(accountId))) || null;
        if (!existing) {
          return c.json({
            success: true,
            data: { reset: false, reason: "No claim found" },
          });
        }
        await kv.del(claimedKey(accountId));
        if (existing.serial) {
          try {
            await kv.del(`${SERIAL_PREFIX}${existing.serial}`);
          } catch {
            /* ignore */
          }
        }
        const count = await getClaimedCount();
        await kv.set(COUNT_KEY, Math.max(0, count - 1));
        return c.json({
          success: true,
          data: { reset: true, accountId, serial: existing.serial },
        });
      } catch (err) {
        console.log(`[EARLY-SUPPORTER] reset error: ${err}`);
        return c.json({ success: false, error: "Reset failed" }, 500);
      }
    },
  );

  // ── Admin debug: inventory ─────────────────────────────────────────────
  app.get(
    `${PREFIX}/admin/nft/early-supporter/inventory`,
    requireAdminSession,
    async (c) => {
      try {
        if (!debugEnabled()) {
          return c.json(
            {
              success: false,
              error: "Debug endpoints disabled (EARLY_SUPPORTER_DEBUG)",
              code: "DEBUG_DISABLED",
            },
            403,
          );
        }
        const count = await getClaimedCount();
        const claims = await kv.getByPrefix(CLAIMED_PREFIX);
        return c.json({
          success: true,
          data: {
            claimedCount: count,
            maxSupply: MAX_SUPPLY,
            claimRecords: Array.isArray(claims) ? claims.slice(0, 100) : [],
            flags: {
              enabled: featureEnabled(),
              mintEnabled: mintEnabled(),
              requireActivity: requireActivity(),
            },
          },
        });
      } catch (err) {
        console.log(`[EARLY-SUPPORTER] inventory error: ${err}`);
        return c.json({ success: false, error: "Inventory failed" }, 500);
      }
    },
  );
}
