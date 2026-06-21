/**
 * Level picker — pill group for Beginner / Intermediate / Expert.
 * Used by the dashboard inline and by the settings screen.
 */

import { motion } from "motion/react";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const LEVELS = [
  {
    value: 1 as const,
    title: "Beginner",
    sub: "Build foundation, ~25 min",
    hint: "Foundation strength & form. Ideal for your first WCO routine or getting back into training.",
  },
  {
    value: 2 as const,
    title: "Intermediate",
    sub: "Push harder, ~35 min",
    hint: "More volume and harder progressions. Best if you train 3+ days per week consistently.",
  },
  {
    value: 3 as const,
    title: "Expert",
    sub: "Max hypertrophy, ~45 min",
    hint: "High-intensity blocks and advanced moves. Longer sessions built for max hypertrophy.",
  },
];

export function LevelPicker({
  value,
  onChange,
  disabled,
}: {
  value: 1 | 2 | 3;
  onChange: (n: 1 | 2 | 3) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
      {LEVELS.map((lv) => {
        const active = lv.value === value;
        return (
          <Tooltip key={lv.value}>
            <TooltipTrigger asChild>
              <motion.button
                type="button"
                onClick={() => onChange(lv.value)}
                disabled={disabled}
                whileHover={{ scale: disabled ? 1 : 1.02 }}
                whileTap={{ scale: disabled ? 1 : 0.98 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
                className="text-left rounded-xl px-3.5 py-3.5 border transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed group relative overflow-hidden"
                style={{
                  background: active
                    ? "linear-gradient(135deg, rgba(212,168,67,0.18), rgba(66,116,185,0.12))"
                    : "rgba(255,255,255,0.02)",
                  borderColor: active ? "rgba(212,168,67,0.55)" : "rgba(66,116,185,0.15)",
                  boxShadow: active
                    ? "0 0 24px rgba(212,168,67,0.28), 0 0 0 1px rgba(212,168,67,0.35) inset"
                    : undefined,
                }}
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl"
                  style={{
                    background: "radial-gradient(ellipse at 50% 0%, rgba(212,168,67,0.12) 0%, transparent 70%)",
                    boxShadow: active ? undefined : "0 0 18px rgba(212,168,67,0.15)",
                  }}
                  aria-hidden
                />
                <p
                  className="text-sm font-bold tracking-wider relative z-10"
                  style={{ ...orbitron, color: active ? "#F0D078" : "#E8ECF0" }}
                >
                  {lv.title}
                </p>
                <p
                  className="text-[0.65rem] mt-1 relative z-10"
                  style={{ ...dmSans, color: active ? "#D4A843" : "#8494A7" }}
                >
                  {lv.sub}
                </p>
              </motion.button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[220px] text-xs leading-relaxed">
              {lv.hint}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}