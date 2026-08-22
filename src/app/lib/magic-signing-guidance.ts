/**
 * User guidance when a Magic-only session needs HashPack for on-chain txs.
 * Message signing (votes / chat) still works via Magic — this is for HTS /
 * WalletConnect transaction methods only.
 *
 * Security: never include private keys, DIDs, or account secrets in toasts.
 */

import { toast } from "sonner";

export const MAGIC_NEEDS_HASHPACK_TITLE = "HashPack required to sign this transaction";

export const MAGIC_NEEDS_HASHPACK_DESCRIPTION =
  "Install HashPack, then import THIS account’s private key from Manage Assets. Do not sign in to HashPack with the same email — that creates a different wallet.";

const MANAGE_ASSETS_PATH = "/wallet/assets#export";

/**
 * Show a durable toast directing Magic users to export → HashPack import.
 * Safe to call from wallet-context (no router required).
 */
export function notifyMagicNeedsHashPackForTx(): void {
  toast.message(MAGIC_NEEDS_HASHPACK_TITLE, {
    description: MAGIC_NEEDS_HASHPACK_DESCRIPTION,
    duration: 12_000,
    action: {
      label: "Manage Assets",
      onClick: () => {
        try {
          window.location.assign(MANAGE_ASSETS_PATH);
        } catch {
          /* ignore */
        }
      },
    },
  });
}

export function getManageAssetsExportPath(): string {
  return MANAGE_ASSETS_PATH;
}
