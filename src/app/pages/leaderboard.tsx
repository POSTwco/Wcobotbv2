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
 * Voters tab shows wallet addresses linked to HashScan, NFT badges, and rewards.
 */

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Trophy, Medal, Target, Crown, Shield, Flame, Loader2,
  User, Zap, ExternalLink, Vote, Award, BarChart3, Crosshair,
  RefreshCw, ChevronDown, Eye, TrendingUp,
} from "lucide-react";
import { useWallet } from "../components/wallet-context";
import { useVIP } from "../components/vip/vip-context";
import { ImageWithFallback } from "../components/figma/ImageWithFallback";
import botbShield from "figma:asset/2d6e7a2459a1a0d372fe2cf8a444eed0da642b5f.png";
import { api } from "../lib/api";
import { getNetworkConfig } from "../lib/hedera-config";
import { ErrorCard } from "../components/error-boundary";
import { BOTBSpinner, SkeletonLeaderboardRow } from "../components/botb-spinner";
import { getCountryFlag } from "../lib/country-flags";
import { InlineFlag } from "../components/country-flag";
import { formatPower } from "../lib/format";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Tab = "athletes" | "voters" | "oracle" | "mystats";

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
  compositeScore: number;
  status: string;
  nftSeriesName: string;
  nftCardBorderColor: string;
  specialMove: string;
  skills: Record<string, number>;
}

interface RankedVoter {
  rank: number;
  wallet: string;
  battleVotes: number;
  correctPicks: number;
  decidedBattles: number;
  accuracy: number;
  totalWeightedPower: number;
  proposalVotes: number;
  totalVotes: number;
  hasGovernorNFT: boolean;
  hasSigmaNFT: boolean;
  maxVotingPower: number;
  totalStaked: number;
  rewardsEarned: number;
  voterScore: number;
  lastVoteAt: string;
  // Oracle fields
  oracleScore: number;
  oracleTier: string;
  currentStreak: number;
  longestStreak: number;
  oracleQualified: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const HASHSCAN_URL = getNetworkConfig().explorerUrl;

function truncateWallet(wallet: string): string {
  if (!wallet || wallet.length < 10) return wallet;
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
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
  const { vipActive } = useVIP();
  const { connected, accountId, votingPower, hasGovernorNFT, hasSigmaNFT, balance, botbBalance, nftsOwned } = useWallet();

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
  useEffect(() => { if (tab === "voters" || tab === "oracle" || tab === "mystats") loadVoters(); }, [tab, loadVoters]);

  // Find connected wallet's voter stats
  const myVoterStats = voters.find((v) => v.wallet === accountId) || null;

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
              <p className="text-[#8494A7]">Live rankings powered by Hedera. Updated after every battle.</p>
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
                {formatNumber(voters.reduce((s, v) => s + v.rewardsEarned, 0))}
              </p>
              <p className="text-[0.6rem] text-[#8494A7]">Total Rewards</p>
            </div>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-2 mb-6 sm:mb-8 overflow-x-auto">
          {([
            { id: "athletes" as Tab, icon: <Medal className="w-4 h-4" />, label: "ATHLETES" },
            { id: "voters" as Tab, icon: <Target className="w-4 h-4" />, label: "TOP VOTERS" },
            { id: "oracle" as Tab, icon: <Eye className="w-4 h-4" />, label: "ORACLE" },
            { id: "mystats" as Tab, icon: <User className="w-4 h-4" />, label: "MY STATS" },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 sm:px-5 py-2.5 rounded-lg text-sm transition-all whitespace-nowrap ${
                tab === t.id
                  ? t.id === "athletes"
                    ? "bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/30"
                    : t.id === "voters"
                    ? "bg-[#4274B9]/10 text-[#4274B9] border border-[#4274B9]/30"
                    : t.id === "oracle"
                    ? "bg-[#D4A843]/10 text-[#D4A843] border border-[#D4A843]/30"
                    : "bg-[#D4A843]/10 text-[#D4A843] border border-[#D4A843]/30"
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
                const borderColor = athlete.nftCardBorderColor || "#4274B9";
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
                          {athlete.nftSeriesName && (
                            <>
                              <span className="text-[#4274B9]/30">·</span>
                              <span className="text-[0.6rem]" style={{ color: borderColor }}>{athlete.nftSeriesName}</span>
                            </>
                          )}
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

        {/* ================================================================ */}
        {/* TOP VOTERS TAB */}
        {/* ================================================================ */}
        {tab === "voters" && (
          loadingVoters ? (
            <BOTBSpinner
              messages={[
                "Aggregating vote history...",
                "Verifying wallets...",
                "Computing accuracy...",
                "Ranking voters...",
              ]}
            >
              <div className="w-full space-y-3">
                {[0, 1, 2, 3, 4].map((i) => (
                  <SkeletonLeaderboardRow key={i} delay={i * 0.1} />
                ))}
              </div>
            </BOTBSpinner>
          ) : voterError ? (
            <div className="py-8">
              <ErrorCard title="Voter Data Unavailable" message={voterError} onRetry={loadVoters} />
            </div>
          ) : voters.length === 0 ? (
            <div className="text-center py-16 bg-[#111827] rounded-2xl border border-[#4274B9]/10">
              <Target className="w-10 h-10 text-[#4274B9]/20 mx-auto mb-3" />
              <h3 className="text-[#E8ECF0] font-bold mb-2" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.9rem" }}>
                NO VOTES YET
              </h3>
              <p className="text-[#8494A7] text-sm max-w-md mx-auto">
                The voter leaderboard will populate as wallets cast votes on battles and governance proposals. Connect your wallet and vote to appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Column headers */}
              <div className="hidden sm:flex items-center gap-4 px-4 text-[0.55rem] text-[#8494A7] uppercase tracking-wider" style={{ fontFamily: "Orbitron, sans-serif" }}>
                <span className="w-10">Rank</span>
                <span className="flex-1">Wallet</span>
                <span className="w-16 text-center">Votes</span>
                <span className="w-16 text-center">Accuracy</span>
                <span className="w-16 text-center">Power</span>
                <span className="w-20 text-center">Rewards</span>
                <span className="w-16 text-center">Score</span>
              </div>

              {voters.map((voter, i) => {
                const isMe = voter.wallet === accountId;
                return (
                  <motion.div
                    key={voter.wallet}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className={`bg-[#111827] border rounded-xl p-3 sm:p-4 flex items-center gap-3 sm:gap-4 transition-all hover:border-[#4274B9]/30 ${
                      isMe
                        ? "border-[#D4A843]/40 bg-[#D4A843]/5"
                        : i < 3
                        ? "border-[#f59e0b]/20"
                        : "border-[#4274B9]/10"
                    }`}
                  >
                    {/* Rank */}
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0" style={{
                      background: i === 0 ? "#f59e0b20" : i === 1 ? "#C0C0C020" : i === 2 ? "#CD7F3220" : "#162033",
                    }}>
                      {i < 3 ? (
                        <Crown className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: i === 0 ? "#f59e0b" : i === 1 ? "#C0C0C0" : "#CD7F32" }} />
                      ) : (
                        <span className="text-[#8494A7]" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.875rem" }}>
                          {voter.rank}
                        </span>
                      )}
                    </div>

                    {/* Wallet + NFT badges */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <a
                          href={`${HASHSCAN_URL}/account/${voter.wallet}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#E8ECF0] text-xs sm:text-sm font-mono hover:text-[#6AA3E0] transition-colors flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {truncateWallet(voter.wallet)}
                          <ExternalLink className="w-3 h-3 text-[#8494A7]" />
                        </a>
                        {isMe && (
                          <span className="px-1.5 py-0.5 rounded text-[0.5rem] bg-[#D4A843]/10 text-[#D4A843] border border-[#D4A843]/30" style={{ fontFamily: "Orbitron, sans-serif" }}>
                            YOU
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {voter.hasGovernorNFT && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.5rem] bg-[#D4A843]/10 text-[#D4A843] border border-[#D4A843]/30">
                            <Shield className="w-2.5 h-2.5" /> Governor
                          </span>
                        )}
                        {voter.hasSigmaNFT && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.5rem] bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/30">
                            <Zap className="w-2.5 h-2.5" /> Sigma
                          </span>
                        )}
                        <span className="text-[0.5rem] text-[#8494A7]">
                          {voter.maxVotingPower}x power
                        </span>
                      </div>
                    </div>

                    {/* Desktop stats */}
                    <div className="hidden sm:flex items-center gap-5 text-sm shrink-0">
                      <div className="text-center w-16">
                        <p className="text-[#6AA3E0]" style={{ fontFamily: "Orbitron, sans-serif" }}>{voter.totalVotes}</p>
                        <p className="text-[0.5rem] text-[#8494A7]">{voter.battleVotes}B / {voter.proposalVotes}P</p>
                      </div>
                      <div className="text-center w-16">
                        <p className={voter.accuracy >= 70 ? "text-[#10b981]" : voter.accuracy >= 40 ? "text-[#f59e0b]" : "text-red-400"} style={{ fontFamily: "Orbitron, sans-serif" }}>
                          {voter.accuracy}%
                        </p>
                        <p className="text-[0.5rem] text-[#8494A7]">{voter.correctPicks}/{voter.battleVotes}</p>
                      </div>
                      <div className="text-center w-16">
                        <p className="text-[#4274B9]" style={{ fontFamily: "Orbitron, sans-serif" }}>
                          {formatNumber(voter.totalWeightedPower)}
                        </p>
                        <p className="text-[0.5rem] text-[#8494A7]">Weighted</p>
                      </div>
                      <div className="text-center w-20">
                        <p className="text-[#D4A843]" style={{ fontFamily: "Orbitron, sans-serif" }}>
                          {formatNumber(voter.rewardsEarned)}
                        </p>
                        <p className="text-[0.5rem] text-[#8494A7]">BOTB Earned</p>
                      </div>
                      <div className="text-center w-16">
                        <p className="text-[#f59e0b]" style={{ fontFamily: "Orbitron, sans-serif" }}>
                          {voter.voterScore}
                        </p>
                        <p className="text-[0.5rem] text-[#8494A7]">Score</p>
                      </div>
                    </div>

                    {/* Mobile stats */}
                    <div className="sm:hidden text-right shrink-0">
                      <p className="text-[#f59e0b] text-xs" style={{ fontFamily: "Orbitron, sans-serif" }}>{voter.voterScore}</p>
                      <p className="text-[#10b981] text-[0.6rem]">{voter.accuracy}% acc</p>
                      <p className="text-[#D4A843] text-[0.5rem]">{formatNumber(voter.rewardsEarned)}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )
        )}

        {/* ================================================================ */}
        {/* ORACLE TAB — Prediction Accuracy Leaderboard */}
        {/* ================================================================ */}
        {tab === "oracle" && (() => {
          // Oracle ranking: sorted by oracleScore, qualified wallets first
          const oracleRanked = [...voters]
            .sort((a, b) => b.oracleScore - a.oracleScore || b.accuracy - a.accuracy)
            .map((v, i) => ({ ...v, oracleRank: i + 1 }));

          const TIER_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
            OMNISCIENT: { color: "#f59e0b", bg: "#f59e0b10", border: "#f59e0b30", label: "OMNISCIENT" },
            ORACLE:     { color: "#D4A843", bg: "#D4A84310", border: "#D4A84330", label: "ORACLE" },
            PROPHET:    { color: "#10b981", bg: "#10b98110", border: "#10b98130", label: "PROPHET" },
            SEER:       { color: "#6AA3E0", bg: "#6AA3E010", border: "#6AA3E030", label: "SEER" },
            APPRENTICE: { color: "#8B5CF6", bg: "#8B5CF610", border: "#8B5CF630", label: "APPRENTICE" },
            UNRANKED:   { color: "#8494A7", bg: "#8494A708", border: "#8494A715", label: "UNRANKED" },
          };

          const myOracle = oracleRanked.find((v) => v.wallet === accountId);

          return loadingVoters ? (
            <BOTBSpinner
              messages={[
                "Computing Oracle rankings...",
                "Analyzing predictions...",
                "Calculating streaks...",
                "Rating accuracy...",
              ]}
            >
              <div className="w-full space-y-3">
                {[0, 1, 2, 3].map((i) => (
                  <SkeletonLeaderboardRow key={i} delay={i * 0.1} />
                ))}
              </div>
            </BOTBSpinner>
          ) : voters.length === 0 ? (
            <div className="text-center py-16 bg-[#111827] rounded-2xl border border-[#D4A843]/10">
              <Eye className="w-10 h-10 text-[#D4A843]/20 mx-auto mb-3" />
              <h3 className="text-[#E8ECF0] font-bold mb-2" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.9rem" }}>
                THE ORACLE AWAITS
              </h3>
              <p className="text-[#8494A7] text-sm max-w-md mx-auto">
                Oracle rankings activate once battles are decided. Pick winners consistently to climb the Oracle leaderboard.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Oracle Score Header */}
              <div className="bg-gradient-to-br from-[#1a1508] to-[#111827] border border-[#D4A843]/20 rounded-2xl p-5 sm:p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 rounded-xl bg-[#D4A843]/10 border border-[#D4A843]/30">
                    <Eye className="w-6 h-6 text-[#D4A843]" />
                  </div>
                  <div>
                    <h2 className="text-[#E8ECF0] font-bold" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "1rem" }}>
                      ORACLE SCORE
                    </h2>
                    <p className="text-[0.65rem] text-[#8494A7]">Prediction accuracy leaderboard — who sees the future?</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 mb-4">
                  <div className="bg-[#0B1120] rounded-xl p-3 text-center border border-[#D4A843]/10">
                    <p className="text-[#D4A843] text-lg" style={{ fontFamily: "Orbitron, sans-serif" }}>
                      {oracleRanked.filter(v => v.oracleQualified).length}
                    </p>
                    <p className="text-[0.55rem] text-[#8494A7]">Qualified Oracles</p>
                  </div>
                  {(["OMNISCIENT", "ORACLE", "PROPHET", "SEER"] as const).map((tier) => {
                    const cfg = TIER_CONFIG[tier];
                    const count = oracleRanked.filter(v => v.oracleTier === tier).length;
                    return (
                      <div key={tier} className="bg-[#0B1120] rounded-xl p-3 text-center border" style={{ borderColor: cfg.border }}>
                        <p className="text-lg" style={{ fontFamily: "Orbitron, sans-serif", color: cfg.color }}>{count}</p>
                        <p className="text-[0.55rem] text-[#8494A7]">{cfg.label}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Tier legend */}
                <div className="flex flex-wrap gap-2 text-[0.55rem]">
                  {(["OMNISCIENT", "ORACLE", "PROPHET", "SEER", "APPRENTICE"] as const).map((tier) => {
                    const cfg = TIER_CONFIG[tier];
                    const req = tier === "OMNISCIENT" ? "80%+ / 10+ battles"
                      : tier === "ORACLE" ? "80%+ / 5+ battles"
                      : tier === "PROPHET" ? "65%+ / 3+ battles"
                      : tier === "SEER" ? "50%+ / 3+ battles"
                      : "<50% / 3+ battles";
                    return (
                      <div key={tier} className="flex items-center gap-1 px-2 py-1 rounded" style={{ background: cfg.bg, border: `1px solid ${cfg.border}` }}>
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
                        <span style={{ color: cfg.color, fontFamily: "Orbitron, sans-serif" }}>{cfg.label}</span>
                        <span className="text-[#8494A7] ml-0.5">{req}</span>
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-1 px-2 py-1 rounded bg-[#8494A708] border border-[#8494A715]">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#8494A7]" />
                    <span className="text-[#8494A7]" style={{ fontFamily: "Orbitron, sans-serif" }}>UNRANKED</span>
                    <span className="text-[#8494A7] ml-0.5">&lt;3 decided battles</span>
                  </div>
                </div>

                {/* Your Oracle rank if connected */}
                {myOracle && (
                  <div className="mt-4 pt-3 border-t border-[#D4A843]/10 flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[0.65rem] text-[#8494A7]">Your Oracle Rank:</span>
                      <span className="text-[#D4A843] font-bold" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.85rem" }}>
                        #{myOracle.oracleRank}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[0.65rem] text-[#8494A7]">Score: <span className="text-[#D4A843] font-mono">{myOracle.oracleScore}</span></span>
                      <span className="text-[0.65rem] text-[#8494A7]">Streak: <span className="text-[#f59e0b] font-mono">{myOracle.currentStreak}</span></span>
                      <span className="px-2 py-0.5 rounded text-[0.55rem] font-bold" style={{
                        background: TIER_CONFIG[myOracle.oracleTier]?.bg,
                        border: `1px solid ${TIER_CONFIG[myOracle.oracleTier]?.border}`,
                        color: TIER_CONFIG[myOracle.oracleTier]?.color,
                        fontFamily: "Orbitron, sans-serif",
                      }}>
                        {myOracle.oracleTier}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Oracle Rankings List */}
              <div className="space-y-2">
                {/* Column headers */}
                <div className="hidden sm:flex items-center gap-3 px-4 text-[0.55rem] text-[#8494A7] uppercase tracking-wider" style={{ fontFamily: "Orbitron, sans-serif" }}>
                  <span className="w-10">Rank</span>
                  <span className="flex-1">Wallet</span>
                  <span className="w-14 text-center">Score</span>
                  <span className="w-14 text-center">Accuracy</span>
                  <span className="w-12 text-center">Picks</span>
                  <span className="w-14 text-center">Streak</span>
                  <span className="w-14 text-center">Best</span>
                  <span className="w-24 text-center">Tier</span>
                </div>

                {oracleRanked.map((voter, i) => {
                  const isMe = voter.wallet === accountId;
                  const tier = TIER_CONFIG[voter.oracleTier] || TIER_CONFIG.UNRANKED;
                  const isQualified = voter.oracleQualified;

                  return (
                    <motion.div
                      key={voter.wallet}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className={`bg-[#111827] border rounded-xl p-3 sm:p-4 flex items-center gap-3 sm:gap-4 transition-all hover:border-[#D4A843]/30 ${
                        isMe
                          ? "border-[#D4A843]/40 bg-[#D4A843]/5"
                          : isQualified && i < 3
                          ? "border-[#D4A843]/20"
                          : "border-[#4274B9]/10"
                      } ${!isQualified ? "opacity-50" : ""}`}
                    >
                      {/* Rank */}
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center shrink-0" style={{
                        background: isQualified
                          ? i === 0 ? "#f59e0b20" : i === 1 ? "#C0C0C020" : i === 2 ? "#CD7F3220" : "#162033"
                          : "#16203380",
                      }}>
                        {isQualified && i < 3 ? (
                          <Crown className="w-4 h-4 sm:w-5 sm:h-5" style={{ color: i === 0 ? "#f59e0b" : i === 1 ? "#C0C0C0" : "#CD7F32" }} />
                        ) : (
                          <span className="text-[#8494A7]" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.75rem" }}>
                            {isQualified ? voter.oracleRank : "\u2014"}
                          </span>
                        )}
                      </div>

                      {/* Wallet + tier badge */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <a
                            href={`${HASHSCAN_URL}/account/${voter.wallet}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#E8ECF0] text-xs sm:text-sm font-mono hover:text-[#6AA3E0] transition-colors flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {truncateWallet(voter.wallet)}
                            <ExternalLink className="w-3 h-3 text-[#8494A7]" />
                          </a>
                          {isMe && (
                            <span className="px-1.5 py-0.5 rounded text-[0.5rem] bg-[#D4A843]/10 text-[#D4A843] border border-[#D4A843]/30" style={{ fontFamily: "Orbitron, sans-serif" }}>
                              YOU
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {voter.hasGovernorNFT && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.5rem] bg-[#D4A843]/10 text-[#D4A843] border border-[#D4A843]/30">
                              <Shield className="w-2.5 h-2.5" /> Gov
                            </span>
                          )}
                          {voter.hasSigmaNFT && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.5rem] bg-[#8B5CF6]/10 text-[#8B5CF6] border border-[#8B5CF6]/30">
                              <Zap className="w-2.5 h-2.5" /> Sigma
                            </span>
                          )}
                          <span className="text-[0.5rem] text-[#8494A7]">
                            {voter.decidedBattles} decided battle{voter.decidedBattles !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>

                      {/* Desktop stats */}
                      <div className="hidden sm:flex items-center gap-3 text-sm shrink-0">
                        <div className="text-center w-14">
                          <p className="text-[#D4A843]" style={{ fontFamily: "Orbitron, sans-serif" }}>
                            {voter.oracleScore}
                          </p>
                          <p className="text-[0.5rem] text-[#8494A7]">Score</p>
                        </div>
                        <div className="text-center w-14">
                          <p className={voter.accuracy >= 70 ? "text-[#10b981]" : voter.accuracy >= 40 ? "text-[#f59e0b]" : "text-red-400"} style={{ fontFamily: "Orbitron, sans-serif" }}>
                            {voter.accuracy}%
                          </p>
                          <p className="text-[0.5rem] text-[#8494A7]">{voter.correctPicks}/{voter.decidedBattles}</p>
                        </div>
                        <div className="text-center w-12">
                          <p className="text-[#6AA3E0]" style={{ fontFamily: "Orbitron, sans-serif" }}>{voter.correctPicks}</p>
                          <p className="text-[0.5rem] text-[#8494A7]">Correct</p>
                        </div>
                        <div className="text-center w-14">
                          <p className="flex items-center justify-center gap-0.5" style={{ fontFamily: "Orbitron, sans-serif" }}>
                            {voter.currentStreak > 0 && <Flame className="w-3 h-3 text-[#f59e0b]" />}
                            <span className={voter.currentStreak >= 3 ? "text-[#f59e0b]" : "text-[#8494A7]"}>
                              {voter.currentStreak}
                            </span>
                          </p>
                          <p className="text-[0.5rem] text-[#8494A7]">Current</p>
                        </div>
                        <div className="text-center w-14">
                          <p className="text-[#8494A7]" style={{ fontFamily: "Orbitron, sans-serif" }}>{voter.longestStreak}</p>
                          <p className="text-[0.5rem] text-[#8494A7]">Best</p>
                        </div>
                        <div className="text-center w-24">
                          <span className="inline-block px-2 py-0.5 rounded text-[0.6rem] font-bold" style={{
                            background: tier.bg,
                            border: `1px solid ${tier.border}`,
                            color: tier.color,
                            fontFamily: "Orbitron, sans-serif",
                          }}>
                            {tier.label}
                          </span>
                        </div>
                      </div>

                      {/* Mobile stats */}
                      <div className="sm:hidden text-right shrink-0 space-y-0.5">
                        <p className="text-[#D4A843] text-xs" style={{ fontFamily: "Orbitron, sans-serif" }}>{voter.oracleScore}</p>
                        <p className="text-[0.6rem] flex items-center justify-end gap-0.5">
                          <span className={voter.accuracy >= 70 ? "text-[#10b981]" : voter.accuracy >= 40 ? "text-[#f59e0b]" : "text-red-400"}>
                            {voter.accuracy}%
                          </span>
                          {voter.currentStreak > 0 && <Flame className="w-2.5 h-2.5 text-[#f59e0b]" />}
                        </p>
                        <span className="inline-block px-1.5 py-0.5 rounded text-[0.45rem] font-bold" style={{
                          background: tier.bg, border: `1px solid ${tier.border}`,
                          color: tier.color, fontFamily: "Orbitron, sans-serif",
                        }}>
                          {tier.label}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ================================================================ */}
        {/* MY STATS TAB */}
        {/* ================================================================ */}
        {tab === "mystats" && (
          !connected ? (
            <div className="text-center py-16 bg-[#111827] rounded-2xl border border-[#4274B9]/10">
              <User className="w-10 h-10 text-[#4274B9]/20 mx-auto mb-3" />
              <h3 className="text-[#E8ECF0] font-bold mb-2" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.9rem" }}>
                CONNECT WALLET
              </h3>
              <p className="text-[#8494A7] text-sm max-w-md mx-auto">
                Connect your Hedera wallet to view your personal leaderboard stats, NFT holdings, voting history, and reward earnings.
              </p>
            </div>
          ) : loadingVoters ? (
            <BOTBSpinner
              messages={[
                "Loading your stats...",
                "Fetching wallet data...",
                "Computing performance...",
                "Preparing dashboard...",
              ]}
            />
          ) : (
            <div className="space-y-4">
              {/* Wallet Identity Card */}
              <div className="bg-gradient-to-br from-[#0f1923] to-[#111827] border border-[#D4A843]/20 rounded-2xl p-5 sm:p-6">
                <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-[#D4A843]/10 border border-[#D4A843]/30">
                      <Shield className="w-6 h-6 text-[#D4A843]" />
                    </div>
                    <div>
                      <p className="text-[#E8ECF0] font-bold text-sm" style={{ fontFamily: "Orbitron, sans-serif" }}>YOUR WALLET</p>
                      <a
                        href={`${HASHSCAN_URL}/account/${accountId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#6AA3E0] text-xs font-mono hover:text-[#4274B9] transition-colors flex items-center gap-1"
                      >
                        {accountId} <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                  {myVoterStats && (
                    <div className="px-3 py-1.5 rounded-lg bg-[#f59e0b]/10 border border-[#f59e0b]/30">
                      <p className="text-[#f59e0b] text-xs" style={{ fontFamily: "Orbitron, sans-serif" }}>
                        RANK #{myVoterStats.rank}
                      </p>
                    </div>
                  )}
                </div>

                {/* Hedera Balances + NFT Holdings */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  <div className="bg-[#0B1120] rounded-xl p-3 text-center border border-[#4274B9]/10">
                    <p className="text-[#E8ECF0] text-lg" style={{ fontFamily: "Orbitron, sans-serif" }}>
                      {balance.toFixed(2)}
                    </p>
                    <p className="text-[0.6rem] text-[#8494A7]">HBAR Balance</p>
                  </div>
                  <div className="bg-[#0B1120] rounded-xl p-3 text-center border border-[#4274B9]/10">
                    <p className="text-[#6AA3E0] text-lg" style={{ fontFamily: "Orbitron, sans-serif" }}>
                      {formatNumber(botbBalance)}
                    </p>
                    <p className="text-[0.6rem] text-[#8494A7]">BOTB Tokens</p>
                  </div>
                  <div className="bg-[#0B1120] rounded-xl p-3 text-center border border-[#4274B9]/10">
                    <p className="text-[#D4A843] text-lg" style={{ fontFamily: "Orbitron, sans-serif" }}>
                      {nftsOwned}
                    </p>
                    <p className="text-[0.6rem] text-[#8494A7]">NFTs Owned</p>
                  </div>
                  <div className="bg-[#0B1120] rounded-xl p-3 text-center border border-[#4274B9]/10">
                    <p className="text-[#f59e0b] text-lg" style={{ fontFamily: "Orbitron, sans-serif" }}>
                      {votingPower}x
                    </p>
                    <p className="text-[0.6rem] text-[#8494A7]">Voting Power</p>
                  </div>
                </div>

                {/* NFT Badge Row */}
                <div className="flex items-center gap-2 flex-wrap">
                  {hasGovernorNFT && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4A843]/10 border border-[#D4A843]/30">
                      <Shield className="w-4 h-4 text-[#D4A843]" />
                      <span className="text-[#D4A843] text-xs" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}>
                        GOVERNOR NFT
                      </span>
                      <span className="text-[0.55rem] text-[#8494A7]">2x power</span>
                    </div>
                  )}
                  {hasSigmaNFT && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#8B5CF6]/10 border border-[#8B5CF6]/30">
                      <Zap className="w-4 h-4 text-[#8B5CF6]" />
                      <span className="text-[#8B5CF6] text-xs" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}>
                        SIGMA NFT
                      </span>
                      <span className="text-[0.55rem] text-[#8494A7]">1.5x power</span>
                    </div>
                  )}
                  {!hasGovernorNFT && !hasSigmaNFT && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#162033] border border-[#4274B9]/10">
                      <User className="w-4 h-4 text-[#8494A7]" />
                      <span className="text-[#8494A7] text-xs">Base voter — 1x power</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Voting Performance */}
              {myVoterStats ? (
                <div className="bg-[#111827] border border-[#4274B9]/10 rounded-2xl p-5 sm:p-6">
                  <h3 className="text-[#E8ECF0] font-bold mb-4 flex items-center gap-2" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.8rem" }}>
                    <BarChart3 className="w-4 h-4 text-[#4274B9]" /> VOTING PERFORMANCE
                  </h3>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                    <div className="bg-[#0B1120] rounded-xl p-3 text-center">
                      <p className="text-[#6AA3E0] text-xl" style={{ fontFamily: "Orbitron, sans-serif" }}>{myVoterStats.totalVotes}</p>
                      <p className="text-[0.6rem] text-[#8494A7]">Total Votes</p>
                    </div>
                    <div className="bg-[#0B1120] rounded-xl p-3 text-center">
                      <p className={`text-xl ${myVoterStats.accuracy >= 70 ? "text-[#10b981]" : myVoterStats.accuracy >= 40 ? "text-[#f59e0b]" : "text-red-400"}`} style={{ fontFamily: "Orbitron, sans-serif" }}>
                        {myVoterStats.accuracy}%
                      </p>
                      <p className="text-[0.6rem] text-[#8494A7]">Accuracy</p>
                    </div>
                    <div className="bg-[#0B1120] rounded-xl p-3 text-center">
                      <p className="text-[#D4A843] text-xl" style={{ fontFamily: "Orbitron, sans-serif" }}>{formatNumber(myVoterStats.rewardsEarned)}</p>
                      <p className="text-[0.6rem] text-[#8494A7]">BOTB Earned</p>
                    </div>
                    <div className="bg-[#0B1120] rounded-xl p-3 text-center">
                      <p className="text-[#f59e0b] text-xl" style={{ fontFamily: "Orbitron, sans-serif" }}>{myVoterStats.voterScore}</p>
                      <p className="text-[0.6rem] text-[#8494A7]">Voter Score</p>
                    </div>
                  </div>

                  {/* Battle vs Governance breakdown */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#0B1120] rounded-xl p-3 border border-[#4274B9]/10">
                      <div className="flex items-center gap-2 mb-2">
                        <Crosshair className="w-4 h-4 text-[#6AA3E0]" />
                        <span className="text-[0.65rem] text-[#E8ECF0]" style={{ fontFamily: "Orbitron, sans-serif" }}>BATTLE VOTES</span>
                      </div>
                      <p className="text-[#6AA3E0] text-lg" style={{ fontFamily: "Orbitron, sans-serif" }}>{myVoterStats.battleVotes}</p>
                      <p className="text-[0.55rem] text-[#8494A7]">{myVoterStats.correctPicks} correct picks</p>
                    </div>
                    <div className="bg-[#0B1120] rounded-xl p-3 border border-[#4274B9]/10">
                      <div className="flex items-center gap-2 mb-2">
                        <Vote className="w-4 h-4 text-[#8B5CF6]" />
                        <span className="text-[0.65rem] text-[#E8ECF0]" style={{ fontFamily: "Orbitron, sans-serif" }}>GOVERNANCE</span>
                      </div>
                      <p className="text-[#8B5CF6] text-lg" style={{ fontFamily: "Orbitron, sans-serif" }}>{myVoterStats.proposalVotes}</p>
                      <p className="text-[0.55rem] text-[#8494A7]">Proposals voted on</p>
                    </div>
                  </div>

                  {/* Oracle Score Card */}
                  <div className="mt-3 bg-gradient-to-r from-[#1a1508] to-[#0B1120] rounded-xl p-4 border border-[#D4A843]/15">
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <Eye className="w-4 h-4 text-[#D4A843]" />
                      <span className="text-[0.7rem] text-[#E8ECF0] font-bold" style={{ fontFamily: "Orbitron, sans-serif" }}>ORACLE SCORE</span>
                      {myVoterStats.oracleQualified ? (
                        <span className="ml-auto px-2 py-0.5 rounded text-[0.55rem] font-bold" style={{
                          background: myVoterStats.oracleTier === "OMNISCIENT" ? "#f59e0b10" : myVoterStats.oracleTier === "ORACLE" ? "#D4A84310" : myVoterStats.oracleTier === "PROPHET" ? "#10b98110" : myVoterStats.oracleTier === "SEER" ? "#6AA3E010" : "#8B5CF610",
                          border: `1px solid ${myVoterStats.oracleTier === "OMNISCIENT" ? "#f59e0b30" : myVoterStats.oracleTier === "ORACLE" ? "#D4A84330" : myVoterStats.oracleTier === "PROPHET" ? "#10b98130" : myVoterStats.oracleTier === "SEER" ? "#6AA3E030" : "#8B5CF630"}`,
                          color: myVoterStats.oracleTier === "OMNISCIENT" ? "#f59e0b" : myVoterStats.oracleTier === "ORACLE" ? "#D4A843" : myVoterStats.oracleTier === "PROPHET" ? "#10b981" : myVoterStats.oracleTier === "SEER" ? "#6AA3E0" : "#8B5CF6",
                          fontFamily: "Orbitron, sans-serif",
                        }}>
                          {myVoterStats.oracleTier}
                        </span>
                      ) : (
                        <span className="ml-auto text-[0.55rem] text-[#8494A7]">
                          {Math.max(0, 3 - myVoterStats.decidedBattles)} more decided battle{Math.max(0, 3 - myVoterStats.decidedBattles) !== 1 ? "s" : ""} to qualify
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="bg-[#0B1120] rounded-lg p-2 text-center">
                        <p className="text-[#D4A843] text-lg" style={{ fontFamily: "Orbitron, sans-serif" }}>{myVoterStats.oracleScore}</p>
                        <p className="text-[0.5rem] text-[#8494A7]">Score</p>
                      </div>
                      <div className="bg-[#0B1120] rounded-lg p-2 text-center">
                        <p className={`text-lg ${myVoterStats.accuracy >= 70 ? "text-[#10b981]" : myVoterStats.accuracy >= 40 ? "text-[#f59e0b]" : "text-red-400"}`} style={{ fontFamily: "Orbitron, sans-serif" }}>
                          {myVoterStats.accuracy}%
                        </p>
                        <p className="text-[0.5rem] text-[#8494A7]">{myVoterStats.correctPicks}/{myVoterStats.decidedBattles}</p>
                      </div>
                      <div className="bg-[#0B1120] rounded-lg p-2 text-center">
                        <p className="flex items-center justify-center gap-0.5">
                          {myVoterStats.currentStreak > 0 && <Flame className="w-3.5 h-3.5 text-[#f59e0b]" />}
                          <span className={`text-lg ${myVoterStats.currentStreak >= 3 ? "text-[#f59e0b]" : "text-[#8494A7]"}`} style={{ fontFamily: "Orbitron, sans-serif" }}>
                            {myVoterStats.currentStreak}
                          </span>
                        </p>
                        <p className="text-[0.5rem] text-[#8494A7]">Streak</p>
                      </div>
                      <div className="bg-[#0B1120] rounded-lg p-2 text-center">
                        <p className="text-[#8494A7] text-lg" style={{ fontFamily: "Orbitron, sans-serif" }}>{myVoterStats.longestStreak}</p>
                        <p className="text-[0.5rem] text-[#8494A7]">Best Streak</p>
                      </div>
                    </div>
                  </div>

                  {/* Weighted power + staked */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#4274B9]/10 text-xs text-[#8494A7]">
                    <span>Total weighted power: <span className="text-[#4274B9] font-mono">{formatNumber(myVoterStats.totalWeightedPower)}</span></span>
                    <span>Total staked: <span className="text-[#D4A843] font-mono">{formatNumber(myVoterStats.totalStaked)}</span> BOTB</span>
                  </div>
                </div>
              ) : (
                <div className="bg-[#111827] border border-[#4274B9]/10 rounded-2xl p-6 text-center">
                  <Target className="w-8 h-8 text-[#4274B9]/20 mx-auto mb-3" />
                  <h3 className="text-[#E8ECF0] font-bold mb-2" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.8rem" }}>
                    NO VOTING HISTORY YET
                  </h3>
                  <p className="text-[#8494A7] text-sm max-w-md mx-auto">
                    Cast your first vote on a battle or governance proposal to start building your voter profile. Your Hedera wallet is verified and ready.
                  </p>
                  <div className="flex items-center justify-center gap-2 mt-3 text-xs text-[#8494A7]">
                    <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                    <span>Wallet connected &middot; Hedera mainnet</span>
                  </div>
                </div>
              )}
            </div>
          )
        )}

        {/* Scoring methodology footer */}
        <div className="mt-8 p-4 rounded-xl bg-[#111827] border border-[#4274B9]/10">
          <h4 className="text-[#8494A7] text-xs mb-2 flex items-center gap-2" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.6rem" }}>
            <Award className="w-3 h-3" /> RANKING METHODOLOGY
          </h4>
          <div className="grid sm:grid-cols-3 gap-3 text-[0.6rem] text-[#8494A7]">
            <div>
              <p className="text-[#6AA3E0] mb-1" style={{ fontFamily: "Orbitron, sans-serif" }}>ATHLETE SCORE</p>
              <p>(Wins x 10) + (Win Rate x 20) + (Power Rating x 2) + (Streak x 3) + (Fan Votes x 0.5)</p>
            </div>
            <div>
              <p className="text-[#6AA3E0] mb-1" style={{ fontFamily: "Orbitron, sans-serif" }}>VOTER SCORE</p>
              <p>Weighted Power + (Accuracy x Votes x 0.1) + (Rewards x 0.01) + (Governance Votes x 2)</p>
            </div>
            <div>
              <p className="text-[#D4A843] mb-1" style={{ fontFamily: "Orbitron, sans-serif" }}>ORACLE SCORE</p>
              <p>(Correct Picks x 10) + (Accuracy x Decided Battles x 0.5) + (Longest Streak x 5) + (Current Streak x 3). Min 3 decided battles to qualify.</p>
            </div>
          </div>
          <p className="text-[0.55rem] text-[#8494A7]/60 mt-2">
            Rankings are computed server-side from on-chain verified vote records. Governor NFT holders receive 2x voting power; Sigma NFT holders receive 1.5x. Oracle accuracy is calculated only from battles with declared winners. All data is sourced from the Hedera mainnet mirror node.
          </p>
        </div>
      </div>
    </div>
  );
}