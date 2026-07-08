export type AthleteTier =
  | "UNRANKED"
  | "ROOKIE"
  | "RISING"
  | "CONTENDER"
  | "WARRIOR"
  | "PRO"
  | "ELITE"
  | "EXTREME";

export type StatsRange = "7d" | "30d" | "90d";

export interface StatsDeltas {
  consistency7d: number;
  effort7d: number;
  hypertrophy7d: number;
  movement7d: number;
}

export interface StatsSummary {
  athleteScore: number;
  athleteTier: AthleteTier;
  tierJudgment: string;
  consistency: number;
  effort: number;
  hypertrophyPct: number;
  movementIndex: number;
  deltas: StatsDeltas;
  completedWorkouts30d: number;
  sessions7d: number;
  dataConfidence: "none" | "low" | "medium" | "high";
  streakCurrent: number;
  streakLongest: number;
  prCount: number;
  lastComputedAt: number;
  eliteSessions7d: number;
  eliteSessions30d: number;
  eliteSets30d: number;
}

export interface WorkoutHistoryItem {
  workoutId: string;
  dateKey: string;
  completedAt: string | null;
  totalSets: number;
  uniqueExercises: number;
  topVolumeSet: { exerciseId: string; metric: "reps" | "time_sec"; value: number } | null;
  updatedAt: number;
  source: "cali" | "elite";
  level: 1 | 2 | 3 | 4;
}

export interface StatsSparkPoint {
  dateKey: string;
  athleteScore: number;
  movementIndex: number;
  volume: number;
  consistency: number;
  effort: number;
  hypertrophy: number;
}

export interface DailyActivityPoint {
  dateKey: string;
  workoutsCompleted: number;
  volume: number;
}

export interface HeatmapDayPoint {
  dateKey: string;
  active: boolean;
  workoutsCompleted: number;
  volume: number;
  greenScore: number;
  redScore: number;
  gapDays: number;
  pushReps: number;
  pullReps: number;
  pushTimeSec: number;
  pullTimeSec: number;
  avgRpe: number | null;
  hypertrophyScore: number;
  maxLevel: 1 | 2 | 3 | 4;
  prHits: number;
  eliteSession: boolean;
  recencyWeight: number;
}

export interface MetricSparklines {
  consistency: number[];
  effort: number[];
  movement: number[];
  volume: number[];
  hypertrophy: number[];
}

export interface CandlePoint {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  delta: number;
}

export const CHART_UP = "#10b981";
export const CHART_DOWN = "#ef4444";

export interface MovementStat {
  exerciseId: string;
  name: string;
  category: string;
  metric: "reps" | "time_sec";
  currentValue: number;
  deltaPct7d: number | null;
  series: Array<{ dateKey: string; value: number }>;
}

export interface PRHistoryEntry {
  value: number;
  achievedAt: number;
  previous: number | null;
  deltaPct: number | null;
  workoutId: string;
  level: number;
}

export const ATHLETE_TIER_CONFIG: Record<AthleteTier, { color: string; bg: string; border: string; label: string }> = {
  EXTREME: { color: "#f59e0b", bg: "#f59e0b10", border: "#f59e0b30", label: "EXTREME" },
  ELITE: { color: "#D4A843", bg: "#D4A84310", border: "#D4A84330", label: "ELITE" },
  PRO: { color: "#10b981", bg: "#10b98110", border: "#10b98130", label: "PRO" },
  WARRIOR: { color: "#6AA3E0", bg: "#6AA3E010", border: "#6AA3E030", label: "WARRIOR" },
  CONTENDER: { color: "#8B5CF6", bg: "#8B5CF610", border: "#8B5CF630", label: "CONTENDER" },
  RISING: { color: "#4274B9", bg: "#4274B910", border: "#4274B930", label: "RISING" },
  ROOKIE: { color: "#8494A7", bg: "#8494A710", border: "#8494A730", label: "ROOKIE" },
  UNRANKED: { color: "#8494A7", bg: "#8494A708", border: "#8494A720", label: "UNRANKED" },
};

export function formatDelta(value: number, suffix = "%"): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}${suffix}`;
}

/** Compact PnL-style delta for dense portfolio UI. Caps extreme % for readability. */
export function formatDeltaCompact(value: number, suffix = "%"): string {
  if (!Number.isFinite(value)) return "—";
  if (value > 500) return `>500${suffix}`;
  if (value < -500) return `<-500${suffix}`;
  const abs = Math.abs(value);
  const decimals = abs >= 100 ? 0 : abs >= 10 ? 0 : 1;
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(decimals)}${suffix}`;
}

export function deltaColor(value: number): string {
  if (value > 0) return "#10b981";
  if (value < 0) return "#ef4444";
  return "#8494A7";
}