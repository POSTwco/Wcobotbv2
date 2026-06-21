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
// ---------------------------------------------------------------------------
export const WC_PROJECT_ID = "a89d7b107e0310e2e7ffddc91d37415d";

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
// Active Network — change this single value to switch testnet <-> mainnet
// ---------------------------------------------------------------------------
export const DEFAULT_NETWORK: HederaNetwork = "mainnet";

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
export const TOKEN_IDS = {
  /**
   * BOTB fungible governance/utility token.
   * Launching Summer 2026 — no token ID yet.
   * Once deployed, replace this placeholder with the real 0.0.XXXXXXX ID.
   */
  BOTB: null as string | null, // Token launching Summer 2026
  /** WCO Governors NFT collection — 100 minted, sold out (gates Governors Hub access) */
  GOVERNOR_NFT: "0.0.9338241",
  /** Sigma Series athlete NFT collection — 1.5x voting boost, 1200 supply, upcoming */
  SIGMA_NFT: null as string | null, // Set to real 0.0.XXXXXXX when Sigma Series deploys
  /** Meta Series influencer competition NFTs — unlimited supply, launch Q2-Q3 2026 */
  META_NFT: null as string | null, // Set to real 0.0.XXXXXXX when Meta Series deploys
} as const;

// ---------------------------------------------------------------------------
// HCS (Hedera Consensus Service) Topic IDs
// Used for on-chain vote recording and event messaging.
// ---------------------------------------------------------------------------
export const TOPIC_IDS = {
  /** Battle vote submissions */
  VOTES: null as string | null, // Set to real 0.0.XXXXXXX when HCS topic is created
  /** Governance proposal votes */
  GOVERNANCE: null as string | null, // Set to real 0.0.XXXXXXX when HCS topic is created
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
    "https://wotsoauebnoyvegcvouo.supabase.co/storage/v1/object/public/Branding%20KIT%20WCO/WCO%20white%20on%20trans.png",
  ],
};

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