/**
 * Full-screen victory overlay — confetti, XP, streak, level crush.
 */

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Trophy, Flame, Zap, ArrowRight, TrendingUp } from "lucide-react";
import { Link } from "react-router";
import confetti from "canvas-confetti";
import { ATHLETE_TIER_CONFIG, deltaColor, formatDelta, type AthleteTier } from "../../lib/cali-analytics-types";

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

interface Props {
  open: boolean;
  xp: number;
  level: number;
  streak: number;
  message: string;
  athleteTier?: AthleteTier;
  movementDelta?: number;
  onClose: () => void;
}

function fireVictoryConfetti() {
  const colors = ["#4274B9", "#6AA3E0", "#D4A843", "#FFD700", "#10B981"];
  confetti({ particleCount: 120, spread: 80, startVelocity: 45, origin: { x: 0.5, y: 0.4 }, colors, zIndex: 99999 });
  setTimeout(() => {
    confetti({ particleCount: 60, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, colors, zIndex: 99999 });
    confetti({ particleCount: 60, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors, zIndex: 99999 });
  }, 250);
}

export function CaliWorkoutCelebration({
  open, xp, level, streak, message, athleteTier, movementDelta, onClose,
}: Props) {
  const fired = useRef(false);

  useEffect(() => {
    if (open && !fired.current) {
      fired.current = true;
      fireVictoryConfetti();
    }
    if (!open) fired.current = false;
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: "rgba(11,17,32,0.88)", backdropFilter: "blur(12px)" }}
        >
          <motion.div
            initial={{ scale: 0.85, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 18, stiffness: 260 }}
            className="w-full max-w-md rounded-3xl border p-8 text-center"
            style={{
              background: "linear-gradient(160deg, rgba(66,116,185,0.12), rgba(11,17,32,0.95))",
              borderColor: "rgba(212,168,67,0.35)",
              boxShadow: "0 20px 60px rgba(66,116,185,0.3), 0 0 80px rgba(212,168,67,0.1)",
            }}
          >
            <motion.div
              animate={{ rotate: [0, -8, 8, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #D4A843, #B8860B)", boxShadow: "0 8px 32px rgba(212,168,67,0.4)" }}
            >
              <Trophy className="w-8 h-8 text-white" />
            </motion.div>

            <p className="text-[0.65rem] font-bold tracking-[0.2em] text-[#D4A843] mb-2" style={orbitron}>
              WORKOUT COMPLETE
            </p>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-3 leading-tight" style={orbitron}>
              You just crushed Level {level}!
            </h2>
            <p className="text-sm text-[#A3B0C2] leading-relaxed mb-6" style={dmSans}>{message}</p>

            {(athleteTier || movementDelta != null) && (
              <div className="flex items-center justify-center gap-3 mb-5 flex-wrap">
                {athleteTier && (
                  <span
                    className="text-[0.55rem] font-bold px-2.5 py-1 rounded-full"
                    style={{
                      ...(ATHLETE_TIER_CONFIG[athleteTier] ?? ATHLETE_TIER_CONFIG.UNRANKED),
                      fontFamily: "Orbitron, sans-serif",
                      background: (ATHLETE_TIER_CONFIG[athleteTier] ?? ATHLETE_TIER_CONFIG.UNRANKED).bg,
                      border: `1px solid ${(ATHLETE_TIER_CONFIG[athleteTier] ?? ATHLETE_TIER_CONFIG.UNRANKED).border}`,
                      color: (ATHLETE_TIER_CONFIG[athleteTier] ?? ATHLETE_TIER_CONFIG.UNRANKED).color,
                    }}
                  >
                    {(ATHLETE_TIER_CONFIG[athleteTier] ?? ATHLETE_TIER_CONFIG.UNRANKED).label}
                  </span>
                )}
                {movementDelta != null && (
                  <span
                    className="flex items-center gap-1 text-xs font-bold"
                    style={{ color: deltaColor(movementDelta), fontFamily: "Orbitron, sans-serif" }}
                  >
                    <TrendingUp className="w-3.5 h-3.5" />
                    Movement {formatDelta(movementDelta)}
                  </span>
                )}
              </div>
            )}

            <div className="flex justify-center gap-6 mb-8">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-[#6AA3E0] mb-1">
                  <Zap className="w-4 h-4" />
                  <motion.span
                    className="text-2xl font-bold text-white"
                    style={orbitron}
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    {xp}
                  </motion.span>
                </div>
                <p className="text-[0.6rem] text-[#8494A7]" style={dmSans}>XP earned</p>
              </div>
              {streak > 0 && (
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-[#D4A843] mb-1">
                    <Flame className="w-4 h-4" />
                    <span className="text-2xl font-bold text-white" style={orbitron}>{streak}</span>
                  </div>
                  <p className="text-[0.6rem] text-[#8494A7]" style={dmSans}>day streak</p>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Link
                to="/calisthenics"
                onClick={onClose}
                className="flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold"
                style={{ ...dmSans, background: "linear-gradient(135deg, #4274B9, #3563A0)", color: "#fff" }}
              >
                Back to Dashboard <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/calisthenics/analytics"
                onClick={onClose}
                className="text-xs text-[#6AA3E0] hover:underline py-2"
                style={dmSans}
              >
                View athlete analytics
              </Link>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}