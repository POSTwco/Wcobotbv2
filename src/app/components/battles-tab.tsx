/**
 * BOTB Admin: Battle Management Tab
 * ===================================
 * Manages battle lifecycle: set voting windows, advance status, declare winners.
 *
 * Status flow:
 *   draft → upcoming → voting_open → voting_closed → winner_declared → rewards_distributed
 *                                                                 ↘ cancelled
 *
 * Features:
 *   - Live vote tallies per battle
 *   - Inline voting window editor (open/close dates + pool)
 *   - One-click status transitions with confirmation
 *   - Winner declaration modal with athlete selection
 *   - Reward snapshot preview after winner declared
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Swords, Clock, CheckCircle, Loader2, Trophy, Users, Zap,
  ChevronDown, ChevronRight, CalendarClock, Ban, Award, Eye,
  BarChart3, User, AlertTriangle, ArrowRight, Coins, FileDown,
  Trash2,
} from "lucide-react";
import { api } from "../lib/api";
import { toast } from "sonner";
import { sanitizeErrorMessage } from "./error-boundary";
import type { Battle, Athlete, BattleEvent, RewardSnapshot } from "../lib/types";
import { ImageWithFallback } from "./figma/ImageWithFallback";

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

const STATUS_ORDER = ["draft", "upcoming", "voting_open", "voting_closed", "winner_declared", "rewards_distributed"] as const;

const STATUS_META: Record<string, { label: string; color: string; icon: any; nextStatus?: string; nextLabel?: string }> = {
  draft:               { label: "DRAFT",              color: "#8494A7", icon: Clock,        nextStatus: "upcoming",          nextLabel: "Publish → Upcoming" },
  upcoming:            { label: "UPCOMING",           color: "#f59e0b", icon: CalendarClock, nextStatus: "voting_open",      nextLabel: "Open Voting" },
  voting_open:         { label: "VOTING OPEN",        color: "#EF4444", icon: Zap,          nextStatus: "voting_closed",     nextLabel: "Close Voting" },
  voting_closed:       { label: "VOTING CLOSED",      color: "#6AA3E0", icon: CheckCircle,  nextStatus: undefined,           nextLabel: undefined }, // winner declared via separate action
  winner_declared:     { label: "WINNER DECLARED",    color: "#10b981", icon: Trophy,       nextStatus: "rewards_distributed", nextLabel: "Mark Rewards Distributed" },
  rewards_distributed: { label: "REWARDS DISTRIBUTED", color: "#22C55E", icon: Award,       nextStatus: undefined,           nextLabel: undefined },
  cancelled:           { label: "CANCELLED",          color: "#8494A7", icon: Ban,          nextStatus: undefined,           nextLabel: undefined },
};

function statusBadge(status: string) {
  const meta = STATUS_META[status] || STATUS_META.draft;
  const Icon = meta.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[0.55rem] border" style={{
      background: `${meta.color}10`,
      borderColor: `${meta.color}30`,
      color: meta.color,
      fontFamily: "Orbitron, sans-serif",
    }}>
      {status === "voting_open" ? (
        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
      ) : (
        <Icon className="w-3 h-3" />
      )}
      {meta.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// BattlesTab (exported)
// ---------------------------------------------------------------------------

export function BattlesTab({ wallet, sessionToken }: { wallet: string; sessionToken: string }) {
  const [battles, setBattles] = useState<Battle[]>([]);
  const [events, setEvents] = useState<BattleEvent[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Winner declaration state
  const [winnerModal, setWinnerModal] = useState<{ battleId: string; ath1: Athlete | null; ath2: Athlete | null } | null>(null);
  const [declaringWinner, setDeclaringWinner] = useState(false);

  // Snapshot preview
  const [snapshotPreview, setSnapshotPreview] = useState<{ battleId: string; snapshot: RewardSnapshot } | null>(null);
  // Airdrop confirmation
  const [airdropModal, setAirdropModal] = useState<{ battleId: string } | null>(null);
  const [airdropTxId, setAirdropTxId] = useState("");
  const [confirmingAirdrop, setConfirmingAirdrop] = useState(false);

  // Clear cancelled battle state
  const [clearModal, setClearModal] = useState<{ battleId: string; title: string; votes: number } | null>(null);
  const [clearing, setClearing] = useState(false);

  const athleteMap = useMemo(() => {
    const m = new Map<string, Athlete>();
    athletes.forEach((a) => m.set(a.id, a));
    return m;
  }, [athletes]);

  const eventMap = useMemo(() => {
    const m = new Map<string, BattleEvent>();
    events.forEach((e) => m.set(e.id, e));
    return m;
  }, [events]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, eRes, aRes] = await Promise.all([
        api.getBattles(),
        api.getEvents(),
        api.getAthletes(),
      ]);
      if (bRes.success && bRes.data) setBattles(bRes.data);
      if (eRes.success && eRes.data) setEvents(eRes.data);
      if (aRes.success && aRes.data) setAthletes(aRes.data);
    } catch (err) {
      console.error("[BattlesTab] load error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh battles every 15s for live tallies
  useEffect(() => {
    const iv = setInterval(async () => {
      try {
        const res = await api.getBattles();
        if (res.success && res.data) setBattles(res.data);
      } catch {}
    }, 15000);
    return () => clearInterval(iv);
  }, []);

  const filtered = useMemo(
    () => filterStatus === "all" ? battles : battles.filter((b) => b.status === filterStatus),
    [battles, filterStatus]
  );

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const advanceStatus = useCallback(async (battleId: string, newStatus: string, extras?: { votingOpensAt?: string; votingClosesAt?: string; totalPool?: number }) => {
    try {
      const res = await api.admin.updateBattleStatus(battleId, newStatus, wallet, sessionToken, extras);
      if (res.success && res.data) {
        setBattles((prev) => prev.map((b) => (b.id === battleId ? res.data! : b)));
        toast.success(`Battle status → ${STATUS_META[newStatus]?.label || newStatus}`);
      } else {
        toast.error(res.error || "Failed to update status");
      }
    } catch (err: any) {
      toast.error(sanitizeErrorMessage(err?.message));
    }
  }, [wallet, sessionToken]);

  const declareWinner = useCallback(async (battleId: string, winnerId: string) => {
    setDeclaringWinner(true);
    try {
      const res = await api.admin.declareWinner(battleId, winnerId, wallet, sessionToken);
      if (res.success && res.data) {
        setBattles((prev) => prev.map((b) => (b.id === battleId ? res.data!.battle : b)));
        toast.success(`Winner declared! Snapshot generated with ${res.data.snapshot.recipients.length} recipients.`);
        setWinnerModal(null);
        // Show snapshot
        setSnapshotPreview({ battleId, snapshot: res.data.snapshot });
      } else {
        toast.error(res.error || "Failed to declare winner");
      }
    } catch (err: any) {
      toast.error(sanitizeErrorMessage(err?.message));
    } finally {
      setDeclaringWinner(false);
    }
  }, [wallet, sessionToken]);

  const viewSnapshot = useCallback(async (battleId: string) => {
    try {
      const res = await api.admin.getSnapshot(battleId, wallet, sessionToken);
      if (res.success && res.data) {
        setSnapshotPreview({ battleId, snapshot: res.data });
      } else {
        toast.error(res.error || "Snapshot not found");
      }
    } catch (err: any) {
      toast.error(sanitizeErrorMessage(err?.message));
    }
  }, [wallet, sessionToken]);

  const confirmAirdrop = useCallback(async (battleId: string) => {
    setConfirmingAirdrop(true);
    try {
      const res = await api.admin.confirmAirdrop(battleId, airdropTxId, wallet, sessionToken);
      if (res.success && res.data) {
        setBattles((prev) => prev.map((b) => (b.id === battleId ? res.data!.battle : b)));
        toast.success(`Airdrop confirmed! Battle → Rewards Distributed.${airdropTxId ? ` TX: ${airdropTxId}` : ""}`);
        setAirdropModal(null);
        setAirdropTxId("");
      } else {
        toast.error(res.error || "Failed to confirm airdrop");
      }
    } catch (err: any) {
      toast.error(sanitizeErrorMessage(err?.message));
    } finally {
      setConfirmingAirdrop(false);
    }
  }, [wallet, sessionToken, airdropTxId]);

  const downloadExport = useCallback(async (battleId: string, format: "csv" | "json") => {
    try {
      const { url, headers } = api.admin.exportSnapshot(battleId, format, wallet, sessionToken);
      const res = await fetch(url, { headers });
      if (!res.ok) {
        toast.error(`Export failed: HTTP ${res.status}`);
        return;
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `botb-airdrop-${battleId}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      toast.success(`${format.toUpperCase()} downloaded!`);
    } catch (err: any) {
      toast.error(sanitizeErrorMessage(err?.message));
    }
  }, [wallet, sessionToken]);

  const clearBattle = useCallback(async (battleId: string) => {
    setClearing(true);
    try {
      const res = await api.admin.clearCancelledBattle(battleId, wallet, sessionToken);
      if (res.success && res.data) {
        setBattles((prev) => prev.filter((b) => b.id !== battleId));
        setExpandedId(null);
        toast.success(`Battle "${res.data.title}" permanently cleared. ${res.data.votesRemoved} vote(s) removed.`);
        setClearModal(null);
      } else {
        toast.error(res.error || "Failed to clear battle");
      }
    } catch (err: any) {
      toast.error(sanitizeErrorMessage(err?.message));
    } finally {
      setClearing(false);
    }
  }, [wallet, sessionToken]);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="w-6 h-6 text-[#D4A843] animate-spin mx-auto mb-2" />
        <p className="text-[#8494A7] text-sm">Loading battles...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-[#E8ECF0] font-bold" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.8rem" }}>
            BATTLE MANAGEMENT
          </h3>
          <p className="text-[#8494A7] text-xs">
            {battles.length} battles · {battles.filter((b) => b.status === "voting_open").length} live
          </p>
        </div>
        <button onClick={load} className="px-3 py-1.5 rounded-lg bg-[#4274B9]/10 border border-[#4274B9]/20 text-[#6AA3E0] text-[0.55rem] hover:bg-[#4274B9]/20 transition-all" style={{ fontFamily: "Orbitron, sans-serif" }}>
          REFRESH
        </button>
      </div>

      {/* Status Filter Pills */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {["all", ...STATUS_ORDER].map((s) => {
          const meta = STATUS_META[s];
          const count = s === "all" ? battles.length : battles.filter((b) => b.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-2 py-1 rounded text-[0.5rem] border transition-all ${
                filterStatus === s
                  ? "bg-[#4274B9]/15 border-[#4274B9]/40 text-[#E8ECF0]"
                  : "border-[#4274B9]/10 text-[#8494A7] hover:text-[#E8ECF0] hover:border-[#4274B9]/20"
              }`}
              style={{ fontFamily: "Orbitron, sans-serif" }}
            >
              {s === "all" ? "ALL" : meta?.label || s.toUpperCase()} ({count})
            </button>
          );
        })}
      </div>

      {/* Empty */}
      {filtered.length === 0 && (
        <div className="text-center py-8 bg-[#0B1120] rounded-xl border border-[#4274B9]/10">
          <Swords className="w-8 h-8 text-[#4274B9]/20 mx-auto mb-2" />
          <p className="text-[#8494A7] text-sm">
            {filterStatus === "all" ? "No battles yet. Create bracket events first." : `No ${filterStatus.replace("_", " ")} battles.`}
          </p>
        </div>
      )}

      {/* Battle Cards */}
      <div className="space-y-2">
        {filtered.map((battle) => {
          const ath1 = athleteMap.get(battle.athlete1Id) || null;
          const ath2 = athleteMap.get(battle.athlete2Id) || null;
          const event = eventMap.get(battle.eventId);
          const isExpanded = expandedId === battle.id;
          const meta = STATUS_META[battle.status] || STATUS_META.draft;
          const totalVotes = battle.votes1Count + battle.votes2Count;
          const totalWeighted = battle.votes1Weighted + battle.votes2Weighted;
          const pct1 = totalWeighted > 0
            ? Math.round((battle.votes1Weighted / totalWeighted) * 100)
            : totalVotes > 0
            ? Math.round((battle.votes1Count / totalVotes) * 100)
            : 50;
          const pct2 = 100 - pct1;

          return (
            <div
              key={battle.id}
              className="rounded-xl bg-[#0B1120] border border-[#4274B9]/10 overflow-hidden hover:border-[#4274B9]/20 transition-all"
            >
              {/* Summary Row */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : battle.id)}
                className="w-full flex items-center gap-2 p-3 text-left hover:bg-[#4274B9]/5 transition-all"
              >
                <ChevronRight className={`w-3.5 h-3.5 text-[#8494A7] transition-transform shrink-0 ${isExpanded ? "rotate-90" : ""}`} />

                {/* Athletes mini */}
                <div className="flex items-center gap-1 shrink-0">
                  <MiniAvatar athlete={ath1} />
                  <span className="text-[#8494A7] text-[0.5rem]" style={{ fontFamily: "Orbitron, sans-serif" }}>VS</span>
                  <MiniAvatar athlete={ath2} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[#E8ECF0] text-xs font-semibold truncate">{battle.title || "Untitled Battle"}</p>
                  <p className="text-[#8494A7] text-[0.5rem] truncate">
                    {event?.name || battle.eventId || "No event"} · {battle.round || "—"}
                  </p>
                </div>

                {/* Vote tally mini */}
                {totalVotes > 0 && (
                  <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                    <BarChart3 className="w-3 h-3 text-[#8494A7]" />
                    <span className="text-[#8494A7] text-[0.5rem]">{totalVotes} votes</span>
                  </div>
                )}

                {statusBadge(battle.status)}
              </button>

              {/* Expanded Detail */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 space-y-3 border-t border-[#4274B9]/10 pt-3">
                      {/* Athlete matchup with vote bars */}
                      <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-center">
                        {/* Athlete 1 */}
                        <AthletePanel athlete={ath1} votes={battle.votes1Count} weighted={battle.votes1Weighted} pct={pct1} side="left" />

                        <div className="text-center">
                          <div className="w-9 h-9 rounded-full bg-[#4274B9]/10 flex items-center justify-center border border-[#4274B9]/20 mx-auto">
                            <span className="text-[#4274B9] text-[0.55rem]" style={{ fontFamily: "Orbitron, sans-serif" }}>VS</span>
                          </div>
                          <p className="text-[#8494A7] text-[0.45rem] mt-1">Pool</p>
                          <p className="text-[#D4A843] text-[0.55rem]" style={{ fontFamily: "Orbitron, sans-serif" }}>
                            {battle.totalPool > 0 ? `${battle.totalPool.toLocaleString()}` : "—"}
                          </p>
                        </div>

                        {/* Athlete 2 */}
                        <AthletePanel athlete={ath2} votes={battle.votes2Count} weighted={battle.votes2Weighted} pct={pct2} side="right" />
                      </div>

                      {/* Combined vote bar */}
                      {totalVotes > 0 && (
                        <div>
                          <div className="flex justify-between text-[0.5rem] text-[#8494A7] mb-1">
                            <span>{pct1}% ({battle.votes1Count} votes)</span>
                            <span>({battle.votes2Count} votes) {pct2}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-[#162033] overflow-hidden flex">
                            <div className="h-full rounded-l-full bg-gradient-to-r from-[#4274B9] to-[#4274B9]/60" style={{ width: `${pct1}%` }} />
                            <div className="h-full rounded-r-full bg-gradient-to-l from-[#6AA3E0] to-[#6AA3E0]/60" style={{ width: `${pct2}%` }} />
                          </div>
                        </div>
                      )}

                      {/* Voting Schedule */}
                      <VotingScheduleEditor
                        battle={battle}
                        wallet={wallet}
                        sessionToken={sessionToken}
                        onUpdate={(updated) => setBattles((prev) => prev.map((b) => b.id === updated.id ? updated : b))}
                      />

                      {/* Winner badge if declared */}
                      {battle.winnerId && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-[#10b981]/10 border border-[#10b981]/20">
                          <Trophy className="w-4 h-4 text-[#10b981]" />
                          <span className="text-[#10b981] text-xs font-semibold">
                            Winner: {athleteMap.get(battle.winnerId)?.name || battle.winnerId}
                          </span>
                          <button
                            onClick={() => viewSnapshot(battle.id)}
                            className="ml-auto text-[0.5rem] text-[#6AA3E0] hover:text-[#E8ECF0] flex items-center gap-1"
                            style={{ fontFamily: "Orbitron, sans-serif" }}
                          >
                            <Eye className="w-3 h-3" /> VIEW SNAPSHOT
                          </button>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex flex-wrap gap-2 pt-1">
                        {/* Next status button (except winner_declared → uses airdrop flow) */}
                        {meta.nextStatus && battle.status !== "winner_declared" && (
                          <button
                            onClick={() => advanceStatus(battle.id, meta.nextStatus!)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.55rem] bg-[#D4A843]/10 border border-[#D4A843]/30 text-[#D4A843] hover:bg-[#D4A843]/20 transition-all"
                            style={{ fontFamily: "Orbitron, sans-serif" }}
                          >
                            <ArrowRight className="w-3 h-3" />
                            {meta.nextLabel}
                          </button>
                        )}

                        {/* Airdrop flow (winner_declared → rewards_distributed) */}
                        {battle.status === "winner_declared" && (
                          <>
                            <button
                              onClick={() => viewSnapshot(battle.id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.55rem] bg-[#6AA3E0]/10 border border-[#6AA3E0]/30 text-[#6AA3E0] hover:bg-[#6AA3E0]/20 transition-all"
                              style={{ fontFamily: "Orbitron, sans-serif" }}
                            >
                              <FileDown className="w-3 h-3" /> SNAPSHOT
                            </button>
                            <button
                              onClick={() => downloadExport(battle.id, "csv")}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.55rem] bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981] hover:bg-[#10b981]/20 transition-all"
                              style={{ fontFamily: "Orbitron, sans-serif" }}
                            >
                              <FileDown className="w-3 h-3" /> CSV
                            </button>
                            <button
                              onClick={() => downloadExport(battle.id, "json")}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.55rem] bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981] hover:bg-[#10b981]/20 transition-all"
                              style={{ fontFamily: "Orbitron, sans-serif" }}
                            >
                              <FileDown className="w-3 h-3" /> JSON
                            </button>
                            <button
                              onClick={() => setAirdropModal({ battleId: battle.id })}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.55rem] bg-[#D4A843]/10 border border-[#D4A843]/30 text-[#D4A843] hover:bg-[#D4A843]/20 transition-all"
                              style={{ fontFamily: "Orbitron, sans-serif" }}
                            >
                              <Award className="w-3 h-3" /> CONFIRM AIRDROP
                            </button>
                          </>
                        )}

                        {/* Declare winner (only when voting_closed) */}
                        {battle.status === "voting_closed" && !battle.winnerId && (
                          <button
                            onClick={() => setWinnerModal({ battleId: battle.id, ath1, ath2 })}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.55rem] bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981] hover:bg-[#10b981]/20 transition-all"
                            style={{ fontFamily: "Orbitron, sans-serif" }}
                          >
                            <Trophy className="w-3 h-3" />
                            DECLARE WINNER
                          </button>
                        )}

                        {/* Cancel (always available unless already terminal) */}
                        {!["rewards_distributed", "cancelled"].includes(battle.status) && (
                          <button
                            onClick={() => {
                              if (confirm("Cancel this battle? This cannot be undone.")) {
                                advanceStatus(battle.id, "cancelled");
                              }
                            }}
                            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[0.5rem] text-[#8494A7] hover:text-red-400 hover:bg-red-500/10 transition-all"
                            style={{ fontFamily: "Orbitron, sans-serif" }}
                          >
                            <Ban className="w-3 h-3" /> CANCEL
                          </button>
                        )}

                        {/* Clear from site (only for cancelled battles) */}
                        {battle.status === "cancelled" && (
                          <button
                            onClick={() => setClearModal({
                              battleId: battle.id,
                              title: battle.title || "Untitled Battle",
                              votes: battle.votes1Count + battle.votes2Count,
                            })}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[0.55rem] bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all"
                            style={{ fontFamily: "Orbitron, sans-serif" }}
                          >
                            <Trash2 className="w-3 h-3" /> CLEAR FROM SITE
                          </button>
                        )}
                      </div>

                      {/* Metadata */}
                      <div className="flex flex-wrap gap-3 text-[0.45rem] text-[#8494A7] pt-1 border-t border-[#4274B9]/5">
                        <span>ID: {battle.id}</span>
                        <span>Bracket Pos: {battle.bracketPosition || "—"}</span>
                        <span>Location: {battle.location || "—"}</span>
                        <span>Updated: {battle.updatedAt ? new Date(battle.updatedAt).toLocaleString() : "—"}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Winner Declaration Modal */}
      <AnimatePresence>
        {winnerModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => !declaringWinner && setWinnerModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-[#0B1120] border border-[#D4A843]/30 rounded-2xl overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-[#D4A843]/10 bg-[#D4A843]/5">
                <h3 className="text-[#D4A843] font-bold flex items-center gap-2" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.75rem" }}>
                  <Trophy className="w-4 h-4" /> DECLARE WINNER
                </h3>
                <p className="text-[#8494A7] text-[0.6rem] mt-1">This will update W/L records and generate a reward snapshot.</p>
              </div>

              <div className="p-5 space-y-3">
                <p className="text-[#E8ECF0] text-xs mb-3 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#f59e0b]" />
                  This action cannot be undone. Choose carefully.
                </p>

                {/* Athlete 1 */}
                <WinnerOption
                  athlete={winnerModal.ath1}
                  label="Athlete 1"
                  loading={declaringWinner}
                  onSelect={() => winnerModal.ath1 && declareWinner(winnerModal.battleId, winnerModal.ath1.id)}
                />

                <div className="text-center text-[#8494A7] text-[0.5rem]" style={{ fontFamily: "Orbitron, sans-serif" }}>— OR —</div>

                {/* Athlete 2 */}
                <WinnerOption
                  athlete={winnerModal.ath2}
                  label="Athlete 2"
                  loading={declaringWinner}
                  onSelect={() => winnerModal.ath2 && declareWinner(winnerModal.battleId, winnerModal.ath2.id)}
                />

                <button
                  onClick={() => setWinnerModal(null)}
                  disabled={declaringWinner}
                  className="w-full text-xs text-[#8494A7] hover:text-[#E8ECF0] mt-2 py-2 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Snapshot Preview Modal */}
      <AnimatePresence>
        {snapshotPreview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setSnapshotPreview(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-[#0B1120] border border-[#10b981]/30 rounded-2xl overflow-hidden max-h-[80vh] flex flex-col"
            >
              <div className="px-5 py-4 border-b border-[#10b981]/10 bg-[#10b981]/5 shrink-0">
                <h3 className="text-[#10b981] font-bold flex items-center gap-2" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.75rem" }}>
                  <FileDown className="w-4 h-4" /> REWARD SNAPSHOT
                </h3>
                <p className="text-[#8494A7] text-[0.6rem] mt-1">
                  Winner: {snapshotPreview.snapshot.winnerName} · Pool: {snapshotPreview.snapshot.totalPool?.toLocaleString() || 0} BOTB
                </p>
              </div>
              <div className="p-5 overflow-y-auto flex-1">
                {snapshotPreview.snapshot.recipients.length === 0 ? (
                  <p className="text-[#8494A7] text-sm text-center py-4">No votes were cast — no rewards to distribute.</p>
                ) : (
                  <div className="space-y-1">
                    <div className="grid grid-cols-[1fr_auto_auto] gap-2 text-[0.5rem] text-[#8494A7] pb-1 border-b border-[#4274B9]/10" style={{ fontFamily: "Orbitron, sans-serif" }}>
                      <span>WALLET</span>
                      <span>SHARE</span>
                      <span>REWARD</span>
                    </div>
                    {snapshotPreview.snapshot.recipients.map((r: any, i: number) => (
                      <div key={i} className="grid grid-cols-[1fr_auto_auto] gap-2 text-[0.55rem] py-1 border-b border-[#4274B9]/5">
                        <span className="text-[#E8ECF0] truncate font-mono">{r.wallet}</span>
                        <span className="text-[#8494A7]">{r.sharePercent.toFixed(1)}%</span>
                        <span className="text-[#D4A843]" style={{ fontFamily: "Orbitron, sans-serif" }}>{r.rewardAmount.toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="text-[0.45rem] text-[#8494A7] mt-3 pt-2 border-t border-[#4274B9]/10">
                  Generated: {snapshotPreview.snapshot.generatedAt ? new Date(snapshotPreview.snapshot.generatedAt).toLocaleString() : "—"}
                </div>
              </div>
              <div className="px-5 py-3 border-t border-[#4274B9]/10 shrink-0 space-y-2">
                {snapshotPreview.snapshot.recipients.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => downloadExport(snapshotPreview.battleId, "csv")}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[0.55rem] bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981] hover:bg-[#10b981]/20 transition-all"
                      style={{ fontFamily: "Orbitron, sans-serif" }}
                    >
                      <FileDown className="w-3 h-3" /> EXPORT CSV
                    </button>
                    <button
                      onClick={() => downloadExport(snapshotPreview.battleId, "json")}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[0.55rem] bg-[#6AA3E0]/10 border border-[#6AA3E0]/30 text-[#6AA3E0] hover:bg-[#6AA3E0]/20 transition-all"
                      style={{ fontFamily: "Orbitron, sans-serif" }}
                    >
                      <FileDown className="w-3 h-3" /> EXPORT JSON
                    </button>
                  </div>
                )}
                {snapshotPreview.snapshot.exportedAt && (
                  <p className="text-[0.45rem] text-[#8494A7] text-center">
                    Previously exported: {new Date(snapshotPreview.snapshot.exportedAt).toLocaleString()}
                  </p>
                )}
                {snapshotPreview.snapshot.airdropTxId && (
                  <p className="text-[0.45rem] text-[#10b981] text-center">
                    Airdrop TX: {snapshotPreview.snapshot.airdropTxId}
                  </p>
                )}
                <button
                  onClick={() => setSnapshotPreview(null)}
                  className="w-full text-xs text-[#8494A7] hover:text-[#E8ECF0] py-1.5 transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Airdrop Confirmation Modal */}
      <AnimatePresence>
        {airdropModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => !confirmingAirdrop && setAirdropModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-[#0B1120] border border-[#10b981]/30 rounded-2xl overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-[#10b981]/10 bg-[#10b981]/5">
                <h3 className="text-[#10b981] font-bold flex items-center gap-2" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.75rem" }}>
                  <Award className="w-4 h-4" /> CONFIRM AIRDROP
                </h3>
                <p className="text-[#8494A7] text-[0.6rem] mt-1">This will distribute rewards to the snapshot recipients.</p>
              </div>

              <div className="p-5 space-y-4">
                <p className="text-[#E8ECF0] text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#f59e0b] shrink-0" />
                  Mark this battle as rewards distributed. This transitions the battle to its final state.
                </p>

                <div className="space-y-3">
                  <p className="text-[#8494A7] text-[0.6rem]">
                    1. Download the snapshot via CSV or JSON export<br />
                    2. Run the airdrop script with your Hedera account<br />
                    3. Paste the Hedera transaction ID below (optional)
                  </p>

                  <div>
                    <label className="text-[#8494A7] text-[0.5rem] block mb-1">Airdrop Transaction ID (optional)</label>
                    <input
                      type="text"
                      value={airdropTxId}
                      onChange={(e) => setAirdropTxId(e.target.value)}
                      placeholder="0.0.xxxxx@1234567890.123456789"
                      className="w-full bg-[#162033] border border-[#4274B9]/20 rounded-lg px-3 py-2 text-[#E8ECF0] text-xs outline-none focus:border-[#10b981]/50 font-mono placeholder:text-[#8494A7]/40"
                    />
                  </div>
                </div>

                <button
                  onClick={() => confirmAirdrop(airdropModal.battleId)}
                  disabled={confirmingAirdrop}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#10b981]/10 border border-[#10b981]/30 text-[#10b981] hover:bg-[#10b981]/20 transition-all disabled:opacity-50"
                  style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}
                >
                  {confirmingAirdrop ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Award className="w-4 h-4" />
                  )}
                  CONFIRM REWARDS DISTRIBUTED
                </button>

                <button
                  onClick={() => { setAirdropModal(null); setAirdropTxId(""); }}
                  disabled={confirmingAirdrop}
                  className="w-full text-xs text-[#8494A7] hover:text-[#E8ECF0] py-1.5 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clear Battle Modal */}
      <AnimatePresence>
        {clearModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => !clearing && setClearModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-[#0B1120] border border-red-500/30 rounded-2xl overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-red-500/10 bg-red-500/5">
                <h3 className="text-red-400 font-bold flex items-center gap-2" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.75rem" }}>
                  <Trash2 className="w-4 h-4" /> CLEAR CANCELLED BATTLE
                </h3>
                <p className="text-[#8494A7] text-[0.6rem] mt-1">Permanently remove this battle and all associated data from the site.</p>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/5 border border-red-500/15">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-red-300/90 leading-relaxed">
                    <p className="font-bold mb-1">This action is permanent and cannot be undone.</p>
                    <p className="text-[#8494A7]">
                      The battle record, all voter records{clearModal.votes > 0 ? ` (${clearModal.votes} vote${clearModal.votes !== 1 ? "s" : ""})` : ""}, nonce entries, and any associated snapshots will be permanently deleted from the database.
                    </p>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#162033] border border-[#4274B9]/10">
                  <p className="text-[#8494A7] text-[0.55rem] mb-1">Battle to clear:</p>
                  <p className="text-[#E8ECF0] text-sm font-semibold">{clearModal.title}</p>
                  <div className="flex items-center gap-3 mt-1 text-[0.5rem] text-[#8494A7]">
                    <span>ID: {clearModal.battleId}</span>
                    <span>Votes: {clearModal.votes}</span>
                    <span className="text-red-400">Status: CANCELLED</span>
                  </div>
                </div>

                <button
                  onClick={() => clearBattle(clearModal.battleId)}
                  disabled={clearing}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50"
                  style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}
                >
                  {clearing ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  PERMANENTLY CLEAR FROM SITE
                </button>

                <button
                  onClick={() => setClearModal(null)}
                  disabled={clearing}
                  className="w-full text-xs text-[#8494A7] hover:text-[#E8ECF0] py-1.5 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MiniAvatar({ athlete }: { athlete: Athlete | null }) {
  const color = athlete?.nftCardBorderColor || "#4274B9";
  const hasPfp = athlete?.pfpUrl && athlete.pfpUrl !== "placeholder";
  return (
    <div
      className="w-6 h-6 rounded-full overflow-hidden border bg-[#162033] flex items-center justify-center shrink-0"
      style={{ borderColor: `${color}40` }}
    >
      {hasPfp ? (
        <ImageWithFallback src={athlete!.pfpUrl} alt={athlete!.name} className="w-full h-full object-cover" />
      ) : (
        <User className="w-2.5 h-2.5" style={{ color: `${color}60` }} />
      )}
    </div>
  );
}

function AthletePanel({
  athlete,
  votes,
  weighted,
  pct,
  side,
}: {
  athlete: Athlete | null;
  votes: number;
  weighted: number;
  pct: number;
  side: "left" | "right";
}) {
  const color = athlete?.nftCardBorderColor || "#4274B9";
  const hasPfp = athlete?.pfpUrl && athlete.pfpUrl !== "placeholder";
  const align = side === "right" ? "text-right" : "text-left";

  return (
    <div className={align}>
      <div className={`flex items-center gap-2 mb-1.5 ${side === "right" ? "flex-row-reverse" : ""}`}>
        <div
          className="w-8 h-8 rounded-full overflow-hidden border bg-[#162033] flex items-center justify-center shrink-0"
          style={{ borderColor: `${color}40` }}
        >
          {hasPfp ? (
            <ImageWithFallback src={athlete!.pfpUrl} alt={athlete!.name} className="w-full h-full object-cover" />
          ) : (
            <User className="w-3 h-3" style={{ color: `${color}60` }} />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-[#E8ECF0] text-[0.6rem] font-semibold truncate">{athlete?.name || "TBD"}</p>
          <p className="text-[#8494A7] text-[0.45rem]">{athlete?.country || ""}</p>
        </div>
      </div>
      <div className="text-[0.5rem] text-[#8494A7]">
        <span style={{ color }}>{votes}</span> votes · <span style={{ color }}>{weighted.toLocaleString()}</span> weighted
      </div>
    </div>
  );
}

function WinnerOption({
  athlete,
  label,
  loading,
  onSelect,
}: {
  athlete: Athlete | null;
  label: string;
  loading: boolean;
  onSelect: () => void;
}) {
  const color = athlete?.nftCardBorderColor || "#4274B9";
  const hasPfp = athlete?.pfpUrl && athlete.pfpUrl !== "placeholder";

  return (
    <button
      onClick={onSelect}
      disabled={loading || !athlete}
      className="w-full flex items-center gap-3 p-3 rounded-xl border border-[#4274B9]/15 bg-[#162033] hover:border-[#10b981]/40 hover:bg-[#10b981]/5 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left"
    >
      <div
        className="w-10 h-10 rounded-full overflow-hidden border bg-[#0B1120] flex items-center justify-center shrink-0"
        style={{ borderColor: `${color}40` }}
      >
        {hasPfp ? (
          <ImageWithFallback src={athlete!.pfpUrl} alt={athlete!.name} className="w-full h-full object-cover" />
        ) : (
          <User className="w-4 h-4" style={{ color: `${color}60` }} />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[#E8ECF0] text-sm font-semibold truncate">{athlete?.name || "Unknown"}</p>
        <p className="text-[#8494A7] text-[0.6rem]">{label} · {athlete?.country || "—"}</p>
      </div>
      {loading ? (
        <Loader2 className="w-4 h-4 text-[#D4A843] animate-spin shrink-0" />
      ) : (
        <Trophy className="w-4 h-4 text-[#10b981]/40 group-hover:text-[#10b981] shrink-0" />
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Voting Schedule Editor (inline)
// ---------------------------------------------------------------------------

function VotingScheduleEditor({
  battle,
  wallet,
  sessionToken,
  onUpdate,
}: {
  battle: Battle;
  wallet: string;
  sessionToken: string;
  onUpdate: (battle: Battle) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [opens, setOpens] = useState(battle.votingOpensAt?.slice(0, 16) || "");
  const [closes, setCloses] = useState(battle.votingClosesAt?.slice(0, 16) || "");
  const [pool, setPool] = useState(battle.totalPool || 0);
  const [saving, setSaving] = useState(false);

  const canEdit = ["draft", "upcoming"].includes(battle.status);

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.admin.updateBattle(battle.id, {
        votingOpensAt: opens ? new Date(opens).toISOString() : "",
        votingClosesAt: closes ? new Date(closes).toISOString() : "",
        totalPool: pool,
      }, wallet, sessionToken);
      if (res.success && res.data) {
        onUpdate(res.data);
        toast.success("Voting schedule updated");
        setEditing(false);
      } else {
        toast.error(res.error || "Failed to update");
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (iso: string) => {
    if (!iso) return "Not set";
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  };

  return (
    <div className="p-2 rounded-lg bg-[#080D17] border border-[#4274B9]/10">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[#6AA3E0] text-[0.55rem] font-bold flex items-center gap-1" style={{ fontFamily: "Orbitron, sans-serif" }}>
          <CalendarClock className="w-3 h-3" /> VOTING SCHEDULE
        </span>
        {canEdit && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="text-[0.5rem] text-[#D4A843] hover:text-[#E5B94E] transition-all"
            style={{ fontFamily: "Orbitron, sans-serif" }}
          >
            EDIT
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[#8494A7] text-[0.5rem] block mb-0.5">Opens</label>
              <input
                type="datetime-local"
                value={opens}
                onChange={(e) => setOpens(e.target.value)}
                className="w-full bg-[#162033] border border-[#4274B9]/20 rounded px-2 py-1 text-[#E8ECF0] text-[0.6rem] outline-none focus:border-[#D4A843]/50"
              />
            </div>
            <div>
              <label className="text-[#8494A7] text-[0.5rem] block mb-0.5">Closes</label>
              <input
                type="datetime-local"
                value={closes}
                onChange={(e) => setCloses(e.target.value)}
                className="w-full bg-[#162033] border border-[#4274B9]/20 rounded px-2 py-1 text-[#E8ECF0] text-[0.6rem] outline-none focus:border-[#D4A843]/50"
              />
            </div>
          </div>
          <div>
            <label className="text-[#8494A7] text-[0.5rem] block mb-0.5">Prize Pool (BOTB)</label>
            <input
              type="number"
              value={pool || ""}
              onChange={(e) => setPool(Number(e.target.value) || 0)}
              className="w-full bg-[#162033] border border-[#4274B9]/20 rounded px-2 py-1 text-[#E8ECF0] text-[0.6rem] outline-none focus:border-[#D4A843]/50"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={save}
              disabled={saving}
              className="flex items-center gap-1 px-2 py-1 rounded text-[0.5rem] bg-[#D4A843]/10 border border-[#D4A843]/30 text-[#D4A843] hover:bg-[#D4A843]/20 disabled:opacity-50 transition-all"
              style={{ fontFamily: "Orbitron, sans-serif" }}
            >
              {saving ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <CheckCircle className="w-2.5 h-2.5" />}
              SAVE
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-2 py-1 rounded text-[0.5rem] text-[#8494A7] hover:text-[#E8ECF0] transition-all"
              style={{ fontFamily: "Orbitron, sans-serif" }}
            >
              CANCEL
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 text-[0.5rem]">
          <div>
            <span className="text-[#8494A7]">Opens:</span>
            <p className="text-[#E8ECF0]">{formatDate(battle.votingOpensAt)}</p>
          </div>
          <div>
            <span className="text-[#8494A7]">Closes:</span>
            <p className="text-[#E8ECF0]">{formatDate(battle.votingClosesAt)}</p>
          </div>
          <div>
            <span className="text-[#8494A7]">Pool:</span>
            <p className="text-[#D4A843]" style={{ fontFamily: "Orbitron, sans-serif" }}>
              {battle.totalPool > 0 ? `${battle.totalPool.toLocaleString()} BOTB` : "—"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}