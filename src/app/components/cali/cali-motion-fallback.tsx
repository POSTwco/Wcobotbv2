/**
 * Compact human silhouette motion fallback — used until Imagine assets load per pattern.
 */

import { motion } from "motion/react";
import type { AvatarGender } from "../../lib/cali-avatar-prefs";
import { CATEGORY_COLORS, type CaliCategory } from "../../lib/cali-exercise-guide";

interface Props {
  pattern: string;
  category: CaliCategory;
  gender: AvatarGender;
  className?: string;
}

function HumanBody({ gender, color, children }: { gender: AvatarGender; color: string; children: React.ReactNode }) {
  const shoulderW = gender === "male" ? 22 : 18;
  const hipW = gender === "male" ? 14 : 18;

  return (
    <svg viewBox="0 0 100 140" className="w-full h-full" aria-hidden>
      <defs>
        <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.95" />
          <stop offset="100%" stopColor={color} stopOpacity="0.55" />
        </linearGradient>
      </defs>
      {/* Head */}
      <ellipse cx="50" cy="16" rx="9" ry="10" fill="url(#bodyGrad)" />
      {/* Hair hint */}
      {gender === "male" ? (
        <path d="M41 12 Q50 6 59 12" stroke={color} strokeWidth="2" fill="none" opacity="0.6" />
      ) : (
        <ellipse cx="50" cy="14" rx="11" ry="8" fill={color} opacity="0.35" />
      )}
      {/* Torso */}
      <path
        d={`M${50 - shoulderW / 2} 28 Q50 26 ${50 + shoulderW / 2} 28 L${50 + hipW / 2} 62 Q50 64 ${50 - hipW / 2} 62 Z`}
        fill="url(#bodyGrad)"
      />
      {/* Legs base */}
      <rect x="42" y="62" width="7" height="32" rx="3.5" fill="url(#bodyGrad)" />
      <rect x="51" y="62" width="7" height="32" rx="3.5" fill="url(#bodyGrad)" />
      {children}
    </svg>
  );
}

function PushMotion({ gender, color }: { gender: AvatarGender; color: string }) {
  return (
    <HumanBody gender={gender} color={color}>
      <motion.g animate={{ rotate: [0, -8, 0] }} transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }} style={{ transformOrigin: "50px 32px" }}>
        <rect x="28" y="30" width="18" height="5" rx="2.5" fill={color} opacity="0.85" />
        <rect x="54" y="30" width="18" height="5" rx="2.5" fill={color} opacity="0.85" />
      </motion.g>
    </HumanBody>
  );
}

function PullMotion({ gender, color }: { gender: AvatarGender; color: string }) {
  return (
    <HumanBody gender={gender} color={color}>
      <line x1="20" y1="6" x2="80" y2="6" stroke={color} strokeWidth="2" opacity="0.4" />
      <motion.g animate={{ y: [0, -10, 0] }} transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}>
        <rect x="30" y="22" width="16" height="5" rx="2.5" fill={color} opacity="0.85" transform="rotate(-25 38 24)" />
        <rect x="54" y="22" width="16" height="5" rx="2.5" fill={color} opacity="0.85" transform="rotate(25 62 24)" />
      </motion.g>
    </HumanBody>
  );
}

function SquatMotion({ gender, color }: { gender: AvatarGender; color: string }) {
  return (
    <HumanBody gender={gender} color={color}>
      <motion.g animate={{ y: [0, 10, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
        <rect x="30" y="32" width="16" height="5" rx="2.5" fill={color} opacity="0.85" />
        <rect x="54" y="32" width="16" height="5" rx="2.5" fill={color} opacity="0.85" />
      </motion.g>
    </HumanBody>
  );
}

function HoldMotion({ gender, color }: { gender: AvatarGender; color: string }) {
  return (
    <HumanBody gender={gender} color={color}>
      <motion.g
        animate={{ scale: [1, 1.03, 1], opacity: [0.9, 1, 0.9] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "50px 45px" }}
      >
        <rect x="24" y="32" width="20" height="5" rx="2.5" fill={color} opacity="0.85" transform="rotate(-35 34 34)" />
        <rect x="56" y="32" width="20" height="5" rx="2.5" fill={color} opacity="0.85" transform="rotate(35 66 34)" />
      </motion.g>
    </HumanBody>
  );
}

function StretchMotion({ gender, color }: { gender: AvatarGender; color: string }) {
  return (
    <HumanBody gender={gender} color={color}>
      <motion.g
        animate={{ rotate: [0, 25, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "50px 32px" }}
      >
        <rect x="8" y="28" width="22" height="4" rx="2" fill={color} opacity="0.85" />
        <rect x="70" y="28" width="22" height="4" rx="2" fill={color} opacity="0.85" />
      </motion.g>
    </HumanBody>
  );
}

function LocomotionMotion({ gender, color }: { gender: AvatarGender; color: string }) {
  return (
    <HumanBody gender={gender} color={color}>
      <motion.g animate={{ x: [-6, 6, -6] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}>
        <rect x="28" y="34" width="16" height="5" rx="2.5" fill={color} opacity="0.85" transform="rotate(-15 36 36)" />
        <rect x="56" y="30" width="16" height="5" rx="2.5" fill={color} opacity="0.85" transform="rotate(20 64 32)" />
      </motion.g>
    </HumanBody>
  );
}

function resolveMotion(pattern: string, gender: AvatarGender, color: string) {
  if (pattern.includes("pull") || pattern === "vertical_pull" || pattern === "horizontal_pull") return <PullMotion gender={gender} color={color} />;
  if (pattern.includes("squat") || pattern === "lunge" || pattern === "hinge") return <SquatMotion gender={gender} color={color} />;
  if (pattern === "iso_hold" || pattern === "anti_extension" || pattern === "anti_rotation" || pattern === "flexion") return <HoldMotion gender={gender} color={color} />;
  if (pattern === "locomotion" || pattern === "plyo" || pattern === "conditioning") return <LocomotionMotion gender={gender} color={color} />;
  if (pattern === "stretch" || pattern === "flexion") return <StretchMotion gender={gender} color={color} />;
  if (pattern.includes("push") || pattern === "vertical_push") return <PushMotion gender={gender} color={color} />;
  return <PushMotion gender={gender} color={color} />;
}

export function CaliMotionFallback({ pattern, category, gender, className = "" }: Props) {
  const color = CATEGORY_COLORS[category] ?? "#4274B9";
  return (
    <div
      className={`relative overflow-hidden rounded-xl flex items-center justify-center ${className}`}
      style={{
        background: `linear-gradient(160deg, ${color}14, rgba(11,17,32,0.85))`,
        border: `1px solid ${color}30`,
      }}
    >
      <div className="w-full h-full p-2">{resolveMotion(pattern, gender, color)}</div>
    </div>
  );
}