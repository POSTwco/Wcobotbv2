/**
 * Magic Hedera signing helpers
 * ============================
 * Message signing + on-chain Transaction sign/execute via MagicWallet.
 * Private keys never enter this module — Magic’s TEE signs.
 */

import { Transaction } from "@hashgraph/sdk";
import { getMagic } from "./magic-client";
import { createMagicWallet } from "./magic-hedera-signer";

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

/**
 * Sign an arbitrary UTF-8 message with the Magic Hedera key.
 * Returns base64 signature suitable for existing vote/chat APIs.
 */
export async function magicSignMessage(message: string): Promise<string | null> {
  const magic = getMagic();
  if (!magic) return null;

  try {
    const result = await magic.hedera.sign(message);
    if (!result) return null;

    // Magic may return Uint8Array, hex string, base64, or SignatureMap-like object
    if (typeof result === "string") {
      return result;
    }
    if (result instanceof Uint8Array) {
      return toBase64(result);
    }
    if (result?.signatureMap && typeof result.signatureMap === "string") {
      return result.signatureMap;
    }
    if (result?.signature && typeof result.signature === "string") {
      return result.signature;
    }
    if (ArrayBuffer.isView(result)) {
      return toBase64(new Uint8Array(result.buffer, result.byteOffset, result.byteLength));
    }

    // Last resort: JSON → base64 of UTF-8
    const json = JSON.stringify(result);
    return btoa(json);
  } catch (err) {
    console.error("[MagicWallet] signMessage failed:", err);
    return null;
  }
}

export async function magicGetPublicKeyDer(): Promise<string | null> {
  const magic = getMagic();
  if (!magic) return null;
  try {
    const { publicKeyDer } = await magic.hedera.getPublicKey();
    return publicKeyDer || null;
  } catch (err) {
    console.error("[MagicWallet] getPublicKey failed:", err);
    return null;
  }
}

export async function magicGetDidToken(): Promise<string | null> {
  const magic = getMagic();
  if (!magic) return null;
  try {
    return await magic.user.getIdToken();
  } catch (err) {
    console.error("[MagicWallet] getIdToken failed:", err);
    return null;
  }
}

export async function magicIsLoggedIn(): Promise<boolean> {
  const magic = getMagic();
  if (!magic) return false;
  try {
    return await magic.user.isLoggedIn();
  } catch {
    return false;
  }
}

export async function magicLogout(): Promise<void> {
  const magic = getMagic();
  if (!magic) return;
  try {
    await magic.user.logout();
  } catch (err) {
    console.warn("[MagicWallet] logout:", err);
  }
}

/**
 * Open Magic’s Hedera private-key reveal UI.
 *
 * Security: Magics shows the key only inside its own modal. We intentionally
 * discard any return value and never assign it to React state, storage, or logs.
 * Callers must show HashPack-style disclaimers before invoking this.
 */
export async function magicRevealHederaPrivateKey(): Promise<{ ok: true } | { ok: false; error: string }> {
  const magic = getMagic();
  if (!magic) {
    return { ok: false, error: "Magic is not available in this environment." };
  }

  try {
    const loggedIn = await magic.user.isLoggedIn();
    if (!loggedIn) {
      return { ok: false, error: "Sign in with email first to export your key." };
    }
  } catch {
    return { ok: false, error: "Could not verify Magic session. Sign in again." };
  }

  try {
    // Do not capture a key string — revealPrivateKey opens Magic UI only.
    await magic.hedera.revealPrivateKey();
    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error && err.message
        ? err.message
        : "Key reveal was cancelled or failed.";
    // Log only a generic failure — never dump err objects that might embed secrets
    console.warn("[MagicWallet] revealPrivateKey failed or cancelled");
    return { ok: false, error: message.slice(0, 180) };
  }
}

function magicTxErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const lower = raw.toLowerCase();
  if (
    lower.includes("insufficient") ||
    lower.includes("payer balance") ||
    lower.includes("busy") && lower.includes("balance")
  ) {
    return "Not enough HBAR to pay network fees. Fund this account with a little HBAR, then try again.";
  }
  if (lower.includes("user denied") || lower.includes("cancel") || lower.includes("rejected")) {
    return "Signature cancelled.";
  }
  return (raw || "Magic transaction signing failed.").slice(0, 200);
}

/**
 * Sign Hedera transaction bytes with the Magic-embedded key (no submit).
 * Matches wallet-context `signTransaction` return shape.
 */
export async function magicSignTransactionBytes(
  accountId: string,
  transactionBytes: Uint8Array
): Promise<Uint8Array | null> {
  const wallet = await createMagicWallet(accountId);
  if (!wallet) {
    console.warn("[MagicWallet] signTransaction: no Magic wallet session");
    return null;
  }

  try {
    let tx = Transaction.fromBytes(transactionBytes);
    const frozen = typeof (tx as { isFrozen?: () => boolean }).isFrozen === "function"
      ? (tx as { isFrozen: () => boolean }).isFrozen()
      : false;
    if (!frozen) {
      tx = await tx.freezeWithSigner(wallet);
    }
    tx = await tx.signWithSigner(wallet);
    return tx.toBytes();
  } catch (err) {
    console.warn("[MagicWallet] signTransaction failed:", magicTxErrorMessage(err));
    throw new Error(magicTxErrorMessage(err));
  }
}

/**
 * Sign and submit Hedera transaction bytes via MagicWallet.
 * Returns signed transaction bytes after a successful execute (same shape as WC).
 */
export async function magicSignAndExecuteTransactionBytes(
  accountId: string,
  transactionBytes: Uint8Array
): Promise<Uint8Array | null> {
  const wallet = await createMagicWallet(accountId);
  if (!wallet) {
    console.warn("[MagicWallet] signAndExecute: no Magic wallet session");
    return null;
  }

  try {
    let tx = Transaction.fromBytes(transactionBytes);
    const frozen = typeof (tx as { isFrozen?: () => boolean }).isFrozen === "function"
      ? (tx as { isFrozen: () => boolean }).isFrozen()
      : false;
    if (!frozen) {
      tx = await tx.freezeWithSigner(wallet);
    }
    tx = await tx.signWithSigner(wallet);
    const response = await tx.executeWithSigner(wallet);
    // Wait for receipt so callers know the tx landed (or throw on status failure)
    await response.getReceiptWithSigner(wallet);
    return tx.toBytes();
  } catch (err) {
    console.warn("[MagicWallet] signAndExecute failed:", magicTxErrorMessage(err));
    throw new Error(magicTxErrorMessage(err));
  }
}
