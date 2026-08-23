/**
 * Load scripts/hedera/.env.hedera without printing secret values.
 * Never log key material.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = join(__dirname, "..", ".env.hedera");

/**
 * @param {string} [path]
 * @returns {Record<string, string>}
 */
export function loadHederaEnv(path = ENV_PATH) {
  const out = { ...process.env };
  if (!existsSync(path)) {
    console.warn(
      `[hedera-env] No file at ${path}. Using process.env only. Copy .env.hedera.example → .env.hedera locally.`,
    );
    return out;
  }
  const raw = readFileSync(path, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq <= 0) continue;
    const key = t.slice(0, eq).trim();
    let val = t.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

/**
 * @param {Record<string, string>} env
 * @param {string} name
 * @returns {string}
 */
export function requireEnv(env, name) {
  const v = env[name]?.trim();
  if (!v) {
    throw new Error(
      `Missing required env ${name}. Set it in scripts/hedera/.env.hedera (local only).`,
    );
  }
  return v;
}

/**
 * @param {Record<string, string>} env
 * @param {string} name
 * @returns {string | undefined}
 */
export function optionalEnv(env, name) {
  const v = env[name]?.trim();
  return v || undefined;
}

/** Redact helper for accidental logging */
export function redact(value) {
  if (!value) return "(empty)";
  if (value.length < 12) return "***";
  return `${value.slice(0, 4)}…${value.slice(-4)} (len=${value.length})`;
}
