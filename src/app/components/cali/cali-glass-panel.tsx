import { motion } from "motion/react";
import type { ReactNode } from "react";

interface CaliGlassPanelProps {
  children: ReactNode;
  accent?: string;
  className?: string;
  glow?: boolean;
  pulseKey?: string | number;
}

export function CaliGlassPanel({
  children,
  accent = "#4274B9",
  className = "",
  glow = false,
  pulseKey,
}: CaliGlassPanelProps) {
  return (
    <motion.div
      key={pulseKey}
      initial={pulseKey != null ? { opacity: 0.85 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className={`rounded-2xl border backdrop-blur-xl ${className}`}
      style={{
        background: "linear-gradient(145deg, rgba(255,255,255,0.06), rgba(11,17,32,0.45))",
        borderColor: `${accent}33`,
        boxShadow: glow ? `0 0 24px ${accent}18, inset 0 1px 0 rgba(255,255,255,0.06)` : "inset 0 1px 0 rgba(255,255,255,0.04)",
      }}
    >
      {children}
    </motion.div>
  );
}