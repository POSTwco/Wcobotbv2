/**
 * Athlete Portfolio — personal growth analytics (crypto-portfolio UX).
 * Heatmap: CaliProgressionHeatmap is frozen — wrapper only.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import {
  ArrowLeft, Flame, Shield, Trophy, TrendingUp, TrendingDown, Activity, Info, X,
} from "lucide-react";
import { api } from "../../lib/api";
import { useCaliSession } from "./cali-context";
import { CaliLoader } from "./cali-loader";
import { CaliMetricTile } from "./cali-metric-tile";
import { CaliMovementChart } from "./cali-movement-chart";
import {
  ATHLETE_TIER_CONFIG,
  deltaColor,
  formatDelta,
  formatDeltaCompact,
  type HeatmapDayPoint,
  type MetricSparklines,
  type MovementStat,
  type StatsRange,
  type StatsSparkPoint,
  type StatsSummary,
} from "../../lib/cali-analytics-types";
import { CaliStatsSparkline } from "./cali-stats-sparkline";
import { CaliGlassPanel } from "./cali-glass-panel";
import { CaliProgressionHeatmap } from "./cali-progression-heatmap";
import { CaliPRHistoryModal } from "./cali-pr-history-modal";
import { CaliHintWrap } from "./cali-hint-wrap";

const GUIDE_KEY = "wco_portfolio_guide_v1";

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const RANGES: StatsRange[] = ["7d", "30d", "90d"];

const EMPTY_SPARKLINES: MetricSparklines = {
  consistency: [],
  effort: [],
  movement: [],
  volume: [],
  hypertrophy: [],
};

function windowDays(range: StatsRange): number {
  return range === "7d" ? 7 : range === "30d" ? 30 : 90;
}

const EMPTY_SPARKLINES_BY_RANGE: Record<StatsRange, StatsSparkPoint[]> = {
  "7d": [],
  "30d": [],
  "90d": [],
};

const EMPTY_METRIC_SPARKLINES_BY_RANGE: Record<StatsRange, MetricSparklines> = {
  "7d": EMPTY_SPARKLINES,
  "30d": EMPTY_SPARKLINES,
  "90d": EMPTY_SPARKLINES,
};

type IndexTab = "movement" | "athlete";

function formatUpdated(ts: number | undefined): string {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function CaliAnalytics() {
  const cali = useCaliSession();
  const [range, setRange] = useState<StatsRange>("7d");
  const [indexTab, setIndexTab] = useState<IndexTab>("movement");
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [sparklinesByRange, setSparklinesByRange] = useState(EMPTY_SPARKLINES_BY_RANGE);
  const [metricSparklinesByRange, setMetricSparklinesByRange] = useState(EMPTY_METRIC_SPARKLINES_BY_RANGE);
  const [fullHeatmapDays, setFullHeatmapDays] = useState<HeatmapDayPoint[]>([]);
  const [movements, setMovements] = useState<MovementStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [movError, setMovError] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  /** One-time mobile tip — dismissed for vets via localStorage */
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && !localStorage.getItem(GUIDE_KEY)) {
        setShowGuide(true);
      }
    } catch {
      /* private mode */
    }
  }, []);

  const dismissGuide = useCallback(() => {
    setShowGuide(false);
    try {
      localStorage.setItem(GUIDE_KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const days = windowDays(range);
  const sparkline = sparklinesByRange[range] ?? [];
  const heatmapDays = useMemo(
    () => (fullHeatmapDays.length > days ? fullHeatmapDays.slice(-days) : fullHeatmapDays),
    [fullHeatmapDays, days],
  );
  const metricSparklines = metricSparklinesByRange[range] ?? EMPTY_SPARKLINES;

  const load = useCallback(async () => {
    if (!cali.sessionToken) return;
    setLoading(true);
    setError(null);
    setMovError(null);
    const token = cali.sessionToken;
    const [st, mov] = await Promise.all([
      api.cali.stats(token, "90d"),
      api.cali.movementStats(token, 12),
    ]);
    if (st.success && st.data) {
      setSummary(st.data.summary);
      setSparklinesByRange(st.data.sparklinesByRange ?? {
        "7d": st.data.sparkline ?? [],
        "30d": st.data.sparkline ?? [],
        "90d": st.data.sparkline ?? [],
      });
      setMetricSparklinesByRange(st.data.metricSparklinesByRange ?? {
        "7d": st.data.metricSparklines ?? EMPTY_SPARKLINES,
        "30d": st.data.metricSparklines ?? EMPTY_SPARKLINES,
        "90d": st.data.metricSparklines ?? EMPTY_SPARKLINES,
      });
      setFullHeatmapDays(st.data.heatmapDays ?? []);
    } else {
      cali.handleAuthError(st.code);
      setError(st.error || "Couldn't load analytics.");
    }
    if (mov.success && mov.data) {
      setMovements(mov.data.movements);
    } else {
      setMovError(mov.error || "Couldn't load movement stats.");
    }
    setLoading(false);
  }, [cali.sessionToken, cali.handleAuthError]);

  useEffect(() => { load(); }, [load]);

  if (loading && !summary) return <CaliLoader variant="dashboard" />;

  const tierCfg = summary
    ? (ATHLETE_TIER_CONFIG[summary.athleteTier] ?? ATHLETE_TIER_CONFIG.UNRANKED)
    : ATHLETE_TIER_CONFIG.UNRANKED;
  const pnl = summary?.deltas.movement7d ?? 0;
  const scorePct = summary ? Math.min(100, Math.max(0, summary.athleteScore)) : 0;
  const sessions7 = summary?.sessions7d ?? 0;
  const workouts30 = summary?.completedWorkouts30d ?? 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-4 sm:space-y-5">
      {/* Header + range */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/calisthenics"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[#8494A7] hover:text-white bg-white/[0.04] border border-[#4274B9]/20 backdrop-blur-md shrink-0"
            aria-label="Back to calisthenics"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <CaliHintWrap
            title="Athlete Portfolio"
            hint="Your live growth book from logged sets — score, holdings, activity, and PR positions. All numbers come from your wallet-linked workouts (no mock data)."
            side="bottom"
          >
            <div className="min-w-0">
              <p className="text-[0.6rem] font-bold tracking-[0.2em] text-[#D4A843]" style={orbitron}>
                GROWTH PORTFOLIO
              </p>
              <h1 className="text-lg sm:text-xl font-bold text-white truncate" style={orbitron}>
                Athlete Portfolio
              </h1>
            </div>
          </CaliHintWrap>
        </div>

        <CaliHintWrap
          title="Chart window"
          hint={`Charts and activity use the selected window (${range.toUpperCase()}). Holdings deltas are 7-day changes. Summary rollups still use your real 30-day training history where noted.`}
          side="bottom"
        >
          <div
            className="flex rounded-xl p-0.5 border border-[#4274B9]/20 bg-black/30"
            role="group"
            aria-label="Time range"
          >
            {RANGES.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRange(r)}
                className={`min-h-[36px] px-3 sm:px-3.5 rounded-lg text-[0.6rem] font-bold tracking-wider transition-colors ${
                  range === r ? "text-white" : "text-[#8494A7] hover:text-white"
                }`}
                style={{
                  ...orbitron,
                  background: range === r ? "rgba(66,116,185,0.35)" : "transparent",
                  boxShadow: range === r ? "0 0 12px rgba(66,116,185,0.25)" : undefined,
                }}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>
        </CaliHintWrap>
      </div>

      {/* First-time mobile tip — dismiss once, never nag vets */}
      {showGuide && (
        <div className="flex items-start gap-2 rounded-xl border border-[#D4A843]/25 bg-[#D4A843]/8 px-3 py-2.5 sm:hidden">
          <Info className="w-4 h-4 text-[#D4A843] shrink-0 mt-0.5" />
          <p className="text-[0.7rem] text-[#E8ECF0] leading-snug flex-1" style={dmSans}>
            Tap the gold <span className="text-[#D4A843] font-semibold">ℹ</span> on any block for a short definition — values are always your real logs.
          </p>
          <button
            type="button"
            onClick={dismissGuide}
            className="p-1 rounded-md text-[#8494A7] hover:text-white shrink-0"
            aria-label="Dismiss tip"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-300 px-3 py-2 rounded-lg bg-red-500/8 border border-red-500/20" style={dmSans}>
          {error}
        </p>
      )}

      {/* Portfolio hero */}
      {summary && (
        <CaliHintWrap
          block
          side="bottom"
          title="Athlete Index"
          hint={`Your composite score is ${summary.athleteScore}/100 (${tierCfg.label}). 7-day change: ${formatDelta(pnl, " pts")}. Built from real consistency, effort, hypertrophy, and movement — last computed ${formatUpdated(summary.lastComputedAt)}. Sessions this week: ${sessions7}.`}
        >
          <CaliGlassPanel accent={tierCfg.color} glow pulseKey={summary.lastComputedAt} className="px-4 py-3.5 sm:px-5 w-full">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="relative w-14 h-14 sm:w-16 sm:h-16 shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5" />
                  <motion.circle
                    cx="18" cy="18" r="15.5" fill="none"
                    stroke={tierCfg.color}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeDasharray={`${scorePct} 100`}
                    initial={{ strokeDasharray: "0 100" }}
                    animate={{ strokeDasharray: `${scorePct} 100` }}
                    transition={{ duration: 0.9, ease: "easeOut" }}
                    style={{ filter: `drop-shadow(0 0 6px ${tierCfg.color}66)` }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[0.65rem] font-bold text-white" style={orbitron}>{summary.athleteScore}</span>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className="text-[0.55rem] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      ...orbitron,
                      background: tierCfg.bg,
                      border: `1px solid ${tierCfg.border}`,
                      color: tierCfg.color,
                    }}
                  >
                    {tierCfg.label}
                  </span>
                  <span className="text-[0.55rem] text-[#8494A7] tracking-wider" style={orbitron}>
                    INDEX / 100
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-1 flex-wrap">
                  <motion.span
                    key={summary.athleteScore}
                    initial={{ opacity: 0.7, y: 2 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-2xl sm:text-3xl font-bold text-white leading-none"
                    style={{ ...orbitron, textShadow: `0 0 20px ${tierCfg.color}40` }}
                  >
                    {summary.athleteScore}
                  </motion.span>
                  <span
                    className="inline-flex items-center gap-0.5 text-sm font-bold"
                    style={{ color: deltaColor(pnl), ...orbitron }}
                  >
                    {pnl > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : pnl < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : null}
                    {formatDelta(pnl, " pts")}
                    <span className="text-[0.55rem] font-normal text-[#8494A7] ml-0.5">7d</span>
                  </span>
                </div>
                <p className="text-[0.6rem] text-[#8494A7] mt-1" style={dmSans}>
                  Updated {formatUpdated(summary.lastComputedAt)}
                </p>
              </div>
            </div>
          </CaliGlassPanel>
        </CaliHintWrap>
      )}

      {/* Compact index chart — single panel, tabbed */}
      <CaliGlassPanel accent={indexTab === "movement" ? "#D4A843" : "#4274B9"} className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-lg p-0.5 border border-white/10 bg-black/20">
              {(
                [
                  { id: "movement" as const, label: "MOVEMENT", color: "#D4A843" },
                  { id: "athlete" as const, label: "ATHLETE", color: "#4274B9" },
                ]
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setIndexTab(t.id)}
                  className={`min-h-[32px] px-2.5 rounded-md text-[0.55rem] font-bold tracking-wider transition-colors ${
                    indexTab === t.id ? "text-white" : "text-[#8494A7] hover:text-white"
                  }`}
                  style={{
                    ...orbitron,
                    background: indexTab === t.id ? `${t.color}33` : "transparent",
                    border: indexTab === t.id ? `1px solid ${t.color}55` : "1px solid transparent",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <CaliHintWrap
              title={indexTab === "movement" ? "Movement Index" : "Athlete Index"}
              hint={
                indexTab === "movement"
                  ? `Daily movement quality from your logged volume and training density over ${range.toUpperCase()}. Candle/line toggles are views only — data is your real sparkline history (${sparkline.length} points).`
                  : `Athlete Index trend over ${range.toUpperCase()} — same composite score as the hero ring (${summary?.athleteScore ?? "—"}/100). Green/red reflects day-to-day change in your logs.`
              }
              side="bottom"
            >
              <span className="text-[0.5rem] text-[#D4A843]/80 font-bold tracking-wider hidden sm:inline" style={orbitron}>
                ?
              </span>
            </CaliHintWrap>
          </div>
          <span className="text-[0.55rem] text-[#8494A7] tracking-wider" style={orbitron}>
            {range.toUpperCase()}
          </span>
        </div>
        {indexTab === "movement" ? (
          <CaliMovementChart
            data={sparkline}
            metric="movementIndex"
            label="Movement Index"
            color="#D4A843"
            height={148}
          />
        ) : sparkline.length > 1 ? (
          <CaliMovementChart
            data={sparkline}
            metric="athleteScore"
            label="Athlete Index"
            color="#4274B9"
            height={148}
          />
        ) : (
          <p className="text-xs text-[#8494A7] text-center py-8" style={dmSans}>
            Log more sessions for athlete index.
          </p>
        )}
      </CaliGlassPanel>

      {/* Holdings */}
      <div>
        <CaliHintWrap
          title="Holdings"
          hint="Four pillars of your portfolio from live rollups. Sparklines are your recent history. Hover or tap each tile for the definition + your current number."
          side="bottom"
        >
          <p className="text-[0.55rem] font-bold tracking-[0.18em] text-[#8494A7] mb-2 px-0.5" style={orbitron}>
            HOLDINGS
          </p>
        </CaliHintWrap>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
          <CaliMetricTile
            label="CONSISTENCY"
            value={summary ? `${summary.consistency}` : "—"}
            delta={summary?.deltas.consistency7d ?? 0}
            accent="#F97316"
            sparkData={metricSparklines.consistency}
            hintTitle="Consistency"
            hint={`How reliably you complete planned work. You: ${summary?.consistency ?? "—"} · 7d Δ ${formatDelta(summary?.deltas.consistency7d ?? 0)}. ${workouts30} completed workouts in the last 30 days.`}
          />
          <CaliMetricTile
            label="EFFORT"
            value={summary ? `${summary.effort}` : "—"}
            delta={summary?.deltas.effort7d ?? 0}
            accent="#6AA3E0"
            sparkData={metricSparklines.effort}
            hintTitle="Effort"
            hint={`Training stimulus from logged intensity and volume. You: ${summary?.effort ?? "—"} · 7d Δ ${formatDelta(summary?.deltas.effort7d ?? 0)}. Log Intensity 1–10 on sets for accuracy.`}
          />
          <CaliMetricTile
            label="HYPERTROPHY"
            value={summary ? `${summary.hypertrophyPct}%` : "—"}
            delta={summary?.deltas.hypertrophy7d ?? 0}
            deltaSuffix="%"
            accent="#10b981"
            sparkData={metricSparklines.hypertrophy}
            hintTitle="Hypertrophy"
            hint={`Stimulus score from max intensity (10), failure notes, and reps above prescription. You: ${summary?.hypertrophyPct ?? 0}% · 7d Δ ${formatDelta(summary?.deltas.hypertrophy7d ?? 0, "%")}. Sets without intensity score 0.`}
          />
          <CaliMetricTile
            label="MOVEMENT"
            value={summary ? `${summary.movementIndex}` : "—"}
            delta={summary?.deltas.movement7d ?? 0}
            accent="#D4A843"
            sparkData={metricSparklines.movement}
            hintTitle="Movement"
            hint={`Movement quality index from your pattern balance and volume. You: ${summary?.movementIndex ?? "—"} · 7d Δ ${formatDelta(summary?.deltas.movement7d ?? 0)}. Same family as the Movement chart tab.`}
          />
        </div>
      </div>

      {/* Compact secondary row */}
      {summary && (
        <div className={`grid gap-2 ${(summary.eliteSessions30d ?? 0) > 0 ? "grid-cols-3" : "grid-cols-2"}`}>
          <CaliHintWrap
            block
            title="Streak"
            hint={`Consecutive training days. Current streak: ${summary.streakCurrent}. Personal best: ${summary.streakLongest}. Built from real completion timestamps.`}
          >
            <CaliGlassPanel accent="#F97316" glow className="px-3 py-2.5 flex items-center gap-2.5 w-full">
              <Flame className="w-4 h-4 text-[#F97316] shrink-0" style={{ filter: "drop-shadow(0 0 6px #F9731666)" }} />
              <div className="min-w-0">
                <p className="text-[0.5rem] text-[#8494A7] tracking-widest" style={orbitron}>STREAK</p>
                <p className="text-base font-bold text-white leading-tight" style={orbitron}>{summary.streakCurrent}</p>
                <p className="text-[0.55rem] text-[#8494A7] truncate" style={dmSans}>Best {summary.streakLongest}</p>
              </div>
            </CaliGlassPanel>
          </CaliHintWrap>
          <CaliHintWrap
            block
            title="Personal records"
            hint={`You have ${summary.prCount} PR${summary.prCount === 1 ? "" : "s"} on file. Open full history from this card — all values from logged sets.`}
          >
            <Link to="/calisthenics/prs" className="block min-w-0 w-full">
              <CaliGlassPanel accent="#D4A843" glow className="px-3 py-2.5 flex items-center gap-2.5 h-full hover:opacity-90 transition-opacity">
                <Trophy className="w-4 h-4 text-[#D4A843] shrink-0" style={{ filter: "drop-shadow(0 0 6px #D4A84366)" }} />
                <div className="min-w-0">
                  <p className="text-[0.5rem] text-[#8494A7] tracking-widest" style={orbitron}>PRS</p>
                  <p className="text-base font-bold text-white leading-tight" style={orbitron}>{summary.prCount}</p>
                  <p className="text-[0.55rem] text-[#8494A7]" style={dmSans}>Records →</p>
                </div>
              </CaliGlassPanel>
            </Link>
          </CaliHintWrap>
          {(summary.eliteSessions30d ?? 0) > 0 && (
            <CaliHintWrap
              block
              title="Elite vault"
              hint={`Elite vault sessions (last 30d): ${summary.eliteSessions30d}. Sets logged: ${summary.eliteSets30d}. This week: ${summary.eliteSessions7d}. Governor / elite access path only.`}
            >
              <CaliGlassPanel accent="#D4A843" glow className="px-3 py-2.5 flex items-center gap-2.5 min-w-0 w-full">
                <Shield className="w-4 h-4 text-[#D4A843] shrink-0" style={{ filter: "drop-shadow(0 0 6px #D4A84366)" }} />
                <div className="min-w-0">
                  <p className="text-[0.5rem] text-[#8494A7] tracking-widest" style={orbitron}>VAULT</p>
                  <p className="text-base font-bold text-white leading-tight" style={orbitron}>{summary.eliteSessions30d}</p>
                  <p className="text-[0.55rem] text-[#8494A7] truncate" style={dmSans}>
                    {summary.eliteSets30d} sets · {summary.eliteSessions7d}w
                  </p>
                </div>
              </CaliGlassPanel>
            </CaliHintWrap>
          )}
        </div>
      )}

      {/* Activity heatmap — DO NOT alter CaliProgressionHeatmap internals */}
      {heatmapDays.length > 0 && (
        <div>
          <CaliHintWrap
            title="Activity heatmap"
            hint={`Session intensity + hypertrophy by day for ${range.toUpperCase()} (${heatmapDays.length} days loaded). Colors and cells are your real training days — hover/tap cells inside the map for day detail.`}
            side="bottom"
          >
            <p className="text-[0.55rem] font-bold tracking-[0.18em] text-[#8494A7] mb-2 px-0.5 flex items-center gap-1.5" style={orbitron}>
              <Activity className="w-3 h-3 text-[#10b981]" />
              ACTIVITY
            </p>
          </CaliHintWrap>
          <CaliGlassPanel accent="#10b981" className="p-3 sm:p-4">
            <CaliProgressionHeatmap data={heatmapDays} range={range} />
          </CaliGlassPanel>
        </div>
      )}

      {/* Positions */}
      <CaliGlassPanel accent="#4274B9" className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <CaliHintWrap
            title="Positions"
            hint={`${movements.length} top movement${movements.length === 1 ? "" : "s"} ranked from your PR / volume history. % is recent change (capped display above 500%). Tap a row for full PR history — all live data.`}
            side="bottom"
          >
            <h2 className="text-[0.65rem] font-bold tracking-[0.16em] text-[#E8ECF0]" style={orbitron}>
              POSITIONS
            </h2>
          </CaliHintWrap>
          <span className="text-[0.5rem] text-[#8494A7]" style={dmSans}>
            <span className="sm:hidden">Tap row · history</span>
            <span className="hidden sm:inline">Hover % · tap for history</span>
          </span>
        </div>
        {movError && (
          <p className="text-xs text-amber-300 mb-2" style={dmSans}>{movError}</p>
        )}
        {movements.length === 0 ? (
          <p className="text-xs text-[#8494A7] py-6 text-center" style={dmSans}>
            Hit PRs in workouts to fill positions.
          </p>
        ) : (
          <ul className="space-y-1">
            {movements.map((m) => {
              const maxVal = Math.max(...movements.map((x) => x.currentValue), 1);
              const depth = Math.round((m.currentValue / maxVal) * 100);
              const d = m.deltaPct7d;
              return (
                <li key={m.exerciseId}>
                  <button
                    type="button"
                    onClick={() => setSelectedExercise(m.exerciseId)}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl border text-left hover:border-[#4274B9]/40 transition-colors relative overflow-hidden min-h-[44px]"
                    style={{ borderColor: "rgba(66,116,185,0.12)", background: "rgba(255,255,255,0.02)" }}
                  >
                    <div
                      className="absolute inset-y-0 left-0 opacity-[0.15] pointer-events-none"
                      style={{
                        width: `${depth}%`,
                        background: `linear-gradient(90deg, ${deltaColor(d ?? 0)}55, transparent)`,
                      }}
                    />
                    <div className="flex-1 min-w-0 relative">
                      <p className="text-[0.8rem] font-semibold text-white truncate leading-tight" style={dmSans}>
                        {m.name}
                      </p>
                      <p className="text-[0.55rem] text-[#8494A7] capitalize leading-tight mt-0.5" style={dmSans}>
                        {m.category} · {m.currentValue}{m.metric === "time_sec" ? "s" : "r"}
                      </p>
                    </div>
                    {d != null && (
                      <span
                        className="text-[0.7rem] font-bold shrink-0 relative tabular-nums"
                        style={{ color: deltaColor(d), ...orbitron }}
                      >
                        {formatDeltaCompact(d)}
                      </span>
                    )}
                    {m.series.length > 1 && (
                      <div className="w-12 h-6 shrink-0 relative opacity-90">
                        <CaliStatsSparkline data={m.series.map((s) => s.value)} bicolor height={24} />
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </CaliGlassPanel>

      <CaliPRHistoryModal
        exerciseId={selectedExercise}
        exerciseName={movements.find((m) => m.exerciseId === selectedExercise)?.name}
        onClose={() => setSelectedExercise(null)}
      />
    </div>
  );
}
