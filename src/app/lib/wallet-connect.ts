/**
 * BOTB WalletConnect Core — SignClient + Official Modal + Connection Lifecycle
 * =============================================================================
 *
 * Single source of truth for all WalletConnect v2 operations.
 * Every wallet interaction flows through here.
 *
 * ARCHITECTURE:
 *   ┌─────────────────────────────────────────────────────────────┐
 *   │  User clicks "Connect Wallet"                              │
 *   │      ↓                                                     │
 *   │  wallet-context.tsx calls createSessionProposal()          │
 *   │      ↓                                                     │
 *   │  SignClient.connect() → generates pairing URI              │
 *   │      ↓                                                     │
 *   │  openWCModal(uri) → Official WalletConnect modal opens     │
 *   │      ↓                                                     │
 *   │  User scans QR / clicks wallet in the official WC modal    │
 *   │      ↓                                                     │
 *   │  completeSessionApproval() extracts account ID             │
 *   │      ↓                                                     
 *   │  wallet-context.tsx updates React state                    │
 *   │  hedera-mirror.ts fetches real balances                    │
 *   └─────────────────────────────────────────────────────────────┘
 *
 * RELAY RELIABILITY:
 *   - Init timeout (15s) — don't hang forever
 *   - Exponential backoff retry (3 attempts: 1s, 2s, 4s)
 *   - Relay health state machine (idle → initializing → ready / error)
 *   - Session ping validation before trusting restored sessions
 *   - Stale pairing/session cleanup on every successful init
 *
 * SECURITY:
 *   - WC_PROJECT_ID is a public identifier (safe in frontend)
 *   - No private keys or secrets in this file
 *   - Session topics are ephemeral and relay-scoped
 *   - Account IDs are public on-chain data
 *
 * @see /src/app/components/wallet-context.tsx — React state bridge
 * @see /src/app/lib/hedera-mirror.ts — balance/NFT queries
 * @see /src/app/lib/hedera-config.ts — chain constants
 */

import SignClient from "@walletconnect/sign-client";
import type { SessionTypes, SignClientTypes } from "@walletconnect/types";
import { WalletConnectModal } from "@walletconnect/modal";
import {
  findExtensions,
  extensionOpen,
  extensionConnect,
  type ExtensionData,
} from "@hashgraph/hedera-wallet-connect";
import {
  WC_PROJECT_ID,
  WC_APP_METADATA,
  HEDERA_REQUIRED_METHODS,
  HEDERA_REQUIRED_EVENTS,
  DEFAULT_NETWORK,
  HASHPACK_WC_EXPLORER_ID,
  getNetworkConfig,
  type HederaNetwork,
} from "./hedera-config";

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: Types
// ═══════════════════════════════════════════════════════════════════════════

/** Result returned from a successful connection */
export interface WalletConnectionResult {
  session: SessionTypes.Struct;
  /** Hedera account ID in "0.0.XXXXX" format */
  accountId: string;
  network: HederaNetwork;
  /** WC session topic — used for all subsequent requests + disconnect */
  topic: string;
}

/** Events emitted by the wallet system */
export type WalletEventType =
  | "connected"
  | "disconnected"
  | "session_updated"
  | "accounts_changed";

export interface WalletEvent {
  type: WalletEventType;
  accountId: string | null;
  network: HederaNetwork | null;
  session: SessionTypes.Struct | null;
}

export type WalletEventCallback = (event: WalletEvent) => void;

// ─── Relay Health ─────────────────────────────────────────────────────────

export type RelayHealthStatus = "idle" | "initializing" | "ready" | "error";

export interface RelayHealth {
  status: RelayHealthStatus;
  message: string;
  retryCount: number;
  maxRetries: number;
  lastReadyAt: number | null;
  error: string | null;
}

export type RelayHealthCallback = (health: RelayHealth) => void;

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: Configuration Constants
// ═══════════════════════════════════════════════════════════════════════════

const INIT_TIMEOUT_MS = 15_000;
const MAX_INIT_RETRIES = 3;
const INIT_BACKOFF_BASE_MS = 1_000;
const SESSION_PING_TIMEOUT_MS = 10_000;

/**
 * Grace period after SignClient init before we trust ping results.
 * The relay WebSocket needs time to fully establish after init resolves.
 */
const RELAY_WARMUP_MS = 3_000;

/**
 * Approval timeout — 5 minutes matches WC relay pairing TTL.
 * After this, the pairing topic is evicted from the relay.
 */
const APPROVAL_TIMEOUT_MS = 300_000;

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: Singleton State
// ═══════════════════════════════════════════════════════════════════════════

let signClientInstance: SignClient | null = null;
let signClientInitPromise: Promise<SignClient> | null = null;

let currentSession: SessionTypes.Struct | null = null;
let currentAccountId: string | null = null;
let currentNetwork: HederaNetwork | null = null;
let eventListenersRegistered = false;

const eventSubscribers: Set<WalletEventCallback> = new Set();

// ─── Hedera Browser Extension State ──────────────────────────────────────
// HashPack (and other Hedera wallets) install a Chrome extension that
// communicates via window.postMessage. When detected, we use extensionOpen()
// before signing requests to bring the extension popup to the foreground
// instead of triggering a deep-link redirect to link.hashpack.app.

let detectedExtensionId: string | null = null;
let extensionDetectionDone = false;

/**
 * Discover Hedera wallet browser extensions (HashPack, Blade, etc.).
 * Uses the @hashgraph/hedera-wallet-connect extensionController which
 * broadcasts "hedera-extension-query" via window.postMessage.
 * Extensions respond with their metadata including a unique ID.
 *
 * Call once during init. The detected extension ID is stored for use
 * in signMessage() and other request functions.
 */
export function detectExtensions(): void {
  if (extensionDetectionDone) return;
  extensionDetectionDone = true;

  if (typeof window === "undefined") return;

  findExtensions((metadata: ExtensionData) => {
    console.log(
      `[BOTB WC] Hedera extension detected: ${metadata.name ?? "unknown"}` +
      ` | ID: ${metadata.id}` +
      ` | Available: ${metadata.available}`
    );
    if (metadata.available && metadata.id) {
      detectedExtensionId = metadata.id;
    }
  });

  console.log("[BOTB WC] Extension detection query sent");
}

/** Returns the detected extension ID, or null if no extension found */
export function getDetectedExtensionId(): string | null {
  return detectedExtensionId;
}

/**
 * Brings the HashPack browser extension popup to the foreground.
 * This sends a "hedera-extension-open-{id}" message via window.postMessage
 * which the extension listens for.
 *
 * Must be called BEFORE signClient.request() so the user sees the
 * approval dialog in the extension, rather than the browser redirecting
 * to link.hashpack.app.
 */
function notifyExtension(): void {
  if (detectedExtensionId) {
    console.log(`[BOTB WC] Notifying extension to open: ${detectedExtensionId}`);
    extensionOpen(detectedExtensionId);
  }
}

// ─── Relay Health State ───────────────────────────────────────────────────

let relayHealth: RelayHealth = {
  status: "idle",
  message: "Not initialized",
  retryCount: 0,
  maxRetries: MAX_INIT_RETRIES,
  lastReadyAt: null,
  error: null,
};

const relayHealthSubscribers: Set<RelayHealthCallback> = new Set();

function setRelayHealth(update: Partial<RelayHealth>): void {
  relayHealth = { ...relayHealth, ...update };
  relayHealthSubscribers.forEach((cb) => {
    try { cb(relayHealth); } catch (e) { console.error("[BOTB WC] Relay health subscriber error:", e); }
  });
}

/** Subscribe to relay health changes. Returns unsubscribe function. */
export function onRelayHealthChange(callback: RelayHealthCallback): () => void {
  relayHealthSubscribers.add(callback);
  callback(relayHealth);
  return () => { relayHealthSubscribers.delete(callback); };
}

/** Get current relay health (synchronous snapshot) */
export function getRelayHealth(): RelayHealth {
  return relayHealth;
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: Official WalletConnect Modal
// ═══════════════════════════════════════════════════════════════════════════

/**
 * The OFFICIAL WalletConnect modal (@walletconnect/modal).
 * Handles: QR code rendering, wallet listing, extension detection,
 * deep linking, copy URI — all out of the box.
 *
 * CONNECTION STRATEGY:
 *   The `chains` param tells the WC Cloud Explorer API to return wallets
 *   that support "hedera:mainnet". This naturally surfaces HashPack, Blade,
 *   and Kabila with their **official icons** and **correct connection flows**
 *   (browser extension detection on desktop, deep links on mobile).
 *
 *   ⚠ DO NOT use `desktopWallets` / `mobileWallets` manual entries.
 *   Those force deep-link URL schemes (hashpack://, blade://) which fail
 *   on desktop because these are browser extensions, not native apps.
 *   The WC Cloud Explorer knows how to handle each wallet properly.
 */
let wcModal: WalletConnectModal | null = null;

/**
 * One-time migration: clear poisoned WCM_RECENT_WALLET_DATA from localStorage.
 *
 * Our previous manual `desktopWallets` config stored the recent wallet as:
 *   { id: "hashpack", name: "HashPack", links: { native: "hashpack://", ... } }
 *
 * This entry has TWO fatal problems:
 *   1. No `image_id` → the modal shows a gray placeholder instead of the logo
 *   2. `desktop.native: "hashpack://"` → clicking it tries a deep-link URL scheme
 *      that fails on desktop (HashPack is a browser extension, not a native app)
 *
 * After clearing, the WC Cloud Explorer serves proper wallet data with working
 * `image_id` CDN logos and correct connection methods. The user's next successful
 * connection will re-store HashPack as RECENT with correct explorer data.
 *
 * Migration key ensures this only runs once per browser.
 */
const WCM_MIGRATION_KEY = "BOTB_WCM_STALE_RECENT_CLEANUP_V1";

function cleanupStaleRecentWallet(): void {
  try {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(WCM_MIGRATION_KEY)) return; // already migrated

    const raw = localStorage.getItem("WCM_RECENT_WALLET_DATA");
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        // Only clear if it's our old manual entry (id: "hashpack"/"blade"/"kabila")
        // — real explorer entries have long hex IDs
        const staleIds = ["hashpack", "blade", "kabila"];
        if (parsed?.id && staleIds.includes(parsed.id)) {
          localStorage.removeItem("WCM_RECENT_WALLET_DATA");
          console.log(
            `[BOTB WC] Cleared stale recent wallet: "${parsed.id}"` +
            ` (from previous manual desktopWallets config — no image_id, broken deep link)`
          );
        }
      } catch {
        // Corrupted data — clear it
        localStorage.removeItem("WCM_RECENT_WALLET_DATA");
        console.log("[BOTB WC] Cleared corrupted recent wallet data");
      }
    }

    localStorage.setItem(WCM_MIGRATION_KEY, Date.now().toString());
  } catch (e) {
    // localStorage unavailable (e.g. private browsing) — safe to ignore
    console.warn("[BOTB WC] Could not run recent wallet migration:", e);
  }
}

function getWCModal(): WalletConnectModal {
  if (!wcModal) {
    // Run migration BEFORE creating the modal — the modal reads WCM_RECENT_WALLET_DATA
    // during its constructor/preload phase, so we must clear stale data first.
    cleanupStaleRecentWallet();

    // HashPack-only UI: recommend HashPack and exclude every other explorer listing.
    // QR pairing still works if another Hedera WC wallet scans the URI (HIP-820
    // methods still apply). We intentionally do not deep-link custom schemes.
    wcModal = new WalletConnectModal({
      projectId: WC_PROJECT_ID,
      chains: [`hedera:${DEFAULT_NETWORK}`],
      themeMode: "dark",
      themeVariables: {
        "--wcm-z-index": "99999",
        "--wcm-accent-color": "#D4A843",
      },
      explorerRecommendedWalletIds: [HASHPACK_WC_EXPLORER_ID],
      explorerExcludedWalletIds: "ALL",
    });
    console.log("[BOTB WC] Official WalletConnect modal initialized (HashPack allowlist)");
  }
  return wcModal;
}

/** Opens the official WalletConnect modal with the given pairing URI */
export function openWCModal(uri: string): void {
  const modal = getWCModal();
  modal.openModal({ uri });
  console.log("[BOTB WC] WC modal opened");
}

/** Closes the official WalletConnect modal */
export function closeWCModal(): void {
  const modal = getWCModal();
  modal.closeModal();
  console.log("[BOTB WC] WC modal closed");
}

/** Subscribe to WC modal open/close events. Returns unsubscribe function. */
export function subscribeWCModal(callback: (state: { open: boolean }) => void): () => void {
  const modal = getWCModal();
  return modal.subscribeModal(callback);
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5: SignClient Initialization (with Retry + Timeout)
// ═══════════════════════════════════════════════════════════════════════════

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(
        `[BOTB WC] ${label} timed out after ${ms / 1000}s. ` +
        `The WalletConnect relay may be slow or unreachable.`
      ));
    }, ms);

    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function initSignClientWithRetry(): Promise<SignClient> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_INIT_RETRIES; attempt++) {
    if (attempt > 0) {
      const backoffMs = INIT_BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
      console.log(`[BOTB WC] Retry ${attempt}/${MAX_INIT_RETRIES} in ${backoffMs}ms...`);
      setRelayHealth({
        status: "initializing",
        message: `Retrying connection (${attempt}/${MAX_INIT_RETRIES})...`,
        retryCount: attempt,
        error: null,
      });
      await delay(backoffMs);
    } else {
      setRelayHealth({
        status: "initializing",
        message: "Connecting to WalletConnect relay...",
        retryCount: 0,
        error: null,
      });
    }

    try {
      console.log(
        `[BOTB WC] SignClient.init() attempt ${attempt + 1}/${MAX_INIT_RETRIES + 1}` +
        ` | Timeout: ${INIT_TIMEOUT_MS / 1000}s`
      );

      const client = await withTimeout(
        SignClient.init({
          projectId: WC_PROJECT_ID,
          metadata: WC_APP_METADATA,
        }),
        INIT_TIMEOUT_MS,
        `SignClient.init (attempt ${attempt + 1})`
      );

      console.log(
        `[BOTB WC] SignClient ready` +
        ` | Project: ${WC_PROJECT_ID.slice(0, 8)}...` +
        ` | Protocol: wc@${client.version}` +
        (attempt > 0 ? ` | Succeeded on retry ${attempt}` : "")
      );

      setRelayHealth({
        status: "ready",
        message: "Connected to relay",
        retryCount: attempt,
        lastReadyAt: Date.now(),
        error: null,
      });

      return client;

    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[BOTB WC] Init attempt ${attempt + 1} failed:`, lastError.message);
    }
  }

  const finalMessage =
    `WalletConnect relay unreachable after ${MAX_INIT_RETRIES + 1} attempts. ` +
    `Please check your internet connection and try again.`;

  setRelayHealth({
    status: "error",
    message: finalMessage,
    error: lastError?.message ?? "Unknown error",
  });

  throw new Error(`[BOTB WC] ${finalMessage} Last error: ${lastError?.message}`);
}

/**
 * Returns the WalletConnect SignClient singleton.
 * Thread-safe — concurrent calls await the same init promise.
 */
export async function getSignClient(): Promise<SignClient> {
  if (signClientInstance) return signClientInstance;
  if (signClientInitPromise) return signClientInitPromise;

  signClientInitPromise = initSignClientWithRetry();

  try {
    signClientInstance = await signClientInitPromise;

    // Defer housekeeping — the relay WebSocket may not be fully open yet
    // when SignClient.init() resolves. Attempting to send disconnect messages
    // for stale pairings/sessions immediately causes "send was called before
    // connect". A 5s delay lets the WebSocket fully establish first.
    setTimeout(() => {
      cleanupStalePairings().catch((e) =>
        console.warn("[BOTB WC] Stale pairing cleanup error:", e)
      );
    }, 5_000);

    return signClientInstance;
  } catch (error) {
    signClientInitPromise = null;
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 6: Session Validation + Cleanup
// ═══════════════════════════════════════════════════════════════════════════

/** Extracts Hedera account ID from a WC session (CAIP-10 format) */
export function extractAccountId(session: SessionTypes.Struct): string | null {
  try {
    const accounts = session.namespaces.hedera?.accounts;
    if (!accounts?.length) {
      console.warn("[BOTB WC] No Hedera accounts in session namespaces");
      return null;
    }
    const parts = accounts[0].split(":");
    if (parts.length >= 3) {
      const accountId = parts.slice(2).join(":");
      // Validate account ID format (0.0.XXXXXXX) — prevents relay injection
      if (!/^0\.0\.\d{1,10}$/.test(accountId)) {
        console.warn("[BOTB WC] Malformed Hedera account ID from session:", accountId);
        return null;
      }
      return accountId;
    }
    console.warn("[BOTB WC] Unexpected CAIP-10 format:", accounts[0]);
    return null;
  } catch (error) {
    console.error("[BOTB WC] extractAccountId failed:", error);
    return null;
  }
}

export function extractNetwork(session: SessionTypes.Struct): HederaNetwork | null {
  try {
    const accounts = session.namespaces.hedera?.accounts;
    if (!accounts?.length) return null;
    const net = accounts[0].split(":")[1] as HederaNetwork;
    return net === "testnet" || net === "mainnet" ? net : null;
  } catch {
    return null;
  }
}

/** Pings a session to verify it's alive on the relay */
export async function validateSession(session: SessionTypes.Struct): Promise<boolean> {
  try {
    const client = await getSignClient();
    await withTimeout(
      client.ping({ topic: session.topic }),
      SESSION_PING_TIMEOUT_MS,
      "Session ping"
    );
    console.log(`[BOTB WC] Session ping OK | Topic: ${session.topic.slice(0, 12)}...`);
    return true;
  } catch (err: any) {
    console.warn(
      `[BOTB WC] Session ping failed | Topic: ${session.topic.slice(0, 12)}...`,
      `| Reason: ${err?.message ?? "unknown"}`
    );
    return false;
  }
}

/** Finds the most recent valid Hedera session */
export async function findActiveSession(validate = false): Promise<SessionTypes.Struct | null> {
  const client = await getSignClient();
  const sessions = client.session.getAll();
  const now = Math.floor(Date.now() / 1000);

  const candidates = sessions.filter((s) => {
    return !!s.namespaces.hedera && s.expiry > now;
  });

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.expiry - a.expiry);

  if (!validate) {
    const best = candidates[0];
    console.log(
      `[BOTB WC] Active session (unvalidated) | Account: ${extractAccountId(best)}` +
      ` | Expires: ${new Date(best.expiry * 1000).toISOString()}`
    );
    return best;
  }

  // Check if the relay was recently initialized — if so, the WebSocket
  // may not be fully established yet. Ping failures during warmup are
  // transient and should NOT cause session destruction.
  const relayJustStarted = relayHealth.lastReadyAt && (Date.now() - relayHealth.lastReadyAt < RELAY_WARMUP_MS);

  for (const session of candidates) {
    const alive = await validateSession(session);
    if (alive) {
      console.log(
        `[BOTB WC] Validated session | Account: ${extractAccountId(session)}` +
        ` | Expires: ${new Date(session.expiry * 1000).toISOString()}`
      );
      return session;
    }

    // During relay warmup, don't destroy sessions that fail ping —
    // the relay WebSocket isn't fully ready, so pings are unreliable.
    if (relayJustStarted) {
      console.log(
        `[BOTB WC] Ping failed during relay warmup — preserving session: ${session.topic.slice(0, 12)}...` +
        ` | Will trust expiry (${new Date(session.expiry * 1000).toISOString()})`
      );
      return null; // Return null to let caller fall back to unvalidated restore
    }

    console.log(`[BOTB WC] Cleaning dead session: ${session.topic.slice(0, 12)}...`);
    try {
      await client.disconnect({
        topic: session.topic,
        reason: { code: 6000, message: "Session failed validation ping" },
      });
    } catch {
      // Dead session, safe to ignore
    }
  }

  console.log("[BOTB WC] No validated sessions found");
  return null;
}

/** Removes expired pairings and sessions from localStorage */
async function cleanupStalePairings(): Promise<void> {
  if (!signClientInstance) return;

  const core = signClientInstance.core;
  const now = Math.floor(Date.now() / 1000);
  let cleaned = 0;

  try {
    const pairings = core.pairing.getPairings();
    for (const pairing of pairings) {
      if (pairing.expiry < now || !pairing.active) {
        try {
          await core.pairing.disconnect({ topic: pairing.topic });
          cleaned++;
        } catch { /* safe to ignore */ }
      }
    }
  } catch (err) {
    console.warn("[BOTB WC] Pairing cleanup error:", err);
  }

  try {
    const sessions = signClientInstance.session.getAll();
    for (const session of sessions) {
      if (session.expiry < now) {
        try {
          await signClientInstance.disconnect({
            topic: session.topic,
            reason: { code: 6000, message: "Expired session cleanup" },
          });
          cleaned++;
        } catch { /* safe to ignore */ }
      }
    }
  } catch (err) {
    console.warn("[BOTB WC] Session cleanup error:", err);
  }

  if (cleaned > 0) {
    console.log(`[BOTB WC] Cleaned ${cleaned} stale pairing(s)/session(s)`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 7: Event System
// ═══════════════════════════════════════════════════════════════════════════

export function onWalletEvent(callback: WalletEventCallback): () => void {
  eventSubscribers.add(callback);
  return () => { eventSubscribers.delete(callback); };
}

function emitWalletEvent(type: WalletEventType): void {
  const event: WalletEvent = {
    type,
    accountId: currentAccountId,
    network: currentNetwork,
    session: currentSession,
  };
  console.log(`[BOTB WC] Event: ${type} | Account: ${currentAccountId ?? "none"}`);
  eventSubscribers.forEach((cb) => {
    try { cb(event); } catch (err) { console.error("[BOTB WC] Subscriber error:", err); }
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 8: SignClient Event Listeners
// ═══════════════════════════════════════════════════════════════════════════

function setupEventListeners(client: SignClient): void {
  if (eventListenersRegistered) return;
  eventListenersRegistered = true;

  client.on("session_delete", ({ topic }) => {
    console.log("[BOTB WC] session_delete | Topic:", topic);
    if (currentSession?.topic === topic) {
      currentSession = null;
      currentAccountId = null;
      currentNetwork = null;
      emitWalletEvent("disconnected");
    }
  });

  client.on("session_update", ({ topic, params }) => {
    console.log("[BOTB WC] session_update | Topic:", topic);
    if (currentSession?.topic === topic) {
      currentSession = { ...currentSession, namespaces: params.namespaces };
      const newAccountId = extractAccountId(currentSession);
      const newNetwork = extractNetwork(currentSession);

      if (newAccountId && newAccountId !== currentAccountId) {
        console.log(`[BOTB WC] Account changed: ${currentAccountId} -> ${newAccountId}`);
        currentAccountId = newAccountId;
        currentNetwork = newNetwork;
        emitWalletEvent("accounts_changed");
      } else {
        emitWalletEvent("session_updated");
      }
    }
  });

  client.on("session_event", ({ topic, params }) => {
    const { event } = params;
    console.log(`[BOTB WC] session_event: ${event.name} | Topic: ${topic}`);
    if (currentSession?.topic !== topic) return;

    if (event.name === "accountsChanged") {
      const accounts = event.data as string[] | undefined;
      if (accounts?.length) {
        const parts = accounts[0].split(":");
        if (parts.length >= 3) {
          const newAccountId = parts.slice(2).join(":");
          // Validate format before accepting relay-provided account ID
          if (/^0\.0\.\d{1,10}$/.test(newAccountId) && newAccountId !== currentAccountId) {
            currentAccountId = newAccountId;
            emitWalletEvent("accounts_changed");
          }
        }
      }
    }

    if (event.name === "chainChanged") {
      const newNetwork = extractNetwork(currentSession!);
      if (newNetwork && newNetwork !== currentNetwork) {
        currentNetwork = newNetwork;
        emitWalletEvent("session_updated");
      }
    }
  });

  client.on("session_expire" as any, ({ topic }: { topic: string }) => {
    console.log("[BOTB WC] session_expire | Topic:", topic);
    if (currentSession?.topic === topic) {
      currentSession = null;
      currentAccountId = null;
      currentNetwork = null;
      emitWalletEvent("disconnected");
    }
  });

  console.log("[BOTB WC] Event listeners registered");
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 9: Session Proposal + Approval
// ═══════════════════════════════════════════════════════════════════════════

/** Builds the Hedera namespace for session proposals */
export function buildRequiredNamespaces(
  network?: HederaNetwork
): Record<string, { chains: string[]; methods: string[]; events: string[] }> {
  const config = getNetworkConfig(network);
  return {
    hedera: {
      chains: [config.chainId],
      methods: [...HEDERA_REQUIRED_METHODS],
      events: [...HEDERA_REQUIRED_EVENTS],
    },
  };
}

/**
 * Creates a WC session proposal and returns the pairing URI + approval promise.
 * If an existing valid session is found, returns it immediately.
 */
export async function createSessionProposal(
  network?: HederaNetwork
): Promise<{
  uri: string;
  approval: () => Promise<SessionTypes.Struct>;
  existingSession?: WalletConnectionResult;
}> {
  const targetNetwork = network ?? DEFAULT_NETWORK;
  console.log(`[BOTB WC] Creating session proposal for ${getNetworkConfig(targetNetwork).name}...`);

  const client = await getSignClient();

  // Check for existing session
  const existing = await findActiveSession(false);
  if (existing) {
    const accountId = extractAccountId(existing);
    const sessionNetwork = extractNetwork(existing);

    if (accountId && sessionNetwork) {
      console.log(`[BOTB WC] Reusing existing session | Account: ${accountId}`);
      currentSession = existing;
      currentAccountId = accountId;
      currentNetwork = sessionNetwork;
      setupEventListeners(client);
      emitWalletEvent("connected");

      return {
        uri: "",
        approval: async () => existing,
        existingSession: { session: existing, accountId, network: sessionNetwork, topic: existing.topic },
      };
    }
  }

  const requiredNamespaces = buildRequiredNamespaces(targetNetwork);
  const { uri, approval } = await client.connect({ requiredNamespaces });

  if (!uri) {
    throw new Error("[BOTB WC] No pairing URI returned. WC relay may be down.");
  }

  console.log(`[BOTB WC] Pairing URI generated: ${uri.slice(0, 50)}...`);

  return { uri, approval };
}

/**
 * Completes a pending session approval with timeout.
 * Called when the WC modal's approval promise resolves.
 */
export async function completeSessionApproval(
  approval: () => Promise<SessionTypes.Struct>,
  network?: HederaNetwork
): Promise<WalletConnectionResult> {
  const targetNetwork = network ?? DEFAULT_NETWORK;
  const client = await getSignClient();

  const session = await withTimeout(
    approval(),
    APPROVAL_TIMEOUT_MS,
    "Wallet approval"
  );

  const accountId = extractAccountId(session);
  const sessionNetwork = extractNetwork(session);

  if (!accountId) {
    throw new Error(
      "[BOTB WC] Session approved but no Hedera account found. " +
      "Ensure your wallet approved with a Hedera account."
    );
  }

  const resolvedNetwork = sessionNetwork ?? targetNetwork;

  console.log(
    `[BOTB WC] Connected! Account: ${accountId}` +
    ` | Network: ${resolvedNetwork}` +
    ` | Peer: ${session.peer.metadata.name}` +
    ` | Expires: ${new Date(session.expiry * 1000).toISOString()}`
  );

  currentSession = session;
  currentAccountId = accountId;
  currentNetwork = resolvedNetwork;
  setupEventListeners(client);
  emitWalletEvent("connected");

  return { session, accountId, network: resolvedNetwork, topic: session.topic };
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 10: Disconnect
// ══════════════════════════════════════════════════════════════════════════

export async function disconnectWallet(reason?: string): Promise<void> {
  if (!currentSession) {
    console.log("[BOTB WC] disconnectWallet: no active session");
    return;
  }

  const topic = currentSession.topic;
  const accountId = currentAccountId;
  console.log(`[BOTB WC] Disconnecting | Account: ${accountId} | Topic: ${topic}`);

  try {
    const client = await getSignClient();
    await client.disconnect({
      topic,
      reason: { code: 6000, message: reason ?? "User disconnected from Battle of the Bars" },
    });
  } catch (error) {
    console.warn("[BOTB WC] Disconnect send error:", error);
  }

  currentSession = null;
  currentAccountId = null;
  currentNetwork = null;
  emitWalletEvent("disconnected");
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 11: Synchronous State Getters
// ═══════════════════════════════════════════════════════════════════════════

export function getCurrentSession(): SessionTypes.Struct | null { return currentSession; }
export function getCurrentAccountId(): string | null { return currentAccountId; }
export function getCurrentNetwork(): HederaNetwork | null { return currentNetwork; }

/**
 * Syncs the singleton session state. Called by wallet-context during
 * auto-reconnect so that signMessage() and other functions that depend
 * on currentSession/currentAccountId/currentNetwork work correctly.
 */
export function syncSessionState(
  sess: SessionTypes.Struct,
  acctId: string,
  net: HederaNetwork
): void {
  currentSession = sess;
  currentAccountId = acctId;
  currentNetwork = net;

  // Also register event listeners if not already done
  getSignClient().then((client) => setupEventListeners(client)).catch(() => {});

  console.log(
    `[BOTB WC] Session state synced | Account: ${acctId} | Network: ${net}` +
    ` | Topic: ${sess.topic.slice(0, 12)}...`
  );
}

export function isConnected(): boolean {
  if (!currentSession || !currentAccountId) return false;
  return currentSession.expiry > Math.floor(Date.now() / 1000);
}

// ══════════════════════════════════════════════════════════════════════════
// SECTION 12: Sign Message (HIP-820 / hedera_signMessage)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Signs an arbitrary message via WalletConnect using the hedera_signMessage
 * JSON-RPC method (HIP-820).
 *
 * HashPack will display the message and ask the user to approve in their wallet.
 * The response is a base64-encoded protobuf SignatureMap.
 *
 * ⚠ This does NOT open any modal or deep link — the request goes through the
 * WalletConnect relay. The user must have HashPack open to approve.
 *
 * @param message  - Plain text message to sign
 * @returns Base64-encoded signature map string, or null if signing failed
 */
export async function signMessage(message: string): Promise<string | null> {
  if (!currentSession || !currentAccountId || !currentNetwork) {
    console.error("[BOTB WC] signMessage: no active session");
    return null;
  }

  const client = await getSignClient();

  // Verify session still exists in the client store
  try {
    client.session.get(currentSession.topic);
  } catch {
    console.error("[BOTB WC] signMessage: session no longer exists in store");
    return null;
  }

  const signerAccountId = `hedera:${currentNetwork}:${currentAccountId}`;

  // ── HIP-820 COMPLIANT: base64-encode the message for HashPack ──
  // Per the HIP-820 spec, the `message` parameter MUST be base64-encoded.
  // The @hashgraph/hedera-wallet-connect library's DAppSigner.sign() does:
  //   TextEncoder.encode(message) → base64 string → send as `message` param
  // HashPack base64-decodes to recover the original bytes before signing.
  const utf8Bytes = new TextEncoder().encode(message);
  let base64Message: string;
  try {
    let binary = "";
    for (let i = 0; i < utf8Bytes.length; i++) {
      binary += String.fromCharCode(utf8Bytes[i]);
    }
    base64Message = btoa(binary);
  } catch {
    base64Message = btoa(unescape(encodeURIComponent(message)));
  }

  console.log(
    `[BOTB WC] signMessage request` +
    ` | Account: ${currentAccountId}` +
    ` | Topic: ${currentSession.topic.slice(0, 12)}...` +
    ` | Message length: ${message.length}` +
    ` | Base64 length: ${base64Message.length}`
  );

  try {
    // Notify the extension to open the approval dialog
    notifyExtension();

    const result = await withTimeout(
      client.request<{ signatureMap: string }>({
        topic: currentSession.topic,
        chainId: `hedera:${currentNetwork}`,
        request: {
          method: "hedera_signMessage",
          params: {
            signerAccountId,
            message: base64Message,
          },
        },
      }),
      120_000, // 2 minute timeout for user approval
      "signMessage"
    );

    console.log("[BOTB WC] signMessage: signature received");

    // Extract the signatureMap from the response
    if (result && typeof result === "object" && "signatureMap" in result) {
      return result.signatureMap as string;
    }

    // Some wallets may return the result directly as a string
    if (typeof result === "string") {
      return result;
    }

    // Fallback: stringify whatever we got back as proof of signing
    return JSON.stringify(result);
  } catch (err: any) {
    const msg = err?.message ?? String(err);

    if (msg.includes("timed out")) {
      console.warn("[BOTB WC] signMessage: user did not approve within timeout");
    } else if (msg.includes("rejected") || msg.includes("declined") || msg.includes("cancelled")) {
      console.log("[BOTB WC] signMessage: user rejected the signature request");
    } else {
      console.error("[BOTB WC] signMessage error:", err);
    }

    throw err;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 13: Full Reset (hot-reload / testing)
// ═══════════════════════════════════════════════════════════════════════════

export async function resetWalletConnect(): Promise<void> {
  try {
    if (signClientInstance) {
      const sessions = signClientInstance.session.getAll();
      await Promise.allSettled(
        sessions.map((s) =>
          signClientInstance!.disconnect({
            topic: s.topic,
            reason: { code: 6000, message: "Client reset" },
          })
        )
      );
    }
  } catch (error) {
    console.warn("[BOTB WC] Reset error:", error);
  }

  signClientInstance = null;
  signClientInitPromise = null;
  currentSession = null;
  currentAccountId = null;
  currentNetwork = null;
  eventListenersRegistered = false;
  eventSubscribers.clear();
  relayHealthSubscribers.clear();
  relayHealth = {
    status: "idle",
    message: "Not initialized",
    retryCount: 0,
    maxRetries: MAX_INIT_RETRIES,
    lastReadyAt: null,
    error: null,
  };
  console.log("[BOTB WC] State fully reset");
}

// ═══════════════════════════════════════════════════════════════════════════
// Type Re-exports
// ═══════════════════════════════════════════════════════════════════════════
export type { SessionTypes, SignClientTypes };