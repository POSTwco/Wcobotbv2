/**
 * BOTB Leaderboard — Live Dynamic Rankings
 * ==========================================
 * Four tabs:
 *   1. Athletes — Composite rankings from wins, admin-set skill ratings, fan votes
 *   2. Top Voters — Aggregated from real vote history, Hedera-verified
 *   3. Oracle — Oracle voters' performance and streaks
 *   4. My Stats — Connected wallet's personal performance (Hedera-active)
 *
 * All data sourced from production KV store via dedicated leaderboard endpoints.
 * Rankings update dynamically after each battle/vote.
 * Calls tab ranks correct calls, equal weight, after a card closes.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Trophy, Medal, Target, Crown, Flame,
  User, Zap,
  RefreshCw, ChevronDown,
} from "lucide-react";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import botbShield from "figma:asset/2d6e7a2459a1a0d372fe2cf8a444eed0da642b5f.png";
import { api } from "../lib/api";
import { ErrorCard } from "../components/error-boundary";
import { BOTBSpinner, SkeletonLeaderboardRow } from "../components/botb-spinner";
import { getCountryFlag } from "../lib/country-flags";
import { InlineFlag } from "../components/country-flag";
import { formatPower } from "../lib/format";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = "athletes" | "calls";

interface RankedAthlete {
  id: string;
  rank: number;
  name: string;
  country: string;
  pfpUrl: string;
  wins: number;
  losses: number;
  winRate: number;
  streak: number;
  totalPowerRating: number;
  totalVotes: number;
  tournamentWins?: number;
  tournamentLosses?: number;
  compositeScore: number;
  status: string;
  cardBorderColor?: string;
  specialMove: string;
  skills: Record<string, number>;
}

interface RankedVoter {
  wallet: string;
  battleVotes: number;
  correctPicks: number;
  decidedBattles: number;
  accuracy: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function truncateWallet(wallet: string): string {
  if (!wallet || wallet.length < 10) return wallet;
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

// Skill bar colors
const SKILL_COLORS: Record<string, string> = {
  energy: "#f59e0b",
  performance: "#8B5CF6",
  static: "#22C55E",
  aggression: "#EF4444",
  dynamic: "#6AA3E0",
};

// Official WCO category labels (KV keys retained for backward compat)
const SKILL_LABELS: Record<string, string> = {
  energy: "Pwr Dyn",
  performance: "Flow",
  static: "Statics",
  aggression: "Off/Def",
  dynamic: "Dynamics",
};

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function LeaderboardPage() {
  const [tab, setTab] = useState<Tab>("athletes");
  const [athletes, setAthletes] = useState<RankedAthlete[]>([]);
  const [voters, setVoters] = useState<RankedVoter[]>([]);
  const [loadingAthletes, setLoadingAthletes] = useState(true);
  const [loadingVoters, setLoadingVoters] = useState(false);
  const [athleteError, setAthleteError] = useState<string | null>(null);
  const [voterError, setVoterError] = useState<string | null>(null);
  const [expandedAthlete, setExpandedAthlete] = useState<string | null>(null);

  // Load athlete leaderboard
  const loadAthletes = useCallback(async () => {
    setLoadingAthletes(true);
    setAthleteError(null);
    try {
      const res = await api.getAthleteLeaderboard();
      if (res.success && res.data) {
        setAthletes(res.data);
      } else {
        setAthleteError(res.error || "Failed to load athlete rankings.");
      }
    } catch (err: any) {
      console.error("[Leaderboard] Failed to load athlete rankings:", err);
      setAthleteError("Unable to load rankings. Please try again.");
    } finally {
      setLoadingAthletes(false);
    }
  }, []);

  // Load voter leaderboard
  const loadVoters = useCallback(async () => {
    setLoadingVoters(true);
    setVoterError(null);
    try {
      const res = await api.getVoterLeaderboard();
      if (res.success && res.data) {
        setVoters(res.data);
      } else {
        setVoterError(res.error || "Failed to load voter rankings.");
      }
    } catch (err: any) {
      console.error("[Leaderboard] Failed to load voter rankings:", err);
      setVoterError("Unable to load voter data. Please try again.");
    } finally {
      setLoadingVoters(false);
    }
  }, []);

  useEffect(() => { loadAthletes(); }, [loadAthletes]);
  useEffect(() => { if (tab === "calls") loadVoters(); }, [tab, loadVoters]);

  return (
    <div className="min-h-screen py-6 sm:py-8 overflow-x-hidden">
      <div className="max-w-5xl mx-auto px-3 sm:px-6 lg:px-8 min-w-0">
        {/* Header */}
        <div className="mb-6 sm:mb-10">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <img src={botbShield} alt="BOTB" className="h-7 sm:h-8 w-auto" />
                <h1 className="text-2xl sm:text-3xl" style={{ fontFamily: "Orbitron, sans-serif" }}>
                  <span className="bg-gradient-to-r from-[#f59e0b] to-[#4274B9] bg-clip-text text-transparent">LEADERBOARD</span>
                </h1>
              </div>
              <p className="text-[#8494A7]">Athletes by results. Correct calls, equal weight, after a card closes.</p>
            </div>

            {/* Refresh button */}
            <button
              onClick={() => { loadAthletes(); if (tab !== "athletes") loadVoters(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#162033] border border-[#4274B9]/20 text-[#6AA3E0] text-xs hover:bg-[#4274B9]/10 transition-all"
              style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.6rem" }}
            >
              <RefreshCw className="w-3 h-3" /> REFRESH
            </button>
          </div>

          {/* Summary stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mt-4">
            <div className="bg-[#111827] border border-[#f59e0b]/10 rounded-xl p-2.5 sm:p-3 text-center">
              <p className="text-lg text-[#f59e0b]" style={{ fontFamily: "Orbitron, sans-serif" }}>{athletes.length}</p>
              <p className="text-[0.6rem] text-[#8494A7]">Ranked Athletes</p>
            </div>
            <div className="bg-[#111827] border border-[#4274B9]/10 rounded-xl p-2.5 sm:p-3 text-center">
              <p className="text-lg text-[#4274B9]" style={{ fontFamily: "Orbitron, sans-serif" }}>{voters.length}</p>
              <p className="text-[0.6rem] text-[#8494A7]">Active Voters</p>
            </div>
            <div className="bg-[#111827] border border-[#10b981]/10 rounded-xl p-2.5 sm:p-3 text-center">
              <p className="text-lg text-[#10b981]" style={{ fontFamily: "Orbitron, sans-serif" }}>
                {voters.reduce((s, v) => s + v.battleVotes, 0)}
              </p>
              <p className="text-[0.6rem] text-[#8494A7]">Total Votes Cast</p>
            </div>
            <div className="bg-[#111827] border border-[#D4A843]/10 rounded-xl p-2.5 sm:p-3 text-center">
              <p className="text-lg text-[#D4A843]" style={{ fontFamily: "Orbitron, sans-serif" }}>
                {voters.reduce((s, v) => s + v.correctPicks, 0)}
              </p>
              <p className="text-[0.6rem] text-[#8494A7]">Correct Calls</p>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 mb-6 sm:mb-8 overflow-x-auto">
          {([
            { id: "athletes" as Tab, icon: <Medal className="w-4 h-4" />, label: "ATHLETES" },
            { id: "calls" as Tab, icon: <Target className="w-4 h-4" />, label: "CALLS" },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 sm:px-5 py-2.5 rounded-lg text-sm transition-all whitespace-nowrap ${
                tab === t.id
                  ? t.id === "athletes"
                    ? "bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30"
                    : "bg-[#4274B9]/10 text-[#4274B9] border border-[#4274B9]/30"
                  : "text-[#8494A7] border border-transparent hover:text-[#E8ECF0] hover:bg-white/5"
              }`}
              style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.75rem" }}
            >
              <span className="flex items-center gap-2">{t.icon} {t.label}</span>
            </button>
          ))}
        </div>

        {/* ================================================================ */}
        {/* ATHLETES TAB */}
        {/* ================================================================ */}
        {tab === "athletes" && (
          loadingAthletes ? (
            <BOTBSpinner
              messages={[
                "Computing rankings...",
                "Aggregating scores...",
                "Sorting leaderboard...",
                "Crunching stats...",
              ]}
            >
              <div className="w-full space-y-3">
                {[0, 1, 2, 3, 4].map((i) => (
                  <SkeletonLeaderboardRow key={i} delay={i * 0.1} />
                ))}
              </div>
            </BOTBSpinner>
          ) : athleteError ? (
            <div className="py-8">
              <ErrorCard title="Rankings Unavailable" message={athleteError} onRetry={loadAthletes} />
            </div>
          ) : athletes.length === 0 ? (
            <div className="text-center py-16 bg-[#111827] rounded-2xl border border-[#4274B9]/10">
              <User className="w-10 h-10 text-[#f59e0b]/20 mx-auto mb-3" />
              <p className="text-[#8494A7] text-sm">No athletes registered yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {athletes.map((athlete, i) => {
                const borderColor = "#4274B9";
                const hasPfp = athlete.pfpUrl && athlete.pfpUrl !== "placeholder";
                const isExpanded = expandedAthlete === athlete.id;

                return (
                  <motion.div
                    key={athlete.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setExpandedAthlete(isExpanded ? null : athlete.id)}
                    className={`bg-[#111827] border rounded-xl overflow-hidden transition-all cursor-pointer hover:border-[#4274B9]/30 ${
                      i < 3 ? "border-[#f59e0b]/20" : "border-[#4274B9]/10"
                    }`}
                  >
                    <div className="p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
                      {/* Rank */}
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0" style={{
                        background: i === 0 ? "#f59e0b20" : i === 1 ? "#C0C0C020" : i === 2 ? "#CD7F3220" : "#162033",
                      }}>
                        {i < 3 ? (
                          <Crown className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: i === 0 ? "#f59e0b" : i === 1 ? "#C0C0C0" : "#CD7F32" }} />
                        ) : (
                          <span className="text-[#8494A7]" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.875rem" }}>
                            {athlete.rank}
                          </span>
                        )}
                      </div>

                      {/* Avatar */}
                      <div
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border-2 shrink-0 bg-[#0B1120] flex items-center justify-center"
                        style={{ borderColor }}
                      >
                        {hasPfp ? (
                          <ImageWithFallback src={athlete.pfpUrl} alt={athlete.name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5" style={{ color: `${borderColor}60` }} />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[#E8ECF0] text-xs sm:text-sm truncate font-semibold">{athlete.name}</p>
                          {athlete.streak >= 3 && <Flame className="w-3 h-3 text-[#f59e0b] shrink-0" />}
                          {athlete.status === "champion" && <Trophy className="w-3 h-3 text-[#D4A843] shrink-0" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-[#8494A7] inline-flex items-center gap-1"><InlineFlag country={athlete.country} /> {athlete.country}</span>
                        </div>
                      </div>

                      {/* Desktop stats */}
                      <div className="hidden sm:flex items-center gap-5 text-sm">
                        <div className="text-center min-w-[50px]">
                          <p className="text-[#10b981]" style={{ fontFamily: "Orbitron, sans-serif" }}>{athlete.wins}W-{athlete.losses}L</p>
                          <p className="text-[0.55rem] text-[#D4A843]">T {(athlete.tournamentWins || 0)}-{(athlete.tournamentLosses || 0)}</p>
                          <p className="text-[0.6rem] text-[#8494A7]">Record</p>
                        </div>
                        <div className="text-center min-w-[40px]">
                          <p className="text-[#f59e0b]" style={{ fontFamily: "Orbitron, sans-serif" }}>{athlete.winRate}%</p>
                          <p className="text-[0.6rem] text-[#8494A7]">Win Rate</p>
                        </div>
                        <div className="text-center min-w-[40px]">
                          <p className="text-[#4274B9]" style={{ fontFamily: "Orbitron, sans-serif" }}>
                            {formatPower(athlete.totalPowerRating)}
                          </p>
                          <p className="text-[0.6rem] text-[#8494A7]">Power</p>
                        </div>
                        <div className="text-center min-w-[50px]">
                          <p className="text-[#D4A843]" style={{ fontFamily: "Orbitron, sans-serif" }}>
                            {athlete.compositeScore}
                          </p>
                          <p className="text-[0.6rem] text-[#8494A7]">Score</p>
                        </div>
                      </div>

                      {/* Mobile stats */}
                      <div className="sm:hidden text-right shrink-0">
                        <p className="text-[#D4A843] text-xs" style={{ fontFamily: "Orbitron, sans-serif" }}>{athlete.compositeScore}</p>
                        <p className="text-[#10b981] text-[0.6rem]">{athlete.wins}W-{athlete.losses}L</p>
                      </div>

                      <ChevronDown className={`w-4 h-4 text-[#8494A7] shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </div>

                    {/* Expanded detail */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 sm:px-4 pb-4 pt-1 border-t border-[#4274B9]/10">
                            {/* Score breakdown */}
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-3">
                              <div className="bg-[#0B1120] rounded-lg p-2 text-center">
                                <p className="text-[#10b981] text-sm" style={{ fontFamily: "Orbitron, sans-serif" }}>{athlete.wins * 10}</p>
                                <p className="text-[0.5rem] text-[#8494A7]">Wins ({athlete.wins}x10)</p>
                              </div>
                              <div className="bg-[#0B1120] rounded-lg p-2 text-center">
                                <p className="text-[#f59e0b] text-sm" style={{ fontFamily: "Orbitron, sans-serif" }}>{(athlete.winRate / 100 * 20).toFixed(1)}</p>
                                <p className="text-[0.5rem] text-[#8494A7]">Win Rate Bonus</p>
                              </div>
                              <div className="bg-[#0B1120] rounded-lg p-2 text-center">
                                <p className="text-[#4274B9] text-sm" style={{ fontFamily: "Orbitron, sans-serif" }}>{formatPower((athlete.totalPowerRating || 0) * 2)}</p>
                                <p className="text-[0.5rem] text-[#8494A7]">Skill Rating</p>
                              </div>
                              <div className="bg-[#0B1120] rounded-lg p-2 text-center">
                                <p className="text-[#f59e0b] text-sm" style={{ fontFamily: "Orbitron, sans-serif" }}>{athlete.streak * 3}</p>
                                <p className="text-[0.5rem] text-[#8494A7]">Streak ({athlete.streak}x3)</p>
                              </div>
                              <div className="bg-[#0B1120] rounded-lg p-2 text-center">
                                <p className="text-[#6AA3E0] text-sm" style={{ fontFamily: "Orbitron, sans-serif" }}>{(athlete.totalVotes * 0.5).toFixed(1)}</p>
                                <p className="text-[0.5rem] text-[#8494A7]">Fan Votes</p>
                              </div>
                            </div>

                            {/* Skill bars */}
                            {athlete.skills && (
                              <div className="space-y-1">
                                {(["energy", "performance", "static", "aggression", "dynamic"] as const).map((skill) => {
                                  const val = athlete.skills[skill] || 0;
                                  return (
                                    <div key={skill} className="flex items-center gap-2">
                                      <span className="text-[0.5rem] text-[#8494A7] w-16">{SKILL_LABELS[skill] || skill}</span>
                                      <div className="flex-1 h-1.5 rounded-full bg-[#162033] overflow-hidden">
                                        <motion.div
                                          initial={{ width: 0 }}
                                          animate={{ width: `${(val / 10) * 100}%` }}
                                          transition={{ duration: 0.8, delay: 0.1 }}
                                          className="h-full rounded-full"
                                          style={{ background: SKILL_COLORS[skill] }}
                                        />
                                      </div>
                                      <span className="text-[0.5rem] font-mono w-6 text-right" style={{ color: SKILL_COLORS[skill] }}>
                                        {val.toFixed(1)}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {athlete.specialMove && (
                              <p className="text-[0.6rem] text-[#8494A7] mt-2">
                                <Zap className="w-3 h-3 inline text-[#f59e0b] mr-1" />
                                Signature: <span className="text-[#f59e0b]">{athlete.specialMove}</span>
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>
          )
        )}

        {tab === "calls" && (
          loadingVoters ? (
            <BOTBSpinner messages={["Loading calls..."]}>
              <div className="w-full space-y-3">
                {[0, 1, 2, 3, 4].map((n) => (
                  <SkeletonLeaderboardRow key={n} delay={n * 0.1} />
                ))}
              </div>
            </BOTBSpinner>
          ) : voterError ? (
            <div className="py-8">
              <ErrorCard title="Calls Unavailable" message={voterError} onRetry={loadVoters} />
            </div>
          ) : voters.every((v) => v.decidedBattles === 0) ? (
            <div className="text-center py-16 bg-[#111827] rounded-2xl border border-[#4274B9]/10">
              <Target className="w-10 h-10 text-[#4274B9]/20 mx-auto mb-3" />
              <p className="text-[#E8ECF0] text-sm">The board starts when a card closes.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {[...voters]
                .filter((v) => v.decidedBattles > 0)
                .sort((a, b) => b.correctPicks - a.correctPicks || b.accuracy - a.accuracy)
                .map((voter, i) => (
                  <div key={voter.wallet} className="bg-[#111827] border border-[#4274B9]/10 rounded-xl p-3 sm:p-4 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#162033] flex items-center justify-center text-[#8494A7]" style={{ fontFamily: "Orbitron, sans-serif" }}>
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[#E8ECF0] text-sm truncate">{truncateWallet(voter.wallet)}</p>
                      <p className="text-[0.65rem] text-[#8494A7]">{voter.decidedBattles} closed cards</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[#D4A843]" style={{ fontFamily: "Orbitron, sans-serif" }}>{voter.correctPicks}</p>
                      <p className="text-[0.6rem] text-[#8494A7]">Correct calls</p>
                    </div>
                  </div>
                ))}
            </div>
          )
        )}

        <div className="mt-8 p-4 rounded-xl bg-[#111827] border border-[#4274B9]/10">
          <h4 className="text-[#8494A7] text-xs mb-2" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.6rem" }}>
            RANKING
          </h4>
          <p className="text-[0.65rem] text-[#8494A7]">
            Athletes rank by wins and skill. Fans rank by correct calls, one per closed card, equal weight.
          </p>
        </div>
      </div>
    </div>
  );
}
