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
  categories: Record<string, CategoryVolume>;
  updatedAt: number;
}

interface WorkoutDayContrib {
  workoutId: string;
  setsLogged: number;
  plannedSets: number;
  completed: boolean;
  volumeReps: number;
  volumeTimeSec: number;
  rpeSum: number;
  rpeCount: number;
  maxLevel: 1 | 2 | 3 | 4;
  prHits: number;
  categories: Record<string, CategoryVolume>;
}

export interface DailyActivityPoint {
  dateKey: string;
  workoutsCompleted: number;
  volume: number;
}

export interface MetricSparklines {
  consistency: number[];
  effort: number[];
  movement: number[];
  volume: number[];
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
}

export interface StatsSparkPoint {
  dateKey: string;
  athleteScore: number;
  movementIndex: number;
  volume: number;
  consistency: number;
  effort: number;
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
  rpe?: number;
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
  return `cali:user:${accountId}:stats:backfill:v1`;
}

/** Baseline positive signal when a wallet sets its first PR (no prior record). */
const FIRST_PR_DELTA_PCT = 5;

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
    categories: {},
    updatedAt: Date.now(),
  };
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
  return {
    workoutId,
    setsLogged: sets.length,
    plannedSets,
    completed,
    volumeReps,
    volumeTimeSec,
    rpeSum,
    rpeCount,
    maxLevel: Math.min(4, Math.max(1, plan.level)) as 1 | 2 | 3 | 4,
    prHits,
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
    mergeCategoryDelta(daily.categories, c.categories, -1);
  };
  const add = (c: WorkoutDayContrib) => {
    daily.setsLogged += c.setsLogged;
    daily.plannedSets += c.plannedSets;
    daily.volumeReps += c.volumeReps;
    daily.volumeTimeSec += c.volumeTimeSec;
    daily.prHits += c.prHits;
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

  daily.rpeSum = (daily.rpeSum ?? 0) - (oldC?.rpeSum ?? 0) + newC.rpeSum;
  daily.rpeCount = (daily.rpeCount ?? 0) - (oldC?.rpeCount ?? 0) + newC.rpeCount;
  daily.avgRpe = daily.rpeCount > 0
    ? Math.round((daily.rpeSum / daily.rpeCount) * 10) / 10
    : null;

  daily.setCompletionPct = daily.plannedSets > 0
    ? Math.min(100, Math.round((daily.setsLogged / daily.plannedSets) * 100))
    : (daily.setsLogged > 0 ? 100 : 0);
}

function dateKeysForRange(days: number): string[] {
  const keys: string[] = [];
  const d = new Date();
  for (let i = 0; i < days; i++) {
    const copy = new Date(d);
    copy.setUTCDate(copy.getUTCDate() - i);
    keys.push(copy.toISOString().slice(0, 10));
  }
  return keys.reverse();
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

function computeScores(
  dailies: DailyStats[],
  streak: StreakLike,
  profileLevel: number,
  movementDeltaAvg: number,
  prevSummary: StatsSummary | null,
): StatsSummary {
  const last7 = dailies.slice(-7);
  const last30 = dailies.slice(-30);

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
    : 7;
  const rpeScore = avgRpe >= 6 && avgRpe <= 9
    ? 100
    : Math.max(30, 100 - Math.abs(avgRpe - 7.5) * 12);
  const avgLevel = activeDays.length > 0
    ? activeDays.reduce((s, d) => s + d.maxLevel, 0) / activeDays.length
    : profileLevel;
  const levelScore = Math.min(100, Math.round((avgLevel / 3) * 100));
  const effort = Math.min(100, Math.round(avgCompletion * 0.5 + rpeScore * 0.25 + levelScore * 0.25));

  const volThisWeek = weekVolume(dailies, dailies.length - 1);
  const volLastWeek = dailies.length >= 8
    ? weekVolume(dailies, dailies.length - 8)
    : 0;
  const hypertrophyPct = volLastWeek > 0
    ? Math.round(((volThisWeek - volLastWeek) / volLastWeek) * 1000) / 10
    : (volThisWeek > 0 ? 100 : 0);

  const movementIndex = Math.min(100, Math.max(0, Math.round(50 + movementDeltaAvg)));

  const athleteScore = Math.min(100, Math.round(
    consistency * 0.35 + effort * 0.30 + movementIndex * 0.25 + streakBonus * 0.10,
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
  };
}

async function loadDailyRecords(accountId: string, days: number): Promise<DailyStats[]> {
  const keys = dateKeysForRange(days);
  const out: DailyStats[] = [];
  for (const dateKey of keys) {
    try {
      const raw: any = await kv.get(dailyKey(accountId, dateKey));
      if (raw && raw.dateKey === dateKey) {
        out.push(raw as DailyStats);
      } else {
        out.push(emptyDaily(dateKey));
      }
    } catch {
      out.push(emptyDaily(dateKey));
    }
  }
  return out;
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
): number {
  const deltas: number[] = [];
  for (const entry of entries) {
    if (entry.achievedAt < windowStart || entry.achievedAt > windowEnd) continue;
    if (typeof entry.deltaPct !== "number") continue;
    deltas.push(Math.max(-20, Math.min(20, entry.deltaPct)));
  }
  if (deltas.length === 0) return 0;
  return deltas.reduce((a, b) => a + b, 0) / deltas.length;
}

async function avgMovementDelta(accountId: string, days: number): Promise<number> {
  const entries = await loadAllPRHistEntries(accountId);
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return movementDeltaInWindow(entries, cutoff, Date.now());
}

async function loadProfileLevel(accountId: string, fallback = 1): Promise<number> {
  try {
    const raw: any = await kv.get(`cali:user:${accountId}:profile`);
    if (raw && typeof raw.level === "number") return raw.level;
  } catch { /* ignore */ }
  return fallback;
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
}): Promise<{ ok: boolean }> {
  const { accountId, dateKey, workoutId, plan, sets, completed, prHits, lookup } = args;
  try {
    const wKey = wcontribKey(accountId, dateKey, workoutId);
    let oldContrib: WorkoutDayContrib | null = null;
    try {
      const raw: any = await kv.get(wKey);
      if (raw && raw.workoutId === workoutId) {
        oldContrib = raw as WorkoutDayContrib;
        if (typeof oldContrib.prHits !== "number") oldContrib.prHits = 0;
      }
    } catch { /* ignore */ }

    const newContrib = buildContribFromLog(workoutId, plan, sets, completed, prHits, lookup);

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
  const dailies = await loadDailyRecords(accountId, 90);
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

async function sparklineFromDailies(
  accountId: string,
  dailies: DailyStats[],
  streak: StreakLike,
  profileLevel: number,
): Promise<StatsSparkPoint[]> {
  const prEntries = await loadAllPRHistEntries(accountId);
  const points: StatsSparkPoint[] = [];
  for (let i = 0; i < dailies.length; i++) {
    const slice = dailies.slice(0, i + 1);
    const dayEnd = endOfDayMs(dailies[i].dateKey);
    const windowStart = dayEnd - 30 * 24 * 60 * 60 * 1000;
    const movementDelta = movementDeltaInWindow(prEntries, windowStart, dayEnd);
    const partial = computeScores(slice, streak, profileLevel, movementDelta, null);
    points.push({
      dateKey: dailies[i].dateKey,
      athleteScore: partial.athleteScore,
      movementIndex: partial.movementIndex,
      volume: totalVolume(dailies[i]),
      consistency: partial.consistency,
      effort: partial.effort,
    });
  }
  return points;
}

function buildMetricSparklines(sparkline: StatsSparkPoint[]): MetricSparklines {
  return {
    consistency: sparkline.map((p) => p.consistency),
    effort: sparkline.map((p) => p.effort),
    movement: sparkline.map((p) => p.movementIndex),
    volume: sparkline.map((p) => p.volume),
  };
}

function buildDailyActivity(dailies: DailyStats[]): DailyActivityPoint[] {
  return dailies.map((d) => ({
    dateKey: d.dateKey,
    workoutsCompleted: d.workoutsCompleted,
    volume: totalVolume(d),
  }));
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

async function needsAnalyticsBackfill(accountId: string): Promise<boolean> {
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
  const dailies = await loadDailyRecords(accountId, 90);
  const totalDailySets = dailies.reduce((s, d) => s + d.setsLogged, 0);

  return totalDailySets < totalLogSets * 0.75;
}

export async function maybeBackfillAnalytics(
  accountId: string,
  lookup: ExerciseLookup,
): Promise<void> {
  try {
    const flag: any = await kv.get(backfillFlagKey(accountId));
    if (flag?.done) return;
    if (!(await needsAnalyticsBackfill(accountId))) {
      await kv.set(backfillFlagKey(accountId), { done: true, skipped: true, at: Date.now() });
      return;
    }
    const started = Date.now();
    await backfillAnalyticsForWallet(accountId, lookup);
    await kv.set(backfillFlagKey(accountId), { done: true, at: Date.now(), ms: Date.now() - started });
    console.log(`[CALI-ANALYTICS] backfill complete for ${accountId} in ${Date.now() - started}ms`);
  } catch (err) {
    console.log(`[CALI-ANALYTICS] backfill failed for ${accountId}: ${err}`);
  }
}

export async function buildStatsResponse(
  accountId: string,
  range: "7d" | "30d" | "90d",
  profileLevel: number,
  lookup: ExerciseLookup,
): Promise<{
  summary: StatsSummary;
  sparkline: StatsSparkPoint[];
  dailyActivity: DailyActivityPoint[];
  metricSparklines: MetricSparklines;
}> {
  await maybeBackfillAnalytics(accountId, lookup);

  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;

  let summary: StatsSummary | null = null;
  try {
    const raw: any = await kv.get(summaryKey(accountId));
    if (raw && typeof raw.athleteScore === "number") summary = raw as StatsSummary;
  } catch { /* ignore */ }

  if (!summary) {
    summary = await recomputeSummary(accountId);
  }

  const dailies = await loadDailyRecords(accountId, days);
  const streak: StreakLike = { current: summary.streakCurrent, longest: summary.streakLongest };
  const sparkline = await sparklineFromDailies(accountId, dailies, streak, profileLevel);

  return {
    summary,
    sparkline,
    dailyActivity: buildDailyActivity(dailies),
    metricSparklines: buildMetricSparklines(sparkline),
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