/**
 * Vercel Node serverless — Magic Hedera AccountCreate
 * ====================================================
 * Supabase Edge cannot reliably reach Hedera consensus (gRPC :50211) or
 * the SDK's mainnet-public mirror bootstrap. This Node runtime can.
 *
 * POST /api/magic-ensure-account
 * Body: { didToken: string, publicKeyDer: string }
 * Returns: { success, data: { accountId, created, network } }
 *
 * Server env (Vercel — NOT VITE_):
 *   MAGIC_SECRET_KEY
 *   MAGIC_ACCOUNT_CREATE_ENABLED=true
 *   HEDERA_OPERATOR_ID
 *   HEDERA_OPERATOR_KEY
 *   HEDERA_NETWORK=mainnet|testnet
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
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

const KV_TABLE = "kv_store_f75faf6c";

function env(name: string): string {
  return (process.env[name] || "").trim();
}

function hederaNetwork(): "mainnet" | "testnet" {
  return env("HEDERA_NETWORK").toLowerCase() === "testnet" ? "testnet" : "mainnet";
}

function magicEnabled(): boolean {
  return env("MAGIC_ACCOUNT_CREATE_ENABLED").toLowerCase() === "true" && !!env("MAGIC_SECRET_KEY");
}

function cors(res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function kvClient() {
  const url = env("SUPABASE_URL") || `https://${env("SUPABASE_PROJECT_ID") || "wotsoauebnoyvegcvouo"}.supabase.co`;
  const key = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY not configured on Vercel");
  return createClient(url, key);
}

async function kvGet(key: string): Promise<any> {
  const supabase = kvClient();
  const { data, error } = await supabase.from(KV_TABLE).select("value").eq("key", key).maybeSingle();
  if (error) throw new Error(error.message);
  return data?.value;
}

async function kvMset(keys: string[], values: any[]): Promise<void> {
  const supabase = kvClient();
  const { error } = await supabase.from(KV_TABLE).upsert(
    keys.map((k, i) => ({ key: k, value: values[i] })),
  );
  if (error) throw new Error(error.message);
}

async function validateMagicDidToken(didToken: string): Promise<{ issuer: string } | null> {
  const secret = env("MAGIC_SECRET_KEY");
  if (!secret || !didToken) return null;

  try {
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
      const issuer = v?.data?.issuer || v?.issuer;
      if (issuer && typeof issuer === "string") return { issuer };
    }

    // Fallback: decode JWT payload for iss
    const parts = didToken.replace(/^["']|["']$/g, "").split(".");
    if (parts.length >= 2) {
      const payload = JSON.parse(
        Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
      );
      if (payload?.iss && typeof payload.iss === "string") return { issuer: payload.iss };
    }
    return null;
  } catch (err) {
    console.error("[MAGIC-VERCEL] DID validation error:", err);
    return null;
  }
}

function parseOperatorKey(raw: string): PrivateKey {
  const key = raw.trim().replace(/^["']|["']$/g, "");
  const cleaned = key
    .replace(/-----BEGIN[^-]+-----/g, "")
    .replace(/-----END[^-]+-----/g, "")
    .replace(/\s+/g, "");

  for (const attempt of [
    () => PrivateKey.fromStringECDSA(cleaned),
    () => PrivateKey.fromStringED25519(cleaned),
    () => PrivateKey.fromStringDer(cleaned),
    () => PrivateKey.fromString(cleaned),
    () => PrivateKey.fromString(key),
  ]) {
    try {
      return attempt();
    } catch {
      /* next */
    }
  }
  throw new Error("Could not parse HEDERA_OPERATOR_KEY");
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
  const opId = env("HEDERA_OPERATOR_ID");
  const opKeyRaw = env("HEDERA_OPERATOR_KEY");
  if (!opId || !opKeyRaw) throw new Error("Hedera operator credentials not configured");

  const userKey = parseUserPublicKey(publicKeyDer);
  const operatorKey = parseOperatorKey(opKeyRaw);
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
    console.log(`[MAGIC-VERCEL] Created ${receipt.accountId.toString()} tx=${resp.transactionId?.toString?.()}`);
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
        error: "Magic account creation is not enabled.",
        code: "MAGIC_DISABLED",
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
    if (!identity) {
      return res.status(401).json({
        success: false,
        error: "Invalid or expired Magic session. Please sign in again.",
        code: "MAGIC_AUTH_FAILED",
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
    const detail = String(err?.message || err).slice(0, 240);
    console.error("[MAGIC-VERCEL] ensure-account failed:", detail);
    return res.status(502).json({
      success: false,
      error: `Could not create Hedera account. ${detail}`,
      code: "ACCOUNT_CREATE_FAILED",
      detail,
    });
  }
}
