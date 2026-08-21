/**
 * Magic Account Provisioning — WCO Create Account path
 * =====================================================
 * Additive to HashPack WalletConnect. Never stores private keys.
 *
 * Flow:
 *   1. Client logs in with Magic (email / Google / Apple) → DID token
 *   2. Client sends DID + publicKeyDer → POST /wallet/magic/ensure-account
 *   3. Server validates DID via Magic Admin API, creates Hedera account
 *      (sponsored by operator) if first login, stores issuer→accountId in KV
 *   4. Client POST /wallet/magic/register → X-Wallet-Session (same token shape
 *      as WC register, authProvider: "magic")
 *
 * Env (Supabase secrets — never Vite):
 *   MAGIC_SECRET_KEY
 *   MAGIC_ACCOUNT_CREATE_ENABLED=true
 *   HEDERA_OPERATOR_ID
 *   HEDERA_OPERATOR_KEY
 *   HEDERA_NETWORK=mainnet|testnet
 */

import { Hono } from "npm:hono";
import * as kv from "./kv_store.tsx";
import {
  isValidHederaAccountId,
  verifyWalletOnMirrorNode,
  checkRateLimit,
  sanitizeString,
} from "./admin-auth.tsx";

/**
 * Lazy-load Hedera SDK.
 * Prefer esm.sh for Deno Edge (more reliable than npm: specifier during Supabase deploy).
 */
async function loadHederaSdk() {
  try {
    return await import("https://esm.sh/@hashgraph/sdk@2.80.0");
  } catch (esmErr) {
    console.log(`[MAGIC] esm.sh SDK load failed, falling back to npm: ${esmErr}`);
    return await import("npm:@hashgraph/sdk@2.80.0");
  }
}

const WALLET_SESSION_TTL_MS = 4 * 60 * 60 * 1000;

function env(name: string): string {
  return (Deno.env.get(name) || "").trim();
}

function magicEnabled(): boolean {
  return env("MAGIC_ACCOUNT_CREATE_ENABLED").toLowerCase() === "true"
    && !!env("MAGIC_SECRET_KEY");
}

function hederaNetwork(): "mainnet" | "testnet" {
  return env("HEDERA_NETWORK").toLowerCase() === "testnet" ? "testnet" : "mainnet";
}

function safeErrorMsg(op: string): string {
  return `${op}. Please try again.`;
}

function generateWalletSessionToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function extractClientIp(c: any): string {
  const forwarded = c.req.header("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return c.req.header("x-real-ip") || "unknown";
}

/** Validate Magic DID token; returns issuer (user id) or null */
async function validateMagicDidToken(didToken: string): Promise<{ issuer: string } | null> {
  const secret = env("MAGIC_SECRET_KEY");
  if (!secret || !didToken) return null;

  try {
    // Magic Admin REST: validate + metadata
    // https://magic.link/docs/api/server-side-sdks/node#token-validate
    const res = await fetch("https://api.magic.link/v1/admin/auth/user/get", {
      method: "GET",
      headers: {
        "X-Magic-Secret-Key": secret,
        Authorization: `Bearer ${didToken}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(12_000),
    });

    if (!res.ok) {
      // Fallback: parse DID JWT payload without network (issuer claim) + ping validate endpoint
      const validateRes = await fetch("https://api.magic.link/v2/admin/auth/token/validate", {
        method: "POST",
        headers: {
          "X-Magic-Secret-Key": secret,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ did_token: didToken }),
        signal: AbortSignal.timeout(12_000),
      });
      if (!validateRes.ok) {
        console.log(`[MAGIC] DID validate failed: ${validateRes.status}`);
        return null;
      }
      const v = await validateRes.json();
      const issuer = v?.data?.issuer || v?.issuer;
      if (!issuer || typeof issuer !== "string") return null;
      return { issuer };
    }

    const data = await res.json();
    const issuer = data?.data?.issuer || data?.issuer;
    if (!issuer || typeof issuer !== "string") {
      // Try decode DID token middle segment for issuer
      const parts = didToken.replace(/^["']|["']$/g, "").split(".");
      if (parts.length >= 2) {
        try {
          const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
          if (payload?.iss && typeof payload.iss === "string") {
            return { issuer: payload.iss };
          }
        } catch { /* ignore */ }
      }
      return null;
    }
    return { issuer };
  } catch (err) {
    console.log(`[MAGIC] DID validation error: ${err}`);
    return null;
  }
}

function parseOperatorKey(sdk: any, raw: string): any {
  const { PrivateKey } = sdk;
  const key = raw.trim().replace(/^["']|["']$/g, "");
  const cleaned = key
    .replace(/-----BEGIN[^-]+-----/g, "")
    .replace(/-----END[^-]+-----/g, "")
    .replace(/\s+/g, "");

  const attempts: Array<() => any> = [
    () => PrivateKey.fromStringECDSA(cleaned),
    () => PrivateKey.fromStringED25519(cleaned),
    () => PrivateKey.fromStringDer(cleaned),
    () => PrivateKey.fromString(cleaned),
    () => PrivateKey.fromStringECDSA(key),
    () => PrivateKey.fromStringED25519(key),
    () => PrivateKey.fromString(key),
  ];

  let lastErr: unknown;
  for (const attempt of attempts) {
    try {
      return attempt();
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(
    `Could not parse HEDERA_OPERATOR_KEY (tried ECDSA/ED25519/DER). Last error: ${(lastErr as Error)?.message || lastErr}`,
  );
}

/** Magic returns DER hex for an ECDSA secp256k1 public key — try ECDSA parsers first. */
function parseUserPublicKey(sdk: any, publicKeyDer: string): any {
  const { PublicKey } = sdk;
  const raw = publicKeyDer.trim().replace(/^0x/i, "");
  const attempts: Array<() => any> = [
    () => PublicKey.fromStringECDSA(raw),
    () => PublicKey.fromString(raw),
  ];

  let lastErr: unknown;
  for (const attempt of attempts) {
    try {
      return attempt();
    } catch (err) {
      lastErr = err;
    }
  }
  throw new Error(
    `Could not parse Magic publicKeyDer as ECDSA PublicKey. Last error: ${(lastErr as Error)?.message || lastErr}`,
  );
}

async function createHederaAccount(publicKeyDer: string): Promise<string> {
  const opId = env("HEDERA_OPERATOR_ID");
  const opKeyRaw = env("HEDERA_OPERATOR_KEY");
  if (!opId || !opKeyRaw) {
    throw new Error("Hedera operator credentials not configured");
  }
  if (!isValidHederaAccountId(opId)) {
    throw new Error(`Invalid HEDERA_OPERATOR_ID format: ${opId}`);
  }

  const sdk = await loadHederaSdk();
  const {
    Client,
    AccountId,
    AccountCreateTransaction,
    Hbar,
  } = sdk;

  const userKey = parseUserPublicKey(sdk, publicKeyDer);
  const operatorKey = parseOperatorKey(sdk, opKeyRaw);
  const network = hederaNetwork();
  console.log(
    `[MAGIC] AccountCreate start | network=${network} | operator=${opId}`,
  );

  const client = network === "testnet" ? Client.forTestnet() : Client.forMainnet();
  client.setOperator(AccountId.fromString(opId), operatorKey);

  try {
    // Magic keys are ECDSA — prefer setECDSAKeyWithAlias (Hedera docs recommended).
    const proto = AccountCreateTransaction.prototype as any;
    let tx: any;

    if (typeof proto.setECDSAKeyWithAlias === "function") {
      tx = new AccountCreateTransaction()
        .setECDSAKeyWithAlias(userKey)
        .setInitialBalance(new Hbar(0))
        .setMaxAutomaticTokenAssociations(16);
    } else if (typeof proto.setKeyWithoutAlias === "function") {
      tx = new AccountCreateTransaction()
        .setKeyWithoutAlias(userKey)
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
    const newId = receipt.accountId;
    if (!newId) throw new Error(`AccountCreate status=${status} but no accountId in receipt`);
    console.log(`[MAGIC] AccountCreate SUCCESS → ${newId.toString()} | tx=${resp.transactionId?.toString?.()}`);
    return newId.toString();
  } catch (err: any) {
    const msg = err?.message || String(err);
    const status = err?.status?.toString?.() || err?.statusPrecheck?.toString?.() || "";
    console.log(`[MAGIC] AccountCreate FAILED | status=${status} | msg=${msg}`);
    throw new Error(status ? `${msg} (${status})` : msg);
  } finally {
    try { client.close(); } catch { /* ignore */ }
  }
}

/**
 * Mount Magic routes on the app under PREFIX.
 * Caller passes PREFIX and shared helpers already imported in index.
 */
export function mountMagicRoutes(app: Hono, PREFIX: string) {
  // -------------------------------------------------------------------------
  // POST /wallet/magic/ensure-account
  // -------------------------------------------------------------------------
  app.post(`${PREFIX}/wallet/magic/ensure-account`, async (c) => {
    try {
      if (!magicEnabled()) {
        return c.json({
          success: false,
          error: "Magic account creation is not enabled on this environment.",
          code: "MAGIC_DISABLED",
        }, 503);
      }

      const body = await c.req.json();
      const didToken = typeof body.didToken === "string" ? body.didToken.trim() : "";
      const publicKeyDer = typeof body.publicKeyDer === "string" ? body.publicKeyDer.trim() : "";

      if (!didToken || didToken.length < 20) {
        return c.json({ success: false, error: "Valid Magic DID token required" }, 400);
      }
      if (!publicKeyDer || publicKeyDer.length < 16) {
        return c.json({ success: false, error: "Valid Hedera publicKeyDer required" }, 400);
      }

      const ip = extractClientIp(c);
      const ipRL = await checkRateLimit(`magic-ensure-ip:${ip}`, 20, 10 * 60 * 1000);
      if (ipRL.limited) {
        return c.json({
          success: false,
          error: "Too many account requests. Please wait.",
          code: "RATE_LIMITED",
          retryAfter: ipRL.retryAfter,
        }, 429);
      }

      const identity = await validateMagicDidToken(didToken);
      if (!identity) {
        return c.json({ success: false, error: "Invalid or expired Magic session. Please sign in again.", code: "MAGIC_AUTH_FAILED" }, 401);
      }

      const issuer = identity.issuer;
      const issuerRL = await checkRateLimit(`magic-ensure-iss:${issuer}`, 10, 10 * 60 * 1000);
      if (issuerRL.limited) {
        return c.json({
          success: false,
          error: "Too many account requests for this user. Please wait.",
          code: "RATE_LIMITED",
          retryAfter: issuerRL.retryAfter,
        }, 429);
      }

      const existing = await kv.get(`magic-user:${issuer}`);
      if (existing && (existing as any).accountId && isValidHederaAccountId((existing as any).accountId)) {
        return c.json({
          success: true,
          data: {
            accountId: (existing as any).accountId,
            created: false,
            network: hederaNetwork(),
          },
        });
      }

      let accountId: string;
      try {
        accountId = await createHederaAccount(publicKeyDer);
      } catch (err: any) {
        const detail = String(err?.message || err).slice(0, 240);
        console.log(`[MAGIC] AccountCreate failed for ${issuer}: ${detail}`);
        // Surface a short, non-sensitive hint so smoke tests can diagnose
        // (balances, key parse, network) without leaking private keys.
        let hint = "Please try again shortly.";
        const d = detail.toLowerCase();
        if (d.includes("insufficient") || d.includes("payer") || d.includes("balance")) {
          hint = "Operator account may need more HBAR to pay AccountCreate fees.";
        } else if (d.includes("parse") && d.includes("operator")) {
          hint = "HEDERA_OPERATOR_KEY could not be parsed — check key format in Edge secrets.";
        } else if (d.includes("publickey") || d.includes("public key") || d.includes("publickeyder")) {
          hint = "Magic public key could not be parsed as ECDSA.";
        } else if (d.includes("grpc") || d.includes("connect") || d.includes("fetch failed") || d.includes("network")) {
          hint = "Could not reach Hedera from Edge (network/gRPC). Check HEDERA_NETWORK and redeploy.";
        } else if (d.includes("receipt status")) {
          hint = detail;
        }
        return c.json({
          success: false,
          error: `Could not create Hedera account. ${hint}`,
          code: "ACCOUNT_CREATE_FAILED",
          detail: detail,
        }, 502);
      }

      const record = {
        accountId,
        publicKeyDer: sanitizeString(publicKeyDer, 500),
        issuer,
        network: hederaNetwork(),
        createdAt: new Date().toISOString(),
      };

      await kv.mset(
        [`magic-user:${issuer}`, `magic-account:${accountId}`],
        [record, { issuer }],
      );

      console.log(`[MAGIC] Created Hedera account ${accountId} for issuer ${issuer.substring(0, 24)}…`);

      return c.json({
        success: true,
        data: {
          accountId,
          created: true,
          network: hederaNetwork(),
        },
      });
    } catch (error) {
      console.log(`[MAGIC] ensure-account error: ${error}`);
      return c.json({ success: false, error: safeErrorMsg("Failed to ensure Magic account") }, 500);
    }
  });

  // -------------------------------------------------------------------------
  // POST /wallet/magic/register — issue X-Wallet-Session for Magic users
  // -------------------------------------------------------------------------
  app.post(`${PREFIX}/wallet/magic/register`, async (c) => {
    try {
      if (!magicEnabled()) {
        return c.json({
          success: false,
          error: "Magic account creation is not enabled on this environment.",
          code: "MAGIC_DISABLED",
        }, 503);
      }

      const body = await c.req.json();
      const wallet = typeof body.wallet === "string" ? body.wallet.trim() : "";
      const didToken = typeof body.didToken === "string" ? body.didToken.trim() : "";

      if (!wallet || !isValidHederaAccountId(wallet)) {
        return c.json({ success: false, error: "Valid Hedera wallet address required" }, 400);
      }
      if (!didToken || didToken.length < 20) {
        return c.json({ success: false, error: "Valid Magic DID token required" }, 400);
      }

      const wsessionWalletRL = await checkRateLimit(`wsession:${wallet}`, 5, 2 * 60 * 1000);
      if (wsessionWalletRL.limited) {
        return c.json({
          success: false,
          error: "Too many session registrations. Please wait.",
          code: "RATE_LIMITED",
          retryAfter: wsessionWalletRL.retryAfter,
        }, 429);
      }

      const ip = extractClientIp(c);
      const wsessionIpRL = await checkRateLimit(`wsession-ip:${ip}`, 10, 5 * 60 * 1000);
      if (wsessionIpRL.limited) {
        return c.json({
          success: false,
          error: "Too many session registrations from this network.",
          code: "RATE_LIMITED",
          retryAfter: wsessionIpRL.retryAfter,
        }, 429);
      }

      const identity = await validateMagicDidToken(didToken);
      if (!identity) {
        return c.json({ success: false, error: "Invalid or expired Magic session.", code: "MAGIC_AUTH_FAILED" }, 401);
      }

      const mapping = await kv.get(`magic-user:${identity.issuer}`);
      if (!mapping || (mapping as any).accountId !== wallet) {
        return c.json({
          success: false,
          error: "Wallet is not linked to this Magic user. Complete account creation first.",
          code: "MAGIC_WALLET_MISMATCH",
        }, 403);
      }

      const walletExists = await verifyWalletOnMirrorNode(wallet);
      if (!walletExists) {
        // New accounts can lag on mirror — allow brief grace if we just created
        console.log(`[MAGIC] Mirror miss for ${wallet} — allowing session (fresh create possible)`);
      }

      const existingRef = await kv.get(`wsession-wallet:${wallet}`);
      if (existingRef && (existingRef as any).token) {
        await kv.del(`wsession:${(existingRef as any).token}`).catch(() => {});
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

      await kv.mset(
        [`wsession:${token}`, `wsession-wallet:${wallet}`],
        [sessionData, { token }],
      );

      console.log(`[MAGIC] Session registered for ${wallet} (issuer ${identity.issuer.substring(0, 20)}…)`);

      return c.json({
        success: true,
        data: {
          token,
          expiresAt: sessionData.expiresAt,
          ttlMs: WALLET_SESSION_TTL_MS,
          authProvider: "magic",
        },
      });
    } catch (error) {
      console.log(`[MAGIC] register error: ${error}`);
      return c.json({ success: false, error: safeErrorMsg("Failed to register Magic wallet session") }, 500);
    }
  });
}
