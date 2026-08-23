/**
 * Create private HCS audit topic for proposal submission forensics.
 *
 * Usage: node scripts/hedera/03-create-audit-topic.mjs
 */
import { TopicCreateTransaction, Hbar } from "@hashgraph/sdk";
import { loadHederaEnv, optionalEnv } from "./lib/env.mjs";
import { buildClient, parseOrGenerateKey } from "./lib/client.mjs";

async function main() {
  const env = loadHederaEnv();
  const { client, network, operatorKey, close } = buildClient(env, "operator");

  // Reuse same submit/admin keys if already set — preferred for ops simplicity
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

  console.log(`[03] Network: ${network}`);
  console.log("[03] Creating private audit topic...");

  try {
    const tx = await new TopicCreateTransaction()
      .setTopicMemo("WCO governance audit v1")
      .setSubmitKey(submitKey.publicKey)
      .setAdminKey(adminKey.publicKey)
      .setMaxTransactionFee(new Hbar(20))
      .freezeWith(client);

    const signed = await (await tx.sign(operatorKey)).sign(adminKey);
    const sub = await signed.execute(client);
    const rx = await sub.getReceipt(client);
    const topicId = rx.topicId;
    if (!topicId) throw new Error("No topicId in receipt");

    console.log(`[03] PUBLIC HCS_AUDIT_TOPIC_ID=${topicId.toString()}`);
    console.log(
      `https://hashscan.io/${network}/topic/${topicId.toString()}`,
    );
  } finally {
    close();
  }
}

main().catch((err) => {
  console.error("[03] FAILED:", err?.message || err);
  process.exit(1);
});
