/**
 * Floating coach motivation card — appears after set/block events.
 */

import { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles } from "lucide-react";
import { CALI_COACH_TOAST_BOTTOM } from "../../lib/cali-workout-layout";

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

interface Props {
  message: string | null;
  onDismiss: () => void;
  durationMs?: number;
}

export function CaliCoachToast({ message, onDismiss, durationMs = 2800 }: Props) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDismiss, durationMs);
    return () => clearTimeout(t);
  }, [message, onDismiss, durationMs]);

  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ type: "spring", damping: 22, stiffness: 280 }}
          className="fixed left-4 right-4 z-50 mx-auto max-w-md"
          style={{ bottom: CALI_COACH_TOAST_BOTTOM }}
        >
          <div
            className="flex items-start gap-3 px-4 py-3.5 rounded-2xl border shadow-2xl"
            style={{
              background: "linear-gradient(135deg, rgba(66,116,185,0.15), rgba(11,17,32,0.95))",
              borderColor: "rgba(212,168,67,0.35)",
              boxShadow: "0 8px 32px rgba(66,116,185,0.25), 0 0 40px rgba(212,168,67,0.08)",
            }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #D4A843, #B8860B)" }}
            >
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-[0.6rem] font-bold tracking-widest text-[#D4A843] mb-1" style={orbitron}>
                YOUR COACH
              </p>
              <p className="text-sm text-[#E8ECF0] leading-relaxed" style={dmSans}>{message}</p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}