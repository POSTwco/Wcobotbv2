/**
 * BOTB Hedera Mirror Node Client
 * ================================
 * Utility functions for querying the Hedera Mirror Node REST API.
 * Returns real-time account balances, NFT holdings, and account metadata.
 *
 * All functions accept a network parameter that defaults to the active network.
 * Mirror Node docs: https://docs.hedera.com/hedera/sdks-and-apis/rest-api
 */

import {
  getNetworkConfig,
  TOKEN_IDS,
  MIRROR_PATHS,
  USDC_DECIMALS,
  type HederaNetwork,
} from "./hedera-config";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** HBAR balance in tinybars (1 HBAR = 100_000_000 tinybars) */
const TINYBAR_DIVISOR = 100_000_000;

/** Token balance entry from the mirror node balances endpoint */
export interface MirrorTokenBalance {
  token_id: string;
  balance: number;
}

/** Raw balance response from /api/v1/balances?account.id=X */
interface MirrorBalancesResponse {
  balances: Array<{
    account: string;
    balance: number; // tinybars
    tokens: MirrorTokenBalance[];
  }>;
}

/** NFT entry from /api/v1/accounts/{id}/nfts */
export interface MirrorNFT {
  account_id: string;
  created_timestamp: string;
  delegating_spender: string | null;
  deleted: boolean;
  metadata: string; // base64 encoded
  modified_timestamp: string;
  serial_number: number;
  spender: string | null;
  token_id: string;
}

/** Paginated NFT response */
interface MirrorNFTsResponse {
  nfts: MirrorNFT[];
  links: { next: string | null };
}

/** Account info from /api/v1/accounts/{id} */
export interface MirrorAccountInfo {
  account: string;
  alias: string | null;
  auto_renew_period: number;
  balance: {
    balance: number; // tinybars
    timestamp: string;
    tokens: MirrorTokenBalance[];
  };
  created_timestamp: string;
  decline_reward: boolean;
  deleted: boolean;
  ethereum_nonce: number;
  evm_address: string;
  expiry_timestamp: string;
  key: { _type: string; key: string } | null;
  max_automatic_token_associations: number;
  memo: string;
  pending_reward: number;
  receiver_sig_required: boolean;
  staked_account_id: string | null;
  staked_node_id: number | null;
  stake_period_start: string | null;
}

/** Aggregated wallet balances — the clean interface for the rest of the app */
export interface WalletBalances {
  /** HBAR balance in display units (e.g., 12.45 HBAR) */
  hbarBalance: number;
  /** WCO / BOTB fungible token balance (0 until token launches Summer 2026) */
  botbBalance: number;
  /** USDC balance in display units (6 decimals) */
  usdcBalance: number;
  /** Total NFTs owned by this account */
  nftsOwned: number;
  /** Number of WCO Governor NFTs owned (gates Governors Hub) */
  governorNftsOwned: number;
  /** Whether the account holds at least 1 Governor NFT */
  hasGovernorNFT: boolean;
  /** Number of Sigma Series athlete NFTs owned */
  sigmaNftsOwned: number;
  /** Whether the account holds at least 1 Sigma NFT */
  hasSigmaNFT: boolean;
  /** All HTS token balances (raw) */
  tokenBalances: MirrorTokenBalance[];
  /** All NFTs owned (full detail) */
  nfts: MirrorNFT[];
  /** NFTs grouped by collection */
  categorized: CategorizedNFTs;
}

/** NFTs grouped by known BOTB collection + unknown */
export interface CategorizedNFTs {
  governor: MirrorNFT[];
  sigma: MirrorNFT[];
  meta: MirrorNFT[];
  other: MirrorNFT[];
}

/**
 * Compute the BOTB voting power multiplier from NFT holdings.
 *   - Base:     1x
 *   - Sigma:    1.5x
 *   - Governor: 2x
 *   - Both:     3x
 */
export function computeVotingPower(hasGovernor: boolean, hasSigma: boolean): number {
  if (hasGovernor && hasSigma) return 3;
  if (hasGovernor) return 2;
  if (hasSigma) return 1.5;
  return 1;
}

/** Categorize NFTs by known BOTB token IDs */
export function categorizeNFTs(nfts: MirrorNFT[]): CategorizedNFTs {
  const result: CategorizedNFTs = { governor: [], sigma: [], meta: [], other: [] };
  for (const nft of nfts) {
    if (nft.token_id === TOKEN_IDS.GOVERNOR_NFT) {
      result.governor.push(nft);
    } else if (TOKEN_IDS.SIGMA_NFT && nft.token_id === TOKEN_IDS.SIGMA_NFT) {
      result.sigma.push(nft);
    } else if (TOKEN_IDS.META_NFT && nft.token_id === TOKEN_IDS.META_NFT) {
      result.meta.push(nft);
    } else {
      result.other.push(nft);
    }
  }
  return result;
}

/** Decode base64 metadata from mirror node NFT entry (returns UTF-8 string or null) */
export function decodeNFTMetadata(nft: MirrorNFT): string | null {
  try {
    if (!nft.metadata) return null;
    return atob(nft.metadata);
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Core Fetch Helper
// ---------------------------------------------------------------------------

/** Validates a Hedera account ID format (0.0.XXXXXX) to prevent injection */
function isValidAccountId(id: string): boolean {
  return /^0\.0\.\d{1,10}$/.test(id);
}

/**
 * Fetches from the mirror node with error handling and logging.
 * Throws on non-2xx responses with contextual error message.
 */
async function mirrorFetch<T>(
  path: string,
  network?: HederaNetwork
): Promise<T> {
  const config = getNetworkConfig(network);
  const url = `${config.mirrorNodeUrl}${path}`;

  console.log(`[BOTB Mirror] GET ${url}`);

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `[BOTB Mirror] ${response.status} ${response.statusText} for ${path}: ${body}`
    );
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Balance Queries
// ---------------------------------------------------------------------------

/**
 * Fetches HBAR balance and all HTS fungible token balances for an account.
 *
 * @param accountId - Hedera account ID (e.g., "0.0.4835291")
 * @param network - Network to query (defaults to active network)
 * @returns HBAR balance in display units + token balance array
 */
export async function getAccountBalance(
  accountId: string,
  network?: HederaNetwork
): Promise<{ hbarBalance: number; tokens: MirrorTokenBalance[] }> {
  if (!isValidAccountId(accountId)) {
    throw new Error(`[BOTB Mirror] Invalid account ID: ${accountId}`);
  }

  const data = await mirrorFetch<MirrorBalancesResponse>(
    `${MIRROR_PATHS.BALANCES}?account.id=${accountId}`,
    network
  );

  if (!data.balances?.length) {
    console.warn(`[BOTB Mirror] No balance data for account ${accountId}`);
    return { hbarBalance: 0, tokens: [] };
  }

  const entry = data.balances[0];
  const hbarBalance = entry.balance / TINYBAR_DIVISOR;

  console.log(
    `[BOTB Mirror] Balance for ${accountId}:`,
    `${hbarBalance.toFixed(4)} HBAR`,
    `| ${entry.tokens.length} token types`
  );

  return {
    hbarBalance,
    tokens: entry.tokens,
  };
}

// ---------------------------------------------------------------------------
// NFT Queries
// ---------------------------------------------------------------------------

/**
 * Fetches all NFTs owned by an account, handling pagination.
 * The mirror node returns max 100 NFTs per page.
 *
 * @param accountId - Hedera account ID
 * @param network - Network to query
 * @param maxPages - Safety limit on pagination (default 10 = 1000 NFTs max)
 */
export async function getAccountNFTs(
  accountId: string,
  network?: HederaNetwork,
  maxPages = 10
): Promise<MirrorNFT[]> {
  if (!isValidAccountId(accountId)) {
    throw new Error(`[BOTB Mirror] Invalid account ID: ${accountId}`);
  }

  const allNfts: MirrorNFT[] = [];
  let nextPath: string | null = MIRROR_PATHS.ACCOUNT_NFTS(accountId);
  let page = 0;

  while (nextPath && page < maxPages) {
    const data = await mirrorFetch<MirrorNFTsResponse>(nextPath, network);
    allNfts.push(...data.nfts);

    // The mirror node returns a relative URL for the next page
    nextPath = data.links?.next ?? null;
    page++;
  }

  console.log(
    `[BOTB Mirror] NFTs for ${accountId}: ${allNfts.length} total`,
    `(${page} page(s))`
  );

  return allNfts;
}

// ---------------------------------------------------------------------------
// Account Info
// ---------------------------------------------------------------------------

/**
 * Fetches full account details from the mirror node.
 * Includes balance, staking info, key details, etc.
 */
export async function getAccountInfo(
  accountId: string,
  network?: HederaNetwork
): Promise<MirrorAccountInfo> {
  if (!isValidAccountId(accountId)) {
    throw new Error(`[BOTB Mirror] Invalid account ID: ${accountId}`);
  }

  return mirrorFetch<MirrorAccountInfo>(
    `${MIRROR_PATHS.ACCOUNT}/${accountId}`,
    network
  );
}

// ---------------------------------------------------------------------------
// Aggregated Query — Single Call for Wallet Context
// ---------------------------------------------------------------------------

/**
 * Fetches all wallet-relevant data in parallel:
 *   - HBAR balance + token balances
 *   - All NFTs owned
 *
 * Returns a clean `WalletBalances` object for the WalletProvider.
 * Individual query failures are caught gracefully — partial data is
 * returned rather than failing the entire fetch.
 */
export async function fetchWalletBalances(
  accountId: string,
  network?: HederaNetwork
): Promise<WalletBalances> {
  console.log(`[BOTB Mirror] Fetching all balances for ${accountId}...`);

  // Run balance + NFT queries in parallel
  const [balanceResult, nftsResult] = await Promise.allSettled([
    getAccountBalance(accountId, network),
    getAccountNFTs(accountId, network),
  ]);

  // Extract balance data (or defaults)
  let hbarBalance = 0;
  let tokenBalances: MirrorTokenBalance[] = [];

  if (balanceResult.status === "fulfilled") {
    hbarBalance = balanceResult.value.hbarBalance;
    tokenBalances = balanceResult.value.tokens;
  } else {
    console.error(
      "[BOTB Mirror] Balance fetch failed:",
      balanceResult.reason
    );
  }

  // Extract NFT data (or defaults)
  let nfts: MirrorNFT[] = [];

  if (nftsResult.status === "fulfilled") {
    nfts = nftsResult.value;
  } else {
    console.error("[BOTB Mirror] NFT fetch failed:", nftsResult.reason);
  }

  // Find WCO / BOTB token balance (will be 0 until token launches Summer 2026)
  let botbBalance = 0;
  if (TOKEN_IDS.BOTB) {
    const botbEntry = tokenBalances.find((t) => t.token_id === TOKEN_IDS.BOTB);
    botbBalance = botbEntry?.balance ?? 0;
  }

  // USDC — mirror returns smallest units; convert with known 6 decimals
  let usdcBalance = 0;
  if (TOKEN_IDS.USDC) {
    const usdcEntry = tokenBalances.find((t) => t.token_id === TOKEN_IDS.USDC);
    const raw = usdcEntry?.balance ?? 0;
    usdcBalance = raw / 10 ** USDC_DECIMALS;
  }

  // Count Governor NFTs
  const governorNfts = nfts.filter(
    (nft) => nft.token_id === TOKEN_IDS.GOVERNOR_NFT
  );

  // Count Sigma NFTs
  const sigmaNfts = TOKEN_IDS.SIGMA_NFT
    ? nfts.filter((nft) => nft.token_id === TOKEN_IDS.SIGMA_NFT)
    : [];

  // Categorize NFTs
  const categorized = categorizeNFTs(nfts);

  const result: WalletBalances = {
    hbarBalance,
    botbBalance,
    usdcBalance,
    nftsOwned: nfts.length,
    governorNftsOwned: governorNfts.length,
    hasGovernorNFT: governorNfts.length > 0,
    sigmaNftsOwned: sigmaNfts.length,
    hasSigmaNFT: sigmaNfts.length > 0,
    tokenBalances,
    nfts,
    categorized,
  };

  console.log(
    `[BOTB Mirror] Wallet summary for ${accountId}:`,
    `${hbarBalance.toFixed(4)} HBAR`,
    `| ${botbBalance} WCO`,
    `| ${usdcBalance.toFixed(2)} USDC`,
    `| ${nfts.length} NFTs`,
    `| ${governorNfts.length} Governor NFTs`,
    `| ${sigmaNfts.length} Sigma NFTs`
  );

  return result;
}