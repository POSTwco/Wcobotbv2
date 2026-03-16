/**
 * BatchVotePanel — Event-scoped batch voting for 2-12 battles
 * ============================================================
 * One ED25519 signature covers all battle votes in an event.
 * Users pick athletes and allocate token stakes across battles,
 * then sign once and all votes are submitted atomically.
 *
 * Allocation rules:
 *   - Sum of all stakes across battles in the event <= wallet balance
 *   - Individual stake per battle >= 0
 *   - When BOTB token isn't live, stakes are displayed as 0 (headcount mode)
 *   - Existing votes can be updated (old stakes freed up for reallocation)
 */

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Swords, Zap, X, Shield, Crown, AlertCircle, Fingerprint, Loader2,
  ChevronDown, ChevronUp, Users, Trophy, Flame, User, CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { api, generateSecureNonce } from "../lib/api";
import type { Battle, Athlete, BattleVote } from "../lib/types";
import type { EventAllocation } from "../lib/hooks";
import { getCountryFlag } from "../lib/country-flags";
import { InlineFlag } from "./country-flag";

const ORBITRON = { fontFamily: "Orbitron, sans-serif" } as const;

// ��── Types ──────────────────────────────────────────────────────────────────

interface BatchPick {
  athleteId: string;
  stakeAmount: number;
}

interface BatchVotePanelProps {
  eventId: string;
  eventName: string;
  /** All battles in this event that are open for voting */
  openBattles: Battle[];
  athleteMap: Map<string, Athlete>;
  voteMap: Map<string, BattleVote>;
  allocations: Record<string, EventAllocation>;
  botbBalance: number;
  tokenLive: boolean;
  votingPower: number;
  hasGovernorNFT: boolean;
  hasSigmaNFT: boolean;
  wallet: string;
  signMessage: (msg: string) => Promise<string | null>;
  walletSessionToken?: string | null;
  onClose: () => void;
  onSuccess: (results: any) => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BatchVotePanel
// ═══════════════════════════════════════════════════════════════════════════════

export function BatchVotePanel({
  eventId, eventName, openBattles, athleteMap, voteMap, allocations,
  botbBalance, tokenLive, votingPower, hasGovernorNFT, hasSigmaNFT,
  wallet, signMessage, walletSessionToken, onClose, onSuccess,
}: BatchVotePanelProps) {
  // Initialize picks from existing votes
  const initialPicks = useMemo(() => {
    const m = new Map<string, BatchPick>();
    for (const b of openBattles) {
      const existing = voteMap.get(b.id);
      if (existing) {
        m.set(b.id, { athleteId: existing.athleteId, stakeAmount: existing.stakeAmount });
      }
    }
    return m;
  }, [openBattles, voteMap]);

  const [picks, setPicks] = useState<Map<string, BatchPick>>(initialPicks);
  const [submitting, setSubmitting] = useState(false);
  const [signingStep, setSigningStep] = useState<"idle" | "building" | "signing" | "submitting">("idle");
  const [expandedBattle, setExpandedBattle] = useState<string | null>(
    openBattles.length <= 4 ? "all" : null
  );

  // ─── Allocation math ──────────────────────────────────────────────────────
  const eventAlloc = allocations[eventId];

  // Tokens already allocated to battles NOT in this batch (other events or
  // battles in this event that aren't open for voting)
  const tokensInOtherAllocations = useMemo(() => {
    if (!eventAlloc) return 0;
    let other = 0;
    for (const entry of eventAlloc.battles || []) {
      const isBattleInBatch = openBattles.some(b => b.id === entry.battleId);
      // If it's a battle in this batch, those tokens will be re-allocated
      if (!isBattleInBatch) {
        other += entry.stakeAmount || 0;
      }
    }
    return other;
  }, [eventAlloc, openBattles]);

  const totalBatchStake = useMemo(() => {
    let sum = 0;
    picks.forEach((p) => { sum += p.stakeAmount; });
    return sum;
  }, [picks]);

  const availableBalance = Math.max(0, botbBalance - tokensInOtherAllocations);
  const overBudget = tokenLive && totalBatchStake > availableBalance;
  const remaining = Math.max(0, availableBalance - totalBatchStake);
  const picksCount = picks.size;
  const totalBattles = openBattles.length;

  // ─── Pick handlers ────────────────────────────────────────────────────────
  const selectAthlete = useCallback((battleId: string, athleteId: string) => {
    setPicks((prev) => {
      const next = new Map(prev);
      const existing = next.get(battleId);
      next.set(battleId, {
        athleteId,
        stakeAmount: existing?.stakeAmount || 0,
      });
      return next;
    });
  }, []);

  const setStake = useCallback((battleId: string, amount: number) => {
    setPicks((prev) => {
      const next = new Map(prev);
      const existing = next.get(battleId);
      if (existing) {
        next.set(battleId, { ...existing, stakeAmount: Math.max(0, amount) });
      }
      return next;
    });
  }, []);

  const removePick = useCallback((battleId: string) => {
    setPicks((prev) => {
      const next = new Map(prev);
      next.delete(battleId);
      return next;
    });
  }, []);

  // ─── Max stake for a specific battle (accounts for other picks) ───────────
  const getMaxStakeForBattle = useCallback((battleId: string) => {
    if (!tokenLive) return 0;
    let othersInBatch = 0;
    picks.forEach((p, bid) => {
      if (bid !== battleId) othersInBatch += p.stakeAmount;
    });
    return Math.max(0, Math.floor(availableBalance - othersInBatch));
  }, [picks, availableBalance, tokenLive]);

  // ─── Submit batch ─────────────────────────────────────────────────────────
  const handleSubmitBatch = useCallback(async () => {
    if (picks.size === 0) {
      toast.error("Select at least one athlete to vote!");
      return;
    }

    const votesPayload: { battleId: string; athleteId: string; stakeAmount: number }[] = [];
    const voteLines: string[] = [];

    for (const [battleId, pick] of picks) {
      const battle = openBattles.find(b => b.id === battleId);
      const athlete = athleteMap.get(pick.athleteId);
      const effectiveStake = tokenLive ? pick.stakeAmount : 0;

      votesPayload.push({
        battleId,
        athleteId: pick.athleteId,
        stakeAmount: effectiveStake,
      });

      voteLines.push(
        `  Battle: ${battle?.title || battleId}`,
        `  Pick: ${athlete?.name || pick.athleteId}`,
        `  Stake: ${effectiveStake.toLocaleString()} BOTB`,
        `  BattleID: ${battleId}`,
        `  AthleteID: ${pick.athleteId}`,
        "",
      );
    }

    const nonce = generateSecureNonce();
    const totalStake = votesPayload.reduce((s, v) => s + v.stakeAmount, 0);
    const hasUpdates = votesPayload.some(v => voteMap.has(v.battleId));

    const batchMessage = [
      "═══════════════════════════════════════",
      "  BATTLE OF THE BARS — BATCH VOTE",
      "  World Calisthenics Organization",
      "═══════════════════════════════════════",
      "",
      `Event: ${eventName}`,
      `EventID: ${eventId}`,
      `Battles: ${votesPayload.length}`,
      `Total Stake: ${totalStake.toLocaleString()} BOTB`,
      `Wallet: ${wallet}`,
      `Timestamp: ${new Date().toISOString()}`,
      `Nonce: ${nonce}`,
      "",
      "─── VOTES ───────────────────────────",
      "",
      ...voteLines,
      hasUpdates ? "NOTE: Some votes are updates to previous picks." : "",
      "This is a BATCH VOTE, not a transaction.",
      "No tokens will be transferred.",
      "Your BOTB balance is used as voting",
      "weight only — tokens remain in your",
      "wallet at all times.",
      "═══════════════════════════════════════",
    ].filter(Boolean).join("\n");

    setSigningStep("building");
    setSubmitting(true);

    try {
      setSigningStep("signing");
      toast.info(
        `Sign once to submit ${votesPayload.length} vote${votesPayload.length > 1 ? "s" : ""} — check HashPack.`,
        { duration: 15000 },
      );

      const signature = await signMessage(batchMessage);
      if (!signature) {
        toast.error("Batch vote signature was cancelled. Open HashPack and approve to vote.");
        return;
      }

      setSigningStep("submitting");

      const res = await api.voteBattlesBatch({
        wallet,
        eventId,
        votes: votesPayload,
        signature,
        signedMessage: batchMessage,
        nonce,
      }, walletSessionToken || undefined);

      if (res.success && res.data) {
        const d = res.data;
        toast.success(
          <div className="space-y-1">
            <p className="font-bold">{d.votesProcessed} vote{d.votesProcessed > 1 ? "s" : ""} confirmed!</p>
            <p className="text-xs opacity-80">
              {d.totalStaked.toLocaleString()} BOTB total &times; {d.votingPower}x = {d.totalWeighted.toLocaleString()} weighted
              {d.hasGovernorNFT && " (Governor boost)"}
            </p>
            <p className="text-xs opacity-60 flex items-center gap-1">
              <Fingerprint className="w-3 h-3" /> Single signature verified
            </p>
          </div>,
          { duration: 8000 },
        );

        onSuccess(d);
      } else {
        toast.error(res.error || "Batch vote failed");
      }
    } catch (err: any) {
      if (err?.message?.includes("cancelled") || err?.message?.includes("rejected")) {
        toast.error("Batch vote signature was cancelled. You must approve in HashPack.");
      } else {
        toast.error("Batch vote failed. Please try again.");
        console.error("[BATCH-VOTE]", err);
      }
    } finally {
      setSubmitting(false);
      setSigningStep("idle");
    }
  }, [picks, openBattles, athleteMap, voteMap, tokenLive, wallet, eventId, eventName, signMessage, onSuccess]);

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 40 }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
      className="relative rounded-2xl overflow-hidden bg-[#0a101e] border border-[#4274B9]/25"
    >
      {/* Top gradient accent */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#4274B9] via-[#6AA3E0] to-[#4274B9]" />

      {/* ── Header ── */}
      <div className="p-5 sm:p-6 border-b border-[#1e293b]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4274B9]/20 to-[#6AA3E0]/10 border border-[#4274B9]/30 flex items-center justify-center shrink-0">
              <Swords className="w-5 h-5 text-[#6AA3E0]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-base font-bold text-[#E8ECF0] truncate" style={ORBITRON}>
                BATCH VOTE
              </h3>
              <p className="text-[0.55rem] text-[#8494A7] truncate mt-0.5">
                {eventName} &bull; {totalBattles} battle{totalBattles !== 1 ? "s" : ""} open &bull; Sign once
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[#0B1120] border border-[#1e293b] flex items-center justify-center text-[#8494A7] hover:text-[#E8ECF0] hover:border-[#4274B9]/30 transition-all shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Allocation summary bar */}
        <div className="mt-4 p-3 rounded-xl bg-[#0B1120] border border-[#1e293b]">
          <div className="flex items-center justify-between text-[0.6rem] mb-2">
            <span className="text-[#8494A7]">Event budget</span>
            <span className="font-bold" style={{ ...ORBITRON, color: overBudget ? "#EF4444" : "#E8ECF0" }}>
              {tokenLive ? `${totalBatchStake.toLocaleString()} / ${availableBalance.toLocaleString()} BOTB` : "Pre-launch (headcount mode)"}
            </span>
          </div>
          {tokenLive && (
            <div className="relative h-2 rounded-full bg-[#1e293b] overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                animate={{ width: `${Math.min(100, availableBalance > 0 ? (totalBatchStake / availableBalance) * 100 : 0)}%` }}
                transition={{ duration: 0.3 }}
                style={{
                  background: overBudget
                    ? "linear-gradient(90deg, #EF4444, #DC2626)"
                    : "linear-gradient(90deg, #4274B9, #6AA3E0)",
                }}
              />
            </div>
          )}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2 text-[0.55rem]">
              <Shield className="w-3 h-3 text-[#4274B9]" />
              <span className="text-[#8494A7]">{votingPower}x power</span>
              {hasGovernorNFT && (
                <span className="text-[0.45rem] text-[#D4A843] bg-[#D4A843]/10 px-1.5 py-0.5 rounded border border-[#D4A843]/20" style={ORBITRON}>GOV</span>
              )}
              {hasSigmaNFT && (
                <span className="text-[0.45rem] text-[#A855F7] bg-[#A855F7]/10 px-1.5 py-0.5 rounded border border-[#A855F7]/20" style={ORBITRON}>SIGMA</span>
              )}
            </div>
            <span className="text-[0.55rem] text-[#8494A7]">
              {picksCount}/{totalBattles} battles selected
            </span>
          </div>
        </div>

        {overBudget && (
          <div className="flex items-center gap-2 mt-3 p-2.5 rounded-xl bg-[#EF4444]/5 border border-[#EF4444]/20">
            <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0" />
            <p className="text-[0.6rem] text-[#EF4444]">
              Total allocation exceeds your available balance by {(totalBatchStake - availableBalance).toLocaleString()} BOTB.
              Reduce stakes to continue.
            </p>
          </div>
        )}
      </div>

      {/* ── Battle List ── */}
      <div className="max-h-[60vh] overflow-y-auto">
        {openBattles.map((battle, i) => {
          const a1 = athleteMap.get(battle.athlete1Id);
          const a2 = athleteMap.get(battle.athlete2Id);
          const pick = picks.get(battle.id);
          const existingVote = voteMap.get(battle.id);
          const isExpanded = expandedBattle === "all" || expandedBattle === battle.id;
          const maxForThis = getMaxStakeForBattle(battle.id);

          return (
            <div
              key={battle.id}
              className={`border-b border-[#1e293b] last:border-b-0 ${pick ? "bg-[#4274B9]/[0.02]" : ""}`}
            >
              {/* Battle header row */}
              <button
                onClick={() => setExpandedBattle(isExpanded && expandedBattle !== "all" ? null : battle.id)}
                className="w-full p-4 sm:px-6 flex items-center justify-between gap-3 hover:bg-[#4274B9]/[0.03] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-[0.5rem] text-[#8494A7] font-bold w-5 shrink-0" style={ORBITRON}>
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs text-[#E8ECF0] font-bold truncate" style={ORBITRON}>
                      {battle.title}
                    </p>
                    <p className="text-[0.5rem] text-[#8494A7] truncate mt-0.5">
                      {a1?.name || "TBD"} vs {a2?.name || "TBD"} &bull; {battle.round}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {pick && (
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#10b981]/10 border border-[#10b981]/20">
                      <CheckCircle className="w-3 h-3 text-[#10b981]" />
                      <span className="text-[0.5rem] text-[#10b981] font-bold truncate max-w-[60px]" style={ORBITRON}>
                        {athleteMap.get(pick.athleteId)?.name?.split(" ")[0] || "Picked"}
                      </span>
                    </div>
                  )}
                  {existingVote && !pick && (
                    <span className="text-[0.45rem] text-[#f59e0b] bg-[#f59e0b]/10 px-1.5 py-0.5 rounded border border-[#f59e0b]/20" style={ORBITRON}>
                      VOTED
                    </span>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-[#8494A7]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#8494A7]" />
                  )}
                </div>
              </button>

              {/* Expanded battle content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 sm:px-6 pb-4 space-y-3">
                      {/* Athlete picker — two side-by-side cards */}
                      <div className="grid grid-cols-2 gap-2">
                        <AthletePickCard
                          athlete={a1}
                          athleteId={battle.athlete1Id}
                          isSelected={pick?.athleteId === battle.athlete1Id}
                          onSelect={() => selectAthlete(battle.id, battle.athlete1Id)}
                          accentColor="#4274B9"
                        />
                        <AthletePickCard
                          athlete={a2}
                          athleteId={battle.athlete2Id}
                          isSelected={pick?.athleteId === battle.athlete2Id}
                          onSelect={() => selectAthlete(battle.id, battle.athlete2Id)}
                          accentColor="#6AA3E0"
                        />
                      </div>

                      {/* Stake slider (only if picked and token live) */}
                      {pick && tokenLive && (
                        <div className="space-y-1.5 p-3 rounded-xl bg-[#0B1120] border border-[#1e293b]">
                          <div className="flex items-center justify-between text-[0.55rem]">
                            <span className="text-[#8494A7]">Stake</span>
                            <span className="text-[#E8ECF0] font-bold" style={ORBITRON}>
                              {pick.stakeAmount.toLocaleString()} BOTB
                            </span>
                          </div>
                          <input
                            type="range"
                            min={0}
                            max={maxForThis + (pick.stakeAmount)}
                            step={1}
                            value={pick.stakeAmount}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              const cappedMax = maxForThis + pick.stakeAmount;
                              setStake(battle.id, Math.min(val, cappedMax));
                            }}
                            className="w-full accent-[#4274B9] h-1.5"
                          />
                          <div className="flex justify-between text-[0.45rem] text-[#8494A7]">
                            <span>0</span>
                            <span>max {(maxForThis + pick.stakeAmount).toLocaleString()}</span>
                          </div>
                        </div>
                      )}

                      {/* Pre-launch note */}
                      {pick && !tokenLive && (
                        <div className="text-[0.5rem] text-[#8494A7] px-1">
                          Pre-launch: counts as 1 headcount vote
                        </div>
                      )}

                      {/* Remove pick */}
                      {pick && (
                        <button
                          onClick={() => removePick(battle.id)}
                          className="text-[0.5rem] text-[#EF4444]/60 hover:text-[#EF4444] transition-colors px-1"
                        >
                          Remove pick
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* ── Footer: Submit ── */}
      <div className="p-5 sm:p-6 border-t border-[#1e293b] space-y-3">
        {/* Summary chips */}
        {picksCount > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {Array.from(picks.entries()).map(([bid, p]) => {
              const athlete = athleteMap.get(p.athleteId);
              return (
                <span
                  key={bid}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[0.5rem] bg-[#4274B9]/10 border border-[#4274B9]/20 text-[#6AA3E0]"
                  style={ORBITRON}
                >
                  <CheckCircle className="w-2.5 h-2.5" />
                  {athlete?.name?.split(" ")[0] || "?"}
                  {tokenLive && p.stakeAmount > 0 && (
                    <span className="text-[#8494A7] ml-0.5">{p.stakeAmount.toLocaleString()}</span>
                  )}
                </span>
              );
            })}
          </div>
        )}

        <button
          disabled={picksCount === 0 || submitting || overBudget}
          onClick={handleSubmitBatch}
          className={`relative w-full py-3.5 rounded-xl text-white text-xs font-bold overflow-hidden transition-all ${
            picksCount === 0 || submitting || overBudget
              ? "bg-[#4274B9]/20 cursor-not-allowed text-white/40"
              : "group/btn"
          }`}
          style={ORBITRON}
        >
          {picksCount > 0 && !submitting && !overBudget && (
            <>
              <div className="absolute inset-0 bg-gradient-to-r from-[#4274B9] to-[#6AA3E0]" />
              <div className="absolute inset-0 bg-gradient-to-r from-[#6AA3E0] to-[#4274B9] opacity-0 group-hover/btn:opacity-100 transition-opacity duration-700" />
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-[100%] -left-[100%] w-[300%] h-[300%] animate-[shimmer_3s_infinite] bg-[linear-gradient(115deg,transparent_30%,rgba(255,255,255,0.1)_50%,transparent_70%)]" />
              </div>
            </>
          )}
          <span className="relative flex items-center justify-center gap-2.5">
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {signingStep === "signing" ? "APPROVE IN WALLET..." :
                 signingStep === "submitting" ? `SUBMITTING ${picksCount} VOTE${picksCount > 1 ? "S" : ""}...` :
                 "PREPARING..."}
              </>
            ) : (
              <>
                <Fingerprint className="w-4 h-4" />
                {picksCount === 0
                  ? "SELECT ATHLETES TO VOTE"
                  : `SIGN & SUBMIT ${picksCount} VOTE${picksCount > 1 ? "S" : ""}`}
              </>
            )}
          </span>
        </button>

        <p className="text-center text-[0.5rem] text-[#8494A7]/60">
          One signature &bull; {picksCount} battle{picksCount !== 1 ? "s" : ""} &bull; ED25519 verified
        </p>
      </div>
    </motion.div>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// AthletePickCard — Compact athlete selector for batch panel
// ═══════════════════════════════════════════════════════════════════════════════

function AthletePickCard({
  athlete, athleteId, isSelected, onSelect, accentColor,
}: {
  athlete: Athlete | null;
  athleteId: string;
  isSelected: boolean;
  onSelect: () => void;
  accentColor: string;
}) {
  const hasPfp = athlete?.pfpUrl && athlete.pfpUrl !== "placeholder";

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onSelect}
      className="relative rounded-xl p-3 transition-all duration-200 text-center"
      style={{
        background: isSelected ? `${accentColor}10` : "#0B1120",
        boxShadow: isSelected
          ? `inset 0 0 0 2px ${accentColor}, 0 0 20px ${accentColor}15`
          : "inset 0 0 0 1px rgba(30,41,59,0.5)",
      }}
    >
      {/* Avatar */}
      <div className="relative w-10 h-10 sm:w-12 sm:h-12 mx-auto rounded-full overflow-hidden mb-2">
        {hasPfp ? (
          <ImageWithFallback
            src={athlete!.pfpUrl}
            alt={athlete!.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-[#111d30] to-[#0B1120]">
            <User className="w-5 h-5 text-[#4274B9]/15" />
          </div>
        )}
        {isSelected && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <CheckCircle className="w-5 h-5" style={{ color: accentColor }} />
          </div>
        )}
      </div>

      <p className="text-[0.6rem] sm:text-xs font-bold truncate" style={{ ...ORBITRON, color: isSelected ? accentColor : "#E8ECF0" }}>
        {athlete?.name || athleteId}
      </p>
      {athlete?.country && (
        <p className="text-[0.45rem] text-[#8494A7] truncate mt-0.5 flex items-center justify-center gap-0.5"><InlineFlag country={athlete.country} /> {athlete.country}</p>
      )}

      {/* W-L mini stat */}
      {athlete && (
        <div className="flex items-center justify-center gap-1 mt-1.5 text-[0.45rem]" style={ORBITRON}>
          <span className="text-[#10b981]">{athlete.wins}W</span>
          <span className="text-[#8494A7]">-</span>
          <span className="text-[#EF4444]">{athlete.losses}L</span>
          {athlete.streak > 0 && (
            <Flame className="w-2.5 h-2.5 text-[#f59e0b]" />
          )}
        </div>
      )}
    </motion.button>
  );
}