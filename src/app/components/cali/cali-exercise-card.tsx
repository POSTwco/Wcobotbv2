/**
 * Premium exercise card with motion preview + collapsible coaching guide.
 */

import { motion } from "motion/react";
import {
  ChevronDown, CheckCircle2, AlertTriangle, Wind, Zap, TrendingUp, TrendingDown, Minus,
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import type { AvatarGender } from "../../lib/cali-avatar-prefs";
import { getExerciseGuide, CATEGORY_COLORS, type WorkoutExerciseItem } from "../../lib/cali-exercise-guide";
import { CaliAvatarMotion } from "./cali-avatar-motion";
import { CaliMotionCoachPopover } from "./cali-motion-coach-popover";
import { CaliSetLogger } from "./cali-set-logger";

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

interface BlockItem extends WorkoutExerciseItem {
  sets: number;
  target: { metric: "reps" | "time_sec"; low: number; high: number };
  unilateral: boolean;
  tempoHint?: string;
}

interface SetState {
  value: string;
  rpe: string;
  note: string;
}

interface Props {
  item: BlockItem;
  blockIndex: number;
  itemIndex: number;
  actuals: Record<string, SetState>;
  loggedSets: Set<string>;
  savingSet: string | null;
  isFocused?: boolean;
  gender: AvatarGender;
  onFocus?: () => void;
  onChangeActual: (key: string, patch: Partial<SetState>) => void;
  onLogSet: (key: string, b: number, i: number, s: number) => void;
}

export function CaliExerciseCard({
  item, blockIndex, itemIndex, actuals, loggedSets, savingSet,
  isFocused, gender, onFocus, onChangeActual, onLogSet,
}: Props) {
  const guide = getExerciseGuide(item);
  const accent = CATEGORY_COLORS[item.category] ?? "#4274B9";
  const delay = blockIndex * 0.08 + itemIndex * 0.05;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: "easeOut" }}
      className="rounded-2xl border overflow-hidden transition-all duration-200"
      style={{
        background: "linear-gradient(160deg, rgba(66,116,185,0.05), rgba(11,17,32,0.9))",
        borderColor: isFocused ? `${accent}55` : `${accent}25`,
        boxShadow: isFocused ? `0 4px 24px ${accent}18` : `0 4px 24px ${accent}08`,
        borderLeftWidth: isFocused ? 3 : 1,
        borderLeftColor: isFocused ? accent : undefined,
      }}
      onMouseEnter={onFocus}
      onFocus={onFocus}
    >
      {/* Card header */}
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex-1 min-w-0">
            <span
              className="inline-block text-[0.55rem] font-bold tracking-widest uppercase px-2 py-0.5 rounded-md mb-2"
              style={{ ...orbitron, background: `${accent}18`, color: accent }}
            >
              {item.category}
            </span>
            <h3 className="text-base sm:text-lg font-bold text-white" style={dmSans}>{item.name}</h3>
          </div>
          <div className="flex items-start gap-2 flex-shrink-0">
            <span
              className="lg:hidden"
            >
              <CaliMotionCoachPopover item={item}>
                <CaliAvatarMotion
                  pattern={item.pattern}
                  category={item.category}
                  gender={gender}
                  size="compact"
                />
              </CaliMotionCoachPopover>
            </span>
            <span
              className="text-[0.65rem] font-bold px-2.5 py-1 rounded-lg"
              style={{ ...dmSans, background: "rgba(66,116,185,0.12)", color: "#6AA3E0" }}
            >
              {item.sets} × {item.target.low}–{item.target.high}
              {item.target.metric === "reps" ? " reps" : "s"}
              {item.unilateral ? "/side" : ""}
            </span>
          </div>
        </div>

        {item.tempoHint && (
          <p className="text-[0.6rem] text-[#D4A843]/90 mb-2" style={dmSans}>Tempo: {item.tempoHint}</p>
        )}

        {/* Collapsible coaching guide */}
        <Collapsible>
          <CollapsibleTrigger className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-[#4274B9]/20 bg-white/[0.02] hover:bg-white/[0.04] transition-colors group">
            <span className="text-xs font-bold text-[#6AA3E0]" style={dmSans}>
              How to do it perfectly
            </span>
            <ChevronDown className="w-4 h-4 text-[#6AA3E0] transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-3 space-y-3">
            <p className="text-sm text-[#C8D0DC] leading-relaxed" style={dmSans}>{guide.instructions}</p>

            <div>
              <p className="text-[0.6rem] font-bold tracking-wider text-[#6AA3E0] mb-1.5 flex items-center gap-1" style={orbitron}>
                <CheckCircle2 className="w-3 h-3" /> FORM CUES
              </p>
              <ul className="space-y-1">
                {guide.formCues.map((c, i) => (
                  <li key={i} className="text-xs text-[#A3B0C2] flex items-start gap-1.5" style={dmSans}>
                    <span className="text-emerald-400 mt-0.5">✓</span> {c}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[0.6rem] font-bold tracking-wider text-[#F87171] mb-1.5 flex items-center gap-1" style={orbitron}>
                <AlertTriangle className="w-3 h-3" /> AVOID THESE
              </p>
              <ul className="space-y-1">
                {guide.commonMistakes.map((m, i) => (
                  <li key={i} className="text-xs text-[#A3B0C2] flex items-start gap-1.5" style={dmSans}>
                    <span className="text-red-400 mt-0.5">✗</span> {m}
                  </li>
                ))}
              </ul>
            </div>

            <div
              className="flex items-start gap-2 px-3 py-2 rounded-lg"
              style={{ background: "rgba(66,116,185,0.08)", border: "1px solid rgba(66,116,185,0.15)" }}
            >
              <Wind className="w-4 h-4 text-[#6AA3E0] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[#A3B0C2]" style={dmSans}>{guide.breathing}</p>
            </div>

            <div className="flex items-start gap-2">
              <Zap className="w-4 h-4 text-[#D4A843] flex-shrink-0 mt-0.5" />
              <p className="text-xs text-[#D4A843]/90 font-medium" style={dmSans}>{guide.benefit}</p>
            </div>

            {/* Scaling ladder */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              {guide.scaling.beginner && (
                <div className="text-center px-2 py-2 rounded-lg bg-white/[0.03] border border-[#4274B9]/10">
                  <TrendingDown className="w-3 h-3 text-[#8494A7] mx-auto mb-1" />
                  <p className="text-[0.5rem] text-[#8494A7] uppercase tracking-wider" style={orbitron}>Beginner</p>
                  <p className="text-[0.6rem] text-[#A3B0C2] mt-0.5" style={dmSans}>{guide.scaling.beginner}</p>
                </div>
              )}
              <div className="text-center px-2 py-2 rounded-lg border-2" style={{ borderColor: accent, background: `${accent}10` }}>
                <Minus className="w-3 h-3 mx-auto mb-1" style={{ color: accent }} />
                <p className="text-[0.5rem] uppercase tracking-wider font-bold" style={{ ...orbitron, color: accent }}>You</p>
                <p className="text-[0.6rem] text-white mt-0.5 font-medium" style={dmSans}>{guide.scaling.intermediate}</p>
              </div>
              {guide.scaling.advanced && (
                <div className="text-center px-2 py-2 rounded-lg bg-white/[0.03] border border-[#4274B9]/10">
                  <TrendingUp className="w-3 h-3 text-[#D4A843] mx-auto mb-1" />
                  <p className="text-[0.5rem] text-[#8494A7] uppercase tracking-wider" style={orbitron}>Advanced</p>
                  <p className="text-[0.6rem] text-[#A3B0C2] mt-0.5" style={dmSans}>{guide.scaling.advanced}</p>
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      </div>

      {/* Set loggers */}
      <div className="px-4 sm:px-5 pb-4 space-y-2 border-t border-[#4274B9]/10 pt-3">
        {Array.from({ length: item.sets }).map((_, s) => {
          const key = `${blockIndex}|${itemIndex}|${s}`;
          const a = actuals[key] ?? { value: "", rpe: "", note: "" };
          return (
            <CaliSetLogger
              key={s}
              setIndex={s}
              metric={item.target.metric}
              targetLow={item.target.low}
              targetHigh={item.target.high}
              state={a}
              logged={loggedSets.has(key)}
              saving={savingSet === key}
              onChange={(patch) => onChangeActual(key, patch)}
              onLog={() => onLogSet(key, blockIndex, itemIndex, s)}
            />
          );
        })}
      </div>
    </motion.div>
  );
}