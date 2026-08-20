/**
 * Magic SDK singleton — Hedera embedded wallet (Create Account path)
 * ==================================================================
 * Only initialized when VITE_MAGIC_ENABLED=true and publishable key is set.
 * HashPack / WalletConnect path does not use this module.
 */

import { Magic } from "magic-sdk";
import { HederaExtension } from "@magic-ext/hedera";
import {
  getMagicHederaNetwork,
  getMagicPublishableKey,
  isMagicEnabled,
} from "./wallet-types";

type MagicWithHedera = Magic & {
  hedera: {
    getPublicKey: () => Promise<{ publicKeyDer: string }>;
    sign: (message: string | Uint8Array) => Promise<any>;
  };
};

let magicInstance: MagicWithHedera | null = null;

export function canUseMagic(): boolean {
  return isMagicEnabled() && !!getMagicPublishableKey();
}

export function getMagic(): MagicWithHedera | null {
  if (!canUseMagic()) return null;
  if (magicInstance) return magicInstance;

  const key = getMagicPublishableKey()!;
  const network = getMagicHederaNetwork();

  magicInstance = new Magic(key, {
    extensions: [
      new HederaExtension({
        network,
      }),
    ],
  }) as MagicWithHedera;

  return magicInstance;
}
