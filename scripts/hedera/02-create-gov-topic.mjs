/**
 * Create private HCS governance topic (submit key required).
 *
 * Usage: node scripts/hedera/02-create-gov-topic.mjs
 */
import { TopicCreateTransaction, Hbar } from "@hashgraph/sdk";
import { loadHederaEnv, optionalEnv } from "./lib/env.mjs";
import { buildClient, parseOrGenerateKey } from "./lib/client.mjs";

async function main() {
  const env = loadHederaEnv();
  const { client, network, operatorKey, close } = buildClient(env, "operator");

  const submitKey = parseOrGenerateKey(
    optionalEnv(env, "HCS_SUBMIT_PRIVATE_KEY"),
    "HCS_SUBMIT",
    ".generated-submit-key.local",
  );
  const adminKey = parseOrGenerateKey(
    optionalEnv(env, "HCS_ADMIN_PRIVATE_KEY"),
    "HCS_ADMIN",
    ".generated-admin-key.local",
  );

  console.log(`[02] Network: ${network}`);
  console.log("[02] Creating private governance topic...");

  try {
    const tx = await new TopicCreateTransaction()
      .setTopicMemo("WCO governance proposals+votes v1")
      .setSubmitKey(submitKey.publicKey)
      .setAdminKey(adminKey.publicKey)
      .setMaxTransactionFee(new Hbar(20))
      .freezeWith(client);

    const signed = await (await tx.sign(operatorKey)).sign(adminKey);
    // Admin key must sign when set at create
    const sub = await signed.execute(client);
    const rx = await sub.getReceipt(client);
    const topicId = rx.topicId;
    if (!topicId) throw new Error("No topicId in receipt");

    console.log(`[02] PUBLIC HCS_GOV_TOPIC_ID=${topicId.toString()}`);
    console.log(
      `https://hashscan.io/${network}/topic/${topicId.toString()}`,
    );
    console.log(
      "[02] Store submit private key in password manager / Supabase (operator mode only).",
    );
  } finally {
    close();
  }
}

main().catch((err) => {
  console.error("[02] FAILED:", err?.message || err);
  process.exit(1);
});
