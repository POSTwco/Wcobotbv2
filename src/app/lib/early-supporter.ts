/**
 * Early Supporter NFT — Phase 1 (local-first, mint disabled)
 * ==========================================================
 * Feature flags, media constants, shared types, and a localStorage
 * mock store so `pnpm run dev` can exercise the full claim UX with
 * zero Hedera testnet / production KV writes.
 *
 * Production defaults: UI off. Real HTS mint is never available here.
 */

import { EARLY_SUPPORTER_TREASURY_ACCOUNT_ID, TOKEN_IDS } from "./hedera-config";

// ---------------------------------------------------------------------------
// Feature flags (frontend)
// ---------------------------------------------------------------------------

function envBool(name: string, defaultValue: boolean): boolean {
  const v = import.meta.env[name];
  if (v === undefined || v === "") return defaultValue;
  return v === "true" || v === "1" || v === "yes";
}

/** Show claim UI on Manage Assets. Default false — live site unaffected. */
export const EARLY_SUPPORTER_UI_ENABLED = envBool(
  "VITE_EARLY_SUPPORTER_ENABLED",
  false,
);

/**
 * Use browser localStorage instead of Edge KV.
 * Only honored in Vite DEV so production builds cannot accidentally mock.
 */
export const EARLY_SUPPORTER_LOCAL_MOCK =
  import.meta.env.DEV && envBool("VITE_EARLY_SUPPORTER_LOCAL_MOCK", false);

export const EARLY_SUPPORTER_MAX_SUPPLY = 5_000;

export const EARLY_SUPPORTER_TOKEN_ID = TOKEN_IDS.EARLY_SUPPORTER_NFT;

export const EARLY_SUPPORTER_TREASURY = EARLY_SUPPORTER_TREASURY_ACCOUNT_ID;

/** Display name */
export const EARLY_SUPPORTER_NAME = "WCO Early Supporter";

/** Public Supabase Storage media (permanent HTTPS — use for mint metadata). */
export const EARLY_SUPPORTER_THUMBNAIL_URL =
  "https://wotsoauebnoyvegcvouo.supabase.co/storage/v1/object/public/NFT's/WCO%20EARLY%20SUPPORTER%20thumbnail.jpg";

export const EARLY_SUPPORTER_ANIMATION_URL =
  "https://wotsoauebnoyvegcvouo.supabase.co/storage/v1/object/public/NFT's/WCO%20EARLY%20SUPPORTER.mp4";

/** Public metadata JSON (on-chain URI target after mint). */
export const EARLY_SUPPORTER_METADATA_URI =
  "https://wotsoauebnoyvegcvouo.supabase.co/storage/v1/object/public/NFT's/early-supporter.json";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface EarlySupporterMetadata {
  name: string;
  image: string;
  animation_url: string;
}

export interface EarlySupporterClaimRecord {
  accountId: string;
  serial: number;
  claimedAt: string;
  mode: "mock" | "hts";
  tokenId: string | null;
  txId: string | null;
  metadata: EarlySupporterMetadata;
  walletProvider?: string;
}

export interface EarlySupporterStatus {
  enabled: boolean;
  mintEnabled: boolean;
  mode: "mock" | "hts" | "disabled";
  claimedCount: number;
  maxSupply: number;
  remaining: number;
  soldOut: boolean;
  treasuryAccountId: string;
  tokenId: string | null;
}

export interface EarlySupporterEligibility {
  eligible: boolean;
  reason: string | null;
  code:
    | "OK"
    | "ALREADY_CLAIMED"
    | "SOLD_OUT"
    | "FEATURE_DISABLED"
    | "SESSION_REQUIRED"
    | "ACTIVITY_REQUIRED"
    | string;
  claimed: boolean;
  claim: EarlySupporterClaimRecord | null;
  claimedCount: number;
  maxSupply: number;
  remaining: number;
}

export interface EarlySupporterClaimResult {
  claim: EarlySupporterClaimRecord;
  claimedCount: number;
  remaining: number;
}

// ---------------------------------------------------------------------------
// Local mock store (DEV + VITE_EARLY_SUPPORTER_LOCAL_MOCK)
// ---------------------------------------------------------------------------

const LS_KEY = "wco:early-supporter:v1";

interface LocalStore {
  claims: Record<string, EarlySupporterClaimRecord>;
  count: number;
}

function emptyStore(): LocalStore {
  return { claims: {}, count: 0 };
}

function readStore(): LocalStore {
  if (typeof window === "undefined") return emptyStore();
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as LocalStore;
    if (!parsed || typeof parsed !== "object") return emptyStore();
    return {
      claims: parsed.claims && typeof parsed.claims === "object" ? parsed.claims : {},
      count: typeof parsed.count === "number" ? parsed.count : 0,
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(store: LocalStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(store));
}

function buildMetadata(): EarlySupporterMetadata {
  return {
    name: EARLY_SUPPORTER_NAME,
    image: EARLY_SUPPORTER_THUMBNAIL_URL,
    animation_url: EARLY_SUPPORTER_ANIMATION_URL,
  };
}

export function localMockStatus(): EarlySupporterStatus {
  const store = readStore();
  const remaining = Math.max(0, EARLY_SUPPORTER_MAX_SUPPLY - store.count);
  return {
    enabled: true,
    mintEnabled: false,
    mode: "mock",
    claimedCount: store.count,
    maxSupply: EARLY_SUPPORTER_MAX_SUPPLY,
    remaining,
    soldOut: remaining === 0,
    treasuryAccountId: EARLY_SUPPORTER_TREASURY,
    tokenId: EARLY_SUPPORTER_TOKEN_ID,
  };
}

export function localMockEligibility(accountId: string): EarlySupporterEligibility {
  if (!accountId) {
    return {
      eligible: false,
      reason: "Connect a wallet to claim.",
      code: "SESSION_REQUIRED",
      claimed: false,
      claim: null,
      claimedCount: 0,
      maxSupply: EARLY_SUPPORTER_MAX_SUPPLY,
      remaining: EARLY_SUPPORTER_MAX_SUPPLY,
    };
  }
  const store = readStore();
  const existing = store.claims[accountId] ?? null;
  const remaining = Math.max(0, EARLY_SUPPORTER_MAX_SUPPLY - store.count);
  if (existing) {
    return {
      eligible: false,
      reason: "This wallet already claimed an Early Supporter NFT.",
      code: "ALREADY_CLAIMED",
      claimed: true,
      claim: existing,
      claimedCount: store.count,
      maxSupply: EARLY_SUPPORTER_MAX_SUPPLY,
      remaining,
    };
  }
  if (remaining === 0) {
    return {
      eligible: false,
      reason: "All 5,000 Early Supporter NFTs have been claimed.",
      code: "SOLD_OUT",
      claimed: false,
      claim: null,
      claimedCount: store.count,
      maxSupply: EARLY_SUPPORTER_MAX_SUPPLY,
      remaining: 0,
    };
  }
  return {
    eligible: true,
    reason: null,
    code: "OK",
    claimed: false,
    claim: null,
    claimedCount: store.count,
    maxSupply: EARLY_SUPPORTER_MAX_SUPPLY,
    remaining,
  };
}

export function localMockClaim(
  accountId: string,
  walletProvider?: string,
): { ok: true; data: EarlySupporterClaimResult } | { ok: false; error: string; code: string } {
  if (!accountId) {
    return { ok: false, error: "Wallet required", code: "SESSION_REQUIRED" };
  }
  const store = readStore();
  if (store.claims[accountId]) {
    return {
      ok: false,
      error: "This wallet already claimed an Early Supporter NFT.",
      code: "ALREADY_CLAIMED",
    };
  }
  if (store.count >= EARLY_SUPPORTER_MAX_SUPPLY) {
    return {
      ok: false,
      error: "All 5,000 Early Supporter NFTs have been claimed.",
      code: "SOLD_OUT",
    };
  }
  const serial = store.count + 1;
  const claim: EarlySupporterClaimRecord = {
    accountId,
    serial,
    claimedAt: new Date().toISOString(),
    mode: "mock",
    tokenId: EARLY_SUPPORTER_TOKEN_ID,
    txId: null,
    metadata: buildMetadata(),
    walletProvider,
  };
  store.claims[accountId] = claim;
  store.count = serial;
  writeStore(store);
  return {
    ok: true,
    data: {
      claim,
      claimedCount: store.count,
      remaining: Math.max(0, EARLY_SUPPORTER_MAX_SUPPLY - store.count),
    },
  };
}

/** DEV-only: clear one account's local mock claim (and decrement count). */
export function localMockResetClaim(accountId: string): boolean {
  if (!import.meta.env.DEV) return false;
  const store = readStore();
  if (!store.claims[accountId]) return false;
  delete store.claims[accountId];
  store.count = Math.max(0, store.count - 1);
  writeStore(store);
  return true;
}

/** DEV-only: wipe entire local mock store. */
export function localMockResetAll(): void {
  if (!import.meta.env.DEV) return;
  if (typeof window === "undefined") return;
  localStorage.removeItem(LS_KEY);
}
