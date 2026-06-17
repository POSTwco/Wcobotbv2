/**
 * Pattern-based SVG motion previews — 3–5s loops, no external assets.
 */

import { motion } from "motion/react";
import { CATEGORY_COLORS, type CaliCategory } from "../../lib/cali-exercise-guide";

interface Props {
  pattern: string;
  category: CaliCategory;
  className?: string;
}

const ACCENT = "#6AA3E0";

function StickFigure({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <svg viewBox="0 0 120 100" className="w-full h-full" aria-hidden>
      <circle cx="60" cy="14" r="8" fill={color} opacity={0.9} />
      <line x1="60" y1="22" x2="60" y2="52" stroke={color} strokeWidth="3" strokeLinecap="round" />
      {children}
    </svg>
  );
}

function PushMotion({ color }: { color: string }) {
  return (
    <StickFigure color={color}>
      <motion.line
        x1="60" y1="32" x2="38" y2="48" stroke={color} strokeWidth="3" strokeLinecap="round"
        animate={{ x2: [38, 28, 38], y2: [48, 58, 48] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.line
        x1="60" y1="32" x2="82" y2="48" stroke={color} strokeWidth="3" strokeLinecap="round"
        animate={{ x2: [82, 92, 82], y2: [48, 58, 48] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <line x1="60" y1="52" x2="48" y2="78" stroke={color} strokeWidth="3" strokeLinecap="round" />
      <line x1="60" y1="52" x2="72" y2="78" stroke={color} strokeWidth="3" strokeLinecap="round" />
    </StickFigure>
  );
}

function PullMotion({ color }: { color: string }) {
  return (
    <StickFigure color={color}>
      <line x1="30" y1="8" x2="90" y2="8" stroke={ACCENT} strokeWidth="2" strokeDasharray="4 2" />
      <motion.g animate={{ y: [0, -12, 0] }} transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}>
        <line x1="60" y1="32" x2="42" y2="18" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <line x1="60" y1="32" x2="78" y2="18" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <line x1="60" y1="52" x2="52" y2="80" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <line x1="60" y1="52" x2="68" y2="80" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <circle cx="60" cy="14" r="8" fill={color} opacity={0.9} />
        <line x1="60" y1="22" x2="60" y2="52" stroke={color} strokeWidth="3" strokeLinecap="round" />
      </motion.g>
    </StickFigure>
  );
}

function SquatMotion({ color }: { color: string }) {
  return (
    <StickFigure color={color}>
      <motion.g animate={{ y: [0, 14, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
        <line x1="60" y1="32" x2="40" y2="42" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <line x1="60" y1="32" x2="80" y2="42" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <line x1="60" y1="52" x2="44" y2="72" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <line x1="60" y1="52" x2="76" y2="72" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <circle cx="60" cy="14" r="8" fill={color} opacity={0.9} />
        <line x1="60" y1="22" x2="60" y2="52" stroke={color} strokeWidth="3" strokeLinecap="round" />
      </motion.g>
    </StickFigure>
  );
}

function HoldMotion({ color }: { color: string }) {
  return (
    <StickFigure color={color}>
      <motion.g
        animate={{ scale: [1, 1.02, 1], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "60px 50px" }}
      >
        <line x1="60" y1="32" x2="34" y2="58" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <line x1="60" y1="32" x2="86" y2="58" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <line x1="60" y1="52" x2="60" y2="82" stroke={color} strokeWidth="3" strokeLinecap="round" />
      </motion.g>
    </StickFigure>
  );
}

function LocomotionMotion({ color }: { color: string }) {
  return (
    <StickFigure color={color}>
      <motion.g animate={{ x: [-8, 8, -8] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}>
        <line x1="60" y1="32" x2="44" y2="48" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <line x1="60" y1="32" x2="76" y2="40" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <line x1="60" y1="52" x2="50" y2="78" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <line x1="60" y1="52" x2="74" y2="70" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <circle cx="60" cy="14" r="8" fill={color} opacity={0.9} />
        <line x1="60" y1="22" x2="60" y2="52" stroke={color} strokeWidth="3" strokeLinecap="round" />
      </motion.g>
    </StickFigure>
  );
}

function StretchMotion({ color }: { color: string }) {
  return (
    <StickFigure color={color}>
      <motion.g animate={{ rotate: [0, 8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} style={{ transformOrigin: "60px 52px" }}>
        <line x1="60" y1="32" x2="38" y2="28" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <line x1="60" y1="32" x2="82" y2="28" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <line x1="60" y1="52" x2="48" y2="82" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <line x1="60" y1="52" x2="72" y2="82" stroke={color} strokeWidth="3" strokeLinecap="round" />
        <circle cx="60" cy="14" r="8" fill={color} opacity={0.9} />
        <line x1="60" y1="22" x2="60" y2="52" stroke={color} strokeWidth="3" strokeLinecap="round" />
      </motion.g>
    </StickFigure>
  );
}

function resolveMotion(pattern: string, color: string) {
  if (pattern.includes("pull") || pattern === "vertical_pull" || pattern === "horizontal_pull") return <PullMotion color={color} />;
  if (pattern.includes("squat") || pattern === "lunge" || pattern === "hinge") return <SquatMotion color={color} />;
  if (pattern === "iso_hold" || pattern === "anti_extension" || pattern === "anti_rotation") return <HoldMotion color={color} />;
  if (pattern === "locomotion" || pattern === "plyo" || pattern === "conditioning") return <LocomotionMotion color={color} />;
  if (pattern === "stretch" || pattern === "flexion") return <StretchMotion color={color} />;
  if (pattern.includes("push") || pattern === "vertical_push") return <PushMotion color={color} />;
  return <PushMotion color={color} />;
}

export function CaliExerciseMotion({ pattern, category, className = "" }: Props) {
  const color = CATEGORY_COLORS[category] ?? ACCENT;
  return (
    <div
      className={`relative overflow-hidden rounded-xl ${className}`}
      style={{
        background: `linear-gradient(135deg, ${color}12, rgba(11,17,32,0.6))`,
        border: `1px solid ${color}30`,
        aspectRatio: "16/10",
      }}
    >
      <motion.div
        className="absolute inset-0 flex items-center justify-center p-4"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <div className="w-28 h-24">{resolveMotion(pattern, color)}</div>
      </motion.div>
      <div
        className="absolute bottom-0 left-0 right-0 h-8"
        style={{ background: `linear-gradient(transparent, ${color}08)` }}
      />
    </div>
  );
}