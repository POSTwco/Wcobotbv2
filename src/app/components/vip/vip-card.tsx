/**
 * VIP Glassmorphic Card Wrapper
 * Wraps any content in a gold-tinged glassmorphic container with
 * shimmer overlay, glow border, and hover effects.
 * Falls back to standard styling when VIP is not active.
 */

import React, { useRef, useCallback } from "react";
import { motion } from "motion/react";
import { useVIP } from "./vip-context";

interface VIPCardProps {
  children: React.ReactNode;
  className?: string;
  /** Standard (non-VIP) class to fall back to */
  fallbackClassName?: string;
  /** Enable 3D tilt on hover */
  tilt?: boolean;
  /** Enable floating animation */
  float?: boolean;
  /** Enable shimmer sweep */
  shimmer?: boolean;
  /** Enable border glow pulse */
  glow?: boolean;
  onClick?: () => void;
}

export function VIPCard({
  children,
  className = "",
  fallbackClassName = "",
  tilt = false,
  float = false,
  shimmer = true,
  glow = false,
  onClick,
}: VIPCardProps) {
  const { vipActive, sound } = useVIP();
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!tilt || !vipActive || !cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      cardRef.current.style.transform = `perspective(800px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg)`;
    },
    [tilt, vipActive]
  );

  const handleMouseLeave = useCallback(() => {
    if (!tilt || !cardRef.current) return;
    cardRef.current.style.transform = "perspective(800px) rotateY(0deg) rotateX(0deg)";
  }, [tilt]);

  const handleMouseEnter = useCallback(() => {
    if (vipActive) {
      sound.playHover();
    }
  }, [vipActive, sound]);

  const handleClick = useCallback(() => {
    if (vipActive) sound.playClick();
    onClick?.();
  }, [vipActive, sound, onClick]);

  if (!vipActive) {
    return (
      <div className={fallbackClassName || className} onClick={onClick}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      ref={cardRef}
      className={`vip-glass-card ${shimmer ? "vip-shimmer-overlay" : ""} ${glow ? "vip-glow-border" : ""} ${float ? "vip-float" : ""} ${className}`}
      style={{ transition: "transform 0.15s ease-out, box-shadow 0.3s ease" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onMouseEnter={handleMouseEnter}
      onClick={handleClick}
      whileHover={{ scale: 1.01 }}
    >
      {children}
    </motion.div>
  );
}
