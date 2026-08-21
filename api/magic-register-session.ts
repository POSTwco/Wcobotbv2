/**
 * Vercel Node — Magic wallet session register
 * ===========================================
 * POST /api/magic-register-session
 * Body: { wallet: "0.0.…", didToken: string }
 *
 * Issues X-Wallet-Session token into the same KV store Edge uses.
 * Lives on Vercel so we are not blocked by Edge 404 / HTTP 546 on
 * /wallet/magic/register.
 *
 * Env (same as magic-ensure-account):
 *   MAGIC_SECRET_KEY, MAGIC_ACCOUNT_CREATE_ENABLED
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";
import { Magic } from "@magic-sdk/admin";

const KV_TABLE = "kv_store_f75faf6c";
const DEFAULT_SUPABASE_URL = "https://wotsoauebnoyvegcvouo.supabase.co";
const WALLET_SESSION_TTL_MS = 4 * 60 * 60 * 1000;
const ACCOUNT_ID_RE = /^0\.0\.\d+$/;

function env(name: string): string {
  return (process.env[name] || "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .trim();
}

function magicEnabled(): boolean {
  return env("MAGIC_ACCOUNT_CREATE_ENABLED").toLowerCase() === "true" && !!env("MAGIC_SECRET_KEY");
}

function resolveSupabaseUrl(): string {
  const raw = env("SUPABASE_URL") || env("NEXT_PUBLIC_SUPABASE_URL") || DEFAULT_SUPABASE_URL;
  return new URL(raw).origin;
}

function cors(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function kvClient() {
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured on Vercel");
  return createClient(resolveSupabaseUrl(), key);
}

async function kvGet(key: string): Promise<any> {
  const { data, error } = await kvClient().from(KV_TABLE).select("value").eq("key", key).maybeSingle();
  if (error) throw new Error(`KV get failed: ${error.message}`);
  return data?.value;
}

async function kvDel(key: string): Promise<void> {
  await kvClient().from(KV_TABLE).delete().eq("key", key);
}

async function kvMset(keys: string[], values: any[]): Promise<void> {
  const { error } = await kvClient()
    .from(KV_TABLE)
    .upsert(keys.map((k, i) => ({ key: k, value: values[i] })));
  if (error) throw new Error(`KV write failed: ${error.message}`);
}

function decodeMagicDidClaim(didToken: string): { iss?: string; aud?: string } | null {
  const raw = didToken.trim().replace(/^["']|["']$/g, "");
  if (!raw) return null;
  try {
    const json = Buffer.from(raw.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const tuple = JSON.parse(json);
    if (Array.isArray(tuple) && tuple.length >= 2) {
      const claim = typeof tuple[1] === "string" ? JSON.parse(tuple[1]) : tuple[1];
      if (claim && typeof claim === "object") {
        return {
          iss: typeof claim.iss === "string" ? claim.iss : undefined,
          aud: typeof claim.aud === "string" ? claim.aud : undefined,
        };
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function validateMagicDidToken(
  didToken: string,
): Promise<{ issuer: string } | { error: string; code: string }> {
  const secret = env("MAGIC_SECRET_KEY");
  if (!secret) return { error: "MAGIC_SECRET_KEY missing on Vercel", code: "MAGIC_SECRET_MISSING" };
  if (!didToken || didToken.length < 20) {
    return { error: "Magic DID token missing or too short.", code: "MAGIC_DID_MISSING" };
  }

  const claim = decodeMagicDidClaim(didToken);
  const expectedClientId = env("MAGIC_CLIENT_ID") || "bJlBCakg7wjIBuWLer0g4F8I3tw";

  try {
    const magic = await Magic.init(secret);
    if (magic.clientId && claim?.aud && magic.clientId !== claim.aud) {
      return {
        error: `MAGIC_SECRET_KEY Client ID ${magic.clientId} ≠ DID aud ${claim.aud}`,
        code: "MAGIC_SECRET_MISMATCH",
      };
    }
    if (!magic.clientId && expectedClientId) magic.clientId = expectedClientId;
    magic.token.validate(didToken);
    const issuer = magic.token.getIssuer(didToken);
    if (issuer) return { issuer };
  } catch (sdkErr: any) {
    console.error("[MAGIC-REG] Admin SDK validate:", String(sdkErr?.message || sdkErr).slice(0, 200));
  }

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
    }
  } catch (e) {
    console.error("[MAGIC-REG] REST user/get:", e);
  }

  const iss = claim?.iss;
  if (iss) {
    return {
      error: "Magic DID could not be verified with MAGIC_SECRET_KEY.",
      code: "MAGIC_AUTH_FAILED",
    };
  }
  return { error: "Invalid or expired Magic session.", code: "MAGIC_AUTH_FAILED" };
}

function generateWalletSessionToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
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
        error: "Magic is not enabled on Vercel (MAGIC_ACCOUNT_CREATE_ENABLED + MAGIC_SECRET_KEY).",
        code: "MAGIC_DISABLED",
      });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    const wallet = typeof body.wallet === "string" ? body.wallet.trim() : "";
    const didToken = typeof body.didToken === "string" ? body.didToken.trim() : "";

    if (!ACCOUNT_ID_RE.test(wallet)) {
      return res.status(400).json({ success: false, error: "Valid Hedera wallet address required" });
    }
    if (!didToken || didToken.length < 20) {
      return res.status(400).json({ success: false, error: "Valid Magic DID token required" });
    }

    const identity = await validateMagicDidToken(didToken);
    if (!("issuer" in identity)) {
      return res.status(401).json({ success: false, error: identity.error, code: identity.code });
    }

    const mapping = await kvGet(`magic-user:${identity.issuer}`);
    if (!mapping?.accountId || mapping.accountId !== wallet) {
      return res.status(403).json({
        success: false,
        error: "Wallet is not linked to this Magic user. Complete account creation first.",
        code: "MAGIC_WALLET_MISMATCH",
      });
    }

    const existingRef = await kvGet(`wsession-wallet:${wallet}`);
    if (existingRef?.token) {
      try {
        await kvDel(`wsession:${existingRef.token}`);
      } catch {
        /* ignore */
      }
    }

    const token = generateWalletSessionToken();
    const sessionData = {
      wallet,
      authProvider: "magic",
      issuer: identity.issuer,
      wcTopic: `magic:${identity.issuer}`.slice(0, 200),
      createdAt: Date.now(),
      expiresAt: Date.now() + WALLET_SESSION_TTL_MS,
    };

    await kvMset(
      [`wsession:${token}`, `wsession-wallet:${wallet}`],
      [sessionData, { token }],
    );

    console.log(`[MAGIC-REG] Session for ${wallet}`);
    return res.status(200).json({
      success: true,
      data: {
        token,
        expiresAt: sessionData.expiresAt,
        ttlMs: WALLET_SESSION_TTL_MS,
        authProvider: "magic",
      },
    });
  } catch (err: any) {
    const detail = String(err?.message || err).slice(0, 280);
    console.error("[MAGIC-REG] failed:", detail);
    return res.status(502).json({
      success: false,
      error: `Could not register Magic session. ${detail}`,
      code: "MAGIC_REGISTER_FAILED",
      detail,
    });
  }
}
