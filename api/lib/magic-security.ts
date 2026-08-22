/**
 * Shared security helpers for Magic Vercel APIs.
 * - Origin allowlist (no wildcard CORS)
 * - Best-effort KV rate limits
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

const DEFAULT_ALLOWED_ORIGINS = [
  "https://www.wcorg.io",
  "https://wcorg.io",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:3000",
];

export function allowedOrigins(): Set<string> {
  const extra = (process.env.MAGIC_CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return new Set([...DEFAULT_ALLOWED_ORIGINS, ...extra]);
}

/** Same-origin / allowlisted CORS. Never reflects arbitrary Origin. */
export function applyCors(req: VercelRequest, res: VercelResponse) {
  const origin = String(req.headers.origin || "");
  const allowed = allowedOrigins();
  if (origin && allowed.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

export function clientIp(req: VercelRequest): string {
  const xf = String(req.headers["x-forwarded-for"] || "");
  if (xf) return xf.split(",")[0].trim();
  const real = String(req.headers["x-real-ip"] || "");
  return real || "unknown";
}

export type KvGet = (key: string) => Promise<any>;
export type KvMset = (keys: string[], values: any[]) => Promise<void>;

/** Best-effort sliding window counter in KV (not perfectly atomic; good enough for fee drain). */
export async function rateLimit(
  kvGet: KvGet,
  kvMset: KvMset,
  bucket: string,
  max: number,
  windowMs: number,
): Promise<{ limited: boolean; retryAfterSec?: number }> {
  const key = `rl:magic:${bucket}`;
  const now = Date.now();
  try {
    const cur = await kvGet(key);
    if (!cur || typeof cur !== "object" || !cur.resetAt || cur.resetAt < now) {
      await kvMset([key], [{ count: 1, resetAt: now + windowMs }]);
      return { limited: false };
    }
    const count = Number(cur.count) || 0;
    if (count >= max) {
      return { limited: true, retryAfterSec: Math.max(1, Math.ceil((cur.resetAt - now) / 1000)) };
    }
    await kvMset([key], [{ count: count + 1, resetAt: cur.resetAt }]);
    return { limited: false };
  } catch (e) {
    // Fail open on KV errors so login isn't bricked — log for ops
    console.warn("[MAGIC-SEC] rateLimit KV error:", e);
    return { limited: false };
  }
}

/** Safe client error — never echo key material prefixes. */
export function safeClientError(code: string, message: string) {
  return { success: false as const, error: message, code };
}
