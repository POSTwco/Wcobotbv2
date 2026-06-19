/**
 * Cali Workout Screen — premium coaching experience.
 * Orchestrates exercise cards, progress tracking, coach motivation, and celebrations.
 */

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router";
import {
  ArrowLeft, RefreshCw, Loader2, AlertCircle, CheckCircle2, Anchor, Info, Trophy,
} from "lucide-react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { useCaliSession } from "./cali-context";
import { CaliWorkoutProgress } from "./cali-workout-progress";
import { CaliExerciseCard } from "./cali-exercise-card";
import { CaliCoachToast } from "./cali-coach-toast";
import { CaliWorkoutCelebration } from "./cali-workout-celebration";
import { CaliMotionRail } from "./cali-motion-rail";
import { getCoachMessage } from "../../lib/cali-coach-messages";
import { getAvatarGender, setAvatarGender, type AvatarGender } from "../../lib/cali-avatar-prefs";
import {
  xpForSet, xpForBlock, xpForPr, xpForWorkoutComplete,
} from "../../lib/cali-workout-xp";

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

interface BlockItem {
  exerciseId: string;
  name: string;
  category: string;
  pattern: string;
  sets: number;
  target: { metric: "reps" | "time_sec"; low: number; high: number };
  unilateral: boolean;
  tempoHint?: string;
  cues: string[];
  equipment: string;
  benefit?: string;
  scalingDownName?: string;
  scalingUpName?: string;
}
interface Block {
  name: string;
  kind: string;
  restSec: number;
  items: BlockItem[];
}
interface SwapMeta {
  totalSwaps: number;
  slotSwaps: Record<string, number>;
}

interface Plan {
  workoutId: string;
  level: 1 | 2 | 3;
  equipment: string[];
  libraryVersion: string;
  seed: string;
  createdAt: number;
  estimatedDurationSec: number;
  blocks: Block[];
  swapMeta?: SwapMeta;
}

const MAX_SWAPS_PER_WORKOUT = 5;
const MAX_SWAPS_PER_SLOT = 3;

function swapLimitsFor(plan: Plan, blockIndex: number, itemIndex: number) {
  const meta = plan.swapMeta ?? { totalSwaps: 0, slotSwaps: {} };
  const sk = `${blockIndex}:${itemIndex}`;
  return {
    workoutRemaining: Math.max(0, MAX_SWAPS_PER_WORKOUT - meta.totalSwaps),
    slotRemaining: Math.max(0, MAX_SWAPS_PER_SLOT - (meta.slotSwaps[sk] ?? 0)),
  };
}
interface LoggedSet {
  blockIndex: number;
  itemIndex: number;
  setIndex: number;
  value: number;
  rpe?: number;
  note?: string;
}

function countTotalSets(plan: Plan): number {
  return plan.blocks.reduce((sum, b) => sum + b.items.reduce((s, it) => s + it.sets, 0), 0);
}

function miniConfetti() {
  confetti({
    particleCount: 40, spread: 60, startVelocity: 25,
    origin: { x: 0.5, y: 0.7 }, colors: ["#4274B9", "#D4A843", "#6AA3E0"],
    zIndex: 99999, ticks: 50,
  });
}

export function CaliWorkout() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const cali = useCaliSession();

  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actuals, setActuals] = useState<Record<string, { value: string; rpe: string; note: string }>>({});
  const [loggedSets, setLoggedSets] = useState<Set<string>>(new Set());
  const [completedBlocks, setCompletedBlocks] = useState<Set<number>>(new Set());
  const [savingSet, setSavingSet] = useState<string | null>(null);
  const lastSavedRef = useRef<Record<string, string>>({});
  const [completing, setCompleting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [anchoring, setAnchoring] = useState(false);
  const [swappingSlot, setSwappingSlot] = useState<string | null>(null);

  const [xp, setXp] = useState(0);
  const [coachMessage, setCoachMessage] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [finalStreak, setFinalStreak] = useState(0);
  const [streak, setStreak] = useState(0);

  const [activeBlock, setActiveBlock] = useState(0);
  const [focusedItemIndex, setFocusedItemIndex] = useState(0);
  const [avatarGender, setAvatarGenderState] = useState<AvatarGender>(() => getAvatarGender());

  const handleGenderChange = useCallback((g: AvatarGender) => {
    setAvatarGenderState(g);
    setAvatarGender(g);
  }, []);

  useEffect(() => {
    if (!cali.sessionToken || !id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const [workoutRes, streakRes] = await Promise.all([
        api.cali.getWorkout(cali.sessionToken!, id),
        api.cali.streak(cali.sessionToken!),
      ]);
      if (cancelled) return;
      if (workoutRes.success && workoutRes.data) {
        setPlan(workoutRes.data.workout);
      } else {
        cali.handleAuthError(workoutRes.code);
        setError(workoutRes.error || "Workout not found.");
      }
      if (streakRes.success && streakRes.data) {
        setStreak(streakRes.data.streak.current);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id, cali.sessionToken, cali.handleAuthError]);

  const setsTotal = useMemo(() => (plan ? countTotalSets(plan) : 0), [plan]);
  const setsLogged = loggedSets.size;

  const checkBlockComplete = useCallback((blockIdx: number, newLogged: Set<string>) => {
    if (!plan || completedBlocks.has(blockIdx)) return;
    const block = plan.blocks[blockIdx];
    let allDone = true;
    for (let i = 0; i < block.items.length; i++) {
      for (let s = 0; s < block.items[i].sets; s++) {
        if (!newLogged.has(`${blockIdx}|${i}|${s}`)) { allDone = false; break; }
      }
      if (!allDone) break;
    }
    if (allDone) {
      setCompletedBlocks((prev) => new Set([...prev, blockIdx]));
      setXp((x) => x + xpForBlock());
      setCoachMessage(getCoachMessage("blockComplete"));
      miniConfetti();
    }
  }, [plan, completedBlocks]);

  const logSet = useCallback(
    async (key: string, b: number, i: number, s: number) => {
      if (!cali.sessionToken || !plan) return;
      const a = actuals[key];
      if (!a) return;
      const valueNum = Number(a.value);
      if (!Number.isFinite(valueNum) || valueNum <= 0) return;

      const signature = `${a.value}|${a.rpe}|${a.note}`;
      if (lastSavedRef.current[key] === signature && loggedSets.has(key)) return;

      setSavingSet(key);
      const setBody: LoggedSet = { blockIndex: b, itemIndex: i, setIndex: s, value: valueNum };
      const rpeNum = Number(a.rpe);
      if (a.rpe && Number.isFinite(rpeNum) && rpeNum >= 1 && rpeNum <= 10) setBody.rpe = rpeNum;
      if (a.note?.trim()) setBody.note = a.note.trim();

      const res = await api.cali.logSets(cali.sessionToken, plan.workoutId, [setBody]);
      setSavingSet(null);

      if (res.success && res.data) {
        lastSavedRef.current[key] = signature;
        const wasNew = !loggedSets.has(key);
        const newLogged = new Set(loggedSets);
        newLogged.add(key);
        setLoggedSets(newLogged);

        if (wasNew) {
          setXp((x) => x + xpForSet());
          setCoachMessage(getCoachMessage("setLogged"));
        }

        for (const change of res.data.prChanges ?? []) {
          setXp((x) => x + xpForPr());
          setCoachMessage(getCoachMessage("prHit"));
          toast.success(
            change.previous
              ? `New PR! ${change.current} (was ${change.previous})`
              : `First record: ${change.current}`,
            { icon: <Trophy className="w-4 h-4" /> },
          );
        }

        checkBlockComplete(b, newLogged);
      } else {
        cali.handleAuthError(res.code);
        toast.error(res.error || "Couldn't save set.");
      }
    },
    [actuals, plan, cali, loggedSets, checkBlockComplete],
  );

  const onComplete = async () => {
    if (!cali.sessionToken || !plan) return;
    setCompleting(true);
    const completedAt = new Date().toISOString();
    const bulk: LoggedSet[] = [];
    for (const [key, a] of Object.entries(actuals)) {
      const [b, i, s] = key.split("|").map(Number);
      const v = Number(a.value);
      if (!Number.isFinite(v) || v <= 0) continue;
      const set: LoggedSet = { blockIndex: b, itemIndex: i, setIndex: s, value: v };
      const rpe = Number(a.rpe);
      if (a.rpe && Number.isFinite(rpe) && rpe >= 1 && rpe <= 10) set.rpe = rpe;
      if (a.note?.trim()) set.note = a.note.trim();
      bulk.push(set);
    }
    const res = await api.cali.logSets(cali.sessionToken, plan.workoutId, bulk, {
      completed: true,
      completedAt,
    });
    setCompleting(false);
    if (!res.success || !res.data) {
      cali.handleAuthError(res.code);
      toast.error(res.error || "Couldn't complete the workout.");
      return;
    }
    for (const k of Object.keys(actuals)) {
      lastSavedRef.current[k] = `${actuals[k].value}|${actuals[k].rpe}|${actuals[k].note}`;
    }
    const newStreak = res.data.streak?.current ?? 0;
    setStreak(newStreak);
    setFinalStreak(newStreak);
    setXp((x) => x + xpForWorkoutComplete());
    setShowCelebration(true);
  };

  const onAnchor = async () => {
    if (!cali.sessionToken || !plan) return;
    setAnchoring(true);
    const res = await api.cali.anchor(cali.sessionToken, plan.workoutId);
    setAnchoring(false);
    if (res.success) {
      toast.success("Anchored on Hedera!", { icon: <Anchor className="w-4 h-4" /> });
    } else if (res.code === "ANCHOR_UNAVAILABLE" || res.code === "ANCHOR_NOT_IMPLEMENTED") {
      toast.message("Anchoring coming soon — your workout is saved.", { icon: <Info className="w-4 h-4" /> });
    } else {
      cali.handleAuthError(res.code);
      toast.error(res.error || "Anchor failed.");
    }
  };

  const clearSlotLogState = useCallback((blockIndex: number, itemIndex: number) => {
    const prefix = `${blockIndex}|${itemIndex}|`;
    setActuals((prev) => {
      const next = { ...prev };
      for (const k of Object.keys(next)) {
        if (k.startsWith(prefix)) delete next[k];
      }
      return next;
    });
    setLoggedSets((prev) => {
      const next = new Set(prev);
      for (const k of prev) {
        if (k.startsWith(prefix)) next.delete(k);
      }
      return next;
    });
    for (const k of Object.keys(lastSavedRef.current)) {
      if (k.startsWith(prefix)) delete lastSavedRef.current[k];
    }
    setCompletedBlocks((prev) => {
      const next = new Set(prev);
      next.delete(blockIndex);
      return next;
    });
  }, []);

  const onSwapExercise = async (blockIndex: number, itemIndex: number) => {
    if (!cali.sessionToken || !plan) return;
    const slotKey = `${blockIndex}|${itemIndex}`;
    const limits = swapLimitsFor(plan, blockIndex, itemIndex);
    if (limits.workoutRemaining <= 0 || limits.slotRemaining <= 0) return;

    setSwappingSlot(slotKey);
    const res = await api.cali.swapExercise(cali.sessionToken, plan.workoutId, blockIndex, itemIndex);
    setSwappingSlot(null);

    if (!res.success || !res.data) {
      cali.handleAuthError(res.code);
      toast.error(res.error || "Couldn't swap exercise.");
      return;
    }

    setPlan(res.data.workout as Plan);
    clearSlotLogState(blockIndex, itemIndex);
    setFocusedItemIndex(itemIndex);
    setCoachMessage("Exercise swapped — similar category and difficulty. Sets reset for this move.");
    toast.success(`Swapped to ${res.data.swappedItem?.name ?? "new exercise"}`, {
      description: `${res.data.limits.workoutRemaining} workout swaps left`,
    });
  };

  const onRegenerate = async () => {
    if (!cali.sessionToken || !plan) return;
    setRegenerating(true);
    const res = await api.cali.regenerate(cali.sessionToken, plan.workoutId);
    setRegenerating(false);
    if (!res.success || !res.data) {
      cali.handleAuthError(res.code);
      toast.error(res.error || "Couldn't regenerate.");
      return;
    }
    navigate(`/calisthenics/workout/${encodeURIComponent(res.data.workout.workoutId)}`);
  };

  const estMin = useMemo(() => Math.round((plan?.estimatedDurationSec ?? 0) / 60), [plan]);

  const activeItems = plan?.blocks[activeBlock]?.items ?? [];
  const focusedItem = activeItems[focusedItemIndex] ?? activeItems[0] ?? null;
  const workoutSwapsLeft = plan ? swapLimitsFor(plan, activeBlock, 0).workoutRemaining : 0;

  useEffect(() => {
    setFocusedItemIndex(0);
  }, [activeBlock]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#6AA3E0]" />
      </div>
    );
  }
  if (error || !plan) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <AlertCircle className="w-8 h-8 text-red-300 mx-auto mb-3" />
        <p className="text-sm text-[#A3B0C2]" style={dmSans}>{error ?? "Workout unavailable."}</p>
        <Link to="/calisthenics" className="text-xs text-[#6AA3E0] hover:underline mt-4 inline-block">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-10 space-y-5 pb-32">
      <div className="flex items-center justify-between">
        <Link to="/calisthenics" className="flex items-center gap-1.5 text-xs text-[#8494A7] hover:text-[#E8ECF0]" style={dmSans}>
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </Link>
        <span className="text-[0.65rem] text-[#8494A7]" style={dmSans}>
          L{plan.level} · ~{estMin} min · {workoutSwapsLeft} swap{workoutSwapsLeft === 1 ? "" : "s"} left
        </span>
      </div>

      <CaliWorkoutProgress
        setsLogged={setsLogged}
        setsTotal={setsTotal}
        xp={xp}
        blockIndex={activeBlock}
        blockTotal={plan.blocks.length}
        blockName={plan.blocks[activeBlock]?.name ?? ""}
        level={plan.level}
        streak={streak}
      />

      {/* Block tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {plan.blocks.map((block, b) => (
          <button
            key={b}
            onClick={() => setActiveBlock(b)}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-[0.6rem] font-bold tracking-wider transition-all"
            style={{
              ...orbitron,
              background: activeBlock === b ? "rgba(66,116,185,0.2)" : "rgba(255,255,255,0.03)",
              color: activeBlock === b ? "#6AA3E0" : "#8494A7",
              border: activeBlock === b ? "1px solid rgba(66,116,185,0.35)" : "1px solid transparent",
            }}
          >
            {completedBlocks.has(b) ? "✓ " : ""}{block.name}
          </button>
        ))}
      </div>

      {/* Active block: list + right coaching rail */}
      <div className="flex gap-6 items-start">
        <div className="flex-1 min-w-0 space-y-4">
          {activeItems.map((item, i) => {
            const slotLimits = swapLimitsFor(plan, activeBlock, i);
            return (
              <CaliExerciseCard
                key={`${activeBlock}-${i}-${item.exerciseId}`}
                item={item as BlockItem}
                blockIndex={activeBlock}
                itemIndex={i}
                actuals={actuals}
                loggedSets={loggedSets}
                savingSet={savingSet}
                isFocused={focusedItemIndex === i}
                gender={avatarGender}
                onFocus={() => setFocusedItemIndex(i)}
                onChangeActual={(key, patch) =>
                  setActuals((prev) => ({
                    ...prev,
                    [key]: { value: "", rpe: "", note: "", ...prev[key], ...patch },
                  }))
                }
                onLogSet={logSet}
                onSwap={() => onSwapExercise(activeBlock, i)}
                swapping={swappingSlot === `${activeBlock}|${i}`}
                swapsSlotRemaining={slotLimits.slotRemaining}
                swapsWorkoutRemaining={slotLimits.workoutRemaining}
              />
            );
          })}
        </div>

        {focusedItem && (
          <CaliMotionRail
            item={focusedItem as BlockItem}
            gender={avatarGender}
            onGenderChange={handleGenderChange}
          />
        )}
      </div>

      {/* Coach toast */}
      <CaliCoachToast message={coachMessage} onDismiss={() => setCoachMessage(null)} />

      {/* Victory overlay */}
      <CaliWorkoutCelebration
        open={showCelebration}
        xp={xp}
        level={plan.level}
        streak={finalStreak}
        message={getCoachMessage("workoutComplete")}
        onClose={() => setShowCelebration(false)}
      />

      {/* Sticky bottom action bar */}
      <div className="fixed bottom-20 md:bottom-6 left-0 right-0 z-40 px-4" style={{ pointerEvents: "none" }}>
        <div
          className="max-w-5xl mx-auto flex gap-2 p-2 rounded-2xl border"
          style={{
            pointerEvents: "auto",
            background: "rgba(11,17,32,0.92)",
            borderColor: "rgba(66,116,185,0.25)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          <button
            onClick={onRegenerate}
            disabled={regenerating}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold border border-[#4274B9]/25 text-[#A3B0C2] hover:text-white hover:border-[#4274B9]/50 disabled:opacity-60"
            style={dmSans}
          >
            {regenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Regenerate
          </button>
          <button
            onClick={onComplete}
            disabled={completing}
            className="flex-[2] flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-bold disabled:opacity-60"
            style={{
              ...dmSans,
              background: "linear-gradient(135deg, #4274B9, #3563A0)",
              color: "#fff",
              boxShadow: "0 4px 18px rgba(66,116,185,0.4)",
            }}
          >
            {completing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            Complete Workout
          </button>
          <button
            onClick={onAnchor}
            disabled={anchoring}
            className="flex items-center justify-center gap-1.5 px-3 py-3 rounded-xl text-xs font-bold border border-[#D4A843]/25 text-[#D4A843] hover:bg-[#D4A843]/8 disabled:opacity-60"
            style={dmSans}
          >
            {anchoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <Anchor className="w-4 h-4" />}
            <span className="hidden sm:inline">Anchor</span>
          </button>
        </div>
      </div>
    </div>
  );
}