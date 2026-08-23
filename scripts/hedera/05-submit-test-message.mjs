/**
 * Submit a smoke-test JSON message to the governance topic (operator/submit key).
 *
 * Usage: node scripts/hedera/05-submit-test-message.mjs
 */
import { TopicMessageSubmitTransaction, Hbar } from "@hashgraph/sdk";
import { loadHederaEnv, requireEnv, optionalEnv } from "./lib/env.mjs";
import { buildClient, parseOrGenerateKey } from "./lib/client.mjs";

async function main() {
  const env = loadHederaEnv();
  const topicId = requireEnv(env, "HCS_GOV_TOPIC_ID");
  const { client, network, operatorKey, close } = buildClient(env, "operator");

  const submitKey = parseOrGenerateKey(
    optionalEnv(env, "HCS_SUBMIT_PRIVATE_KEY"),
    "HCS_SUBMIT",
    ".generated-submit-key.local",
  );

  const payload = {
    schemaVersion: 1,
    type: "GOV_AUDIT_V1",
    network,
    createdAt: new Date().toISOString(),
    event: "SMOKE_TEST",
    proposalId: null,
    treasuryAccountId: optionalEnv(env, "TREASURY_ACCOUNT_ID") || null,
    timestamp: new Date().toISOString(),
    submitterSignature: null,
    hcsSequenceHint: null,
    ipHash: null,
    meta: { source: "scripts/hedera/05-submit-test-message.mjs" },
  };

  const body = JSON.stringify(payload);
  console.log(`[05] Network: ${network}`);
  console.log(`[05] Topic: ${topicId}`);
  console.log(`[05] Payload bytes: ${Buffer.byteLength(body, "utf8")}`);

  try {
    const tx = await new TopicMessageSubmitTransaction()
      .setTopicId(topicId)
      .setMessage(body)
      .setMaxTransactionFee(new Hbar(5))
      .freezeWith(client);

    let signed = await tx.sign(operatorKey);
    signed = await signed.sign(submitKey);
    const sub = await signed.execute(client);
    const rx = await sub.getReceipt(client);
    console.log(
      `[05] Submitted. status=${rx.status?.toString?.() || rx.status}`,
    );
    console.log(
      `https://hashscan.io/${network}/topic/${topicId}`,
    );
  } finally {
    close();
  }
}

main().catch((err) => {
  console.error("[05] FAILED:", err?.message || err);
  process.exit(1);
});
