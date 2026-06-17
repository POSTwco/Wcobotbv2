/**
 * Avatar motion player — Imagine frame loops when available, human SVG fallback otherwise.
 */

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { AvatarGender } from "../../lib/cali-avatar-prefs";
import { getMotionFrames, type MotionSize } from "../../lib/cali-motion-assets";
import { CATEGORY_COLORS, type CaliCategory } from "../../lib/cali-exercise-guide";
import { CaliMotionFallback } from "./cali-motion-fallback";

const SIZE_CLASS: Record<MotionSize, string> = {
  compact: "w-[72px] h-[90px]",
  rail: "w-[160px] h-[200px]",
};

interface Props {
  pattern: string;
  category: CaliCategory;
  gender: AvatarGender;
  size?: MotionSize;
  className?: string;
}

export function CaliAvatarMotion({
  pattern, category, gender, size = "rail", className = "",
}: Props) {
  const color = CATEGORY_COLORS[category] ?? "#4274B9";
  const frames = getMotionFrames(pattern, gender);
  const [frameIdx, setFrameIdx] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setReducedMotion(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    setFrameIdx(0);
  }, [pattern, gender]);

  useEffect(() => {
    if (!frames || reducedMotion) return;
    const id = setInterval(() => setFrameIdx((i) => (i + 1) % frames.length), 800);
    return () => clearInterval(id);
  }, [frames, reducedMotion]);

  if (!frames) {
    return (
      <CaliMotionFallback
        pattern={pattern}
        category={category}
        gender={gender}
        className={`${SIZE_CLASS[size]} ${className}`}
      />
    );
  }

  return (
    <div
      className={`relative overflow-hidden rounded-xl ${SIZE_CLASS[size]} ${className}`}
      style={{
        background: `linear-gradient(160deg, ${color}14, rgba(11,17,32,0.9))`,
        border: `1px solid ${color}35`,
      }}
    >
      <AnimatePresence mode="sync">
        <motion.img
          key={`${pattern}-${gender}-${frameIdx}`}
          src={frames[frameIdx]}
          alt=""
          className="absolute inset-0 w-full h-full object-contain p-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          draggable={false}
        />
      </AnimatePresence>
    </div>
  );
}