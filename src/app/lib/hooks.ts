/**
 * BOTB Live Data Hooks
 * =====================
 * React hooks that fetch from the production KV-backed API.
 * Replaces all mock-data imports across the app.
 *
 * Each hook returns { data, loading, error, refresh }.
 * Data is cached in state — call refresh() to re-fetch.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { api } from "./api";
import type { Athlete, Battle, BattleEvent, Proposal, SiteConfig, BattleVote, Sponsor } from "./types";

// ---------------------------------------------------------------------------
// Generic fetch hook factory
// ---------------------------------------------------------------------------

interface HookResult<T> {
  data: T;
  loading: boolean;
  error: string | null;
  refresh: () => void;
  /** Whether the last fetch attempt failed (even if stale data exists) */
  hasError: boolean;
  /** Optimistic local-state patch — applies immediately, overwritten on next refresh */
  patchData: (updater: (prev: T) => T) => void;
}

function useFetch<T>(
  fetcher: () => Promise<{ success: boolean; data?: T; error?: string }>,
  fallback: T
): HookResult<T> {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);
  const initialLoadDone = useRef(false);

  const load = useCallback(async () => {
    // Only show loading spinner on the very first fetch — subsequent
    // refreshes (e.g. polling) run silently in the background so the
    // UI doesn't flash "Loading..." every cycle.
    if (!initialLoadDone.current) {
      setLoading(true);
    }
    try {
      const res = await fetcher();
      if (res.success && res.data !== undefined) {
        setData(res.data);
        setError(null);
        setHasError(false);
      } else if (res.error) {
        setError(res.error);
        setHasError(true);
        console.error("[useFetch]", res.error);
      }
    } catch (err: any) {
      const msg = err?.message || "Network error";
      setError(msg);
      setHasError(true);
      console.error("[useFetch]", msg);
    } finally {
      setLoading(false);
      initialLoadDone.current = true;
    }
  }, [fetcher]);

  // Optimistic patch: apply a local state update immediately.
  // Will be overwritten on next successful refresh (server = source of truth).
  const patchData = useCallback((updater: (prev: T) => T) => {
    setData(updater);
  }, []);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, hasError, refresh: load, patchData };
}

// ---------------------------------------------------------------------------
// useAthletes — all athletes sorted by rank
// ---------------------------------------------------------------------------

export function useAthletes(): HookResult<Athlete[]> {
  const fetcher = useCallback(() => api.getAthletes(), []);
  return useFetch<Athlete[]>(fetcher, []);
}

// ---------------------------------------------------------------------------
// useBattles — all battles with optional filters
// ---------------------------------------------------------------------------

export function useBattles(filters?: { eventId?: string; status?: string }): HookResult<Battle[]> {
  const fetcher = useCallback(() => api.getBattles(filters), [filters]);
  return useFetch<Battle[]>(fetcher, []);
}

// ---------------------------------------------------------------------------
// useEvents — all bracket events
// ---------------------------------------------------------------------------

export function useEvents(): HookResult<BattleEvent[]> {
  const fetcher = useCallback(() => api.getEvents(), []);
  return useFetch<BattleEvent[]>(fetcher, []);
}

// ---------------------------------------------------------------------------
// useProposals — all governance proposals
// ---------------------------------------------------------------------------

export function useProposals(
  walletSessionToken?: string | null,
): HookResult<Proposal[]> {
  const fetcher = useCallback(
    () => api.getProposals({ walletSessionToken: walletSessionToken ?? undefined }),
    [walletSessionToken],
  );
  return useFetch<Proposal[]>(fetcher, [walletSessionToken]);
}

// ---------------------------------------------------------------------------
// useConfig — site configuration + token stats
// ---------------------------------------------------------------------------

const DEFAULT_CONFIG: SiteConfig & { isAdmin: boolean } = {
  tokenStats: {
    symbol: "BOTB",
    price: 0,
    change24h: 0,
    marketCap: 0,
    totalStaked: 0,
    totalVoters: 0,
    totalBattles: 0,
    tvl: 0,
  },
  adminWallets: [],
  votingEnabled: true,
  mintingEnabled: false,
  stakingEnabled: false,
  isAdmin: false,
};

export function useConfig(adminWallet?: string): HookResult<SiteConfig & { isAdmin: boolean }> {
  const fetcher = useCallback(() => api.getConfig(adminWallet), [adminWallet]);
  return useFetch(fetcher, DEFAULT_CONFIG);
}

// ---------------------------------------------------------------------------
// Athlete lookup helper — builds a map for resolving IDs to full objects
// ---------------------------------------------------------------------------

export function useAthleteMap(): {
  map: Map<string, Athlete>;
  loading: boolean;
  athletes: Athlete[];
  refresh: () => void;
} {
  const { data: athletes, loading, refresh } = useAthletes();
  const map = new Map<string, Athlete>();
  athletes.forEach((a) => map.set(a.id, a));
  return { map, loading, athletes, refresh };
}

// ---------------------------------------------------------------------------
// useMyVotes — all battle votes for the connected wallet
// ---------------------------------------------------------------------------

export function useMyVotes(wallet: string | null): HookResult<BattleVote[]> & {
  voteMap: Map<string, BattleVote>;
} {
  const fetcher = useCallback(
    () => wallet ? api.getMyVotes(wallet) : Promise.resolve({ success: true, data: [] as BattleVote[] }),
    [wallet]
  );
  const result = useFetch<BattleVote[]>(fetcher, []);
  const voteMap = new Map<string, BattleVote>();
  result.data.forEach((v) => voteMap.set(v.battleId, v));
  return { ...result, voteMap };
}

// ---------------------------------------------------------------------------
// useLiveBattles — battles with auto-refresh polling for live tallies
// ---------------------------------------------------------------------------

export function useLiveBattles(intervalMs = 12000): HookResult<Battle[]> {
  const result = useBattles();

  useEffect(() => {
    if (intervalMs <= 0) return;
    const iv = setInterval(() => { result.refresh(); }, intervalMs);
    return () => clearInterval(iv);
  }, [intervalMs, result.refresh]);

  return result;
}

// ---------------------------------------------------------------------------
// useAllocations — event-scoped token allocation tracking for a wallet
// ---------------------------------------------------------------------------

export interface EventAllocation {
  eventId: string;
  totalAllocated: number;
  battles: { battleId: string; stakeAmount: number; athleteId?: string }[];
}

export function useAllocations(wallet: string | null): {
  allocations: Record<string, EventAllocation>;
  botbBalance: number;
  tokenLaunched: boolean;
  loading: boolean;
  refresh: () => void;
} {
  const fetcher = useCallback(
    () => wallet
      ? api.getVoteAllocations(wallet)
      : Promise.resolve({ success: true, data: { wallet: "", botbBalance: 0, tokenLaunched: false, allocations: {} } }),
    [wallet]
  );
  const result = useFetch(fetcher, { wallet: "", botbBalance: 0, tokenLaunched: false, allocations: {} });
  return {
    allocations: result.data.allocations as Record<string, EventAllocation>,
    botbBalance: result.data.botbBalance,
    tokenLaunched: result.data.tokenLaunched,
    loading: result.loading,
    refresh: result.refresh,
  };
}

/**
 * Compute the maximum tokens a wallet can stake on a specific battle,
 * considering all other allocations in the same event.
 */
export function computeAvailableStake(
  balance: number,
  eventId: string,
  battleId: string,
  allocations: Record<string, EventAllocation>,
): number {
  const eventAlloc = allocations[eventId];
  if (!eventAlloc) return balance; // No allocations yet → full balance available

  // Total allocated in this event, MINUS what's already allocated to THIS battle
  // (because the user can re-allocate their existing stake on this battle)
  const currentBattleStake = eventAlloc.battles.find(b => b.battleId === battleId)?.stakeAmount || 0;
  const otherAllocations = eventAlloc.totalAllocated - currentBattleStake;

  return Math.max(0, balance - otherAllocations);
}

// ---------------------------------------------------------------------------
// useSponsors — active sponsors sorted by display order
// ---------------------------------------------------------------------------

export function useSponsors(): HookResult<Sponsor[]> {
  const fetcher = useCallback(() => api.getSponsors(), []);
  return useFetch<Sponsor[]>(fetcher, []);
}