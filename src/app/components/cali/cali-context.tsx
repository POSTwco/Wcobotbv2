/**
 * BOTB Calisthenics — Session Context
 * ====================================
 *
 * Owns the gate-state machine for the Calisthenics tab:
 *   idle → connecting → challenging → signing → verifying → eligible
 *     ↓                                                        ↓
 *   error ←──────────────────────────────────────────── revoked
 *
 * The cali session token is *separate* from any other wallet session token
 * in the app — it's specifically scoped to the cali wallet gate. It lives in
 * localStorage (key: botb-cali-session) and is silently restored on mount,
 * then validated against /cali/session/me before the UI commits.
 *
 * Security:
 *   - Token is HMAC-bound to accountId + exp; server reverifies every call.
 *   - On wallet disconnect or accountId mismatch, the token is wiped.
 *   - On 401 from any cali API, the token is wiped + state → revoked.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type ReactNode,
} from "react";
import { api } from "../../lib/api";
import { useWallet } from "../wallet-context";

const STORAGE_KEY = "botb-cali-session";

export type CaliPhase =
  | "idle"        // no wallet, or wallet has no token yet
  | "checking"    // restoring token from localStorage / probing /me
  | "connecting"  // wallet connect modal open
  | "challenging" // requesting a challenge from the server
  | "signing"     // waiting for wallet / Magic signature
  | "verifying"   // posting signature to /cali/verify
  | "eligible"    // session active, full access
  | "revoked"     // token expired or balance fell below gate
  | "error";

export interface CaliEligibility {
  accountId: string;
  tinybars: number;
  checkedAt: number;
  expiresAt: number;
}

interface CaliContextValue {
  phase: CaliPhase;
  error: string | null;
  accountId: string | null;
  sessionToken: string | null;
  eligibility: CaliEligibility | null;
  /** Tinybars threshold the server enforces. Mirrored here for UI copy. */
  minTinybars: number;
  /** Kick off the full sign-and-verify flow. Wallet must already be connected. */
  enter: () => Promise<void>;
  /** Re-check session (optional balance) + extend. */
  refresh: () => Promise<void>;
  /** Wipe local token (server eligibility KV will time out on its own). */
  signOut: () => void;
  /** Helper used by feature components after a 401 to drop back to gate UI. */
  handleAuthError: (code?: string) => void;
}

const MIN_TINYBARS = 100_000_000;

const CaliContext = createContext<CaliContextValue | null>(null);

interface StoredSession {
  token: string;
  accountId: string;
  exp: number;
}

function loadStored(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSession;
    if (!parsed?.token || !parsed?.accountId || !parsed?.exp) return null;
    if (parsed.exp < Date.now()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function persistStored(s: StoredSession) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* quota or private mode — non-fatal, user just re-signs next time */
  }
}

function clearStored() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* non-fatal */
  }
}

export function CaliSessionProvider({ children }: { children: ReactNode }) {
  const wallet = useWallet();
  const [phase, setPhase] = useState<CaliPhase>("checking");
  const [error, setError] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [eligibility, setEligibility] = useState<CaliEligibility | null>(null);

  // Track the current accountId we hold a session for, so we can detect a
  // wallet swap and invalidate immediately.
  const sessionAccountIdRef = useRef<string | null>(null);
  const [sessionAccountId, setSessionAccountId] = useState<string | null>(null);
  // Avoid wiping a restored cali session while WalletConnect is still booting.
  const walletEverMatchedRef = useRef(false);

  // ── Restore on mount + probe /me ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = loadStored();
      if (!stored) {
        setPhase("idle");
        return;
      }
      setSessionToken(stored.token);
      sessionAccountIdRef.current = stored.accountId;
      setSessionAccountId(stored.accountId);
      const res = await api.cali.me(stored.token);
      if (cancelled) return;
      if (res.success && res.data) {
        setEligibility(res.data.eligibility);
        setPhase("eligible");
      } else {
        clearStored();
        setSessionToken(null);
        sessionAccountIdRef.current = null;
        setSessionAccountId(null);
        setPhase("idle");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Detect wallet account swap ──────────────────────────────────────────
  // CRITICAL: if a *different* Hedera account connects, always wipe the cali
  // session — even if we never "matched" on this page load. The old
  // `walletEverMatched` gate skipped invalidation until a match happened, so
  // restoring account A's localStorage session then connecting account B
  // (same IP / cleared cache) kept serving A's history, PRs, and workouts.
  // Brief WalletConnect disconnect of the *same* account still does not wipe
  // (allows auto-reconnect without re-signing the gate).
  useEffect(() => {
    const bound = sessionAccountIdRef.current;
    if (!bound) return;

    if (wallet.connected && wallet.accountId === bound) {
      walletEverMatchedRef.current = true;
      return;
    }

    if (wallet.connected && wallet.accountId && wallet.accountId !== bound) {
      clearStored();
      setSessionToken(null);
      setEligibility(null);
      sessionAccountIdRef.current = null;
      setSessionAccountId(null);
      walletEverMatchedRef.current = false;
      setError(null);
      setPhase("idle");
    }
  }, [wallet.connected, wallet.accountId]);

  // ── Enter flow ──────────────────────────────────────────────────────────
  const enter = useCallback(async () => {
    setError(null);
    let accountId = wallet.accountId;
    if (!wallet.connected || !accountId) {
      // Do not auto-open HashPack when Magic email is an option — gate UI offers both.
      setError(
        "Connect HashPack or Sign in with email first, then tap Verify again."
      );
      setPhase("error");
      return;
    }

    setPhase("challenging");
    const ch = await api.cali.challenge(accountId);
    if (!ch.success || !ch.data) {
      setError(ch.error || "Failed to request challenge.");
      setPhase("error");
      return;
    }

    setPhase("signing");
    let signature: string | null;
    try {
      signature = await wallet.signMessage(ch.data.challenge);
    } catch (err: any) {
      setError(err?.message || "Signature was cancelled or failed.");
      setPhase("error");
      return;
    }
    if (!signature) {
      const hint =
        wallet.walletProvider === "magic"
          ? "Approve the Magic prompt, then try again."
          : "Approve the request in HashPack, then try again.";
      setError(`Wallet did not return a signature. ${hint}`);
      setPhase("error");
      return;
    }

    setPhase("verifying");
    const wcSession = await wallet.waitForWalletSession();
    if (!wcSession) {
      setError(
        wallet.walletProvider === "magic"
          ? "Magic session not ready. Sign in with email again, then retry."
          : "Wallet session not ready. Wait a moment after connecting, then try again."
      );
      setPhase("error");
      return;
    }
    const verify = await api.cali.verify(accountId, ch.data.nonce, signature, wcSession);
    if (!verify.success || !verify.data) {
      // INSUFFICIENT_HBAR is a deliberate, user-facing message — keep it.
      setError(verify.error || "Verification failed.");
      setPhase("error");
      return;
    }

    const stored: StoredSession = {
      token: verify.data.sessionToken,
      accountId,
      exp: verify.data.expiresAt,
    };
    persistStored(stored);
    setSessionToken(stored.token);
    sessionAccountIdRef.current = accountId;
    setSessionAccountId(accountId);
    walletEverMatchedRef.current = true;
    setEligibility(verify.data.eligibility);
    setPhase("eligible");
  }, [
    wallet.connected,
    wallet.accountId,
    wallet.signMessage,
    wallet.waitForWalletSession,
    wallet.walletProvider,
  ]);

  // ── Refresh ─────────────────────────────────────────────────────────────
  const refresh = useCallback(async () => {
    if (!sessionToken) return;
    const res = await api.cali.refresh(sessionToken);
    if (res.success && res.data) {
      const accountId = sessionAccountIdRef.current;
      if (accountId) {
        persistStored({ token: res.data.sessionToken, accountId, exp: res.data.expiresAt });
      }
      setSessionToken(res.data.sessionToken);
      setEligibility(res.data.eligibility);
      setPhase("eligible");
    } else if (res.code === "INSUFFICIENT_HBAR") {
      clearStored();
      setSessionToken(null);
      setEligibility(null);
      sessionAccountIdRef.current = null;
      setSessionAccountId(null);
      walletEverMatchedRef.current = false;
      setError(res.error || "HBAR balance fell below the gate.");
      setPhase("revoked");
    } else if (res.code === "CALI_SESSION_REQUIRED" || res.code === "CALI_ELIGIBILITY_EXPIRED") {
      clearStored();
      setSessionToken(null);
      setEligibility(null);
      sessionAccountIdRef.current = null;
      setSessionAccountId(null);
      walletEverMatchedRef.current = false;
      setPhase("idle");
    }
  }, [sessionToken]);

  const signOut = useCallback(() => {
    clearStored();
    setSessionToken(null);
    setEligibility(null);
    sessionAccountIdRef.current = null;
    setSessionAccountId(null);
    walletEverMatchedRef.current = false;
    setPhase("idle");
  }, []);

  const handleAuthError = useCallback((code?: string) => {
    if (
      code === "CALI_SESSION_REQUIRED" ||
      code === "CALI_ELIGIBILITY_EXPIRED" ||
      code === "INSUFFICIENT_HBAR"
    ) {
      clearStored();
      setSessionToken(null);
      setEligibility(null);
      sessionAccountIdRef.current = null;
      setSessionAccountId(null);
      walletEverMatchedRef.current = false;
      setPhase(code === "INSUFFICIENT_HBAR" ? "revoked" : "idle");
    }
  }, []);

  const value: CaliContextValue = useMemo(
    () => ({
      phase,
      error,
      accountId: sessionAccountId,
      sessionToken,
      eligibility,
      minTinybars: MIN_TINYBARS,
      enter,
      refresh,
      signOut,
      handleAuthError,
    }),
    [phase, error, sessionAccountId, sessionToken, eligibility, enter, refresh, signOut, handleAuthError],
  );

  return <CaliContext.Provider value={value}>{children}</CaliContext.Provider>;
}

export function useCaliSession(): CaliContextValue {
  const ctx = useContext(CaliContext);
  if (!ctx) throw new Error("useCaliSession must be used within <CaliSessionProvider>");
  return ctx;
}
