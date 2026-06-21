/**
 * Set input row — values only; parent handles bundled "Log all sets".
 */

import { motion } from "motion/react";
import { Check } from "lucide-react";
import { CaliHintWrap } from "./cali-hint-wrap";

const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const inputClass =
  "w-full min-h-[44px] px-3 py-2.5 text-sm rounded-xl bg-[#D4A843]/6 border border-[#D4A843]/30 text-[#D4A843] placeholder:text-[#D4A843]/45 focus:outline-none focus:border-[#D4A843]/60 focus:bg-[#D4A843]/10 focus:ring-1 focus:ring-[#D4A843]/25 transition-all duration-200";

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
  onChange: (patch: Partial<SetState>) => void;
}

export function CaliSetLogger({
  setIndex, metric, targetLow, targetHigh, state, logged, onChange,
}: Props) {
  const placeholder = metric === "reps" ? `${targetLow}–${targetHigh}` : `${targetLow}–${targetHigh}s`;
  const unitLabel = metric === "reps" ? "reps" : "seconds";

  if (logged) {
    return (
      <motion.div
        initial={{ scale: 0.98, opacity: 0.8 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 min-h-[44px]"
      >
        <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
        <span className="text-sm text-emerald-300 font-medium" style={dmSans}>
          Set {setIndex + 1} logged — {state.value}{metric === "reps" ? " reps" : "s"}
          {state.rpe ? ` · RPE ${state.rpe}` : ""}
        </span>
      </motion.div>
    );
  }

  return (
    <div className="rounded-xl border border-[#D4A843]/15 bg-white/[0.02] p-3 space-y-2.5 sm:p-0 sm:border-0 sm:bg-transparent sm:flex sm:flex-wrap sm:items-center sm:gap-3">
      <CaliHintWrap
        title={metric === "reps" ? "Log Your Reps" : "Log Your Time"}
        hint={`Enter how many ${unitLabel} you completed this set. Target range is ${placeholder} — any honest effort counts.`}
        side="top"
      >
        <div className="flex items-center justify-between gap-2 sm:contents">
          <span className="text-xs font-bold text-[#D4A843] flex-shrink-0 sm:w-14" style={dmSans}>
            Set {setIndex + 1}
          </span>
          <span className="text-[0.65rem] text-[#8494A7] sm:hidden" style={dmSans}>
            Target: {placeholder}
          </span>
        </div>
      </CaliHintWrap>

      <div className="grid grid-cols-2 gap-2 sm:contents">
        <input
          type="number"
          inputMode="numeric"
          placeholder={placeholder}
          value={state.value}
          onChange={(e) => onChange({ value: e.target.value })}
          className={`sm:w-28 ${inputClass}`}
          style={dmSans}
          aria-label={`Set ${setIndex + 1} ${unitLabel}`}
        />

        <input
          type="number"
          inputMode="decimal"
          placeholder="RPE"
          min={1}
          max={10}
          value={state.rpe}
          onChange={(e) => onChange({ rpe: e.target.value })}
          className={`sm:w-20 ${inputClass}`}
          style={dmSans}
          aria-label={`Set ${setIndex + 1} RPE`}
        />
      </div>
    </div>
  );
}