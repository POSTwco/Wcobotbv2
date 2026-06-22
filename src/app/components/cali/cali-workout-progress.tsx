/**
 * Sticky workout header — progress ring, XP bar, block indicator.
 */

import { motion } from "motion/react";
import { Flame, Zap } from "lucide-react";
import { getXpLevelLabel, xpProgressInLevel } from "../../lib/cali-workout-xp";

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

interface Props {
  setsLogged: number;
  setsTotal: number;
  xp: number;
  blockIndex: number;
  blockTotal: number;
  blockName: string;
  level: number;
  streak?: number;
}

export function CaliWorkoutProgress({
  setsLogged, setsTotal, xp, blockIndex, blockTotal, blockName, level, streak,
}: Props) {
  const pct = setsTotal > 0 ? Math.round((setsLogged / setsTotal) * 100) : 0;
  const ringR = 18;
  const ringC = 2 * Math.PI * ringR;
  const ringOffset = ringC - (pct / 100) * ringC;
  const xpProg = xpProgressInLevel(xp);

  return (
    <div
      className="sticky top-14 sm:top-16 z-30 isolate -mx-4 px-4 py-3 mb-4 border-b"
      style={{
        background: "rgba(11,17,32,0.92)",
        borderColor: "rgba(66,116,185,0.15)",
        backdropFilter: "blur(16px)",
      }}
    >
      <div className="max-w-3xl mx-auto flex items-center gap-3">
        {/* Progress ring */}
        <div className="relative w-12 h-12 flex-shrink-0">
          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 44 44">
            <circle cx="22" cy="22" r={ringR} fill="none" stroke="rgba(66,116,185,0.15)" strokeWidth="3" />
            <motion.circle
              cx="22" cy="22" r={ringR} fill="none" stroke="#4274B9" strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={ringC}
              animate={{ strokeDashoffset: ringOffset }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[0.55rem] font-bold text-[#6AA3E0]" style={orbitron}>
            {pct}%
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <p className="text-[0.65rem] font-bold text-white truncate" style={orbitron}>
              Block {blockIndex + 1}/{blockTotal} · {blockName}
            </p>
            <div className="flex items-center gap-2 flex-shrink-0">
              {streak != null && streak > 0 && (
                <span className="flex items-center gap-0.5 text-[0.6rem] text-[#D4A843]" style={dmSans}>
                  <Flame className="w-3 h-3" /> {streak}
                </span>
              )}
              <span className="flex items-center gap-0.5 text-[0.6rem] text-[#6AA3E0]" style={dmSans}>
                <Zap className="w-3 h-3" /> {xp} XP
              </span>
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #4274B9, #6AA3E0)" }}
              animate={{ width: `${xpProg.pct}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
          <p className="text-[0.55rem] text-[#8494A7] mt-0.5" style={dmSans}>
            Effort {pct}% · {setsLogged}/{setsTotal} sets · L{level} · {getXpLevelLabel(xp)}
          </p>
        </div>
      </div>
    </div>
  );
}