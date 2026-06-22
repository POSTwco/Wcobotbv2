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
  categories: Record<string, CategoryVolume>;
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
  plan: WorkoutPlan,
  sets: LogSet[],
  completed: boolean,
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

  const plannedSets = countPlannedSets(plan);
  return {
    workoutId,
    setsLogged: sets.length,
    plannedSets,
    completed,
    volumeReps,
    volumeTimeSec,
    rpeSum,
    rpeCount,
    maxLevel: plan.level as 1 | 2 | 3 | 4,
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
    mergeCategoryDelta(daily.categories, c.categories, -1);
  };
  const add = (c: WorkoutDayContrib) => {
    daily.setsLogged += c.setsLogged;
    daily.plannedSets += c.plannedSets;
    daily.volumeReps += c.volumeReps;
    daily.volumeTimeSec += c.volumeTimeSec;
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
    hypertrophy7d: hypertrophyPct,
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

async function avgMovementDelta(accountId: string, days: number): Promise<number> {
  let rows: any[];
  try {
    rows = (await kv.getByPrefix(`cali:user:${accountId}:prhist:`)) ?? [];
  } catch {
    return 0;
  }
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const deltas: number[] = [];
  for (const row of rows) {
    if (!Array.isArray(row)) continue;
    for (const entry of row) {
      if (entry && typeof entry.deltaPct === "number" && entry.achievedAt >= cutoff) {
        deltas.push(Math.max(-20, Math.min(20, entry.deltaPct)));
      }
    }
  }
  if (deltas.length === 0) return 0;
  return deltas.reduce((a, b) => a + b, 0) / deltas.length;
}

// ---------------------------------------------------------------------------
// Write path — called from persistWorkoutLog
// ---------------------------------------------------------------------------

export async function processLogAnalytics(args: {
  accountId: string;
  dateKey: string;
  workoutId: string;
  plan: WorkoutPlan;
  sets: LogSet[];
  completed: boolean;
  prHits: number;
  lookup: ExerciseLookup;
}): Promise<void> {
  const { accountId, dateKey, workoutId, plan, sets, completed, prHits, lookup } = args;
  try {
    const wKey = wcontribKey(accountId, dateKey, workoutId);
    let oldContrib: WorkoutDayContrib | null = null;
    try {
      const raw: any = await kv.get(wKey);
      if (raw && raw.workoutId === workoutId) oldContrib = raw as WorkoutDayContrib;
    } catch { /* ignore */ }

    const newContrib = buildContribFromLog(workoutId, plan, sets, completed, lookup);

    const dKey = dailyKey(accountId, dateKey);
    let daily: DailyStats;
    try {
      const raw: any = await kv.get(dKey);
      daily = raw && raw.dateKey === dateKey ? (raw as DailyStats) : emptyDaily(dateKey);
    } catch {
      daily = emptyDaily(dateKey);
    }

    applyContribDelta(daily, oldContrib, newContrib);
    if (prHits > 0) daily.prHits += prHits;
    daily.updatedAt = Date.now();

    await kv.set(wKey, newContrib);
    await kv.set(dKey, daily);

    await recomputeSummary(accountId, plan.level);
  } catch (err) {
    console.log(`[CALI-ANALYTICS] processLogAnalytics failed for ${accountId}: ${err}`);
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
    : null;

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

async function recomputeSummary(accountId: string, profileLevel: number): Promise<StatsSummary> {
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

function sparklineFromDailies(dailies: DailyStats[], streak: StreakLike, profileLevel: number): StatsSparkPoint[] {
  const points: StatsSparkPoint[] = [];
  for (let i = 0; i < dailies.length; i++) {
    const slice = dailies.slice(0, i + 1);
    const partial = computeScores(slice, streak, profileLevel, 0, null);
    points.push({
      dateKey: dailies[i].dateKey,
      athleteScore: partial.athleteScore,
      movementIndex: partial.movementIndex,
      volume: totalVolume(dailies[i]),
    });
  }
  return points;
}

export async function buildStatsResponse(
  accountId: string,
  range: "7d" | "30d" | "90d",
  profileLevel: number,
): Promise<{ summary: StatsSummary; sparkline: StatsSparkPoint[] }> {
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;

  let summary: StatsSummary | null = null;
  try {
    const raw: any = await kv.get(summaryKey(accountId));
    if (raw && typeof raw.athleteScore === "number") summary = raw as StatsSummary;
  } catch { /* ignore */ }

  if (!summary) {
    summary = await recomputeSummary(accountId, profileLevel);
  }

  const dailies = await loadDailyRecords(accountId, days);
  let streak: StreakLike = { current: summary.streakCurrent, longest: summary.streakLongest };
  const sparkline = sparklineFromDailies(dailies, streak, profileLevel);

  return { summary, sparkline };
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