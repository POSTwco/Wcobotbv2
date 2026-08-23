/**
 * Create Admin NFT collection (max supply 2) and mint serials 1–2 to treasury.
 *
 * Requires local scripts/hedera/.env.hedera with TREASURY_ACCOUNT_ID + TREASURY_PRIVATE_KEY.
 * Prints PUBLIC token id only.
 *
 * Usage: node scripts/hedera/01-create-admin-nft.mjs
 */
import {
  TokenCreateTransaction,
  TokenType,
  TokenSupplyType,
  TokenMintTransaction,
  Hbar,
} from "@hashgraph/sdk";
import { loadHederaEnv, requireEnv } from "./lib/env.mjs";
import { buildClient } from "./lib/client.mjs";

async function main() {
  const env = loadHederaEnv();
  const treasuryId = requireEnv(env, "TREASURY_ACCOUNT_ID");
  const { client, network, operatorId, operatorKey, close } = buildClient(
    env,
    "treasury",
  );

  console.log(`[01] Network: ${network}`);
  console.log(`[01] Operator/Treasury: ${operatorId.toString()}`);
  console.log(`[01] Creating Admin NFT (max supply 2)...`);

  try {
    const createTx = await new TokenCreateTransaction()
      .setTokenName("WCO Governance Admin")
      .setTokenSymbol("WCOADM")
      .setTokenType(TokenType.NonFungibleUnique)
      .setDecimals(0)
      .setInitialSupply(0)
      .setMaxSupply(2)
      .setSupplyType(TokenSupplyType.Finite)
      .setTreasuryAccountId(operatorId)
      .setSupplyKey(operatorKey.publicKey)
      .setAdminKey(operatorKey.publicKey)
      // Freeze key optional — freeze after mint via separate ops if desired
      .setFreezeDefault(false)
      .setMaxTransactionFee(new Hbar(30))
      .freezeWith(client);

    const createSigned = await createTx.sign(operatorKey);
    const createSub = await createSigned.execute(client);
    const createRx = await createSub.getReceipt(client);
    const tokenId = createRx.tokenId;
    if (!tokenId) throw new Error("TokenCreate returned no tokenId");

    console.log(`[01] PUBLIC Admin NFT token id: ${tokenId.toString()}`);
    console.log(
      `[01] Explorer: https://hashscan.io/${network}/token/${tokenId.toString()}`,
    );

    // Mint 2 NFTs (empty metadata placeholders — update later if needed)
    const mintTx = await new TokenMintTransaction()
      .setTokenId(tokenId)
      .setMetadata([
        Buffer.from("WCO-ADMIN-1"),
        Buffer.from("WCO-ADMIN-2"),
      ])
      .setMaxTransactionFee(new Hbar(20))
      .freezeWith(client);

    const mintSigned = await mintTx.sign(operatorKey);
    const mintSub = await mintSigned.execute(client);
    const mintRx = await mintSub.getReceipt(client);
    const serials = mintRx.serials?.map((s) => s.toString()) ?? [];
    console.log(`[01] Minted serials: ${serials.join(", ") || "1,2"}`);
    console.log(
      `[01] NFTs held by treasury ${treasuryId}. Record ADMIN_NFT_TOKEN_ID=${tokenId.toString()} in ops sheet + secrets.`,
    );
    console.log(
      "[01] Next: set ADMIN_NFT_TOKEN_ID in .env.hedera and run 02-create-gov-topic.mjs",
    );
  } finally {
    close();
  }
}

main().catch((err) => {
  console.error("[01] FAILED:", err?.message || err);
  process.exit(1);
});
