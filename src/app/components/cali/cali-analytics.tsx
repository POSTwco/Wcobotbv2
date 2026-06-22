import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router";
import { motion } from "motion/react";
import { ArrowLeft, BarChart3, Flame, Loader2, Trophy } from "lucide-react";
import { api } from "../../lib/api";
import { useCaliSession } from "./cali-context";
import { CaliLoader } from "./cali-loader";
import { CaliAthleteTierCard } from "./cali-athlete-tier-card";
import { CaliMetricTile } from "./cali-metric-tile";
import { CaliMovementChart } from "./cali-movement-chart";
import {
  ATHLETE_TIER_CONFIG,
  deltaColor,
  formatDelta,
  type MovementStat,
  type StatsRange,
  type StatsSparkPoint,
  type StatsSummary,
} from "../../lib/cali-analytics-types";
import { CaliStatsSparkline } from "./cali-stats-sparkline";

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const RANGES: StatsRange[] = ["7d", "30d", "90d"];

export function CaliAnalytics() {
  const cali = useCaliSession();
  const [range, setRange] = useState<StatsRange>("7d");
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [sparkline, setSparkline] = useState<StatsSparkPoint[]>([]);
  const [movements, setMovements] = useState<MovementStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!cali.sessionToken) return;
    setLoading(true);
    setError(null);
    const token = cali.sessionToken;
    const [st, mov] = await Promise.all([
      api.cali.stats(token, range),
      api.cali.movementStats(token, 12),
    ]);
    if (st.success && st.data) {
      setSummary(st.data.summary);
      setSparkline(st.data.sparkline);
    } else {
      cali.handleAuthError(st.code);
      setError(st.error || "Couldn't load analytics.");
    }
    if (mov.success && mov.data) setMovements(mov.data.movements);
    setLoading(false);
  }, [cali.sessionToken, cali.handleAuthError, range]);

  useEffect(() => { load(); }, [load]);

  if (loading && !summary) return <CaliLoader variant="dashboard" />;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 sm:py-12 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          to="/calisthenics"
          className="w-9 h-9 rounded-lg flex items-center justify-center text-[#8494A7] hover:text-white bg-white/[0.02] border border-[#4274B9]/15"
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

      <CaliAthleteTierCard summary={summary} loading={loading} />

      <div className="flex gap-2">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`px-3 py-1.5 rounded-lg text-[0.65rem] font-bold tracking-wider transition-colors ${
              range === r ? "text-white" : "text-[#8494A7] hover:text-white"
            }`}
            style={{
              ...orbitron,
              background: range === r ? "rgba(66,116,185,0.25)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${range === r ? "rgba(66,116,185,0.4)" : "rgba(66,116,185,0.12)"}`,
            }}
          >
            {r.toUpperCase()}
          </button>
        ))}
        {loading && <Loader2 className="w-4 h-4 animate-spin text-[#8494A7] ml-auto" />}
      </div>

      <div
        className="rounded-2xl border p-4 sm:p-5"
        style={{ background: "rgba(11,17,32,0.6)", borderColor: "rgba(66,116,185,0.15)" }}
      >
        <div className="flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-[#4274B9]" />
          <h2 className="text-sm font-bold tracking-widest text-[#E8ECF0]" style={orbitron}>
            MOVEMENT INDEX
          </h2>
        </div>
        <CaliMovementChart data={sparkline} metric="movementIndex" label="Movement Index" color="#D4A843" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <CaliMetricTile
          label="CONSISTENCY"
          value={summary ? `${summary.consistency}` : "—"}
          delta={summary?.deltas.consistency7d ?? 0}
          accent="#F97316"
        />
        <CaliMetricTile
          label="EFFORT"
          value={summary ? `${summary.effort}` : "—"}
          delta={summary?.deltas.effort7d ?? 0}
          accent="#6AA3E0"
        />
        <CaliMetricTile
          label="HYPERTROPHY"
          value={summary ? `${summary.hypertrophyPct}%` : "—"}
          delta={summary?.deltas.hypertrophy7d ?? 0}
          deltaSuffix="%"
          accent="#10b981"
        />
        <CaliMetricTile
          label="MOVEMENT"
          value={summary ? `${summary.movementIndex}` : "—"}
          delta={summary?.deltas.movement7d ?? 0}
          accent="#D4A843"
        />
      </div>

      {summary && (
        <div className="grid grid-cols-2 gap-3">
          <div
            className="rounded-2xl border p-4 flex items-center gap-3"
            style={{ background: "rgba(11,17,32,0.6)", borderColor: "rgba(66,116,185,0.15)" }}
          >
            <Flame className="w-5 h-5 text-[#F97316]" />
            <div>
              <p className="text-[0.6rem] text-[#8494A7] tracking-widest" style={orbitron}>STREAK</p>
              <p className="text-xl font-bold text-white" style={orbitron}>{summary.streakCurrent}</p>
              <p className="text-[0.65rem] text-[#8494A7]" style={dmSans}>Best: {summary.streakLongest}</p>
            </div>
          </div>
          <div
            className="rounded-2xl border p-4 flex items-center gap-3"
            style={{ background: "rgba(11,17,32,0.6)", borderColor: "rgba(66,116,185,0.15)" }}
          >
            <Trophy className="w-5 h-5 text-[#D4A843]" />
            <div>
              <p className="text-[0.6rem] text-[#8494A7] tracking-widest" style={orbitron}>PRS</p>
              <p className="text-xl font-bold text-white" style={orbitron}>{summary.prCount}</p>
              <p className="text-[0.65rem] text-[#8494A7]" style={dmSans}>{summary.sessions7d} sessions / 7d</p>
            </div>
          </div>
        </div>
      )}

      {/* Movement leaderboard */}
      <div
        className="rounded-2xl border p-4 sm:p-5"
        style={{ background: "rgba(11,17,32,0.6)", borderColor: "rgba(66,116,185,0.15)" }}
      >
        <h2 className="text-sm font-bold tracking-widest text-[#E8ECF0] mb-3" style={orbitron}>
          TOP MOVEMENTS
        </h2>
        {movements.length === 0 ? (
          <p className="text-xs text-[#8494A7] py-4 text-center" style={dmSans}>
            Set PRs during workouts to populate movement charts.
          </p>
        ) : (
          <ul className="space-y-2">
            {movements.map((m) => (
              <li
                key={m.exerciseId}
                className="flex items-center gap-3 p-3 rounded-xl border"
                style={{ borderColor: "rgba(66,116,185,0.1)", background: "rgba(255,255,255,0.01)" }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate" style={dmSans}>{m.name}</p>
                  <p className="text-[0.65rem] text-[#8494A7] capitalize" style={dmSans}>
                    {m.category} · {m.currentValue} {m.metric === "time_sec" ? "sec" : "reps"}
                  </p>
                </div>
                {m.deltaPct7d != null && (
                  <span
                    className="text-xs font-bold shrink-0"
                    style={{ color: deltaColor(m.deltaPct7d), ...orbitron }}
                  >
                    {formatDelta(m.deltaPct7d)}
                  </span>
                )}
                {m.series.length > 1 && (
                  <div className="w-14 h-7 shrink-0">
                    <CaliStatsSparkline data={m.series.map((s) => s.value)} color="#4274B9" height={28} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* PR ticker */}
      {movements.some((m) => m.deltaPct7d != null) && (
        <div
          className="rounded-2xl border overflow-hidden"
          style={{ borderColor: "rgba(212,168,67,0.2)", background: "rgba(11,17,32,0.8)" }}
        >
          <div className="px-4 py-2 border-b" style={{ borderColor: "rgba(212,168,67,0.15)" }}>
            <p className="text-[0.6rem] font-bold tracking-widest text-[#D4A843]" style={orbitron}>
              PR TICKER
            </p>
          </div>
          <div className="overflow-hidden py-2">
            <motion.div
              className="flex gap-6 whitespace-nowrap px-4"
              animate={{ x: ["0%", "-50%"] }}
              transition={{ duration: 24, repeat: Infinity, ease: "linear" }}
            >
              {[...movements, ...movements].filter((m) => m.deltaPct7d != null).map((m, i) => (
                <span key={`${m.exerciseId}-${i}`} className="text-xs" style={dmSans}>
                  <span className="text-white font-semibold">{m.name}</span>
                  {" "}
                  <span style={{ color: deltaColor(m.deltaPct7d ?? 0) }}>
                    {formatDelta(m.deltaPct7d ?? 0)}
                  </span>
                </span>
              ))}
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}