import { useMemo } from "react";
import { motion } from "motion/react";
import type { HeatmapDayPoint } from "../../lib/cali-analytics-types";
import { CHART_DOWN, CHART_UP } from "../../lib/cali-analytics-types";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "../ui/tooltip";

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const GAP = 3;

interface TreemapRect {
  day: HeatmapDayPoint;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface CaliProgressionHeatmapProps {
  data: HeatmapDayPoint[];
}

function layoutTreemap(items: HeatmapDayPoint[], width: number, height: number): TreemapRect[] {
  if (items.length === 0) return [];

  const sorted = [...items].sort((a, b) => b.recencyWeight - a.recencyWeight);

  function partition(
    nodes: HeatmapDayPoint[],
    x: number,
    y: number,
    w: number,
    h: number,
    horizontal: boolean,
  ): TreemapRect[] {
    if (nodes.length === 0) return [];
    if (nodes.length === 1) {
      return [{ day: nodes[0], x, y, w: Math.max(0, w), h: Math.max(0, h) }];
    }

    const half = Math.ceil(nodes.length / 2);
    const groupA = nodes.slice(0, half);
    const groupB = nodes.slice(half);
    const weightA = groupA.reduce((s, d) => s + d.recencyWeight, 0);
    const weightB = groupB.reduce((s, d) => s + d.recencyWeight, 0);
    const total = weightA + weightB;
    const ratio = total > 0 ? weightA / total : 0.5;

    if (horizontal) {
      const hA = Math.max(0, h * ratio - GAP / 2);
      const hB = Math.max(0, h - hA - GAP);
      return [
        ...partition(groupA, x, y, w, hA, !horizontal),
        ...partition(groupB, x, y + hA + GAP, w, hB, !horizontal),
      ];
    }

    const wA = Math.max(0, w * ratio - GAP / 2);
    const wB = Math.max(0, w - wA - GAP);
    return [
      ...partition(groupA, x, y, wA, h, !horizontal),
      ...partition(groupB, x + wA + GAP, y, wB, h, !horizontal),
    ];
  }

  return partition(sorted, 0, 0, width, height, width >= height);
}

function formatDateLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).toUpperCase();
}

function tileColors(day: HeatmapDayPoint, noData: boolean): React.CSSProperties {
  if (noData) {
    return {
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.06)",
    };
  }

  if (day.active) {
    const g = day.greenScore;
    return {
      background: `hsl(152, ${40 + g * 0.5}%, ${12 + g * 0.28}%)`,
      border: `1px solid hsla(152, 70%, 45%, ${0.25 + g * 0.004})`,
      boxShadow: g > 30 ? `0 0 ${6 + g * 0.12}px hsla(152, 80%, 40%, 0.3)` : undefined,
    };
  }

  if (day.redScore <= 0) {
    return {
      background: "rgba(255,255,255,0.04)",
      border: "1px solid rgba(255,255,255,0.06)",
    };
  }

  const r = day.redScore;
  return {
    background: `hsl(0, ${35 + r * 0.45}%, ${10 + r * 0.22}%)`,
    border: `1px solid hsla(0, 70%, 50%, ${0.2 + r * 0.004})`,
    boxShadow: r > 40 ? `0 0 ${6 + r * 0.1}px hsla(0, 80%, 45%, 0.28)` : undefined,
  };
}

function HoverCard({ day, noData }: { day: HeatmapDayPoint; noData: boolean }) {
  const dateLabel = formatDateLabel(day.dateKey);

  if (noData) {
    return (
      <div style={dmSans}>
        <p className="font-bold text-[#8494A7] mb-1" style={orbitron}>{dateLabel}</p>
        <p className="text-[#6AA3E0]">No session data yet</p>
      </div>
    );
  }

  if (day.active) {
    const levelLabel = day.eliteSession ? "ELITE VAULT" : `L${day.maxLevel} SESSION`;
    return (
      <div className="space-y-1.5" style={dmSans}>
        <p className="font-bold text-white" style={orbitron}>
          {dateLabel} · {levelLabel}
        </p>
        <p className="text-[#10b981]">
          PUSH {day.pushReps} reps
          {day.pushTimeSec > 0 ? ` · ${day.pushTimeSec}s hold` : ""}
        </p>
        <p className="text-[#6AA3E0]">
          PULL {day.pullReps} reps
          {day.pullTimeSec > 0 ? ` · ${day.pullTimeSec}s hold` : ""}
        </p>
        <p className="text-[#C8D0DC] text-[0.65rem]">
          {day.avgRpe != null ? `RPE ${day.avgRpe}` : "RPE —"}
          {" · "}Hypertrophy {day.hypertrophyScore}
          {day.prHits > 0 ? ` · PR x${day.prHits}` : ""}
        </p>
      </div>
    );
  }

  if (day.gapDays > 0) {
    return (
      <div style={dmSans}>
        <p className="font-bold text-white mb-1" style={orbitron}>{dateLabel} · REST</p>
        <p className="text-[#ef4444]">
          {day.gapDays}-day gap since last session
        </p>
      </div>
    );
  }

  return (
    <div style={dmSans}>
      <p className="font-bold text-[#8494A7]" style={orbitron}>{dateLabel} · REST</p>
      <p className="text-[#6AA3E0]">No workout logged</p>
    </div>
  );
}

export function CaliProgressionHeatmap({ data }: CaliProgressionHeatmapProps) {
  const noData = useMemo(
    () => data.every((d) => !d.active && d.greenScore === 0 && d.redScore === 0),
    [data],
  );

  const rects = useMemo(() => layoutTreemap(data, 100, 56), [data]);
  const newestKey = data.length > 0 ? data[data.length - 1]?.dateKey : null;

  if (data.length === 0) return null;

  if (noData) {
    return (
      <div>
        <p className="text-[0.6rem] font-bold tracking-widest text-[#8494A7] mb-3" style={orbitron}>
          PROGRESSION MAP
        </p>
        <div
          className="flex items-center justify-center rounded-xl border border-dashed text-xs text-[#8494A7] py-10"
          style={{ borderColor: "rgba(66,116,185,0.25)", ...dmSans }}
        >
          Complete your first workout to unlock progression map
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-[0.6rem] font-bold tracking-widest text-[#8494A7] mb-3" style={orbitron}>
        PROGRESSION MAP
      </p>

      <TooltipProvider delayDuration={120}>
        <div
          className="relative w-full rounded-xl overflow-hidden border"
          style={{
            aspectRatio: "16 / 9",
            background: "rgba(5,10,20,0.6)",
            borderColor: "rgba(66,116,185,0.2)",
          }}
        >
          {rects.map((rect, i) => {
            const showLabel = rect.day.dateKey === newestKey && rect.w > 14 && rect.h > 10;
            const pct = (v: number, total: number) => `${(v / total) * 100}%`;

            return (
              <Tooltip key={rect.day.dateKey}>
                <TooltipTrigger asChild>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.92 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.015, duration: 0.25 }}
                    className="absolute rounded-sm overflow-hidden cursor-crosshair flex items-end p-1"
                    style={{
                      left: pct(rect.x, 100),
                      top: pct(rect.y, 56),
                      width: pct(rect.w, 100),
                      height: pct(rect.h, 56),
                      ...tileColors(rect.day, false),
                    }}
                  >
                    {showLabel && (
                      <span
                        className="text-[0.5rem] sm:text-[0.55rem] font-bold text-white/90 leading-tight truncate"
                        style={{ ...orbitron, textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
                      >
                        {formatDateLabel(rect.day.dateKey)}
                      </span>
                    )}
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent
                  side="top"
                  sideOffset={6}
                  className="max-w-[260px] bg-[#0d1528] border border-[#4274B9]/40 text-[#C8D0DC] px-3 py-2.5 shadow-xl shadow-black/50"
                >
                  <HoverCard day={rect.day} noData={false} />
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>

      <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-[0.6rem] text-[#8494A7]" style={dmSans}>
        <span className="flex items-center gap-1.5">
          <span
            className="w-10 h-2 rounded-sm"
            style={{ background: `linear-gradient(90deg, ${CHART_UP}33, ${CHART_UP})` }}
          />
          Intensity + Hypertrophy
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="w-10 h-2 rounded-sm"
            style={{ background: `linear-gradient(90deg, ${CHART_DOWN}33, ${CHART_DOWN})` }}
          />
          Missed days
        </span>
        <span className="text-[#6AA3E0]">Larger = more recent</span>
      </div>
    </div>
  );
}