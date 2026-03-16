/**
 * Athlete Onboarded Overlay — New Recruit Celebration
 * =====================================================
 * Plays when an admin successfully creates a NEW athlete:
 *   1. Achievement-unlock chime via Web Audio API (C5 → G5 arpeggio)
 *   2. Haptic vibration pattern (mobile)
 *   3. Golden particle burst + emerald sparks
 *   4. Spring-animated trophy icon with orbit ring
 *   5. Athlete name + country displayed prominently
 *   6. Power rating ring visualization
 *   7. Auto-dismisses after 4 seconds, click to dismiss early
 *
 * Mirrors the design language of AdminWelcomeOverlay but with
 * athlete-onboarding flavor (trophy instead of shield, green accent
 * for "active" status, athlete details front and center).
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, Star, Zap, UserPlus, Check, Globe, Flame } from "lucide-react";

interface AthleteOnboardedProps {
  show: boolean;
  athleteName: string;
  athleteCountry: string;
  athleteNickname?: string;
  onComplete: () => void;
}

// ---------------------------------------------------------------------------
// Golden Particles — Burst from center on reveal
// ---------------------------------------------------------------------------
function CelebrationParticles({ count = 50 }: { count?: number }) {
  const particles = useRef(
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: 45 + Math.random() * 10,
      y: 40 + Math.random() * 10,
      size: Math.random() * 5 + 2,
      delay: Math.random() * 0.5,
      duration: 1.4 + Math.random() * 1.0,
      angle: Math.random() * 360,
      distance: 40 + Math.random() * 100,
      type: (Math.random() > 0.5 ? "gold" : Math.random() > 0.5 ? "emerald" : "white") as
        | "gold"
        | "emerald"
        | "white",
    }))
  ).current;

  const colorMap = {
    gold: {
      bg: "radial-gradient(circle, #FFD700 0%, #D4A843 50%, transparent 100%)",
      shadow: "0 0 8px 2px rgba(212,168,67,0.6)",
    },
    emerald: {
      bg: "radial-gradient(circle, #10b981 0%, #059669 50%, transparent 100%)",
      shadow: "0 0 8px 2px rgba(16,185,129,0.5)",
    },
    white: {
      bg: "radial-gradient(circle, #ffffff 0%, #cbd5e1 50%, transparent 100%)",
      shadow: "0 0 6px 1px rgba(255,255,255,0.3)",
    },
  };

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => {
        const rad = (p.angle * Math.PI) / 180;
        const tx = Math.cos(rad) * p.distance;
        const ty = Math.sin(rad) * p.distance;
        const { bg, shadow } = colorMap[p.type];
        return (
          <motion.div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              width: p.size,
              height: p.size,
              background: bg,
              boxShadow: shadow,
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
// Confetti Ribbons — Gold + Emerald + White
// ---------------------------------------------------------------------------
function OnboardConfetti({ count = 35 }: { count?: number }) {
  const confetti = useRef(
    Array.from({ length: count }, (_, i) => ({
      id: i,
      x: 40 + Math.random() * 20,
      angle: Math.random() * 360,
      distance: 100 + Math.random() * 200,
      rotation: Math.random() * 900 - 450,
      width: 4 + Math.random() * 5,
      height: 10 + Math.random() * 12,
      color: ["#D4A843", "#FFD700", "#10b981", "#34d399", "#ffffff", "#f59e0b", "#059669"][
        Math.floor(Math.random() * 7)
      ],
      delay: Math.random() * 0.35,
      duration: 1.6 + Math.random() * 0.8,
    }))
  ).current;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {confetti.map((c) => {
        const rad = (c.angle * Math.PI) / 180;
        const tx = Math.cos(rad) * c.distance;
        const ty = Math.sin(rad) * c.distance + 60;
        return (
          <motion.div
            key={c.id}
            className="absolute"
            style={{
              left: `${c.x}%`,
              top: "42%",
              width: c.width,
              height: c.height,
              backgroundColor: c.color,
              borderRadius: 2,
            }}
            initial={{ opacity: 0, scale: 0, x: 0, y: 0, rotate: 0 }}
            animate={{
              opacity: [0, 1, 1, 0.8, 0],
              scale: [0, 1.1, 1, 0.7],
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
// Pulsing Power Ring — shows average power level visually
// ---------------------------------------------------------------------------
function PowerRing() {
  const circumference = 2 * Math.PI * 22;
  return (
    <motion.svg
      width="56"
      height="56"
      viewBox="0 0 56 56"
      className="absolute inset-0 m-auto"
      initial={{ opacity: 0, rotate: -90 }}
      animate={{ opacity: 1, rotate: -90 }}
      transition={{ delay: 0.6, duration: 0.5 }}
    >
      {/* Track */}
      <circle
        cx="28"
        cy="28"
        r="22"
        fill="none"
        stroke="rgba(212,168,67,0.15)"
        strokeWidth="3"
      />
      {/* Progress arc */}
      <motion.circle
        cx="28"
        cy="28"
        r="22"
        fill="none"
        stroke="url(#pwrGrad)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: circumference * 0.15 }}
        transition={{ delay: 0.8, duration: 1.2, ease: "easeOut" }}
      />
      <defs>
        <linearGradient id="pwrGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#D4A843" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#FFD700" />
        </linearGradient>
      </defs>
    </motion.svg>
  );
}

// ---------------------------------------------------------------------------
// Main Overlay
// ---------------------------------------------------------------------------
export function AthleteOnboardedOverlay({
  show,
  athleteName,
  athleteCountry,
  athleteNickname,
  onComplete,
}: AthleteOnboardedProps) {
  const [visible, setVisible] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const dismissTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Achievement-unlock chime — ascending arpeggio (C5 → E5 → G5)
  const playOnboardChime = useCallback(() => {
    // --- Haptic vibration (mobile) ---
    try {
      if (navigator.vibrate) {
        navigator.vibrate([40, 20, 40, 20, 80, 30, 120]);
      }
    } catch {
      /* vibrate not supported */
    }

    // --- Achievement unlock chime via Web Audio API ---
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      const t = ctx.currentTime;

      // Three-note ascending arpeggio + sustained chord
      const notes = [
        { freq: 523.25, start: 0, dur: 0.3 }, // C5
        { freq: 659.25, start: 0.12, dur: 0.3 }, // E5
        { freq: 783.99, start: 0.24, dur: 0.5 }, // G5 (longer sustain)
        { freq: 1046.5, start: 0.4, dur: 0.6 }, // C6 (octave resolution)
      ];

      notes.forEach(({ freq, start, dur }) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, t + start);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, t + start);
        gain.gain.linearRampToValueAtTime(0.08, t + start + 0.04);
        gain.gain.setValueAtTime(0.08, t + start + dur * 0.6);
        gain.gain.exponentialRampToValueAtTime(0.001, t + start + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t + start);
        osc.stop(t + start + dur);
      });

      // Shimmer — high-frequency sparkle overlay
      const shimmer = ctx.createOscillator();
      shimmer.type = "triangle";
      shimmer.frequency.setValueAtTime(2637, t + 0.5); // E7
      shimmer.frequency.exponentialRampToValueAtTime(3951, t + 1.0); // B7

      const shimGain = ctx.createGain();
      shimGain.gain.setValueAtTime(0, t + 0.5);
      shimGain.gain.linearRampToValueAtTime(0.02, t + 0.55);
      shimGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

      shimmer.connect(shimGain);
      shimGain.connect(ctx.destination);
      shimmer.start(t + 0.5);
      shimmer.stop(t + 1.2);

      shimmer.onended = () => {
        try {
          ctx.close();
        } catch {
          /* already closed */
        }
        audioCtxRef.current = null;
      };
    } catch {
      /* Web Audio not supported */
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {
        /* ok */
      }
      audioCtxRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (show) {
      setVisible(true);
      playOnboardChime();

      // Auto-dismiss after 4 seconds
      dismissTimeoutRef.current = setTimeout(() => {
        setVisible(false);
        stopAudio();
        setTimeout(onComplete, 500);
      }, 4000);
    }

    return () => {
      if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
      stopAudio();
    };
  }, [show, playOnboardChime, stopAudio, onComplete]);

  const dismiss = useCallback(() => {
    setVisible(false);
    stopAudio();
    if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
    setTimeout(onComplete, 200);
  }, [stopAudio, onComplete]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
          onClick={dismiss}
        >
          {/* Dark backdrop with golden-green radial glow */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(16,185,129,0.08) 0%, rgba(212,168,67,0.08) 20%, rgba(11,17,32,0.97) 55%, rgba(0,0,0,0.98) 100%)",
            }}
          />

          {/* Expanding glow rings */}
          <motion.div
            className="absolute w-[500px] h-[500px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(16,185,129,0.12) 0%, rgba(212,168,67,0.08) 40%, transparent 70%)",
            }}
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: [0.3, 2.0], opacity: [0, 0.7, 0] }}
            transition={{ duration: 2.2, ease: "easeOut" }}
          />
          <motion.div
            className="absolute w-[400px] h-[400px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(212,168,67,0.1) 0%, transparent 60%)",
            }}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: [0.5, 2.4], opacity: [0, 0.5, 0] }}
            transition={{ duration: 2.4, delay: 0.15, ease: "easeOut" }}
          />

          {/* Particles */}
          <CelebrationParticles count={55} />
          <OnboardConfetti count={40} />

          {/* ── Center Content ─────────────────────────────────────── */}
          <motion.div
            className="relative z-10 flex flex-col items-center text-center px-6 max-w-sm"
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 15,
              mass: 0.8,
            }}
          >
            {/* ── Stars orbit ──────────────────────────────────────── */}
            <div className="relative">
              {[0, 60, 120, 180, 240, 300].map((angle, i) => {
                const rad = (angle * Math.PI) / 180;
                const r = 78;
                return (
                  <motion.div
                    key={angle}
                    className="absolute"
                    style={{
                      left: `calc(50% + ${Math.cos(rad) * r}px - 6px)`,
                      top: `calc(50% + ${Math.sin(rad) * r}px - 6px)`,
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [0, 1.5, 1], opacity: [0, 1, 0.8] }}
                    transition={{
                      delay: 0.25 + i * 0.07,
                      duration: 0.5,
                      ease: "easeOut",
                    }}
                  >
                    <Star className="w-3 h-3 text-[#D4A843] fill-[#D4A843]" />
                  </motion.div>
                );
              })}

              {/* ── Trophy icon — the hero ─────────────────────────── */}
              <motion.div
                className="relative"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 180,
                  damping: 12,
                  delay: 0.1,
                }}
              >
                <div className="relative p-7 rounded-full bg-gradient-to-br from-[#10b981]/20 via-[#0C1824] to-[#D4A843]/15 border-2 border-[#10b981]/50 shadow-[0_0_60px_rgba(16,185,129,0.3),0_0_120px_rgba(212,168,67,0.15)]">
                  {/* Rotating conic gradient */}
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 6,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="absolute inset-0 rounded-full"
                    style={{
                      background:
                        "conic-gradient(from 0deg, transparent, rgba(16,185,129,0.12), transparent, rgba(212,168,67,0.1), transparent)",
                    }}
                  />

                  <Trophy
                    className="w-14 h-14 text-[#D4A843] relative z-10"
                    strokeWidth={1.5}
                  />

                  {/* Inner glow pulse */}
                  <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{
                      background:
                        "radial-gradient(circle, rgba(16,185,129,0.2) 0%, transparent 70%)",
                    }}
                    animate={{
                      scale: [1, 1.15, 1],
                      opacity: [0.5, 1, 0.5],
                    }}
                    transition={{
                      duration: 1.2,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  />

                  {/* Power ring around the trophy */}
                  <PowerRing />
                </div>

                {/* UserPlus badge — top right */}
                <motion.div
                  className="absolute -top-3 -right-3"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1.3, 1], opacity: 1 }}
                  transition={{ delay: 0.5, duration: 0.5, ease: "easeOut" }}
                >
                  <div className="p-1.5 rounded-full bg-[#10b981] shadow-[0_0_12px_rgba(16,185,129,0.6)]">
                    <UserPlus className="w-4 h-4 text-white" strokeWidth={2.5} />
                  </div>
                </motion.div>

                {/* Flame accent — bottom left */}
                <motion.div
                  className="absolute -bottom-1 -left-3"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1.2, 1], opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.4 }}
                >
                  <Flame className="w-5 h-5 text-[#FFD700] fill-[#FFD700]" />
                </motion.div>

                {/* Zap accent — top left */}
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

            {/* ── CONGRATULATIONS header ───────────────────────────── */}
            <motion.div
              className="mt-7"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                delay: 0.35,
                type: "spring",
                stiffness: 120,
                damping: 10,
              }}
            >
              <motion.h1
                className="text-[#D4A843] font-bold tracking-[0.2em]"
                style={{ fontFamily: "Orbitron, sans-serif", fontSize: "1rem" }}
                animate={{
                  textShadow: [
                    "0 0 8px rgba(212,168,67,0.2)",
                    "0 0 20px rgba(212,168,67,0.5)",
                    "0 0 8px rgba(212,168,67,0.2)",
                  ],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                CONGRATULATIONS
              </motion.h1>
            </motion.div>

            {/* ── Subheading ────────────────────────────────────────── */}
            <motion.div
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                delay: 0.5,
                type: "spring",
                stiffness: 100,
                damping: 12,
              }}
            >
              <p
                className="text-[#8CA0B3] text-xs tracking-[0.15em] mt-1.5"
                style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.6rem" }}
              >
                NEW ATHLETE ONBOARDED
              </p>
            </motion.div>

            {/* ── Athlete Name — Hero Text ──────────────────────────── */}
            <motion.div
              className="mt-4"
              initial={{ y: 20, opacity: 0, scale: 0.8 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{
                delay: 0.6,
                type: "spring",
                stiffness: 150,
                damping: 12,
              }}
            >
              <motion.h2
                className="text-white font-bold tracking-wide"
                style={{ fontFamily: "Orbitron, sans-serif", fontSize: "1.5rem" }}
                animate={{
                  textShadow: [
                    "0 0 10px rgba(255,255,255,0.1)",
                    "0 0 30px rgba(16,185,129,0.3)",
                    "0 0 10px rgba(255,255,255,0.1)",
                  ],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                {athleteName.toUpperCase()}
              </motion.h2>
              {athleteNickname && (
                <motion.p
                  className="text-[#D4A843]/80 text-sm font-medium mt-0.5"
                  style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.7rem" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.8 }}
                  transition={{ delay: 0.75 }}
                >
                  &ldquo;{athleteNickname}&rdquo;
                </motion.p>
              )}
            </motion.div>

            {/* ── Country Badge ─────────────────────────────────────── */}
            <motion.div
              initial={{ y: 12, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{
                delay: 0.75,
                type: "spring",
                stiffness: 100,
                damping: 12,
              }}
            >
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10">
                <Globe className="w-3 h-3 text-[#8CA0B3]" />
                <p
                  className="text-[#8CA0B3] font-medium tracking-wider"
                  style={{ fontFamily: "Orbitron, sans-serif", fontSize: "0.55rem" }}
                >
                  {athleteCountry.toUpperCase()}
                </p>
              </div>
            </motion.div>

            {/* ── Active Status Pill ────────────────────────────────── */}
            <motion.div
              initial={{ y: 15, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              transition={{
                delay: 0.9,
                type: "spring",
                stiffness: 100,
                damping: 12,
              }}
            >
              <div className="mt-3 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-[#10b981]/10 border border-[#10b981]/30">
                <Check className="w-3 h-3 text-[#10b981]" />
                <p
                  className="text-[#10b981] font-mono tracking-wide"
                  style={{ fontSize: "0.6rem" }}
                >
                  ROSTER ACTIVE
                </p>
              </div>
            </motion.div>

            {/* ── WCO Attribution ───────────────────────────────────── */}
            <motion.p
              className="text-[#8494A7] text-xs mt-3 font-mono"
              style={{ fontSize: "0.5rem" }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ delay: 1.1 }}
            >
              WORLD CALISTHENICS ORGANIZATION
            </motion.p>

            {/* ── Bottom accent — Gold & Emerald stripes ────────────── */}
            <motion.div
              className="mt-5 flex items-center gap-1.5"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 1.0, duration: 0.5 }}
            >
              <Star className="w-2.5 h-2.5 text-[#D4A843] fill-[#D4A843]" />
              <div className="h-[3px] w-10 rounded-full bg-gradient-to-r from-[#D4A843] to-[#D4A843]/50" />
              <div className="h-[3px] w-6 rounded-full bg-[#10b981]/60" />
              <div className="h-[3px] w-8 rounded-full bg-gradient-to-r from-[#FFD700]/50 to-[#FFD700]" />
              <Zap className="w-2.5 h-2.5 text-[#10b981] fill-[#10b981]" />
              <div className="h-[3px] w-8 rounded-full bg-gradient-to-l from-[#FFD700]/50 to-[#FFD700]" />
              <div className="h-[3px] w-6 rounded-full bg-[#10b981]/60" />
              <div className="h-[3px] w-10 rounded-full bg-gradient-to-l from-[#D4A843] to-[#D4A843]/50" />
              <Star className="w-2.5 h-2.5 text-[#D4A843] fill-[#D4A843]" />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
