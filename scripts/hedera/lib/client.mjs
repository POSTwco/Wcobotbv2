/**
 * Hedera Client from env — never hardcode keys.
 */
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Client,
  AccountId,
  PrivateKey,
} from "@hashgraph/sdk";
import { requireEnv, optionalEnv } from "./env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * @param {Record<string, string>} env
 */
export function networkFromEnv(env) {
  const n = (env.HEDERA_NETWORK || "testnet").toLowerCase();
  if (n !== "testnet" && n !== "mainnet") {
    throw new Error(`HEDERA_NETWORK must be testnet|mainnet, got: ${n}`);
  }
  if (n === "mainnet") {
    console.warn(
      "[hedera] WARNING: scripts running against MAINNET. Confirm this is intentional.",
    );
  }
  return n;
}

/**
 * Parse Hedera private keys without logging secret material.
 * Tries ECDSA first (common for Magic / EVM-style accounts), then ED25519 / DER.
 * @param {string} keyStr
 * @returns {import("@hashgraph/sdk").PrivateKey}
 */
export function parsePrivateKeyFlexible(keyStr) {
  const cleaned = keyStr.trim();
  const no0x = cleaned.replace(/^0x/i, "");
  const attempts = [
    () => PrivateKey.fromStringECDSA(no0x),
    () => PrivateKey.fromStringECDSA(cleaned),
    () => PrivateKey.fromStringED25519(no0x),
    () => PrivateKey.fromStringED25519(cleaned),
    () => PrivateKey.fromStringDer(no0x),
    () => PrivateKey.fromStringDer(cleaned),
    () => PrivateKey.fromString(no0x),
    () => PrivateKey.fromString(cleaned),
  ];
  let lastErr;
  for (const attempt of attempts) {
    try {
      return attempt();
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(
    `Could not parse private key (${String(lastErr?.message || lastErr).slice(0, 80)}). Use ECDSA/ED25519 hex or DER for this account.`,
  );
}

/**
 * @param {Record<string, string>} env
 * @param {"treasury"|"operator"} role
 */
export function buildClient(env, role = "operator") {
  const network = networkFromEnv(env);
  const client =
    network === "mainnet" ? Client.forMainnet() : Client.forTestnet();

  const idKey =
    role === "treasury" ? "TREASURY_ACCOUNT_ID" : "OPERATOR_ACCOUNT_ID";
  const pkKey =
    role === "treasury" ? "TREASURY_PRIVATE_KEY" : "OPERATOR_PRIVATE_KEY";

  // Allow treasury as operator if operator not set
  let accountId = optionalEnv(env, idKey);
  let privateKeyStr = optionalEnv(env, pkKey);
  if (!accountId || !privateKeyStr) {
    accountId = requireEnv(env, "TREASURY_ACCOUNT_ID");
    privateKeyStr = requireEnv(env, "TREASURY_PRIVATE_KEY");
  }

  const operatorId = AccountId.fromString(accountId);
  const operatorKey = parsePrivateKeyFlexible(privateKeyStr);
  client.setOperator(operatorId, operatorKey);

  return {
    client,
    network,
    operatorId,
    operatorKey,
    /** Call when done — does not print keys */
    close: () => client.close(),
  };
}

/**
 * @param {string | undefined} keyStr
 * @param {string} label
 * @param {string} [fileHint] basename under scripts/hedera/ for local secret file
 */
export function parseOrGenerateKey(
  keyStr,
  label,
  fileHint = ".generated-key.local",
) {
  if (keyStr?.trim()) {
    return PrivateKey.fromString(keyStr.trim());
  }
  const key = PrivateKey.generateED25519();
  const outPath = join(__dirname, "..", fileHint);
  // Local file only — covered by .gitignore (*.local)
  writeFileSync(
    outPath,
    `# GENERATED ${label} — DELETE after moving to password manager\n# ${new Date().toISOString()}\nPUBLIC_DER=${key.publicKey.toStringDer()}\nPRIVATE_DER=${key.toStringDer()}\n`,
    { mode: 0o600 },
  );
  console.log(`[hedera] Generated new ${label} keypair.`);
  console.log(`[hedera] PUBLIC: ${key.publicKey.toStringDer()}`);
  console.log(
    `[hedera] PRIVATE written once to ${outPath} (gitignored). Move to password manager, then delete the file.`,
  );
  console.log(
    "[hedera] Do not paste private keys into chat, git, or tickets.",
  );
  return key;
}
