/**
 * Permanent wallet registry. The WALLETS card counts these keys live.
 * Keys live only in kv_store_f75faf6c.
 *   wallet:seen:<accountId> = { firstSeenAt, lastSeenAt, sources, loginCount }
 */

import * as kv from "./kv_store.tsx";
import { isValidHederaAccountId } from "./admin-auth.tsx";

export type WalletSource = "hashpack" | "walletconnect" | "magic";

const SEEN_PREFIX = "wallet:seen:";
const BACKFILL_KEY = "wallet-seen-backfill:v1";

function seenKey(accountId: string): string {
  return `${SEEN_PREFIX}${accountId}`;
}

function iso(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) return new Date(value).toISOString();
  if (typeof value === "string" && value.trim()) {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  }
  return new Date().toISOString();
}

function earlier(a: string, b: string): string {
  return Date.parse(a) <= Date.parse(b) ? a : b;
}

function later(a: string, b: string): string {
  return Date.parse(a) >= Date.parse(b) ? a : b;
}

/** Create the registry row, or refresh lastSeenAt, loginCount, and sources. */
export async function touchWalletSeen(accountId: string, source: WalletSource): Promise<void> {
  if (!isValidHederaAccountId(accountId)) return;
  const key = seenKey(accountId);
  const now = new Date().toISOString();
  const existing = await kv.get(key);
  if (!existing || typeof existing !== "object") {
    await kv.set(key, {
      firstSeenAt: now,
      lastSeenAt: now,
      sources: [source],
      loginCount: 1,
    });
    return;
  }
  const sources = new Set<string>(Array.isArray(existing.sources) ? existing.sources : []);
  sources.add(source);
  await kv.set(key, {
    firstSeenAt: typeof existing.firstSeenAt === "string" ? existing.firstSeenAt : now,
    lastSeenAt: now,
    sources: [...sources],
    loginCount: (Number(existing.loginCount) || 0) + 1,
  });
}

function mergeSeen(existing: any, sources: WalletSource[], seenAt: unknown) {
  const at = iso(seenAt);
  if (!existing || typeof existing !== "object") {
    return { firstSeenAt: at, lastSeenAt: at, sources, loginCount: 1 };
  }
  const merged = new Set<string>(Array.isArray(existing.sources) ? existing.sources : []);
  for (const source of sources) merged.add(source);
  const first = typeof existing.firstSeenAt === "string" ? earlier(existing.firstSeenAt, at) : at;
  const last = typeof existing.lastSeenAt === "string" ? later(existing.lastSeenAt, at) : at;
  return {
    firstSeenAt: first,
    lastSeenAt: last,
    sources: [...merged],
    loginCount: Math.max(1, Number(existing.loginCount) || 1),
  };
}

function idFromKey(key: string, prefix: string): string {
  return key.startsWith(prefix) ? key.slice(prefix.length) : "";
}

/** One-time merge of older connection records. Safe to call again; it does not add a second wallet. */
export async function backfillWalletSeen(): Promise<number> {
  const marker = await kv.get(BACKFILL_KEY);
  if (marker?.done === true) return Number(marker.count) || 0;

  const found = new Map<string, { sources: Set<WalletSource>; at: unknown }>();
  const add = (accountId: string, source: WalletSource | null, at: unknown) => {
    if (!isValidHederaAccountId(accountId)) return;
    const prev = found.get(accountId);
    const sources = prev?.sources ?? new Set<WalletSource>();
    if (source) sources.add(source);
    const atIso = prev ? earlier(iso(prev.at), iso(at)) : iso(at);
    found.set(accountId, { sources, at: atIso });
  };

  const contest = await kv.getEntriesByPrefix("contest:entry:");
  for (const row of contest) {
    if (!row.key.startsWith("contest:entry:")) continue;
    const id = String(row.value?.accountId || idFromKey(row.key, "contest:entry:"));
    add(id, null, row.value?.enteredAt);
  }

  const sessions = await kv.getEntriesByPrefix("wsession:");
  for (const row of sessions) {
    if (!row.key.startsWith("wsession:") || row.key.startsWith("wsession-wallet:")) continue;
    const source: WalletSource = row.value?.authProvider === "magic" ? "magic" : "hashpack";
    add(String(row.value?.wallet || ""), source, row.value?.createdAt);
  }

  const magicIds = new Set<string>();
  const magicAccounts = await kv.getEntriesByPrefix("magic-account:");
  for (const row of magicAccounts) {
    const id = idFromKey(row.key, "magic-account:");
    add(id, "magic", null);
    if (isValidHederaAccountId(id)) magicIds.add(id);
  }

  const magicUsers = await kv.getEntriesByPrefix("magic-user:");
  for (const row of magicUsers) {
    const id = String(row.value?.accountId || "");
    add(id, "magic", row.value?.createdAt);
    if (isValidHederaAccountId(id)) magicIds.add(id);
  }

  // Magic register also writes wsession-wallet:<accountId>. That key is not
  // proof of HashPack. Only tag hashpack when the account is not a Magic account.
  const sessionWallets = await kv.getEntriesByPrefix("wsession-wallet:");
  for (const row of sessionWallets) {
    const id = idFromKey(row.key, "wsession-wallet:");
    if (magicIds.has(id)) continue;
    add(id, "hashpack", null);
  }

  const claims = await kv.getEntriesByPrefix("nft:early-supporter:claimed:");
  for (const row of claims) {
    add(idFromKey(row.key, "nft:early-supporter:claimed:"), null, row.value?.claimedAt || row.value?.createdAt);
  }

  // Contest entries and NFT claims do not store a provider. A wallet with no
  // Magic record connected through HashPack / WalletConnect.
  for (const info of found.values()) {
    if (info.sources.size === 0) info.sources.add("hashpack");
  }

  const existingRows = await kv.getEntriesByPrefix(SEEN_PREFIX);
  const existingByAccount = new Map<string, any>();
  for (const row of existingRows) {
    const id = idFromKey(row.key, SEEN_PREFIX);
    if (isValidHederaAccountId(id)) existingByAccount.set(id, row.value);
  }

  if (found.size === 0) {
    console.log("[WALLET-SEEN] Backfill found no historical wallets; will retry");
    return 0;
  }

  const keys: string[] = [];
  const values: any[] = [];
  for (const [accountId, info] of found) {
    keys.push(seenKey(accountId));
    values.push(mergeSeen(existingByAccount.get(accountId), [...info.sources], info.at));
  }
  for (let i = 0; i < keys.length; i += 100) {
    await kv.mset(keys.slice(i, i + 100), values.slice(i, i + 100));
  }

  await kv.set(BACKFILL_KEY, {
    done: true,
    at: new Date().toISOString(),
    count: found.size,
  });
  console.log(`[WALLET-SEEN] Backfill stored ${found.size} wallets`);
  return found.size;
}

export async function countWalletSeen(): Promise<{
  total: number;
  hashpack: number;
  magic: number;
  new24h: number;
}> {
  await backfillWalletSeen();
  const rows = await kv.getEntriesByPrefix(SEEN_PREFIX);
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  const ids = new Set<string>();
  let hashpack = 0;
  let magic = 0;
  let new24h = 0;
  for (const row of rows) {
    const id = idFromKey(row.key, SEEN_PREFIX);
    if (!isValidHederaAccountId(id) || ids.has(id)) continue;
    ids.add(id);
    const sources: string[] = Array.isArray(row.value?.sources) ? row.value.sources : [];
    if (sources.includes("hashpack") || sources.includes("walletconnect")) hashpack++;
    if (sources.includes("magic")) magic++;
    const first = Date.parse(String(row.value?.firstSeenAt || ""));
    if (Number.isFinite(first) && first >= cutoff) new24h++;
  }
  return { total: ids.size, hashpack, magic, new24h };
}
