/**
 * Set input row — values only; parent handles bundled "Log all sets".
 * Intensity 1–10 (API field still `rpe`) — 10 = max intensity / hypertrophy fuel.
 */

import { motion } from "motion/react";
import { Check, Minus, Plus } from "lucide-react";
import { CaliHintWrap } from "./cali-hint-wrap";

const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const inputClass =
  "w-full min-h-[44px] px-3 py-2.5 text-sm rounded-xl bg-[#D4A843]/6 border border-[#D4A843]/30 text-[#D4A843] placeholder:text-[#D4A843]/45 focus:outline-none focus:border-[#D4A843]/60 focus:bg-[#D4A843]/10 focus:ring-1 focus:ring-[#D4A843]/25 transition-all duration-200";

/** Clamp intensity to integer 1–10; empty string when cleared. API field remains `rpe`. */
function parseIntensityInput(raw: string): string {
  if (raw === "" || raw == null) return "";
  const n = Math.round(Number(raw));
  if (!Number.isFinite(n)) return "";
  if (n < 1) return "1";
  if (n > 10) return "10";
  return String(n);
}

interface SetState {
  value: string;
  /** Intensity 1–10 (API field name: rpe) */
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
  showNotes?: boolean;
  tutorialSetAnchor?: boolean;
}

export function CaliSetLogger({
  setIndex, metric, targetLow, targetHigh, state, logged, onChange, showNotes = false,
  tutorialSetAnchor = false,
}: Props) {
  const placeholder = metric === "reps" ? `${targetLow}–${targetHigh}` : `${targetLow}–${targetHigh}s`;
  const unitLabel = metric === "reps" ? "reps" : "seconds";

  const intensityNum = state.rpe === "" ? null : Number(state.rpe);
  const hasIntensity = intensityNum != null && Number.isFinite(intensityNum);

  const stepIntensity = (delta: number) => {
    if (!hasIntensity) {
      onChange({ rpe: delta > 0 ? "5" : "1" });
      return;
    }
    const next = Math.min(10, Math.max(1, intensityNum + delta));
    onChange({ rpe: String(next) });
  };

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
          {state.rpe ? ` · Intensity ${state.rpe}` : ""}
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
          {...(tutorialSetAnchor ? { "data-cali-tutorial": "set-input" } : {})}
        />

        <CaliHintWrap
          title="Intensity (1–10)"
          hint="How hard was this set? 1 = easy, 10 = max intensity. Intensity 10 fuels your hypertrophy score — log it every set so analytics stay accurate."
          side="top"
          showIcon={false}
        >
          <div
            className="flex items-center gap-0.5 min-h-[44px] rounded-xl bg-[#D4A843]/6 border border-[#D4A843]/30 sm:w-[7.5rem] overflow-hidden"
            role="group"
            aria-label={`Set ${setIndex + 1} Intensity 1 to 10`}
          >
            <button
              type="button"
              onClick={() => stepIntensity(-1)}
              className="flex items-center justify-center w-9 min-h-[44px] text-[#D4A843] hover:bg-[#D4A843]/15 active:bg-[#D4A843]/25 transition-colors touch-manipulation flex-shrink-0"
              aria-label="Decrease intensity"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={10}
              step={1}
              placeholder="Int"
              value={state.rpe}
              onChange={(e) => onChange({ rpe: parseIntensityInput(e.target.value) })}
              onBlur={() => {
                if (state.rpe !== "") onChange({ rpe: parseIntensityInput(state.rpe) });
              }}
              className="w-full min-w-0 min-h-[44px] px-0.5 text-center text-sm bg-transparent text-[#D4A843] placeholder:text-[#D4A843]/45 focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              style={dmSans}
              aria-label={`Set ${setIndex + 1} Intensity`}
              title="Intensity 1–10 · 10 = max / hypertrophy"
            />
            <button
              type="button"
              onClick={() => stepIntensity(1)}
              className="flex items-center justify-center w-9 min-h-[44px] text-[#D4A843] hover:bg-[#D4A843]/15 active:bg-[#D4A843]/25 transition-colors touch-manipulation flex-shrink-0"
              aria-label="Increase intensity"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </CaliHintWrap>
      </div>

      {!logged && (
        <p className="text-[0.6rem] text-[#8494A7]/80 sm:hidden leading-tight" style={dmSans}>
          Intensity 1–10 · 10 = max · fuels hypertrophy
        </p>
      )}

      {showNotes && !logged && (
        <textarea
          placeholder="Session notes — injuries, sensations, battle prep…"
          value={state.note}
          onChange={(e) => onChange({ note: e.target.value.slice(0, 280) })}
          rows={2}
          className="w-full px-3 py-2 text-xs rounded-xl bg-[#D4A843]/5 border border-[#D4A843]/20 text-[#E8ECF0] placeholder:text-[#8494A7]/60 focus:outline-none focus:border-[#D4A843]/40 resize-none"
          style={dmSans}
        />
      )}
    </div>
  );
}
