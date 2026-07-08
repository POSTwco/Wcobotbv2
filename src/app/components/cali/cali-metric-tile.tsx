import { motion } from "motion/react";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import { deltaColor, formatDelta } from "../../lib/cali-analytics-types";
import { CaliStatsSparkline } from "./cali-stats-sparkline";
import { CaliGlassPanel } from "./cali-glass-panel";
import { CaliHintWrap } from "./cali-hint-wrap";

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

interface CaliMetricTileProps {
  label: string;
  value: string;
  delta: number;
  deltaSuffix?: string;
  accent: string;
  sparkData?: number[];
  onClick?: () => void;
  /** Hover / mobile-tap definition; may include live numbers. */
  hintTitle?: string;
  hint?: string;
}

export function CaliMetricTile({
  label, value, delta, deltaSuffix = "", accent, sparkData, onClick,
  hintTitle, hint,
}: CaliMetricTileProps) {
  const Tag = onClick ? "button" : "div";
  const color = deltaColor(delta);
  const DeltaIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;

  const body = (
    <CaliGlassPanel accent={accent} glow className="p-2.5 sm:p-3 min-h-[80px] w-full">
      <Tag
        type={onClick ? "button" : undefined}
        onClick={onClick}
        className={`text-left w-full h-full flex flex-col ${
          onClick ? "cursor-pointer hover:opacity-90 transition-opacity" : ""
        }`}
      >
        <p className="text-[0.55rem] font-bold tracking-widest mb-0.5" style={{ ...orbitron, color: accent }}>
          {label}
        </p>
        <div className="flex items-end justify-between gap-2 mt-auto">
          <div>
            <motion.p
              key={value}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-lg sm:text-xl font-bold leading-none"
              style={{ ...orbitron, color: delta !== 0 ? color : "#fff" }}
            >
              {value}
            </motion.p>
            <div className="flex items-center gap-1 mt-1" style={{ color }}>
              <DeltaIcon className="w-3 h-3" />
              <span className="text-[0.6rem] font-semibold" style={dmSans}>
                {formatDelta(delta, deltaSuffix)}
              </span>
            </div>
          </div>
          {sparkData && sparkData.length > 1 && (
            <div className="w-14 h-7 shrink-0 opacity-90">
              <CaliStatsSparkline data={sparkData} bicolor height={28} />
            </div>
          )}
        </div>
      </Tag>
    </CaliGlassPanel>
  );

  if (hint && hintTitle) {
    return (
      <CaliHintWrap title={hintTitle} hint={hint} block side="top" className="w-full">
        {body}
      </CaliHintWrap>
    );
  }

  return body;
}
