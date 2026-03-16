/**
 * BOTB Wallet Context — React State Bridge for WalletConnect
 * ============================================================
 *
 * CONNECT FLOW (using Official WalletConnect Modal):
 *   1. User clicks "Connect Wallet" → connect() called
 *   2. createSessionProposal() generates pairing URI
 *   3. openWCModal(uri) opens the OFFICIAL WalletConnect modal
 *   4. completeSessionApproval() awaits wallet approval in background
 *   5. On approval: modal closes, balances fetched, polling started
 *   6. On cancel: user closes WC modal → approval cancelled
 *
 * BALANCE POLLING:
 *   After connect, immediately fetches HBAR + token + NFT data from
 *   the Hedera Mirror Node. Then polls every 30s while connected.
 *
 * AUTO-RECONNECT:
 *   On mount, checks for existing WC session in localStorage.
 *   If found and not expired, silently reconnects without showing modal.
 *
 * @see /src/app/lib/wallet-connect.ts — SignClient + connection functions
 * @see /src/app/lib/hedera-mirror.ts — balance/NFT queries
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import type { SessionTypes } from "@walletconnect/types";
import type { HederaNetwork } from "../lib/hedera-config";
import {
  disconnectWallet,
  onWalletEvent,
  getSignClient,
  findActiveSession,
  extractAccountId,
  extractNetwork,
  createSessionProposal,
  completeSessionApproval,
  openWCModal,
  closeWCModal,
  subscribeWCModal,
  signMessage as wcSignMessage,
  syncSessionState,
  detectExtensions,
} from "../lib/wallet-connect";
import {
  fetchWalletBalances,
  computeVotingPower,
  type WalletBalances,
  type CategorizedNFTs,
  type MirrorNFT,
} from "../lib/hedera-mirror";
import { api } from "../lib/api";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BALANCE_POLL_INTERVAL = 30_000;

// ---------------------------------------------------------------------------
// Context Shape
// ---------------------------------------------------------------------------

export interface WalletState {
  connected: boolean;
  isConnecting: boolean;
  error: string | null;

  accountId: string | null;
  address: string | null;
  network: HederaNetwork | null;
  session: SessionTypes.Struct | null;

  balance: number;
  botbBalance: number;
  stakedBalance: number;
  nftsOwned: number;
  governorNftsOwned: number;
  hasGovernorNFT: boolean;
  sigmaNftsOwned: number;
  hasSigmaNFT: boolean;
  votingPower: number;
  isLoadingBalances: boolean;
  isAdmin: boolean;
  /** Categorized NFTs by BOTB collection */
  nftCategories: CategorizedNFTs | null;
  /** Raw NFT array from mirror node */
  rawNfts: MirrorNFT[];

  connect: () => void;
  disconnect: () => void;
  clearError: () => void;
  refreshBalances: () => void;

  /** Server-side wallet session token (proof of WalletConnect ownership) */
  walletSessionToken: string | null;

  /** Sign an arbitrary message via WalletConnect (HIP-820). Returns base64 signature or null. */
  signMessage: (message: string) => Promise<string | null>;
  signTransaction: (transactionBytes: Uint8Array) => Promise<Uint8Array | null>;
  signAndExecuteTransaction: (transactionBytes: Uint8Array) => Promise<Uint8Array | null>;
}

const defaultState: WalletState = {
  connected: false,
  isConnecting: false,
  error: null,
  accountId: null,
  address: null,
  network: null,
  session: null,
  balance: 0,
  botbBalance: 0,
  stakedBalance: 0,
  nftsOwned: 0,
  governorNftsOwned: 0,
  hasGovernorNFT: false,
  sigmaNftsOwned: 0,
  hasSigmaNFT: false,
  votingPower: 0,
  isLoadingBalances: false,
  isAdmin: false,
  nftCategories: null,
  rawNfts: [],
  walletSessionToken: null,
  connect: () => {},
  disconnect: () => {},
  clearError: () => {},
  refreshBalances: () => {},
  signMessage: async () => null,
  signTransaction: async () => null,
  signAndExecuteTransaction: async () => null,
};

const WalletContext = createContext<WalletState>(defaultState);

// ---------------------------------------------------------------------------
// Default (zero) balances
// ---------------------------------------------------------------------------
const ZERO_BALANCES: WalletBalances = {
  hbarBalance: 0,
  botbBalance: 0,
  nftsOwned: 0,
  governorNftsOwned: 0,
  hasGovernorNFT: false,
  sigmaNftsOwned: 0,
  hasSigmaNFT: false,
  tokenBalances: [],
  nfts: [],
  categorized: { governor: [], sigma: [], meta: [], other: [] },
};

// ---------------------------------------------------------------------------
// Provider Component
// ---------------------------------------------------------------------------

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [network, setNetwork] = useState<HederaNetwork | null>(null);
  const [session, setSession] = useState<SessionTypes.Struct | null>(null);

  const [balances, setBalances] = useState<WalletBalances>(ZERO_BALANCES);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [isAdminWallet, setIsAdminWallet] = useState(false);
  const [nftCategories, setNftCategories] = useState<CategorizedNFTs | null>(null);
  const [rawNfts, setRawNfts] = useState<MirrorNFT[]>([]);

  /** Server-side wallet session token — proof of WalletConnect ownership */
  const [walletSessionToken, setWalletSessionToken] = useState<string | null>(null);

  const initRef = useRef(false);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectCancelledRef = useRef(false);
  const cancelApprovalRef = useRef<((reason: Error) => void) | null>(null);

  // ------------------------------------------------------------------
  // Balance Fetching
  // ------------------------------------------------------------------
  const doFetchBalances = useCallback(
    async (acctId: string, net: HederaNetwork | null, isInitial = false) => {
      if (isInitial) setIsLoadingBalances(true);
      try {
        const data = await fetchWalletBalances(acctId, net ?? undefined);
        setBalances(data);
        setNftCategories(data.categorized);
        setRawNfts(data.nfts);
        console.log(
          `[BOTB Wallet Context] Balances updated | ${data.hbarBalance.toFixed(4)} HBAR | ${data.nftsOwned} NFTs | ${data.governorNftsOwned} Gov | ${data.sigmaNftsOwned} Sigma | Power: ${computeVotingPower(data.hasGovernorNFT, data.hasSigmaNFT)}x`
        );
      } catch (err) {
        console.error("[BOTB Wallet Context] Balance fetch error:", err);
      } finally {
        if (isInitial) setIsLoadingBalances(false);
      }
    },
    []
  );

  const startBalancePolling = useCallback(
    (acctId: string, net: HederaNetwork | null) => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = setInterval(() => {
        doFetchBalances(acctId, net, false);
      }, BALANCE_POLL_INTERVAL);
    },
    [doFetchBalances]
  );

  const stopBalancePolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopBalancePolling();
  }, [stopBalancePolling]);

  // ------------------------------------------------------------------
  // Helper: Set connected state
  // ------------------------------------------------------------------
  const setConnectedState = useCallback(
    (sess: SessionTypes.Struct, acctId: string, net: HederaNetwork | null) => {
      // Sync singleton state in wallet-connect.ts so signMessage() works
      syncSessionState(sess, acctId, net ?? "mainnet");
      setSession(sess);
      setAccountId(acctId);
      setNetwork(net);
      setConnected(true);
      doFetchBalances(acctId, net, true);
      startBalancePolling(acctId, net);
    },
    [doFetchBalances, startBalancePolling]
  );

  const clearConnectedState = useCallback(() => {
    setSession(null);
    setAccountId(null);
    setNetwork(null);
    setConnected(false);
    setBalances(ZERO_BALANCES);
    setIsLoadingBalances(false);
    setIsAdminWallet(false);
    setNftCategories(null);
    setRawNfts([]);
    stopBalancePolling();
  }, [stopBalancePolling]);

  // ------------------------------------------------------------------
  // On Mount: Initialize SignClient & Auto-Reconnect
  // ------------------------------------------------------------------
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    let cancelled = false;

    async function initAndReconnect() {
      try {
        console.log("[BOTB Wallet Context] Initializing SignClient...");
        // Detect HashPack/Blade browser extensions before anything else.
        // This fires a window.postMessage query; extensions respond async.
        detectExtensions();
        await getSignClient();
        if (cancelled) return;

        // On mount, restore sessions by trusting their expiry timestamp.
        // We intentionally skip relay ping validation here because the
        // relay WebSocket is often not fully open yet at this point,
        // which causes "send was called before connect" errors.
        // Session liveness is proven on the next real user action
        // (transaction signing, explicit reconnect, etc.).
        const existingSession = await findActiveSession(false).catch((err) => {
          console.warn("[BOTB Wallet Context] Session restore failed:", err?.message);
          return null;
        });
        if (cancelled) return;

        if (existingSession) {
          const restoredAccountId = extractAccountId(existingSession);
          const restoredNetwork = extractNetwork(existingSession);
          if (restoredAccountId) {
            console.log(`[BOTB Wallet Context] Auto-reconnect | Account: ${restoredAccountId}`);
            setConnectedState(existingSession, restoredAccountId, restoredNetwork);
          }
        } else {
          console.log("[BOTB Wallet Context] No session to restore");
        }
      } catch (err: any) {
        console.error("[BOTB Wallet Context] Init failed:", err?.message ?? err);
      }
    }

    initAndReconnect();
    return () => { cancelled = true; };
  }, [setConnectedState]);

  // ------------------------------------------------------------------
  // Subscribe to Wallet Events
  // ------------------------------------------------------------------
  useEffect(() => {
    const unsubscribe = onWalletEvent((event) => {
      console.log("[BOTB Wallet Context] Event received:", event.type);
      switch (event.type) {
        case "connected":
          if (event.session && event.accountId) {
            setConnectedState(event.session, event.accountId, event.network);
          }
          setError(null);
          break;
        case "disconnected":
          clearConnectedState();
          break;
        case "accounts_changed":
          setAccountId(event.accountId);
          setNetwork(event.network);
          if (event.session) setSession(event.session);
          if (event.accountId) {
            doFetchBalances(event.accountId, event.network, true);
            startBalancePolling(event.accountId, event.network);
          }
          break;
        case "session_updated":
          if (event.session) setSession(event.session);
          setNetwork(event.network);
          break;
      }
    });
    return unsubscribe;
  }, [setConnectedState, clearConnectedState, doFetchBalances, startBalancePolling]);

  // ------------------------------------------------------------------
  // Admin Check — when account connects, verify against server
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!accountId || !connected) {
      setIsAdminWallet(false);
      return;
    }

    let cancelled = false;
    api.checkAdmin(accountId).then((res) => {
      if (cancelled) return;
      if (res.success && res.data?.isAdmin) {
        console.log(`[BOTB Wallet Context] Admin wallet detected: ${accountId}`);
        setIsAdminWallet(true);
      } else {
        setIsAdminWallet(false);
      }
    }).catch((err) => {
      console.error("[BOTB Wallet Context] Admin check failed:", err);
      setIsAdminWallet(false);
    });

    return () => { cancelled = true; };
  }, [accountId, connected]);

  // ------------------------------------------------------------------
  // Wallet Session Registration — Server-side proof of WC ownership
  // ------------------------------------------------------------------
  // After WalletConnect connects (fresh or auto-reconnect), register the
  // session server-side to get a token. This token is required by all
  // vote and chat endpoints — it proves the caller went through the
  // WalletConnect flow and physically approved in HashPack.
  // Runs in parallel with admin check / balance fetch (non-blocking).
  // ------------------------------------------------------------------
  useEffect(() => {
    if (!accountId || !connected || !session) {
      setWalletSessionToken(null);
      return;
    }

    let cancelled = false;

    async function registerSession() {
      try {
        const wcTopic = session!.topic;
        console.log(`[BOTB Wallet Context] Registering wallet session for ${accountId} (topic: ${wcTopic.substring(0, 16)}…)`);

        const res = await api.registerWalletSession(accountId!, wcTopic);

        if (cancelled) return;

        if (res.success && res.data?.token) {
          setWalletSessionToken(res.data.token);
          console.log(`[BOTB Wallet Context] Wallet session registered ✓ (TTL: ${Math.round((res.data.ttlMs || 0) / 3600000)}h)`);
        } else {
          console.error(`[BOTB Wallet Context] Wallet session registration failed:`, res.error);
          // Don't block the user — they can still browse, just can't vote/chat
          setWalletSessionToken(null);
        }
      } catch (err) {
        if (cancelled) return;
        console.error("[BOTB Wallet Context] Wallet session registration error:", err);
        setWalletSessionToken(null);
      }
    }

    registerSession();
    return () => { cancelled = true; };
  }, [accountId, connected, session]);

  // ------------------------------------------------------------------
  // Connect — Official WalletConnect Modal
  // ------------------------------------------------------------------
  const connect = useCallback(async () => {
    if (isConnecting || connected) return;

    setIsConnecting(true);
    setError(null);
    connectCancelledRef.current = false;

    try {
      console.log("[BOTB Wallet Context] Starting connect flow...");

      const proposal = await createSessionProposal();

      // Existing session — auto-connect without modal
      if (proposal.existingSession) {
        console.log("[BOTB Wallet Context] Existing session found, auto-connecting...");
        const { session: sess, accountId: acctId, network: net } = proposal.existingSession;
        setConnectedState(sess, acctId, net);
        setIsConnecting(false);
        return;
      }

      // Open the OFFICIAL WalletConnect modal with the pairing URI
      openWCModal(proposal.uri);
      console.log("[BOTB Wallet Context] Official WC modal opened");

      // Subscribe to modal close — if user closes modal, cancel the approval
      const unsubModal = subscribeWCModal(({ open }) => {
        if (!open && !connectCancelledRef.current) {
          console.log("[BOTB Wallet Context] WC modal closed by user");
          connectCancelledRef.current = true;
          if (cancelApprovalRef.current) {
            cancelApprovalRef.current(new Error("Connection cancelled — user closed the modal"));
            cancelApprovalRef.current = null;
          }
        }
      });

      // Wait for approval with cancellation support
      const result = await new Promise<Awaited<ReturnType<typeof completeSessionApproval>>>(
        (resolve, reject) => {
          cancelApprovalRef.current = reject;
          completeSessionApproval(proposal.approval)
            .then(resolve)
            .catch(reject);
        }
      );

      unsubModal();

      if (connectCancelledRef.current) {
        console.log("[BOTB Wallet Context] Connection was cancelled");
        return;
      }

      // Success — close WC modal and update state
      closeWCModal();
      setConnectedState(result.session, result.accountId, result.network);
      console.log(`[BOTB Wallet Context] Connected! Account: ${result.accountId}`);

    } catch (err: any) {
      const message = err?.message ?? "Failed to connect wallet";

      if (
        connectCancelledRef.current ||
        message.includes("cancelled") ||
        message.includes("closed the modal")
      ) {
        console.log("[BOTB Wallet Context] Connection cancelled by user");
        setError(null);
      } else if (message.includes("timed out")) {
        console.warn("[BOTB Wallet Context] Approval timed out:", message);
        closeWCModal();
        setError("Connection request expired. Please try again.");
      } else {
        console.error("[BOTB Wallet Context] Connect error:", err);
        setError(message);
      }
    } finally {
      setIsConnecting(false);
      cancelApprovalRef.current = null;
    }
  }, [isConnecting, connected, setConnectedState]);

  // ------------------------------------------------------------------
  // Disconnect
  // ------------------------------------------------------------------
  const disconnect = useCallback(async () => {
    console.log("[BOTB Wallet Context] Disconnecting...");
    try {
      // Clean up server-side wallet session (best-effort, don't block)
      if (accountId) {
        api.disconnectWalletSession(accountId).catch(() => {});
      }
      await disconnectWallet();
    } catch (err) {
      console.error("[BOTB Wallet Context] Disconnect error:", err);
    }
    setWalletSessionToken(null);
    clearConnectedState();
    setError(null);
  }, [clearConnectedState, accountId]);

  // ------------------------------------------------------------------
  // Manual Refresh
  // ------------------------------------------------------------------
  const refreshBalances = useCallback(() => {
    if (accountId && connected) {
      doFetchBalances(accountId, network, false);
    }
  }, [accountId, connected, network, doFetchBalances]);

  const clearError = useCallback(() => setError(null), []);

  // ------------------------------------------------------------------
  // Transaction Passthroughs
  // ------------------------------------------------------------------
  const signTransaction = useCallback(
    async (transactionBytes: Uint8Array): Promise<Uint8Array | null> => {
      if (!connected || !session) return null;
      try {
        const client = await getSignClient();
        const result = await client.request({
          topic: session.topic,
          chainId: `hedera:${network ?? "mainnet"}`,
          request: {
            method: "hedera_signTransaction",
            params: {
              signerAccountId: `hedera:${network ?? "mainnet"}:${accountId}`,
              transactionBody: Array.from(transactionBytes),
            },
          },
        });
        if (result && typeof result === "object" && "signedTransaction" in result) {
          return new Uint8Array(result.signedTransaction as number[]);
        }
        return null;
      } catch (err) {
        console.error("[BOTB Wallet Context] signTransaction error:", err);
        throw err;
      }
    },
    [connected, session, network, accountId]
  );

  const signAndExecuteTransaction = useCallback(
    async (transactionBytes: Uint8Array): Promise<Uint8Array | null> => {
      if (!connected || !session) return null;
      try {
        const client = await getSignClient();
        const result = await client.request({
          topic: session.topic,
          chainId: `hedera:${network ?? "mainnet"}`,
          request: {
            method: "hedera_signAndExecuteTransaction",
            params: {
              signerAccountId: `hedera:${network ?? "mainnet"}:${accountId}`,
              transactionBody: Array.from(transactionBytes),
            },
          },
        });
        if (result && typeof result === "object" && "signedTransaction" in result) {
          return new Uint8Array(result.signedTransaction as number[]);
        }
        return null;
      } catch (err) {
        console.error("[BOTB Wallet Context] signAndExecuteTransaction error:", err);
        throw err;
      }
    },
    [connected, session, network, accountId]
  );

  // ------------------------------------------------------------------
  // Message Signing — delegates to wallet-connect.ts signMessage()
  // which handles session lookup, CAIP-10 formatting, timeout,
  // and correct HIP-820 signatureMap response parsing.
  // ------------------------------------------------------------------
  const signMessage = useCallback(
    async (message: string): Promise<string | null> => {
      if (!connected) {
        console.warn("[BOTB Wallet Context] signMessage: not connected");
        return null;
      }
      return wcSignMessage(message);
    },
    [connected]
  );

  // ------------------------------------------------------------------
  // Context Value
  // ------------------------------------------------------------------
  const value: WalletState = {
    connected,
    isConnecting,
    error,
    accountId,
    address: accountId,
    network,
    session,

    balance: balances.hbarBalance,
    botbBalance: balances.botbBalance,
    stakedBalance: 0,
    nftsOwned: balances.nftsOwned,
    governorNftsOwned: balances.governorNftsOwned,
    hasGovernorNFT: balances.hasGovernorNFT,
    sigmaNftsOwned: balances.sigmaNftsOwned,
    hasSigmaNFT: balances.hasSigmaNFT,
    votingPower: computeVotingPower(balances.hasGovernorNFT, balances.hasSigmaNFT),
    isLoadingBalances,
    isAdmin: isAdminWallet,
    nftCategories,
    rawNfts,
    walletSessionToken,

    connect,
    disconnect,
    clearError,
    refreshBalances,
    signMessage,
    signTransaction,
    signAndExecuteTransaction,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export const useWallet = () => useContext(WalletContext);