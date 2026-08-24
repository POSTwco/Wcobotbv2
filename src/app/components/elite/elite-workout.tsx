import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, Link } from "react-router";
import { ArrowLeft, Loader2, CheckCircle2, Crown } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../lib/api";
import { useEliteSession } from "./elite-context";
import { CaliExerciseCard } from "../cali/cali-exercise-card";
import { CaliLoader } from "../cali/cali-loader";
import { getAvatarGender } from "../../lib/cali-avatar-prefs";
import { CaliShareProof } from "../cali/cali-share-proof";
import { buildShareProofSnapshot } from "../../lib/cali-share-proof-data";

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

export function EliteWorkout() {
  const { id } = useParams<{ id: string }>();
  const elite = useEliteSession();
  const [plan, setPlan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actuals, setActuals] = useState<Record<string, { value: string; rpe: string; note: string }>>({});
  const [loggedSets, setLoggedSets] = useState<Set<string>>(new Set());
  const [savingExercise, setSavingExercise] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [activeBlock, setActiveBlock] = useState(0);

  // Share Your Proof (full parity with cali routines)
  const [showShareProof, setShowShareProof] = useState(false);
  const [proofData, setProofData] = useState<any>(null);

  useEffect(() => {
    if (!elite.sessionToken || !id) return;
    (async () => {
      setLoading(true);
      const res = await api.elite.getWorkout(elite.sessionToken!, id);
      if (res.success && res.data) setPlan(res.data.workout);
      else {
        elite.handleAuthError(res.code);
        setError(res.error || "Workout not found");
      }
      setLoading(false);
    })();
  }, [id, elite.sessionToken, elite.handleAuthError]);

  const setsTotal = useMemo(() => {
    if (!plan) return 0;
    return plan.blocks.reduce((s: number, b: any) => s + b.items.reduce((x: number, it: any) => x + it.sets, 0), 0);
  }, [plan]);

  const logAllSetsForExercise = useCallback(async (b: number, i: number) => {
    if (!elite.sessionToken || !plan) return;
    const item = plan.blocks[b]?.items[i];
    if (!item) return;
    const toLog: any[] = [];
    const keys: string[] = [];
    for (let s = 0; s < item.sets; s++) {
      const key = `${b}|${i}|${s}`;
      if (loggedSets.has(key)) continue;
      const a = actuals[key];
      const v = Number(a?.value);
      if (!Number.isFinite(v) || v <= 0) continue;
      const body: any = { blockIndex: b, itemIndex: i, setIndex: s, value: v };
      const rpe = Math.round(Number(a?.rpe));
      if (a?.rpe && rpe >= 1 && rpe <= 10) body.rpe = rpe;
      if (a?.note?.trim()) body.note = a.note.trim();
      toLog.push(body);
      keys.push(key);
    }
    if (toLog.length === 0) { toast.error("Enter at least one set"); return; }
    setSavingExercise(`${b}|${i}`);
    const res = await api.elite.logSets(elite.sessionToken, plan.workoutId, toLog);
    setSavingExercise(null);
    if (res.success) {
      const next = new Set(loggedSets);
      keys.forEach((k) => next.add(k));
      setLoggedSets(next);
      toast.success(`${toLog.length} sets logged`);
    } else {
      elite.handleAuthError(res.code);
      toast.error(res.error || "Save failed");
    }
  }, [elite, plan, actuals, loggedSets]);

  const onComplete = async () => {
    if (!elite.sessionToken || !plan) return;
    setCompleting(true);
    const bulk: any[] = [];
    for (const [key, a] of Object.entries(actuals)) {
      const [b, i, s] = key.split("|").map(Number);
      const v = Number(a.value);
      if (!Number.isFinite(v) || v <= 0) continue;
      const row: any = { blockIndex: b, itemIndex: i, setIndex: s, value: v };
      const rpe = Math.round(Number(a.rpe));
      if (a.rpe && rpe >= 1 && rpe <= 10) row.rpe = rpe;
      if (a.note?.trim()) row.note = a.note.trim();
      bulk.push(row);
    }
    const completedAt = new Date().toISOString();
    const res = await api.elite.logSets(elite.sessionToken, plan.workoutId, bulk, {
      completed: true,
      completedAt,
    });
    setCompleting(false);

    if (res.success) {
      toast.success("Elite session complete — vault logged.");

      // Build real snapshot for Share Your Proof (all data from the just-completed elite plan)
      let pushCount = 0;
      let pullCount = 0;
      const exerciseNames: string[] = [];
      plan.blocks.forEach((b: any) => {
        b.items.forEach((it: any) => {
          const name = it.name || it.exerciseId || "Move";
          exerciseNames.push(name);
          const cat = (it.category || "").toLowerCase();
          const setsForItem = it.sets || 1;
          if (cat.includes("push")) pushCount += setsForItem;
          if (cat.includes("pull")) pullCount += setsForItem;
        });
      });
      const uniqueExercises = Array.from(new Set(exerciseNames));
      const topMoves = uniqueExercises.slice(0, 5);
      const totalSets = bulk.length > 0 ? bulk.length : setsTotal;

      const snapshotProof = buildShareProofSnapshot({
        level: 3, // Elite sessions treated as Advanced-tier share card
        completedAt,
        totalSets,
        uniqueExercises: Math.max(1, uniqueExercises.length),
        topMoves,
        pushCount,
        pullCount,
        workoutId: plan.workoutId,
        streakFromLog: res.data?.streak?.current ?? 0,
        prChangesLength: res.data?.prChanges?.length ?? 0,
        prCountOverride: res.data?.prCount ?? 0,
        athleteScoreOverride: res.data?.athleteScore ?? 0,
        athleteTierOverride: res.data?.athleteTier ?? "ELITE",
      });
      setProofData(snapshotProof);
      setShowShareProof(true);
    } else {
      toast.error(res.error || "Complete failed");
    }
  };

  if (loading) return <CaliLoader variant="workout" />;
  if (error || !plan) {
    return (
      <div className="text-center py-16 px-4">
        <p className="text-red-300 mb-4" style={dmSans}>{error}</p>
        <Link to="/calisthenics/elite" className="text-[#D4A843] text-sm">Back to Vault</Link>
      </div>
    );
  }

  const block = plan.blocks[activeBlock];

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 pb-28">
      <Link to="/calisthenics/elite" className="inline-flex items-center gap-1.5 text-[#8494A7] text-xs mb-4" style={dmSans}>
        <ArrowLeft className="w-3.5 h-3.5" /> Vault
      </Link>

      <div className="flex items-center gap-2 mb-4">
        <Crown className="w-5 h-5 text-[#D4A843]" />
        <h1 className="text-lg font-bold text-white" style={orbitron}>Elite Session</h1>
        <span className="text-xs text-[#8494A7] ml-auto" style={dmSans}>
          {loggedSets.size}/{setsTotal} sets · ~{Math.round(plan.estimatedDurationSec / 60)} min
        </span>
      </div>

      <div className="flex gap-1 overflow-x-auto mb-4 pb-1">
        {plan.blocks.map((b: any, idx: number) => (
          <button
            key={idx}
            type="button"
            onClick={() => setActiveBlock(idx)}
            className={`shrink-0 px-3 py-1.5 rounded-lg text-[0.65rem] font-bold border ${activeBlock === idx ? "border-[#D4A843] bg-[#D4A843]/15 text-[#D4A843]" : "border-[#4274B9]/20 text-[#8494A7]"}`}
            style={orbitron}
          >
            {b.name}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {block?.items?.map((item: any, i: number) => (
          <CaliExerciseCard
            key={`${item.exerciseId}-${i}`}
            item={item}
            blockIndex={activeBlock}
            itemIndex={i}
            actuals={actuals}
            loggedSets={loggedSets}
            savingExercise={savingExercise === `${activeBlock}|${i}`}
            gender={getAvatarGender()}
            onChangeActual={(key, patch) => setActuals((prev) => ({ ...prev, [key]: { value: "", rpe: "", note: "", ...prev[key], ...patch } }))}
            onLogAllSets={logAllSetsForExercise}
            variant="elite"
            showNotes
          />
        ))}
      </div>

      <button
        type="button"
        disabled={completing}
        onClick={onComplete}
        className="fixed bottom-20 left-4 right-4 max-w-3xl mx-auto flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-[#0B1120] disabled:opacity-50 z-20"
        style={{ ...dmSans, background: "linear-gradient(135deg, #D4A843, #B8860B)" }}
      >
        {completing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
        Complete Elite Session
      </button>

      {/* Share Your Proof — now available for Elite Training too (full parity, same premium redesigned sports card) */}
      <CaliShareProof
        open={showShareProof}
        onClose={() => setShowShareProof(false)}
        data={proofData}
      />
    </div>
  );
}