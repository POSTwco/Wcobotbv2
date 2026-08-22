/**
 * BOTB Hedera Network Configuration
 * ===================================
 * Central config for all Hedera + WalletConnect constants.
 * CAIP-2 chain identifiers, mirror node endpoints, WC methods/events,
 * and token IDs used across the application.
 *
 * References:
 *   - CAIP-2 (Chain Agnostic): https://github.com/ChainAgnostic/CAIPs/blob/main/CAIPs/caip-2.md
 *   - Hedera WC Spec: https://docs.walletconnect.network/advanced/multichain/chain-list
 *   - Hedera Mirror Node: https://docs.hedera.com/hedera/sdks-and-apis/rest-api
 */

// ---------------------------------------------------------------------------
// WalletConnect Project ID (public identifier — safe to embed in frontend)
// Registered at https://cloud.reown.com
// Override with VITE_WC_PROJECT_ID for isolated test environments (WCO-Resolver).
// ---------------------------------------------------------------------------
const WC_PROJECT_ID_DEFAULT = "a89d7b107e0310e2e7ffddc91d37415d";
export const WC_PROJECT_ID =
  (import.meta.env.VITE_WC_PROJECT_ID as string | undefined)?.trim() ||
  WC_PROJECT_ID_DEFAULT;

// ---------------------------------------------------------------------------
// Hedera Network Definitions (CAIP-2 format: "hedera:<network>")
// ---------------------------------------------------------------------------
export type HederaNetwork = "testnet" | "mainnet";

export interface HederaNetworkConfig {
  /** CAIP-2 chain identifier */
  chainId: string;
  /** Numeric reference for CAIP-2 (EIP-155 style) */
  chainReference: number;
  /** Human-readable network name */
  name: string;
  /** Hedera Mirror Node REST API base URL (no trailing slash) */
  mirrorNodeUrl: string;
  /** Hedera JSON-RPC relay URL (for EVM compat, future use) */
  jsonRpcUrl: string;
  /** HashScan explorer base URL */
  explorerUrl: string;
}

export const HEDERA_NETWORKS: Record<HederaNetwork, HederaNetworkConfig> = {
  testnet: {
    chainId: "hedera:testnet",
    chainReference: 296,
    name: "Hedera Testnet",
    mirrorNodeUrl: "https://testnet.mirrornode.hedera.com",
    jsonRpcUrl: "https://testnet.hashio.io/api",
    explorerUrl: "https://hashscan.io/testnet",
  },
  mainnet: {
    chainId: "hedera:mainnet",
    chainReference: 295,
    name: "Hedera Mainnet",
    mirrorNodeUrl: "https://mainnet.mirrornode.hedera.com",
    jsonRpcUrl: "https://mainnet.hashio.io/api",
    explorerUrl: "https://hashscan.io/mainnet",
  },
};

// ---------------------------------------------------------------------------
// Active Network
// Production demo defaults to mainnet. Team test (WCO-Resolver) sets
// VITE_HEDERA_NETWORK=testnet — never point www.wcorg.io at testnet.
// ---------------------------------------------------------------------------
function resolveDefaultNetwork(): HederaNetwork {
  const fromEnv = (import.meta.env.VITE_HEDERA_NETWORK as string | undefined)
    ?.trim()
    .toLowerCase();
  if (fromEnv === "testnet" || fromEnv === "mainnet") return fromEnv;
  return "mainnet";
}

export const DEFAULT_NETWORK: HederaNetwork = resolveDefaultNetwork();

/** Convenience getter for the currently-active network config */
export function getNetworkConfig(network?: HederaNetwork): HederaNetworkConfig {
  return HEDERA_NETWORKS[network ?? DEFAULT_NETWORK];
}

// ---------------------------------------------------------------------------
// WalletConnect — Hedera JSON-RPC Methods
// These are the methods we request in the session proposal namespace.
// HashPack, Blade, and Kabila all support these.
// ---------------------------------------------------------------------------
export const HEDERA_WC_METHODS = {
  /** Sign a transaction and return the signed bytes (wallet does NOT submit) */
  SIGN_TRANSACTION: "hedera_signTransaction",
  /** Sign AND submit the transaction to the network (wallet submits) */
  SIGN_AND_EXECUTE_TRANSACTION: "hedera_signAndExecuteTransaction",
  /** Sign an arbitrary message (personal_sign equivalent) */
  SIGN_MESSAGE: "hedera_signMessage",
} as const;

/** All methods as an array — used in session proposal requiredNamespaces */
export const HEDERA_REQUIRED_METHODS = [
  HEDERA_WC_METHODS.SIGN_TRANSACTION,
  HEDERA_WC_METHODS.SIGN_AND_EXECUTE_TRANSACTION,
  HEDERA_WC_METHODS.SIGN_MESSAGE,
];

// ---------------------------------------------------------------------------
// WalletConnect — Hedera Events
// Events we subscribe to in the session namespace.
// ---------------------------------------------------------------------------
export const HEDERA_WC_EVENTS = {
  CHAIN_CHANGED: "chainChanged",
  ACCOUNTS_CHANGED: "accountsChanged",
} as const;

export const HEDERA_REQUIRED_EVENTS = [
  HEDERA_WC_EVENTS.CHAIN_CHANGED,
  HEDERA_WC_EVENTS.ACCOUNTS_CHANGED,
];

// ---------------------------------------------------------------------------
// BOTB Token IDs on Hedera Token Service (HTS)
// These will be set to real token IDs once deployed.
// Format: "0.0.XXXXXXX"
// ---------------------------------------------------------------------------
function envTokenId(name: string, fallback: string | null): string | null {
  const v = (import.meta.env[name] as string | undefined)?.trim();
  if (v && /^0\.0\.\d+$/.test(v)) return v;
  return fallback;
}

export const TOKEN_IDS = {
  /**
   * WCO / BOTB fungible governance/utility token.
   * Launching Summer 2026 — no token ID yet.
   * Once deployed, set VITE_BOTB_TOKEN_ID to the real 0.0.XXXXXXX ID.
   */
  BOTB: envTokenId("VITE_BOTB_TOKEN_ID", null),
  /**
   * Hedera-native USDC (mainnet default 0.0.456858).
   * Override with VITE_USDC_TOKEN_ID on testnet or if Circle rotates the ID.
   */
  USDC: envTokenId("VITE_USDC_TOKEN_ID", "0.0.456858") as string,
  /**
   * WCO Governors NFT collection — 100 minted, sold out (gates Governors Hub).
   * Mainnet default; override with VITE_GOVERNOR_NFT_TOKEN_ID on testnet.
   */
  GOVERNOR_NFT: envTokenId("VITE_GOVERNOR_NFT_TOKEN_ID", "0.0.9338241") as string,
  /** Sigma Series athlete NFT collection — 1.5x voting boost, 1200 supply, upcoming */
  SIGMA_NFT: envTokenId("VITE_SIGMA_NFT_TOKEN_ID", null),
  /** Meta Series influencer competition NFTs — unlimited supply, launch Q2-Q3 2026 */
  META_NFT: envTokenId("VITE_META_NFT_TOKEN_ID", null),
  /**
   * Hybrid governance Admin NFTs — fixed supply 2, held by treasury.
   * Proof-of-authority for proposal creation (not the 100 Governors).
   */
  ADMIN_NFT: envTokenId("VITE_ADMIN_NFT_TOKEN_ID", null),
} as const;

/** USDC on Hedera uses 6 decimals (smallest unit → display). */
export const USDC_DECIMALS = 6;

/**
 * Whitelisted fungible assets for Manage Assets (HBAR is native, not HTS).
 * Only these symbols are shown — never dump the full mirror token list.
 */
export const MANAGE_ASSETS_WHITELIST = [
  { symbol: "HBAR", kind: "native" as const, tokenId: null, decimals: 8 },
  {
    symbol: "WCO",
    kind: "hts" as const,
    tokenId: TOKEN_IDS.BOTB,
    /** Unknown until launch — display raw smallest units like existing botbBalance */
    decimals: 0,
  },
  {
    symbol: "USDC",
    kind: "hts" as const,
    tokenId: TOKEN_IDS.USDC,
    decimals: USDC_DECIMALS,
  },
] as const;

/** Public treasury account that must hold Admin NFT(s) to propose (optional UI display) */
export const TREASURY_ACCOUNT_ID = envTokenId("VITE_TREASURY_ACCOUNT_ID", null);

// ---------------------------------------------------------------------------
// HCS (Hedera Consensus Service) Topic IDs
// Set via VITE_* for team testnet; leave null on production until cutover.
// ---------------------------------------------------------------------------
export const TOPIC_IDS = {
  /** Battle vote submissions (legacy / future) */
  VOTES: envTokenId("VITE_HCS_VOTES_TOPIC_ID", null),
  /**
   * Governance proposals + votes (typed messages).
   * Private topic — submit key required; IDs are public for Mirror reads.
   */
  GOVERNANCE: envTokenId("VITE_HCS_GOV_TOPIC_ID", null),
  /** Forensic audit stream for proposal submissions */
  AUDIT: envTokenId("VITE_HCS_AUDIT_TOPIC_ID", null),
} as const;

// ---------------------------------------------------------------------------
// WalletConnect App Metadata
// Displayed to users in HashPack when approving the connection.
// ---------------------------------------------------------------------------
export const WC_APP_METADATA = {
  name: "Battle of the Bars",
  description:
    "The world's first decentralized calisthenics competition platform by the World Calisthenics Organization. Vote on IRL battles, stake tokens, earn rewards.",
  url: typeof window !== "undefined" ? window.location.origin : "https://www.wcorg.io",
  icons: [
    "https://www.wcorg.io/android-chrome-512x512.png",
    "https://www.wcorg.io/apple-touch-icon.png",
  ],
};

/**
 * WalletConnect Cloud Explorer listing ID for HashPack.
 * Used to allowlist HashPack in the WC modal (hide MetaMask / other unrelated wallets).
 * Source: https://explorer-api.walletconnect.com/v3/wallets?search=HashPack
 */
export const HASHPACK_WC_EXPLORER_ID =
  "a29498d225fa4b13468ff4d6cf4ae0ea4adcbd95f07ce8a843a1dee10b632f3f";

// ---------------------------------------------------------------------------
// Mirror Node API Paths (appended to mirrorNodeUrl)
// ---------------------------------------------------------------------------
export const MIRROR_PATHS = {
  /** Account balance: GET /api/v1/balances?account.id={id} */
  BALANCES: "/api/v1/balances",
  /** Account info: GET /api/v1/accounts/{id} */
  ACCOUNT: "/api/v1/accounts",
  /** Account NFTs: GET /api/v1/accounts/{id}/nfts */
  ACCOUNT_NFTS: (accountId: string) => `/api/v1/accounts/${accountId}/nfts`,
  /** Token info: GET /api/v1/tokens/{id} */
  TOKEN: "/api/v1/tokens",
  /** Transaction lookup: GET /api/v1/transactions/{id} */
  TRANSACTION: "/api/v1/transactions",
  /** Topic messages: GET /api/v1/topics/{id}/messages */
  TOPIC_MESSAGES: (topicId: string) => `/api/v1/topics/${topicId}/messages`,
} as const;