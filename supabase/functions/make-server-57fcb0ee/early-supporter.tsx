/**
 * Early Supporter NFT Claim — production hardening
 * ================================================
 * Routes:
 *   GET  /nft/early-supporter/status
 *   GET  /nft/early-supporter/eligibility   (X-Wallet-Session)
 *   POST /nft/early-supporter/claim         (X-Wallet-Session)
 *   POST /admin/nft/early-supporter/reset-claim  (admin + DEBUG; blocked when HTS live)
 *   GET  /admin/nft/early-supporter/inventory    (admin + DEBUG)
 *
 * Flags (Edge secrets):
 *   EARLY_SUPPORTER_ENABLED            — master gate (default false)
 *   EARLY_SUPPORTER_MINT_ENABLED       — real treasury→wallet transfer (default false)
 *   EARLY_SUPPORTER_ALLOW_MOCK         — KV-only mock claims (default false; keep off in prod)
 *   EARLY_SUPPORTER_ALLOW_KV_RESET     — allow admin KV reset while HTS live (default false)
 *   EARLY_SUPPORTER_REQUIRE_ACTIVITY   — optional activity gate (default false)
 *   EARLY_SUPPORTER_DEBUG              — admin inventory/reset (default false; off in prod)
 *
 * Secrets (never VITE_ / never commit):
 *   EARLY_SUPPORTER_TREASURY_PRIVATE_KEY  — preferred
 *   HEDERA_OPERATOR_KEY                   — fallback only if pubkey matches treasury
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
const NEXT_SERIAL_KEY = "nft:early-supporter:next-serial";

const DEFAULT_TREASURY = "0.0.10821146";
const DEFAULT_TOKEN_ID = "0.0.10821256";
const MIRROR_MAINNET = "https://mainnet.mirrornode.hedera.com";
const MIRROR_TESTNET = "https://testnet.mirrornode.hedera.com";

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

/** Explicit opt-in — mock claims must never run on live mainnet by accident. */
function allowMockClaims(): boolean {
  return envFlag("EARLY_SUPPORTER_ALLOW_MOCK", false);
}

function allowKvResetWhileLive(): boolean {
  return envFlag("EARLY_SUPPORTER_ALLOW_KV_RESET", false);
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
  // Mainnet collection created 2026-08-23 — safe public default
  return DEFAULT_TOKEN_ID;
}

function treasuryKeyEnv(): { key: string; source: "dedicated" | "operator_fallback" } | null {
  const dedicated = (Deno.env.get("EARLY_SUPPORTER_TREASURY_PRIVATE_KEY") || "").trim();
  if (dedicated) return { key: dedicated, source: "dedicated" };
  const fallback = (Deno.env.get("HEDERA_OPERATOR_KEY") || "").trim();
  if (fallback) return { key: fallback, source: "operator_fallback" };
  return null;
}

function hederaNetwork(): "mainnet" | "testnet" {
  const v = (Deno.env.get("HEDERA_NETWORK") || Deno.env.get("EARLY_SUPPORTER_NETWORK") || "mainnet")
    .trim()
    .toLowerCase();
  return v === "testnet" ? "testnet" : "mainnet";
}

function mirrorBase(): string {
  return hederaNetwork() === "testnet" ? MIRROR_TESTNET : MIRROR_MAINNET;
}

/** Lazy-load Hedera SDK (same pattern as magic-accounts). */
async function loadHederaSdk() {
  try {
    return await import("https://esm.sh/@hashgraph/sdk@2.80.0");
  } catch (esmErr) {
    console.log(`[EARLY-SUPPORTER] esm.sh SDK load failed, npm fallback: ${esmErr}`);
    return await import("npm:@hashgraph/sdk@2.80.0");
  }
}

function parseTreasuryPrivateKey(PrivateKey: any, keyStr: string) {
  const cleaned = keyStr.trim();
  const no0x = cleaned.replace(/^0x/i, "");
  const attempts = [
    () => PrivateKey.fromStringECDSA(no0x),
    () => PrivateKey.fromStringECDSA(cleaned),
    () => PrivateKey.fromStringED25519(no0x),
    () => PrivateKey.fromStringED25519(cleaned),
    () => PrivateKey.fromStringDer(no0x),
    () => PrivateKey.fromStringDer(cleaned),
    () => PrivateKey.fromString(no0x),
    () => PrivateKey.fromString(cleaned),
  ];
  let lastErr: unknown;
  for (const attempt of attempts) {
    try {
      return attempt();
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(
    `Treasury key parse failed: ${String((lastErr as Error)?.message || lastErr).slice(0, 80)}`,
  );
}

async function mirrorNftAccount(
  tokenId: string,
  serial: number,
): Promise<string | null> {
  try {
    const res = await fetch(
      `${mirrorBase()}/api/v1/tokens/${tokenId}/nfts/${serial}`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.account_id === "string" ? data.account_id : null;
  } catch {
    return null;
  }
}

async function mirrorTokenSupply(tokenId: string): Promise<number> {
  try {
    const res = await fetch(`${mirrorBase()}/api/v1/tokens/${tokenId}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return 0;
    const data = await res.json();
    const n = Number(data?.total_supply ?? 0);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

/** True if account already holds ≥1 Early Supporter NFT on-chain. */
async function accountOwnsEarlySupporter(accountId: string): Promise<boolean> {
  const tokenId = tokenIdEnv();
  if (!tokenId) return false;
  try {
    const res = await fetch(
      `${mirrorBase()}/api/v1/accounts/${accountId}/nfts?token.id=${tokenId}&limit=1`,
      { headers: { Accept: "application/json" } },
    );
    if (!res.ok) return false;
    const data = await res.json();
    return Array.isArray(data?.nfts) && data.nfts.length > 0;
  } catch {
    return false;
  }
}

async function mirrorAccountKeyHex(accountId: string): Promise<string | null> {
  try {
    const res = await fetch(`${mirrorBase()}/api/v1/accounts/${accountId}`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const k = data?.key?.key;
    return typeof k === "string" ? k.toLowerCase() : null;
  } catch {
    return null;
  }
}

/**
 * Transfer one Early Supporter serial from treasury → claimant.
 * Requires EARLY_SUPPORTER_TREASURY_PRIVATE_KEY (preferred).
 * Claimant must be associated with the token (or have auto-associations).
 */
async function transferEarlySupporterNft(
  toAccountId: string,
  serial: number,
): Promise<{ txId: string }> {
  const tokenId = tokenIdEnv();
  if (!tokenId) throw new Error("EARLY_SUPPORTER_NFT_TOKEN_ID not configured");
  const treasury = treasuryId();
  const keyInfo = treasuryKeyEnv();
  if (!keyInfo) {
    throw new Error(
      "Missing EARLY_SUPPORTER_TREASURY_PRIVATE_KEY Edge secret",
    );
  }

  if (!isValidHederaAccountId(toAccountId) || toAccountId === treasury) {
    throw new Error("Invalid claim recipient");
  }

  const owner = await mirrorNftAccount(tokenId, serial);
  if (owner !== treasury) {
    throw new Error(
      `Serial ${serial} not held by treasury (owner=${owner || "unknown"})`,
    );
  }

  const sdk = await loadHederaSdk();
  const {
    Client,
    AccountId,
    PrivateKey,
    TokenId,
    TransferTransaction,
    Hbar,
  } = sdk;

  const network = hederaNetwork();
  const client = network === "testnet" ? Client.forTestnet() : Client.forMainnet();
  const treasuryIdObj = AccountId.fromString(treasury);
  const treasuryKey = parseTreasuryPrivateKey(PrivateKey, keyInfo.key);

  // Refuse wrong key (e.g. Magic operator key that is not the NFT treasury)
  const mirrorPub = await mirrorAccountKeyHex(treasury);
  if (mirrorPub) {
    const derived = treasuryKey.publicKey.toStringRaw().toLowerCase();
    const der = treasuryKey.publicKey.toStringDer().toLowerCase();
    const matches =
      derived === mirrorPub ||
      der.includes(mirrorPub) ||
      treasuryKey.publicKey.toString().toLowerCase().includes(mirrorPub);
    if (!matches) {
      console.log(
        `[EARLY-SUPPORTER] REFUSED transfer: treasury key pubkey does not match Mirror for ${treasury} (source=${keyInfo.source})`,
      );
      throw new Error("Treasury signing key mismatch — transfer aborted");
    }
  }
  if (keyInfo.source === "operator_fallback") {
    console.log(
      "[EARLY-SUPPORTER] Using HEDERA_OPERATOR_KEY fallback (pubkey matched treasury)",
    );
  }

  client.setOperator(treasuryIdObj, treasuryKey);

  try {
    const tx = await new TransferTransaction()
      .addNftTransfer(
        TokenId.fromString(tokenId),
        serial,
        treasuryIdObj,
        AccountId.fromString(toAccountId),
      )
      .setMaxTransactionFee(new Hbar(5))
      .freezeWith(client);

    const signed = await tx.sign(treasuryKey);
    const submitted = await signed.execute(client);
    const rx = await submitted.getReceipt(client);
    const statusName = String(rx.status?.toString?.() || rx.status || "");
    if (!/SUCCESS/i.test(statusName)) {
      throw new Error(`Transfer failed: ${statusName}`);
    }
    const txId = submitted.transactionId?.toString?.() || "";

    // Confirm recipient holds the serial (best-effort; Mirror can lag briefly)
    for (let i = 0; i < 4; i++) {
      await new Promise((r) => setTimeout(r, 400 + i * 200));
      const newOwner = await mirrorNftAccount(tokenId, serial);
      if (newOwner === toAccountId) break;
      if (i === 3 && newOwner && newOwner !== toAccountId) {
        throw new Error(
          `Post-transfer ownership mismatch (expected ${toAccountId}, got ${newOwner})`,
        );
      }
    }

    return { txId };
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (/TOKEN_NOT_ASSOCIATED|NOT_ASSOCIATED/i.test(msg)) {
      const e = new Error(
        `Wallet must associate token ${tokenId} in HashPack (or enable auto-associations) before claiming.`,
      );
      (e as any).code = "ASSOCIATION_REQUIRED";
      (e as any).tokenId = tokenId;
      throw e;
    }
    // Never echo raw SDK/key material to clients
    if (/key|private|secret|sign/i.test(msg) && !/ASSOCIATION/i.test(msg)) {
      throw new Error("On-chain transfer failed");
    }
    throw err;
  } finally {
    try {
      client.close();
    } catch {
      /* ignore */
    }
  }
}

async function allocateNextSerial(mintedSupply: number): Promise<number | null> {
  const treasury = treasuryId();
  const tokenId = tokenIdEnv();
  if (!tokenId || mintedSupply < 1) return null;

  let cursor = Number(await kv.get(NEXT_SERIAL_KEY)) || 1;
  if (cursor < 1) cursor = 1;

  for (let serial = cursor; serial <= mintedSupply; serial++) {
    const owner = await mirrorNftAccount(tokenId, serial);
    if (owner === treasury) {
      await kv.set(NEXT_SERIAL_KEY, serial + 1);
      return serial;
    }
  }
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

      // On-chain ownership is a second independent one-per-wallet layer
      if (mintEnabled() && (await accountOwnsEarlySupporter(accountId))) {
        return c.json({
          success: true,
          data: {
            eligible: false,
            reason: "This wallet already holds an Early Supporter NFT on-chain.",
            code: "ALREADY_CLAIMED",
            claimed: true,
            claim: null,
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

      // Per-wallet lock + global serial lock (prevents double-allocate races)
      const releaseWallet = await acquireLock(`es-claim:${accountId}`);
      const releaseGlobal = await acquireLock("es-claim-serial-global");
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

        if (mintEnabled() && (await accountOwnsEarlySupporter(accountId))) {
          return c.json(
            {
              success: false,
              error: "This wallet already holds an Early Supporter NFT on-chain.",
              code: "ALREADY_CLAIMED",
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

        const useHts = mintEnabled();
        let serial: number;
        let txId: string | null = null;
        let mode: "mock" | "hts" = "mock";

        if (useHts) {
          const tokenId = tokenIdEnv();
          if (!tokenId || !treasuryKeyEnv()) {
            return c.json(
              {
                success: false,
                error:
                  "On-chain delivery is enabled but token/treasury key secrets are not configured.",
                code: "MINT_CONFIG_MISSING",
              },
              503,
            );
          }

          const mintedSupply = await mirrorTokenSupply(tokenId);
          if (mintedSupply < 1) {
            return c.json(
              {
                success: false,
                error: "No Early Supporter NFTs have been minted yet.",
                code: "SOLD_OUT",
              },
              409,
            );
          }
          if (count >= mintedSupply) {
            return c.json(
              {
                success: false,
                error:
                  "All currently minted Early Supporter NFTs have been claimed. More will be minted soon.",
                code: "SOLD_OUT",
              },
              409,
            );
          }

          const allocated = await allocateNextSerial(mintedSupply);
          if (!allocated) {
            return c.json(
              {
                success: false,
                error: "No transferable Early Supporter NFTs left in treasury.",
                code: "SOLD_OUT",
              },
              409,
            );
          }
          serial = allocated;

          try {
            const result = await transferEarlySupporterNft(accountId, serial);
            txId = result.txId;
            mode = "hts";
          } catch (e: any) {
            // Roll next-serial back so the serial can be retried
            try {
              await kv.set(NEXT_SERIAL_KEY, serial);
            } catch {
              /* ignore */
            }
            const code = e?.code || "TRANSFER_FAILED";
            console.log(`[EARLY-SUPPORTER] transfer failed code=${code}`);
            return c.json(
              {
                success: false,
                error:
                  code === "ASSOCIATION_REQUIRED"
                    ? e?.message || "Token association required"
                    : "NFT transfer failed. Please try again.",
                code,
                data: code === "ASSOCIATION_REQUIRED" ? { tokenId } : undefined,
              },
              code === "ASSOCIATION_REQUIRED" ? 409 : 502,
            );
          }
        } else if (allowMockClaims()) {
          // Explicit opt-in only — never default on mainnet
          serial = count + 1;
          mode = "mock";
        } else {
          return c.json(
            {
              success: false,
              error:
                "On-chain delivery is not enabled. Set EARLY_SUPPORTER_MINT_ENABLED=true (mock claims require EARLY_SUPPORTER_ALLOW_MOCK).",
              code: "MINT_DISABLED",
            },
            403,
          );
        }

        const claim: ClaimRecord = {
          accountId,
          serial,
          claimedAt: nowIso(),
          mode,
          tokenId: tokenIdEnv(),
          txId,
          metadata: buildMetadata(),
        };

        await kv.set(claimedKey(accountId), claim);
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

        const newCount = count + 1;
        await kv.mset(
          [COUNT_KEY, `${SERIAL_PREFIX}${serial}`],
          [newCount, { accountId, claimedAt: claim.claimedAt, txId, mode }],
        );

        console.log(
          `[EARLY-SUPPORTER] claim ok account=${accountId} serial=${serial} mode=${mode} tx=${txId || "none"}`,
        );

        return c.json({
          success: true,
          data: {
            claim,
            claimedCount: newCount,
            remaining: Math.max(0, MAX_SUPPLY - newCount),
          },
        });
      } finally {
        try {
          releaseGlobal();
        } catch {
          /* ignore */
        }
        try {
          releaseWallet();
        } catch {
          /* ignore */
        }
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
        // KV reset while HTS is live enables double-claim (NFT stays in wallet).
        if (mintEnabled() && !allowKvResetWhileLive()) {
          return c.json(
            {
              success: false,
              error:
                "KV claim reset blocked while on-chain delivery is live. Set EARLY_SUPPORTER_ALLOW_KV_RESET=true only if you accept double-claim risk.",
              code: "RESET_BLOCKED_LIVE",
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
        console.log(
          `[EARLY-SUPPORTER] admin KV reset account=${accountId} serial=${existing.serial}`,
        );
        return c.json({
          success: true,
          data: {
            reset: true,
            accountId,
            serial: existing.serial,
            warning:
              "KV only — does not reclaim on-chain NFT. Wallet may still hold the serial.",
          },
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
