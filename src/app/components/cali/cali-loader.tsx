/**
 * CaliLoader — Calisthenics tab branded loading experience
 * Uses the site-wide BOTBSpinner + cali-specific skeleton layouts.
 */

import { motion } from "motion/react";
import { Dumbbell } from "lucide-react";
import { BOTBSpinner, SkeletonPulse } from "../botb-spinner";

export type CaliLoaderVariant = "session" | "dashboard" | "workout" | "list";

const MESSAGES: Record<CaliLoaderVariant, string[]> = {
  session: [
    "Checking your session...",
    "Verifying HBAR eligibility...",
    "Restoring workout data...",
    "Preparing calisthenics...",
  ],
  dashboard: [
    "Loading your profile...",
    "Fetching streak & PRs...",
    "Syncing workout history...",
    "Building dashboard...",
  ],
  workout: [
    "Loading workout...",
    "Fetching exercises...",
    "Preparing your session...",
    "Almost ready...",
  ],
  list: [
    "Loading records...",
    "Fetching your data...",
    "Syncing history...",
    "Preparing view...",
  ],
};

export function CaliLoader({ variant = "session" }: { variant?: CaliLoaderVariant }) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <BOTBSpinner messages={MESSAGES[variant]}>
        <div className="w-full max-w-3xl">
          {variant === "dashboard" && <SkeletonCaliDashboard />}
          {variant === "workout" && <SkeletonCaliWorkout />}
          {variant === "list" && <SkeletonCaliList />}
          {variant === "session" && <SkeletonCaliGate />}
        </div>
      </BOTBSpinner>
    </div>
  );
}

function SkeletonCaliGate() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.45 }}
      className="rounded-2xl border border-[#4274B9]/15 bg-[#0B1120]/60 p-6 sm:p-8 space-y-5"
    >
      <div className="flex items-center gap-3">
        <SkeletonPulse className="w-12 h-12 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <SkeletonPulse className="w-28 h-3 rounded" delay={0.05} />
          <SkeletonPulse className="w-48 h-5 rounded-md" delay={0.1} />
        </div>
      </div>
      <SkeletonPulse className="w-full h-3 rounded-md" delay={0.15} />
      <SkeletonPulse className="w-5/6 h-3 rounded-md" delay={0.2} />
      <div className="space-y-2.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-2.5">
            <SkeletonPulse className="w-7 h-7 rounded-md shrink-0" delay={0.25 + i * 0.05} />
            <SkeletonPulse className="flex-1 h-3 rounded-md" delay={0.3 + i * 0.05} />
          </div>
        ))}
      </div>
      <SkeletonPulse className="w-full h-12 rounded-xl" delay={0.45} />
    </motion.div>
  );
}

function SkeletonCaliDashboard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.45 }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <SkeletonPulse className="w-32 h-3 rounded" />
        <SkeletonPulse className="w-56 h-7 rounded-md" delay={0.05} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SkeletonPulse className="h-24 rounded-2xl" delay={0.1} />
        <SkeletonPulse className="h-24 rounded-2xl" delay={0.15} />
      </div>
      <SkeletonPulse className="w-full h-36 rounded-2xl" delay={0.2} />
      <SkeletonPulse className="w-full h-14 rounded-xl" delay={0.25} />
      <div className="rounded-2xl border border-[#4274B9]/10 p-4 space-y-2">
        <SkeletonPulse className="w-36 h-4 rounded-md" delay={0.3} />
        {[0, 1, 2].map((i) => (
          <SkeletonPulse key={i} className="w-full h-14 rounded-xl" delay={0.35 + i * 0.05} />
        ))}
      </div>
    </motion.div>
  );
}

function SkeletonCaliList() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.45 }}
      className="space-y-4"
    >
      <SkeletonPulse className="w-24 h-3 rounded" />
      <div className="space-y-2">
        <SkeletonPulse className="w-40 h-3 rounded" delay={0.05} />
        <SkeletonPulse className="w-52 h-7 rounded-md" delay={0.1} />
      </div>
      {[0, 1, 2, 3].map((i) => (
        <SkeletonPulse key={i} className="w-full h-16 rounded-xl" delay={0.15 + i * 0.05} />
      ))}
    </motion.div>
  );
}

function SkeletonCaliWorkout() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.45 }}
      className="space-y-4"
    >
      <div className="flex items-center justify-between">
        <SkeletonPulse className="w-28 h-3 rounded" />
        <SkeletonPulse className="w-16 h-3 rounded" delay={0.05} />
      </div>
      <SkeletonPulse className="w-full h-2 rounded-full" delay={0.1} />
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-2xl border border-[#4274B9]/10 p-4 space-y-3"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#111d30] border border-[#1e293b] flex items-center justify-center">
              <Dumbbell className="w-3.5 h-3.5 text-[#4274B9]/30" />
            </div>
            <SkeletonPulse className="flex-1 h-4 rounded-md" delay={0.15 + i * 0.1} />
          </div>
          <SkeletonPulse className="w-full h-20 rounded-xl" delay={0.2 + i * 0.1} />
          <SkeletonPulse className="w-32 h-9 rounded-lg" delay={0.25 + i * 0.1} />
        </div>
      ))}
    </motion.div>
  );
}