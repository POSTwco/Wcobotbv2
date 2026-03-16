/**
 * VIP Governor Badge — Animated crown with tier indicator
 * Shows next to the wallet address, on cards, in the navbar.
 */

import React from "react";
import { motion } from "motion/react";
import { Crown, Shield, Star, Gem } from "lucide-react";
import { useVIP } from "./vip-context";

interface VIPBadgeProps {
  /** "sm" = 16px, "md" = 24px, "lg" = 40px */
  size?: "sm" | "md" | "lg";
  /** Show tier label text */
  showLabel?: boolean;
  /** Show pulse ring */
  showRing?: boolean;
}

const SIZES = { sm: 16, md: 24, lg: 40 };

export function VIPBadge({ size = "md", showLabel = false, showRing = true }: VIPBadgeProps) {
  const { vipActive, tierName, governorCount } = useVIP();

  if (!vipActive) return null;

  const px = SIZES[size];
  const TierIcon = governorCount >= 10 ? Gem : governorCount >= 5 ? Star : governorCount >= 3 ? Crown : Shield;

  return (
    <div className="inline-flex items-center gap-1.5">
      <div className="relative" style={{ width: px, height: px }}>
        {/* Pulse ring */}
        {showRing && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ border: "1px solid rgba(212,168,67,0.4)" }}
            animate={{ scale: [1, 1.6, 1.6], opacity: [0.6, 0, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
          />
        )}

        {/* Icon */}
        <motion.div
          className="relative vip-crown"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <TierIcon
            style={{
              width: px,
              height: px,
              color: "#D4A843",
              filter: "drop-shadow(0 0 6px rgba(212,168,67,0.5))",
            }}
          />
        </motion.div>
      </div>

      {showLabel && (
        <span
          className="vip-gold-text text-xs font-bold tracking-wider"
          style={{ fontFamily: "Orbitron, sans-serif", fontSize: size === "sm" ? "0.55rem" : size === "md" ? "0.65rem" : "0.75rem" }}
        >
          {tierName.toUpperCase()}
        </span>
      )}
    </div>
  );
}

/** Inline "GOVERNOR" pill badge with gold glass effect */
export function VIPGovernorPill() {
  const { vipActive, tierName } = useVIP();
  if (!vipActive) return null;

  return (
    <motion.div
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full vip-glass-card vip-shimmer-overlay"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Crown className="w-3 h-3" style={{ color: "#D4A843" }} />
      <span
        className="vip-gold-text font-bold"
        style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.55rem", letterSpacing: "0.1em" }}
      >
        {tierName.toUpperCase()}
      </span>
    </motion.div>
  );
}
