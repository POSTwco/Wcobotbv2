import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { ArrowLeft, BarChart3, Flame, Shield, Trophy } from "lucide-react";
import { api } from "../../lib/api";
import { useCaliSession } from "./cali-context";
import { CaliLoader } from "./cali-loader";
import { CaliMetricTile } from "./cali-metric-tile";
import { CaliMovementChart } from "./cali-movement-chart";
import {
  ATHLETE_TIER_CONFIG,
  deltaColor,
  formatDelta,
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
import { CaliLiveTicker } from "./cali-live-ticker";
import { CaliPRHistoryModal } from "./cali-pr-history-modal";

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

function confidenceLabel(c: StatsSummary["dataConfidence"]): string {
  switch (c) {
    case "high": return "HIGH CONFIDENCE";
    case "medium": return "MEDIUM CONFIDENCE";
    case "low": return "LOW CONFIDENCE";
    default: return "COLLECTING DATA";
  }
}

export function CaliAnalytics() {
  const cali = useCaliSession();
  const [range, setRange] = useState<StatsRange>("7d");
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [sparklinesByRange, setSparklinesByRange] = useState(EMPTY_SPARKLINES_BY_RANGE);
  const [metricSparklinesByRange, setMetricSparklinesByRange] = useState(EMPTY_METRIC_SPARKLINES_BY_RANGE);
  const [fullHeatmapDays, setFullHeatmapDays] = useState<HeatmapDayPoint[]>([]);
  const [movements, setMovements] = useState<MovementStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [movError, setMovError] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);

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

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/calisthenics"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-[#8494A7] hover:text-white bg-white/[0.04] border border-[#4274B9]/20 backdrop-blur-md"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <p className="text-[0.65rem] font-bold tracking-widest text-[#6AA3E0]" style={orbitron}>
            PERFORMANCE TERMINAL
          </p>
          <h1 className="text-xl sm:text-2xl font-bold text-white" style={orbitron}>
            Athlete Analytics
          </h1>
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-300 px-3 py-2 rounded-lg bg-red-500/8 border border-red-500/20" style={dmSans}>
          {error}
        </p>
      )}

      {summary && (
        <CaliGlassPanel accent={tierCfg.color} glow pulseKey={summary.lastComputedAt} className="px-4 py-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
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
              <motion.span
                key={summary.athleteScore}
                initial={{ scale: 0.95, opacity: 0.7 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-2xl font-bold text-white"
                style={{ ...orbitron, textShadow: `0 0 24px ${tierCfg.color}44` }}
              >
                {summary.athleteScore}
                <span className="text-xs text-[#8494A7] font-normal"> / 100</span>
              </motion.span>
              <span
                className="text-[0.6rem] font-bold px-2 py-0.5 rounded"
                style={{
                  color: deltaColor(summary.deltas.movement7d),
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  ...orbitron,
                }}
              >
                {formatDelta(summary.deltas.movement7d, " pts")}
              </span>
            </div>
            <div className="text-right">
              <p className="text-[0.55rem] tracking-widest text-[#6AA3E0]" style={orbitron}>
                {confidenceLabel(summary.dataConfidence)}
              </p>
              <p className="text-[0.6rem] text-[#8494A7]" style={dmSans}>
                Wallet synced · {summary.lastComputedAt ? new Date(summary.lastComputedAt).toLocaleString() : "—"}
              </p>
            </div>
          </div>
          <p className="text-xs text-[#8494A7] mt-2" style={dmSans}>{summary.tierJudgment}</p>
        </CaliGlassPanel>
      )}

      <div>
        <div className="flex gap-2 items-center">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-3 py-1.5 rounded-lg text-[0.65rem] font-bold tracking-wider transition-colors ${
                range === r ? "text-white" : "text-[#8494A7] hover:text-white"
              }`}
              style={{
                ...orbitron,
                background: range === r ? "rgba(66,116,185,0.3)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${range === r ? "rgba(66,116,185,0.45)" : "rgba(66,116,185,0.12)"}`,
                boxShadow: range === r ? "0 0 12px rgba(66,116,185,0.2)" : undefined,
              }}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>
        <p className="text-[0.6rem] text-[#8494A7] mt-1.5" style={dmSans}>
          Chart window: {range.toUpperCase()} · Summary metrics use rolling 30-day rollups
        </p>
      </div>

      <CaliGlassPanel accent="#D4A843" className="p-4 sm:p-5">
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-[#D4A843]" />
          <h2 className="text-sm font-bold tracking-widest text-[#E8ECF0]" style={orbitron}>
            MOVEMENT INDEX
          </h2>
        </div>
        <CaliMovementChart data={sparkline} metric="movementIndex" label="Movement Index" color="#D4A843" />
      </CaliGlassPanel>

      {sparkline.length > 1 && (
        <CaliGlassPanel accent="#4274B9" className="p-4 sm:p-5">
          <h2 className="text-sm font-bold tracking-widest text-[#E8ECF0] mb-3" style={orbitron}>
            ATHLETE INDEX
          </h2>
          <CaliMovementChart data={sparkline} metric="athleteScore" label="Athlete Index" color="#4274B9" />
        </CaliGlassPanel>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <p className="col-span-full text-[0.6rem] text-[#8494A7] -mb-1" style={dmSans}>
          Hypertrophy scores max Intensity (10), failure signals, and reps above prescription — log Intensity 1–10 every set (10 = max effort).
        </p>
        <CaliMetricTile
          label="CONSISTENCY"
          value={summary ? `${summary.consistency}` : "—"}
          delta={summary?.deltas.consistency7d ?? 0}
          accent="#F97316"
          sparkData={metricSparklines.consistency}
        />
        <CaliMetricTile
          label="EFFORT"
          value={summary ? `${summary.effort}` : "—"}
          delta={summary?.deltas.effort7d ?? 0}
          accent="#6AA3E0"
          sparkData={metricSparklines.effort}
        />
        <CaliMetricTile
          label="HYPERTROPHY"
          value={summary ? `${summary.hypertrophyPct}%` : "—"}
          delta={summary?.deltas.hypertrophy7d ?? 0}
          deltaSuffix="%"
          accent="#10b981"
          sparkData={metricSparklines.hypertrophy}
        />
        <CaliMetricTile
          label="MOVEMENT"
          value={summary ? `${summary.movementIndex}` : "—"}
          delta={summary?.deltas.movement7d ?? 0}
          accent="#D4A843"
          sparkData={metricSparklines.movement}
        />
      </div>

      {summary && (
        <div className={`grid gap-3 ${(summary.eliteSessions30d ?? 0) > 0 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2"}`}>
          <CaliGlassPanel accent="#F97316" glow className="p-4 flex items-center gap-3">
            <Flame className="w-5 h-5 text-[#F97316]" style={{ filter: "drop-shadow(0 0 8px #F9731666)" }} />
            <div>
              <p className="text-[0.6rem] text-[#8494A7] tracking-widest" style={orbitron}>STREAK</p>
              <p className="text-xl font-bold text-white" style={orbitron}>{summary.streakCurrent}</p>
              <p className="text-[0.65rem] text-[#8494A7]" style={dmSans}>Best: {summary.streakLongest}</p>
            </div>
          </CaliGlassPanel>
          <Link to="/calisthenics/prs" className="block">
            <CaliGlassPanel accent="#D4A843" glow className="p-4 flex items-center gap-3 hover:opacity-90 transition-opacity h-full">
              <Trophy className="w-5 h-5 text-[#D4A843]" style={{ filter: "drop-shadow(0 0 8px #D4A84366)" }} />
              <div>
                <p className="text-[0.6rem] text-[#8494A7] tracking-widest" style={orbitron}>PRS</p>
                <p className="text-xl font-bold text-white" style={orbitron}>{summary.prCount}</p>
                <p className="text-[0.65rem] text-[#8494A7]" style={dmSans}>View all records →</p>
              </div>
            </CaliGlassPanel>
          </Link>
          {(summary.eliteSessions30d ?? 0) > 0 && (
            <CaliGlassPanel accent="#D4A843" glow className="p-4 flex items-center gap-3 col-span-2 sm:col-span-1">
              <Shield className="w-5 h-5 text-[#D4A843]" style={{ filter: "drop-shadow(0 0 8px #D4A84366)" }} />
              <div>
                <p className="text-[0.6rem] text-[#8494A7] tracking-widest" style={orbitron}>ELITE VAULT</p>
                <p className="text-xl font-bold text-white" style={orbitron}>{summary.eliteSessions30d}</p>
                <p className="text-[0.65rem] text-[#8494A7]" style={dmSans}>
                  {summary.eliteSets30d} sets · {summary.eliteSessions7d} this week
                </p>
              </div>
            </CaliGlassPanel>
          )}
        </div>
      )}

      {heatmapDays.length > 0 && (
        <CaliGlassPanel accent="#10b981" className="p-3 sm:p-4">
          <CaliProgressionHeatmap data={heatmapDays} range={range} />
        </CaliGlassPanel>
      )}

      <CaliGlassPanel accent="#4274B9" className="p-4 sm:p-5">
        <h2 className="text-sm font-bold tracking-widest text-[#E8ECF0] mb-3" style={orbitron}>
          TOP MOVEMENTS
        </h2>
        {movError && (
          <p className="text-xs text-amber-300 mb-2" style={dmSans}>{movError}</p>
        )}
        {movements.length === 0 ? (
          <p className="text-xs text-[#8494A7] py-4 text-center" style={dmSans}>
            Set PRs during workouts to populate movement charts.
          </p>
        ) : (
          <ul className="space-y-2">
            {movements.map((m) => {
              const maxVal = Math.max(...movements.map((x) => x.currentValue), 1);
              const depth = Math.round((m.currentValue / maxVal) * 100);
              return (
                <li key={m.exerciseId}>
                  <button
                    type="button"
                    onClick={() => setSelectedExercise(m.exerciseId)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border text-left hover:border-[#4274B9]/35 transition-colors relative overflow-hidden"
                    style={{ borderColor: "rgba(66,116,185,0.15)", background: "rgba(255,255,255,0.02)" }}
                  >
                    <div
                      className="absolute inset-y-0 left-0 opacity-20"
                      style={{
                        width: `${depth}%`,
                        background: `linear-gradient(90deg, ${deltaColor(m.deltaPct7d ?? 0)}44, transparent)`,
                      }}
                    />
                    <div className="flex-1 min-w-0 relative">
                      <p className="text-sm font-semibold text-white truncate" style={dmSans}>{m.name}</p>
                      <p className="text-[0.65rem] text-[#8494A7] capitalize" style={dmSans}>
                        {m.category} · {m.currentValue} {m.metric === "time_sec" ? "sec" : "reps"}
                      </p>
                    </div>
                    {m.deltaPct7d != null && (
                      <span className="text-xs font-bold shrink-0 relative" style={{ color: deltaColor(m.deltaPct7d), ...orbitron }}>
                        {formatDelta(m.deltaPct7d)}
                      </span>
                    )}
                    {m.series.length > 1 && (
                      <div className="w-14 h-7 shrink-0 relative">
                        <CaliStatsSparkline data={m.series.map((s) => s.value)} bicolor height={28} />
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </CaliGlassPanel>

      {movements.some((m) => m.deltaPct7d != null) && (
        <CaliGlassPanel accent="#D4A843" className="overflow-hidden">
          <div className="px-4 py-2 border-b border-[#D4A843]/15">
            <p className="text-[0.6rem] font-bold tracking-widest text-[#D4A843]" style={orbitron}>
              PR TICKER
            </p>
          </div>
          <CaliLiveTicker movements={movements} />
        </CaliGlassPanel>
      )}

      <CaliPRHistoryModal
        exerciseId={selectedExercise}
        exerciseName={movements.find((m) => m.exerciseId === selectedExercise)?.name}
        onClose={() => setSelectedExercise(null)}
      />
    </div>
  );
}