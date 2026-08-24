/**
 * Shared Share Proof snapshot builder — keeps Cali + Elite cards aligned.
 */

import type { AthleteTier, StatsSummary } from "./cali-analytics-types";

export interface ShareProofSnapshot {
  level: 1 | 2 | 3;
  completedAt: string;
  totalSets: number;
  uniqueExercises: number;
  /** Lifetime / total PR count from analytics */
  prCount: number;
  /** PRs newly set in this workout (optional badge) */
  prHitThisSession: number;
  athleteScore: number;
  athleteTier: string;
  /** Current consecutive training-day streak */
  streak: number;
  workoutId?: string;
  topMoves?: string[];
  pushCount?: number;
  pullCount?: number;
}

export function buildShareProofSnapshot(args: {
  level: 1 | 2 | 3;
  completedAt: string;
  totalSets: number;
  uniqueExercises: number;
  topMoves?: string[];
  pushCount?: number;
  pullCount?: number;
  workoutId?: string;
  /** Prefer stats.summary when available */
  statsSummary?: Partial<StatsSummary> | null;
  /** Fallback streak from log response */
  streakFromLog?: number | null;
  /** Session PR hits from log */
  prChangesLength?: number;
  /** Elite log may return these directly */
  prCountOverride?: number | null;
  athleteScoreOverride?: number | null;
  athleteTierOverride?: string | null;
}): ShareProofSnapshot {
  const summary = args.statsSummary;
  const streakFromStats =
    typeof summary?.streakCurrent === "number" ? summary.streakCurrent : null;
  const prFromStats = typeof summary?.prCount === "number" ? summary.prCount : null;

  const streak =
    streakFromStats ??
    (typeof args.streakFromLog === "number" ? args.streakFromLog : 0);

  const prCount =
    prFromStats ??
    (typeof args.prCountOverride === "number" ? args.prCountOverride : 0);

  const athleteScore =
    typeof summary?.athleteScore === "number"
      ? summary.athleteScore
      : typeof args.athleteScoreOverride === "number"
        ? args.athleteScoreOverride
        : 0;

  const athleteTier =
    (summary?.athleteTier as AthleteTier | undefined) ||
    args.athleteTierOverride ||
    "UNRANKED";

  return {
    level: args.level,
    completedAt: args.completedAt,
    totalSets: Math.max(0, args.totalSets),
    uniqueExercises: Math.max(0, args.uniqueExercises),
    prCount: Math.max(0, prCount),
    prHitThisSession: Math.max(0, args.prChangesLength ?? 0),
    athleteScore: Math.max(0, athleteScore),
    athleteTier: String(athleteTier).toUpperCase(),
    streak: Math.max(0, streak),
    workoutId: args.workoutId,
    topMoves: args.topMoves?.slice(0, 6) ?? [],
    pushCount: args.pushCount ?? 0,
    pullCount: args.pullCount ?? 0,
  };
}

/** Merge proof props without letting `undefined` clobber real zeros/strings. */
export function mergeProofData<T extends Record<string, unknown>>(
  base: T,
  patch?: Partial<T> | null,
): T {
  if (!patch) return { ...base };
  const out: Record<string, unknown> = { ...base };
  for (const [k, v] of Object.entries(patch)) {
    if (v !== undefined) out[k] = v;
  }
  return out as T;
}
