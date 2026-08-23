/**
 * Batch-mint Early Supporter NFTs into the treasury/resolver wallet.
 *
 * Mints in chunks (default 10 metadata entries per TokenMint — Hedera limit).
 * All serials stay in TREASURY_ACCOUNT_ID until the claim API transfers them.
 *
 * LOCAL ONLY — scripts/hedera/.env.hedera:
 *   EARLY_SUPPORTER_NFT_TOKEN_ID=0.0.x
 *   EARLY_SUPPORTER_METADATA_URI=https://…/early-supporter.json   (public HTTPS or ipfs://)
 *   TREASURY_ACCOUNT_ID + TREASURY_PRIVATE_KEY
 *
 * Optional:
 *   EARLY_SUPPORTER_MINT_TOTAL=5000   (default 5000)
 *   EARLY_SUPPORTER_MINT_START=1      (1-based next serial to mint; for resume)
 *   EARLY_SUPPORTER_MINT_CHUNK=10
 *
 * Usage:
 *   node scripts/hedera/07-mint-early-supporter-batch.mjs --dry-run
 *   node scripts/hedera/07-mint-early-supporter-batch.mjs --count 10
 *   node scripts/hedera/07-mint-early-supporter-batch.mjs
 *
 * WARNING: Full 5,000 mint on mainnet spends real HBAR. Start with --count 10.
 */
import { TokenMintTransaction, TokenId, Hbar, Status } from "@hashgraph/sdk";
import { loadHederaEnv, requireEnv, optionalEnv } from "./lib/env.mjs";
import { buildClient } from "./lib/client.mjs";

const DEFAULT_TOTAL = 5_000;
const DEFAULT_CHUNK = 10;

function argValue(name) {
  const i = process.argv.indexOf(name);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return undefined;
}

const DRY = process.argv.includes("--dry-run");

async function main() {
  const env = loadHederaEnv();
  const tokenIdStr = requireEnv(env, "EARLY_SUPPORTER_NFT_TOKEN_ID");
  const metadataUri = requireEnv(env, "EARLY_SUPPORTER_METADATA_URI");
  if (!/^https?:\/\//i.test(metadataUri) && !metadataUri.startsWith("ipfs://")) {
    throw new Error(
      "EARLY_SUPPORTER_METADATA_URI must be https:// or ipfs:// (public, permanent preferred)",
    );
  }

  const total = Number(
    argValue("--count") ||
      optionalEnv(env, "EARLY_SUPPORTER_MINT_TOTAL") ||
      DEFAULT_TOTAL,
  );
  const startSerial = Number(
    optionalEnv(env, "EARLY_SUPPORTER_MINT_START") || "1",
  );
  const chunk = Math.min(
    10,
    Math.max(
      1,
      Number(optionalEnv(env, "EARLY_SUPPORTER_MINT_CHUNK") || DEFAULT_CHUNK),
    ),
  );

  if (!Number.isFinite(total) || total < 1 || total > DEFAULT_TOTAL) {
    throw new Error(`--count / MINT_TOTAL must be 1…${DEFAULT_TOTAL}`);
  }

  const { client, network, operatorId, operatorKey, close } = buildClient(
    env,
    "treasury",
  );
  const tokenId = TokenId.fromString(tokenIdStr);
  const metaBytes = Buffer.from(metadataUri, "utf8");

  console.log(`[07] Network: ${network}`);
  console.log(`[07] Treasury: ${operatorId.toString()}`);
  console.log(`[07] Token: ${tokenIdStr}`);
  console.log(`[07] Metadata URI: ${metadataUri}`);
  console.log(
    `[07] Will mint ${total} NFT(s) in chunks of ${chunk} (start serial hint: ${startSerial})`,
  );

  if (DRY) {
    console.log("[07] DRY RUN — no mint submitted.");
    close();
    return;
  }

  if (network === "mainnet" && total > 10) {
    console.log(
      `[07] MAINNET mint of ${total} — Ctrl+C within 8s to abort…`,
    );
    await new Promise((r) => setTimeout(r, 8000));
  }

  let minted = 0;
  const allSerials = [];

  try {
    while (minted < total) {
      const n = Math.min(chunk, total - minted);
      const metas = Array.from({ length: n }, () => metaBytes);

      const mintTx = await new TokenMintTransaction()
        .setTokenId(tokenId)
        .setMetadata(metas)
        .setMaxTransactionFee(new Hbar(40))
        .freezeWith(client);

      const signed = await mintTx.sign(operatorKey);
      const sub = await signed.execute(client);
      const rx = await sub.getReceipt(client);
      if (rx.status !== Status.Success) {
        throw new Error(`Mint chunk failed: ${rx.status}`);
      }
      const serials = (rx.serials || []).map((s) => s.toString());
      allSerials.push(...serials);
      minted += n;
      console.log(
        `[07] Minted chunk +${n} (total ${minted}/${total}) serials: ${serials.join(", ")}`,
      );
      // Gentle pacing to avoid node busy
      await new Promise((r) => setTimeout(r, 400));
    }

    console.log(`[07] DONE. Minted ${minted} NFTs to ${operatorId.toString()}`);
    console.log(
      `[07] Serial range (approx): ${allSerials[0] || "?"} … ${allSerials[allSerials.length - 1] || "?"}`,
    );
    console.log(
      "[07] Next: verify on HashScan, then wire Edge auto-transfer (staging flags) — do NOT enable www yet.",
    );
  } finally {
    close();
  }
}

main().catch((err) => {
  console.error("[07] FAILED:", err?.message || err);
  process.exit(1);
});
