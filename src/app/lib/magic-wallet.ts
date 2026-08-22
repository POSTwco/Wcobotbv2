/**
 * Magic Hedera signing helpers (lightweight)
 * ==========================================
 * Message signing, DID, reveal — no @hashgraph/sdk.
 * On-chain tx sign/execute lives in magic-tx.ts and is lazy-loaded.
 * Private keys never enter this module — Magic’s TEE signs.
 */

import { getMagic } from "./magic-client";

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function utf8ToBytes(message: string): Uint8Array {
  return new TextEncoder().encode(message);
}

function hexToBytes(hex: string): Uint8Array | null {
  const cleaned = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (!/^[0-9a-fA-F]+$/.test(cleaned) || cleaned.length % 2 !== 0) return null;
  const out = new Uint8Array(cleaned.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(cleaned.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/**
 * Normalize Magic `hedera.sign` output to base64 bytes the gate verifier can parse.
 * Prefer raw 64/65-byte ECDSA (r||s[||v]) or a HIP-820 SignatureMap blob.
 * Never JSON-stringify an object as a “signature”.
 */
function normalizeMagicSignature(result: unknown): string | null {
  if (!result) return null;

  if (result instanceof Uint8Array) {
    return toBase64(result.length === 65 ? result.slice(0, 64) : result);
  }
  if (ArrayBuffer.isView(result)) {
    const view = new Uint8Array(
      (result as ArrayBufferView).buffer,
      (result as ArrayBufferView).byteOffset,
      (result as ArrayBufferView).byteLength
    );
    return toBase64(view.length === 65 ? view.slice(0, 64) : view);
  }

  if (typeof result === "string") {
    const trimmed = result.trim();
    // Already base64 SignatureMap / raw sig (common from HashPack-shaped wallets)
    if (/^[A-Za-z0-9+/]+=*$/.test(trimmed) && trimmed.length >= 44) {
      try {
        atob(trimmed);
        return trimmed;
      } catch {
        /* fall through to hex */
      }
    }
    const asHex = hexToBytes(trimmed);
    if (asHex && (asHex.length === 64 || asHex.length === 65 || asHex.length > 65)) {
      return toBase64(asHex.length === 65 ? asHex.slice(0, 64) : asHex);
    }
    return trimmed.length >= 16 ? trimmed : null;
  }

  const obj = result as {
    signatureMap?: string | Uint8Array;
    signature?: string | Uint8Array;
    sig?: string | Uint8Array;
  };
  if (obj?.signatureMap != null) return normalizeMagicSignature(obj.signatureMap);
  if (obj?.signature != null) return normalizeMagicSignature(obj.signature);
  if (obj?.sig != null) return normalizeMagicSignature(obj.sig);

  console.warn("[MagicWallet] Unrecognized signature shape — refusing to invent bytes");
  return null;
}

/**
 * Sign an arbitrary UTF-8 message with the Magic Hedera key.
 * Returns base64 signature suitable for cali/elite/vote gate verifiers.
 */
export async function magicSignMessage(message: string): Promise<string | null> {
  const magic = getMagic();
  if (!magic) return null;

  try {
    // Extension expects bytes — pass UTF-8 of the challenge string (HIP-820 style)
    const msgBytes = utf8ToBytes(message);
    const result = await magic.hedera.sign(msgBytes);
    const normalized = normalizeMagicSignature(result);
    if (!normalized) {
      console.warn("[MagicWallet] signMessage produced no usable signature");
      return null;
    }
    return normalized;
  } catch (err) {
    // Never log raw Magic payloads — may include sensitive material
    console.warn(
      "[MagicWallet] signMessage failed:",
      err instanceof Error ? err.message.slice(0, 120) : "unknown"
    );
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
    console.warn(
      "[MagicWallet] getPublicKey failed:",
      err instanceof Error ? err.message.slice(0, 120) : "unknown"
    );
    return null;
  }
}

export async function magicGetDidToken(): Promise<string | null> {
  const magic = getMagic();
  if (!magic) return null;
  try {
    return await magic.user.getIdToken();
  } catch {
    console.warn("[MagicWallet] getIdToken failed");
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


