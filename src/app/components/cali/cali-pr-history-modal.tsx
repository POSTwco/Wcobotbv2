import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Loader2 } from "lucide-react";
import { api } from "../../lib/api";
import { useCaliSession } from "./cali-context";
import { deltaColor, formatDelta, type PRHistoryEntry } from "../../lib/cali-analytics-types";

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

interface CaliPRHistoryModalProps {
  exerciseId: string | null;
  exerciseName?: string;
  onClose: () => void;
}

export function CaliPRHistoryModal({ exerciseId, exerciseName, onClose }: CaliPRHistoryModalProps) {
  const cali = useCaliSession();
  const [history, setHistory] = useState<PRHistoryEntry[]>([]);
  const [name, setName] = useState(exerciseName ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!exerciseId || !cali.sessionToken) return;
    setLoading(true);
    setError(null);
    api.cali.prHistory(cali.sessionToken, exerciseId).then((res) => {
      setLoading(false);
      if (res.success && res.data) {
        setHistory(res.data.history);
        setName(res.data.name);
      } else {
        setError(res.error || "Couldn't load PR history.");
      }
    });
  }, [exerciseId, cali.sessionToken]);

  return (
    <AnimatePresence>
      {exerciseId && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button type="button" className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} aria-label="Close" />
          <motion.div
            initial={{ y: 24, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 24, opacity: 0 }}
            className="relative w-full max-w-md rounded-2xl border p-5 backdrop-blur-xl"
            style={{
              background: "linear-gradient(145deg, rgba(255,255,255,0.08), rgba(11,17,32,0.9))",
              borderColor: "rgba(212,168,67,0.25)",
              boxShadow: "0 0 40px rgba(212,168,67,0.12)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-[0.6rem] tracking-widest text-[#D4A843]" style={orbitron}>PR HISTORY</p>
                <h3 className="text-lg font-bold text-white" style={orbitron}>{name}</h3>
              </div>
              <button type="button" onClick={onClose} className="text-[#8494A7] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {loading && <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#8494A7]" /></div>}
            {error && <p className="text-xs text-red-300" style={dmSans}>{error}</p>}
            {!loading && !error && (
              <ul className="space-y-2 max-h-64 overflow-y-auto">
                {history.length === 0 ? (
                  <li className="text-xs text-[#8494A7] text-center py-4" style={dmSans}>No PR history yet.</li>
                ) : (
                  [...history].reverse().map((h, i) => (
                    <li
                      key={`${h.achievedAt}-${i}`}
                      className="flex items-center justify-between p-2.5 rounded-lg border"
                      style={{ borderColor: "rgba(66,116,185,0.12)", background: "rgba(255,255,255,0.02)" }}
                    >
                      <div>
                        <p className="text-sm font-bold text-white" style={orbitron}>{h.value}</p>
                        <p className="text-[0.65rem] text-[#8494A7]" style={dmSans}>
                          {new Date(h.achievedAt).toLocaleDateString()}
                        </p>
                      </div>
                      {h.deltaPct != null && (
                        <span className="text-xs font-bold" style={{ color: deltaColor(h.deltaPct), ...orbitron }}>
                          {formatDelta(h.deltaPct)}
                        </span>
                      )}
                    </li>
                  ))
                )}
              </ul>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}