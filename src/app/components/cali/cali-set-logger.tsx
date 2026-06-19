/**
 * One-tap set logger with micro-interactions.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, Loader2 } from "lucide-react";
import { CaliHintWrap } from "./cali-hint-wrap";

const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const inputClass =
  "px-3 py-2.5 text-sm rounded-xl bg-[#D4A843]/6 border border-[#D4A843]/30 text-[#D4A843] placeholder:text-[#D4A843]/45 focus:outline-none focus:border-[#D4A843]/60 focus:bg-[#D4A843]/10 focus:ring-1 focus:ring-[#D4A843]/25 transition-all duration-200";

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
  const unitLabel = metric === "reps" ? "reps" : "seconds";

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
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25"
      >
        <Check className="w-4 h-4 text-emerald-400" />
        <span className="text-sm text-emerald-300 font-medium" style={dmSans}>
          Set {setIndex + 1} logged — {state.value}{metric === "reps" ? " reps" : "s"}
          {state.rpe ? ` · RPE ${state.rpe}` : ""}
        </span>
      </motion.div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
      <span className="w-14 text-xs font-bold text-[#D4A843] flex-shrink-0" style={dmSans}>
        Set {setIndex + 1}
      </span>

      <CaliHintWrap
        title={metric === "reps" ? "Log Your Reps" : "Log Your Time"}
        hint={`Enter how many ${unitLabel} you completed this set. Target range is ${placeholder} — any honest effort counts.`}
        side="top"
      >
        <input
          type="number"
          inputMode="numeric"
          placeholder={placeholder}
          value={state.value}
          onChange={(e) => onChange({ value: e.target.value })}
          className={`w-24 sm:w-28 ${inputClass}`}
          style={dmSans}
          aria-label={`Set ${setIndex + 1} ${unitLabel}`}
        />
      </CaliHintWrap>

      <CaliHintWrap
        title="Rate of Perceived Exertion (RPE)"
        hint="Optional 1–10 difficulty score. 7 = could do 3 more reps, 9 = 1 rep left, 10 = absolute max. Helps track intensity over time."
        side="top"
      >
        <input
          type="number"
          inputMode="decimal"
          placeholder="RPE"
          min={1}
          max={10}
          value={state.rpe}
          onChange={(e) => onChange({ rpe: e.target.value })}
          className={`w-16 sm:w-20 ${inputClass}`}
          style={dmSans}
          aria-label={`Set ${setIndex + 1} RPE`}
        />
      </CaliHintWrap>

      <CaliHintWrap
        title="Log Set"
        hint="Save this set to your workout record. Enter your reps or time first, then tap Log Set. You can add RPE anytime before logging."
        side="top"
      >
        <motion.button
          onClick={handleLog}
          disabled={saving || !state.value || Number(state.value) <= 0}
          animate={pulse ? { scale: [1, 1.06, 1] } : {}}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:scale-[1.03] active:scale-[0.98] disabled:hover:scale-100 transition-all duration-200"
          style={{
            ...dmSans,
            background: "linear-gradient(135deg, #D4A843, #B8860B)",
            color: "#0B1120",
            boxShadow: "0 2px 14px rgba(212,168,67,0.35)",
          }}
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Log Set
        </motion.button>
      </CaliHintWrap>
    </div>
  );
}