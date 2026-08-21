/**
 * Wallet provider kinds for dual-path onboarding (HashPack WC + Magic).
 * Additive — HashPack remains the legacy / existing-wallet path.
 */

export type WalletProviderKind = "hashpack" | "magic";

/** @deprecated Google/Apple removed from WCO Magic path — email OTP only */
export type MagicLoginMethod = "email";

/** Feature flag — when false, Connect behaves exactly as pre-Magic (WC only). */
export function isMagicEnabled(): boolean {
  try {
    return String(import.meta.env.VITE_MAGIC_ENABLED || "").toLowerCase() === "true";
  } catch {
    return false;
  }
}

export function getMagicPublishableKey(): string | null {
  try {
    const key = String(import.meta.env.VITE_MAGIC_PUBLISHABLE_KEY || "")
      .trim()
      .replace(/^["']|["']$/g, "")
      .trim();
    return key || null;
  } catch {
    return null;
  }
}

export function getMagicHederaNetwork(): "mainnet" | "testnet" {
  try {
    const n = String(import.meta.env.VITE_HEDERA_NETWORK || "mainnet").toLowerCase();
    return n === "testnet" ? "testnet" : "mainnet";
  } catch {
    return "mainnet";
  }
}

export const MAGIC_STORAGE = {
  provider: "wcoWalletProvider",
  accountId: "wcoMagicAccountId",
  sessionToken: "wcoWalletSessionToken",
} as const;
