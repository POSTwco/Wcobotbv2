/**
 * Elite BoB Tech Vault — skill-focused 60–120 min workout generator.
 * Level-4 exercises only. Never called by L1–L3 cali routes.
 */

import {
  LIBRARY_VERSION,
  getEliteExercises,
  getExercise,
  type Exercise,
  type CaliMetric,
  type CaliEquipmentReq,
} from "./cali_library.tsx";

export type EliteSkillTrack = "static" | "ascension" | "dynamic" | "flow" | "auto";
export type EliteDurationTarget = 60 | 90 | 120;
export type CaliEquipment = "none" | "bar" | "rings" | "wall";

export interface EliteGeneratorInput {
  accountId: string;
  skillTrack: EliteSkillTrack;
  durationTarget: EliteDurationTarget;
  equipment: CaliEquipment[];
  seed: string;
  workoutId: string;
  excludeIds?: string[];
}

export interface EliteWorkoutBlockItem {
  exerciseId: string;
  name: string;
  category: Exercise["category"];
  pattern: Exercise["pattern"];
  sets: number;
  target: { metric: CaliMetric; low: number; high: number };
  unilateral: boolean;
  tempoHint?: string;
  cues: string[];
  equipment: CaliEquipmentReq;
  benefit?: string;
  scalingDownName?: string;
  scalingUpName?: string;
  previewImageRef?: string;
  description?: string;
  eliteTrack?: string;
}

export type EliteBlockKind =
  | "warmup"
  | "primer"
  | "skill_main"
  | "skill_drill"
  | "accessory"
  | "cooldown";

export interface EliteWorkoutBlock {
  name: string;
  kind: EliteBlockKind;
  restSec: number;
  items: EliteWorkoutBlockItem[];
}

export interface EliteWorkoutPlan {
  workoutId: string;
  accountId: string;
  zone: "elite";
  skillTrack: Exclude<EliteSkillTrack, "auto">;
  durationTarget: EliteDurationTarget;
  equipment: CaliEquipment[];
  libraryVersion: string;
  seed: string;
  createdAt: number;
  estimatedDurationSec: number;
  blocks: EliteWorkoutBlock[];
  excludeIds: string[];
  custom?: boolean;
}

const TRACK_BENEFITS: Record<Exclude<EliteSkillTrack, "auto">, string> = {
  static: "Static power — 3s clean holds win BoB strength rounds",
  ascension: "Transition power — muscle-up variants and mounts",
  dynamic: "Rotation power — spins and regrabs that move the crowd",
  flow: "Creativity and control — seamless combos and battle flow",
};

const SECS_PER_REP = 3;
const TRANSITION_SEC = 90;
const ITEM_SETUP_SEC = 45;

interface BlockSpec {
  name: string;
  kind: EliteBlockKind;
  count: number;
  sets: number;
  restSec: number;
  filter: (e: Exercise, track: Exclude<EliteSkillTrack, "auto">) => boolean;
}

function blockSpecsFor(track: Exclude<EliteSkillTrack, "auto">, duration: EliteDurationTarget): BlockSpec[] {
  const scale = duration === 60 ? 1 : duration === 90 ? 1.35 : 1.7;
  const mainSets = Math.round(5 * scale);
  const drillSets = Math.round(4 * scale);
  const mainRest = track === "static" ? 150 : track === "dynamic" ? 120 : 90;

  return [
    {
      name: "Elite Warm-Up",
      kind: "warmup",
      count: Math.max(2, Math.round(2 * scale)),
      sets: 1,
      restSec: 30,
      filter: (e) => e.category === "mobility" && e.level < 4,
    },
    {
      name: "Skill Primer",
      kind: "primer",
      count: 2,
      sets: Math.max(3, Math.round(3 * scale)),
      restSec: 75,
      filter: (e, t) => e.level === 4 && e.eliteTrack === t && e.difficulty <= 9,
    },
    {
      name: "Main Skill Work",
      kind: "skill_main",
      count: Math.max(2, Math.round(2 * scale)),
      sets: mainSets,
      restSec: mainRest,
      filter: (e, t) => e.level === 4 && e.eliteTrack === t && e.difficulty >= 8,
    },
    {
      name: "Skill Drills",
      kind: "skill_drill",
      count: Math.max(2, Math.round(3 * scale)),
      sets: drillSets,
      restSec: 90,
      filter: (e, t) => e.level === 4 && e.eliteTrack === t,
    },
    {
      name: "Support Accessory",
      kind: "accessory",
      count: 1,
      sets: Math.max(3, Math.round(3 * scale)),
      restSec: 60,
      filter: (e, t) => {
        if (e.level === 4 && e.eliteTrack === t && e.difficulty <= 8) return true;
        if (e.level < 4 && (t === "static" || t === "ascension") && e.category === "pull") return true;
        if (e.level < 4 && t === "flow" && (e.category === "core" || e.category === "push")) return true;
        return false;
      },
    },
    {
      name: "Elite Cooldown",
      kind: "cooldown",
      count: Math.max(1, Math.round(2 * scale)),
      sets: 1,
      restSec: 20,
      filter: (e) => e.category === "mobility" && e.pattern === "stretch",
    },
  ];
}

function seedToInt(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weightedPick<T>(rng: () => number, items: T[], weights: number[]): T {
  const total = weights.reduce((s, w) => s + Math.max(0, w), 0);
  if (total <= 0) return items[0];
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= Math.max(0, weights[i]);
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function normalizeEquipment(eq: CaliEquipment[]): CaliEquipment[] {
  const set = new Set<CaliEquipment>(eq);
  set.add("none");
  const order: CaliEquipment[] = ["none", "bar", "rings", "wall"];
  return order.filter((e) => set.has(e));
}

function pickDose(rng: () => number, ex: Exercise, blockSets: number) {
  const [exSetMin, exSetMax] = [ex.defaultDose[0], ex.defaultDose[1]];
  const sets = Math.min(exSetMax, Math.max(exSetMin, blockSets));
  const [reps_low, reps_high] = [ex.defaultDose[2], ex.defaultDose[3]];
  const span = reps_high - reps_low;
  const offset = Math.round(rng() * Math.max(0, span * 0.4));
  const low = reps_low + offset;
  const high = Math.min(reps_high, low + Math.max(2, Math.round(span * 0.6)));
  return { sets, target: { metric: ex.metric, low, high } };
}

function estimateDurationSec(blocks: EliteWorkoutBlock[]): number {
  let total = 0;
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    for (const item of b.items) {
      const work =
        item.target.metric === "reps"
          ? ((item.target.low + item.target.high) / 2) * SECS_PER_REP
          : (item.target.low + item.target.high) / 2;
      const perSide = item.unilateral ? 2 : 1;
      total += ITEM_SETUP_SEC + item.sets * (work * perSide);
      total += Math.max(0, item.sets - 1) * b.restSec;
    }
    if (i < blocks.length - 1) total += TRANSITION_SEC;
  }
  return Math.round(total);
}

function exerciseToItem(ex: Exercise, sets: number, rng: () => number, track: Exclude<EliteSkillTrack, "auto">): EliteWorkoutBlockItem {
  const dose = pickDose(rng, ex, sets);
  return {
    exerciseId: ex.id,
    name: ex.name,
    category: ex.category,
    pattern: ex.pattern,
    sets: dose.sets,
    target: dose.target,
    unilateral: ex.unilateral,
    tempoHint: ex.tempoHint,
    cues: ex.cues,
    equipment: ex.equipment,
    benefit: TRACK_BENEFITS[track],
    scalingDownName: ex.scalingDown ? getExercise(ex.scalingDown)?.name : undefined,
    scalingUpName: ex.scalingUp ? getExercise(ex.scalingUp)?.name : undefined,
    description: ex.description,
    eliteTrack: ex.eliteTrack,
  };
}

function resolveTrack(input: EliteGeneratorInput, rng: () => number): Exclude<EliteSkillTrack, "auto"> {
  if (input.skillTrack !== "auto") return input.skillTrack;
  const tracks: Exclude<EliteSkillTrack, "auto">[] = ["static", "ascension", "dynamic", "flow"];
  return tracks[Math.floor(rng() * tracks.length)];
}

export function buildEliteWorkoutPlan(
  input: EliteGeneratorInput,
  exercisesOverride?: Exercise[],
): EliteWorkoutPlan {
  if (!input.seed || input.seed.length < 8) throw new Error("seed required");
  if (!input.workoutId) throw new Error("workoutId required");

  const rng = mulberry32(seedToInt(input.seed));
  const track = resolveTrack(input, rng);
  const equipment = normalizeEquipment(input.equipment);
  const available = new Set(equipment);
  const exclude = new Set(input.excludeIds ?? []);
  const pool = (exercisesOverride?.length ? exercisesOverride : getEliteExercises())
    .filter((e) => e.level === 4 || e.category === "mobility");

  const specs = blockSpecsFor(track, input.durationTarget);
  const idsSeen = new Set<string>();
  const blocks: EliteWorkoutBlock[] = [];

  for (const spec of specs) {
    const items: EliteWorkoutBlockItem[] = [];
    for (let i = 0; i < spec.count; i++) {
      let candidates = pool.filter(
        (e) =>
          !exclude.has(e.id) &&
          !idsSeen.has(e.id) &&
          available.has(e.equipment) &&
          spec.filter(e, track),
      );
      if (candidates.length === 0) {
        candidates = pool.filter(
          (e) => !idsSeen.has(e.id) && available.has(e.equipment) && spec.filter(e, track),
        );
      }
      if (candidates.length === 0) break;

      const weights = candidates.map((ex) => Math.max(0.1, 11 - Math.abs(ex.difficulty - 9)));
      const chosen = weightedPick(rng, candidates, weights);
      items.push(exerciseToItem(chosen, spec.sets, rng, track));
      idsSeen.add(chosen.id);
    }
    if (items.length > 0) {
      blocks.push({ name: spec.name, kind: spec.kind, restSec: spec.restSec, items });
    }
  }

  return {
    workoutId: input.workoutId,
    accountId: input.accountId,
    zone: "elite",
    skillTrack: track,
    durationTarget: input.durationTarget,
    equipment,
    libraryVersion: LIBRARY_VERSION,
    seed: input.seed,
    createdAt: Date.now(),
    estimatedDurationSec: estimateDurationSec(blocks),
    blocks,
    excludeIds: Array.from(exclude),
  };
}

export function exerciseIdsOfElitePlan(plan: EliteWorkoutPlan): string[] {
  const ids: string[] = [];
  for (const b of plan.blocks) for (const it of b.items) ids.push(it.exerciseId);
  return ids;
}

/** Build a custom elite plan from client-supplied exercise slots (validated server-side). */
export function buildCustomElitePlan(args: {
  accountId: string;
  workoutId: string;
  skillTrack: Exclude<EliteSkillTrack, "auto">;
  durationTarget: EliteDurationTarget;
  equipment: CaliEquipment[];
  seed: string;
  slots: Array<{ exerciseId: string; sets: number; restSec?: number }>;
  exercises: Exercise[];
}): EliteWorkoutPlan | { error: string } {
  const byId = new Map(args.exercises.filter((e) => e.level === 4).map((e) => [e.id, e]));
  const items: EliteWorkoutBlockItem[] = [];
  const rng = mulberry32(seedToInt(args.seed));

  for (const slot of args.slots) {
    const ex = byId.get(slot.exerciseId);
    if (!ex) return { error: `Invalid elite exercise: ${slot.exerciseId}` };
    const sets = Math.min(12, Math.max(1, Math.floor(slot.sets)));
    items.push(exerciseToItem(ex, sets, rng, args.skillTrack));
  }
  if (items.length === 0) return { error: "At least one exercise required" };
  if (items.length > 20) return { error: "Max 20 exercises per custom workout" };

  const block: EliteWorkoutBlock = {
    name: "Custom Elite Session",
    kind: "skill_main",
    restSec: 90,
    items,
  };

  return {
    workoutId: args.workoutId,
    accountId: args.accountId,
    zone: "elite",
    skillTrack: args.skillTrack,
    durationTarget: args.durationTarget,
    equipment: normalizeEquipment(args.equipment),
    libraryVersion: LIBRARY_VERSION,
    seed: args.seed,
    createdAt: Date.now(),
    estimatedDurationSec: estimateDurationSec([block]),
    blocks: [block],
    excludeIds: [],
    custom: true,
  };
}