/**
 * VIP Effects Layer
 * - Cursor gold glow that follows mouse
 * - Sound toggle button (floating, bottom-right)
 * - Gold radiance overlay on page edges
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Volume2, VolumeX, Crown } from "lucide-react";
import { useVIP } from "./vip-context";

/** Cursor gold glow — a soft radial gradient follows the mouse */
export function VIPCursorGlow() {
  const { vipActive } = useVIP();
  const [pos, setPos] = useState({ x: -200, y: -200 });

  useEffect(() => {
    if (!vipActive) return;
    const handler = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, [vipActive]);

  if (!vipActive) return null;

  return (
    <div
      className="fixed pointer-events-none"
      style={{
        zIndex: 6,
        left: pos.x - 100,
        top: pos.y - 100,
        width: 200,
        height: 200,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(212,168,67,0.07) 0%, transparent 70%)",
        transition: "left 0.1s ease-out, top 0.1s ease-out",
      }}
    />
  );
}

/** Floating sound toggle button */
export function VIPSoundToggle() {
  const { vipActive, soundEnabled, setSoundEnabled, sound } = useVIP();

  if (!vipActive) return null;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      className="fixed bottom-6 right-6 w-10 h-10 rounded-full vip-glass-card flex items-center justify-center hover:scale-110 transition-transform"
      style={{ zIndex: 60 }}
      onClick={() => {
        setSoundEnabled(!soundEnabled);
        if (!soundEnabled) sound.playClick();
      }}
      title={soundEnabled ? "Mute VIP sounds" : "Enable VIP sounds"}
    >
      {soundEnabled ? (
        <Volume2 className="w-4 h-4" style={{ color: "#D4A843" }} />
      ) : (
        <VolumeX className="w-4 h-4" style={{ color: "#8494A7" }} />
      )}
    </motion.button>
  );
}

/** Gold radiance corners — subtle gold glow at the edges of the viewport */
export function VIPRadiance() {
  const { vipActive } = useVIP();

  if (!vipActive) return null;

  return (
    <div className="fixed inset-0 pointer-events-none" style={{ zIndex: 4 }}>
      {/* Top radiance */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-32"
        style={{
          background: "radial-gradient(ellipse at center top, rgba(212,168,67,0.06) 0%, transparent 70%)",
          animation: "vip-radiance 6s ease-in-out infinite",
        }}
      />
      {/* Left edge glow */}
      <div
        className="absolute top-1/4 left-0 w-24 h-[50vh]"
        style={{
          background: "radial-gradient(ellipse at left center, rgba(212,168,67,0.04) 0%, transparent 70%)",
          animation: "vip-radiance 8s ease-in-out infinite",
          animationDelay: "2s",
        }}
      />
      {/* Right edge glow */}
      <div
        className="absolute top-1/3 right-0 w-24 h-[50vh]"
        style={{
          background: "radial-gradient(ellipse at right center, rgba(232,180,184,0.03) 0%, transparent 70%)",
          animation: "vip-radiance 7s ease-in-out infinite",
          animationDelay: "4s",
        }}
      />
    </div>
  );
}

/** VIP Governor floating indicator — subtle crown that shows VIP mode is active */
export function VIPIndicator() {
  const { vipActive, tierName } = useVIP();
  const [dismissed, setDismissed] = useState(false);

  if (!vipActive || dismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 5, duration: 0.5 }}
      className="fixed bottom-6 left-6 flex items-center gap-2 px-3 py-2 rounded-full vip-glass-card vip-shimmer-overlay cursor-pointer"
      style={{ zIndex: 60 }}
      onClick={() => setDismissed(true)}
    >
      <Crown className="w-3.5 h-3.5 vip-crown" style={{ color: "#D4A843" }} />
      <span className="vip-gold-text text-xs font-bold" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.6rem" }}>
        VIP MODE ACTIVE
      </span>
    </motion.div>
  );
}
