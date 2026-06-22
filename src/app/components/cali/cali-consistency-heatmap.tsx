import { motion } from "motion/react";
import type { DailyActivityPoint } from "../../lib/cali-analytics-types";
import { CHART_DOWN, CHART_UP } from "../../lib/cali-analytics-types";

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };

interface CaliConsistencyHeatmapProps {
  data: DailyActivityPoint[];
}

export function CaliConsistencyHeatmap({ data }: CaliConsistencyHeatmapProps) {
  if (data.length === 0) return null;

  return (
    <div>
      <p className="text-[0.6rem] font-bold tracking-widest text-[#8494A7] mb-3" style={orbitron}>
        SESSION HEATMAP
      </p>
      <div className="flex flex-wrap gap-1.5">
        {data.map((d, i) => {
          const active = d.workoutsCompleted > 0;
          const intensity = active ? Math.min(1, 0.45 + d.workoutsCompleted * 0.2) : 0.25;
          return (
            <motion.div
              key={d.dateKey}
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.02 }}
              title={`${d.dateKey}: ${d.workoutsCompleted} session(s)`}
              className="w-7 h-7 rounded-md border"
              style={{
                background: active ? `rgba(16,185,129,${intensity})` : `rgba(239,68,68,${intensity})`,
                borderColor: active ? "rgba(16,185,129,0.35)" : "rgba(239,68,68,0.25)",
                boxShadow: active ? "0 0 8px rgba(16,185,129,0.25)" : undefined,
              }}
            />
          );
        })}
      </div>
      <div className="flex gap-4 mt-2 text-[0.6rem] text-[#8494A7]">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: CHART_UP }} /> Active</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: CHART_DOWN, opacity: 0.4 }} /> Rest</span>
      </div>
    </div>
  );
}