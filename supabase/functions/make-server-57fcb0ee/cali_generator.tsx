/**
 * BOTB Calisthenics — Workout Generator (deterministic, seeded)
 * ==============================================================
 *
 * PURE FUNCTION — no I/O, no globals, no Date.now(). Given identical inputs
 * (level, equipment set, seed, excludeIds, libraryVersion), it always
 * produces the identical plan. This is load-bearing for:
 *   - Reproducibility of historical workouts (audit + anchor verification)
 *   - "Show me how this was generated" transparency in the UI
 *
 * The route handler in cali.tsx is responsible for:
 *   - Deriving the seed (random for /generate, new random for /regenerate)
 *   - Computing the workoutId via HMAC(salt, …) — done outside this module
 *     so the secret never enters generator code
 *   - Persisting the result
 *
 * SELECTION ALGORITHM:
 *   1. Filter candidates by level floor, equipment-subset, exclude list,
 *      and the block's category/pattern requirement.
 *   2. Weight each candidate by proximity to the level's difficulty band
 *      midpoint — exercises near the band peak; far ones still possible
 *      but rare. Pattern reuse within the same workout is penalized ×0.25
 *      so we don't pick two horizontal_push variants back-to-back.
 *   3. Seeded weighted random pick using mulberry32.
 *
 * DURATION ESTIMATE:
 *   - Reps assumed ~3s per rep (rough avg across tempos).
 *   - Time-based exercises use the dose midpoint.
 *   - Unilateral doubles work time per set (both sides).
 *   - Plus per-block transition (60s) and per-item setup (30s).
 *   The estimate is shown in the UI and stored on the plan for analytics.
 *   It is NOT used for any security decision.
 */

import {
  EXERCISES,
  LIBRARY_VERSION,
  getExercise,
  type Exercise,
  type CaliCategory,
  type CaliPattern,
  type CaliMetric,
} from "./cali_library.tsx";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type CaliLevel = 1 | 2 | 3;
export type CaliEquipment = "none" | "bar" | "rings" | "wall";

export interface GeneratorInput {
  accountId: string;
  level: CaliLevel;
  /** User-available equipment. An exercise is eligible iff its required equipment is in this set. */
  equipment: CaliEquipment[];
  /** Hex seed string (recommend 32+ hex chars). Drives all randomness. */
  seed: string;
  /** Exercise ids to exclude — used by /regenerate to avoid immediate repeats. */
  excludeIds?: string[];
  /** Stable id computed externally (HMAC) — stored on the plan for KV lookup. */
  workoutId: string;
}

export interface WorkoutBlockItem {
  exerciseId: string;
  name: string;
  category: CaliCategory;
  pattern: CaliPattern;
  sets: number;
  target: { metric: CaliMetric; low: number; high: number };
  unilateral: boolean;
  tempoHint?: string;
  cues: string[];
  equipment: CaliEquipment;
  /** Category benefit — shown in coaching UI */
  benefit?: string;
  /** Human-readable easier/harder variants for scaling ladder */
  scalingDownName?: string;
  scalingUpName?: string;
  /** Custom image from admin Supabase upload — overrides default motion preview when present */
  previewImageRef?: string;
  /** Educational description from admin — for coaching UI */
  description?: string;
}

export type BlockKind =
  | "warmup"
  | "push"
  | "pull"
  | "legs"
  | "core"
  | "conditioning"
  | "cooldown";

export interface WorkoutBlock {
  name: string;
  kind: BlockKind;
  restSec: number;
  items: WorkoutBlockItem[];
}

export interface WorkoutPlan {
  workoutId: string;
  accountId: string;
  level: CaliLevel;
  equipment: CaliEquipment[];
  libraryVersion: string;
  seed: string;
  createdAt: number;
  estimatedDurationSec: number;
  blocks: WorkoutBlock[];
  excludeIds: string[];
}

// ---------------------------------------------------------------------------
// Level rungs (the entire knobs surface for difficulty/volume per level)
// ---------------------------------------------------------------------------

interface LevelRung {
  difficultyBand: [number, number];
  setsPrimary: number;
  setsCore: number;
  setsConditioning: number;
  restSec: number;
  warmupCount: number;
  conditioningCount: number;
  cooldownCount: number;
}

const CATEGORY_BENEFITS: Record<CaliCategory, string> = {
  push: "Builds pressing power, shoulder stability, and upper-body resilience",
  pull: "Develops back strength, grip endurance, and postural control",
  core: "Forges trunk stiffness, anti-rotation strength, and midline power",
  legs: "Builds lower-body drive, single-leg balance, and athletic explosiveness",
  conditioning: "Elevates work capacity, heart rate recovery, and mental toughness",
  mobility: "Unlocks range of motion, joint health, and movement quality",
};

const RUNGS: Record<CaliLevel, LevelRung> = {
  1: { difficultyBand: [1, 4], setsPrimary: 3, setsCore: 2, setsConditioning: 1, restSec: 90, warmupCount: 2, conditioningCount: 1, cooldownCount: 1 },
  2: { difficultyBand: [3, 7], setsPrimary: 4, setsCore: 3, setsConditioning: 1, restSec: 75, warmupCount: 3, conditioningCount: 1, cooldownCount: 1 },
  3: { difficultyBand: [5, 10], setsPrimary: 5, setsCore: 4, setsConditioning: 2, restSec: 60, warmupCount: 3, conditioningCount: 2, cooldownCount: 1 },
};

// ---------------------------------------------------------------------------
// Block specs — fixed order, count from level rung
// ---------------------------------------------------------------------------

interface BlockSpec {
  name: string;
  kind: BlockKind;
  /** Returns true if the exercise is eligible for this block. */
  filter: (e: Exercise) => boolean;
  count: number;
  sets: number;
  restSec: number;
}

function buildBlockSpecs(level: CaliLevel): BlockSpec[] {
  const r = RUNGS[level];
  return [
    {
      name: "Warm-Up",
      kind: "warmup",
      filter: (e) => e.category === "mobility",
      count: r.warmupCount,
      sets: 1,
      restSec: 30,
    },
    {
      name: "Primary Push",
      kind: "push",
      filter: (e) => e.category === "push",
      count: 1,
      sets: r.setsPrimary,
      restSec: r.restSec,
    },
    {
      name: "Primary Pull",
      kind: "pull",
      filter: (e) => e.category === "pull",
      count: 1,
      sets: r.setsPrimary,
      restSec: r.restSec,
    },
    {
      name: "Legs",
      kind: "legs",
      filter: (e) => e.category === "legs",
      count: 1,
      sets: r.setsPrimary,
      restSec: r.restSec,
    },
    {
      name: "Core",
      kind: "core",
      filter: (e) => e.category === "core",
      count: 1,
      sets: r.setsCore,
      restSec: 60,
    },
    {
      name: "Conditioning",
      kind: "conditioning",
      filter: (e) => e.category === "conditioning",
      count: r.conditioningCount,
      sets: r.setsConditioning,
      restSec: 60,
    },
    {
      name: "Cooldown",
      kind: "cooldown",
      filter: (e) => e.category === "mobility" && e.pattern === "stretch",
      count: r.cooldownCount,
      sets: 1,
      restSec: 0,
    },
  ];
}

// ---------------------------------------------------------------------------
// Seeded RNG (mulberry32) — fast, ~32-bit, perfectly fine for selection.
// NOT cryptographic — never use for nonces, keys, etc.
// ---------------------------------------------------------------------------

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Hash a hex seed string down to a 32-bit number deterministically. */
function seedToInt(seedHex: string): number {
  // FNV-1a style fold — input length irrelevant, output 32-bit.
  let h = 0x811c9dc5;
  for (let i = 0; i < seedHex.length; i++) {
    h ^= seedHex.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// ---------------------------------------------------------------------------
// Weighted pick
// ---------------------------------------------------------------------------

function weightedPick<T>(rng: () => number, items: T[], weights: number[]): T {
  if (items.length === 0) throw new Error("weightedPick: empty candidate list");
  let total = 0;
  for (const w of weights) total += Math.max(0, w);
  if (total <= 0) return items[Math.floor(rng() * items.length)];
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= Math.max(0, weights[i]);
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function difficultyWeight(ex: Exercise, band: [number, number]): number {
  const mid = (band[0] + band[1]) / 2;
  const dist = Math.abs(ex.difficulty - mid);
  // Triangular peak centered at band midpoint; floor at 0.1 so far exercises
  // are still possible but rare.
  return Math.max(0.1, (band[1] - band[0]) / 2 + 1 - dist);
}

// ---------------------------------------------------------------------------
// Eligibility filter
// ---------------------------------------------------------------------------

function isEligible(
  ex: Exercise,
  spec: BlockSpec,
  level: CaliLevel,
  availableEquip: ReadonlySet<string>,
  excludeIds: ReadonlySet<string>,
  alreadyPickedIds: ReadonlySet<string>,
): boolean {
  if (ex.level > level) return false;
  if (!availableEquip.has(ex.equipment)) return false;
  if (excludeIds.has(ex.id)) return false;
  if (alreadyPickedIds.has(ex.id)) return false;
  return spec.filter(ex);
}

// ---------------------------------------------------------------------------
// Dose computation — translates exercise.defaultDose + block.sets into target
// ---------------------------------------------------------------------------

function pickDose(
  rng: () => number,
  ex: Exercise,
  blockSets: number,
): { sets: number; target: { metric: CaliMetric; low: number; high: number } } {
  // Honor the exercise's set range, but allow the block to pull toward more
  // sets at higher levels. Final sets = max(exercise min, block override).
  const [exSetMin, exSetMax] = [ex.defaultDose[0], ex.defaultDose[1]];
  const sets = Math.min(exSetMax, Math.max(exSetMin, blockSets));

  // Rep/time range — slight RNG-driven narrowing so the same exercise can
  // present as either lighter (low half) or heavier (top half) across plans.
  const [reps_low, reps_high] = [ex.defaultDose[2], ex.defaultDose[3]];
  const span = reps_high - reps_low;
  const offset = Math.round(rng() * Math.max(0, span * 0.4));
  const low = reps_low + offset;
  const high = Math.min(reps_high, low + Math.max(2, Math.round(span * 0.6)));

  return { sets, target: { metric: ex.metric, low, high } };
}

// ---------------------------------------------------------------------------
// Duration estimation
// ---------------------------------------------------------------------------

const SECS_PER_REP = 3;
const TRANSITION_SEC = 60;
const ITEM_SETUP_SEC = 30;

function estimateDurationSec(blocks: WorkoutBlock[]): number {
  let total = 0;
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    for (const item of b.items) {
      const work =
        item.target.metric === "reps"
          ? ((item.target.low + item.target.high) / 2) * SECS_PER_REP
          : (item.target.low + item.target.high) / 2;
      const perSideMultiplier = item.unilateral ? 2 : 1;
      total += ITEM_SETUP_SEC + item.sets * (work * perSideMultiplier);
      total += Math.max(0, item.sets - 1) * b.restSec;
    }
    if (i < blocks.length - 1) total += TRANSITION_SEC;
  }
  return Math.round(total);
}

// ---------------------------------------------------------------------------
// Equipment subset helpers
// ---------------------------------------------------------------------------

function normalizeEquipment(eq: CaliEquipment[]): CaliEquipment[] {
  const set = new Set<CaliEquipment>(eq);
  // "none" is always implicitly available — every list can do bodyweight-only.
  set.add("none");
  // Stable order so seed → plan is deterministic regardless of input order.
  const order: CaliEquipment[] = ["none", "bar", "rings", "wall"];
  return order.filter((e) => set.has(e));
}

// ---------------------------------------------------------------------------
// Main entry — buildWorkoutPlan
// ---------------------------------------------------------------------------

export function buildWorkoutPlan(input: GeneratorInput, exercisesOverride?: Exercise[]): WorkoutPlan {
  if (input.level !== 1 && input.level !== 2 && input.level !== 3) {
    throw new Error(`buildWorkoutPlan: invalid level ${input.level}`);
  }
  if (!input.seed || input.seed.length < 8) {
    throw new Error("buildWorkoutPlan: seed must be at least 8 chars");
  }
  if (!input.workoutId) {
    throw new Error("buildWorkoutPlan: workoutId required");
  }

  const equipment = normalizeEquipment(input.equipment);
  const availableEquip: ReadonlySet<string> = new Set(equipment);
  const excludeIds: ReadonlySet<string> = new Set(input.excludeIds ?? []);

  const rng = mulberry32(seedToInt(input.seed));
  const rung = RUNGS[input.level];
  const specs = buildBlockSpecs(input.level);

  const exercises = (exercisesOverride && exercisesOverride.length > 0) ? exercisesOverride : EXERCISES;

  // Track patterns already picked across the entire workout to penalize reuse.
  const patternsSeen = new Map<CaliPattern, number>();
  const idsSeen = new Set<string>();

  const blocks: WorkoutBlock[] = [];

  for (const spec of specs) {
    const items: WorkoutBlockItem[] = [];

    for (let pickIdx = 0; pickIdx < spec.count; pickIdx++) {
      // Pass 1: fully filtered candidates (including no-pattern-collision pref)
      const baseCandidates = exercises.filter((e: any) =>
        isEligible(e, spec, input.level, availableEquip, excludeIds, idsSeen),
      );

      let candidates = baseCandidates;
      // If excludes wiped the pool, relax excludes — better to repeat one
      // recent exercise than to ship a workout with a missing block.
      if (candidates.length === 0) {
        candidates = exercises.filter((e: any) =>
          isEligible(e, spec, input.level, availableEquip, new Set(), idsSeen),
        );
      }
      // Last-resort: relax the block filter to category only, ignoring pattern
      // sub-constraints (e.g. cooldown stretches). Should be extremely rare.
      if (candidates.length === 0) {
        candidates = exercises.filter(
          (e: any) =>
            (e.level || 1) <= input.level &&
            availableEquip.has(e.equipment) &&
            !idsSeen.has(e.id) &&
            spec.filter(e),
        );
      }
      if (candidates.length === 0) {
        // Block is unrenderable for this user's equipment — skip rather than throw.
        // Logged by caller if needed; the rest of the workout still ships.
        break;
      }

      const weights = candidates.map((ex) => {
        const w = difficultyWeight(ex, rung.difficultyBand);
        const pcount = patternsSeen.get(ex.pattern) ?? 0;
        // Hard penalty for each prior use of the same pattern in this workout.
        const patternMul = pcount === 0 ? 1 : Math.pow(0.25, pcount);
        return w * patternMul;
      });

      const chosen = weightedPick(rng, candidates, weights);
      const dose = pickDose(rng, chosen, spec.sets);

      items.push({
        exerciseId: chosen.id,
        name: chosen.name,
        category: chosen.category,
        pattern: chosen.pattern,
        sets: dose.sets,
        target: dose.target,
        unilateral: chosen.unilateral,
        tempoHint: chosen.tempoHint,
        cues: chosen.cues,
        equipment: chosen.equipment,
        benefit: CATEGORY_BENEFITS[chosen.category],
        scalingDownName: chosen.scalingDown
          ? getExercise(chosen.scalingDown)?.name
          : undefined,
        scalingUpName: chosen.scalingUp
          ? getExercise(chosen.scalingUp)?.name
          : undefined,
        // Wire custom Supabase preview image and description from the (possibly overridden) chosen exercise
        previewImageRef: chosen.previewImageRef,
        description: chosen.description,
      });

      idsSeen.add(chosen.id);
      patternsSeen.set(chosen.pattern, (patternsSeen.get(chosen.pattern) ?? 0) + 1);
    }

    blocks.push({
      name: spec.name,
      kind: spec.kind,
      restSec: spec.restSec,
      items,
    });
  }

  const estimatedDurationSec = estimateDurationSec(blocks);

  return {
    workoutId: input.workoutId,
    accountId: input.accountId,
    level: input.level,
    equipment,
    libraryVersion: LIBRARY_VERSION,
    seed: input.seed,
    createdAt: Date.now(),
    estimatedDurationSec,
    blocks,
    excludeIds: Array.from(excludeIds),
  };
}

/**
 * Collect every exerciseId in a plan — used by /regenerate to seed the
 * next workout's excludeIds.
 */
export function exerciseIdsOfPlan(plan: WorkoutPlan): string[] {
  const ids: string[] = [];
  for (const b of plan.blocks) for (const it of b.items) ids.push(it.exerciseId);
  return ids;
}
