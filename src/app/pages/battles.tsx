/**
 * BOTB Battles Page — Production Token-Weighted Voting
 * =====================================================
 * - Token-weighted: users allocate real BOTB tokens as vote weight
 * - Event-scoped: tokens can't be double-spent across battles in same event
 * - Signature-required: every vote (and change) needs a wallet signature
 * - Server-verified: backend checks mirror node balance + NFT holdings
 * - Live vote percentages computed from actual KV vote records (12s poll)
 * - Optimistic local-state update: server returns authoritative tallies in
 *   the vote response → instant UI feedback, no read-after-write gap
 */

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Swords, Clock, CheckCircle, Zap, TrendingUp, Users, Lock,
  Loader2, User, Shield, Crown, AlertCircle, Timer, Pencil,
  Fingerprint, Trophy, Flame, Hash, Target, CalendarClock,
} from "lucide-react";
import { useWallet } from "../components/wallet-context";
import { useVIP } from "../components/vip/vip-context";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import botbShield from "figma:asset/2d6e7a2459a1a0d372fe2cf8a444eed0da642b5f.png";
import { toast } from "sonner";
import { useLiveBattles, useAthleteMap, useMyVotes, useAllocations, useEvents } from "../lib/hooks";
import { api } from "../lib/api";
import { generateSecureNonce } from "../lib/api";
import { signatureCancelledMessage, signaturePromptMessage } from "../lib/magic-signing-guidance";
import type { Battle, Athlete, BattleVote } from "../lib/types";
import { ErrorCard } from "../components/error-boundary";
import { VoteCelebration, type CelebrationData } from "../components/vote-celebration";
import { BattleLoader } from "../components/battle-loader";
import { useBattleTheme, resolveAthleteColors } from "../components/battle-theme-context";
import { CountryFlag, InlineFlag } from "../components/country-flag";

// ─── Constants ──────────────────────────────────────────────────────────────
type BattleFilter = "all" | "voting_open" | "upcoming" | "completed";

function matchesFilter(status: string, filter: BattleFilter): boolean {
  if (filter === "all") return true;
  if (filter === "voting_open") return status === "voting_open";
  if (filter === "upcoming") return status === "upcoming" || status === "draft";
  if (filter === "completed") return status === "winner_declared" || status === "rewards_distributed" || status === "voting_closed";
  return false;
}

function statusLabel(status: string): { text: string; color: string; icon: "live" | "upcoming" | "completed" } {
  switch (status) {
    case "voting_open": return { text: "VOTING OPEN", color: "#EF4444", icon: "live" };
    case "upcoming": return { text: "UPCOMING", color: "#f59e0b", icon: "upcoming" };
    case "draft": return { text: "DRAFT", color: "#8494A7", icon: "upcoming" };
    case "voting_closed": return { text: "VOTING CLOSED", color: "#6AA3E0", icon: "completed" };
    case "winner_declared": return { text: "COMPLETED", color: "#10b981", icon: "completed" };
    case "rewards_distributed": return { text: "REWARDS PAID", color: "#10b981", icon: "completed" };
    case "cancelled": return { text: "CANCELLED", color: "#8494A7", icon: "completed" };
    default: return { text: status.toUpperCase(), color: "#8494A7", icon: "upcoming" };
  }
}

function generateNonce(): string {
  return generateSecureNonce();
}

const ORBITRON = { fontFamily: "Orbitron, sans-serif" } as const;

/**
 * Official WCO Weight Classes — abbreviations for battle card badges.
 * Ranges: Straw 105–115, Feather 115–125, Light 125–135, Super Light 135–145,
 * Welter 145–155, Middle 155–165, Super Middle 165+ (no upper limit).
 */
function getWeightClassAbbr(wc: string): string {
  const lower = wc.toLowerCase();
  // Order matters — most specific patterns first.
  if (lower.includes("straw")) return "STW";
  if (lower.includes("feather")) return "FTW";
  if (lower.includes("super") && lower.includes("middle")) return "SMW";
  if (lower.includes("super") && lower.includes("light")) return "SLW";
  if (lower.includes("welter")) return "WLT";
  if (lower.includes("middle")) return "MDW";
  if (lower.includes("light")) return "LTW";
  if (lower.includes("open")) return "OPN";
  return wc.substring(0, 3).toUpperCase();
}

// ─── Mobile haptic feedback (Vibration API) ─────────────────────────────────
function haptic(ms: number | number[] = 50) {
  try { navigator?.vibrate?.(ms); } catch {}
}

// ─── Countdown helper ───────────────────────────────────────────────────────
// votingClosesAt = competition morning (set by admin). Show the comp date
// and how many days until showtime — giving fans a clear sense of urgency.
function formatCountdown(battle: { votingClosesAt: string; votingOpensAt: string; status: string }): { compDateStr: string; daysLeft: number; urgent: boolean; isLive: boolean } | null {
  const closeDate = battle.votingClosesAt;
  if (!closeDate) return null;
  const target = new Date(closeDate);
  if (isNaN(target.getTime())) return null;
  if (!["voting_open", "upcoming", "draft"].includes(battle.status)) return null;

  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return null;

  // "Jun 3" same year, "Jun 3, 2027" different year
  const sameYear = target.getFullYear() === now.getFullYear();
  const compDateStr = target.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(sameYear ? {} : { year: "numeric" }),
  });

  return { compDateStr, daysLeft, urgent: daysLeft <= 3, isLive: battle.status === "voting_open" };
}

function daysLeftText(days: number): string {
  if (days <= 0) return "Today!";
  if (days === 1) return "Tomorrow";
  return `in ${days} days`;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BattlesPage
// ═══════════════════════════════════════════════════════════════════════════════
export function BattlesPage() {
  const [filter, setFilter] = useState<BattleFilter>("all");
  const [submitting, setSubmitting] = useState(false);
  const [signingStep, setSigningStep] = useState<"idle" | "building" | "signing" | "submitting">("idle");
  // Inline picks: battleId → { athleteId, stakeAmount } — tracks ALL selections across open battles
  const [picks, setPicks] = useState<Map<string, { athleteId: string; stakeAmount: number }>>(new Map());
  const {
    connected, connect, accountId, botbBalance, votingPower,
    hasGovernorNFT, hasSigmaNFT, isConnecting, signMessage,
    walletSessionToken, walletProvider,
  } = useWallet();
  const { vipActive } = useVIP();

  const { data: battles, loading: battlesLoading, error: battlesError, hasError: battlesHasError, refresh: refreshBattles, patchData: patchBattles } = useLiveBattles(12000);
  const { map: athleteMap, loading: athletesLoading } = useAthleteMap();
  const { voteMap, refresh: refreshMyVotes } = useMyVotes(connected ? accountId : null);
  const { allocations, refresh: refreshAllocations } = useAllocations(connected ? accountId : null);
  const { data: events } = useEvents();

  const loading = battlesLoading || athletesLoading;

  // ─── Dynamic Theme Engine — IntersectionObserver for active battle ─────
  const { setBattleTheme, clearBattleTheme } = useBattleTheme();
  const battleCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const dominantBattleRef = useRef<string | null>(null);

  // Track which battle card is most prominent in viewport → update theme
  useEffect(() => {
    const entries = new Map<string, number>();
    const observer = new IntersectionObserver(
      (obs) => {
        for (const entry of obs) {
          const id = (entry.target as HTMLElement).dataset.battleId;
          if (!id) continue;
          entries.set(id, entry.intersectionRatio);
        }
        // Find the most visible battle
        let maxRatio = 0;
        let maxId: string | null = null;
        entries.forEach((ratio, id) => {
          if (ratio > maxRatio) { maxRatio = ratio; maxId = id; }
        });
        if (maxId && maxRatio > 0.3 && maxId !== dominantBattleRef.current) {
          dominantBattleRef.current = maxId;
          const battle = battles.find((b) => b.id === maxId);
          if (battle) {
            const a1 = athleteMap.get(battle.athlete1Id) || null;
            const a2 = athleteMap.get(battle.athlete2Id) || null;
            setBattleTheme(maxId, a1, a2);
          }
        } else if (maxRatio <= 0.1 && entries.size > 0) {
          dominantBattleRef.current = null;
          clearBattleTheme();
        }
      },
      { threshold: [0, 0.1, 0.3, 0.5, 0.7, 1.0] },
    );

    battleCardRefs.current.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [battles, athleteMap, setBattleTheme, clearBattleTheme]);

  // Clear theme when leaving the battles page
  useEffect(() => {
    return () => { clearBattleTheme(); };
  }, [clearBattleTheme]);

  // ─── Vote celebration overlay ──────────────────────────────────────────
  const [celebration, setCelebration] = useState<CelebrationData | null>(null);

  // ─── Live tally change detection (progress bar glow) ───────────────────
  // Track previous vote counts per battle to detect when tallies shift
  const prevTalliesRef = useRef<Map<string, { v1: number; v2: number }>>(new Map());
  const [glowingBattles, setGlowingBattles] = useState<Set<string>>(new Set());

  useEffect(() => {
    const prev = prevTalliesRef.current;
    const newGlow = new Set<string>();

    for (const b of battles) {
      const old = prev.get(b.id);
      if (old && (old.v1 !== b.votes1Count || old.v2 !== b.votes2Count)) {
        newGlow.add(b.id);
      }
      prev.set(b.id, { v1: b.votes1Count, v2: b.votes2Count });
    }

    if (newGlow.size > 0) {
      setGlowingBattles(newGlow);
      // Clear glow after animation completes
      const timer = setTimeout(() => setGlowingBattles(new Set()), 1500);
      return () => clearTimeout(timer);
    }
  }, [battles]);

  const filteredBattles = useMemo(
    () => battles.filter((b) => matchesFilter(b.status, filter)),
    [battles, filter]
  );

  const getAthlete = (id: string): Athlete | null => athleteMap.get(id) || null;

  const tokenLive = botbBalance > 0;

  // ─── Inline pick handlers ───────────────────────────────────────────────
  const togglePick = useCallback((battleId: string, athleteId: string) => {
    if (!connected) { connect(); return; }
    haptic(50);
    setPicks((prev) => {
      const next = new Map(prev);
      const existing = next.get(battleId);
      if (existing?.athleteId === athleteId) {
        next.delete(battleId); // Deselect
      } else {
        next.set(battleId, { athleteId, stakeAmount: existing?.stakeAmount || 0 });
      }
      return next;
    });
  }, [connected, connect]);

  const setPickStake = useCallback((battleId: string, amount: number) => {
    setPicks((prev) => {
      const next = new Map(prev);
      const existing = next.get(battleId);
      if (existing) {
        next.set(battleId, { ...existing, stakeAmount: Math.max(0, Math.floor(amount)) });
      }
      return next;
    });
  }, []);

  // ─── Max stake for a battle (accounts for other picks in same event) ────
  const getMaxStake = useCallback((battleId: string, eventId: string) => {
    if (!tokenLive) return 0;
    let used = 0;
    // Existing allocations for battles NOT in current picks
    const eventAlloc = allocations[eventId];
    if (eventAlloc) {
      for (const entry of eventAlloc.battles || []) {
        if (!picks.has(entry.battleId)) {
          used += entry.stakeAmount || 0;
        }
      }
    }
    // Other picks in the same event
    picks.forEach((p, bid) => {
      if (bid !== battleId) {
        const b = battles.find(x => x.id === bid);
        if (b && (b.eventId || "standalone") === eventId) used += p.stakeAmount;
      }
    });
    return Math.max(0, Math.floor(botbBalance - used));
  }, [tokenLive, allocations, picks, battles, botbBalance]);

  // ─── Summary stats ──────────────────────────────────────────────────────
  const totalPicks = picks.size;
  const totalStake = useMemo(() => {
    let sum = 0;
    picks.forEach(p => { sum += p.stakeAmount; });
    return sum;
  }, [picks]);

  // Group picks by event for batch submission
  const picksByEvent = useMemo(() => {
    const map = new Map<string, { eventId: string; eventName: string; battlePicks: { battleId: string; athleteId: string; stakeAmount: number }[] }>();
    picks.forEach((pick, battleId) => {
      const battle = battles.find(b => b.id === battleId);
      if (!battle) return;
      const eid = battle.eventId || "standalone";
      if (!map.has(eid)) {
        const evt = events.find(e => e.id === eid);
        map.set(eid, { eventId: eid, eventName: evt?.name || eid, battlePicks: [] });
      }
      map.get(eid)!.battlePicks.push({ battleId, athleteId: pick.athleteId, stakeAmount: pick.stakeAmount });
    });
    return map;
  }, [picks, battles, events]);

  // ─── Submit all picks — one signature, per-event submission ──────────────
  // Each event group gets its own nonce (multi-event picks don't collide).
  // ALL nonces/battleIds/eventIds are in one signed message so each
  // endpoint's signedMessage.includes(x) check passes.
  const handleSubmitAll = useCallback(async () => {
    if (!connected || !accountId || !signMessage || picks.size === 0) return;
    const eventEntries = Array.from(picksByEvent.entries());
    if (eventEntries.length === 0) return;

    haptic([40, 30, 40]); // tactile confirmation: submit initiated
    setSigningStep("building");
    setSubmitting(true);

    try {
      // One nonce per event group (avoids replay collision across groups)
      const eventNonces = new Map<string, string>();
      for (const [eid] of eventEntries) eventNonces.set(eid, generateNonce());

      const allBattleCount = eventEntries.reduce((s, [, g]) => s + g.battlePicks.length, 0);
      const totalStakeAmt = eventEntries.reduce(
        (s, [, g]) => s + g.battlePicks.reduce((ss, bp) => ss + (tokenLive ? bp.stakeAmount : 0), 0), 0
      );
      const hasUpdates = Array.from(picks.keys()).some(bid => voteMap.has(bid));

      // Build combined human-readable message
      // CRITICAL: Use ASCII-only characters (codes 0-127) for the signed message.
      // This ensures byte-level compatibility between all encoding methods.
      const ml: string[] = [
        "=======================================",
        allBattleCount > 1
          ? "  BATTLE OF THE BARS -- MULTI VOTE"
          : "  BATTLE OF THE BARS -- VOTE",
        "  World Calisthenics Organization",
        "=======================================",
        "",
        `Wallet: ${accountId}`,
        `Total Battles: ${allBattleCount}`,
        `Total Stake: ${totalStakeAmt.toLocaleString('en-US')} BOTB`,
        `Timestamp: ${new Date().toISOString()}`,
        "",
      ];
      for (const [eid, { eventName, battlePicks }] of eventEntries) {
        ml.push(
          `--- Event: ${eventName} ---`,
          `EventID: ${eid}`,
          `Nonce: ${eventNonces.get(eid)!}`,
          `Battles: ${battlePicks.length}`,
          "",
        );
        for (const bp of battlePicks) {
          const battle = battles.find(b => b.id === bp.battleId);
          const athlete = getAthlete(bp.athleteId);
          ml.push(
            `  Battle: ${battle?.title || bp.battleId}`,
            `  Pick: ${athlete?.name || bp.athleteId}`,
            `  Stake: ${(tokenLive ? bp.stakeAmount : 0).toLocaleString('en-US')} BOTB`,
            `  BattleID: ${bp.battleId}`,
            `  AthleteID: ${bp.athleteId}`,
            "",
          );
        }
      }
      ml.push(
        hasUpdates ? "NOTE: Some votes update previous picks." : "",
        "This is a VOTE, not a transaction.",
        "No tokens will be transferred.",
        "Your BOTB balance is used as voting",
        "weight only -- tokens remain in your",
        "wallet at all times.",
        "=======================================",
      );
      const combinedMsg = ml.filter(Boolean).join("\n");

      // Sign once
      setSigningStep("signing");
      toast.info(
        `Sign once to submit ${allBattleCount} vote${allBattleCount > 1 ? "s" : ""}. ${signaturePromptMessage(
          walletProvider,
          "approve"
        )}`,
        { duration: 15000 },
      );
      const signature = await signMessage(combinedMsg);
      if (!signature) {
        toast.error(signatureCancelledMessage(walletProvider));
        return;
      }

      setSigningStep("submitting");

      // Submit each event group
      let totalProcessed = 0;
      let totalWeightedAll = 0;
      let anyFailed = false;

      for (const [eid, { eventName, battlePicks }] of eventEntries) {
        const nonce = eventNonces.get(eid)!;
        const payload = battlePicks.map(bp => ({
          battleId: bp.battleId,
          athleteId: bp.athleteId,
          stakeAmount: tokenLive ? bp.stakeAmount : 0,
        }));

        if (payload.length === 1) {
          const res = await api.voteBattle({
            battleId: payload[0].battleId, wallet: accountId, athleteId: payload[0].athleteId,
            stakeAmount: payload[0].stakeAmount, signature, signedMessage: combinedMsg, nonce,
          }, walletSessionToken || undefined);
          if (res.success && res.data) {
            totalProcessed += 1;
            totalWeightedAll += res.data.weightedVote || 0;
            if (res.data.battleTallies) {
              const bid = payload[0].battleId;
              const tallies = res.data.battleTallies;
              patchBattles(prev => prev.map(b => b.id === bid ? { ...b, ...tallies } : b));
            }
          } else {
            console.error(`[VOTE] Failed battle ${payload[0].battleId}:`, res.error);
            anyFailed = true;
            toast.error(res.error || `Vote failed for ${eventName}`);
          }
        } else {
          const res = await api.voteBattlesBatch({
            wallet: accountId, eventId: eid, votes: payload,
            signature, signedMessage: combinedMsg, nonce,
          }, walletSessionToken || undefined);
          if (res.success && res.data) {
            totalProcessed += res.data.votesProcessed || payload.length;
            totalWeightedAll += res.data.totalWeighted || 0;
            if (res.data.votes) {
              patchBattles(prev => {
                let u = prev;
                for (const v of res.data.votes) { if (v.battleTallies) u = u.map(b => b.id === v.battleId ? { ...b, ...v.battleTallies } : b); }
                return u;
              });
            }
          } else {
            console.error(`[VOTE] Batch failed event ${eid}:`, res.error);
            anyFailed = true;
            toast.error(res.error || `Batch vote failed for ${eventName}`);
          }
        }
      }

      if (totalProcessed > 0) {
        haptic([60, 40, 60, 40, 100]); // success celebration pattern
        // ─── Fire celebration overlay ──────────────────────────────
        const allAthleteNames: string[] = [];
        for (const [, { battlePicks }] of eventEntries) {
          for (const bp of battlePicks) {
            const a = getAthlete(bp.athleteId);
            if (a?.name) allAthleteNames.push(a.name);
          }
        }
        setCelebration({
          id: Date.now(),
          voteCount: totalProcessed,
          athleteNames: allAthleteNames,
          isGovernor: hasGovernorNFT,
          isSigma: hasSigmaNFT,
          votingPower,
          totalWeighted: totalWeightedAll,
          totalStake: totalStakeAmt,
          tokenLive,
        });

        toast.success(
          <div className="space-y-1">
            <p className="font-bold">
              {totalProcessed} vote{totalProcessed > 1 ? "s" : ""} confirmed!
              {anyFailed ? " (some failed)" : ""}
            </p>
            {totalStakeAmt > 0 ? (
              <p className="text-xs opacity-80">
                {totalStakeAmt.toLocaleString()} BOTB &times; {votingPower}x = {totalWeightedAll.toLocaleString()} weighted
              </p>
            ) : (
              <p className="text-xs opacity-80">Headcount vote{totalProcessed > 1 ? "s" : ""} recorded</p>
            )}
            <p className="text-xs opacity-60 flex items-center gap-1">
              <Fingerprint className="w-3 h-3" /> Signature verified
            </p>
          </div>,
          { duration: 6000 },
        );
      }

      setPicks(new Map());
      refreshMyVotes();
      refreshAllocations();
      setTimeout(() => refreshBattles(), 800);
    } catch (err: any) {
      if (err?.message?.includes("cancelled") || err?.message?.includes("rejected")) {
        toast.error(signatureCancelledMessage(walletProvider));
      } else {
        toast.error("Vote failed. Please try again.");
        console.error("[VOTE]", err);
      }
    } finally {
      setSubmitting(false);
      setSigningStep("idle");
    }
  }, [connected, accountId, signMessage, picks, picksByEvent, battles, voteMap, tokenLive, patchBattles, refreshBattles, refreshMyVotes, refreshAllocations, votingPower, hasGovernorNFT, hasSigmaNFT, athleteMap, walletProvider]);

  // ─── Filters ────────────────────────────────────────────────────────────
  const FILTERS: { key: BattleFilter; label: string; icon: typeof Swords }[] = [
    { key: "all", label: "All Battles", icon: Swords },
    { key: "voting_open", label: "Live", icon: Zap },
    { key: "upcoming", label: "Upcoming", icon: Clock },
    { key: "completed", label: "Completed", icon: CheckCircle },
  ];

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen relative">

      {/* Ambient background — shifts with Dynamic Theme Engine */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ transition: "all var(--botb-transition)" }}>
        <div
          className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full blur-[150px]"
          style={{ background: "var(--botb-a1-bg)", transition: "background var(--botb-transition)" }}
        />
        <div
          className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full blur-[120px]"
          style={{ background: "var(--botb-a2-bg)", transition: "background var(--botb-transition)" }}
        />
      </div>

      <div className="relative z-10 py-8 sm:py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* ── Header ── */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 sm:gap-6 mb-8 sm:mb-12"
          >
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-gradient-to-br from-[#111d30] to-[#0d1526] border border-[#4274B9]/20 flex items-center justify-center overflow-hidden">
                <ImageWithFallback src={botbShield} alt="BOTB" className="w-6 h-6 sm:w-8 sm:h-8 object-contain" />
              </div>
              <div>
                <h1 className="text-xl sm:text-3xl font-black tracking-tight text-[#E8ECF0]" style={ORBITRON}>
                  BATTLES
                </h1>
                <p className="text-[0.65rem] sm:text-xs text-[#8494A7] mt-0.5">
                  {tokenLive
                    ? "Token-weighted voting · signature verified"
                    : "Free headcount votes · no token rewards yet · signature verified"}
                </p>
              </div>
            </div>

            {/* Filter pills */}
            <div className="flex gap-2 flex-wrap">
              {FILTERS.map((f) => {
                const active = filter === f.key;
                const Icon = f.icon;
                return (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[0.6rem] font-bold tracking-wider transition-all duration-200 ${
                      active
                        ? "bg-[#4274B9]/15 text-[#6AA3E0] border border-[#4274B9]/30"
                        : "bg-[#0B1120] text-[#8494A7] border border-[#1e293b] hover:border-[#4274B9]/20 hover:text-[#6AA3E0]"
                    }`}
                    style={ORBITRON}
                  >
                    <Icon className="w-3 h-3" />
                    {f.label}
                    {f.key === "voting_open" && battles.filter((b) => b.status === "voting_open").length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 rounded-full text-[0.45rem] bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/20">
                        {battles.filter((b) => b.status === "voting_open").length}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* ── Loading / Error / Empty ── */}
          {loading && <BattleLoader />}

          {battlesHasError && !loading && (
            <ErrorCard error={battlesError || "Failed to load battles"} />
          )}

          {!loading && !battlesHasError && filteredBattles.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16 sm:py-20"
            >
              <Swords className="w-10 h-10 mx-auto text-[#4274B9]/20 mb-4" />
              <p className="text-[#8494A7] text-sm max-w-sm mx-auto">
                {filter === "all"
                  ? "Battles will appear here once the WCO admin creates matchups via the Admin Command Center."
                  : "No battles match this filter. Try another category."}
              </p>
            </motion.div>
          ) : (
            <div className="space-y-6 sm:space-y-8">
              {filteredBattles.map((battle, i) => {
                const status = statusLabel(battle.status);
                const a1 = getAthlete(battle.athlete1Id);
                const a2 = getAthlete(battle.athlete2Id);
                // Dynamic Theme Engine: resolve per-athlete brand colors
                const c1 = resolveAthleteColors(a1, "left");
                const c2 = resolveAthleteColors(a2, "right");
                const totalWeighted = battle.votes1Weighted + battle.votes2Weighted;
                const totalCount = battle.votes1Count + battle.votes2Count;
                const pct1 = totalWeighted > 0
                  ? ((battle.votes1Weighted / totalWeighted) * 100).toFixed(1)
                  : totalCount > 0
                  ? ((battle.votes1Count / totalCount) * 100).toFixed(1)
                  : "50.0";
                const pct2 = totalWeighted > 0
                  ? ((battle.votes2Weighted / totalWeighted) * 100).toFixed(1)
                  : totalCount > 0
                  ? ((battle.votes2Count / totalCount) * 100).toFixed(1)
                  : "50.0";
                const myPick = picks.get(battle.id);
                const myVote = voteMap.get(battle.id);
                const canVote = battle.status === "voting_open";
                const isLive = battle.status === "voting_open";
                const isCompleted = battle.status === "winner_declared" || battle.status === "rewards_distributed";

                return (
                  <motion.div
                    key={battle.id}
                    ref={(el: HTMLDivElement | null) => {
                      if (el) battleCardRefs.current.set(battle.id, el);
                      else battleCardRefs.current.delete(battle.id);
                    }}
                    data-battle-id={battle.id}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1, duration: 0.5 }}
                    className="relative group/card"
                  >
                    {/* Outer glow for live battles */}
                    {isLive && (
                      <div className="absolute -inset-[1px] rounded-[22px] bg-gradient-to-r from-[#EF4444]/30 via-[#EF4444]/10 to-[#EF4444]/30 blur-sm animate-pulse pointer-events-none" />
                    )}

                    <div
                      className={`relative rounded-[20px] overflow-hidden transition-all duration-500 ${
                        isLive
                          ? "bg-[#0d1526] border border-[#EF4444]/20"
                          : "bg-[#0d1526] border border-[#1e293b]"
                      }`}
                      style={!isLive ? { transition: "border-color 300ms ease" } : undefined}
                      onMouseEnter={(e) => { if (!isLive) e.currentTarget.style.borderColor = `${c1.primary}40`; }}
                      onMouseLeave={(e) => { if (!isLive) e.currentTarget.style.borderColor = ""; }}
                    >
                      {/* Subtle top gradient accent — athlete brand colors */}
                      <div
                        className="absolute top-0 left-0 right-0 h-[2px]"
                        style={{
                          background: `linear-gradient(90deg, ${c1.primary}00, ${c1.primary}60, ${c2.primary}60, ${c2.primary}00)`,
                          transition: "background var(--botb-transition)",
                        }}
                      />

                      {/* ── Battle Header ── */}
                      <div className="p-5 sm:p-6 pb-4">
                        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                          <div className="flex items-center gap-3">
                            {/* Status pill */}
                            <div
                              className="flex items-center gap-2 px-3 py-1.5 rounded-full backdrop-blur-sm"
                              style={{
                                background: `${status.color}08`,
                                border: `1px solid ${status.color}25`,
                                boxShadow: `0 0 20px ${status.color}08`,
                              }}
                            >
                              {status.icon === "live" && (
                                <span className="relative flex h-2 w-2">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: status.color }} />
                                  <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: status.color }} />
                                </span>
                              )}
                              {status.icon === "upcoming" && <Timer className="w-3 h-3" style={{ color: status.color }} />}
                              {status.icon === "completed" && <CheckCircle className="w-3 h-3" style={{ color: status.color }} />}
                              <span className="text-[0.6rem] font-bold tracking-wider" style={{ ...ORBITRON, color: status.color }}>
                                {status.text}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 text-[#8494A7]">
                              <div className="w-1 h-1 rounded-full bg-[#8494A7]/40" />
                              <span className="text-[0.65rem]">{battle.round}</span>
                            </div>
                          </div>

                          {/* Meta info + Compact Payout */}
                          <div className="flex flex-col items-end gap-0.5 text-[0.65rem]">
                            <div className="flex items-center gap-3">
                              {battle.location && (
                                <span className="text-[#8494A7]">{battle.location}</span>
                              )}
                              {battle.totalPool > 0 && (
                                <span className="text-[#D4A843] font-bold" style={ORBITRON}>
                                  {battle.totalPool.toLocaleString()} WCO
                                </span>
                              )}
                            </div>
                            {/* ── Compact Payout (mirrors server snapshot math EXACTLY) ── */}
                            {/* Server: POST /admin/battles/:id/winner → snapshot generation
                             *  Token mode: weight = stakeAmount × votingPower
                             *  Headcount mode: weight = votingPower (NFT multiplier alone)
                             *  NFT multipliers: Governor=2×, Sigma=1.5×, Both=3×, Base=1×
                             *  Governor gets 2× share, Sigma 1.5×, Both 3× — even pre-launch */}
                            {myVote && battle.totalPool > 0 && (
                              battle.status === "voting_closed" ||
                              battle.status === "winner_declared" ||
                              battle.status === "rewards_distributed"
                            ) && (() => {
                              // ── Payout Math (mirrors server snapshot EXACTLY) ──
                              // Token mode: weight = stakeAmount × votingPower
                              // Headcount mode (pre-launch): weight = votingPower alone
                              //   Governor=2×, Sigma=1.5×, Both=3×, Base=1×
                              // votes1Weighted/votes2Weighted now track power-weighted
                              // tallies in both modes, so the same formula works.
                              const votedForA1 = myVote.athleteId === battle.athlete1Id;
                              const mySideWeighted = votedForA1 ? battle.votes1Weighted : battle.votes2Weighted;
                              const myVotingPower = myVote.votingPower || 1;
                              // In headcount mode (stakeAmount=0), server uses votingPower alone as weight.
                              // In token mode, weight = stakeAmount × votingPower.
                              const myStake = myVote.stakeAmount || 0;
                              const myWeightedVote = myStake > 0 ? myStake * myVotingPower : myVotingPower;

                              let sharePercent: number;
                              let potentialReward: number;

                              if (mySideWeighted > 0 && myWeightedVote > 0) {
                                sharePercent = (myWeightedVote / mySideWeighted) * 100;
                                potentialReward = (myWeightedVote / mySideWeighted) * battle.totalPool;
                              } else {
                                // Safety fallback: shouldn't happen, but prevents NaN
                                const mySideCount = votedForA1 ? battle.votes1Count : battle.votes2Count;
                                sharePercent = mySideCount > 0 ? 100 / mySideCount : 0;
                                potentialReward = mySideCount > 0 ? battle.totalPool / mySideCount : 0;
                              }

                              const isWinnerDeclared = !!battle.winnerId;
                              const userWon = isWinnerDeclared && battle.winnerId === myVote.athleteId;
                              const userLost = isWinnerDeclared && battle.winnerId !== myVote.athleteId;

                              if (userLost) {
                                return (
                                  <span className="text-[0.55rem] text-[#EF4444]/70 font-semibold" style={ORBITRON}>
                                    NO PAYOUT
                                  </span>
                                );
                              }

                              return (
                                <>
                                  <span className={`text-[0.6rem] font-bold ${userWon ? "text-[#D4A843]" : "text-[#6AA3E0]"}`} style={ORBITRON}>
                                    {sharePercent.toFixed(2)}%
                                  </span>
                                  <span className={`text-[0.7rem] font-black ${userWon ? "text-[#D4A843]" : "text-[#E8ECF0]"}`} style={ORBITRON}>
                                    {potentialReward.toLocaleString(undefined, { maximumFractionDigits: 2 })} WCO
                                  </span>
                                </>
                              );
                            })()}
                          </div>
                        </div>

                        <h3 className="text-[#E8ECF0] font-bold text-base sm:text-xl tracking-tight" style={ORBITRON}>
                          {battle.title}
                        </h3>

                        {/* ── Competition date + countdown ── */}
                        {(() => {
                          const cd = formatCountdown(battle);
                          if (!cd) return null;
                          return (
                            <div className="flex items-center gap-2 mt-2">
                              <CalendarClock className="w-3 h-3 text-[#8494A7]/60 shrink-0" />
                              <span className="text-[0.6rem] text-[#8494A7]">
                                {cd.compDateStr}
                              </span>
                              <span className="w-[3px] h-[3px] rounded-full bg-[#8494A7]/30" />
                              <span
                                className={`text-[0.6rem] font-semibold tracking-wide ${
                                  cd.urgent
                                    ? "text-[#EF4444]"
                                    : cd.isLive
                                    ? "text-[#f59e0b]"
                                    : "text-[#6AA3E0]"
                                }`}
                                style={ORBITRON}
                              >
                                {daysLeftText(cd.daysLeft)}
                              </span>
                            </div>
                          );
                        })()}
                      </div>

                      {/* ── Athlete Matchup ── */}
                      <div className="px-5 sm:px-6 pb-5 sm:pb-6">
                        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 sm:gap-5 items-stretch mb-5">
                          {/* Athlete 1 */}
                          <BattleAthleteCard
                            athlete={a1}
                            athleteId={battle.athlete1Id}
                            pct={pct1}
                            voteCount={battle.votes1Count}
                            isWinner={battle.winnerId === battle.athlete1Id}
                            isMyPick={myVote?.athleteId === battle.athlete1Id}
                            isSelected={myPick?.athleteId === battle.athlete1Id}
                            canSelect={canVote}
                            onSelect={() => togglePick(battle.id, battle.athlete1Id)}
                            side="left"
                            accentColor={c1.primary}
                          />

                          {/* VS Orb — gradient between both athlete brand colors */}
                          <div className="flex flex-col items-center justify-center gap-2">
                            <div className="relative">
                              <div
                                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center relative z-10 ${
                                  isLive
                                    ? "bg-gradient-to-br from-[#1a1030] to-[#0d1526] border-2 border-[#EF4444]/30"
                                    : "bg-gradient-to-br from-[#111d30] to-[#0d1526]"
                                }`}
                                style={!isLive ? {
                                  border: `1px solid ${c1.border}`,
                                  transition: "border-color var(--botb-transition)",
                                } : undefined}
                              >
                                <Swords
                                  className="w-5 h-5 sm:w-6 sm:h-6"
                                  style={{ color: isLive ? "#EF4444" : c1.primary, transition: "color var(--botb-transition)" }}
                                />
                              </div>
                              {/* Glow behind orb — gradient between both athlete colors */}
                              <div
                                className={`absolute inset-0 rounded-full blur-xl ${isLive ? "animate-pulse" : ""}`}
                                style={{
                                  background: isLive
                                    ? "rgba(239,68,68,0.15)"
                                    : `linear-gradient(135deg, ${c1.glow}, ${c2.glow})`,
                                  transition: "background var(--botb-transition)",
                                }}
                              />
                            </div>
                            <span className="text-[0.5rem] text-[#8494A7]/60 font-bold tracking-widest" style={ORBITRON}>VS</span>
                          </div>

                          {/* Athlete 2 */}
                          <BattleAthleteCard
                            athlete={a2}
                            athleteId={battle.athlete2Id}
                            pct={pct2}
                            voteCount={battle.votes2Count}
                            isWinner={battle.winnerId === battle.athlete2Id}
                            isMyPick={myVote?.athleteId === battle.athlete2Id}
                            isSelected={myPick?.athleteId === battle.athlete2Id}
                            canSelect={canVote}
                            onSelect={() => togglePick(battle.id, battle.athlete2Id)}
                            side="right"
                            accentColor={c2.primary}
                          />
                        </div>

                        {/* ── Vote Progress Bar ── */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold" style={{ ...ORBITRON, color: c1.primary, transition: "color var(--botb-transition)" }}>{pct1}%</span>
                              <span className="text-[0.55rem] text-[#8494A7]">{battle.votes1Count} votes</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#0B1120] border border-[#1e293b]">
                              {isLive && (
                                <span className="relative flex h-1.5 w-1.5 mr-0.5">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10b981] opacity-75" />
                                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#10b981]" />
                                </span>
                              )}
                              <Users className="w-3 h-3 text-[#8494A7]" />
                              <span className="text-[0.6rem] text-[#8494A7] font-medium">{totalCount}</span>
                              {isLive && (
                                <span className="text-[0.4rem] text-[#10b981]/70 font-bold tracking-wider" style={ORBITRON}>LIVE</span>
                              )}
                              <AnimatePresence>
                                {glowingBattles.has(battle.id) && (
                                  <motion.span
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.5 }}
                                    transition={{ duration: 0.3 }}
                                    className="text-[0.35rem] text-[#D4A843] font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-[#D4A843]/10 border border-[#D4A843]/20"
                                    style={ORBITRON}
                                  >
                                    NEW VOTE
                                  </motion.span>
                                )}
                              </AnimatePresence>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-[0.55rem] text-[#8494A7]">{battle.votes2Count} votes</span>
                              <span className="text-sm font-bold" style={{ ...ORBITRON, color: c2.primary, transition: "color var(--botb-transition)" }}>{pct2}%</span>
                            </div>
                          </div>

                          <div className="relative h-2.5 rounded-full bg-[#0B1120] overflow-hidden border border-[#1e293b]/50">
                            {/* Live vote movement glow overlay */}
                            <AnimatePresence>
                              {glowingBattles.has(battle.id) && (
                                <motion.div
                                  className="absolute inset-0 z-20 rounded-full pointer-events-none"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: [0, 1, 0.6, 1, 0] }}
                                  exit={{ opacity: 0 }}
                                  transition={{ duration: 1.4, ease: "easeOut" }}
                                  style={{
                                    background: `linear-gradient(90deg, ${c1.glowStrong}, rgba(255,255,255,0.15), ${c2.glowStrong})`,
                                    boxShadow: `0 0 20px ${c2.glowStrong}, inset 0 0 12px rgba(255,255,255,0.1)`,
                                  }}
                                />
                              )}
                            </AnimatePresence>
                            {/* Left bar — athlete 1 brand color */}
                            <motion.div
                              className="absolute top-0 left-0 h-full rounded-l-full"
                              initial={{ width: "50%" }}
                              animate={{ width: `${pct1}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              style={{
                                background: `linear-gradient(90deg, ${c1.primary}, ${c1.primary}dd)`,
                                boxShadow: totalCount > 0 ? `0 0 12px ${c1.glow}` : "none",
                                transition: "background 300ms ease, box-shadow 300ms ease",
                              }}
                            />
                            {/* Right bar — athlete 2 brand color */}
                            <motion.div
                              className="absolute top-0 right-0 h-full rounded-r-full"
                              initial={{ width: "50%" }}
                              animate={{ width: `${pct2}%` }}
                              transition={{ duration: 0.8, ease: "easeOut" }}
                              style={{
                                background: `linear-gradient(90deg, ${c2.primary}dd, ${c2.primary})`,
                                boxShadow: totalCount > 0 ? `0 0 12px ${c2.glow}` : "none",
                                transition: "background 300ms ease, box-shadow 300ms ease",
                              }}
                            />
                            {/* Center divider line */}
                            {totalCount > 0 && (
                              <div className="absolute top-0 bottom-0 w-[2px] bg-[#0d1526] z-10" style={{ left: `${pct1}%`, transform: "translateX(-50%)" }} />
                            )}
                          </div>
                        </div>

                        {/* ── Confirmed vote indicator (already submitted) ── */}
                        {myVote && !myPick && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-[#10b981]/5 to-transparent border border-[#10b981]/15 mb-4"
                          >
                            <div className="flex items-center gap-2.5 text-xs">
                              <div className="w-7 h-7 rounded-lg bg-[#10b981]/10 border border-[#10b981]/20 flex items-center justify-center">
                                <Fingerprint className="w-3.5 h-3.5 text-[#10b981]" />
                              </div>
                              <div>
                                <span className="text-[#10b981] font-semibold">Voted: </span>
                                <span className="text-[#E8ECF0] font-bold">{getAthlete(myVote.athleteId)?.name || myVote.athleteId}</span>
                                {myVote.stakeAmount > 0 && (
                                  <span className="text-[#8494A7] ml-1.5">
                                    ({myVote.stakeAmount.toLocaleString()} BOTB &times; {myVote.votingPower}x)
                                  </span>
                                )}
                              </div>
                            </div>
                            {canVote && (
                              <span className="text-[0.5rem] text-[#8494A7]">Tap athlete to change</span>
                            )}
                          </motion.div>
                        )}

                        {/* ── Inline Stake Input (appears when athlete is picked) ── */}
                        <AnimatePresence>
                          {myPick && canVote && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.25 }}
                              className="overflow-hidden mb-4"
                            >
                              <div className="p-3 rounded-xl bg-[#0B1120] border border-[#4274B9]/20 space-y-2">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-[0.6rem]">
                                    <CheckCircle className="w-3.5 h-3.5 text-[#10b981]" />
                                    <span className="text-[#10b981] font-semibold">
                                      {getAthlete(myPick.athleteId)?.name || myPick.athleteId}
                                    </span>
                                    {myVote && (
                                      <span className="text-[0.45rem] text-[#f59e0b] bg-[#f59e0b]/10 px-1.5 py-0.5 rounded border border-[#f59e0b]/20" style={ORBITRON}>
                                        UPDATING
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => setPicks(prev => { const n = new Map(prev); n.delete(battle.id); return n; })}
                                    className="text-[0.5rem] text-[#EF4444]/60 hover:text-[#EF4444] transition-colors"
                                  >
                                    Remove
                                  </button>
                                </div>

                                {tokenLive && (() => {
                                  const eventId = battle.eventId || "standalone";
                                  const maxForThis = getMaxStake(battle.id, eventId);
                                  const cappedMax = maxForThis + myPick.stakeAmount; // Can re-allocate own stake

                                  return (
                                    <div className="space-y-1.5">
                                      <div className="flex items-center justify-between text-[0.55rem]">
                                        <span className="text-[#8494A7]">Token weight</span>
                                        <span className="text-[#E8ECF0] font-bold" style={ORBITRON}>
                                          {myPick.stakeAmount.toLocaleString()} BOTB
                                        </span>
                                      </div>
                                      <input
                                        type="range"
                                        min={0}
                                        max={cappedMax}
                                        step={1}
                                        value={myPick.stakeAmount}
                                        onChange={(e) => {
                                          const val = Math.min(Number(e.target.value), cappedMax);
                                          setPickStake(battle.id, val);
                                        }}
                                        className="w-full accent-[#4274B9] h-1.5"
                                      />
                                      <div className="flex justify-between text-[0.45rem] text-[#8494A7]">
                                        <span>0</span>
                                        <span>{cappedMax.toLocaleString()} available</span>
                                      </div>
                                    </div>
                                  );
                                })()}

                                {!tokenLive && (
                                  <p className="text-[0.5rem] text-[#8494A7]">
                                    Free headcount vote · no token rewards yet
                                  </p>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* ── Tap to vote prompt (no pick yet, no existing vote) ── */}
                        {canVote && !myPick && !myVote && (
                          <div className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-[#4274B9]/[0.03] border border-[#1e293b] mb-4">
                            <Target className="w-3.5 h-3.5 text-[#4274B9]/40" />
                            <span className="text-[0.55rem] text-[#8494A7]/60">
                              {connected ? "Tap an athlete to cast your vote" : "Connect wallet to vote"}
                            </span>
                          </div>
                        )}

                        {/* Winner banner removed — trophy overlay is on the winning athlete card */}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Floating Submit Bar ── */}
      <AnimatePresence>
        {totalPicks > 0 && connected && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-20 sm:bottom-6 left-0 right-0 z-50 px-4 sm:px-6"
          >
            <div className="max-w-2xl mx-auto">
              <div className="relative rounded-2xl overflow-hidden">
                {/* Glow */}
                <div className="absolute -inset-[1px] rounded-[18px] bg-gradient-to-r from-[#4274B9]/40 via-[#6AA3E0]/30 to-[#4274B9]/40 blur-sm pointer-events-none" />

                <div className="relative bg-[#0d1526]/95 backdrop-blur-xl border border-[#4274B9]/30 rounded-2xl p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-4">
                    {/* Left: Summary */}
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4274B9]/20 to-[#6AA3E0]/10 border border-[#4274B9]/30 flex items-center justify-center shrink-0">
                        <Swords className="w-4 h-4 text-[#6AA3E0]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[0.6rem] sm:text-xs font-bold text-[#E8ECF0]" style={ORBITRON}>
                          {totalPicks} PICK{totalPicks > 1 ? "S" : ""} READY
                        </p>
                        <div className="flex items-center gap-2 text-[0.5rem] text-[#8494A7] mt-0.5">
                          {tokenLive && totalStake > 0 && (
                            <span>{totalStake.toLocaleString()} BOTB &times; {votingPower}x</span>
                          )}
                          {!tokenLive && <span>Headcount mode</span>}
                          <span className="flex items-center gap-0.5">
                            <Shield className="w-2.5 h-2.5 text-[#4274B9]" />
                            {votingPower}x
                          </span>
                          {hasGovernorNFT && (
                            <span className="text-[0.4rem] text-[#D4A843]" style={ORBITRON}>GOV</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Submit button */}
                    <motion.button
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      disabled={submitting}
                      onClick={handleSubmitAll}
                      className="relative px-5 sm:px-6 py-2.5 sm:py-3 rounded-xl text-white text-[0.6rem] sm:text-xs font-bold overflow-hidden shrink-0 group/submit"
                      style={ORBITRON}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-[#4274B9] to-[#6AA3E0]" />
                      <div className="absolute inset-0 bg-gradient-to-r from-[#6AA3E0] to-[#4274B9] opacity-0 group-hover/submit:opacity-100 transition-opacity duration-500" />
                      <div className="absolute inset-0 overflow-hidden">
                        <div className="absolute -top-[100%] -left-[100%] w-[300%] h-[300%] animate-[shimmer_3s_infinite] bg-[linear-gradient(115deg,transparent_30%,rgba(255,255,255,0.12)_50%,transparent_70%)]" />
                      </div>
                      <span className="relative flex items-center gap-2">
                        {submitting ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            {signingStep === "signing" ? "SIGN..." :
                             signingStep === "submitting" ? "SENDING..." :
                             "..."}
                          </>
                        ) : (
                          <>
                            <Fingerprint className="w-3.5 h-3.5" />
                            SIGN {totalPicks > 1 ? `& SUBMIT ${totalPicks}` : "& VOTE"}
                          </>
                        )}
                      </span>
                    </motion.button>
                  </div>

                  {/* Pick chips */}
                  {totalPicks > 1 && (
                    <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-[#1e293b]">
                      {Array.from(picks.entries()).map(([bid, p]) => {
                        const athlete = getAthlete(p.athleteId);
                        return (
                          <span
                            key={bid}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[0.45rem] bg-[#4274B9]/10 border border-[#4274B9]/20 text-[#6AA3E0]"
                            style={ORBITRON}
                          >
                            <CheckCircle className="w-2 h-2" />
                            {athlete?.name?.split(" ")[0] || "?"}
                            {tokenLive && p.stakeAmount > 0 && (
                              <span className="text-[#8494A7]">{p.stakeAmount.toLocaleString()}</span>
                            )}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Vote Celebration Overlay ── */}
      <VoteCelebration
        celebration={celebration}
        onComplete={() => setCelebration(null)}
      />
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// BattleAthleteCard — Premium athlete panel with cinematic image treatment
// ═══════════════════════════════════════════════════════════════════════════════
interface BattleAthleteCardProps {
  athlete: Athlete | null;
  athleteId: string;
  pct: string;
  voteCount: number;
  isWinner: boolean;
  isMyPick: boolean;
  isSelected: boolean;
  canSelect: boolean;
  onSelect: () => void;
  side: "left" | "right";
  accentColor: string;
}

function BattleAthleteCard({
  athlete, athleteId, pct, voteCount, isWinner, isMyPick, isSelected, canSelect, onSelect, side, accentColor,
}: BattleAthleteCardProps) {
  const [hovered, setHovered] = useState(false);
  const hasPfp = athlete?.pfpUrl && athlete.pfpUrl !== "placeholder";
  const borderColor = athlete?.nftCardBorderColor || accentColor;

  return (
    <motion.div
      onClick={canSelect ? onSelect : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      whileHover={canSelect ? { scale: 1.03 } : {}}
      whileTap={canSelect ? { scale: 0.97 } : {}}
      className={`relative rounded-2xl p-3 sm:p-4 transition-all duration-300 ${
        canSelect ? "cursor-pointer" : ""
      } ${side === "right" ? "text-right" : "text-left"}`}
      style={{
        background: isSelected
          ? `linear-gradient(135deg, ${accentColor}10, ${accentColor}05)`
          : hovered && canSelect
          ? `linear-gradient(135deg, ${accentColor}08, transparent)`
          : "#0a101e",
        boxShadow: isWinner
          ? `0 0 30px rgba(212,168,67,0.15), inset 0 0 0 1px rgba(212,168,67,0.25)`
          : isSelected
          ? `0 0 30px ${accentColor}20, inset 0 0 0 2px ${accentColor}`
          : isMyPick
          ? `inset 0 0 0 1px rgba(16,185,129,0.3)`
          : hovered && canSelect
          ? `0 0 20px ${accentColor}10, inset 0 0 0 1px ${accentColor}30`
          : "inset 0 0 0 1px rgba(30,41,59,0.5)",
      }}
    >
      {/* ── Winner Trophy Overlay ── */}
      {isWinner && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 160, damping: 14, delay: 0.2 }}
          className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center rounded-2xl overflow-hidden"
        >
          {/* Soft gold radial glow behind trophy */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#D4A843]/10 via-transparent to-[#D4A843]/05 rounded-2xl" />
          {/* Pulsing trophy + WINNER text */}
          <motion.div
            animate={{
              scale: [1, 1.08, 1],
              opacity: [0.25, 0.4, 0.25],
            }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="relative flex flex-col items-center gap-1"
          >
            <Trophy className="w-16 h-16 sm:w-20 sm:h-20 text-[#D4A843] drop-shadow-[0_0_24px_rgba(212,168,67,0.35)]" />
            <span
              className="text-[0.6rem] sm:text-xs font-black tracking-[0.25em] text-[#D4A843] drop-shadow-[0_0_12px_rgba(212,168,67,0.4)]"
              style={ORBITRON}
            >
              WINNER
            </span>
          </motion.div>
          {/* Gold border glow */}
          <div className="absolute inset-0 rounded-2xl border-2 border-[#D4A843]/25" />
        </motion.div>
      )}

      {/* Layout: avatar + info stacked, centered per side */}
      <div className={`flex flex-col items-center gap-3`}>
        {/* Avatar with flag + weight class badges */}
        <div className="relative">
          {/* Country flag badge — left side of avatar */}
          {athlete?.country && (
            <div className="absolute -left-2 sm:-left-3 top-0 z-20">
              <CountryFlag country={athlete.country} size="md" showCode />
            </div>
          )}

          {/* Weight class badge — right side */}
          {athlete?.weightClass && (
            <div
              className="absolute -right-2 sm:-right-2.5 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center h-6 sm:h-7 px-1.5 rounded-full bg-[#0B1120]/90 backdrop-blur-sm border shadow-lg"
              style={{ borderColor: `${accentColor}35` }}
              title={athlete.weightClass}
            >
              <span
                className="text-[0.4rem] sm:text-[0.45rem] font-bold tracking-wider whitespace-nowrap"
                style={{ ...ORBITRON, color: accentColor }}
              >
                {getWeightClassAbbr(athlete.weightClass)}
              </span>
            </div>
          )}

          <div
            className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden transition-all duration-300 ${
              isSelected ? "ring-2 ring-offset-2 ring-offset-[#0a101e]" : ""
            }`}
            style={{
              boxShadow: isSelected
                ? `0 0 24px ${accentColor}30`
                : hovered && canSelect
                ? `0 0 16px ${accentColor}15`
                : "none",
              ringColor: isSelected ? accentColor : undefined,
            }}
          >
            {hasPfp ? (
              <ImageWithFallback
                src={athlete!.pfpUrl}
                alt={athlete!.name}
                className={`w-full h-full object-cover transition-transform duration-500 ${
                  hovered ? "scale-110" : "scale-100"
                }`}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-[#111d30] to-[#0B1120]">
                <User className="w-7 h-7 text-[#4274B9]/15" />
              </div>
            )}
          </div>

          {/* Glow ring behind avatar */}
          {(isSelected || (hovered && canSelect)) && (
            <div
              className="absolute -inset-1 rounded-full blur-md pointer-events-none -z-10"
              style={{ background: `${accentColor}15` }}
            />
          )}


        </div>

        {/* Name + nickname */}
        <div className="w-full min-w-0 text-center">
          <p className="text-[#E8ECF0] text-[0.65rem] sm:text-xs font-bold truncate" style={ORBITRON}>
            {athlete?.name || athleteId}
          </p>
          {athlete?.nickname && (
            <p className="text-[0.5rem] sm:text-[0.55rem] truncate italic mt-0.5" style={{ color: `${borderColor}bb` }}>
              "{athlete.nickname}"
            </p>
          )}
          {athlete?.country && (
            <p className="text-[0.5rem] text-[#8494A7] mt-0.5 truncate flex items-center justify-center gap-1">
              <InlineFlag country={athlete.country} /> {athlete.country}
            </p>
          )}
        </div>

        {/* Athlete real stats — rank, W-L record, power rating */}
        {athlete && (
          <div className="w-full grid grid-cols-3 gap-1">
            <div className="flex flex-col items-center p-1.5 rounded-lg bg-[#0B1120]/60 border border-[#1e293b]/40">
              <span className="text-[0.4rem] text-[#8494A7] uppercase tracking-wider">Rank</span>
              <span className="text-[0.6rem] sm:text-xs font-bold" style={{ ...ORBITRON, color: accentColor }}>
                #{athlete.rank || "—"}
              </span>
            </div>
            <div className="flex flex-col items-center p-1.5 rounded-lg bg-[#0B1120]/60 border border-[#1e293b]/40">
              <span className="text-[0.4rem] text-[#8494A7] uppercase tracking-wider">Record</span>
              <span className="text-[0.6rem] sm:text-xs font-bold text-[#E8ECF0]" style={ORBITRON}>
                <span className="text-[#10b981]">{athlete.wins}</span>
                <span className="text-[#8494A7]">-</span>
                <span className="text-[#EF4444]">{athlete.losses}</span>
              </span>
            </div>
            <div className="flex flex-col items-center p-1.5 rounded-lg bg-[#0B1120]/60 border border-[#1e293b]/40">
              <span className="text-[0.4rem] text-[#8494A7] uppercase tracking-wider">Power</span>
              <span className="text-[0.6rem] sm:text-xs font-bold" style={{ ...ORBITRON, color: accentColor }}>
                {athlete.totalPowerRating || 0}
              </span>
            </div>
          </div>
        )}

        {/* Streak + special move badges */}
        {athlete && (athlete.streak !== 0 || athlete.specialMove) && (
          <div className="flex items-center justify-center gap-1.5 flex-wrap">
            {athlete.streak > 0 && (
              <span className="text-[0.4rem] text-[#f59e0b] font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#f59e0b]/10 border border-[#f59e0b]/20 flex items-center gap-0.5" style={ORBITRON}>
                <Flame className="w-2.5 h-2.5" /> {athlete.streak}W STREAK
              </span>
            )}
            {athlete.streak < 0 && (
              <span className="text-[0.4rem] text-[#EF4444] font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#EF4444]/10 border border-[#EF4444]/20" style={ORBITRON}>
                {Math.abs(athlete.streak)}L STREAK
              </span>
            )}
            {athlete.specialMove && (
              <span className="text-[0.4rem] text-[#A855F7] font-semibold px-1.5 py-0.5 rounded bg-[#A855F7]/10 border border-[#A855F7]/20 truncate max-w-[90px]" title={athlete.specialMove}>
                {athlete.specialMove}
              </span>
            )}
          </div>
        )}

        {/* Badges row */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          {isMyPick && !isSelected && (
            <span className="text-[0.45rem] text-[#10b981] font-bold tracking-wider px-1.5 py-0.5 rounded bg-[#10b981]/10 border border-[#10b981]/20" style={ORBITRON}>
              YOUR PICK
            </span>
          )}
          {isSelected && (
            <span className="text-[0.45rem] font-bold tracking-wider px-1.5 py-0.5 rounded flex items-center gap-0.5" style={{ ...ORBITRON, color: accentColor, background: `${accentColor}10`, border: `1px solid ${accentColor}25` }}>
              <CheckCircle className="w-2.5 h-2.5" /> SELECTED
            </span>
          )}
        </div>

        {/* Stats */}
        <div className="flex items-center justify-center gap-2 w-full">
          <div className="flex items-center gap-1">
            <Users className="w-2.5 h-2.5 text-[#8494A7]/50" />
            <span className="text-[0.55rem] text-[#8494A7]">{voteCount}</span>
          </div>
          <span className="text-base sm:text-lg font-black" style={{ ...ORBITRON, color: accentColor }}>
            {pct}%
          </span>
        </div>
      </div>
    </motion.div>
  );
}