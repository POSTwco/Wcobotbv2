/**
 * Magic on-chain Hedera tx sign / execute (lazy-loaded)
 * =====================================================
 * Intentionally separate from magic-wallet.ts so the main SPA chunk does not
 * pull `@hashgraph/sdk` or MagicWallet until a Magic user actually signs a
 * transaction. HashPack continues to use WalletConnect only.
 */

function magicTxErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const lower = raw.toLowerCase();
  if (
    lower.includes("insufficient") ||
    lower.includes("payer balance") ||
    (lower.includes("busy") && lower.includes("balance"))
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
 * Dynamically loads @hashgraph/sdk + MagicWallet on first call.
 */
export async function magicSignTransactionBytes(
  accountId: string,
  transactionBytes: Uint8Array
): Promise<Uint8Array | null> {
  const [{ Transaction }, { createMagicWallet }] = await Promise.all([
    import("@hashgraph/sdk"),
    import("./magic-hedera-signer"),
  ]);

  const wallet = await createMagicWallet(accountId);
  if (!wallet) {
    console.warn("[MagicTx] signTransaction: no Magic wallet session");
    return null;
  }

  try {
    let tx = Transaction.fromBytes(transactionBytes);
    const frozen =
      typeof (tx as { isFrozen?: () => boolean }).isFrozen === "function"
        ? (tx as { isFrozen: () => boolean }).isFrozen()
        : false;
    if (!frozen) {
      tx = await tx.freezeWithSigner(wallet);
    }
    tx = await tx.signWithSigner(wallet);
    return tx.toBytes();
  } catch (err) {
    console.warn("[MagicTx] signTransaction failed:", magicTxErrorMessage(err));
    throw new Error(magicTxErrorMessage(err));
  }
}

/**
 * Sign and submit Hedera transaction bytes via MagicWallet.
 * Dynamically loads @hashgraph/sdk + MagicWallet on first call.
 */
export async function magicSignAndExecuteTransactionBytes(
  accountId: string,
  transactionBytes: Uint8Array
): Promise<Uint8Array | null> {
  const [{ Transaction }, { createMagicWallet }] = await Promise.all([
    import("@hashgraph/sdk"),
    import("./magic-hedera-signer"),
  ]);

  const wallet = await createMagicWallet(accountId);
  if (!wallet) {
    console.warn("[MagicTx] signAndExecute: no Magic wallet session");
    return null;
  }

  try {
    let tx = Transaction.fromBytes(transactionBytes);
    const frozen =
      typeof (tx as { isFrozen?: () => boolean }).isFrozen === "function"
        ? (tx as { isFrozen: () => boolean }).isFrozen()
        : false;
    if (!frozen) {
      tx = await tx.freezeWithSigner(wallet);
    }
    tx = await tx.signWithSigner(wallet);
    const response = await tx.executeWithSigner(wallet);
    await response.getReceiptWithSigner(wallet);
    return tx.toBytes();
  } catch (err) {
    console.warn("[MagicTx] signAndExecute failed:", magicTxErrorMessage(err));
    throw new Error(magicTxErrorMessage(err));
  }
}
