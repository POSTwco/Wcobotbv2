/**
 * One-tap set logger with micro-interactions.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, Loader2 } from "lucide-react";

const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

interface SetState {
  value: string;
  rpe: string;
  note: string;
}

interface Props {
  setIndex: number;
  metric: "reps" | "time_sec";
  targetLow: number;
  targetHigh: number;
  state: SetState;
  logged: boolean;
  saving: boolean;
  onChange: (patch: Partial<SetState>) => void;
  onLog: () => void;
}

export function CaliSetLogger({
  setIndex, metric, targetLow, targetHigh, state, logged, saving, onChange, onLog,
}: Props) {
  const [pulse, setPulse] = useState(false);
  const placeholder = metric === "reps" ? `${targetLow}–${targetHigh}` : `${targetLow}–${targetHigh}s`;

  const handleLog = () => {
    const v = Number(state.value);
    if (!Number.isFinite(v) || v <= 0) return;
    setPulse(true);
    setTimeout(() => setPulse(false), 400);
    onLog();
  };

  if (logged) {
    return (
      <motion.div
        initial={{ scale: 0.98, opacity: 0.8 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25"
      >
        <Check className="w-4 h-4 text-emerald-400" />
        <span className="text-xs text-emerald-300 font-medium" style={dmSans}>
          Set {setIndex + 1} logged — {state.value}{metric === "reps" ? " reps" : "s"}
          {state.rpe ? ` · RPE ${state.rpe}` : ""}
        </span>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-12 text-[0.65rem] text-[#8494A7] flex-shrink-0" style={dmSans}>
        Set {setIndex + 1}
      </span>
      <input
        type="number"
        inputMode="numeric"
        placeholder={placeholder}
        value={state.value}
        onChange={(e) => onChange({ value: e.target.value })}
        className="w-20 px-2 py-2 text-xs rounded-lg bg-white/[0.04] border border-[#4274B9]/20 text-white focus:outline-none focus:border-[#4274B9]/50"
        style={dmSans}
      />
      <input
        type="number"
        inputMode="decimal"
        placeholder="RPE"
        min={1}
        max={10}
        value={state.rpe}
        onChange={(e) => onChange({ rpe: e.target.value })}
        className="w-14 px-2 py-2 text-xs rounded-lg bg-white/[0.04] border border-[#4274B9]/20 text-white focus:outline-none focus:border-[#4274B9]/50"
        style={dmSans}
      />
      <motion.button
        onClick={handleLog}
        disabled={saving || !state.value || Number(state.value) <= 0}
        animate={pulse ? { scale: [1, 1.08, 1] } : {}}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          ...dmSans,
          background: "linear-gradient(135deg, #4274B9, #3563A0)",
          color: "#fff",
          boxShadow: "0 2px 12px rgba(66,116,185,0.35)",
        }}
      >
        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
        Log Set
      </motion.button>
    </div>
  );
}