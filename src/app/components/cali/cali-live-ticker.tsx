import { motion } from "motion/react";
import type { MovementStat } from "../../lib/cali-analytics-types";
import { deltaColor, formatDelta } from "../../lib/cali-analytics-types";

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const mono: React.CSSProperties = { fontFamily: "ui-monospace, 'Cascadia Code', monospace" };

interface CaliLiveTickerProps {
  movements: MovementStat[];
}

export function CaliLiveTicker({ movements }: CaliLiveTickerProps) {
  const items = movements.filter((m) => m.deltaPct7d != null);
  if (items.length === 0) return null;

  const tape = [...items, ...items];

  return (
    <div className="overflow-hidden py-2.5">
      <motion.div
        className="flex gap-0 whitespace-nowrap"
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
      >
        {tape.map((m, i) => (
          <span
            key={`${m.exerciseId}-${i}`}
            className="inline-flex items-center gap-2 px-4 text-xs border-r border-white/5"
            style={mono}
          >
            <span className="text-white/90 font-semibold uppercase tracking-wide" style={orbitron}>
              {m.name}
            </span>
            <span className="text-[#8494A7]">{m.currentValue}</span>
            <motion.span
              animate={{ opacity: [1, 0.65, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ color: deltaColor(m.deltaPct7d ?? 0) }}
            >
              {formatDelta(m.deltaPct7d ?? 0)}
            </motion.span>
          </span>
        ))}
      </motion.div>
    </div>
  );
}