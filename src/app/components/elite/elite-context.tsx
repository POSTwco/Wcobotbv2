import React, {
  createContext, useContext, useState, useEffect, useCallback, useRef, useMemo, type ReactNode,
} from "react";
import { api } from "../../lib/api";
import { useWallet } from "../wallet-context";

const STORAGE_KEY = "botb-elite-session";

export type ElitePhase =
  | "idle" | "checking" | "connecting" | "challenging" | "signing" | "verifying"
  | "eligible" | "revoked" | "error";

interface StoredSession { token: string; accountId: string; exp: number; }

function loadStored(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as StoredSession;
    if (!p?.token || !p?.accountId || p.exp < Date.now()) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return p;
  } catch { return null; }
}

function persistStored(s: StoredSession) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

function clearStored() {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

interface EliteContextValue {
  phase: ElitePhase;
  error: string | null;
  accountId: string | null;
  sessionToken: string | null;
  enter: () => Promise<void>;
  signOut: () => void;
  handleAuthError: (code?: string) => void;
}

const EliteContext = createContext<EliteContextValue | null>(null);

export function EliteSessionProvider({ children }: { children: ReactNode }) {
  const wallet = useWallet();
  const [phase, setPhase] = useState<ElitePhase>("checking");
  const [error, setError] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const sessionAccountIdRef = useRef<string | null>(null);
  const [sessionAccountId, setSessionAccountId] = useState<string | null>(null);
  const walletEverMatchedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = loadStored();
      if (!stored) { setPhase("idle"); return; }
      setSessionToken(stored.token);
      sessionAccountIdRef.current = stored.accountId;
      setSessionAccountId(stored.accountId);
      const res = await api.elite.me(stored.token);
      if (cancelled) return;
      if (res.success) setPhase("eligible");
      else { clearStored(); setSessionToken(null); sessionAccountIdRef.current = null; setSessionAccountId(null); setPhase("idle"); }
    })();
    return () => { cancelled = true; };
  }, []);

  // Cross-account wipe (same bug as cali-context): never keep elite session
  // when a different Hedera account is connected, even if we never matched
  // on this page load.
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
      sessionAccountIdRef.current = null;
      setSessionAccountId(null);
      walletEverMatchedRef.current = false;
      setError(null);
      setPhase("idle");
    }
  }, [wallet.connected, wallet.accountId]);

  const enter = useCallback(async () => {
    setError(null);
    const accountId = wallet.accountId;
    if (!wallet.connected || !accountId) {
      setError("Connect HashPack or Sign in with email first, then unlock again.");
      setPhase("error");
      return;
    }

    setPhase("challenging");
    const ch = await api.elite.challenge(accountId);
    if (!ch.success || !ch.data) { setError(ch.error || "Challenge failed"); setPhase("error"); return; }

    setPhase("signing");
    let signature: string | null;
    try { signature = await wallet.signMessage(ch.data.challenge); } catch (e: any) {
      setError(e?.message || "Signature cancelled"); setPhase("error"); return;
    }
    if (!signature) {
      setError(
        wallet.walletProvider === "magic"
          ? "No signature returned. Approve the Magic prompt and try again."
          : "No signature returned. Approve in HashPack and try again."
      );
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
    const verify = await api.elite.verify(accountId, ch.data.nonce, signature, wcSession);
    if (!verify.success || !verify.data) {
      setError(verify.error || "Elite access denied");
      setPhase("error");
      return;
    }

    const stored = { token: verify.data.sessionToken, accountId, exp: verify.data.expiresAt };
    persistStored(stored);
    setSessionToken(stored.token);
    sessionAccountIdRef.current = accountId;
    setSessionAccountId(accountId);
    walletEverMatchedRef.current = true;
    setPhase("eligible");
  }, [wallet]);

  const signOut = useCallback(() => {
    clearStored();
    setSessionToken(null);
    sessionAccountIdRef.current = null;
    setSessionAccountId(null);
    walletEverMatchedRef.current = false;
    setPhase("idle");
  }, []);

  const handleAuthError = useCallback((code?: string) => {
    if (code === "ELITE_SESSION_REQUIRED" || code === "ELITE_ELIGIBILITY_EXPIRED" || code === "ELITE_ACCESS_DENIED") {
      clearStored();
      setSessionToken(null);
      sessionAccountIdRef.current = null;
      setSessionAccountId(null);
      walletEverMatchedRef.current = false;
      setPhase(code === "ELITE_ACCESS_DENIED" ? "revoked" : "idle");
    }
  }, []);

  const value = useMemo(() => ({
    phase, error, accountId: sessionAccountId, sessionToken, enter, signOut, handleAuthError,
  }), [phase, error, sessionAccountId, sessionToken, enter, signOut, handleAuthError]);

  return <EliteContext.Provider value={value}>{children}</EliteContext.Provider>;
}

export function useEliteSession() {
  const ctx = useContext(EliteContext);
  if (!ctx) throw new Error("useEliteSession must be used within EliteSessionProvider");
  return ctx;
}