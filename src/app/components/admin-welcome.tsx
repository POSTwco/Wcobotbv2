/**
 * Admin Welcome Overlay — CEO Dopamine Machine
 * ===============================================
 * Plays on every successful admin sign-in:
 *   1. 33-40Hz pulsing sine wave (3s) via Web Audio API
 *   2. Haptic vibration pattern via navigator.vibrate (mobile)
 *   3. Golden particle burst + radial glow
 *   4. WCO shield branding with spring animations
 *   5. Full SVG American flag with wave animation
 *   6. Auto-dismisses after 3 seconds
 *
 * This is a pure presentation component — no side effects beyond audio/haptic.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Shield, Star, Zap } from "lucide-react";

interface AdminWelcomeProps {
  show: boolean;
  walletId: string;
  onComplete: () => void;
}

// ---------------------------------------------------------------------------
// SVG American Flag — Proper patriotic rendering with animated wave
// ---------------------------------------------------------------------------
function AmericanFlag({ size = 48 }: { size?: number }) {
  const w = size;
  const h = size * 0.6;
  const stripeH = h / 13;
  const cantonW = w * 0.4;
  const cantonH = stripeH * 7;

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      width={w}
      height={h}
      className="drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]"
      style={{ filter: "drop-shadow(0 0 6px rgba(255,255,255,0.15))" }}
    >
      {/* Stripes — 13 alternating red and white */}
      {Array.from({ length: 13 }, (_, i) => (
        <rect
          key={`stripe-${i}`}
          x={0}
          y={i * stripeH}
          width={w}
          height={stripeH + 0.5}
          fill={i % 2 === 0 ? "#B22234" : "#FFFFFF"}
        />
      ))}

      {/* Canton (blue field) */}
      <rect x={0} y={0} width={cantonW} height={cantonH} fill="#3C3B6E" />

      {/* Stars — simplified 5x4 + 4x3 offset grid (50 stars approximation) */}
      {(() => {
        const stars: { cx: number; cy: number }[] = [];
        const cols = 6;
        const rows = 5;
        const offsetCols = 5;
        const offsetRows = 4;
        const starW = cantonW / (cols + 0.5);
        const starHt = cantonH / (rows + 0.5);

        // Main grid
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            stars.push({
              cx: starW * (c + 0.7),
              cy: starHt * (r + 0.7),
            });
          }
        }
        // Offset grid
        for (let r = 0; r < offsetRows; r++) {
          for (let c = 0; c < offsetCols; c++) {
            stars.push({
              cx: starW * (c + 1.2),
              cy: starHt * (r + 1.2),
            });
          }
        }

        return stars.map((s, i) => (
          <circle
            key={`star-${i}`}
            cx={s.cx}
            cy={s.cy}
            r={Math.min(starW, starHt) * 0.18}
            fill="#FFFFFF"
          />
        ));
      })()}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Golden Particle System
// ---------------------------------------------------------------------------
function GoldenParticles({ count = 40 }: { count?: number }) {
  const particles = useRef(
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 6 + 2,
      delay: Math.random() * 0.6,
      duration: 1.2 + Math.random() * 1.2,
      angle: Math.random() * 360,
      distance: 30 + Math.random() * 70,
      type: Math.random() > 0.6 ? "star" : "dot" as "star" | "dot",
    }))
  ).current;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => {
        const rad = (p.angle * Math.PI) / 180;
        const tx = Math.cos(rad) * p.distance;
        const ty = Math.sin(rad) * p.distance;
        return (
          <motion.div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              background: p.type === "star"
                ? "radial-gradient(circle, #FFD700 0%, #D4A843 50%, transparent 100%)"
                : "radial-gradient(circle, #D4A843 0%, #B8932B 60%, transparent 100%)",
              boxShadow: p.type === "star" ? "0 0 8px 2px rgba(212,168,67,0.6)" : "0 0 4px 1px rgba(212,168,67,0.3)",
            }}
            initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
            animate={{
              opacity: [0, 1, 1, 0],
              scale: [0, 1.5, 1, 0.5],
              x: tx,
              y: ty,
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              ease: "easeOut",
            }}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confetti Burst — Red, White, Blue + Gold
// ---------------------------------------------------------------------------
function ConfettiBurst({ count = 30 }: { count?: number }) {
  const confetti = useRef(
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: 45 + Math.random() * 10,
      angle: Math.random() * 360,
      distance: 80 + Math.random() * 180,
      rotation: Math.random() * 720 - 360,
      width: 4 + Math.random() * 6,
      height: 8 + Math.random() * 10,
      color: ["#D4A843", "#FFD700", "#ff3b3b", "#3b82f6", "#ffffff", "#B91C1C", "#1D4ED8"][Math.floor(Math.random() * 7)],
      delay: Math.random() * 0.4,
      duration: 1.5 + Math.random() * 1,
    }))
  ).current;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {confetti.map((c) => {
        const rad = (c.angle * Math.PI) / 180;
        const tx = Math.cos(rad) * c.distance;
        const ty = Math.sin(rad) * c.distance + 40; // gravity pull
        return (
          <motion.div
            key={c.id}
            className="absolute"
            style={{
              left: `${c.x}%`,
              top: "45%",
              width: c.width,
              height: c.height,
              backgroundColor: c.color,
              borderRadius: 1,
            }}
            initial={{ opacity: 0, scale: 0, x: 0, y: 0, rotate: 0 }}
            animate={{
              opacity: [0, 1, 1, 0.8, 0],
              scale: [0, 1, 1, 0.8],
              x: tx,
              y: ty,
              rotate: c.rotation,
            }}
            transition={{
              duration: c.duration,
              delay: c.delay,
              ease: "easeOut",
            }}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Welcome Overlay
// ---------------------------------------------------------------------------
export function AdminWelcomeOverlay({ show, walletId, onComplete }: AdminWelcomeProps) {
  const [visible, setVisible] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Play short bass reward pulse (~1.5s) + haptic
  const playWelcomeEffects = useCallback(() => {
    // --- Haptic vibration (mobile) ---
    try {
      if (navigator.vibrate) {
        navigator.vibrate([60, 30, 60, 30, 100]);
      }
    } catch { /* vibrate not supported */ }

    // --- Short bass reward pulse via Web Audio API ---
    // Quick 1.5s pulsing bass hit — like an achievement unlock sound
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      const t = ctx.currentTime;
      const DURATION = 1.5; // Total audio length in seconds

      // Primary bass tone: quick 35Hz → 40Hz
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(35, t);
      osc.frequency.linearRampToValueAtTime(40, t + DURATION);

      // LFO for 3 quick pulses (~4Hz = ~6 pulses in 1.5s, feels like a reward throb)
      const lfo = ctx.createOscillator();
      lfo.type = "sine";
      lfo.frequency.setValueAtTime(4, t);

      const lfoGain = ctx.createGain();
      lfoGain.gain.setValueAtTime(0.07, t);

      // Main gain envelope: quick fade in → short sustain → fade out by 1.5s
      const mainGain = ctx.createGain();
      mainGain.gain.setValueAtTime(0, t);
      mainGain.gain.linearRampToValueAtTime(0.13, t + 0.1);
      mainGain.gain.setValueAtTime(0.13, t + 0.9);
      mainGain.gain.linearRampToValueAtTime(0, t + DURATION);

      // Wire LFO → amplitude modulation
      lfo.connect(lfoGain);
      lfoGain.connect(mainGain.gain);

      // Wire oscillator → gain → output
      osc.connect(mainGain);
      mainGain.connect(ctx.destination);

      osc.start(t);
      lfo.start(t);
      osc.stop(t + DURATION);
      lfo.stop(t + DURATION);

      // Hard close after sound finishes
      osc.onended = () => {
        try { ctx.close(); } catch { /* already closed */ }
        audioCtxRef.current = null;
      };
    } catch { /* Web Audio not supported */ }
  }, []);

  // Force-kill audio immediately
  const stopAudio = useCallback(() => {
    if (audioCtxRef.current) {
      try { audioCtxRef.current.close(); } catch { /* ok */ }
      audioCtxRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (show) {
      setVisible(true);
      playWelcomeEffects();

      // Auto-dismiss after 3 seconds — no user action needed
      dismissTimeoutRef.current = setTimeout(() => {
        setVisible(false);
        stopAudio();
        // Let exit animation play before calling onComplete
        setTimeout(onComplete, 500);
      }, 3000);
    }

    return () => {
      if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
      stopAudio();
    };
  }, [show, playWelcomeEffects, stopAudio, onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
          onClick={() => {
            setVisible(false);
            stopAudio();
            if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
            setTimeout(onComplete, 200);
          }}
        >
          {/* Dark backdrop with golden radial glow */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              background: "radial-gradient(ellipse at center, rgba(212,168,67,0.12) 0%, rgba(11,17,32,0.97) 60%, rgba(0,0,0,0.98) 100%)",
            }}
          />

          {/* Pulsing radial glow rings */}
          <motion.div
            className="absolute w-[500px] h-[500px] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(212,168,67,0.15) 0%, rgba(212,168,67,0.05) 40%, transparent 70%)",
            }}
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: [0.3, 1.8], opacity: [0, 0.8, 0] }}
            transition={{ duration: 2, ease: "easeOut" }}
          />
          <motion.div
            className="absolute w-[400px] h-[400px] rounded-full"
            style={{
              background: "radial-gradient(circle, rgba(255,215,0,0.1) 0%, transparent 60%)",
            }}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: [0.5, 2.2], opacity: [0, 0.6, 0] }}
            transition={{ duration: 2.2, delay: 0.2, ease: "easeOut" }}
          />

          {/* Golden Particles */}
          <GoldenParticles count={45} />

          {/* Confetti Burst */}
          <ConfettiBurst count={35} />

          {/* Center Content */}
          <motion.div
            className="relative z-10 flex flex-col items-center text-center px-6"
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15, mass: 0.8 }}
          >
            {/* Stars ring */}
            <div className="relative">
              {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
                const rad = (angle * Math.PI) / 180;
                const r = 72;
                return (
                  <motion.div
                    key={angle}
                    className="absolute"
                    style={{
                      left: `calc(50% + ${Math.cos(rad) * r}px - 6px)`,
                      top: `calc(50% + ${Math.sin(rad) * r}px - 6px)`,
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [0, 1.4, 1], opacity: [0, 1, 0.7] }}
                    transition={{ delay: 0.3 + i * 0.06, duration: 0.5, ease: "easeOut" }}
                  >
                    <Star className="w-3 h-3 text-[#D4A843] fill-[#D4A843]" />
                  </motion.div>
                );
              })}

              {/* WCO Shield — the hero */}
              <motion.div
                className="relative"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 180, damping: 12, delay: 0.1 }}
              >
                <div className="relative p-6 rounded-full bg-gradient-to-br from-[#D4A843]/20 via-[#0C1824] to-[#D4A843]/10 border-2 border-[#D4A843]/60 shadow-[0_0_60px_rgba(212,168,67,0.4),0_0_120px_rgba(212,168,67,0.15)]">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: "conic-gradient(from 0deg, transparent, rgba(212,168,67,0.15), transparent, rgba(212,168,67,0.1), transparent)",
                    }}
                  />
                  <Shield className="w-14 h-14 text-[#D4A843] relative z-10" strokeWidth={1.5} />

                  {/* Inner glow pulse */}
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{ background: "radial-gradient(circle, rgba(212,168,67,0.2) 0%, transparent 70%)" }}
                    animate={{ scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                  />
                </div>

                {/* Full SVG American flag — top right with wave animation */}
                <motion.div
                  className="absolute -top-5 -right-8"
                  initial={{ scale: 0, rotate: -20, opacity: 0 }}
                  animate={{ scale: [0, 1.15, 1], rotate: [20, -3, 5], opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.7, ease: "easeOut" }}
                >
                  <motion.div
                    animate={{ rotate: [-2, 3, -2], y: [-1, 1, -1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <AmericanFlag size={44} />
                  </motion.div>
                </motion.div>

                {/* Zap accents */}
                <motion.div
                  className="absolute -bottom-1 -left-3"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1.2, 1], opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.4 }}
                >
                  <Zap className="w-5 h-5 text-[#FFD700] fill-[#FFD700]" />
                </motion.div>
                <motion.div
                  className="absolute -top-1 -left-2"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1.1, 1], opacity: 1 }}
                  transition={{ delay: 0.7, duration: 0.4 }}
                >
                  <Zap className="w-4 h-4 text-[#D4A843] fill-[#D4A843]" />
                </motion.div>
              </motion.div>
            </div>

            {/* Welcome Text */}
            <motion.div
              className="mt-6"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4, type: "spring", stiffness: 120, damping: 10 }}
            >
              <motion.h1
                className="text-[#D4A843] font-bold tracking-wider"
                style={{ fontFamily: "Orbitron, sans-serif", fontSize: "1.3rem" }}
                animate={{ textShadow: [
                  "0 0 10px rgba(212,168,67,0.3)",
                  "0 0 25px rgba(212,168,67,0.6)",
                  "0 0 10px rgba(212,168,67,0.3)",
                ]}}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
              >
                WELCOME, COMMANDER
              </motion.h1>
            </motion.div>

            <motion.div
              initial={{ y: 15, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6, type: "spring", stiffness: 100, damping: 12 }}
            >
              <p className="text-[#E8ECF0] text-sm mt-2 tracking-wide" style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.65rem" }}>
                WORLD CALISTHENICS ORGANIZATION
              </p>
            </motion.div>

            <motion.div
              initial={{ y: 15, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{ delay: 0.8, type: "spring", stiffness: 100, damping: 12 }}
            >
              <div className="mt-3 px-4 py-1.5 rounded-full bg-[#10b981]/10 border border-[#10b981]/30">
                <p className="text-[#10b981] text-xs font-mono tracking-wide" style={{ fontSize: "0.6rem" }}>
                  SESSION ACTIVE
                </p>
              </div>
            </motion.div>

            <motion.p
              className="text-[#8494A7] text-xs mt-2 font-mono"
              style={{ fontSize: "0.55rem" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.7 }}
              transition={{ delay: 1.0 }}
            >
              {walletId}
            </motion.p>

            {/* Patriotic bottom accent — red/white/blue stripes with stars */}
            <motion.div
              className="mt-5 flex items-center gap-1.5"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.9, duration: 0.5 }}
            >
              <Star className="w-2.5 h-2.5 text-[#B22234] fill-[#B22234]" />
              <div className="h-[3px] w-10 rounded-full bg-gradient-to-r from-[#B22234] to-[#B22234]/60" />
              <div className="h-[3px] w-6 rounded-full bg-white/70" />
              <div className="h-[3px] w-10 rounded-full bg-gradient-to-l from-[#3C3B6E] to-[#3C3B6E]/60" />
              <Star className="w-2 h-2 text-white/80 fill-white/80" />
              <div className="h-[3px] w-10 rounded-full bg-gradient-to-r from-[#3C3B6E]/60 to-[#3C3B6E]" />
              <div className="h-[3px] w-6 rounded-full bg-white/70" />
              <div className="h-[3px] w-10 rounded-full bg-gradient-to-l from-[#B22234]/60 to-[#B22234]" />
              <Star className="w-2.5 h-2.5 text-[#B22234] fill-[#B22234]" />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}