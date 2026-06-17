/**
 * Cali Workout Screen — render a generated plan and let the user log every set.
 *
 * Auto-saves per-set actuals on input blur via api.cali.logSets. PR & streak
 * deltas returned by the server are surfaced as toasts. The "Complete & Anchor"
 * button submits with `completed: true` to bump the streak; the actual
 * anchor stub (slice 8) returns 503 in headcount mode so the UI shows a
 * friendly "coming soon" toast — no broken state.
 */

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router";
import {
  ArrowLeft, RefreshCw, Loader2, AlertCircle, CheckCircle2, Anchor, Info, Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { useCaliSession } from "./cali-context";

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
}
interface Block {
  name: string;
  kind: string;
  restSec: number;
  items: BlockItem[];
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
}
interface LoggedSet {
  blockIndex: number;
  itemIndex: number;
  setIndex: number;
  value: number;
  rpe?: number;
  note?: string;
}

export function CaliWorkout() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const cali = useCaliSession();

  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Local per-set actuals keyed by "block|item|set" → value
  const [actuals, setActuals] = useState<Record<string, { value: string; rpe: string; note: string }>>({});
  // Track which sets have been autosaved so we don't re-POST identical state
  const lastSavedRef = useRef<Record<string, string>>({});
  const [completing, setCompleting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [anchoring, setAnchoring] = useState(false);

  // ── Load workout ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!cali.sessionToken || !id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const res = await api.cali.getWorkout(cali.sessionToken!, id);
      if (cancelled) return;
      if (res.success && res.data) {
        setPlan(res.data.workout);
      } else {
        cali.handleAuthError(res.code);
        setError(res.error || "Workout not found.");
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [id, cali]);

  // ── Autosave a single set on blur ──────────────────────────────────────
  const saveSet = useCallback(
    async (key: string, b: number, i: number, s: number) => {
      if (!cali.sessionToken || !plan) return;
      const a = actuals[key];
      if (!a) return;
      const valueNum = Number(a.value);
      if (!Number.isFinite(valueNum) || valueNum <= 0) return;
      // Avoid double-submitting unchanged sets
      const signature = `${a.value}|${a.rpe}|${a.note}`;
      if (lastSavedRef.current[key] === signature) return;

      const setBody: LoggedSet = {
        blockIndex: b,
        itemIndex: i,
        setIndex: s,
        value: valueNum,
      };
      const rpeNum = Number(a.rpe);
      if (a.rpe && Number.isFinite(rpeNum) && rpeNum >= 1 && rpeNum <= 10) setBody.rpe = rpeNum;
      if (a.note?.trim()) setBody.note = a.note.trim();

      const res = await api.cali.logSets(cali.sessionToken, plan.workoutId, [setBody]);
      if (res.success && res.data) {
        lastSavedRef.current[key] = signature;
        for (const change of res.data.prChanges ?? []) {
          toast.success(
            change.previous
              ? `New PR! ${change.current} (was ${change.previous})`
              : `First record: ${change.current}`,
            { icon: <Trophy className="w-4 h-4" /> },
          );
        }
      } else {
        cali.handleAuthError(res.code);
        toast.error(res.error || "Couldn't save set.");
      }
    },
    [actuals, plan, cali],
  );

  // ── Complete + anchor flow ─────────────────────────────────────────────
  const onComplete = async () => {
    if (!cali.sessionToken || !plan) return;
    setCompleting(true);
    const completedAt = new Date().toISOString();
    // Flush every locally-edited set in one batch, then mark complete
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
    if (res.data.streak) {
      toast.success(`Workout complete · streak ${res.data.streak.current} 🔥`, {
        icon: <CheckCircle2 className="w-4 h-4" />,
      });
    }
    if ((res.data.prChanges ?? []).length > 0) {
      for (const change of res.data.prChanges) {
        toast.success(`PR: ${change.current}`, { icon: <Trophy className="w-4 h-4" /> });
      }
    }
  };

  const onAnchor = async () => {
    if (!cali.sessionToken || !plan) return;
    setAnchoring(true);
    const res = await api.cali.anchor(cali.sessionToken, plan.workoutId);
    setAnchoring(false);
    if (res.success) {
      toast.success("Anchored on Hedera!", { icon: <Anchor className="w-4 h-4" /> });
    } else if (res.code === "ANCHOR_UNAVAILABLE" || res.code === "ANCHOR_NOT_IMPLEMENTED") {
      toast.message("Anchoring coming soon — your workout is saved.", {
        icon: <Info className="w-4 h-4" />,
      });
    } else {
      cali.handleAuthError(res.code);
      toast.error(res.error || "Anchor failed.");
    }
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
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10 space-y-5 pb-32">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link to="/calisthenics" className="flex items-center gap-1.5 text-xs text-[#8494A7] hover:text-[#E8ECF0]" style={dmSans}>
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </Link>
        <span className="text-[0.65rem] text-[#8494A7]" style={dmSans}>
          L{plan.level} · ~{estMin} min · {plan.blocks.reduce((a, b) => a + b.items.length, 0)} items
        </span>
      </div>

      {/* Transparency disclosure */}
      <details className="rounded-lg border border-[#4274B9]/15 bg-white/[0.02] px-3 py-2 text-xs text-[#A3B0C2]">
        <summary className="cursor-pointer select-none" style={dmSans}>
          How was this generated?
        </summary>
        <p className="mt-2 font-mono text-[0.65rem] text-[#8494A7] break-all">
          Library {plan.libraryVersion} · seed {plan.seed.slice(0, 16)}… · equipment {plan.equipment.join(",")}
        </p>
      </details>

      {/* Blocks */}
      {plan.blocks.map((block, b) => (
        <BlockCard
          key={`${block.kind}-${b}`}
          block={block}
          blockIndex={b}
          actuals={actuals}
          onChangeActual={(key, patch) =>
            setActuals((prev) => ({
              ...prev,
              [key]: { value: "", rpe: "", note: "", ...prev[key], ...patch },
            }))
          }
          onBlurActual={(key, b2, i2, s2) => saveSet(key, b2, i2, s2)}
        />
      ))}

      {/* Sticky bottom action bar */}
      <div
        className="fixed bottom-20 md:bottom-6 left-0 right-0 z-40 px-4"
        style={{ pointerEvents: "none" }}
      >
        <div
          className="max-w-3xl mx-auto flex gap-2 p-2 rounded-2xl border"
          style={{
            pointerEvents: "auto",
            background: "rgba(11,17,32,0.92)",
            borderColor: "rgba(66,116,185,0.25)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
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
            Complete
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

function BlockCard({
  block,
  blockIndex,
  actuals,
  onChangeActual,
  onBlurActual,
}: {
  block: Block;
  blockIndex: number;
  actuals: Record<string, { value: string; rpe: string; note: string }>;
  onChangeActual: (key: string, patch: Partial<{ value: string; rpe: string; note: string }>) => void;
  onBlurActual: (key: string, b: number, i: number, s: number) => void;
}) {
  return (
    <div
      className="rounded-2xl border p-4 sm:p-5"
      style={{
        background: "linear-gradient(160deg, rgba(66,116,185,0.04), rgba(11,17,32,0.85))",
        borderColor: "rgba(66,116,185,0.15)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold tracking-widest text-[#6AA3E0]" style={orbitron}>
          {block.name.toUpperCase()}
        </h2>
        <span className="text-[0.6rem] text-[#8494A7]" style={dmSans}>
          Rest {block.restSec}s
        </span>
      </div>

      <div className="space-y-4">
        {block.items.map((item, i) => (
          <div key={`${item.exerciseId}-${i}`} className="border-t border-[#4274B9]/10 pt-3 first:border-0 first:pt-0">
            <div className="flex items-baseline justify-between gap-3 mb-1">
              <h3 className="text-sm font-bold text-white" style={dmSans}>{item.name}</h3>
              <span className="text-[0.65rem] text-[#8494A7] flex-shrink-0" style={dmSans}>
                {item.sets} × {item.target.low}–{item.target.high}{" "}
                {item.target.metric === "reps" ? "reps" : "s"}
                {item.unilateral ? " /side" : ""}
              </span>
            </div>
            {item.tempoHint && (
              <p className="text-[0.6rem] text-[#D4A843]/80 mb-1" style={dmSans}>Tempo: {item.tempoHint}</p>
            )}
            <ul className="text-[0.65rem] text-[#A3B0C2] mb-2 space-y-0.5" style={dmSans}>
              {item.cues.map((cue, ci) => (
                <li key={ci}>· {cue}</li>
              ))}
            </ul>

            {/* Per-set inputs */}
            <div className="grid grid-cols-1 gap-1.5 mt-2">
              {Array.from({ length: item.sets }).map((_, s) => {
                const key = `${blockIndex}|${i}|${s}`;
                const a = actuals[key] ?? { value: "", rpe: "", note: "" };
                return (
                  <div key={s} className="flex items-center gap-1.5">
                    <span className="w-12 text-[0.65rem] text-[#8494A7] flex-shrink-0" style={dmSans}>
                      Set {s + 1}
                    </span>
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder={item.target.metric === "reps" ? "reps" : "sec"}
                      value={a.value}
                      onChange={(e) => onChangeActual(key, { value: e.target.value })}
                      onBlur={() => onBlurActual(key, blockIndex, i, s)}
                      className="w-20 px-2 py-1.5 text-xs rounded-md bg-white/[0.04] border border-[#4274B9]/15 text-white focus:outline-none focus:border-[#4274B9]/50"
                      style={dmSans}
                    />
                    <input
                      type="number"
                      inputMode="decimal"
                      placeholder="RPE"
                      min={1}
                      max={10}
                      value={a.rpe}
                      onChange={(e) => onChangeActual(key, { rpe: e.target.value })}
                      onBlur={() => onBlurActual(key, blockIndex, i, s)}
                      className="w-14 px-2 py-1.5 text-xs rounded-md bg-white/[0.04] border border-[#4274B9]/15 text-white focus:outline-none focus:border-[#4274B9]/50"
                      style={dmSans}
                    />
                    <input
                      type="text"
                      placeholder="note (opt)"
                      value={a.note}
                      maxLength={280}
                      onChange={(e) => onChangeActual(key, { note: e.target.value })}
                      onBlur={() => onBlurActual(key, blockIndex, i, s)}
                      className="flex-1 px-2 py-1.5 text-xs rounded-md bg-white/[0.04] border border-[#4274B9]/15 text-[#A3B0C2] focus:outline-none focus:border-[#4274B9]/50"
                      style={dmSans}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
