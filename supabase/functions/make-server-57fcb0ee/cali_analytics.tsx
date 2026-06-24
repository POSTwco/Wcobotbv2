/**
 * Cali Athlete Analytics — incremental rollups, scoring, and stats API helpers.
 */

import * as kv from "./kv_store.tsx";
import type { WorkoutPlan } from "./cali_generator.tsx";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AthleteTier =
  | "UNRANKED"
  | "ROOKIE"
  | "RISING"
  | "CONTENDER"
  | "WARRIOR"
  | "PRO"
  | "ELITE"
  | "EXTREME";

export interface CategoryVolume {
  reps: number;
  timeSec: number;
}

export interface DailyStats {
  dateKey: string;
  workoutsStarted: number;
  workoutsCompleted: number;
  setsLogged: number;
  plannedSets: number;
  setCompletionPct: number;
  volumeReps: number;
  volumeTimeSec: number;
  rpeSum: number;
  rpeCount: number;
  avgRpe: number | null;
  maxLevel: 1 | 2 | 3 | 4;
  prHits: number;
  /** Sets with RPE logged (required for hypertrophy scoring). */
  setsWithRpe: number;
  /** RPE 10 sets — true max effort. */
  maxEffortSets: number;
  /** RPE 10 or explicit failure note. */
  failureSets: number;
  /** Logged value above prescription high target. */
  overTargetSets: number;
  /** Sum of per-set hypertrophy scores (0–100 each). */
  hypertrophySignalSum: number;
  /** Sets scored against plan targets + RPE. */
  hypertrophyScoredSets: number;
  /** Completed elite vault workouts on this day. */
  eliteWorkoutsCompleted: number;
  /** Sets logged in elite vault workouts. */
  eliteSetsLogged: number;
  /** Hypertrophy signal from elite sets only (with L4 multiplier applied). */
  eliteHypertrophySignalSum: number;
  categories: Record<string, CategoryVolume>;
  updatedAt: number;
}

interface WorkoutDayContrib {
  workoutId: string;
  source: "cali" | "elite";
  setsLogged: number;
  plannedSets: number;
  completed: boolean;
  volumeReps: number;
  volumeTimeSec: number;
  rpeSum: number;
  rpeCount: number;
  maxLevel: 1 | 2 | 3 | 4;
  prHits: number;
  setsWithRpe: number;
  maxEffortSets: number;
  failureSets: number;
  overTargetSets: number;
  hypertrophySignalSum: number;
  hypertrophyScoredSets: number;
  categories: Record<string, CategoryVolume>;
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

interface PlanLike {
  level: number;
  blocks: WorkoutPlan["blocks"];
}

interface BackfillLogEntry {
  workoutId: string;
  accountId: string;
  dateKey: string;
  sets: LogSet[];
  completedAt: string | null;
  updatedAt: number;
  source: "cali" | "elite";
}

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
  analyticsSchemaVersion?: number;
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

export interface PRHistoryEntry {
  value: number;
  achievedAt: number;
  previous: number | null;
  deltaPct: number | null;
  workoutId: string;
  level: number;
}

export interface MovementStat {
  exerciseId: string;
  name: string;
  category: string;
  metric: "reps" | "time_sec";
  currentValue: number;
  deltaPct7d: number | null;
  series: Array<{ dateKey: string; value: number }>;
}

interface LogSet {
  exerciseId: string;
  metric: "reps" | "time_sec";
  value: number;
  blockIndex?: number;
  itemIndex?: number;
  setIndex?: number;
  rpe?: number;
  note?: string;
}

interface SetTarget {
  metric: "reps" | "time_sec";
  low: number;
  high: number;
}

interface PRChangeLike {
  exerciseId: string;
  metric: "reps" | "time_sec";
  previous: number | null;
  current: number;
}

interface StreakLike {
  current: number;
  longest: number;
}

type ExerciseLookup = (id: string) => { name: string; category: string } | undefined;

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

function dailyKey(accountId: string, dateKey: string) {
  return `cali:user:${accountId}:stats:daily:${dateKey}`;
}

function wcontribKey(accountId: string, dateKey: string, workoutId: string) {
  return `cali:user:${accountId}:stats:wcontrib:${dateKey}:${workoutId}`;
}

function summaryKey(accountId: string) {
  return `cali:user:${accountId}:stats:summary`;
}

function prHistKey(accountId: string, exerciseId: string) {
  return `cali:user:${accountId}:prhist:${exerciseId}`;
}

function backfillFlagKey(accountId: string) {
  return `cali:user:${accountId}:stats:backfill:v4`;
}

/** Bump when rollup/summary formulas change — forces hypertrophy replay for existing wallets. */
const ANALYTICS_SCHEMA_VERSION = 4;

/** Baseline positive signal when a wallet sets its first PR (no prior record). */
const FIRST_PR_DELTA_PCT = 5;

/** Elite vault scoring multipliers — elite workouts rank higher than standard cali. */
const ELITE_SET_HYPERTROPHY_MULT = 1.25;
const ELITE_EFFORT_DAY_BONUS = 10;
const ELITE_ATHLETE_SCORE_PER_SESSION = 4;
const ELITE_ATHLETE_SCORE_MAX_BONUS = 12;
const ELITE_PR_MOVEMENT_MULT = 1.5;

function emptyDaily(dateKey: string): DailyStats {
  return {
    dateKey,
    workoutsStarted: 0,
    workoutsCompleted: 0,
    setsLogged: 0,
    plannedSets: 0,
    setCompletionPct: 0,
    volumeReps: 0,
    volumeTimeSec: 0,
    rpeSum: 0,
    rpeCount: 0,
    avgRpe: null,
    maxLevel: 1,
    prHits: 0,
    setsWithRpe: 0,
    maxEffortSets: 0,
    failureSets: 0,
    overTargetSets: 0,
    hypertrophySignalSum: 0,
    hypertrophyScoredSets: 0,
    eliteWorkoutsCompleted: 0,
    eliteSetsLogged: 0,
    eliteHypertrophySignalSum: 0,
    categories: {},
    updatedAt: Date.now(),
  };
}

const FAILURE_NOTE_RE = /\b(fail(?:ed|ure)?|to\s*failure|max\s*effort|couldn'?t|no\s*reps?\s*left)\b/i;

function isFailureSignal(set: LogSet): boolean {
  if (typeof set.rpe === "number" && set.rpe >= 10) return true;
  return Boolean(set.note && FAILURE_NOTE_RE.test(set.note));
}

function getTargetForSet(plan: PlanLike, set: LogSet): SetTarget | null {
  if (!Number.isInteger(set.blockIndex) || !Number.isInteger(set.itemIndex)) return null;
  const block = plan.blocks[set.blockIndex!];
  const item = block?.items?.[set.itemIndex!];
  if (!item?.target) return null;
  return item.target as SetTarget;
}

/**
 * Per-set hypertrophy stimulus (0–100).
 * High scores require max RPE (10), failure signals, and/or reps well above prescription.
 * Sets without RPE log 0 — hypertrophy can't be inferred from volume alone.
 */
function scoreSetHypertrophy(set: LogSet, target: SetTarget | null, isElite = false): number {
  if (typeof set.rpe !== "number" || set.rpe < 1 || set.rpe > 10) return 0;

  let score = 0;
  const maxEffort = set.rpe >= 10;
  const nearMax = set.rpe >= 9;
  const failure = isFailureSignal(set);

  if (maxEffort && failure) score += 55;
  else if (maxEffort) score += 25;
  else if (nearMax && failure) score += 35;
  else if (nearMax) score += 12;
  else if (set.rpe >= 8) score += 5;

  if (target && set.metric === target.metric && set.value > 0) {
    const high = target.high;
    if (set.value > high) {
      const overshoot = (set.value - high) / Math.max(1, high);
      score += Math.min(45, Math.round(overshoot * 120));
    }
  }

  if (isElite) score = Math.round(score * ELITE_SET_HYPERTROPHY_MULT);
  return Math.min(100, score);
}

function emptyHypertrophyContrib() {
  return {
    setsWithRpe: 0,
    maxEffortSets: 0,
    failureSets: 0,
    overTargetSets: 0,
    hypertrophySignalSum: 0,
    hypertrophyScoredSets: 0,
  };
}

function aggregateHypertrophyFromSets(plan: PlanLike, sets: LogSet[]) {
  const isElite = plan.level >= 4;
  const out = emptyHypertrophyContrib();
  for (const set of sets) {
    if (set.value <= 0) continue;
    const target = getTargetForSet(plan, set);
    const hasRpe = typeof set.rpe === "number" && set.rpe >= 1 && set.rpe <= 10;
    if (hasRpe) {
      out.setsWithRpe += 1;
      if (set.rpe >= 10) out.maxEffortSets += 1;
      if (isFailureSignal(set)) out.failureSets += 1;
    }
    if (target && set.metric === target.metric && set.value > target.high) {
      out.overTargetSets += 1;
    }
    if (hasRpe) {
      const setScore = scoreSetHypertrophy(set, target, isElite);
      out.hypertrophyScoredSets += 1;
      out.hypertrophySignalSum += setScore;
    }
  }
  return out;
}

function hypertrophyPctFromDailies(dailies: DailyStats[]): number {
  const window = dailies.slice(-30);
  let signalSum = 0;
  let scoredSets = 0;
  let withRpe = 0;
  let maxEffort = 0;
  let failure = 0;

  for (const d of window) {
    signalSum += d.hypertrophySignalSum ?? 0;
    scoredSets += d.hypertrophyScoredSets ?? 0;
    withRpe += d.setsWithRpe ?? 0;
    maxEffort += d.maxEffortSets ?? 0;
    failure += d.failureSets ?? 0;
  }

  // No RPE logged in the window → hypertrophy stimulus unknown, score 0 (not 100).
  if (withRpe === 0 || scoredSets === 0) return 0;

  const avgSetScore = signalSum / scoredSets;
  const maxEffortRate = maxEffort / withRpe;
  const failureRate = failure / withRpe;

  let blended = avgSetScore * 0.5 + maxEffortRate * 100 * 0.3 + failureRate * 100 * 0.2;

  // Without majority max-effort (RPE 10) sets, cap well below 100.
  if (maxEffortRate < 0.5) {
    blended = Math.min(blended, avgSetScore * 0.45);
  }
  if (maxEffortRate < 0.9 || failureRate < 0.25) {
    blended = Math.min(blended, 85);
  }

  return Math.min(100, Math.max(0, Math.round(blended)));
}

function emptyCategories(): Record<string, CategoryVolume> {
  return {};
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function countPlannedSets(plan: WorkoutPlan): number {
  let total = 0;
  for (const block of plan.blocks) {
    for (const item of block.items) total += item.sets;
  }
  return total;
}

function buildContribFromLog(
  workoutId: string,
  plan: PlanLike,
  sets: LogSet[],
  completed: boolean,
  prHits: number,
  lookup: ExerciseLookup,
  source: "cali" | "elite" = "cali",
): WorkoutDayContrib {
  const categories = emptyCategories();
  let volumeReps = 0;
  let volumeTimeSec = 0;
  let rpeSum = 0;
  let rpeCount = 0;

  for (const s of sets) {
    if (s.metric === "reps") volumeReps += s.value;
    else volumeTimeSec += s.value;
    if (typeof s.rpe === "number" && s.rpe >= 1 && s.rpe <= 10) {
      rpeSum += s.rpe;
      rpeCount++;
    }
    const cat = lookup(s.exerciseId)?.category ?? "unknown";
    if (!categories[cat]) categories[cat] = { reps: 0, timeSec: 0 };
    if (s.metric === "reps") categories[cat].reps += s.value;
    else categories[cat].timeSec += s.value;
  }

  const plannedSets = countPlannedSets(plan as WorkoutPlan);
  const hypo = aggregateHypertrophyFromSets(plan, sets);
  return {
    workoutId,
    source,
    setsLogged: sets.length,
    plannedSets,
    completed,
    volumeReps,
    volumeTimeSec,
    rpeSum,
    rpeCount,
    maxLevel: Math.min(4, Math.max(1, plan.level)) as 1 | 2 | 3 | 4,
    prHits,
    ...hypo,
    categories,
  };
}

function mergeCategoryDelta(
  target: Record<string, CategoryVolume>,
  delta: Record<string, CategoryVolume>,
  sign: 1 | -1,
) {
  for (const [cat, vol] of Object.entries(delta)) {
    if (!target[cat]) target[cat] = { reps: 0, timeSec: 0 };
    target[cat].reps += sign * vol.reps;
    target[cat].timeSec += sign * vol.timeSec;
  }
}

function applyContribDelta(daily: DailyStats, oldC: WorkoutDayContrib | null, newC: WorkoutDayContrib) {
  const sub = (c: WorkoutDayContrib) => {
    daily.setsLogged -= c.setsLogged;
    daily.plannedSets -= c.plannedSets;
    daily.volumeReps -= c.volumeReps;
    daily.volumeTimeSec -= c.volumeTimeSec;
    daily.prHits = Math.max(0, daily.prHits - c.prHits);
    daily.setsWithRpe = Math.max(0, daily.setsWithRpe - c.setsWithRpe);
    daily.maxEffortSets = Math.max(0, daily.maxEffortSets - c.maxEffortSets);
    daily.failureSets = Math.max(0, daily.failureSets - c.failureSets);
    daily.overTargetSets = Math.max(0, daily.overTargetSets - c.overTargetSets);
    daily.hypertrophySignalSum = Math.max(0, daily.hypertrophySignalSum - c.hypertrophySignalSum);
    daily.hypertrophyScoredSets = Math.max(0, daily.hypertrophyScoredSets - c.hypertrophyScoredSets);
    if (c.source === "elite") {
      daily.eliteSetsLogged = Math.max(0, daily.eliteSetsLogged - c.setsLogged);
      daily.eliteHypertrophySignalSum = Math.max(0, daily.eliteHypertrophySignalSum - c.hypertrophySignalSum);
    }
    mergeCategoryDelta(daily.categories, c.categories, -1);
  };
  const add = (c: WorkoutDayContrib) => {
    daily.setsLogged += c.setsLogged;
    daily.plannedSets += c.plannedSets;
    daily.volumeReps += c.volumeReps;
    daily.volumeTimeSec += c.volumeTimeSec;
    daily.prHits += c.prHits;
    daily.setsWithRpe += c.setsWithRpe;
    daily.maxEffortSets += c.maxEffortSets;
    daily.failureSets += c.failureSets;
    daily.overTargetSets += c.overTargetSets;
    daily.hypertrophySignalSum += c.hypertrophySignalSum;
    daily.hypertrophyScoredSets += c.hypertrophyScoredSets;
    if (c.source === "elite") {
      daily.eliteSetsLogged += c.setsLogged;
      daily.eliteHypertrophySignalSum += c.hypertrophySignalSum;
    }
    mergeCategoryDelta(daily.categories, c.categories, 1);
    if (c.maxLevel > daily.maxLevel) daily.maxLevel = c.maxLevel;
  };

  if (oldC) sub(oldC);
  add(newC);

  const hadSets = oldC ? oldC.setsLogged > 0 : false;
  const hasSets = newC.setsLogged > 0;
  if (!hadSets && hasSets) daily.workoutsStarted += 1;
  if (hadSets && !hasSets) daily.workoutsStarted = Math.max(0, daily.workoutsStarted - 1);

  const wasComplete = oldC?.completed ?? false;
  const isComplete = newC.completed;
  if (!wasComplete && isComplete) daily.workoutsCompleted += 1;
  if (wasComplete && !isComplete) daily.workoutsCompleted = Math.max(0, daily.workoutsCompleted - 1);

  const wasEliteComplete = oldC?.source === "elite" && wasComplete;
  const isEliteComplete = newC.source === "elite" && isComplete;
  if (!wasEliteComplete && isEliteComplete) daily.eliteWorkoutsCompleted += 1;
  if (wasEliteComplete && !isEliteComplete) {
    daily.eliteWorkoutsCompleted = Math.max(0, daily.eliteWorkoutsCompleted - 1);
  }

  daily.rpeSum = (daily.rpeSum ?? 0) - (oldC?.rpeSum ?? 0) + newC.rpeSum;
  daily.rpeCount = (daily.rpeCount ?? 0) - (oldC?.rpeCount ?? 0) + newC.rpeCount;
  daily.avgRpe = daily.rpeCount > 0
    ? Math.round((daily.rpeSum / daily.rpeCount) * 10) / 10
    : null;

  daily.setCompletionPct = daily.plannedSets > 0
    ? Math.min(100, Math.round((daily.setsLogged / daily.plannedSets) * 100))
    : (daily.setsLogged > 0 ? 100 : 0);
}

function getTodayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateKeysForRange(days: number, endDateKey?: string): string[] {
  const baseStr = endDateKey || getTodayKey();
  const base = new Date(`${baseStr}T12:00:00Z`);
  const keys: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const copy = new Date(base);
    copy.setUTCDate(copy.getUTCDate() - i);
    keys.push(copy.toISOString().slice(0, 10));
  }
  return keys;
}

async function getLatestRealDateKey(accountId: string): Promise<string> {
  // Prefer streak.lastDate — only set on real marked-complete wallet-tracked workouts.
  try {
    const raw: any = await kv.get(`cali:user:${accountId}:streak`);
    if (raw?.lastDate && typeof raw.lastDate === "string") return raw.lastDate;
  } catch { /* ignore */ }

  // Fallback: scan recent logs (cali + elite) for the max real recorded dateKey.
  try {
    const caliLogs: any[] = (await kv.getByPrefix(`cali:user:${accountId}:log:`)) ?? [];
    const eliteLogs: any[] = (await kv.getByPrefix(`elite:user:${accountId}:log:`)) ?? [];
    const logs = [...caliLogs, ...eliteLogs].filter(
      (l: any) => l && l.accountId === accountId && typeof l.dateKey === "string" && (Array.isArray(l.sets) ? l.sets.length > 0 : true)
    );
    if (logs.length > 0) {
      const real = logs.map((l: any) => l.dateKey as string).sort();
      return real[real.length - 1];
    }
  } catch { /* ignore */ }

  return getTodayKey();
}

function totalVolume(d: DailyStats): number {
  return d.volumeReps + d.volumeTimeSec / 10;
}

function weekVolume(dailies: DailyStats[], endIdx: number): number {
  const slice = dailies.slice(Math.max(0, endIdx - 6), endIdx + 1);
  return slice.reduce((s, d) => s + totalVolume(d), 0);
}

function targetSessionsPerWeek(level: number): number {
  if (level >= 3) return 5;
  if (level >= 2) return 4;
  return 3;
}

function tierJudgment(tier: AthleteTier): string {
  switch (tier) {
    case "UNRANKED": return "Complete 3 workouts to unlock your athlete profile.";
    case "ROOKIE": return "Finish more sets before ending sessions — consistency builds strength.";
    case "RISING": return "Momentum is building. Keep showing up and logging every set.";
    case "CONTENDER": return "Solid base. Push completion rate above 70% to level up.";
    case "WARRIOR": return "Training like an athlete. Maintain 3+ sessions per week.";
    case "PRO": return "High discipline. L3 volume with strong effort — stay consistent.";
    case "ELITE": return "Elite output. PR velocity is strong — prioritize recovery.";
    case "EXTREME": return "Extreme athlete cadence. You are operating at the top tier.";
    default: return "Keep training — your stats update after every logged set.";
  }
}

function resolveTier(
  score: number,
  completed30d: number,
  sessions7d: number,
  completionRate: number,
  profileLevel: number,
): AthleteTier {
  if (completed30d < 3) return "UNRANKED";
  if (score < 25 || completionRate < 0.4) return "ROOKIE";
  if (score < 40) return "RISING";
  if (score < 55) return "CONTENDER";
  if (score < 70) return "WARRIOR";
  if (score < 85) return "PRO";
  if (score < 92) return "ELITE";
  if (profileLevel >= 3 && sessions7d >= 5 && completionRate >= 0.85) return "EXTREME";
  return "ELITE";
}

function emptyStatsSummary(streak: StreakLike, prevSummary: StatsSummary | null): StatsSummary {
  const prev = prevSummary;
  return {
    athleteScore: 0,
    athleteTier: "UNRANKED",
    tierJudgment: tierJudgment("UNRANKED"),
    consistency: 0,
    effort: 0,
    hypertrophyPct: 0,
    movementIndex: 0,
    deltas: {
      consistency7d: prev ? Math.round((0 - prev.consistency) * 10) / 10 : 0,
      effort7d: prev ? Math.round((0 - prev.effort) * 10) / 10 : 0,
      hypertrophy7d: prev ? Math.round((0 - prev.hypertrophyPct) * 10) / 10 : 0,
      movement7d: prev ? Math.round((0 - prev.movementIndex) * 10) / 10 : 0,
    },
    completedWorkouts30d: 0,
    sessions7d: 0,
    dataConfidence: "none",
    streakCurrent: streak.current,
    streakLongest: streak.longest,
    prCount: 0,
    lastComputedAt: Date.now(),
    eliteSessions7d: 0,
    eliteSessions30d: 0,
    eliteSets30d: 0,
    analyticsSchemaVersion: ANALYTICS_SCHEMA_VERSION,
  };
}

function computeScores(
  dailies: DailyStats[],
  streak: StreakLike,
  profileLevel: number,
  movementDelta: { avg: number; count: number },
  prevSummary: StatsSummary | null,
): StatsSummary {
  const last7 = dailies.slice(-7);
  const last30 = dailies.slice(-30);

  const totalSets30d = last30.reduce((s, d) => s + d.setsLogged, 0);
  if (totalSets30d === 0) {
    return emptyStatsSummary(streak, prevSummary);
  }

  const sessions7d = last7.reduce((s, d) => s + d.workoutsCompleted, 0);
  const started30d = last30.reduce((s, d) => s + d.workoutsStarted, 0);
  const completed30d = last30.reduce((s, d) => s + d.workoutsCompleted, 0);
  const completionRate = started30d > 0 ? completed30d / started30d : 0;

  const target = targetSessionsPerWeek(profileLevel);
  const sessionScore = Math.min(100, Math.round((sessions7d / target) * 100));
  const streakBonus = Math.min(15, streak.current * 2);
  const consistency = Math.min(100, Math.round(
    sessionScore * 0.5 + completionRate * 100 * 0.35 + streakBonus,
  ));

  const activeDays = last30.filter((d) => d.setsLogged > 0);
  const avgCompletion = activeDays.length > 0
    ? activeDays.reduce((s, d) => s + d.setCompletionPct, 0) / activeDays.length
    : 0;
  const rpeDays = activeDays.filter((d) => d.avgRpe != null);
  const avgRpe = rpeDays.length > 0
    ? rpeDays.reduce((s, d) => s + (d.avgRpe ?? 0), 0) / rpeDays.length
    : null;
  const rpeScore = avgRpe == null
    ? 0
    : avgRpe >= 6 && avgRpe <= 9
      ? 100
      : Math.max(0, 100 - Math.abs(avgRpe - 7.5) * 12);
  const avgLevel = activeDays.length > 0
    ? activeDays.reduce((s, d) => s + d.maxLevel, 0) / activeDays.length
    : 0;
  const levelScore = avgLevel > 0
    ? Math.min(100, Math.round((avgLevel / 4) * 100))
    : 0;

  const eliteDays30 = last30.filter((d) => (d.eliteWorkoutsCompleted ?? 0) > 0);
  let effort = Math.min(100, Math.round(avgCompletion * 0.5 + rpeScore * 0.25 + levelScore * 0.25));
  if (eliteDays30.length > 0) effort = Math.min(100, effort + ELITE_EFFORT_DAY_BONUS);

  const hypertrophyPct = hypertrophyPctFromDailies(dailies);

  const movementIndex = movementIndexFromDelta(movementDelta);

  const eliteSessions7d = last7.reduce((s, d) => s + (d.eliteWorkoutsCompleted ?? 0), 0);
  const eliteSessions30d = last30.reduce((s, d) => s + (d.eliteWorkoutsCompleted ?? 0), 0);
  const eliteSets30d = last30.reduce((s, d) => s + (d.eliteSetsLogged ?? 0), 0);
  const eliteVaultBonus = Math.min(
    ELITE_ATHLETE_SCORE_MAX_BONUS,
    eliteSessions7d * ELITE_ATHLETE_SCORE_PER_SESSION,
  );

  const athleteScore = Math.min(100, Math.round(
    consistency * 0.35 + effort * 0.30 + movementIndex * 0.25 + streakBonus * 0.10 + eliteVaultBonus,
  ));

  const athleteTier = resolveTier(athleteScore, completed30d, sessions7d, completionRate, profileLevel);

  const prev = prevSummary;
  const deltas: StatsDeltas = {
    consistency7d: prev ? Math.round((consistency - prev.consistency) * 10) / 10 : 0,
    effort7d: prev ? Math.round((effort - prev.effort) * 10) / 10 : 0,
    hypertrophy7d: prev
      ? Math.round((hypertrophyPct - prev.hypertrophyPct) * 10) / 10
      : 0,
    movement7d: prev ? Math.round((movementIndex - prev.movementIndex) * 10) / 10 : 0,
  };

  let dataConfidence: StatsSummary["dataConfidence"] = "none";
  if (completed30d >= 10) dataConfidence = "high";
  else if (completed30d >= 5) dataConfidence = "medium";
  else if (completed30d >= 1) dataConfidence = "low";

  return {
    athleteScore,
    athleteTier,
    tierJudgment: tierJudgment(athleteTier),
    consistency,
    effort,
    hypertrophyPct,
    movementIndex,
    deltas,
    completedWorkouts30d: completed30d,
    sessions7d,
    dataConfidence,
    streakCurrent: streak.current,
    streakLongest: streak.longest,
    prCount: 0,
    lastComputedAt: Date.now(),
    eliteSessions7d,
    eliteSessions30d,
    eliteSets30d,
    analyticsSchemaVersion: ANALYTICS_SCHEMA_VERSION,
  };
}

async function loadDailyRecords(accountId: string, days: number, endDateKey?: string): Promise<DailyStats[]> {
  const dateKeys = dateKeysForRange(days, endDateKey);
  const rawRows = await Promise.all(
    dateKeys.map(async (dateKey) => {
      try {
        return await kv.get(dailyKey(accountId, dateKey));
      } catch {
        return null;
      }
    }),
  );
  return dateKeys.map((dateKey, i) => {
    const raw = rawRows[i];
    if (raw && raw.dateKey === dateKey) {
      return { ...emptyDaily(dateKey), ...(raw as DailyStats), dateKey };
    }
    return emptyDaily(dateKey);
  });
}

async function loadAllPRHistEntries(accountId: string): Promise<PRHistoryEntry[]> {
  let rows: any[];
  try {
    rows = (await kv.getByPrefix(`cali:user:${accountId}:prhist:`)) ?? [];
  } catch {
    return [];
  }
  const out: PRHistoryEntry[] = [];
  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    for (const entry of row) {
      if (entry && typeof entry.achievedAt === "number") out.push(entry as PRHistoryEntry);
    }
  }
  return out.sort((a, b) => a.achievedAt - b.achievedAt);
}

function movementDeltaInWindow(
  entries: PRHistoryEntry[],
  windowStart: number,
  windowEnd: number,
): { avg: number; count: number } {
  const deltas: number[] = [];
  for (const entry of entries) {
    if (entry.achievedAt < windowStart || entry.achievedAt > windowEnd) continue;
    if (typeof entry.deltaPct !== "number") continue;
    const weight = entry.level >= 4 ? ELITE_PR_MOVEMENT_MULT : 1;
    deltas.push(Math.max(-20, Math.min(20, entry.deltaPct)) * weight);
  }
  if (deltas.length === 0) return { avg: 0, count: 0 };
  return { avg: deltas.reduce((a, b) => a + b, 0) / deltas.length, count: deltas.length };
}

async function avgMovementDelta(accountId: string, days: number): Promise<{ avg: number; count: number }> {
  const entries = await loadAllPRHistEntries(accountId);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return movementDeltaInWindow(entries, cutoff, Date.now());
}

async function loadProfileLevel(accountId: string, fallback = 1): Promise<number> {
  let caliLevel = fallback;
  try {
    const raw: any = await kv.get(`cali:user:${accountId}:profile`);
    if (raw && typeof raw.level === "number") caliLevel = raw.level;
  } catch { /* ignore */ }

  try {
    const eliteRaw: any = await kv.get(`elite:user:${accountId}:profile`);
    if (eliteRaw) return Math.max(caliLevel, 4);
  } catch { /* ignore */ }

  return caliLevel;
}

function endOfDayMs(dateKey: string): number {
  return Date.parse(`${dateKey}T23:59:59.999Z`);
}

// ---------------------------------------------------------------------------
// Write path — called from persistWorkoutLog
// ---------------------------------------------------------------------------

export async function processLogAnalytics(args: {
  accountId: string;
  dateKey: string;
  workoutId: string;
  plan: PlanLike;
  sets: LogSet[];
  completed: boolean;
  prHits: number;
  lookup: ExerciseLookup;
  source?: "cali" | "elite";
}): Promise<{ ok: boolean }> {
  const { accountId, dateKey, workoutId, plan, sets, completed, prHits, lookup, source = "cali" } = args;
  try {
    const wKey = wcontribKey(accountId, dateKey, workoutId);
    let oldContrib: WorkoutDayContrib | null = null;
    try {
      const raw: any = await kv.get(wKey);
      if (raw && raw.workoutId === workoutId) {
        oldContrib = { source: "cali", ...emptyHypertrophyContrib(), prHits: 0, ...(raw as WorkoutDayContrib) };
      }
    } catch { /* ignore */ }

    const newContrib = buildContribFromLog(workoutId, plan, sets, completed, prHits, lookup, source);

    const dKey = dailyKey(accountId, dateKey);
    let daily: DailyStats;
    try {
      const raw: any = await kv.get(dKey);
      daily = raw && raw.dateKey === dateKey ? (raw as DailyStats) : emptyDaily(dateKey);
    } catch {
      daily = emptyDaily(dateKey);
    }

    applyContribDelta(daily, oldContrib, newContrib);
    daily.updatedAt = Date.now();

    await kv.set(wKey, newContrib);
    await kv.set(dKey, daily);

    await recomputeSummary(accountId);
    return { ok: true };
  } catch (err) {
    console.log(`[CALI-ANALYTICS] processLogAnalytics failed for ${accountId}: ${err}`);
    return { ok: false };
  }
}

export async function recordPRHistory(args: {
  accountId: string;
  change: PRChangeLike;
  workoutId: string;
  level: number;
}): Promise<void> {
  const { accountId, change, workoutId, level } = args;
  const deltaPct = change.previous != null && change.previous > 0
    ? Math.round(((change.current - change.previous) / change.previous) * 1000) / 10
    : FIRST_PR_DELTA_PCT;

  const entry: PRHistoryEntry = {
    value: change.current,
    achievedAt: Date.now(),
    previous: change.previous,
    deltaPct,
    workoutId,
    level,
  };

  const key = prHistKey(accountId, change.exerciseId);
  let hist: PRHistoryEntry[] = [];
  try {
    const raw: any = await kv.get(key);
    if (Array.isArray(raw)) hist = raw as PRHistoryEntry[];
  } catch { /* ignore */ }

  hist.push(entry);
  if (hist.length > 50) hist = hist.slice(-50);

  try {
    await kv.set(key, hist);
  } catch (err) {
    console.log(`[CALI-ANALYTICS] PR history write failed for ${key}: ${err}`);
  }
}

async function recomputeSummary(accountId: string): Promise<StatsSummary> {
  const profileLevel = await loadProfileLevel(accountId);
  const dailies = await loadDailyRecords(accountId, 90, getTodayKey());
  let streak: StreakLike = { current: 0, longest: 0 };
  try {
    const raw: any = await kv.get(`cali:user:${accountId}:streak`);
    if (raw && typeof raw.current === "number") {
      streak = { current: raw.current, longest: raw.longest ?? 0 };
    }
  } catch { /* ignore */ }

  let prev: StatsSummary | null = null;
  try {
    const raw: any = await kv.get(summaryKey(accountId));
    if (raw && typeof raw.athleteScore === "number") prev = raw as StatsSummary;
  } catch { /* ignore */ }

  const movementDelta = await avgMovementDelta(accountId, 30);
  const summary = computeScores(dailies, streak, profileLevel, movementDelta, prev);

  let prCount = 0;
  try {
    const prs = (await kv.getByPrefix(`cali:user:${accountId}:pr:`)) ?? [];
    prCount = prs.filter((p: any) => p && typeof p.value === "number").length;
  } catch { /* ignore */ }
  summary.prCount = prCount;

  try {
    await kv.set(summaryKey(accountId), summary);
  } catch (err) {
    console.log(`[CALI-ANALYTICS] summary write failed for ${accountId}: ${err}`);
  }
  return summary;
}

// ---------------------------------------------------------------------------
// Read path — API responses
// ---------------------------------------------------------------------------

function movementIndexFromDelta(movementDelta: { avg: number; count: number }): number {
  return movementDelta.count > 0
    ? Math.min(100, Math.max(0, Math.round(50 + movementDelta.avg)))
    : 0;
}

function computeScoresThroughDay(
  dailies: DailyStats[],
  endIdx: number,
  streak: StreakLike,
  profileLevel: number,
  movementDelta: { avg: number; count: number },
): StatsSummary {
  const through = dailies.slice(0, endIdx + 1);
  return computeScores(through, streak, profileLevel, movementDelta, null);
}

function sparklineFromDailiesSync(
  allDailies: DailyStats[],
  prEntries: PRHistoryEntry[],
  streak: StreakLike,
  profileLevel: number,
  takeLast?: number,
): StatsSparkPoint[] {
  const points: StatsSparkPoint[] = [];
  const ms30d = 30 * 24 * 60 * 60 * 1000;

  for (let i = 0; i < allDailies.length; i++) {
    const dayEnd = endOfDayMs(allDailies[i].dateKey);
    const movementDelta = movementDeltaInWindow(prEntries, dayEnd - ms30d, dayEnd);
    const movementIndex = movementIndexFromDelta(movementDelta);
    const partial = computeScoresThroughDay(allDailies, i, streak, profileLevel, movementDelta);
    points.push({
      dateKey: allDailies[i].dateKey,
      athleteScore: partial.athleteScore,
      movementIndex,
      volume: totalVolume(allDailies[i]),
      consistency: partial.consistency,
      effort: partial.effort,
      hypertrophy: partial.hypertrophyPct,
    });
  }
  return takeLast != null && takeLast > 0 ? points.slice(-takeLast) : points;
}

async function sparklineFromDailies(
  accountId: string,
  dailies: DailyStats[],
  streak: StreakLike,
  profileLevel: number,
  prEntries?: PRHistoryEntry[],
): Promise<StatsSparkPoint[]> {
  const entries = prEntries ?? await loadAllPRHistEntries(accountId);
  return sparklineFromDailiesSync(dailies, entries, streak, profileLevel);
}

type StatsRangeKey = "7d" | "30d" | "90d";

function buildSparklinesByRange(
  dailies: DailyStats[],
  prEntries: PRHistoryEntry[],
  streak: StreakLike,
  profileLevel: number,
): Record<StatsRangeKey, StatsSparkPoint[]> {
  return {
    "7d": sparklineFromDailiesSync(dailies, prEntries, streak, profileLevel, 7),
    "30d": sparklineFromDailiesSync(dailies, prEntries, streak, profileLevel, 30),
    "90d": sparklineFromDailiesSync(dailies, prEntries, streak, profileLevel),
  };
}

function buildMetricSparklines(sparkline: StatsSparkPoint[]): MetricSparklines {
  return {
    consistency: sparkline.map((p) => p.consistency),
    effort: sparkline.map((p) => p.effort),
    movement: sparkline.map((p) => p.movementIndex),
    volume: sparkline.map((p) => p.volume),
    hypertrophy: sparkline.map((p) => p.hypertrophy),
  };
}

function buildDailyActivity(dailies: DailyStats[]): DailyActivityPoint[] {
  return dailies.map((d) => ({
    dateKey: d.dateKey,
    workoutsCompleted: d.workoutsCompleted,
    volume: totalVolume(d),
  }));
}

function daysBetween(dateKeyA: string, dateKeyB: string): number {
  const a = Date.parse(`${dateKeyA}T12:00:00Z`);
  const b = Date.parse(`${dateKeyB}T12:00:00Z`);
  return Math.max(0, Math.round(Math.abs(b - a) / 86_400_000));
}

function catVolume(categories: Record<string, CategoryVolume>, key: string): CategoryVolume {
  return categories[key] ?? { reps: 0, timeSec: 0 };
}

function dayIntensityScore(d: DailyStats): number {
  if (d.avgRpe != null) return Math.round((d.avgRpe / 10) * 100);
  if (d.setsLogged > 0 && d.maxEffortSets > 0) {
    return Math.round((d.maxEffortSets / d.setsLogged) * 100);
  }
  return 0;
}

function dayHypertrophyScore(d: DailyStats): number {
  const scored = d.hypertrophyScoredSets ?? 0;
  if (scored === 0) return 0;
  return Math.round((d.hypertrophySignalSum ?? 0) / scored);
}

export function buildHeatmapDays(dailies: DailyStats[]): HeatmapDayPoint[] {
  const totalSets = dailies.reduce((s, d) => s + d.setsLogged, 0);
  const noData = totalSets === 0;

  let lastActiveDateKey: string | null = null;
  const points: HeatmapDayPoint[] = [];

  for (let i = 0; i < dailies.length; i++) {
    const d = dailies[i];
    const active = d.workoutsCompleted > 0 || d.setsLogged > 0;
    const push = catVolume(d.categories ?? {}, "push");
    const pull = catVolume(d.categories ?? {}, "pull");
    const hypertrophyScore = dayHypertrophyScore(d);

    let gapDays = 0;
    let redScore = 0;
    let greenScore = 0;

    if (!noData) {
      if (active) {
        const intensityScore = dayIntensityScore(d);
        greenScore = Math.min(100, Math.round(hypertrophyScore * 0.55 + intensityScore * 0.45));
        lastActiveDateKey = d.dateKey;
      } else if (lastActiveDateKey) {
        gapDays = daysBetween(lastActiveDateKey, d.dateKey);
        redScore = Math.min(100, Math.round(gapDays * 18));
      }
    }

    points.push({
      dateKey: d.dateKey,
      active,
      workoutsCompleted: d.workoutsCompleted,
      volume: totalVolume(d),
      greenScore,
      redScore,
      gapDays,
      pushReps: push.reps,
      pullReps: pull.reps,
      pushTimeSec: push.timeSec,
      pullTimeSec: pull.timeSec,
      avgRpe: d.avgRpe,
      hypertrophyScore,
      maxLevel: d.maxLevel,
      prHits: d.prHits,
      eliteSession: (d.eliteWorkoutsCompleted ?? 0) > 0,
      recencyWeight: dailies.length - i,
    });
  }

  return points;
}

export function computePRChangesFromSets(
  sets: LogSet[],
  prState: Map<string, number>,
): PRChangeLike[] {
  const bestByExercise = new Map<string, { metric: "reps" | "time_sec"; value: number }>();
  for (const s of sets) {
    const prior = bestByExercise.get(s.exerciseId);
    if (!prior || s.value > prior.value) {
      bestByExercise.set(s.exerciseId, { metric: s.metric, value: s.value });
    }
  }

  const changes: PRChangeLike[] = [];
  for (const [exerciseId, best] of bestByExercise) {
    if (best.value <= 0) continue;
    const previous = prState.get(exerciseId) ?? null;
    if (previous != null && best.value <= previous) continue;
    changes.push({
      exerciseId,
      metric: best.metric,
      previous,
      current: best.value,
    });
    prState.set(exerciseId, best.value);
  }
  return changes;
}

async function clearWalletRollups(accountId: string): Promise<void> {
  const deleteKeys = new Set<string>();
  for (const dateKey of dateKeysForRange(120)) {
    deleteKeys.add(dailyKey(accountId, dateKey));
  }

  const logPrefixes = [
    `cali:user:${accountId}:log:`,
    `elite:user:${accountId}:log:`,
  ];
  for (const prefix of logPrefixes) {
    try {
      const logs: any[] = await kv.getByPrefix(prefix) ?? [];
      for (const log of logs) {
        if (!log?.dateKey || !log?.workoutId) continue;
        deleteKeys.add(wcontribKey(accountId, log.dateKey, log.workoutId));
      }
    } catch { /* ignore */ }
  }

  if (deleteKeys.size > 0) {
    await kv.mdel(Array.from(deleteKeys));
  }
}

async function loadPlanForBackfill(
  accountId: string,
  workoutId: string,
  source: "cali" | "elite",
): Promise<PlanLike | null> {
  const key = source === "elite"
    ? `elite:user:${accountId}:workout:${workoutId}`
    : `cali:user:${accountId}:workout:${workoutId}`;
  try {
    const raw: any = await kv.get(key);
    if (!raw || !Array.isArray(raw.blocks)) return null;
    return {
      level: source === "elite" ? 4 : (typeof raw.level === "number" ? raw.level : 1),
      blocks: raw.blocks,
    };
  } catch {
    return null;
  }
}

export async function backfillAnalyticsForWallet(
  accountId: string,
  lookup: ExerciseLookup,
): Promise<void> {
  const caliLogs: any[] = [];
  const eliteLogs: any[] = [];
  try {
    caliLogs.push(...((await kv.getByPrefix(`cali:user:${accountId}:log:`)) ?? []));
    eliteLogs.push(...((await kv.getByPrefix(`elite:user:${accountId}:log:`)) ?? []));
  } catch (err) {
    console.log(`[CALI-ANALYTICS] backfill log scan failed for ${accountId}: ${err}`);
    return;
  }

  const entries: BackfillLogEntry[] = [];
  for (const log of caliLogs) {
    if (!log?.workoutId || log.accountId !== accountId) continue;
    entries.push({
      workoutId: log.workoutId,
      accountId,
      dateKey: log.dateKey,
      sets: Array.isArray(log.sets) ? log.sets : [],
      completedAt: log.completedAt ?? null,
      updatedAt: log.updatedAt ?? 0,
      source: "cali",
    });
  }
  for (const log of eliteLogs) {
    if (!log?.workoutId || log.accountId !== accountId) continue;
    entries.push({
      workoutId: log.workoutId,
      accountId,
      dateKey: log.dateKey,
      sets: Array.isArray(log.sets) ? log.sets : [],
      completedAt: log.completedAt ?? null,
      updatedAt: log.updatedAt ?? 0,
      source: "elite",
    });
  }

  if (entries.length === 0) return;

  await clearWalletRollups(accountId);

  const deduped = new Map<string, BackfillLogEntry>();
  for (const entry of entries) {
    const key = `${entry.source}|${entry.dateKey}|${entry.workoutId}`;
    const prev = deduped.get(key);
    if (!prev || entry.updatedAt >= prev.updatedAt) deduped.set(key, entry);
  }

  const ordered = Array.from(deduped.values()).sort((a, b) => {
    if (a.dateKey !== b.dateKey) return a.dateKey.localeCompare(b.dateKey);
    return a.updatedAt - b.updatedAt;
  });

  const prState = new Map<string, number>();
  const planCache = new Map<string, PlanLike | null>();

  for (const entry of ordered) {
    if (entry.sets.length === 0) continue;
    const cacheKey = `${entry.source}|${entry.workoutId}`;
    let plan = planCache.get(cacheKey);
    if (plan === undefined) {
      plan = await loadPlanForBackfill(accountId, entry.workoutId, entry.source);
      planCache.set(cacheKey, plan);
    }
    if (!plan) continue;

    const prChanges = computePRChangesFromSets(entry.sets, prState);
    await processLogAnalytics({
      accountId,
      dateKey: entry.dateKey,
      workoutId: entry.workoutId,
      plan,
      sets: entry.sets,
      completed: Boolean(entry.completedAt),
      prHits: prChanges.length,
      lookup,
      source: entry.source,
    });

    for (const change of prChanges) {
      await recordPRHistory({
        accountId,
        change,
        workoutId: entry.workoutId,
        level: plan.level,
      });
    }
  }

  await recomputeSummary(accountId);
}

async function needsHypertrophyRebuild(accountId: string): Promise<boolean> {
  try {
    const raw: any = await kv.get(summaryKey(accountId));
    if (raw && (raw.analyticsSchemaVersion ?? 0) >= ANALYTICS_SCHEMA_VERSION) {
      return false;
    }
  } catch { /* ignore */ }

  const flag: any = await kv.get(backfillFlagKey(accountId));
  if (flag?.version >= ANALYTICS_SCHEMA_VERSION) return false;

  const dailies = await loadDailyRecords(accountId, 90, getTodayKey());
  const setsLogged = dailies.reduce((s, d) => s + d.setsLogged, 0);
  if (setsLogged === 0) return false;

  const withRpe = dailies.reduce((s, d) => s + (d.setsWithRpe ?? 0), 0);
  const hypoSum = dailies.reduce((s, d) => s + (d.hypertrophySignalSum ?? 0), 0);
  const hasEliteFields = dailies.some((d) =>
    (d.eliteWorkoutsCompleted ?? 0) > 0 || (d.eliteSetsLogged ?? 0) > 0,
  );

  if (withRpe > 0 || hypoSum > 0) {
    try {
      const raw: any = await kv.get(summaryKey(accountId));
      if (raw && (raw.analyticsSchemaVersion ?? 0) < ANALYTICS_SCHEMA_VERSION) return true;
    } catch { /* ignore */ }

    // v4 adds elite rollup fields — rebuild if elite logs exist but fields are empty.
    let eliteLogs: any[] = [];
    try {
      eliteLogs = (await kv.getByPrefix(`elite:user:${accountId}:log:`)) ?? [];
    } catch { /* ignore */ }
    const hasEliteLogs = eliteLogs.some((l) => l?.accountId === accountId && Array.isArray(l.sets) && l.sets.length > 0);
    if (hasEliteLogs && !hasEliteFields) return true;
    return false;
  }

  // Rollups missing hypertrophy data — rebuild if logs exist.
  return true;
}

async function needsAnalyticsBackfill(accountId: string): Promise<boolean> {
  if (await needsHypertrophyRebuild(accountId)) return true;

  let caliLogs: any[] = [];
  let eliteLogs: any[] = [];
  try {
    caliLogs = (await kv.getByPrefix(`cali:user:${accountId}:log:`)) ?? [];
    eliteLogs = (await kv.getByPrefix(`elite:user:${accountId}:log:`)) ?? [];
  } catch {
    return false;
  }

  const logs = [...caliLogs, ...eliteLogs].filter(
    (l) => l && l.accountId === accountId && Array.isArray(l.sets) && l.sets.length > 0,
  );
  if (logs.length === 0) return false;

  const totalLogSets = logs.reduce((s, l) => s + l.sets.length, 0);
  const dailies = await loadDailyRecords(accountId, 90, getTodayKey());
  const totalDailySets = dailies.reduce((s, d) => s + d.setsLogged, 0);

  return totalDailySets < totalLogSets * 0.75;
}

export async function maybeBackfillAnalytics(
  accountId: string,
  lookup: ExerciseLookup,
): Promise<void> {
  try {
    const needsRebuild = await needsAnalyticsBackfill(accountId);
    const flag: any = await kv.get(backfillFlagKey(accountId));
    if (flag?.done && !needsRebuild) return;
    if (!needsRebuild) {
      await kv.set(backfillFlagKey(accountId), { done: true, skipped: true, at: Date.now(), version: ANALYTICS_SCHEMA_VERSION });
      return;
    }
    const started = Date.now();
    await backfillAnalyticsForWallet(accountId, lookup);
    await kv.set(backfillFlagKey(accountId), {
      done: true,
      at: Date.now(),
      ms: Date.now() - started,
      version: ANALYTICS_SCHEMA_VERSION,
    });
    console.log(`[CALI-ANALYTICS] backfill complete for ${accountId} in ${Date.now() - started}ms`);
  } catch (err) {
    console.log(`[CALI-ANALYTICS] backfill failed for ${accountId}: ${err}`);
  }
}

async function loadCachedSummary(accountId: string): Promise<StatsSummary | null> {
  try {
    const raw: any = await kv.get(summaryKey(accountId));
    if (raw && typeof raw.athleteScore === "number") return raw as StatsSummary;
  } catch { /* ignore */ }
  return null;
}

export async function buildStatsResponse(
  accountId: string,
  range: "7d" | "30d" | "90d",
  profileLevel: number,
  lookup: ExerciseLookup,
): Promise<{
  summary: StatsSummary;
  sparkline: StatsSparkPoint[];
  sparklinesByRange: Record<StatsRangeKey, StatsSparkPoint[]>;
  dailyActivity: DailyActivityPoint[];
  heatmapDays: HeatmapDayPoint[];
  metricSparklines: MetricSparklines;
  metricSparklinesByRange: Record<StatsRangeKey, MetricSparklines>;
}> {
  await maybeBackfillAnalytics(accountId, lookup);

  const heatmapAnchor = await getLatestRealDateKey(accountId);

  const [cachedSummary, dailies, prEntries] = await Promise.all([
    loadCachedSummary(accountId),
    loadDailyRecords(accountId, 90, heatmapAnchor),
    loadAllPRHistEntries(accountId),
  ]);

  let summary = cachedSummary;
  if (!summary) {
    summary = await recomputeSummary(accountId);
  } else {
    let prCount = summary.prCount ?? 0;
    try {
      const prs = (await kv.getByPrefix(`cali:user:${accountId}:pr:`)) ?? [];
      prCount = prs.filter((p: any) => p && typeof p.value === "number").length;
    } catch { /* ignore */ }
    summary = { ...summary, prCount };
  }

  const streak: StreakLike = { current: summary.streakCurrent, longest: summary.streakLongest };
  const sparklinesByRange = buildSparklinesByRange(dailies, prEntries, streak, profileLevel);
  const sparkline = sparklinesByRange[range];

  const metricSparklinesByRange: Record<StatsRangeKey, MetricSparklines> = {
    "7d": buildMetricSparklines(sparklinesByRange["7d"]),
    "30d": buildMetricSparklines(sparklinesByRange["30d"]),
    "90d": buildMetricSparklines(sparklinesByRange["90d"]),
  };

  return {
    summary,
    sparkline,
    sparklinesByRange,
    dailyActivity: buildDailyActivity(dailies),
    heatmapDays: buildHeatmapDays(dailies),
    metricSparklines: metricSparklinesByRange[range],
    metricSparklinesByRange,
  };
}

export async function buildMovementStats(
  accountId: string,
  limit: number,
  lookup: ExerciseLookup,
): Promise<MovementStat[]> {
  let prs: any[];
  try {
    prs = (await kv.getByPrefix(`cali:user:${accountId}:pr:`)) ?? [];
  } catch {
    return [];
  }

  const stats: MovementStat[] = [];
  const cutoff7d = Date.now() - 7 * 24 * 60 * 60 * 1000;

  for (const pr of prs) {
    if (!pr || typeof pr.exerciseId !== "string") continue;
    const exerciseId = pr.exerciseId;
    let hist: PRHistoryEntry[] = [];
    try {
      const raw: any = await kv.get(prHistKey(accountId, exerciseId));
      if (Array.isArray(raw)) hist = raw as PRHistoryEntry[];
    } catch { /* ignore */ }

    const ex = lookup(exerciseId);
    const series = hist.map((h) => ({
      dateKey: new Date(h.achievedAt).toISOString().slice(0, 10),
      value: h.value,
    }));

    const recent = hist.filter((h) => h.achievedAt >= cutoff7d && h.deltaPct != null);
    const deltaPct7d = recent.length > 0
      ? Math.round(recent.reduce((s, h) => s + (h.deltaPct ?? 0), 0) / recent.length * 10) / 10
      : null;

    stats.push({
      exerciseId,
      name: ex?.name ?? exerciseId,
      category: ex?.category ?? "unknown",
      metric: pr.metric,
      currentValue: pr.value,
      deltaPct7d,
      series,
    });
  }

  stats.sort((a, b) => Math.abs(b.deltaPct7d ?? 0) - Math.abs(a.deltaPct7d ?? 0));
  return stats.slice(0, limit);
}

export async function buildPRHistoryResponse(
  accountId: string,
  exerciseId: string,
  lookup: ExerciseLookup,
): Promise<{ exerciseId: string; name: string; category: string; history: PRHistoryEntry[] } | null> {
  let hist: PRHistoryEntry[] = [];
  try {
    const raw: any = await kv.get(prHistKey(accountId, exerciseId));
    if (Array.isArray(raw)) hist = raw as PRHistoryEntry[];
  } catch {
    return null;
  }
  const ex = lookup(exerciseId);
  return {
    exerciseId,
    name: ex?.name ?? exerciseId,
    category: ex?.category ?? "unknown",
    history: hist,
  };
}

export function parseStatsRange(raw: string | undefined): "7d" | "30d" | "90d" {
  if (raw === "30d" || raw === "90d") return raw;
  return "7d";
}