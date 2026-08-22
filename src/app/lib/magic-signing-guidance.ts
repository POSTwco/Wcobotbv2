/**
 * User guidance for Magic wallet signing outcomes.
 * Magic email wallets can sign messages and on-chain txs on-site.
 * HashPack import remains an optional self-custody / backup path.
 *
 * Security: never include private keys, DIDs, or account secrets in toasts.
 */

import { toast } from "sonner";

const MANAGE_ASSETS_PATH = "/wallet/assets#export";

/**
 * Toast when a Magic on-chain sign/execute fails (balance, cancel, network).
 */
export function notifyMagicTxFailure(detail?: string): void {
  const description =
    detail?.trim() ||
    "Approve the Magic prompt, and keep a little HBAR in this account for network fees.";

  toast.error("Could not complete Magic transaction", {
    description: description.slice(0, 220),
    duration: 10_000,
    action: {
      label: "Manage Assets",
      onClick: () => {
        try {
          window.location.assign("/wallet/assets");
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

/** Provider-aware cancel copy for vote / challenge signatures. */
export function signatureCancelledMessage(provider: string | null | undefined): string {
  if (provider === "magic") {
    return "Signature cancelled. Approve the Magic prompt to continue.";
  }
  return "Signature cancelled. Approve in HashPack to continue.";
}

/** Provider-aware “check your wallet” toast while waiting for a signature. */
export function signaturePromptMessage(
  provider: string | null | undefined,
  action = "approve the signature"
): string {
  if (provider === "magic") {
    return `Approve the Magic prompt to ${action}.`;
  }
  return `Check your HashPack wallet and ${action}.`;
}
