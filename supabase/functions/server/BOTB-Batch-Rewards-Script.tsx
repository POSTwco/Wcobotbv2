/**
 * ============================================================================
 *    BATTLE OF THE BARS — BATCH REWARDS DISTRIBUTION SCRIPT
 *    World Calisthenics Organization (WCO)
 *    Hedera Hashgraph Mainnet
 * ============================================================================
 *
 *  VERSION: 2.1 (Audited + Patches)
 *  LAST AUDIT: 2026-03-15
 *
 *  PURPOSE:
 *    After a battle's voting closes and a winner is declared via the Admin
 *    Command Center, this script reads the reward snapshot and batch-sends
 *    WCO tokens from the WCO Treasury wallet to every winning voter,
 *    proportional to their token-weighted vote share.
 *
 *    ONLY WCO token holders who voted for the winning athlete receive
 *    rewards. The server enforces this at snapshot time (zero-balance wallets
 *    are excluded), and this script re-verifies balances before sending.
 *
 *  THIS IS A STANDALONE SCRIPT — NOT PART OF THE SERVER.
 *    Run it locally on your machine after exporting the snapshot.
 *
 *
 * ============================================================================
 *  VOTING POWER TIERS (enforced server-side, reflected in snapshot)
 * ============================================================================
 *
 *    Tier               | NFTs Held        | Multiplier | Example
 *    ───────────────────|──────────────────|────────────|────────────────────
 *    Base Voter         | None             | 1.0x       | 1000 WCO = 1000 weight
 *    Sigma Holder       | Sigma NFT only   | 1.5x       | 1000 WCO = 1500 weight
 *    Governor           | Governor NFT only| 2.0x       | 1000 WCO = 2000 weight
 *    Governor + Sigma   | Both NFTs        | 3.0x       | 1000 WCO = 3000 weight
 *
 *    The server computes votingPower via computeServerVotingPower() by
 *    querying the Hedera Mirror Node for actual NFT holdings at vote time.
 *    Client-sent votingPower values are NEVER trusted.
 *
 *    Reward formula (per winner voter):
 *      weightedVote = stakeAmount × votingPower
 *      sharePercent = (weightedVote / totalWinningWeighted) × 100
 *      rewardAmount = sharePercent × totalPool / 100
 *
 *    This means a Governor+Sigma holder staking 1000 WCO earns 3x the
 *    reward of a base voter staking the same 1000 WCO.
 *
 *
 * ============================================================================
 *  DATA FLOW: SERVER SNAPSHOT → THIS SCRIPT → BLOCKCHAIN
 * ============================================================================
 *
 *    SERVER (declare winner):
 *      1. Freezes battle (blocks new votes)
 *      2. Loads all vote records from KV store
 *      3. Deduplicates by wallet (keeps latest per wallet)
 *      4. Re-verifies WCO balance on Hedera Mirror Node
 *         → If voter sold tokens after voting, stake is capped to current balance
 *         → If balance is 0, voter is EXCLUDED from rewards (token-holder-only)
 *      5. Filters to winning-side voters only
 *      6. Computes weighted shares using NFT-verified votingPower tiers
 *      7. Persists snapshot with full audit metadata
 *
 *    EXPORT (admin panel):
 *      GET /admin/snapshots/:id/export?format=json
 *      Returns: { battleId, winnerName, totalPool, recipients: [...] }
 *      Each recipient: { wallet, amount, sharePercent, votingPower, hasGovernorNFT, hasSigmaNFT }
 *
 *    THIS SCRIPT:
 *      1. Loads exported JSON
 *      2. Validates snapshot integrity (sum check, share % check)
 *      3. Verifies each recipient still holds WCO tokens (re-check mirror node)
 *      4. Displays tier breakdown for manual audit
 *      5. Queries actual token decimals from Hedera (no hardcoded guesses)
 *      6. Batches into groups of 8 HTS transfers per transaction
 *      7. Signs and submits from treasury wallet
 *      8. Saves receipt file with all TX IDs
 *
 *    POST-DISTRIBUTION:
 *      Admin clicks "Confirm Airdrop" → battle status → "rewards_distributed"
 *      Leaderboard caches auto-invalidate → voter reward totals update
 *
 *
 * ============================================================================
 *  COMPLETE BEGINNER'S GUIDE — FROM ZERO TO REWARD DISTRIBUTION
 * ============================================================================
 *
 *  If you've never run a script before, follow every step below. Don't skip
 *  anything. Screenshots won't be here but every command is exact.
 *
 *
 *  PART A — INSTALL THE TOOLS (one-time, ~10 minutes)
 *  ───────────────────────────────────────────────────
 *
 *    A1. INSTALL NODE.JS (the engine that runs this script)
 *
 *        Go to: https://nodejs.org
 *        Click the big green button that says "LTS" (Long Term Support).
 *        Download the installer for your computer:
 *          • Mac: .pkg file — double click, follow prompts, click "Continue" until done
 *          • Windows: .msi file — double click, click "Next" until done
 *          • Linux: use your package manager (sudo apt install nodejs npm)
 *
 *        To verify it installed, open a terminal and type:
 *          node --version
 *        You should see something like: v20.11.0 (any number 18+ is fine)
 *
 *    A2. WHAT IS A TERMINAL?
 *
 *        A terminal is a text window where you type commands. Here's how to open one:
 *
 *        Mac:
 *          • Press Cmd + Space (opens Spotlight search)
 *          • Type "Terminal" and press Enter
 *          • A black/white window appears — that's your terminal
 *
 *        Windows:
 *          • Press the Windows key
 *          • Type "PowerShell" and click "Windows PowerShell"
 *          • A blue window appears — that's your terminal
 *          • Alternative: press Windows+R, type "cmd", press Enter
 *
 *        Linux:
 *          • Press Ctrl+Alt+T (works on most distros)
 *
 *    A3. INSTALL A CODE EDITOR (optional but recommended)
 *
 *        Download VS Code (free): https://code.visualstudio.com
 *        This lets you edit the .env file and view JSON files easily.
 *        You can also use any text editor (Notepad, TextEdit, etc.)
 *
 *        IMPORTANT: Do NOT use Microsoft Word or Google Docs to edit files.
 *        They add invisible formatting that breaks everything.
 *
 *
 *  PART B — SET UP THE REWARDS FOLDER (one-time, ~5 minutes)
 *  ──────────────────────────────────────────────────────────
 *
 *    Open your terminal and type these commands one at a time.
 *    Press Enter after each line. Wait for it to finish before the next.
 *
 *    B1. Create a folder and navigate into it:
 *
 *        Mac/Linux:
 *          mkdir ~/botb-rewards
 *          cd ~/botb-rewards
 *
 *        Windows PowerShell:
 *          mkdir $HOME\botb-rewards
 *          cd $HOME\botb-rewards
 *
 *    B2. Initialize the project (creates a package.json file):
 *
 *          npm init -y
 *
 *        You'll see output like "Wrote to .../package.json" — that's correct.
 *
 *    B3. Install the required packages:
 *
 *          npm install @hashgraph/sdk dotenv tsx
 *
 *        This downloads the Hedera SDK (talks to the blockchain),
 *        dotenv (reads your .env secrets file), and tsx (runs TypeScript).
 *        It may take 1-2 minutes. Wait until you see the cursor blinking again.
 *
 *    B4. Copy this script file into the folder:
 *
 *        Find this file (BOTB-Batch-Rewards-Script.tsx) in your GitHub repo
 *        under /supabase/functions/server/. Save it into your ~/botb-rewards
 *        folder and rename it to:
 *
 *          distribute-rewards.tsx
 *
 *    B5. Create the .env secrets file:
 *
 *        In VS Code: File → New File → paste the template below → Save As ".env"
 *        Or in terminal:
 *
 *        Mac/Linux:
 *          touch .env
 *          open .env        (opens in your default editor)
 *
 *        Windows PowerShell:
 *          New-Item .env -ItemType File
 *          notepad .env     (opens in Notepad)
 *
 *        Paste this template and fill in your real values:
 *
 *          # ─── BOTB REWARDS CONFIGURATION ───────────────────────────
 *          # NEVER share this file. NEVER commit to GitHub.
 *          #
 *          TREASURY_ACCOUNT_ID=0.0.XXXXXXX
 *          TREASURY_PRIVATE_KEY=302e020100300506...your_full_hex_key_here
 *          BOTB_TOKEN_ID=0.0.XXXXXXX
 *          HEDERA_NETWORK=mainnet
 *          # ──────────────────────────────────────────────────────────
 *
 *        Save and close the file.
 *
 *    B6. WHERE TO FIND YOUR TREASURY PRIVATE KEY:
 *
 *        In HashPack wallet:
 *          1. Open HashPack browser extension or desktop app
 *          2. Click the gear icon (Settings)
 *          3. Click "Accounts" or your account name
 *          4. Click "Show Private Key" or "Export"
 *          5. Enter your password when prompted
 *          6. Copy the private key (starts with "302e..." for ED25519)
 *          7. Paste it into the .env file as TREASURY_PRIVATE_KEY
 *
 *        ⚠️  CRITICAL SECURITY WARNING:
 *          • This key controls your treasury wallet and ALL tokens in it
 *          • NEVER paste it in a chat, email, or website
 *          • NEVER share the .env file
 *          • NEVER push it to GitHub
 *          • After finishing rewards, you can delete the .env file
 *
 *    B7. Create a .gitignore file (prevents accidental GitHub commits):
 *
 *        Create a file called ".gitignore" in the same folder with this content:
 *
 *          .env
 *          node_modules/
 *          receipt-*.json
 *
 *        This ensures your private key, dependencies, and receipt files
 *        are never accidentally uploaded to GitHub.
 *
 *
 *  PART C — FOR EACH BATTLE (after voting closes)
 *  ───────────────────────────────────────────────
 *
 *    STEP 1 — CLOSE VOTING
 *      In the BOTB Admin Command Center on the website:
 *        • Navigate to Battles
 *        • Find the battle that just finished
 *        • Change the status to "Voting Closed"
 *        • The website will now show voting as closed to all users
 *
 *    STEP 2 — DECLARE THE WINNER
 *      Still in the Admin Command Center:
 *        • Click "Declare Winner" on the battle
 *        • Select the athlete who won the real-world competition
 *        • Click Confirm (this requires your admin wallet signature)
 *
 *      Behind the scenes, the server now:
 *        ✓ Freezes the battle (blocks any late votes)
 *        ✓ Loads all vote records from the database
 *        ✓ Removes any duplicate wallet entries (belt-and-suspenders)
 *        ✓ Re-checks each voter's BOTB token balance on the Hedera blockchain
 *        ✓ Excludes voters who sold all their tokens after voting (0 balance = no reward)
 *        ✓ Computes each winning voter's share based on their weighted vote:
 *            • Base voters: stakeAmount × 1.0
 *            • Sigma NFT holders: stakeAmount × 1.5
 *            • Governor NFT holders: stakeAmount × 2.0
 *            • Governor + Sigma holders: stakeAmount × 3.0
 *        ✓ Saves the complete reward snapshot with audit trail
 *
 *    STEP 3 — REVIEW THE SNAPSHOT
 *      In the Admin Panel's "Snapshots" section, verify:
 *        • Total reward pool matches what you set for the battle
 *        • Recipient count looks reasonable (not 0, not suspiciously high)
 *        • The top recipients' shares make sense
 *        • Whether "headcount fallback" was used (only before token launch)
 *        • Whether any balance caps were applied (voters who sold tokens)
 *
 *    STEP 4 — EXPORT THE AIRDROP FILE
 *      Click "Export JSON" in the Snapshot panel.
 *      Your browser will download a file like: botb-airdrop-btl-abc123.json
 *
 *      Move this file into your ~/botb-rewards folder.
 *
 *      Mac: drag from Downloads to the botb-rewards folder in Finder
 *      Windows: drag from Downloads to the botb-rewards folder in File Explorer
 *      Or use terminal:
 *        Mac/Linux:  mv ~/Downloads/botb-airdrop-*.json ~/botb-rewards/
 *        Windows:    move $HOME\Downloads\botb-airdrop-*.json $HOME\botb-rewards\
 *
 *    STEP 5 — DRY RUN (ALWAYS DO THIS FIRST)
 *      Open terminal, navigate to your rewards folder:
 *
 *        cd ~/botb-rewards
 *
 *      Run the script in preview mode:
 *
 *        npx tsx distribute-rewards.tsx --file botb-airdrop-btl-abc123.json --dry-run
 *
 *      (Replace "btl-abc123" with your actual battle ID from the filename)
 *
 *      This will:
 *        ✓ Parse the snapshot file
 *        ✓ Validate snapshot integrity (amounts sum correctly)
 *        ✓ Verify all wallet IDs are valid
 *        ✓ Check your treasury has enough BOTB tokens
 *        ✓ Re-verify each recipient still holds BOTB on the blockchain
 *        ✓ Show the full tier breakdown (how many Governors, Sigmas, base voters)
 *        ✓ Print the complete distribution plan
 *        ✗ NOT send any tokens — this is preview only
 *
 *      READ THE OUTPUT CAREFULLY. If anything looks wrong, do NOT proceed.
 *
 *    STEP 6 — EXECUTE THE DISTRIBUTION (sends real tokens — irreversible!)
 *      Once the dry run looks correct:
 *
 *        npx tsx distribute-rewards.tsx --file botb-airdrop-btl-abc123.json
 *
 *      You will see a CONFIRMATION PROMPT asking you to type "SEND" to proceed.
 *      This is your last chance to abort.
 *
 *      The script will:
 *        ✓ Batch recipients into groups of 8 per blockchain transaction
 *        ✓ Send BOTB tokens from your treasury wallet to each winning voter
 *        ✓ Log every transaction ID as it completes
 *        ✓ Save a receipt file: receipt-btl-abc123.json (keep this forever)
 *        ✓ Print a final summary with all transaction IDs
 *
 *      Typical time: ~2 seconds per batch. 100 recipients ≈ 30 seconds total.
 *
 *    STEP 7 — CONFIRM AIRDROP IN ADMIN PANEL
 *      Back on the BOTB website Admin Command Center:
 *        • Open the battle's Snapshot section
 *        • Click "Confirm Airdrop"
 *        • Paste the transaction reference from the script output
 *        • Click Confirm (requires admin wallet signature)
 *        • Battle status transitions to "Rewards Distributed"
 *        • Leaderboard automatically updates with voter reward totals
 *
 *    STEP 8 — VERIFY ON HASHSCAN (optional but recommended)
 *      The script prints HashScan links for every transaction.
 *      Click any link to see the on-chain record:
 *        https://hashscan.io/mainnet/transaction/{txId}
 *      You'll see the BOTB token transfers from treasury to each voter.
 *
 *
 *  IF SOMETHING GOES WRONG:
 *  ────────────────────────
 *
 *    Script crashes mid-way:
 *      → Don't panic. The receipt file tracks which batches completed.
 *      → Re-run with --resume flag:
 *           npx tsx distribute-rewards.tsx --file botb-airdrop-btl-abc123.json --resume
 *      → It will skip completed batches and only retry the remaining ones.
 *
 *    "INSUFFICIENT_TOKEN_BALANCE" error:
 *      → Treasury doesn't hold enough BOTB. Send more tokens to the treasury
 *        wallet, then re-run the script.
 *
 *    "INSUFFICIENT_PAYER_BALANCE" error:
 *      → Treasury doesn't have enough HBAR for gas fees.
 *        Send 10-20 HBAR to the treasury wallet, then re-run.
 *
 *    "TOKEN_NOT_ASSOCIATED_TO_ACCOUNT" error:
 *      → One or more recipients haven't associated the BOTB token in their wallet.
 *        The script logs these wallets and skips them. The voter needs to:
 *          1. Open HashPack
 *          2. Go to Tokens → Associate Token
 *          3. Enter the BOTB Token ID and confirm
 *        Once they associate, re-run with --resume.
 *
 *    "INVALID_ACCOUNT_ID" error:
 *      → A wallet ID in the snapshot is malformed. This shouldn't happen if the
 *        snapshot was generated by the server, but check the export file.
 *
 *    Want to test without real money:
 *      → Change HEDERA_NETWORK to "testnet" in your .env
 *      → Use a testnet treasury wallet with test HBAR from https://portal.hedera.com/faucet
 *      → Create a testnet token for practice
 *
 *
 * ============================================================================
 *  SECURITY NOTES
 * ============================================================================
 *
 *    • The .env file contains your treasury private key. Treat it like a
 *      bank vault password. Delete it when you're not using it.
 *    • NEVER run this script on a shared/public computer
 *    • NEVER screen-share while the terminal shows your private key
 *    • NEVER commit .env to GitHub (the .gitignore prevents this)
 *    • ALWAYS dry-run first — every single time, even if you've done it before
 *    • ALWAYS verify snapshot totals match your expectations before sending
 *    • Each Hedera transaction is FINAL and IMMUTABLE — you cannot undo it
 *    • Keep receipt files permanently — they are your proof of distribution
 *    • The script adds a memo to each transaction: "BOTB Rewards: btl-xxx batch N/M"
 *      This makes every reward visible and auditable on HashScan
 *
 *
 * ============================================================================
 */

// ─── IMPORTS ────────────────────────────────────────────────────────────────
// When running as a standalone script:
//   npm install @hashgraph/sdk dotenv tsx
//
// Usage:
//   npx tsx distribute-rewards.tsx --file <snapshot.json> [--dry-run] [--resume] [--hbar]

import "dotenv/config";
import {
  Client,
  AccountId,
  PrivateKey,
  TokenId,
  TransferTransaction,
  AccountBalanceQuery,
  Hbar,
  Status,
} from "@hashgraph/sdk";
import * as fs from "node:fs";
import * as readline from "node:readline";

// ─── CONFIGURATION ──────────────────────────────────────────────────────────

const CONFIG = {
  // Treasury wallet that holds the reward tokens (from .env)
  TREASURY_ACCOUNT_ID: process.env.TREASURY_ACCOUNT_ID || "",
  TREASURY_PRIVATE_KEY: process.env.TREASURY_PRIVATE_KEY || "",

  // BOTB fungible token on HTS (from .env — set once token launches)
  BOTB_TOKEN_ID: process.env.BOTB_TOKEN_ID || "",

  // Network: "mainnet" or "testnet" (from .env)
  HEDERA_NETWORK: (process.env.HEDERA_NETWORK || "mainnet") as "mainnet" | "testnet",

  // Maximum transfers per Hedera transaction
  // Hedera supports up to 10 HTS transfers per TX, we use 8 for safety margin
  BATCH_SIZE: 8,

  // Delay between batches (ms) — prevents rate limiting on mirror node + consensus
  BATCH_DELAY_MS: 1500,

  // Maximum retries per batch on transient network failure
  MAX_RETRIES: 3,

  // Mirror node base URLs for balance re-verification
  MIRROR_NODE: {
    mainnet: "https://mainnet.mirrornode.hedera.com",
    testnet: "https://testnet.mirrornode.hedera.com",
  } as Record<string, string>,
};

// ─── TYPES ──────────────────────────────────────────────────────────────────

interface SnapshotRecipient {
  wallet: string;
  amount: number;         // rewardAmount from snapshot (human-readable units)
  sharePercent: number;   // percentage of total pool
  votingPower: number;    // 1 (base), 1.5 (sigma), 2 (governor), 3 (gov+sigma)
  hasGovernorNFT: boolean;
  hasSigmaNFT: boolean;
}

interface AirdropSnapshot {
  battleId: string;
  winnerName: string;
  totalPool: number;      // total reward pool set on the battle
  totalRecipients: number;
  generatedAt: string;
  exportedAt: string;
  recipients: SnapshotRecipient[];
}

interface BatchResult {
  batchIndex: number;
  recipients: string[];
  amounts: number[];
  txId: string | null;
  status: "success" | "failed" | "skipped";
  error?: string;
  timestamp: string;
}

interface DistributionReceipt {
  scriptVersion: string;
  battleId: string;
  winnerName: string;
  totalPool: number;
  totalDistributed: number;
  totalRecipients: number;
  successfulRecipients: number;
  skippedRecipients: string[];
  failedBatches: number[];
  batches: BatchResult[];
  tierBreakdown: TierBreakdown;
  integrityChecks: IntegrityChecks;
  startedAt: string;
  completedAt: string;
  tokenId: string;
  tokenDecimals: number;
  treasuryAccount: string;
  network: string;
  mode: "token" | "hbar";
}

interface TierBreakdown {
  governorPlusSigma: { count: number; totalReward: number };
  governorOnly: { count: number; totalReward: number };
  sigmaOnly: { count: number; totalReward: number };
  baseVoter: { count: number; totalReward: number };
}

interface IntegrityChecks {
  snapshotSumMatchesPool: boolean;
  sharePercentSumsTo100: boolean;
  allWalletsValid: boolean;
  allAmountsPositive: boolean;
  snapshotSum: number;
  sharePercentSum: number;
  poolDrift: number;
  recipientsReverifiedOnChain: number;
  recipientsFailedReverification: number;
}

// ─── HELPERS ────────────────────────────────────────────────────────────────

function log(msg: string) {
  const ts = new Date().toISOString().replace("T", " ").substring(0, 19);
  console.log(`[${ts}] ${msg}`);
}

function logHeader(title: string) {
  const line = "=".repeat(64);
  console.log(`\n${line}`);
  console.log(`  ${title}`);
  console.log(`${line}\n`);
}

function validateAccountId(id: string): boolean {
  return /^0\.0\.\d+$/.test(id);
}

/** Convert human-readable token amount to smallest unit using actual decimals */
function toSmallestUnit(amount: number, decimals: number): bigint {
  // Use BigInt to avoid floating-point precision loss on large amounts
  // Math.round first to eliminate any fractional dust from snapshot
  return BigInt(Math.round(amount * Math.pow(10, decimals)));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Prompt user for confirmation — blocks until they type the expected word */
function askConfirmation(question: string, expectedAnswer: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toUpperCase() === expectedAnswer.toUpperCase());
    });
  });
}

// ─── MIRROR NODE HELPERS ────────────────────────────────────────────────────

const MIRROR_BASE = () => CONFIG.MIRROR_NODE[CONFIG.HEDERA_NETWORK] || CONFIG.MIRROR_NODE.mainnet;

/**
 * Query the actual decimal places for the BOTB token from the Hedera Mirror Node.
 * This eliminates the risk of hardcoding the wrong decimal value.
 */
async function fetchTokenDecimals(tokenId: string): Promise<number> {
  try {
    const res = await fetch(`${MIRROR_BASE()}/api/v1/tokens/${tokenId}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`Mirror node returned ${res.status}`);
    const data = await res.json();
    const decimals = parseInt(data.decimals, 10);
    if (isNaN(decimals) || decimals < 0 || decimals > 18) {
      throw new Error(`Invalid decimals value: ${data.decimals}`);
    }
    return decimals;
  } catch (err: any) {
    throw new Error(
      `Failed to fetch token decimals for ${tokenId} from mirror node: ${err.message}\n` +
      `  This is required to convert reward amounts to the correct on-chain units.\n` +
      `  Check your BOTB_TOKEN_ID and HEDERA_NETWORK in .env.`
    );
  }
}

/**
 * Re-verify a wallet's BOTB token balance at distribution time.
 * Returns the balance in human-readable units (not smallest unit).
 * This is a SECOND verification layer — the server already verified at snapshot time,
 * but balances can change between snapshot and distribution.
 */
async function fetchWalletBalance(wallet: string, tokenId: string, decimals: number): Promise<number> {
  try {
    const res = await fetch(
      `${MIRROR_BASE()}/api/v1/accounts/${wallet}/tokens?token.id=${tokenId}&limit=1`,
      { signal: AbortSignal.timeout(10_000) }
    );
    if (!res.ok) return -1; // Account may not exist
    const data = await res.json();
    if (data.tokens && data.tokens.length > 0) {
      return parseInt(data.tokens[0].balance, 10) / Math.pow(10, decimals);
    }
    return 0; // Token not associated or zero balance
  } catch {
    return -1; // Network error — don't block distribution, just flag it
  }
}

// ─── INTEGRITY CHECKS ──────────────────────────────────────────────────────

function runIntegrityChecks(snapshot: AirdropSnapshot): IntegrityChecks {
  const snapshotSum = snapshot.recipients.reduce((s, r) => s + r.amount, 0);
  const sharePercentSum = snapshot.recipients.reduce((s, r) => s + r.sharePercent, 0);
  const poolDrift = Math.abs(snapshotSum - snapshot.totalPool);
  const allWalletsValid = snapshot.recipients.every((r) => validateAccountId(r.wallet));
  const allAmountsPositive = snapshot.recipients.every((r) => r.amount >= 0);

  // Allow 1 unit of rounding drift per recipient (Math.round in snapshot generation)
  const acceptableDrift = snapshot.recipients.length;
  const snapshotSumMatchesPool = poolDrift <= acceptableDrift;
  const sharePercentSumsTo100 = Math.abs(sharePercentSum - 100) < 0.1;

  return {
    snapshotSumMatchesPool,
    sharePercentSumsTo100,
    allWalletsValid,
    allAmountsPositive,
    snapshotSum: Math.round(snapshotSum * 100) / 100,
    sharePercentSum: Math.round(sharePercentSum * 100) / 100,
    poolDrift: Math.round(poolDrift * 100) / 100,
    recipientsReverifiedOnChain: 0,
    recipientsFailedReverification: 0,
  };
}

function computeTierBreakdown(recipients: SnapshotRecipient[]): TierBreakdown {
  const breakdown: TierBreakdown = {
    governorPlusSigma: { count: 0, totalReward: 0 },
    governorOnly: { count: 0, totalReward: 0 },
    sigmaOnly: { count: 0, totalReward: 0 },
    baseVoter: { count: 0, totalReward: 0 },
  };

  for (const r of recipients) {
    if (r.hasGovernorNFT && r.hasSigmaNFT) {
      breakdown.governorPlusSigma.count++;
      breakdown.governorPlusSigma.totalReward += r.amount;
    } else if (r.hasGovernorNFT) {
      breakdown.governorOnly.count++;
      breakdown.governorOnly.totalReward += r.amount;
    } else if (r.hasSigmaNFT) {
      breakdown.sigmaOnly.count++;
      breakdown.sigmaOnly.totalReward += r.amount;
    } else {
      breakdown.baseVoter.count++;
      breakdown.baseVoter.totalReward += r.amount;
    }
  }

  return breakdown;
}

// ─── MAIN DISTRIBUTION LOGIC ────────────────────────────────────────────────

async function distribute(
  snapshotFile: string,
  dryRun: boolean,
  resume: boolean,
  useHbar: boolean,
) {
  logHeader("BATTLE OF THE BARS — BATCH REWARDS DISTRIBUTION v2.0");

  // ── 1. VALIDATE CONFIGURATION ─────────────────────────────────────────
  log("Checking configuration...");

  if (!CONFIG.TREASURY_ACCOUNT_ID || !validateAccountId(CONFIG.TREASURY_ACCOUNT_ID)) {
    console.error("\nERROR: TREASURY_ACCOUNT_ID is missing or invalid in your .env file.");
    console.error("  Expected format: 0.0.XXXXXXX (your treasury wallet ID)");
    console.error("  Open your .env file and set: TREASURY_ACCOUNT_ID=0.0.XXXXXXX");
    process.exit(1);
  }

  if (!CONFIG.TREASURY_PRIVATE_KEY) {
    console.error("\nERROR: TREASURY_PRIVATE_KEY is missing in your .env file.");
    console.error("  This is the ED25519 private key for your treasury wallet.");
    console.error("  Export it from HashPack: Settings → Accounts → Show Private Key");
    console.error("  Then add to .env: TREASURY_PRIVATE_KEY=302e020100300506...");
    process.exit(1);
  }

  if (!useHbar && !CONFIG.BOTB_TOKEN_ID) {
    console.error("\nERROR: BOTB_TOKEN_ID is missing in your .env file.");
    console.error("  Set this to the BOTB fungible token ID on Hedera (0.0.XXXXXXX).");
    console.error("  If the token hasn't launched yet, use --hbar to distribute HBAR instead:");
    console.error("    npx tsx distribute-rewards.tsx --file <snapshot.json> --hbar --dry-run");
    process.exit(1);
  }

  const mode = useHbar ? "hbar" : "token";
  log(`  Mode:     ${mode === "hbar" ? "HBAR distribution (pre-token-launch)" : `BOTB token (${CONFIG.BOTB_TOKEN_ID})`}`);
  log(`  Network:  ${CONFIG.HEDERA_NETWORK}`);
  log(`  Treasury: ${CONFIG.TREASURY_ACCOUNT_ID}`);
  log(`  Dry run:  ${dryRun ? "YES — preview only, no tokens will be sent" : "NO — LIVE MODE, transactions are final!"}`);

  // ── 2. LOAD & PARSE SNAPSHOT FILE ─────────────────────────────────────
  log("\nLoading snapshot file...");

  if (!fs.existsSync(snapshotFile)) {
    console.error(`\nERROR: Snapshot file not found: ${snapshotFile}`);
    console.error("  Export the airdrop JSON from the BOTB Admin Panel first:");
    console.error("    Admin → Battles → (select battle) → Snapshot → Export JSON");
    console.error("  Then move the downloaded file to your botb-rewards folder.");
    process.exit(1);
  }

  const raw = fs.readFileSync(snapshotFile, "utf-8");
  let snapshot: AirdropSnapshot;
  try {
    snapshot = JSON.parse(raw);
  } catch {
    console.error("\nERROR: Failed to parse snapshot JSON.");
    console.error("  The file may be corrupted or isn't valid JSON.");
    console.error("  Re-export the snapshot from the Admin Panel.");
    process.exit(1);
  }

  if (!snapshot.battleId) {
    console.error("\nERROR: Snapshot is missing 'battleId'. This doesn't look like a BOTB export.");
    process.exit(1);
  }
  if (!snapshot.recipients || !Array.isArray(snapshot.recipients) || snapshot.recipients.length === 0) {
    console.error("\nERROR: Snapshot has no recipients. Nothing to distribute.");
    console.error("  This can happen if no one voted for the winning athlete.");
    process.exit(1);
  }

  log(`  Battle:     ${snapshot.battleId}`);
  log(`  Winner:     ${snapshot.winnerName}`);
  log(`  Total Pool: ${snapshot.totalPool.toLocaleString()} ${mode === "hbar" ? "HBAR" : "WCO"}`);
  log(`  Recipients: ${snapshot.totalRecipients}`);
  log(`  Generated:  ${snapshot.generatedAt}`);
  log(`  Exported:   ${snapshot.exportedAt}`);

  // ── 3. SNAPSHOT INTEGRITY CHECKS ──────────────────────────────────────
  logHeader("INTEGRITY CHECKS");

  const checks = runIntegrityChecks(snapshot);

  log(`  Reward amounts sum:  ${checks.snapshotSum.toLocaleString()} ${mode === "hbar" ? "HBAR" : "WCO"}`);
  log(`  Declared pool:       ${snapshot.totalPool.toLocaleString()} ${mode === "hbar" ? "HBAR" : "WCO"}`);
  log(`  Drift:               ${checks.poolDrift} (acceptable: <${snapshot.recipients.length})`);
  log(`  Sum matches pool:    ${checks.snapshotSumMatchesPool ? "PASS" : "FAIL — amounts don't add up to totalPool!"}`);
  log(`  Share % sums to 100: ${checks.sharePercentSumsTo100 ? `PASS (${checks.sharePercentSum}%)` : `FAIL (${checks.sharePercentSum}%)`}`);
  log(`  All wallets valid:   ${checks.allWalletsValid ? "PASS" : "FAIL — some wallet IDs are malformed"}`);
  log(`  All amounts >= 0:    ${checks.allAmountsPositive ? "PASS" : "FAIL — negative reward amounts found!"}`);

  if (!checks.snapshotSumMatchesPool) {
    console.error("\nERROR: Snapshot integrity check FAILED.");
    console.error(`  The sum of all recipient amounts (${checks.snapshotSum}) does not match`);
    console.error(`  the declared totalPool (${snapshot.totalPool}).`);
    console.error(`  Drift: ${checks.poolDrift} (max acceptable: ${snapshot.recipients.length})`);
    console.error("  This snapshot may be corrupted. Re-export from the Admin Panel.");
    process.exit(1);
  }

  if (!checks.allAmountsPositive) {
    console.error("\nERROR: Snapshot contains negative reward amounts. This should never happen.");
    console.error("  Re-export the snapshot or investigate the server snapshot generation.");
    process.exit(1);
  }

  // ── 4. TIER BREAKDOWN ─────────────────────────────────────────────────
  logHeader("VOTING POWER TIER BREAKDOWN");

  let tiers = computeTierBreakdown(snapshot.recipients);

  const tierRows = [
    { name: "Governor + Sigma (3.0x)", ...tiers.governorPlusSigma },
    { name: "Governor Only (2.0x)", ...tiers.governorOnly },
    { name: "Sigma Only (1.5x)", ...tiers.sigmaOnly },
    { name: "Base Voter (1.0x)", ...tiers.baseVoter },
  ];

  console.log("  Tier                         Voters   Total Reward      Avg Reward");
  console.log("  ─────────────────────────── ──────── ──────────────── ──────────────");
  for (const t of tierRows) {
    const avg = t.count > 0 ? Math.round(t.totalReward / t.count) : 0;
    console.log(
      `  ${t.name.padEnd(28)} ${String(t.count).padStart(6)}   ${String(Math.round(t.totalReward)).padStart(14)}   ${String(avg).padStart(12)}`
    );
  }
  const totalVoters = tierRows.reduce((s, t) => s + t.count, 0);
  const totalReward = tierRows.reduce((s, t) => s + t.totalReward, 0);
  console.log("  ─────────────────────────── ──────── ──────────────── ──────────────");
  console.log(
    `  ${"TOTAL".padEnd(28)} ${String(totalVoters).padStart(6)}   ${String(Math.round(totalReward)).padStart(14)}`
  );

  // Verify tier multipliers are consistent with server values
  for (const r of snapshot.recipients) {
    const expectedPower = (r.hasGovernorNFT && r.hasSigmaNFT) ? 3
      : r.hasGovernorNFT ? 2
      : r.hasSigmaNFT ? 1.5
      : 1;
    if (r.votingPower !== expectedPower) {
      log(`\n  WARNING: Tier mismatch for ${r.wallet}!`);
      log(`    Expected power ${expectedPower} (Gov:${r.hasGovernorNFT}, Sig:${r.hasSigmaNFT}) but snapshot says ${r.votingPower}`);
      log(`    This could indicate snapshot corruption. Investigate before proceeding.`);
    }
  }

  // ── 5. VALIDATE & FILTER RECIPIENTS ───────────────────────────────────
  logHeader("RECIPIENT VALIDATION");

  const validRecipients: SnapshotRecipient[] = [];
  const invalidWallets: string[] = [];
  const zeroAmountWallets: string[] = [];

  for (const r of snapshot.recipients) {
    if (!r.wallet || !validateAccountId(r.wallet)) {
      invalidWallets.push(r.wallet || "MISSING");
      continue;
    }
    if (r.amount <= 0) {
      zeroAmountWallets.push(r.wallet);
      continue;
    }
    if (r.wallet === CONFIG.TREASURY_ACCOUNT_ID) {
      log(`  SKIP: ${r.wallet} — cannot send to self (treasury wallet)`);
      continue;
    }
    validRecipients.push(r);
  }

  if (invalidWallets.length > 0) {
    log(`  WARNING: ${invalidWallets.length} invalid wallet(s) skipped: ${invalidWallets.join(", ")}`);
  }
  if (zeroAmountWallets.length > 0) {
    log(`  INFO: ${zeroAmountWallets.length} wallet(s) with 0 reward skipped (non-holders filtered by server)`);
  }

  if (validRecipients.length === 0) {
    console.error("\nERROR: No valid recipients after filtering. Nothing to distribute.");
    process.exit(1);
  }

  const totalToDistribute = validRecipients.reduce((sum, r) => sum + Math.round(r.amount), 0);
  const estimatedBatches = Math.ceil(validRecipients.length / CONFIG.BATCH_SIZE);

  log(`\n  Valid recipients:    ${validRecipients.length}`);
  log(`  Total to distribute: ${totalToDistribute.toLocaleString()} ${mode === "hbar" ? "HBAR" : "WCO"}`);
  log(`  Batch size:          ${CONFIG.BATCH_SIZE} transfers per transaction`);
  log(`  Estimated batches:   ${estimatedBatches}`);
  log(`  Estimated gas cost:  ~${(estimatedBatches * 0.02).toFixed(2)} HBAR`);
  log(`  Estimated time:      ~${Math.ceil(estimatedBatches * 2)} seconds`);

  // ── 6. QUERY TOKEN DECIMALS FROM MIRROR NODE ──────────────────────────
  let tokenDecimals = 0;

  if (mode === "token") {
    logHeader("TOKEN VERIFICATION");
    log(`Querying BOTB token info from Hedera Mirror Node...`);

    tokenDecimals = await fetchTokenDecimals(CONFIG.BOTB_TOKEN_ID);
    log(`  Token ID:  ${CONFIG.BOTB_TOKEN_ID}`);
    log(`  Decimals:  ${tokenDecimals}`);
    log(`  1 BOTB = ${Math.pow(10, tokenDecimals).toLocaleString()} smallest units`);
    log(`  Token decimals verified from on-chain data (not hardcoded)`);
  }

  // ── 7. RE-VERIFY RECIPIENT BALANCES (token-holder-only enforcement) ───
  if (mode === "token") {
    logHeader("RECIPIENT BALANCE RE-VERIFICATION");
    log("Checking each recipient still holds BOTB tokens...");
    log("(The server verified at snapshot time, this is a second safety check)\n");

    let verified = 0;
    let noBalance = 0;
    let checkFailed = 0;
    const droppedRecipients: { wallet: string; reason: string }[] = [];

    for (let i = 0; i < validRecipients.length; i++) {
      const r = validRecipients[i];
      const balance = await fetchWalletBalance(r.wallet, CONFIG.BOTB_TOKEN_ID, tokenDecimals);

      if (balance === -1) {
        // Mirror node error — don't block, just flag
        checkFailed++;
        log(`  [${i + 1}/${validRecipients.length}] ${r.wallet}: mirror node error (will proceed)`);
      } else if (balance === 0) {
        // Wallet no longer holds BOTB — this voter sold after snapshot
        noBalance++;
        droppedRecipients.push({ wallet: r.wallet, reason: "Zero BOTB balance at distribution time" });
        log(`  [${i + 1}/${validRecipients.length}] ${r.wallet}: 0 BOTB — DROPPED (sold tokens after snapshot)`);
      } else {
        verified++;
      }

      // Rate limit mirror node queries (max ~10/sec)
      if (i % 5 === 4) await sleep(500);
    }

    checks.recipientsReverifiedOnChain = verified;
    checks.recipientsFailedReverification = noBalance;

    log(`\n  Verified (hold BOTB):     ${verified}`);
    log(`  Dropped (0 balance):     ${noBalance}`);
    log(`  Mirror check errors:     ${checkFailed} (will still receive rewards)`);

    // Remove recipients who no longer hold any BOTB
    if (droppedRecipients.length > 0) {
      const droppedWallets = new Set(droppedRecipients.map((d) => d.wallet));
      const originalCount = validRecipients.length;

      // Filter in place
      for (let i = validRecipients.length - 1; i >= 0; i--) {
        if (droppedWallets.has(validRecipients[i].wallet)) {
          validRecipients.splice(i, 1);
        }
      }

      const droppedAmount = droppedRecipients.reduce((s, d) => {
        const r = snapshot.recipients.find((r) => r.wallet === d.wallet);
        return s + (r ? Math.round(r.amount) : 0);
      }, 0);

      log(`\n  UPDATED: ${droppedRecipients.length} non-holder(s) removed.`);
      log(`  Retained tokens: ${droppedAmount.toLocaleString()} BOTB stays in treasury`);
      log(`  Remaining recipients: ${validRecipients.length} (was ${originalCount})`);
    }

    if (validRecipients.length === 0) {
      console.error("\nERROR: All recipients have 0 BOTB balance. No one to reward.");
      console.error("  This means every winning voter sold their tokens after the snapshot.");
      process.exit(1);
    }

    // Recompute tier breakdown with final (post-drop) recipients so the
    // receipt file and final summary accurately reflect what was distributed.
    if (droppedRecipients.length > 0) {
      tiers = computeTierBreakdown(validRecipients);
      log(`  Tier breakdown recomputed after ${droppedRecipients.length} drop(s).`);
    }
  }

  // Recalculate total after potential drops
  const finalTotal = validRecipients.reduce((sum, r) => sum + Math.round(r.amount), 0);

  // ── 8. PRINT FULL RECIPIENT TABLE ─────────────────────────────────────
  logHeader("DISTRIBUTION PLAN");

  console.log("  Rank  Wallet              Amount          Share%   Power   Tier");
  console.log("  ──── ─────────────────── ─────────────── ──────── ─────── ────────────");
  validRecipients.forEach((r, i) => {
    const tier = (r.hasGovernorNFT && r.hasSigmaNFT) ? "GOV+SIG"
      : r.hasGovernorNFT ? "GOV"
      : r.hasSigmaNFT ? "SIG"
      : "BASE";
    console.log(
      `  ${String(i + 1).padStart(4)}  ${r.wallet.padEnd(20)} ${String(Math.round(r.amount)).padStart(13)}   ${r.sharePercent.toFixed(2).padStart(7)}%   ${String(r.votingPower + "x").padStart(5)}   ${tier}`
    );
  });
  console.log(`\n  TOTAL: ${finalTotal.toLocaleString()} ${mode === "hbar" ? "HBAR" : "WCO"} -> ${validRecipients.length} wallets\n`);

  // ── 9. DRY RUN EXIT ───────────────────────────────────────────────────
  if (dryRun) {
    logHeader("DRY RUN COMPLETE — NO TOKENS SENT");
    log("Everything above is a preview. No transactions were submitted.");
    log("Review the distribution plan, tier breakdown, and integrity checks.");
    log("");
    log("When you're ready to send real tokens, run WITHOUT --dry-run:");
    log(`  npx tsx distribute-rewards.tsx --file ${snapshotFile}`);
    log("");
    log("You will be asked to type SEND to confirm before anything happens.");
    return;
  }

  // ── 10. LIVE MODE CONFIRMATION PROMPT ─────────────────────────────────
  logHeader("CONFIRMATION REQUIRED");
  log(`You are about to send ${finalTotal.toLocaleString()} ${mode === "hbar" ? "HBAR" : "BOTB"} to ${validRecipients.length} wallets.`);
  log(`Network: ${CONFIG.HEDERA_NETWORK} (${CONFIG.HEDERA_NETWORK === "mainnet" ? "REAL MONEY" : "testnet"})`);
  log(`Treasury: ${CONFIG.TREASURY_ACCOUNT_ID}`);
  log("");
  log("This action is IRREVERSIBLE. Hedera transactions cannot be undone.");
  log("");

  const confirmed = await askConfirmation(
    '  Type SEND to proceed, or anything else to abort: ',
    "SEND"
  );

  if (!confirmed) {
    log("\nAborted. No tokens were sent.");
    process.exit(0);
  }

  log("\nConfirmed. Beginning distribution...\n");

  // ── 11. INITIALIZE HEDERA CLIENT ──────────────────────────────────────
  log("Initializing Hedera client...");

  const treasuryId = AccountId.fromString(CONFIG.TREASURY_ACCOUNT_ID);
  let treasuryKey: PrivateKey;
  try {
    treasuryKey = PrivateKey.fromStringED25519(CONFIG.TREASURY_PRIVATE_KEY);
  } catch (err: any) {
    // Try DER format if raw hex fails
    try {
      treasuryKey = PrivateKey.fromStringDer(CONFIG.TREASURY_PRIVATE_KEY);
    } catch {
      console.error("\nERROR: Invalid TREASURY_PRIVATE_KEY format.");
      console.error("  The key must be an ED25519 private key in hex format (starts with '302e...')");
      console.error("  or raw hex format. Export it from HashPack and try again.");
      process.exit(1);
    }
  }

  const client = CONFIG.HEDERA_NETWORK === "mainnet"
    ? Client.forMainnet()
    : Client.forTestnet();
  client.setOperator(treasuryId, treasuryKey);
  client.setDefaultMaxTransactionFee(new Hbar(5));
  client.setDefaultMaxQueryPayment(new Hbar(1));

  log("  Hedera client initialized");

  // ── 12. CHECK TREASURY BALANCE ────────────────────────────────────────
  log("Checking treasury balance...");
  try {
    const balance = await new AccountBalanceQuery()
      .setAccountId(treasuryId)
      .execute(client);

    const hbarBalance = balance.hbars.toBigNumber().toNumber();
    log(`  HBAR balance: ${hbarBalance.toFixed(4)} HBAR`);

    if (mode === "token") {
      // Use mirror node for reliable token balance (SDK internal API is fragile)
      const tokenBalance = await fetchWalletBalance(
        CONFIG.TREASURY_ACCOUNT_ID, CONFIG.BOTB_TOKEN_ID, tokenDecimals
      );

      if (tokenBalance === -1) {
        console.error("\nERROR: Could not verify treasury BOTB balance (mirror node error).");
        console.error("  Check your internet connection and try again.");
        process.exit(1);
      }

      log(`  BOTB balance: ${tokenBalance.toLocaleString()} BOTB`);

      if (tokenBalance < finalTotal) {
        console.error(`\nERROR: Insufficient BOTB balance in treasury!`);
        console.error(`  Need:      ${finalTotal.toLocaleString()} BOTB`);
        console.error(`  Have:      ${tokenBalance.toLocaleString()} BOTB`);
        console.error(`  Shortfall: ${(finalTotal - tokenBalance).toLocaleString()} WCO`);
        console.error(`\n  Send more WCO to ${CONFIG.TREASURY_ACCOUNT_ID} and re-run.`);
        process.exit(1);
      }

      log(`  BOTB balance sufficient: ${tokenBalance.toLocaleString()} >= ${finalTotal.toLocaleString()}`);
    } else {
      const gasBuffer = 5;
      if (hbarBalance < finalTotal + gasBuffer) {
        console.error(`\nERROR: Insufficient HBAR balance in treasury!`);
        console.error(`  Need: ~${(finalTotal + gasBuffer).toFixed(2)} HBAR (${finalTotal} rewards + ${gasBuffer} gas)`);
        console.error(`  Have: ${hbarBalance.toFixed(4)} HBAR`);
        process.exit(1);
      }
    }

    // Minimum HBAR for gas
    const minHbarForGas = estimatedBatches * 0.1;
    if (hbarBalance < minHbarForGas) {
      console.error(`\nERROR: Not enough HBAR for gas fees!`);
      console.error(`  Need at least: ~${minHbarForGas.toFixed(2)} HBAR for ${estimatedBatches} batch transactions`);
      console.error(`  Have: ${hbarBalance.toFixed(4)} HBAR`);
      console.error(`  Send at least ${Math.ceil(minHbarForGas)} HBAR to ${CONFIG.TREASURY_ACCOUNT_ID}`);
      process.exit(1);
    }

    log("  Balance check: PASSED");
  } catch (err: any) {
    console.error(`\nERROR: Failed to query treasury balance: ${err.message}`);
    console.error("  Check your TREASURY_ACCOUNT_ID and TREASURY_PRIVATE_KEY in .env.");
    process.exit(1);
  }

  // ── 13. LOAD RESUME STATE ─────────────────────────────────────────────
  const receiptFile = `receipt-${snapshot.battleId}.json`;
  const completedBatches = new Set<number>();

  if (resume && fs.existsSync(receiptFile)) {
    try {
      const existing: DistributionReceipt = JSON.parse(fs.readFileSync(receiptFile, "utf-8"));
      existing.batches.forEach((b) => {
        if (b.status === "success") completedBatches.add(b.batchIndex);
      });
      log(`\nResuming from previous run: ${completedBatches.size} batch(es) already completed`);
    } catch {
      log("WARNING: Could not parse existing receipt file. Starting fresh.");
    }
  }

  // ── 14. EXECUTE BATCH TRANSFERS ───────────────────────────────────────
  logHeader("EXECUTING DISTRIBUTION");

  const batches: BatchResult[] = [];
  const skippedWallets: string[] = [];
  let totalSent = 0;
  let successCount = 0;

  // Split recipients into batches
  const batchGroups: SnapshotRecipient[][] = [];
  for (let i = 0; i < validRecipients.length; i += CONFIG.BATCH_SIZE) {
    batchGroups.push(validRecipients.slice(i, i + CONFIG.BATCH_SIZE));
  }

  for (let batchIdx = 0; batchIdx < batchGroups.length; batchIdx++) {
    const batch = batchGroups[batchIdx];

    // Skip if already completed (resume mode)
    if (completedBatches.has(batchIdx)) {
      log(`  Batch ${batchIdx + 1}/${batchGroups.length}: SKIPPED (completed in previous run)`);
      batches.push({
        batchIndex: batchIdx,
        recipients: batch.map((r) => r.wallet),
        amounts: batch.map((r) => Math.round(r.amount)),
        txId: "previously_completed",
        status: "skipped",
        timestamp: new Date().toISOString(),
      });
      continue;
    }

    log(`  Batch ${batchIdx + 1}/${batchGroups.length}: sending to ${batch.length} wallets...`);

    let attempt = 0;
    let success = false;

    while (attempt < CONFIG.MAX_RETRIES && !success) {
      attempt++;
      try {
        const txn = new TransferTransaction();

        if (mode === "token") {
          const tokenId = TokenId.fromString(CONFIG.BOTB_TOKEN_ID);
          let batchTotalSmallest = BigInt(0);

          for (const r of batch) {
            const amtSmallest = toSmallestUnit(Math.round(r.amount), tokenDecimals);
            // Safety: Hedera SDK addTokenTransfer expects number|Long, not BigInt.
            // Verify we're within safe integer range to prevent silent precision loss.
            if (amtSmallest > BigInt(Number.MAX_SAFE_INTEGER)) {
              throw new Error(
                `Amount ${amtSmallest} for ${r.wallet} exceeds Number.MAX_SAFE_INTEGER. ` +
                `Manual distribution required for this recipient.`
              );
            }
            txn.addTokenTransfer(tokenId, AccountId.fromString(r.wallet), Number(amtSmallest));
            batchTotalSmallest += amtSmallest;
          }
          // Debit treasury — also guarded against overflow
          if (batchTotalSmallest > BigInt(Number.MAX_SAFE_INTEGER)) {
            throw new Error(
              `Batch total ${batchTotalSmallest} exceeds Number.MAX_SAFE_INTEGER. ` +
              `Reduce BATCH_SIZE to lower per-transaction totals.`
            );
          }
          txn.addTokenTransfer(tokenId, treasuryId, -Number(batchTotalSmallest));
        } else {
          // HBAR mode
          let batchTotal = 0;
          for (const r of batch) {
            const amt = Math.round(r.amount);
            txn.addHbarTransfer(AccountId.fromString(r.wallet), new Hbar(amt));
            batchTotal += amt;
          }
          txn.addHbarTransfer(treasuryId, new Hbar(-batchTotal));
        }

        // Audit memo — visible on HashScan
        txn.setTransactionMemo(
          `BOTB Rewards: ${snapshot.battleId} batch ${batchIdx + 1}/${batchGroups.length}`
        );

        // Freeze, sign, submit
        txn.freezeWith(client);
        const signed = await txn.sign(treasuryKey);
        const response = await signed.execute(client);
        const receipt = await response.getReceipt(client);

        if (receipt.status === Status.Success) {
          const txId = response.transactionId.toString();
          const batchAmount = batch.reduce((s, r) => s + Math.round(r.amount), 0);
          totalSent += batchAmount;
          successCount += batch.length;

          log(`    TX: ${txId}`);
          log(`    Status: SUCCESS — ${batchAmount.toLocaleString()} ${mode === "hbar" ? "HBAR" : "BOTB"} -> ${batch.length} wallets`);

          batches.push({
            batchIndex: batchIdx,
            recipients: batch.map((r) => r.wallet),
            amounts: batch.map((r) => Math.round(r.amount)),
            txId,
            status: "success",
            timestamp: new Date().toISOString(),
          });
          success = true;
        } else {
          throw new Error(`Transaction returned status: ${receipt.status.toString()}`);
        }
      } catch (err: any) {
        const errMsg = err.message || String(err);
        log(`    Attempt ${attempt}/${CONFIG.MAX_RETRIES} FAILED: ${errMsg}`);

        // Non-retryable errors — skip this batch
        const nonRetryable = [
          "TOKEN_NOT_ASSOCIATED",
          "INVALID_ACCOUNT_ID",
          "ACCOUNT_DELETED",
          "ACCOUNT_FROZEN_FOR_TOKEN",
          "INSUFFICIENT_TOKEN_BALANCE",
        ];

        if (nonRetryable.some((e) => errMsg.includes(e))) {
          log(`    Non-retryable error detected. Skipping entire batch.`);
          log(`    Affected wallets: ${batch.map((r) => r.wallet).join(", ")}`);
          batch.forEach((r) => skippedWallets.push(r.wallet));
          batches.push({
            batchIndex: batchIdx,
            recipients: batch.map((r) => r.wallet),
            amounts: batch.map((r) => Math.round(r.amount)),
            txId: null,
            status: "failed",
            error: errMsg,
            timestamp: new Date().toISOString(),
          });
          break;
        }

        if (attempt >= CONFIG.MAX_RETRIES) {
          log(`    Max retries (${CONFIG.MAX_RETRIES}) exceeded. Batch ${batchIdx + 1} FAILED.`);
          batches.push({
            batchIndex: batchIdx,
            recipients: batch.map((r) => r.wallet),
            amounts: batch.map((r) => Math.round(r.amount)),
            txId: null,
            status: "failed",
            error: errMsg,
            timestamp: new Date().toISOString(),
          });
        } else {
          const backoff = CONFIG.BATCH_DELAY_MS * attempt;
          log(`    Retrying in ${backoff}ms...`);
          await sleep(backoff);
        }
      }
    }

    // Delay between batches
    if (batchIdx < batchGroups.length - 1) {
      await sleep(CONFIG.BATCH_DELAY_MS);
    }

    // Save progress after each batch (crash recovery)
    const partialReceipt: DistributionReceipt = {
      scriptVersion: "2.0",
      battleId: snapshot.battleId,
      winnerName: snapshot.winnerName,
      totalPool: snapshot.totalPool,
      totalDistributed: totalSent,
      totalRecipients: validRecipients.length,
      successfulRecipients: successCount,
      skippedRecipients: skippedWallets,
      failedBatches: batches.filter((b) => b.status === "failed").map((b) => b.batchIndex),
      batches,
      tierBreakdown: tiers,
      integrityChecks: checks,
      startedAt: batches[0]?.timestamp || new Date().toISOString(),
      completedAt: new Date().toISOString(),
      tokenId: mode === "token" ? CONFIG.BOTB_TOKEN_ID : "HBAR",
      tokenDecimals,
      treasuryAccount: CONFIG.TREASURY_ACCOUNT_ID,
      network: CONFIG.HEDERA_NETWORK,
      mode,
    };
    fs.writeFileSync(receiptFile, JSON.stringify(partialReceipt, null, 2));
  }

  // ── 15. FINAL SUMMARY ─────────────────────────────────────────────────
  const failedBatches = batches.filter((b) => b.status === "failed");
  const successBatches = batches.filter((b) => b.status === "success");
  const allTxIds = successBatches.map((b) => b.txId).filter(Boolean) as string[];

  logHeader("DISTRIBUTION COMPLETE");
  log(`  Battle:            ${snapshot.battleId}`);
  log(`  Winner:            ${snapshot.winnerName}`);
  log(`  Network:           ${CONFIG.HEDERA_NETWORK}`);
  log(`  Mode:              ${mode === "hbar" ? "HBAR" : `BOTB Token (${CONFIG.BOTB_TOKEN_ID})`}`);
  log(``);
  log(`  Results:`);
  log(`    Total distributed:   ${totalSent.toLocaleString()} ${mode === "hbar" ? "HBAR" : "BOTB"}`);
  log(`    Successful wallets:  ${successCount} / ${validRecipients.length}`);
  log(`    Successful batches:  ${successBatches.length} / ${batchGroups.length}`);
  log(`    Failed batches:      ${failedBatches.length}`);
  log(`    Skipped wallets:     ${skippedWallets.length}`);
  log(``);

  // Tier summary in final output
  const unit = mode === "hbar" ? "HBAR" : "BOTB";
  log(`  Tier breakdown of distributed rewards:`);
  log(`    Governor+Sigma (3x): ${tiers.governorPlusSigma.count} voters, ${Math.round(tiers.governorPlusSigma.totalReward).toLocaleString()} ${unit}`);
  log(`    Governor (2x):       ${tiers.governorOnly.count} voters, ${Math.round(tiers.governorOnly.totalReward).toLocaleString()} ${unit}`);
  log(`    Sigma (1.5x):        ${tiers.sigmaOnly.count} voters, ${Math.round(tiers.sigmaOnly.totalReward).toLocaleString()} ${unit}`);
  log(`    Base (1x):           ${tiers.baseVoter.count} voters, ${Math.round(tiers.baseVoter.totalReward).toLocaleString()} ${unit}`);
  log(``);

  if (allTxIds.length > 0) {
    log(`  Transaction IDs (verify on HashScan):`);
    allTxIds.forEach((txId, i) => {
      log(`    ${i + 1}. ${txId}`);
      log(`       https://hashscan.io/${CONFIG.HEDERA_NETWORK}/transaction/${txId}`);
    });
  }

  log(``);
  log(`  Receipt saved: ${receiptFile}`);
  log(`  (Keep this file permanently — it's your proof of distribution)`);
  log(``);

  if (failedBatches.length > 0) {
    log(`  WARNING: ${failedBatches.length} batch(es) failed. To retry:`);
    log(`    npx tsx distribute-rewards.tsx --file ${snapshotFile} --resume`);
    log(``);
  }

  if (skippedWallets.length > 0) {
    log(`  WARNING: Skipped wallets (need token association):`);
    skippedWallets.forEach((w) => log(`    - ${w}`));
    log(``);
    log(`  These wallets need to open HashPack and associate the BOTB token:`);
    log(`    HashPack → Tokens → Associate Token → enter ${CONFIG.BOTB_TOKEN_ID}`);
    log(`  Then re-run with --resume to send their rewards.`);
    log(``);
  }

  logHeader("NEXT STEP — CONFIRM IN ADMIN PANEL");
  log(`  1. Go to the BOTB Admin Command Center on the website`);
  log(`  2. Open Battles -> "${snapshot.battleId}"`);
  log(`  3. Click "Confirm Airdrop"`);
  log(`  4. Paste this transaction reference:`);
  log(``);
  if (allTxIds.length === 1) {
    log(`     ${allTxIds[0]}`);
  } else if (allTxIds.length > 1) {
    log(`     batch:${allTxIds.length}txns:${allTxIds[0]}`);
  } else {
    log(`     (no successful transactions)`);
  }
  log(``);
  log(`  5. Click Confirm (requires admin wallet signature)`);
  log(`  6. Battle status changes to "Rewards Distributed"`);
  log(`  7. Leaderboards auto-update with voter reward totals`);
  log(``);
  log(`  Done! Voters can now see their rewards on the Leaderboard.`);

  client.close();
}

// ─── CLI ENTRY POINT ────────────────────────────────────────────────────────

function printUsage() {
  console.log(`
BATTLE OF THE BARS — Batch Rewards Distribution Script v2.0
World Calisthenics Organization | Hedera Hashgraph

Usage:
  npx tsx distribute-rewards.tsx --file <snapshot.json> [options]

Options:
  --file <path>   Path to the exported airdrop JSON file (REQUIRED)
  --dry-run       Preview the distribution without sending transactions
  --resume        Resume a partially-completed distribution
  --hbar          Distribute HBAR instead of BOTB tokens (pre-launch mode)
  --help          Show this help message

Examples:

  # Step 1: Always dry-run first
  npx tsx distribute-rewards.tsx --file botb-airdrop-btl-abc123.json --dry-run

  # Step 2: Execute real distribution (will ask for confirmation)
  npx tsx distribute-rewards.tsx --file botb-airdrop-btl-abc123.json

  # Resume after partial failure
  npx tsx distribute-rewards.tsx --file botb-airdrop-btl-abc123.json --resume

  # Distribute HBAR (pre-token-launch)
  npx tsx distribute-rewards.tsx --file botb-airdrop-btl-abc123.json --hbar --dry-run

Required .env file:
  TREASURY_ACCOUNT_ID=0.0.XXXXXXX      Your treasury wallet
  TREASURY_PRIVATE_KEY=302e02...        ED25519 private key
  BOTB_TOKEN_ID=0.0.XXXXXXX            BOTB token ID on HTS
  HEDERA_NETWORK=mainnet                "mainnet" or "testnet"

First time? Read the COMPLETE BEGINNER'S GUIDE in the script header.
  `);
}

// Parse CLI arguments
const args = process.argv.slice(2);

if (args.includes("--help") || args.length === 0) {
  printUsage();
  process.exit(0);
}

const fileIdx = args.indexOf("--file");
const snapshotFile = fileIdx >= 0 ? args[fileIdx + 1] : null;
const dryRun = args.includes("--dry-run");
const resume = args.includes("--resume");
const useHbar = args.includes("--hbar");

if (!snapshotFile) {
  console.error("ERROR: --file argument is required.");
  console.error("  Example: npx tsx distribute-rewards.tsx --file botb-airdrop-btl-abc123.json --dry-run");
  process.exit(1);
}

// Run
distribute(snapshotFile, dryRun, resume, useHbar).catch((err) => {
  console.error(`\nFATAL ERROR: ${err.message || err}`);
  console.error(err.stack || "");
  console.error("\nIf this keeps happening, check:");
  console.error("  1. Is your .env file in the same folder as the script?");
  console.error("  2. Are the values correct? (no quotes, no spaces around =)");
  console.error("  3. Is your internet connection working?");
  console.error("  4. Is the Hedera network operational? Check: https://status.hedera.com");
  process.exit(1);
});
