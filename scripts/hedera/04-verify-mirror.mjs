/**
 * Public Mirror Node smoke check — no private keys required.
 *
 * Usage: node scripts/hedera/04-verify-mirror.mjs
 */
import { loadHederaEnv, optionalEnv } from "./lib/env.mjs";
import { networkFromEnv } from "./lib/client.mjs";

function mirrorBase(network) {
  return network === "mainnet"
    ? "https://mainnet.mirrornode.hedera.com"
    : "https://testnet.mirrornode.hedera.com";
}

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`${res.status} ${url} — ${t.slice(0, 200)}`);
  }
  return res.json();
}

async function main() {
  const env = loadHederaEnv();
  const network = networkFromEnv(env);
  const base = mirrorBase(network);

  const treasury = optionalEnv(env, "TREASURY_ACCOUNT_ID");
  const tokenId = optionalEnv(env, "ADMIN_NFT_TOKEN_ID");
  const govTopic = optionalEnv(env, "HCS_GOV_TOPIC_ID");
  const auditTopic = optionalEnv(env, "HCS_AUDIT_TOPIC_ID");

  console.log(`[04] Network: ${network}`);
  console.log(`[04] Mirror: ${base}`);

  if (treasury) {
    const acc = await getJson(`${base}/api/v1/accounts/${treasury}`);
    console.log(
      `[04] Treasury ${treasury} exists; balance tinybars=${acc.balance?.balance ?? "?"}`,
    );
  } else {
    console.log("[04] Skip treasury (TREASURY_ACCOUNT_ID not set)");
  }

  if (treasury && tokenId) {
    const nfts = await getJson(
      `${base}/api/v1/accounts/${treasury}/nfts?token.id=${tokenId}&limit=10`,
    );
    const list = nfts.nfts || [];
    console.log(
      `[04] Admin NFTs on treasury: ${list.length} (serials: ${list.map((n) => n.serial_number).join(", ") || "none"})`,
    );
    if (list.length < 1) {
      console.warn("[04] WARNING: treasury holds 0 Admin NFTs for token");
    }
  }

  for (const [label, id] of [
    ["gov", govTopic],
    ["audit", auditTopic],
  ]) {
    if (!id) {
      console.log(`[04] Skip ${label} topic (not set)`);
      continue;
    }
    const topic = await getJson(`${base}/api/v1/topics/${id}`);
    console.log(
      `[04] Topic ${label} ${id} memo=${JSON.stringify(topic.memo || "")}`,
    );
    const msgs = await getJson(
      `${base}/api/v1/topics/${id}/messages?limit=5&order=desc`,
    );
    console.log(
      `[04] Topic ${label} recent messages: ${(msgs.messages || []).length}`,
    );
  }

  console.log("[04] Mirror verify complete.");
}

main().catch((err) => {
  console.error("[04] FAILED:", err?.message || err);
  process.exit(1);
});
