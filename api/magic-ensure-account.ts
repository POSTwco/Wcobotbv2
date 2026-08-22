/**
 * Vercel Node serverless — Magic Hedera AccountCreate
 * ====================================================
 * POST /api/magic-ensure-account
 * Body: { didToken: string, publicKeyDer: string }
 *
 * Server env on Vercel (Production, NO VITE_ prefix):
 *   MAGIC_SECRET_KEY          — sk_live from SAME Magic app as VITE_MAGIC_PUBLISHABLE_KEY
 *   MAGIC_CLIENT_ID           — optional; Hedera app Client ID (e.g. bJlBCakg…) for aud checks
 *   MAGIC_ACCOUNT_CREATE_ENABLED=true
 *   HEDERA_OPERATOR_ID / HEDERA_OPERATOR_KEY / HEDERA_NETWORK
 *   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY
 *
 * Hedera Mainnet Magic app (canonical for wcorg.io):
 *   pk_live_B25ED40A258321DC
 *   Client ID: bJlBCakg7wjIBuWLer0g4F8I3tw
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  Client,
  AccountId,
  PrivateKey,
  PublicKey,
  AccountCreateTransaction,
  AccountBalanceQuery,
  Hbar,
} from "@hashgraph/sdk";
import { createClient } from "@supabase/supabase-js";
import { Magic } from "@magic-sdk/admin";
import { applyCors, clientIp, rateLimit, safeClientError } from "./lib/magic-security";

const KV_TABLE = "kv_store_f75faf6c";
const DEFAULT_SUPABASE_URL = "https://wotsoauebnoyvegcvouo.supabase.co";

/** Strip accidental quotes/whitespace from Vercel dashboard pastes */
function env(name: string): string {
  return (process.env[name] || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();
}

function hederaNetwork(): "mainnet" | "testnet" {
  // Network label may use VITE_ on the client; operator secrets must NEVER use VITE_
  const n = (env("HEDERA_NETWORK") || env("VITE_HEDERA_NETWORK")).toLowerCase();
  return n === "testnet" ? "testnet" : "mainnet";
}

const ACCOUNT_ID_RE = /^0\.0\.\d+$/;

/** Server-only operator credentials — never fall back to VITE_* (those bake into the SPA). */
function operatorId(): string {
  return env("HEDERA_OPERATOR_ID");
}

function operatorKeyRaw(): string {
  if (env("VITE_HEDERA_OPERATOR_KEY") || env("VITE_HEDERA_OPERATOR_ID")) {
    console.error(
      "[MAGIC-VERCEL] VITE_HEDERA_OPERATOR_* is set — DELETE it from Vercel immediately (private key risk in browser builds).",
    );
  }
  return env("HEDERA_OPERATOR_KEY");
}

function magicEnabled(): boolean {
  return env("MAGIC_ACCOUNT_CREATE_ENABLED").toLowerCase() === "true" && !!env("MAGIC_SECRET_KEY");
}

function resolveSupabaseUrl(): string {
  const raw =
    env("SUPABASE_URL") ||
    env("NEXT_PUBLIC_SUPABASE_URL") ||
    DEFAULT_SUPABASE_URL;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") {
      throw new Error("not http(s)");
    }
    return u.origin;
  } catch {
    throw new Error(
      `Invalid SUPABASE_URL on Vercel ("${raw.slice(0, 40)}"). Set SUPABASE_URL=https://wotsoauebnoyvegcvouo.supabase.co`,
    );
  }
}



function kvClient() {
  const url = resolveSupabaseUrl();
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured on Vercel (server env, not VITE_)");
  }
  return createClient(url, key);
}

async function kvGet(key: string): Promise<any> {
  const supabase = kvClient();
  const { data, error } = await supabase.from(KV_TABLE).select("value").eq("key", key).maybeSingle();
  if (error) throw new Error(`KV get failed: ${error.message}`);
  return data?.value;
}

async function kvMset(keys: string[], values: any[]): Promise<void> {
  const supabase = kvClient();
  const { error } = await supabase.from(KV_TABLE).upsert(
    keys.map((k, i) => ({ key: k, value: values[i] })),
  );
  if (error) throw new Error(`KV write failed: ${error.message}`);
}

/**
 * Magic DID tokens are base64(JSON.stringify([proof, claim])), NOT JWTs.
 * Claim includes `iss` (did:ethr:0x…) and `aud` (Magic Client ID).
 */
function decodeMagicDidClaim(didToken: string): { iss?: string; aud?: string } | null {
  const raw = didToken.trim().replace(/^["']|["']$/g, "");
  if (!raw) return null;

  const fromObj = (claim: any) => {
    if (!claim || typeof claim !== "object") return null;
    const iss = typeof claim.iss === "string" ? claim.iss : undefined;
    const aud = typeof claim.aud === "string" ? claim.aud : undefined;
    if (!iss && !aud) return null;
    return { iss, aud };
  };

  // Primary Magic format: btoa(JSON.stringify([proof, claim]))
  try {
    const padded = raw.replace(/-/g, "+").replace(/_/g, "/");
    const json = Buffer.from(padded, "base64").toString("utf8");
    const tuple = JSON.parse(json);
    if (Array.isArray(tuple) && tuple.length >= 2) {
      const claim = typeof tuple[1] === "string" ? JSON.parse(tuple[1]) : tuple[1];
      const out = fromObj(claim);
      if (out) return out;
    }
  } catch {
    /* try JWT-ish fallback */
  }

  try {
    const parts = raw.split(".");
    if (parts.length >= 2) {
      const payload = JSON.parse(
        Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
      );
      return fromObj(payload);
    }
  } catch {
    /* ignore */
  }
  return null;
}

function decodeMagicDidIssuer(didToken: string): string | null {
  return decodeMagicDidClaim(didToken)?.iss || null;
}

/**
 * Validate Magic DID.
 * Primary: @magic-sdk/admin local crypto validate (no Admin REST dependency).
 * Fallback: Admin REST user/get + token/validate.
 */
async function validateMagicDidToken(
  didToken: string,
): Promise<{ issuer: string } | { error: string; code: string }> {
  const secret = env("MAGIC_SECRET_KEY");
  if (!secret) {
    return {
      error:
        "MAGIC_SECRET_KEY missing on Vercel. Copy sk_live from Hedera Mainnet Magic app (pk_live_B25ED… / Client ID bJlBCakg…).",
      code: "MAGIC_SECRET_MISSING",
    };
  }
  if (!didToken || didToken.length < 20) {
    return { error: "Magic DID token missing or too short.", code: "MAGIC_DID_MISSING" };
  }

  const claim = decodeMagicDidClaim(didToken);
  const expectedClientId = env("MAGIC_CLIENT_ID") || "bJlBCakg7wjIBuWLer0g4F8I3tw";

  // 1) Local Admin SDK validation (signature + expiry + audience)
  try {
    const magic = await Magic.init(secret);
    if (magic.clientId && claim?.aud && magic.clientId !== claim.aud) {
      return {
        error:
          `MAGIC_SECRET_KEY belongs to Client ID ${magic.clientId}, but this login DID is for ${claim.aud}. ` +
          `Use the sk_live from the Hedera Mainnet app (Client ID ${expectedClientId}, pk_live_B25ED…).`,
        code: "MAGIC_SECRET_MISMATCH",
      };
    }
    // If init did not populate clientId, set expected so aud check still runs
    if (!magic.clientId && expectedClientId) {
      magic.clientId = expectedClientId;
    }
    magic.token.validate(didToken);
    const issuer = magic.token.getIssuer(didToken);
    if (issuer) {
      console.log(`[MAGIC-VERCEL] DID ok via Admin SDK issuer=${issuer.slice(0, 24)}…`);
      return { issuer };
    }
  } catch (sdkErr: any) {
    const msg = String(sdkErr?.message || sdkErr);
    console.error("[MAGIC-VERCEL] Admin SDK validate failed:", msg.slice(0, 240));
    // Audience / key mismatch — fail fast with clear guidance
    if (/audience|client.?id|api.?key|secret|incorrect signer|malformed/i.test(msg)) {
      return {
        error:
          `Magic DID validate failed: ${msg.slice(0, 140)}. ` +
          `Confirm Vercel MAGIC_SECRET_KEY is sk_live from Hedera app Client ID ${expectedClientId} (pk_live_B25ED…), then Redeploy.`,
        code: "MAGIC_SECRET_MISMATCH",
      };
    }
    // Expired etc. — still try REST below for older tokens / edge cases
  }

  // 2) Admin REST fallbacks
  try {
    const userRes = await fetch("https://api.magic.link/v1/admin/auth/user/get", {
      method: "GET",
      headers: {
        "X-Magic-Secret-Key": secret,
        Authorization: `Bearer ${didToken}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(12_000),
    });

    if (userRes.ok) {
      const data = await userRes.json();
      const issuer = data?.data?.issuer || data?.issuer;
      if (issuer && typeof issuer === "string") return { issuer };
    } else {
      console.error(`[MAGIC-VERCEL] user/get failed: ${userRes.status}`);
    }

    const validateRes = await fetch("https://api.magic.link/v2/admin/auth/token/validate", {
      method: "POST",
      headers: {
        "X-Magic-Secret-Key": secret,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ did_token: didToken }),
      signal: AbortSignal.timeout(12_000),
    });

    if (validateRes.ok) {
      const v = await validateRes.json();
      const issuer = v?.data?.issuer || v?.issuer || claim?.iss;
      if (issuer && typeof issuer === "string") return { issuer };
    } else {
      const bodyText = await validateRes.text().catch(() => "");
      console.error(`[MAGIC-VERCEL] token/validate failed: ${validateRes.status} ${bodyText.slice(0, 200)}`);
    }
  } catch (err) {
    console.error("[MAGIC-VERCEL] REST DID validation error:", err);
  }

  if (claim?.iss) {
    const audHint = claim.aud
      ? ` DID aud=${claim.aud} (expect ${expectedClientId}).`
      : "";
    return {
      error:
        `Magic DID could not be verified with MAGIC_SECRET_KEY.${audHint} ` +
        `Re-copy sk_live from the Hedera Mainnet Magic app (pk_live_B25ED…), set on Vercel + Supabase, Redeploy Production, hard-refresh.`,
      code: "MAGIC_AUTH_FAILED",
    };
  }

  return {
    error: "Invalid or expired Magic session. Please sign in again.",
    code: "MAGIC_AUTH_FAILED",
  };
}

function parseOperatorKey(raw: string): PrivateKey {
  const key = raw.trim().replace(/^["']|["']$/g, "").trim();
  if (!key) {
    throw new Error("HEDERA_OPERATOR_KEY is empty on Vercel");
  }
  // Never accept Magic secrets here (common paste mistake)
  if (/^sk_(live|test)_/i.test(key) || /^pk_(live|test)_/i.test(key)) {
    throw new Error(
      "HEDERA_OPERATOR_KEY looks like a Magic API key. Paste the Hedera account private key (hex/DER/ECDSA), not sk_live/pk_live.",
    );
  }

  const cleaned = key
    .replace(/-----BEGIN[^-]+-----/g, "")
    .replace(/-----END[^-]+-----/g, "")
    .replace(/\s+/g, "");
  const no0x = cleaned.replace(/^0x/i, "");

  const attempts: Array<() => PrivateKey> = [
    () => PrivateKey.fromStringECDSA(no0x),
    () => PrivateKey.fromStringECDSA(cleaned),
    () => PrivateKey.fromStringED25519(no0x),
    () => PrivateKey.fromStringED25519(cleaned),
    () => PrivateKey.fromStringDer(no0x),
    () => PrivateKey.fromStringDer(cleaned),
    () => PrivateKey.fromString(no0x),
    () => PrivateKey.fromString(cleaned),
    () => PrivateKey.fromString(key),
  ];

  let lastErr: unknown;
  for (const attempt of attempts) {
    try {
      return attempt();
    } catch (e) {
      lastErr = e;
    }
  }

  console.error(
    "[MAGIC-VERCEL] operator key parse failed",
    String((lastErr as Error)?.message || lastErr).slice(0, 120),
  );
  throw new Error(
    "Could not parse HEDERA_OPERATOR_KEY — use the Hedera ECDSA/DER private key for HEDERA_OPERATOR_ID (env name must NOT use VITE_).",
  );
}

function parseUserPublicKey(publicKeyDer: string): PublicKey {
  const raw = publicKeyDer.trim().replace(/^0x/i, "");
  try {
    return PublicKey.fromStringECDSA(raw);
  } catch {
    return PublicKey.fromString(raw);
  }
}

async function createHederaAccount(publicKeyDer: string): Promise<string> {
  const opId = operatorId();
  const opKey = operatorKeyRaw();
  if (!opId || !opKey) {
    throw new Error(
      "Operator missing on Vercel. Set HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY (never VITE_ prefix).",
    );
  }

  // Catch swapped ID/KEY early — AccountId must be shard.realm.num (e.g. 0.0.1234567)
  if (!/^0\.0\.\d+$/.test(opId)) {
    const looksLikeHexKey = /^[0-9a-fA-F]{64}$/.test(opId) || /^0x[0-9a-fA-F]{64}$/i.test(opId);
    throw new Error(
      looksLikeHexKey
        ? `HEDERA_OPERATOR_ID is a hex private key, not an account id. Set HEDERA_OPERATOR_ID=0.0.YOUR_ACCOUNT (e.g. 0.0.1234567) and put the hex in HEDERA_OPERATOR_KEY. Received id len=${opId.length}.`
        : `HEDERA_OPERATOR_ID must look like 0.0.1234567 — got "${opId.slice(0, 48)}${opId.length > 48 ? "…" : ""}". Check you did not swap ID and KEY.`,
    );
  }

  const userKey = parseUserPublicKey(publicKeyDer);
  const operatorKey = parseOperatorKey(opKey);
  const network = hederaNetwork();
  const operatorAccountId = AccountId.fromString(opId);

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  const client = network === "testnet" ? Client.forTestnet() : Client.forMainnet();
  // Explicit ECDSA operator — matches mirror ECDSA_SECP256K1 accounts
  client.setOperator(operatorAccountId, operatorKey);
  if (typeof (client as any).setDefaultRegenerateTransactionId === "function") {
    (client as any).setDefaultRegenerateTransactionId(true);
  }

  try {
    // Preflight: paid query proves operator can sign (catches wrong key early)
    try {
      const bal = await new AccountBalanceQuery()
        .setAccountId(operatorAccountId)
        .execute(client);
      console.log(
        `[MAGIC-VERCEL] Operator preflight OK balance=${bal.hbars.toString()}`,
      );
    } catch (preErr: any) {
      const preMsg = String(preErr?.message || preErr);
      throw new Error(
        `Operator cannot sign on Hedera (preflight). Check HEDERA_OPERATOR_KEY is the ECDSA private key for ${opId}. Detail: ${preMsg.slice(0, 180)}`,
      );
    }

    let lastErr: unknown;
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        // Let the SDK own TransactionId entirely — manual setTransactionId caused INVALID_SIGNATURE
        const tx = new AccountCreateTransaction()
          .setKey(userKey)
          .setInitialBalance(new Hbar(0))
          .setMaxAutomaticTokenAssociations(16)
          .setMaxTransactionFee(new Hbar(2))
          .setTransactionValidDuration(120);

        if (typeof (tx as any).setRegenerateTransactionId === "function") {
          (tx as any).setRegenerateTransactionId(true);
        }

        const resp = await tx.execute(client);
        const receipt = await resp.getReceipt(client);
        const status = receipt.status?.toString?.() || String(receipt.status);
        if (status && status !== "SUCCESS") {
          throw new Error(`AccountCreate receipt status: ${status}`);
        }
        if (!receipt.accountId) throw new Error("No accountId in receipt");
        console.log(`[MAGIC-VERCEL] Created ${receipt.accountId.toString()} (attempt ${attempt})`);
        return receipt.accountId.toString();
      } catch (err: any) {
        lastErr = err;
        const msg = String(err?.message || err);
        console.error(`[MAGIC-VERCEL] AccountCreate attempt ${attempt} failed:`, msg.slice(0, 280));
        const retryable =
          /TRANSACTION_EXPIRED|BUSY|PLATFORM_TRANSACTION_NOT_CREATED|PLATFORM_NOT_ACTIVE|INVALID_NODE|timeout|ECONNRESET|ETIMEDOUT|UNAVAILABLE/i.test(
            msg,
          );
        if (!retryable || attempt === 4) break;
        await sleep(800 * attempt);
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  } finally {
    try {
      client.close();
    } catch {
      /* ignore */
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  applyCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();

  // Diagnostics are gated — public GET only confirms the route is up (no config leakage).
  if (req.method === "GET") {
    const diagToken = env("MAGIC_DIAGNOSTICS_TOKEN");
    const provided = String(req.query?.token || req.headers["x-magic-diagnostics"] || "");
    if (!diagToken || provided !== diagToken) {
      return res.status(200).json({ ok: true, service: "magic-ensure-account" });
    }
    try {
      const id = operatorId();
      const key = operatorKeyRaw();
      const idOk = ACCOUNT_ID_RE.test(id);
      let operatorKeyMatchesAccount: boolean | null = null;
      let operatorKeyParseOk: boolean | null = null;
      let mirrorKeyType: string | null = null;
      if (idOk && key) {
        try {
          const priv = parseOperatorKey(key);
          operatorKeyParseOk = true;
          const net = hederaNetwork();
          const mirror =
            net === "testnet"
              ? "https://testnet.mirrornode.hedera.com"
              : "https://mainnet-public.mirrornode.hedera.com";
          const acc = await fetch(`${mirror}/api/v1/accounts/${id}`, {
            signal: AbortSignal.timeout(8_000),
          }).then((r) => r.json());
          mirrorKeyType = acc?.key?._type || null;
          const mirrorKeyHex = String(acc?.key?.key || "").replace(/^0x/i, "");
          if (!mirrorKeyHex) {
            operatorKeyMatchesAccount = null;
          } else {
            let mirrorPub: PublicKey;
            try {
              mirrorPub =
                mirrorKeyType === "ECDSA_SECP256K1"
                  ? PublicKey.fromStringECDSA(mirrorKeyHex)
                  : PublicKey.fromString(mirrorKeyHex);
            } catch {
              mirrorPub = PublicKey.fromString(mirrorKeyHex);
            }
            operatorKeyMatchesAccount = priv.publicKey.equals(mirrorPub);
          }
        } catch {
          operatorKeyParseOk = false;
          operatorKeyMatchesAccount = false;
        }
      }
      return res.status(200).json({
        ok: true,
        magicEnabled: magicEnabled(),
        magicSecretConfigured: !!env("MAGIC_SECRET_KEY"),
        operatorIdConfigured: !!id,
        operatorIdFormatOk: idOk,
        operatorIdPreview: idOk ? `${id.slice(0, 8)}…${id.slice(-3)}` : null,
        operatorKeyConfigured: !!key,
        operatorKeyParseOk,
        operatorKeyMatchesAccount,
        mirrorKeyType,
        hederaNetwork: hederaNetwork(),
        hasDangerousViteOperatorEnv: !!(env("VITE_HEDERA_OPERATOR_KEY") || env("VITE_HEDERA_OPERATOR_ID")),
      });
    } catch (e: any) {
      return res.status(200).json({ ok: false, error: "diagnostics failed" });
    }
  }

  if (req.method !== "POST") {
    return res.status(405).json(safeClientError("METHOD", "Method not allowed"));
  }

  try {
    if (!magicEnabled()) {
      return res.status(503).json(
        safeClientError("MAGIC_DISABLED", "Magic account creation is not enabled."),
      );
    }

    // Fail fast if URL/key env is broken (generic client message)
    try {
      resolveSupabaseUrl();
    } catch (e: any) {
      console.error("[MAGIC-VERCEL] bad supabase url", e?.message);
      return res.status(500).json(safeClientError("BAD_SUPABASE_URL", "Server configuration error."));
    }
    if (!env("SUPABASE_SERVICE_ROLE_KEY")) {
      return res.status(500).json(safeClientError("BAD_SUPABASE_KEY", "Server configuration error."));
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const didToken = typeof body.didToken === "string" ? body.didToken.trim() : "";
    const publicKeyDer = typeof body.publicKeyDer === "string" ? body.publicKeyDer.trim() : "";

    if (!didToken || didToken.length < 20) {
      return res.status(400).json(safeClientError("BAD_DID", "Valid Magic DID token required"));
    }
    if (!publicKeyDer || publicKeyDer.length < 16) {
      return res.status(400).json(safeClientError("BAD_PUBKEY", "Valid publicKeyDer required"));
    }

    const ip = clientIp(req);
    const ipRL = await rateLimit(kvGet, kvMset, `ensure-ip:${ip}`, 20, 10 * 60 * 1000);
    if (ipRL.limited) {
      return res.status(429).json({
        ...safeClientError("RATE_LIMITED", "Too many account create attempts. Please wait."),
        retryAfter: ipRL.retryAfterSec,
      });
    }

    const identity = await validateMagicDidToken(didToken);
    if (!("issuer" in identity)) {
      return res.status(401).json(safeClientError(identity.code, identity.error));
    }

    const issRL = await rateLimit(kvGet, kvMset, `ensure-iss:${identity.issuer}`, 8, 10 * 60 * 1000);
    if (issRL.limited) {
      return res.status(429).json({
        ...safeClientError("RATE_LIMITED", "Too many account create attempts for this user. Please wait."),
        retryAfter: issRL.retryAfterSec,
      });
    }

    const existing = await kvGet(`magic-user:${identity.issuer}`);
    if (existing?.accountId && /^0\.0\.\d+$/.test(existing.accountId)) {
      return res.status(200).json({
        success: true,
        data: {
          accountId: existing.accountId,
          created: false,
          network: hederaNetwork(),
        },
      });
    }

    // Single-flight lock — reduces duplicate AccountCreate fee burn on concurrent retries
    if (existing?.status === "creating" && Number(existing.startedAt) > Date.now() - 90_000) {
      return res.status(409).json(
        safeClientError("CREATE_IN_PROGRESS", "Account creation already in progress. Retry in a moment."),
      );
    }
    await kvMset(
      [`magic-user:${identity.issuer}`],
      [{ status: "creating", startedAt: Date.now(), issuer: identity.issuer, publicKeyDer: publicKeyDer.slice(0, 500) }],
    );

    let accountId: string;
    try {
      accountId = await createHederaAccount(publicKeyDer);
    } catch (createErr) {
      // Clear lock so user can retry
      try {
        await kvMset([`magic-user:${identity.issuer}`], [{ status: "failed", issuer: identity.issuer, at: Date.now() }]);
      } catch {
        /* ignore */
      }
      throw createErr;
    }

    const record = {
      accountId,
      publicKeyDer: publicKeyDer.slice(0, 500),
      issuer: identity.issuer,
      network: hederaNetwork(),
      createdAt: new Date().toISOString(),
      via: "vercel",
    };

    await kvMset(
      [`magic-user:${identity.issuer}`, `magic-account:${accountId}`],
      [record, { issuer: identity.issuer }],
    );

    return res.status(200).json({
      success: true,
      data: {
        accountId,
        created: true,
        network: hederaNetwork(),
      },
    });
  } catch (err: any) {
    const detail = String(err?.message || err).slice(0, 400);
    const hederaStatus =
      err?.status?.toString?.() ||
      (detail.match(/status\s+([A-Z0-9_]+)/i) || [])[1] ||
      null;
    console.error("[MAGIC-VERCEL] ensure-account failed:", detail, "status=", hederaStatus);
    // Do not echo raw internal detail (may include key-format hints) to clients
    const publicMsg = hederaStatus
      ? `Could not create Hedera account [${hederaStatus}]. Please try again.`
      : "Could not create Hedera account. Please try again.";
    return res.status(502).json({
      ...safeClientError(hederaStatus || "ACCOUNT_CREATE_FAILED", publicMsg),
      hederaStatus,
    });
  }
}
