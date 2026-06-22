/**
 * Cali Dashboard — the post-eligibility landing screen.
 *
 * Shows the user their level (editable inline), equipment, current streak,
 * PR count (tap → full PR list), recent workout history, and a primary
 * "Generate today's workout" CTA.
 *
 * Backend dependencies:
 *   GET  /cali/profile        (lazy-create on first read)
 *   GET  /cali/streak
 *   GET  /cali/prs
 *   GET  /cali/history
 *   POST /cali/workout/generate
 */

import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router";
import { motion } from "motion/react";
import {
  Dumbbell, Flame, Trophy, Settings2, RefreshCw, Loader2, AlertCircle,
  ChevronRight, Calendar, Crown, Lock,
} from "lucide-react";
import { useWallet } from "../wallet-context";
import { CaliLoader } from "./cali-loader";
import { api } from "../../lib/api";
import { useCaliSession } from "./cali-context";
import { LevelPicker } from "./cali-level-picker";
import { CaliAthleteTierCard } from "./cali-athlete-tier-card";
import { CaliMetricTile } from "./cali-metric-tile";
import { CaliStatsSparkline } from "./cali-stats-sparkline";
import type { StatsSummary, StatsSparkPoint } from "../../lib/cali-analytics-types";

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

interface Profile {
  level: 1 | 2 | 3;
  equipment: string[];
  displayName: string;
}
interface Streak {
  current: number;
  longest: number;
  lastDate: string;
}
interface PR {
  exerciseId: string;
  name: string;
  category: string;
  metric: "reps" | "time_sec";
  value: number;
  achievedAt: number;
}
interface HistoryItem {
  workoutId: string;
  dateKey: string;
  completedAt: string | null;
  totalSets: number;
  uniqueExercises: number;
  topVolumeSet: { exerciseId: string; metric: "reps" | "time_sec"; value: number } | null;
  updatedAt: number;
}

export function CaliDashboard() {
  const cali = useCaliSession();
  const wallet = useWallet();
  const navigate = useNavigate();
  const [eliteAllowed, setEliteAllowed] = useState<boolean | null>(null);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [prs, setPrs] = useState<PR[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingLevel, setSavingLevel] = useState(false);
  const [statsSummary, setStatsSummary] = useState<StatsSummary | null>(null);
  const [statsSparkline, setStatsSparkline] = useState<StatsSparkPoint[]>([]);

  // ── Initial load ───────────────────────────────────────────────────────
  const loadAll = useCallback(async (opts?: { silent?: boolean }) => {
    if (!cali.sessionToken) return;
    if (!opts?.silent) setLoading(true);
    setError(null);
    const token = cali.sessionToken;
    const [p, s, r, h, st] = await Promise.all([
      api.cali.getProfile(token),
      api.cali.streak(token),
      api.cali.prs(token),
      api.cali.history(token, { limit: 10 }),
      api.cali.stats(token, "7d"),
    ]);
    if (p.success && p.data) setProfile(p.data.profile);
    if (s.success && s.data) setStreak(s.data.streak);
    if (r.success && r.data) setPrs(r.data.prs);
    if (h.success && h.data) {
      setHistory(h.data.items);
      setHistoryTotal(h.data.total);
    }
    if (st.success && st.data) {
      setStatsSummary(st.data.summary);
      setStatsSparkline(st.data.sparkline);
    }
    if (!p.success) {
      cali.handleAuthError(p.code);
      setError(p.error || "Failed to load profile.");
    }
    setLoading(false);
  }, [cali.sessionToken, cali.handleAuthError]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    const wid = wallet.accountId || cali.accountId;
    if (!wid) { setEliteAllowed(false); return; }
    if (wallet.hasGovernorNFT) { setEliteAllowed(true); return; }
    api.elite.accessCheck(wid).then((res) => {
      setEliteAllowed(res.success && res.data?.allowed === true);
    }).catch(() => setEliteAllowed(false));
  }, [wallet.accountId, wallet.hasGovernorNFT, cali.accountId]);

  // ── Level change ───────────────────────────────────────────────────────
  const onLevelChange = async (level: 1 | 2 | 3) => {
    if (!cali.sessionToken || !profile) return;
    setSavingLevel(true);
    const prev = profile.level;
    setProfile({ ...profile, level }); // optimistic
    const res = await api.cali.updateProfile(cali.sessionToken, { level });
    if (!res.success) {
      setProfile({ ...profile, level: prev });
      cali.handleAuthError(res.code);
      setError(res.error || "Couldn't update level.");
    } else if (res.data) {
      setProfile(res.data.profile);
    }
    setSavingLevel(false);
  };

  // ── Generate workout ───────────────────────────────────────────────────
  const onGenerate = async () => {
    if (!cali.sessionToken || !profile) return;
    setGenerating(true);
    setError(null);
    const res = await api.cali.generate(cali.sessionToken);
    setGenerating(false);
    if (!res.success || !res.data) {
      cali.handleAuthError(res.code);
      setError(res.error || "Couldn't generate workout.");
      return;
    }
    navigate(`/calisthenics/workout/${encodeURIComponent(res.data.workout.workoutId)}`);
  };

  if (loading) {
    return <CaliLoader variant="dashboard" />;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[0.65rem] font-bold tracking-widest text-[#6AA3E0]" style={orbitron}>
            WCO CALISTHENICS
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-white" style={orbitron}>
            Today's Session
          </h1>
          <p className="text-xs text-[#8494A7] mt-1" style={dmSans}>
            {cali.accountId} · {((cali.eligibility?.tinybars ?? 0) / 1e8).toFixed(4)} ℏ
          </p>
        </div>
        <button
          onClick={() => loadAll({ silent: true })}
          className="w-9 h-9 rounded-lg flex items-center justify-center text-[#8494A7] hover:text-white bg-white/[0.02] border border-[#4274B9]/15"
          aria-label="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-500/8 border border-red-500/20">
          <AlertCircle className="w-4 h-4 mt-0.5 text-red-300" />
          <p className="text-xs text-red-200" style={dmSans}>{error}</p>
        </div>
      )}

      {/* Athlete analytics */}
      <CaliAthleteTierCard summary={statsSummary} loading={loading} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <CaliMetricTile
          label="CONSISTENCY"
          value={statsSummary ? `${statsSummary.consistency}` : "—"}
          delta={statsSummary?.deltas.consistency7d ?? 0}
          accent="#F97316"
          sparkData={statsSparkline.map((p) => p.athleteScore)}
          onClick={() => navigate("/calisthenics/analytics")}
        />
        <CaliMetricTile
          label="EFFORT"
          value={statsSummary ? `${statsSummary.effort}` : "—"}
          delta={statsSummary?.deltas.effort7d ?? 0}
          accent="#6AA3E0"
          onClick={() => navigate("/calisthenics/analytics")}
        />
        <CaliMetricTile
          label="HYPERTROPHY"
          value={statsSummary ? `${statsSummary.hypertrophyPct}%` : "—"}
          delta={statsSummary?.deltas.hypertrophy7d ?? 0}
          deltaSuffix="%"
          accent="#10b981"
          sparkData={statsSparkline.map((p) => p.volume)}
          onClick={() => navigate("/calisthenics/analytics")}
        />
        <CaliMetricTile
          label="MOVEMENT"
          value={statsSummary ? `${statsSummary.movementIndex}` : "—"}
          delta={statsSummary?.deltas.movement7d ?? 0}
          accent="#D4A843"
          sparkData={statsSparkline.map((p) => p.movementIndex)}
          onClick={() => navigate("/calisthenics/analytics")}
        />
      </div>

      {statsSparkline.length > 1 && (
        <div
          className="rounded-2xl border p-4"
          style={{ background: "rgba(11,17,32,0.6)", borderColor: "rgba(66,116,185,0.15)" }}
        >
          <p className="text-[0.6rem] font-bold tracking-widest text-[#8494A7] mb-2" style={orbitron}>
            7D ATHLETE INDEX
          </p>
          <div className="h-20">
            <CaliStatsSparkline
              data={statsSparkline.map((p) => p.athleteScore)}
              color="#4274B9"
              height={80}
            />
          </div>
        </div>
      )}

      {/* Streak + PR strip */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Flame className="w-5 h-5" />}
          label="Streak"
          value={streak ? `${streak.current}` : "0"}
          sub={streak && streak.longest > 0 ? `Best: ${streak.longest}` : "Complete a workout to start"}
          accent="#F97316"
        />
        <StatCard
          icon={<Trophy className="w-5 h-5" />}
          label="PRs"
          value={`${statsSummary?.prCount ?? prs.length}`}
          sub={prs.length > 0 ? `Latest: ${prs[0].name}` : "Log a set to set your first"}
          accent="#D4A843"
          onClick={() => navigate("/calisthenics/prs")}
        />
      </div>

      {/* Level picker */}
      {profile && (
        <div
          className="rounded-2xl border p-4 sm:p-5"
          style={{
            background: "linear-gradient(160deg, rgba(66,116,185,0.05), rgba(11,17,32,0.85))",
            borderColor: "rgba(66,116,185,0.15)",
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold tracking-widest text-[#E8ECF0]" style={orbitron}>
              CHOOSE YOUR LEVEL
            </h2>
            {savingLevel && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#8494A7]" />}
          </div>
          <LevelPicker value={profile.level} onChange={onLevelChange} disabled={savingLevel} />
        </div>
      )}

      {/* Pro Tech Vault — above generate; locked overlay when unqualified */}
      <EliteVaultCard allowed={eliteAllowed} walletConnected={wallet.connected} />

      {/* Primary CTA */}
      <button
        onClick={onGenerate}
        disabled={generating || !profile}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl text-base font-bold transition-all hover:brightness-110 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          ...dmSans,
          background: "linear-gradient(135deg, #4274B9, #3563A0)",
          color: "#fff",
          boxShadow: "0 6px 24px rgba(66,116,185,0.35)",
        }}
      >
        {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Dumbbell className="w-5 h-5" />}
        {generating ? "Building workout…" : "Generate today's workout"}
      </button>

      {/* Workout history */}
      <div
        className="rounded-2xl border p-4 sm:p-5"
        style={{
          background: "rgba(11,17,32,0.6)",
          borderColor: "rgba(66,116,185,0.15)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold tracking-widest text-[#E8ECF0]" style={orbitron}>
            WORKOUT HISTORY
          </h2>
          {historyTotal > 0 && (
            <span className="text-[0.6rem] text-[#8494A7]" style={dmSans}>
              {historyTotal} total
            </span>
          )}
        </div>

        {history.length === 0 ? (
          <div className="py-6 text-center">
            <Calendar className="w-5 h-5 text-[#8494A7] mx-auto mb-2" />
            <p className="text-xs text-[#8494A7]" style={dmSans}>
              No workouts yet. Generate one above to start your log.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {history.map((it) => (
              <li key={`${it.dateKey}-${it.workoutId}`}>
                <Link
                  to={`/calisthenics/workout/${encodeURIComponent(it.workoutId)}`}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[#4274B9]/12 bg-white/[0.02] hover:border-[#4274B9]/30 hover:bg-white/[0.04] transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white" style={dmSans}>{it.dateKey}</span>
                      {it.completedAt && (
                        <span className="px-1.5 py-0.5 text-[0.55rem] rounded bg-[#10b981]/12 text-[#10b981] font-bold" style={orbitron}>
                          COMPLETED
                        </span>
                      )}
                    </div>
                    <p className="text-[0.65rem] text-[#8494A7] mt-0.5" style={dmSans}>
                      {it.totalSets} sets · {it.uniqueExercises} exercises
                      {it.topVolumeSet && (
                        <> · top {it.topVolumeSet.value}{it.topVolumeSet.metric === "reps" ? " reps" : "s"}</>
                      )}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#8494A7] flex-shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}

        {historyTotal > history.length && (
          <div className="text-center pt-3 mt-1 border-t border-[#4274B9]/10">
            <Link
              to="/calisthenics/history"
              className="text-xs text-[#6AA3E0] hover:underline"
              style={dmSans}
            >
              View all {historyTotal} workouts →
            </Link>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end text-xs text-[#8494A7] pt-2" style={dmSans}>
        <button
          className="flex items-center gap-1.5 hover:text-[#E8ECF0]"
          onClick={cali.signOut}
        >
          <Settings2 className="w-3.5 h-3.5" />
          Sign out
        </button>
      </div>
    </div>
  );
}

function EliteVaultCard({
  allowed,
  walletConnected,
}: {
  allowed: boolean | null;
  walletConnected: boolean;
}) {
  const unlocked = allowed === true;
  const checking = allowed === null;

  const inner = (
    <div
      className="relative rounded-2xl overflow-hidden border p-5 sm:p-6"
      style={{
        background: unlocked
          ? "linear-gradient(135deg, rgba(212,168,67,0.14), rgba(11,17,32,0.78))"
          : "linear-gradient(135deg, rgba(212,168,67,0.06), rgba(11,17,32,0.85))",
        borderColor: unlocked ? "rgba(212,168,67,0.45)" : "rgba(212,168,67,0.2)",
        boxShadow: unlocked
          ? "0 0 32px rgba(212,168,67,0.22), inset 0 1px 0 rgba(255,248,220,0.12)"
          : "0 0 16px rgba(212,168,67,0.08)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-center gap-4">
        <div
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: unlocked
              ? "linear-gradient(135deg, #D4A843, #B8860B)"
              : "linear-gradient(135deg, rgba(212,168,67,0.25), rgba(11,17,32,0.6))",
            boxShadow: unlocked ? "0 0 20px rgba(212,168,67,0.4)" : undefined,
          }}
        >
          <Crown className={`w-7 h-7 sm:w-8 sm:h-8 ${unlocked ? "text-[#0B1120]" : "text-[#D4A843]/70"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold tracking-widest text-[#D4A843]" style={orbitron}>PRO TECH VAULT</p>
          <p className="text-base sm:text-lg text-white font-bold mt-0.5" style={dmSans}>
            Battle of the Bars Elite Training
          </p>
          <p className="text-[0.7rem] text-[#8494A7] mt-1" style={dmSans}>
            45 vault techniques · 60–120 min skill sessions
          </p>
        </div>
        {unlocked && <ChevronRight className="w-6 h-6 text-[#D4A843] shrink-0" />}
      </div>

      {!unlocked && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-2xl"
          style={{
            background: "rgba(11,17,32,0.72)",
            backdropFilter: "blur(3px)",
          }}
        >
          {checking ? (
            <Loader2 className="w-8 h-8 text-[#D4A843] animate-spin" />
          ) : (
            <>
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center border-2 border-[#D4A843]/50"
                style={{ boxShadow: "0 0 24px rgba(212,168,67,0.25)" }}
              >
                <Lock className="w-7 h-7 text-[#D4A843]" />
              </div>
              <p className="text-sm font-bold tracking-widest text-[#F0D078]" style={orbitron}>LOCKED</p>
              <p className="text-[0.65rem] text-[#A3B0C2] text-center max-w-[260px] px-4" style={dmSans}>
                {walletConnected
                  ? "WCO Governors NFT or elite athlete whitelist required to unlock"
                  : "Connect wallet — Governors NFT or elite athlete access unlocks the vault"}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );

  if (unlocked) {
    return (
      <motion.div whileHover={{ scale: 1.015 }} transition={{ type: "spring", stiffness: 380, damping: 26 }}>
        <Link to="/calisthenics/elite" className="block outline-none focus-visible:ring-2 focus-visible:ring-[#D4A843]/60 rounded-2xl">
          {inner}
        </Link>
      </motion.div>
    );
  }

  return inner;
}

function StatCard({
  icon, label, value, sub, accent, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  accent: string;
  onClick?: () => void;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={`rounded-2xl border p-4 text-left w-full min-h-[88px] ${
        onClick ? "cursor-pointer hover:border-[#4274B9]/35 hover:bg-white/[0.03] transition-colors" : ""
      }`}
      style={{
        background: "rgba(11,17,32,0.6)",
        borderColor: "rgba(66,116,185,0.15)",
      }}
    >
      <div className="flex items-center gap-2 mb-1.5" style={{ color: accent }}>
        {icon}
        <span className="text-[0.65rem] font-bold tracking-widest" style={orbitron}>
          {label}
        </span>
        {onClick && <ChevronRight className="w-3 h-3 ml-auto opacity-50" />}
      </div>
      <p className="text-2xl font-bold text-white leading-none" style={orbitron}>
        {value}
      </p>
      <p className="text-[0.65rem] text-[#8494A7] mt-1.5 truncate" style={dmSans}>
        {sub}
      </p>
    </Tag>
  );
}
