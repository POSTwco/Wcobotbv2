/**
 * BOTBSpinner — Site-wide branded loading experience
 * ====================================================
 * Reusable 3D spinning BOTB shield card with orbiting particles,
 * cycling status messages, and progress dots.
 *
 * Used across all data-loading pages for a premium, cohesive feel.
 * Pass custom `messages` for page-specific context.
 * Optionally render `children` below the spinner (e.g. skeleton cards).
 */

import { useEffect, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import botbShield from "figma:asset/2d6e7a2459a1a0d372fe2cf8a444eed0da642b5f.png";
import wcoLogoWhite from "figma:asset/22c05ec446c8158ec65d140d4aaa2c8dc2532079.png";

const ORBITRON = { fontFamily: "Orbitron, sans-serif" } as const;

// Orbiting particle positions (pre-computed)
const PARTICLES = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  delay: i * 0.35,
  duration: 3 + Math.random() * 2,
  size: 2 + Math.random() * 3,
  orbit: 70 + Math.random() * 40,
  color: i % 3 === 0 ? "#EF4444" : i % 3 === 1 ? "#4274B9" : "#6AA3E0",
}));

const DEFAULT_MESSAGES = [
  "Loading...",
  "Fetching data...",
  "Syncing...",
  "Preparing...",
];

interface BOTBSpinnerProps {
  /** Custom cycling messages — defaults to generic ones */
  messages?: string[];
  /** How fast to cycle messages (ms). Default 2200 */
  messageInterval?: number;
  /** Optional skeleton or extra content below the spinner */
  children?: ReactNode;
  /** Compact mode — smaller card, no children. Good for inline use */
  compact?: boolean;
}

export function BOTBSpinner({
  messages = DEFAULT_MESSAGES,
  messageInterval = 2200,
  children,
  compact = false,
}: BOTBSpinnerProps) {
  const [msgIdx, setMsgIdx] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => setMsgIdx((p) => (p + 1) % messages.length), messageInterval);
    return () => clearInterval(iv);
  }, [messages.length, messageInterval]);

  const cardSize = compact
    ? "w-24 h-32 sm:w-28 sm:h-36"
    : "w-36 h-48 sm:w-44 sm:h-56";
  const shieldSize = compact
    ? "w-10 h-10 sm:w-12 sm:h-12"
    : "w-16 h-16 sm:w-20 sm:h-20";

  return (
    <div className={`flex flex-col items-center ${compact ? "gap-4 py-4" : "gap-8 py-8 sm:py-12"}`}>
      {/* ── 3D Spinning Card ── */}
      <div className="relative" style={{ perspective: "900px" }}>
        {/* Ambient glow */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-40 h-40 rounded-full bg-[#4274B9]/20 blur-[60px] animate-pulse" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="w-28 h-28 rounded-full blur-[40px]"
            style={{
              background: "radial-gradient(circle, rgba(239,68,68,0.15) 0%, transparent 70%)",
              animation: "pulse 2s ease-in-out infinite alternate",
            }}
          />
        </div>

        {/* Orbiting particles */}
        {!compact &&
          PARTICLES.map((p) => (
            <motion.div
              key={p.id}
              className="absolute rounded-full pointer-events-none"
              style={{
                width: p.size,
                height: p.size,
                backgroundColor: p.color,
                boxShadow: `0 0 ${p.size * 3}px ${p.color}`,
                top: "50%",
                left: "50%",
              }}
              animate={{
                x: [
                  Math.cos(0) * p.orbit,
                  Math.cos(Math.PI * 0.5) * p.orbit,
                  Math.cos(Math.PI) * p.orbit,
                  Math.cos(Math.PI * 1.5) * p.orbit,
                  Math.cos(Math.PI * 2) * p.orbit,
                ],
                y: [
                  Math.sin(0) * p.orbit * 0.4,
                  Math.sin(Math.PI * 0.5) * p.orbit * 0.4,
                  Math.sin(Math.PI) * p.orbit * 0.4,
                  Math.sin(Math.PI * 1.5) * p.orbit * 0.4,
                  Math.sin(Math.PI * 2) * p.orbit * 0.4,
                ],
                opacity: [0.3, 1, 0.3, 1, 0.3],
                scale: [0.8, 1.3, 0.8, 1.3, 0.8],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                repeat: Infinity,
                ease: "linear",
              }}
            />
          ))}

        {/* The spinning card */}
        <motion.div
          className={`relative ${cardSize}`}
          style={{ transformStyle: "preserve-3d" }}
          animate={{ rotateY: [0, 360] }}
          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        >
          {/* Front face */}
          <div
            className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-3 overflow-hidden"
            style={{
              backfaceVisibility: "hidden",
              background: "linear-gradient(145deg, #0d1526 0%, #111d30 50%, #0B1120 100%)",
              border: "1px solid rgba(66,116,185,0.3)",
              boxShadow:
                "0 0 30px rgba(66,116,185,0.15), inset 0 1px 0 rgba(255,255,255,0.05), 0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            {/* Holographic shimmer overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(105deg, transparent 30%, rgba(106,163,224,0.08) 45%, rgba(239,68,68,0.06) 55%, transparent 70%)",
                animation: "botbShimmerSlide 3s ease-in-out infinite",
              }}
            />
            {/* Top corner accent */}
            <div
              className="absolute top-0 left-0 w-16 h-16 pointer-events-none"
              style={{
                background: "linear-gradient(135deg, rgba(66,116,185,0.15), transparent)",
                borderRadius: "16px 0 0 0",
              }}
            />
            {/* Bottom corner accent */}
            <div
              className="absolute bottom-0 right-0 w-16 h-16 pointer-events-none"
              style={{
                background: "linear-gradient(315deg, rgba(239,68,68,0.1), transparent)",
                borderRadius: "0 0 16px 0",
              }}
            />

            {/* BOTB Shield */}
            <div className="relative">
              <div className="absolute inset-0 scale-150 rounded-full bg-[#4274B9]/10 blur-xl" />
              <ImageWithFallback
                src={botbShield}
                alt="BOTB"
                className={`${shieldSize} object-contain relative z-10 drop-shadow-[0_0_12px_rgba(66,116,185,0.4)]`}
              />
            </div>

            <div className="text-center relative z-10">
              <p
                className="text-[0.55rem] sm:text-[0.65rem] font-black tracking-[0.25em] text-[#6AA3E0]"
                style={ORBITRON}
              >
                BATTLE
              </p>
              <p
                className="text-[0.45rem] sm:text-[0.5rem] font-bold tracking-[0.15em] text-[#8494A7] mt-0.5"
                style={ORBITRON}
              >
                OF THE BARS
              </p>
            </div>

            {/* Edge lines */}
            <div className="absolute top-3 left-3 w-4 h-4 border-t border-l border-[#4274B9]/30 rounded-tl-md" />
            <div className="absolute top-3 right-3 w-4 h-4 border-t border-r border-[#4274B9]/30 rounded-tr-md" />
            <div className="absolute bottom-3 left-3 w-4 h-4 border-b border-l border-[#EF4444]/20 rounded-bl-md" />
            <div className="absolute bottom-3 right-3 w-4 h-4 border-b border-r border-[#EF4444]/20 rounded-br-md" />
          </div>

          {/* Back face */}
          <div
            className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-3 overflow-hidden"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              background: "linear-gradient(145deg, #111d30 0%, #0d1526 50%, #0B1120 100%)",
              border: "1px solid rgba(239,68,68,0.2)",
              boxShadow:
                "0 0 30px rgba(239,68,68,0.1), inset 0 1px 0 rgba(255,255,255,0.05), 0 20px 60px rgba(0,0,0,0.5)",
            }}
          >
            {/* Holographic shimmer */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(105deg, transparent 30%, rgba(239,68,68,0.08) 45%, rgba(66,116,185,0.06) 55%, transparent 70%)",
                animation: "botbShimmerSlide 3s ease-in-out infinite reverse",
              }}
            />

            {/* WCO Logo */}
            <div className="relative">
              <div className="absolute inset-0 scale-150 rounded-full bg-[#EF4444]/5 blur-xl" />
              <ImageWithFallback
                src={wcoLogoWhite}
                alt="WCO"
                className="w-20 h-12 sm:w-24 sm:h-14 object-contain relative z-10 drop-shadow-[0_0_12px_rgba(239,68,68,0.3)]"
              />
            </div>

            <div className="text-center relative z-10">
              <p
                className="text-[0.45rem] sm:text-[0.5rem] font-bold tracking-[0.2em] text-[#8494A7]"
                style={ORBITRON}
              >
                WORLD CALISTHENICS
              </p>
              <p
                className="text-[0.4rem] sm:text-[0.45rem] font-medium tracking-[0.15em] text-[#8494A7]/60 mt-0.5"
                style={ORBITRON}
              >
                ORGANIZATION
              </p>
            </div>

            {/* Edge lines */}
            <div className="absolute top-3 left-3 w-4 h-4 border-t border-l border-[#EF4444]/20 rounded-tl-md" />
            <div className="absolute top-3 right-3 w-4 h-4 border-t border-r border-[#EF4444]/20 rounded-tr-md" />
            <div className="absolute bottom-3 left-3 w-4 h-4 border-b border-l border-[#4274B9]/30 rounded-bl-md" />
            <div className="absolute bottom-3 right-3 w-4 h-4 border-b border-r border-[#4274B9]/30 rounded-br-md" />
          </div>
        </motion.div>
      </div>

      {/* ── Loading text ── */}
      <div className="text-center space-y-2">
        <AnimatePresence mode="wait">
          <motion.p
            key={msgIdx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
            className="text-[#8494A7] text-sm"
            style={ORBITRON}
          >
            {messages[msgIdx]}
          </motion.p>
        </AnimatePresence>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5">
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-[#4274B9]"
              animate={{
                opacity: [0.2, 1, 0.2],
                scale: [0.8, 1.2, 0.8],
              }}
              transition={{
                duration: 1.2,
                delay: i * 0.2,
                repeat: Infinity,
              }}
            />
          ))}
        </div>
      </div>

      {/* ── Optional skeleton/children ── */}
      {children}

      {/* Inline keyframes */}
      <style>{`
        @keyframes botbShimmerSlide {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}

// ─── Skeleton helpers for reuse across pages ─────────────────────────────────

/** Generic shimmer pulse block */
export function SkeletonPulse({ className = "", delay = 0 }: { className?: string; delay?: number }) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ backgroundColor: "rgba(30,41,59,0.6)" }}
    >
      <motion.div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, rgba(66,116,185,0.08) 40%, rgba(106,163,224,0.12) 50%, rgba(66,116,185,0.08) 60%, transparent 100%)",
        }}
        animate={{ x: ["-100%", "200%"] }}
        transition={{
          duration: 1.8,
          delay,
          repeat: Infinity,
          ease: "easeInOut",
          repeatDelay: 0.5,
        }}
      />
    </div>
  );
}

/** Skeleton card for athlete grid loading */
export function SkeletonAthleteCard({ delay = 0 }: { delay?: number }) {
  return (
    <div className="bg-[#111827] border border-[#4274B9]/10 rounded-2xl overflow-hidden">
      {/* Image area */}
      <SkeletonPulse className="h-72 sm:h-96 w-full" delay={delay} />
      {/* Info */}
      <div className="p-3 sm:p-5 space-y-3">
        <SkeletonPulse className="w-3/4 h-4 rounded-md" delay={delay + 0.1} />
        <SkeletonPulse className="w-1/2 h-3 rounded-md" delay={delay + 0.15} />
        <div className="grid grid-cols-3 gap-3">
          <SkeletonPulse className="h-10 rounded-lg" delay={delay + 0.2} />
          <SkeletonPulse className="h-10 rounded-lg" delay={delay + 0.25} />
          <SkeletonPulse className="h-10 rounded-lg" delay={delay + 0.3} />
        </div>
        {/* Skill bars */}
        <div className="space-y-1.5">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-1.5">
              <SkeletonPulse className="w-12 h-2 rounded" delay={delay + 0.3 + i * 0.05} />
              <SkeletonPulse className="flex-1 h-1 rounded-full" delay={delay + 0.35 + i * 0.05} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/** Skeleton row for leaderboard list loading */
export function SkeletonLeaderboardRow({ delay = 0 }: { delay?: number }) {
  return (
    <div className="bg-[#111827] border border-[#4274B9]/10 rounded-xl p-3 sm:p-4 flex items-center gap-3 sm:gap-4">
      <SkeletonPulse className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg shrink-0" delay={delay} />
      <SkeletonPulse className="w-10 h-10 sm:w-12 sm:h-12 rounded-full shrink-0" delay={delay + 0.05} />
      <div className="flex-1 space-y-2">
        <SkeletonPulse className="w-32 h-4 rounded-md" delay={delay + 0.1} />
        <SkeletonPulse className="w-20 h-3 rounded-md" delay={delay + 0.15} />
      </div>
      <div className="hidden sm:flex items-center gap-5">
        <SkeletonPulse className="w-12 h-8 rounded-md" delay={delay + 0.2} />
        <SkeletonPulse className="w-12 h-8 rounded-md" delay={delay + 0.25} />
        <SkeletonPulse className="w-12 h-8 rounded-md" delay={delay + 0.3} />
      </div>
    </div>
  );
}

/** Skeleton card for governance proposal loading */
export function SkeletonProposalCard({ delay = 0 }: { delay?: number }) {
  return (
    <div className="bg-[#111827] border border-[#4274B9]/10 rounded-2xl overflow-hidden p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-2">
        <SkeletonPulse className="w-20 h-5 rounded-full" delay={delay} />
        <SkeletonPulse className="w-16 h-5 rounded" delay={delay + 0.05} />
      </div>
      <SkeletonPulse className="w-3/4 h-5 rounded-md" delay={delay + 0.1} />
      <SkeletonPulse className="w-full h-3 rounded-md" delay={delay + 0.15} />
      <SkeletonPulse className="w-2/3 h-3 rounded-md" delay={delay + 0.2} />
      {/* Vote bar */}
      <div className="space-y-2">
        <div className="flex justify-between">
          <SkeletonPulse className="w-16 h-3 rounded" delay={delay + 0.25} />
          <SkeletonPulse className="w-16 h-3 rounded" delay={delay + 0.3} />
        </div>
        <SkeletonPulse className="w-full h-3 rounded-full" delay={delay + 0.35} />
      </div>
      {/* Voter stats */}
      <div className="flex justify-between">
        <SkeletonPulse className="w-24 h-3 rounded" delay={delay + 0.4} />
        <SkeletonPulse className="w-28 h-3 rounded" delay={delay + 0.45} />
      </div>
    </div>
  );
}
