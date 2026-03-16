/**
 * BattleLoader — Battle-specific loading with skeleton battle cards
 * ==================================================================
 * Uses the shared BOTBSpinner core + battle-specific skeleton cards.
 */

import { motion } from "motion/react";
import { Swords } from "lucide-react";
import { BOTBSpinner, SkeletonPulse } from "./botb-spinner";

const BATTLE_MESSAGES = [
  "Loading battles...",
  "Fetching matchups...",
  "Syncing athletes...",
  "Preparing arena...",
];

export function BattleLoader() {
  return (
    <BOTBSpinner messages={BATTLE_MESSAGES}>
      {/* ── Skeleton Battle Cards ── */}
      <div className="w-full max-w-6xl space-y-6">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.15, duration: 0.5 }}
          >
            <SkeletonBattleCard delay={i * 0.4} />
          </motion.div>
        ))}
      </div>
    </BOTBSpinner>
  );
}

// ─── Skeleton Battle Card ────────────────────────────────────────────────────
function SkeletonBattleCard({ delay = 0 }: { delay?: number }) {
  return (
    <div
      className="relative rounded-[20px] overflow-hidden bg-[#0d1526] border border-[#1e293b]"
    >
      {/* Top gradient line */}
      <div
        className="absolute top-0 left-0 right-0 h-[1px]"
        style={{ background: "linear-gradient(90deg, transparent, rgba(66,116,185,0.2), transparent)" }}
      />

      <div className="p-5 sm:p-6">
        {/* Header skeleton */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <SkeletonPulse className="w-24 h-6 rounded-full" delay={delay} />
            <SkeletonPulse className="w-16 h-4 rounded-md" delay={delay + 0.1} />
          </div>
          <SkeletonPulse className="w-20 h-4 rounded-md" delay={delay + 0.2} />
        </div>

        {/* Title skeleton */}
        <SkeletonPulse className="w-48 sm:w-64 h-6 rounded-md mb-2" delay={delay + 0.1} />
        <SkeletonPulse className="w-32 h-4 rounded-md mb-6" delay={delay + 0.15} />

        {/* Athletes VS row */}
        <div className="flex items-center justify-between gap-4">
          {/* Athlete 1 */}
          <div className="flex-1 flex items-center gap-3">
            <SkeletonPulse className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl shrink-0" delay={delay + 0.2} />
            <div className="space-y-2 flex-1">
              <SkeletonPulse className="w-28 h-5 rounded-md" delay={delay + 0.25} />
              <SkeletonPulse className="w-20 h-3 rounded-md" delay={delay + 0.3} />
            </div>
          </div>

          {/* VS badge */}
          <div className="shrink-0">
            <div className="w-10 h-10 rounded-full bg-[#111d30] border border-[#1e293b] flex items-center justify-center">
              <Swords className="w-4 h-4 text-[#4274B9]/30" />
            </div>
          </div>

          {/* Athlete 2 */}
          <div className="flex-1 flex items-center gap-3 justify-end">
            <div className="space-y-2 flex-1 flex flex-col items-end">
              <SkeletonPulse className="w-28 h-5 rounded-md" delay={delay + 0.35} />
              <SkeletonPulse className="w-20 h-3 rounded-md" delay={delay + 0.4} />
            </div>
            <SkeletonPulse className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl shrink-0" delay={delay + 0.3} />
          </div>
        </div>

        {/* Progress bar skeleton */}
        <div className="mt-5">
          <div className="flex justify-between mb-2">
            <SkeletonPulse className="w-12 h-3 rounded" delay={delay + 0.4} />
            <SkeletonPulse className="w-12 h-3 rounded" delay={delay + 0.45} />
          </div>
          <SkeletonPulse className="w-full h-2.5 rounded-full" delay={delay + 0.5} />
        </div>
      </div>
    </div>
  );
}
