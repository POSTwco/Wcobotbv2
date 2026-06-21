import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import { ArrowLeft, Loader2, Plus, Trash2, Crown } from "lucide-react";
import { api } from "../../lib/api";
import { useEliteSession } from "./elite-context";

const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };
const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };

interface Slot { exerciseId: string; name: string; sets: number; }

export function EliteCustomBuilder() {
  const elite = useEliteSession();
  const navigate = useNavigate();
  const [exercises, setExercises] = useState<any[]>([]);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    if (!elite.sessionToken) return;
    (async () => {
      const res = await api.elite.listExercises(elite.sessionToken!);
      if (res.success && res.data) setExercises(res.data.exercises || []);
      setLoading(false);
    })();
  }, [elite.sessionToken]);

  const filtered = exercises.filter((e) =>
    !filter || e.name?.toLowerCase().includes(filter.toLowerCase()) || e.eliteTrack?.includes(filter),
  );

  const addSlot = (ex: any) => {
    if (slots.length >= 20) return;
    if (slots.some((s) => s.exerciseId === ex.id)) return;
    setSlots([...slots, { exerciseId: ex.id, name: ex.name, sets: 4 }]);
  };

  const onCreate = async () => {
    if (!elite.sessionToken || slots.length === 0) return;
    setSaving(true);
    const res = await api.elite.createCustom(elite.sessionToken, {
      slots: slots.map((s) => ({ exerciseId: s.exerciseId, sets: s.sets })),
    });
    setSaving(false);
    if (res.success && res.data?.workout?.workoutId) {
      navigate(`/calisthenics/elite/workout/${res.data.workout.workoutId}`);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-[#D4A843] animate-spin" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 pb-24">
      <Link to="/calisthenics/elite" className="inline-flex items-center gap-1.5 text-[#8494A7] text-xs mb-6" style={dmSans}>
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Vault
      </Link>

      <h1 className="text-xl font-bold text-white mb-2 flex items-center gap-2" style={orbitron}>
        <Crown className="w-6 h-6 text-[#D4A843]" /> Custom Elite Workout
      </h1>
      <p className="text-sm text-[#8494A7] mb-6" style={dmSans}>Pick from 45 vault techniques only — never mixed into L1–L3 routines.</p>

      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <input
            placeholder="Search exercises…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full mb-3 px-3 py-2 rounded-lg bg-[#162033] border border-[#4274B9]/20 text-sm text-white"
          />
          <div className="max-h-80 overflow-y-auto space-y-1 rounded-xl border border-[#4274B9]/15 p-2">
            {filtered.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => addSlot(ex)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#D4A843]/10 text-left"
              >
                <span className="text-xs text-[#E8ECF0]" style={dmSans}>{ex.name}</span>
                <Plus className="w-3.5 h-3.5 text-[#D4A843]" />
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xs font-bold text-[#D4A843] mb-2" style={orbitron}>YOUR SESSION ({slots.length}/20)</h2>
          <div className="space-y-2 mb-4 min-h-[200px]">
            {slots.map((s, i) => (
              <div key={s.exerciseId} className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.03] border border-[#D4A843]/15">
                <span className="flex-1 text-xs text-white truncate" style={dmSans}>{s.name}</span>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={s.sets}
                  onChange={(e) => {
                    const next = [...slots];
                    next[i] = { ...s, sets: Number(e.target.value) || 3 };
                    setSlots(next);
                  }}
                  className="w-14 px-2 py-1 rounded bg-[#162033] border border-[#4274B9]/20 text-xs text-[#D4A843]"
                />
                <span className="text-[0.6rem] text-[#8494A7]">sets</span>
                <button type="button" onClick={() => setSlots(slots.filter((_, j) => j !== i))} className="text-red-400">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            disabled={saving || slots.length === 0}
            onClick={onCreate}
            className="w-full py-3 rounded-xl font-bold text-[#0B1120] disabled:opacity-40"
            style={{ ...dmSans, background: "linear-gradient(135deg, #D4A843, #B8860B)" }}
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "Start Custom Session"}
          </button>
        </div>
      </div>
    </div>
  );
}