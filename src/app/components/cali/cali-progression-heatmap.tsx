import { useMemo } from "react";
import { motion } from "motion/react";
import type { HeatmapDayPoint } from "../../lib/cali-analytics-types";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "../ui/tooltip";

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const DOW_LABELS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"] as const;

const GREEN_LOW = "#00C853";
const GREEN_MID = "#00E676";
const GREEN_HIGH = "#69F0AE";
const RED_LOW = "#C62828";
const RED_MID = "#FF1744";
const RED_HIGH = "#FF5252";
const NEUTRAL = "#1a2332";
const NEUTRAL_BORDER = "#243044";

const MIN_CELL = 16;
const MAX_CELL = 40;

interface CaliProgressionHeatmapProps {
  data: HeatmapDayPoint[];
}

type GridCell = HeatmapDayPoint | null;

interface WeekRow {
  days: GridCell[];
  cellSize: number;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function mixHex(c1: string, c2: string, t: number): string {
  const parse = (h: string) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  const [r1, g1, b1] = parse(c1);
  const [r2, g2, b2] = parse(c2);
  const r = Math.round(lerp(r1, r2, t));
  const g = Math.round(lerp(g1, g2, t));
  const b = Math.round(lerp(b1, b2, t));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function vibrantTileColor(day: HeatmapDayPoint | null, noData: boolean): { bg: string; glow?: string } {
  if (!day || noData) return { bg: NEUTRAL };

  if (day.active) {
    const t = Math.max(0.15, day.greenScore / 100);
    const bg = t < 0.5
      ? mixHex(GREEN_LOW, GREEN_MID, t * 2)
      : mixHex(GREEN_MID, GREEN_HIGH, (t - 0.5) * 2);
    return {
      bg,
      glow: day.greenScore > 40 ? `0 0 10px ${bg}99` : undefined,
    };
  }

  if (day.redScore > 0) {
    const t = Math.max(0.2, day.redScore / 100);
    const bg = t < 0.5
      ? mixHex(RED_LOW, RED_MID, t * 2)
      : mixHex(RED_MID, RED_HIGH, (t - 0.5) * 2);
    return {
      bg,
      glow: day.redScore > 40 ? `0 0 10px ${bg}88` : undefined,
    };
  }

  return { bg: NEUTRAL };
}

function buildWeekGrid(data: HeatmapDayPoint[]): WeekRow[] {
  if (data.length === 0) return [];

  const firstDow = new Date(`${data[0].dateKey}T12:00:00Z`).getUTCDay();
  const padded: GridCell[] = Array.from({ length: firstDow }, () => null);
  padded.push(...data);

  while (padded.length % 7 !== 0) padded.push(null);

  const rawWeeks: GridCell[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    rawWeeks.push(padded.slice(i, i + 7));
  }

  const count = rawWeeks.length;
  return rawWeeks.map((days, weekIdx) => {
    const t = count <= 1 ? 1 : weekIdx / (count - 1);
    const cellSize = Math.round(MIN_CELL + t * (MAX_CELL - MIN_CELL));
    return { days, cellSize };
  });
}

function formatDateLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00Z`);
  const dow = DOW_LABELS[d.getUTCDay()];
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).toUpperCase();
  return `${dow} ${date}`;
}

function formatShortDate(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00Z`);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).toUpperCase();
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
    const scoreLabel = day.greenScore > 0 ? `+${day.greenScore}%` : "—";
    return (
      <div className="space-y-1.5" style={dmSans}>
        <p className="font-bold text-white" style={orbitron}>
          {dateLabel} · {levelLabel}
        </p>
        <p className="font-bold" style={{ color: GREEN_MID }}>
          {scoreLabel} intensity
        </p>
        <p style={{ color: GREEN_HIGH }}>
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
        <p className="font-bold" style={{ color: RED_MID }}>
          -{day.redScore}% · {day.gapDays}-day gap
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

function HeatmapCell({
  day,
  size,
  noData,
  isNewest,
  index,
}: {
  day: GridCell;
  size: number;
  noData: boolean;
  isNewest: boolean;
  index: number;
}) {
  const colors = vibrantTileColor(day, noData || !day);
  const showDow = size >= 28 && day;
  const showDate = size >= 34 && day && isNewest;

  const inner = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.008, duration: 0.2 }}
      className="shrink-0 flex flex-col items-center justify-center overflow-hidden cursor-crosshair select-none"
      style={{
        width: size,
        height: size,
        background: colors.bg,
        boxShadow: colors.glow,
        borderRight: `1px solid ${NEUTRAL_BORDER}`,
        borderBottom: `1px solid ${NEUTRAL_BORDER}`,
      }}
    >
      {showDow && day && (
        <span
          className="font-bold text-white/90 leading-none"
          style={{
            fontSize: size >= 36 ? "0.55rem" : "0.45rem",
            ...orbitron,
            textShadow: "0 1px 3px rgba(0,0,0,0.7)",
          }}
        >
          {DOW_LABELS[new Date(`${day.dateKey}T12:00:00Z`).getUTCDay()]}
        </span>
      )}
      {showDate && (
        <span
          className="text-white/80 leading-none mt-0.5"
          style={{ fontSize: "0.4rem", ...orbitron }}
        >
          {formatShortDate(day.dateKey)}
        </span>
      )}
    </motion.div>
  );

  if (!day) {
    return (
      <div
        className="shrink-0"
        style={{
          width: size,
          height: size,
          background: "#0d1117",
          borderRight: `1px solid ${NEUTRAL_BORDER}`,
          borderBottom: `1px solid ${NEUTRAL_BORDER}`,
        }}
      />
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{inner}</TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={4}
        className="max-w-[260px] bg-[#0a0f18] border border-[#4274B9]/50 text-[#C8D0DC] px-3 py-2.5 shadow-xl shadow-black/60"
      >
        <HoverCard day={day} noData={noData} />
      </TooltipContent>
    </Tooltip>
  );
}

export function CaliProgressionHeatmap({ data }: CaliProgressionHeatmapProps) {
  const noData = useMemo(
    () => data.every((d) => !d.active && d.greenScore === 0 && d.redScore === 0),
    [data],
  );

  const weeks = useMemo(() => buildWeekGrid(data), [data]);
  const newestKey = data.length > 0 ? data[data.length - 1]?.dateKey : null;
  const maxCell = weeks.length > 0 ? weeks[weeks.length - 1].cellSize : MAX_CELL;

  if (data.length === 0) return null;

  if (noData) {
    return (
      <div>
        <p className="text-[0.6rem] font-bold tracking-widest text-[#8494A7] mb-3" style={orbitron}>
          PROGRESSION MAP
        </p>
        <div
          className="flex items-center justify-center rounded-lg border border-dashed text-xs text-[#8494A7] py-10"
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

      <TooltipProvider delayDuration={80}>
        <div
          className="inline-block rounded-lg overflow-hidden border"
          style={{ borderColor: NEUTRAL_BORDER, background: "#0d1117" }}
        >
          {/* Day-of-week header — aligned to largest (most recent) week */}
          <div className="flex justify-end" style={{ borderBottom: `1px solid ${NEUTRAL_BORDER}` }}>
            {DOW_LABELS.map((label) => (
              <div
                key={label}
                className="shrink-0 flex items-center justify-center text-[#8494A7] font-bold"
                style={{
                  width: maxCell,
                  height: 18,
                  fontSize: "0.45rem",
                  ...orbitron,
                  borderRight: `1px solid ${NEUTRAL_BORDER}`,
                }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Week rows — oldest (small) at top, newest (large) at bottom */}
          <div className="flex flex-col">
            {weeks.map((week, weekIdx) => (
              <div key={weekIdx} className="flex justify-end">
                {week.days.map((day, dayIdx) => (
                  <HeatmapCell
                    key={day?.dateKey ?? `pad-${weekIdx}-${dayIdx}`}
                    day={day}
                    size={week.cellSize}
                    noData={false}
                    isNewest={day?.dateKey === newestKey}
                    index={weekIdx * 7 + dayIdx}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </TooltipProvider>

      <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-[0.6rem] text-[#8494A7]" style={dmSans}>
        <span className="flex items-center gap-1.5">
          <span className="flex h-3 overflow-hidden rounded-sm">
            <span className="w-3 h-3" style={{ background: GREEN_LOW }} />
            <span className="w-3 h-3" style={{ background: GREEN_MID }} />
            <span className="w-3 h-3" style={{ background: GREEN_HIGH }} />
          </span>
          Intensity + Hypertrophy
        </span>
        <span className="flex items-center gap-1.5">
          <span className="flex h-3 overflow-hidden rounded-sm">
            <span className="w-3 h-3" style={{ background: RED_LOW }} />
            <span className="w-3 h-3" style={{ background: RED_MID }} />
            <span className="w-3 h-3" style={{ background: RED_HIGH }} />
          </span>
          Missed days
        </span>
        <span className="text-[#6AA3E0]">Squares grow toward today</span>
      </div>
    </div>
  );
}