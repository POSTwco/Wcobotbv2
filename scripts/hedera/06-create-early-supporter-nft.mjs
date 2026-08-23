/**
 * Create WCO Early Supporter NFT collection (max supply 5,000).
 * Treasury / resolver wallet receives supply + holds minted serials.
 *
 * LOCAL ONLY — requires scripts/hedera/.env.hedera
 *   HEDERA_NETWORK=mainnet
 *   TREASURY_ACCOUNT_ID=0.0.10821146
 *   TREASURY_PRIVATE_KEY=...   (NEVER commit / never paste in chat)
 *
 * Does NOT mint serials — run 07-mint-early-supporter-batch.mjs after.
 *
 * Usage:
 *   node scripts/hedera/06-create-early-supporter-nft.mjs
 *   node scripts/hedera/06-create-early-supporter-nft.mjs --dry-run
 */
import {
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  Hbar,
} from "@hashgraph/sdk";
import { loadHederaEnv, requireEnv, optionalEnv } from "./lib/env.mjs";
import { buildClient } from "./lib/client.mjs";

const MAX_SUPPLY = 5_000;
const DRY = process.argv.includes("--dry-run");

async function main() {
  const env = loadHederaEnv();
  const treasuryId = requireEnv(env, "TREASURY_ACCOUNT_ID");
  const { client, network, operatorId, operatorKey, close } = buildClient(
    env,
    "treasury",
  );

  console.log(`[06] Network: ${network}`);
  console.log(`[06] Treasury/operator: ${operatorId.toString()}`);
  console.log(`[06] Expected resolver wallet: 0.0.10821146`);
  if (operatorId.toString() !== "0.0.10821146") {
    console.warn(
      `[06] WARNING: TREASURY_ACCOUNT_ID is ${operatorId.toString()}, not 0.0.10821146. Continue only if intentional.`,
    );
  }
  console.log(`[06] Max supply: ${MAX_SUPPLY}`);

  if (DRY) {
    console.log("[06] DRY RUN — no transaction submitted.");
    close();
    return;
  }

  if (network === "mainnet") {
    console.log(
      "[06] MAINNET create — Ctrl+C within 5s to abort…",
    );
    await new Promise((r) => setTimeout(r, 5000));
  }

  try {
    const createTx = await new TokenCreateTransaction()
      .setTokenName("WCO Early Supporter")
      .setTokenSymbol("WCOES")
      .setTokenType(TokenType.NonFungibleUnique)
      .setDecimals(0)
      .setInitialSupply(0)
      .setMaxSupply(MAX_SUPPLY)
      .setSupplyType(TokenSupplyType.Finite)
      .setTreasuryAccountId(operatorId)
      .setSupplyKey(operatorKey.publicKey)
      .setAdminKey(operatorKey.publicKey)
      .setFreezeDefault(false)
      .setMaxTransactionFee(new Hbar(40))
      .freezeWith(client);

    const signed = await createTx.sign(operatorKey);
    const sub = await signed.execute(client);
    const rx = await sub.getReceipt(client);
    const tokenId = rx.tokenId;
    if (!tokenId) throw new Error("TokenCreate returned no tokenId");

    const idStr = tokenId.toString();
    console.log(`[06] PUBLIC Early Supporter token id: ${idStr}`);
    console.log(`[06] Explorer: https://hashscan.io/${network}/token/${idStr}`);
    console.log(`[06] Record in scripts/hedera/.env.hedera:`);
    console.log(`     EARLY_SUPPORTER_NFT_TOKEN_ID=${idStr}`);
    console.log(`[06] Also set (when ready to ship UI):`);
    console.log(`     VITE_EARLY_SUPPORTER_NFT_TOKEN_ID=${idStr}`);
    console.log(
      `[06] Next: host public metadata JSON, set EARLY_SUPPORTER_METADATA_URI, run 07-mint-early-supporter-batch.mjs`,
    );
    void treasuryId;
    void optionalEnv;
  } finally {
    close();
  }
}

main().catch((err) => {
  console.error("[06] FAILED:", err?.message || err);
  process.exit(1);
});
