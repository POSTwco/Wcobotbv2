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
  Hbar,
} from "@hashgraph/sdk";
import { createClient } from "@supabase/supabase-js";
import { Magic } from "@magic-sdk/admin";

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
  const n = (env("HEDERA_NETWORK") || env("VITE_HEDERA_NETWORK")).toLowerCase();
  return n === "testnet" ? "testnet" : "mainnet";
}

/**
 * Server operator credentials. Prefer names WITHOUT VITE_ (never bake private keys into the browser).
 * Falls back to VITE_HEDERA_OPERATOR_* if someone only created the Vite-prefixed names on Vercel —
 * but those VITE_ vars must still be deleted so the next build does not expose the key.
 */
function operatorId(): string {
  return env("HEDERA_OPERATOR_ID") || env("VITE_HEDERA_OPERATOR_ID");
}

function operatorKeyRaw(): string {
  const preferred = env("HEDERA_OPERATOR_KEY");
  if (preferred) return preferred;
  const vite = env("VITE_HEDERA_OPERATOR_KEY");
  if (vite) {
    console.warn(
      "[MAGIC-VERCEL] Using VITE_HEDERA_OPERATOR_KEY — DELETE that env var after copying its value to HEDERA_OPERATOR_KEY (no VITE_). VITE_ secrets are embedded in public JS.",
    );
  }
  return vite;
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

function cors(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
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

  const hint =
    `len=${key.length} starts=${key.slice(0, 8)}… ` +
    `Use the private key for HEDERA_OPERATOR_ID (HashPack export / portal DER hex). ` +
    `Server env name must be HEDERA_OPERATOR_KEY (NO VITE_ prefix).`;
  throw new Error(
    `Could not parse HEDERA_OPERATOR_KEY — check format in Vercel env. ${hint} Last: ${String((lastErr as Error)?.message || lastErr).slice(0, 80)}`,
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
      "Operator missing on Vercel. Add HEDERA_OPERATOR_ID and HEDERA_OPERATOR_KEY (names WITHOUT VITE_). " +
        "If you only have VITE_HEDERA_OPERATOR_*, copy their values into the non-VITE names, then delete the VITE_ ones.",
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

  const client = network === "testnet" ? Client.forTestnet() : Client.forMainnet();
  client.setOperator(AccountId.fromString(opId), operatorKey);

  try {
    let tx: AccountCreateTransaction;
    const proto = AccountCreateTransaction.prototype as any;
    if (typeof proto.setECDSAKeyWithAlias === "function") {
      tx = new AccountCreateTransaction()
        .setECDSAKeyWithAlias(userKey)
        .setInitialBalance(new Hbar(0))
        .setMaxAutomaticTokenAssociations(16);
    } else {
      tx = new AccountCreateTransaction()
        .setKey(userKey)
        .setInitialBalance(new Hbar(0))
        .setMaxAutomaticTokenAssociations(16);
    }
    tx = tx.setMaxTransactionFee(new Hbar(2));

    const resp = await tx.execute(client);
    const receipt = await resp.getReceipt(client);
    const status = receipt.status?.toString?.() || String(receipt.status);
    if (status && status !== "SUCCESS") {
      throw new Error(`AccountCreate receipt status: ${status}`);
    }
    if (!receipt.accountId) throw new Error("No accountId in receipt");
    console.log(`[MAGIC-VERCEL] Created ${receipt.accountId.toString()}`);
    return receipt.accountId.toString();
  } finally {
    try {
      client.close();
    } catch {
      /* ignore */
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  cors(res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Method not allowed" });
  }

  try {
    if (!magicEnabled()) {
      return res.status(503).json({
        success: false,
        error: "Magic account creation is not enabled on Vercel (set MAGIC_ACCOUNT_CREATE_ENABLED=true).",
        code: "MAGIC_DISABLED",
      });
    }

    // Fail fast with clear message if URL/key env is broken
    try {
      resolveSupabaseUrl();
    } catch (e: any) {
      return res.status(500).json({ success: false, error: e.message, code: "BAD_SUPABASE_URL" });
    }
    if (!env("SUPABASE_SERVICE_ROLE_KEY")) {
      return res.status(500).json({
        success: false,
        error: "SUPABASE_SERVICE_ROLE_KEY missing on Vercel server env.",
        code: "BAD_SUPABASE_KEY",
      });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const didToken = typeof body.didToken === "string" ? body.didToken.trim() : "";
    const publicKeyDer = typeof body.publicKeyDer === "string" ? body.publicKeyDer.trim() : "";

    if (!didToken || didToken.length < 20) {
      return res.status(400).json({ success: false, error: "Valid Magic DID token required" });
    }
    if (!publicKeyDer || publicKeyDer.length < 16) {
      return res.status(400).json({ success: false, error: "Valid publicKeyDer required" });
    }

    const identity = await validateMagicDidToken(didToken);
    if (!("issuer" in identity)) {
      return res.status(401).json({
        success: false,
        error: identity.error,
        code: identity.code,
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

    const accountId = await createHederaAccount(publicKeyDer);
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
    const detail = String(err?.message || err).slice(0, 280);
    console.error("[MAGIC-VERCEL] ensure-account failed:", detail);
    return res.status(502).json({
      success: false,
      error: `Could not create Hedera account. ${detail}`,
      code: "ACCOUNT_CREATE_FAILED",
      detail,
    });
  }
}
