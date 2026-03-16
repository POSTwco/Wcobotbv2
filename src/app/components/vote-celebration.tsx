/**
 * VoteCelebration — Cinematic vote confirmation overlay
 * ======================================================
 * Fires a brief full-screen celebration after a successful vote.
 * Two tiers:
 *   - Standard:  confetti burst + shield pulse + "VOTE CONFIRMED"
 *   - Governor:  EPIC gold confetti + crown animation + radial gold burst
 *                + particle starfield + "GOVERNOR DECREE CAST" with WCO styling
 *
 * Auto-dismisses after 3.5s (standard) or 4.5s (governor).
 */

import { useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Shield, Crown, Fingerprint, Zap, Star } from "lucide-react";
import confetti from "canvas-confetti";

const ORBITRON = { fontFamily: "Orbitron, sans-serif" } as const;

export interface CelebrationData {
  /** Unique key to trigger animation (e.g. Date.now()) */
  id: number;
  /** Number of votes confirmed */
  voteCount: number;
  /** Athlete name(s) voted for */
  athleteNames: string[];
  /** Whether the voter holds a Governor NFT */
  isGovernor: boolean;
  /** Whether the voter holds a Sigma NFT */
  isSigma: boolean;
  /** Voting power multiplier */
  votingPower: number;
  /** Total weighted amount */
  totalWeighted: number;
  /** Total stake */
  totalStake: number;
  /** Token live */
  tokenLive: boolean;
}

interface VoteCelebrationProps {
  celebration: CelebrationData | null;
  onComplete: () => void;
}

// ─── Confetti helpers ──────────────────────────────────────────────────────

function fireStandardConfetti() {
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 99999 };

  // Center burst
  confetti({ ...defaults, particleCount: 80, origin: { x: 0.5, y: 0.45 }, scalar: 1.1 });

  // Side bursts
  setTimeout(() => {
    confetti({ ...defaults, particleCount: 35, origin: { x: 0.25, y: 0.55 }, scalar: 0.9 });
    confetti({ ...defaults, particleCount: 35, origin: { x: 0.75, y: 0.55 }, scalar: 0.9 });
  }, 200);
}

function fireGovernorConfetti() {
  const gold = ["#D4A843", "#FFD700", "#F5CB5C", "#FFFACD", "#FFF8DC"];
  const defaults = { zIndex: 99999, colors: gold, ticks: 120 };

  // Massive center explosion
  confetti({
    ...defaults,
    particleCount: 150,
    spread: 100,
    startVelocity: 55,
    origin: { x: 0.5, y: 0.35 },
    scalar: 1.3,
    shapes: ["circle", "square"],
  });

  // Gold rain from top
  setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 60,
      angle: 270,
      spread: 120,
      startVelocity: 25,
      origin: { x: 0.5, y: -0.1 },
      gravity: 0.6,
      scalar: 1.5,
      drift: 0,
    });
  }, 300);

  // Side cannons
  setTimeout(() => {
    confetti({ ...defaults, particleCount: 50, angle: 60, spread: 55, origin: { x: 0, y: 0.5 }, startVelocity: 45 });
    confetti({ ...defaults, particleCount: 50, angle: 120, spread: 55, origin: { x: 1, y: 0.5 }, startVelocity: 45 });
  }, 500);

  // Final sparkle burst
  setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 100,
      spread: 360,
      startVelocity: 20,
      origin: { x: 0.5, y: 0.4 },
      scalar: 0.8,
      gravity: 0.3,
      ticks: 200,
    });
  }, 900);
}

// ─── Floating particles for Governor celebration ───────────────────────────

function GoldParticles() {
  const particles = Array.from({ length: 24 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 2,
    delay: Math.random() * 2,
    duration: Math.random() * 3 + 2,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: "radial-gradient(circle, #FFD70080, #D4A84340)",
            boxShadow: "0 0 8px #D4A84340",
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 0.8, 0],
            scale: [0, 1.5, 0],
            y: [0, -60 - Math.random() * 40],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

// ─── Pulsing ring effect ──────────────────────────────────────────────────

function PulseRings({ color, count = 3 }: { color: string; count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border-2 pointer-events-none"
          style={{ borderColor: `${color}40` }}
          initial={{ width: 60, height: 60, opacity: 0.6 }}
          animate={{
            width: [60, 200 + i * 60],
            height: [60, 200 + i * 60],
            opacity: [0.6, 0],
          }}
          transition={{
            duration: 1.5,
            delay: i * 0.3,
            ease: "easeOut",
          }}
        />
      ))}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VoteCelebration
// ═══════════════════════════════════════════════════════════════════════════════

export function VoteCelebration({ celebration, onComplete }: VoteCelebrationProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const fire = useCallback((c: CelebrationData) => {
    if (c.isGovernor) {
      fireGovernorConfetti();
    } else {
      fireStandardConfetti();
    }
  }, []);

  useEffect(() => {
    if (!celebration) return;
    fire(celebration);
    const duration = celebration.isGovernor ? 4500 : 3200;
    timerRef.current = setTimeout(onComplete, duration);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [celebration, fire, onComplete]);

  return (
    <AnimatePresence>
      {celebration && (
        <motion.div
          key={celebration.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[99998] flex items-center justify-center pointer-events-none"
          onClick={onComplete}
          style={{ pointerEvents: "auto" }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              background: celebration.isGovernor
                ? "radial-gradient(ellipse at center, rgba(212,168,67,0.15) 0%, rgba(0,0,0,0.7) 70%)"
                : "radial-gradient(ellipse at center, rgba(66,116,185,0.1) 0%, rgba(0,0,0,0.6) 70%)",
            }}
          />

          {/* Governor: floating gold particles */}
          {celebration.isGovernor && <GoldParticles />}

          {/* Center content */}
          <motion.div
            className="relative flex flex-col items-center gap-4 z-10"
            initial={{ scale: 0.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 12, stiffness: 200, mass: 0.8 }}
          >
            {/* Pulse rings behind icon */}
            <div className="relative flex items-center justify-center">
              <PulseRings
                color={celebration.isGovernor ? "#D4A843" : "#4274B9"}
                count={celebration.isGovernor ? 4 : 3}
              />

              {/* Icon container */}
              <motion.div
                className="relative z-10"
                animate={celebration.isGovernor ? {
                  rotate: [0, -5, 5, -3, 3, 0],
                  scale: [1, 1.15, 1, 1.08, 1],
                } : {
                  scale: [1, 1.2, 1],
                }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
              >
                {celebration.isGovernor ? (
                  /* Governor: Gold crown with dramatic glow */
                  <div className="relative">
                    <div
                      className="w-24 h-24 sm:w-28 sm:h-28 rounded-full flex items-center justify-center"
                      style={{
                        background: "radial-gradient(circle, #D4A84330, #D4A84310, transparent)",
                        border: "2px solid #D4A84360",
                        boxShadow: "0 0 60px #D4A84340, 0 0 120px #D4A84320, inset 0 0 40px #D4A84315",
                      }}
                    >
                      <Crown className="w-12 h-12 sm:w-14 sm:h-14 text-[#D4A843] drop-shadow-[0_0_20px_rgba(212,168,67,0.5)]" />
                    </div>
                    {/* Orbiting stars */}
                    {[0, 1, 2, 3, 4].map((i) => (
                      <motion.div
                        key={i}
                        className="absolute"
                        style={{
                          top: "50%",
                          left: "50%",
                        }}
                        animate={{
                          rotate: 360,
                        }}
                        transition={{
                          duration: 3,
                          delay: i * 0.6,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      >
                        <Star
                          className="text-[#FFD700]"
                          style={{
                            width: 10 + i * 2,
                            height: 10 + i * 2,
                            transform: `translate(${50 + i * 8}px, -50%)`,
                            filter: "drop-shadow(0 0 4px #FFD700)",
                          }}
                          fill="#FFD700"
                        />
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  /* Standard: Blue shield pulse */
                  <div
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center"
                    style={{
                      background: "radial-gradient(circle, #4274B920, #4274B910, transparent)",
                      border: "2px solid #4274B940",
                      boxShadow: "0 0 40px #4274B930, inset 0 0 30px #4274B915",
                    }}
                  >
                    <Shield className="w-10 h-10 sm:w-12 sm:h-12 text-[#6AA3E0] drop-shadow-[0_0_12px_rgba(106,163,224,0.4)]" />
                  </div>
                )}
              </motion.div>
            </div>

            {/* Text */}
            <motion.div
              className="text-center"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              {celebration.isGovernor ? (
                <>
                  <motion.p
                    className="text-xl sm:text-2xl font-black tracking-widest text-transparent bg-clip-text"
                    style={{
                      ...ORBITRON,
                      backgroundImage: "linear-gradient(135deg, #FFD700, #D4A843, #F5CB5C, #D4A843)",
                      WebkitBackgroundClip: "text",
                      filter: "drop-shadow(0 2px 8px rgba(212,168,67,0.4))",
                    }}
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    GOVERNOR DECREE
                  </motion.p>
                  <p className="text-sm sm:text-base font-bold text-[#D4A843]/80 mt-1" style={ORBITRON}>
                    CAST INTO THE RECORD
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg sm:text-xl font-black tracking-widest text-[#E8ECF0]" style={ORBITRON}>
                    VOTE CONFIRMED
                  </p>
                  <p className="text-sm text-[#6AA3E0]/80 mt-0.5" style={ORBITRON}>
                    ON-CHAIN RECORD
                  </p>
                </>
              )}

              {/* Vote details chip */}
              <motion.div
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-md"
                style={{
                  background: celebration.isGovernor ? "#D4A84315" : "#4274B915",
                  border: `1px solid ${celebration.isGovernor ? "#D4A84330" : "#4274B930"}`,
                }}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.6, type: "spring", damping: 15 }}
              >
                <Fingerprint className={`w-3.5 h-3.5 ${celebration.isGovernor ? "text-[#D4A843]" : "text-[#6AA3E0]"}`} />
                <span className="text-[0.6rem] text-[#E8ECF0] font-semibold" style={ORBITRON}>
                  {celebration.voteCount} VOTE{celebration.voteCount > 1 ? "S" : ""}
                </span>
                {celebration.isGovernor && (
                  <span className="text-[0.5rem] text-[#D4A843] font-bold px-1.5 py-0.5 rounded bg-[#D4A843]/10 border border-[#D4A843]/20" style={ORBITRON}>
                    {celebration.votingPower}x POWER
                  </span>
                )}
                {celebration.isSigma && !celebration.isGovernor && (
                  <span className="text-[0.5rem] text-[#A855F7] font-bold px-1.5 py-0.5 rounded bg-[#A855F7]/10 border border-[#A855F7]/20" style={ORBITRON}>
                    SIGMA
                  </span>
                )}
              </motion.div>

              {/* Athlete names */}
              {celebration.athleteNames.length > 0 && (
                <motion.p
                  className="mt-2 text-[0.55rem] text-[#8494A7] max-w-[280px] truncate"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                >
                  {celebration.athleteNames.join(" / ")}
                </motion.p>
              )}
            </motion.div>

            {/* Tap to dismiss hint */}
            <motion.p
              className="text-[0.4rem] text-[#8494A7]/40 mt-2 tracking-widest uppercase"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              style={ORBITRON}
            >
              tap anywhere to dismiss
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
