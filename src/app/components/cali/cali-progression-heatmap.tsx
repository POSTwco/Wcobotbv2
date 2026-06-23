import { useMemo } from "react";
import { motion } from "motion/react";
import type { HeatmapDayPoint } from "../../lib/cali-analytics-types";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "../ui/tooltip";

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const DOW_SHORT = ["S", "M", "T", "W", "R", "F", "S"] as const;

const GREEN_DEEP = "#0a7d4a";
const GREEN_MID = "#16c784";
const GREEN_BRIGHT = "#3dffa8";
const RED_DEEP = "#8b1a1a";
const RED_MID = "#f6465d";
const RED_BRIGHT = "#ff6b7a";
const NEUTRAL = "#1e2329";
const VOID = "#131722";
const CANVAS = "#0b0e11";

// Fixed perfect cell size (px) for real-heatmap feel: uniform squares, always readable,
// consistent across 7d/30d/90d ranges. 32px chosen for 3-line content + tight gaps.
const CELL_SIZE = 32;

interface CaliProgressionHeatmapProps {
  data: HeatmapDayPoint[];
}

type GridCell = HeatmapDayPoint | null;

interface PeriodSummary {
  pushReps: number;
  pullReps: number;
  pushTimeSec: number;
  pullTimeSec: number;
  hypertrophyAvg: number;
  intensityAvg: number;
  sessions: number;
  missed: number;
}

interface WeekMeta {
  label: string | null;
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

function vibrantTileColor(day: HeatmapDayPoint | null, noData: boolean): string {
  if (!day || noData) return NEUTRAL;

  if (day.active) {
    const t = Math.max(0.12, day.greenScore / 100);
    return t < 0.5
      ? mixHex(GREEN_DEEP, GREEN_MID, t * 2)
      : mixHex(GREEN_MID, GREEN_BRIGHT, (t - 0.5) * 2);
  }

  if (day.redScore > 0) {
    const t = Math.max(0.15, day.redScore / 100);
    return t < 0.5
      ? mixHex(RED_DEEP, RED_MID, t * 2)
      : mixHex(RED_MID, RED_BRIGHT, (t - 0.5) * 2);
  }

  return NEUTRAL;
}

function summarizePeriod(days: HeatmapDayPoint[]): PeriodSummary {
  const active = days.filter((d) => d.active);
  const missed = days.filter((d) => d.redScore > 0);
  const pushReps = days.reduce((s, d) => s + d.pushReps, 0);
  const pullReps = days.reduce((s, d) => s + d.pullReps, 0);
  const pushTimeSec = days.reduce((s, d) => s + d.pushTimeSec, 0);
  const pullTimeSec = days.reduce((s, d) => s + d.pullTimeSec, 0);
  const hypertrophyAvg = active.length
    ? Math.round(active.reduce((s, d) => s + d.hypertrophyScore, 0) / active.length)
    : 0;
  const intensityAvg = active.length
    ? Math.round(active.reduce((s, d) => s + d.greenScore, 0) / active.length)
    : 0;

  return {
    pushReps,
    pullReps,
    pushTimeSec,
    pullTimeSec,
    hypertrophyAvg,
    intensityAvg,
    sessions: active.length,
    missed: missed.length,
  };
}

function buildContributionGrid(data: HeatmapDayPoint[]): { grid: GridCell[][]; weekMeta: WeekMeta[] } {
  if (data.length === 0) return { grid: [], weekMeta: [] };

  const firstDow = new Date(`${data[0].dateKey}T12:00:00Z`).getUTCDay();
  const padded: GridCell[] = Array.from({ length: firstDow }, () => null);
  padded.push(...data);

  while (padded.length % 7 !== 0) padded.push(null);

  const weeks: GridCell[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }

  const grid = Array.from({ length: 7 }, (_, dow) =>
    weeks.map((week) => week[dow] ?? null),
  );

  const weekMeta: WeekMeta[] = weeks.map((week, idx) => {
    const anchor = week.find((d) => d != null);
    if (!anchor) return { label: null };
    const d = new Date(`${anchor.dateKey}T12:00:00Z`);
    const prevAnchor = idx > 0 ? weeks[idx - 1].find((x) => x != null) : null;
    const prevMonth = prevAnchor
      ? new Date(`${prevAnchor.dateKey}T12:00:00Z`).getUTCMonth()
      : -1;
    const month = d.getUTCMonth();
    if (month !== prevMonth) {
      return {
        label: d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }).toUpperCase(),
      };
    }
    return { label: null };
  });

  return { grid, weekMeta };
}

function formatDateLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00Z`);
  const dow = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][d.getUTCDay()];
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).toUpperCase();
  return `${dow} ${date}`;
}

function dayOfMonth(dateKey: string): number {
  return new Date(`${dateKey}T12:00:00Z`).getUTCDate();
}

function formatHold(sec: number): string {
  if (sec <= 0) return "";
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m`;
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
        <p style={{ color: GREEN_BRIGHT }}>
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

function SummaryCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub: string;
  accent: string;
}) {
  return (
    <div
      className="flex-1 min-w-[118px] rounded-md px-2.5 py-2 border border-white/5"
      style={{ background: "rgba(255,255,255,0.028)" }}
    >
      <div className="flex items-center gap-1 mb-0.5">
        <span className="w-1 h-1 rounded-full shrink-0" style={{ background: accent }} />
        <span className="text-[0.5rem] font-bold tracking-widest text-[#8494A7]" style={orbitron}>
          {label}
        </span>
      </div>
      <p className="text-[15px] font-bold text-white leading-none" style={orbitron}>{value}</p>
      <p className="text-[0.55rem] text-[#6AA3E0] mt-0.5 leading-tight" style={dmSans}>{sub}</p>
    </div>
  );
}

function HeatmapTile({
  day,
  noData,
  isToday,
  index,
}: {
  day: GridCell;
  noData: boolean;
  isToday: boolean;
  index: number;
}) {
  const bg = day ? vibrantTileColor(day, noData) : VOID;
  const cellPx = `${CELL_SIZE}px`;

  const inner = (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.004, duration: 0.16 }}
      className="relative flex flex-col items-center justify-center overflow-hidden cursor-crosshair select-none transition-[filter,transform] duration-100 hover:brightness-110 hover:z-10 hover:scale-[1.03]"
      style={{
        width: cellPx,
        height: cellPx,
        background: bg,
        boxShadow: isToday
          ? "inset 0 0 0 2px rgba(255,255,255,0.65), 0 0 0 1px rgba(255,255,255,0.1)"
          : "none",
      }}
    >
      {day && !noData && (
        <div className="flex flex-col items-center justify-center text-center leading-none pointer-events-none" style={{ padding: "1px 2px" }}>
          <span
            className="font-bold text-white/95"
            style={{ fontSize: "10px", ...orbitron, letterSpacing: "-0.2px" }}
          >
            {dayOfMonth(day.dateKey)}
          </span>
          {day.active && (
            <>
              <span
                className="font-bold mt-[1px]"
                style={{ fontSize: "9px", color: "#e8fff4", ...orbitron }}
              >
                +{day.greenScore}%
              </span>
              {(day.pushReps > 0 || day.pullReps > 0) && (
                <span
                  className="mt-[1px] text-white/75"
                  style={{ fontSize: "7px", ...dmSans }}
                >
                  P{day.pushReps}·L{day.pullReps}
                </span>
              )}
            </>
          )}
          {!day.active && day.redScore > 0 && (
            <span
              className="font-bold mt-[1px]"
              style={{ fontSize: "9px", color: "#ffe8ea", ...orbitron }}
            >
              -{day.redScore}%
            </span>
          )}
          {!day.active && day.redScore === 0 && day.hypertrophyScore === 0 && (
            <span
              className="text-white/30 mt-[1px]"
              style={{ fontSize: "8px", ...orbitron }}
            >
              —
            </span>
          )}
        </div>
      )}
    </motion.div>
  );

  if (!day) return inner;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{inner}</TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={6}
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

  const { grid, weekMeta } = useMemo(() => buildContributionGrid(data), [data]);
  const numWeeks = grid[0]?.length ?? 0;
  const todayKey = data.length > 0 ? data[data.length - 1]?.dateKey : null;

  const summary7 = useMemo(() => summarizePeriod(data.slice(-7)), [data]);
  const summary30 = useMemo(() => summarizePeriod(data.slice(-30)), [data]);

  if (data.length === 0) return null;

  if (noData) {
    return (
      <div>
        <p className="text-[0.6rem] font-bold tracking-widest text-[#8494A7] mb-3" style={orbitron}>
          PROGRESSION HEATMAP
        </p>
        <div
          className="flex items-center justify-center rounded-lg border border-dashed text-xs text-[#8494A7] py-10"
          style={{ borderColor: "rgba(66,116,185,0.25)", background: CANVAS, ...dmSans }}
        >
          Complete your first workout to unlock progression heatmap
        </div>
      </div>
    );
  }

  const pushSub = [
    summary7.pushReps > 0 ? `${summary7.pushReps} reps 7d` : null,
    summary7.pushTimeSec > 0 ? `${formatHold(summary7.pushTimeSec)} hold` : null,
    `${summary30.pushReps} reps 30d`,
  ].filter(Boolean).join(" · ");

  const pullSub = [
    summary7.pullReps > 0 ? `${summary7.pullReps} reps 7d` : null,
    summary7.pullTimeSec > 0 ? `${formatHold(summary7.pullTimeSec)} hold` : null,
    `${summary30.pullReps} reps 30d`,
  ].filter(Boolean).join(" · ");

  return (
    <div>
      <p className="text-[0.6rem] font-bold tracking-widest text-[#8494A7] mb-3" style={orbitron}>
        PROGRESSION HEATMAP
      </p>

      {/* Summary strip — ticker / market row style (matches real heatmap polish) */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <SummaryCard
          label="PUSH MOTION"
          value={`${summary7.pushReps}`}
          sub={pushSub || "No push volume 7d"}
          accent={GREEN_MID}
        />
        <SummaryCard
          label="PULL MOTION"
          value={`${summary7.pullReps}`}
          sub={pullSub || "No pull volume 7d"}
          accent="#6AA3E0"
        />
        <SummaryCard
          label="HYPERTROPHY"
          value={`${summary7.hypertrophyAvg}`}
          sub={`${summary7.sessions}/7 sessions · avg ${summary30.hypertrophyAvg} (30d)`}
          accent="#D4A843"
        />
        <SummaryCard
          label="INTENSITY"
          value={summary7.intensityAvg > 0 ? `+${summary7.intensityAvg}%` : "—"}
          sub={`${summary7.missed} missed · ${summary30.sessions} sessions (30d)`}
          accent={summary7.missed > 0 ? RED_MID : GREEN_BRIGHT}
        />
      </div>

      <TooltipProvider delayDuration={60}>
        <div
          className="w-full rounded-lg overflow-hidden border border-white/5"
          style={{ background: CANVAS }}
        >
          {/* Heatmap body: fixed DOW sidebar + single shared horizontal scroller for header + cells (perfect sync, real heatmap UX) */}
          <div className="flex p-1 gap-1">
            {/* DOW labels (non-scrolling sidebar) */}
            <div className="flex flex-col shrink-0" style={{ width: 18, gap: 1 }}>
              {/* Spacer to align with month header row height when present */}
              {numWeeks > 0 && <div style={{ height: 14 }} />}
              {DOW_SHORT.map((label, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center text-[#8494A7]/55 font-bold"
                  style={{ height: CELL_SIZE, fontSize: "9px", ...orbitron }}
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Shared scroll container: month row + grid rows inside */}
            <div
              className="overflow-x-auto flex-1 min-w-0"
              style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.12) transparent" }}
            >
              {/* Month header (fixed px cols) */}
              {numWeeks > 0 && (
                <div className="border-b border-white/5 pb-1 mb-1" style={{ background: VOID, marginLeft: -1 }}>
                  <div
                    className="grid"
                    style={{
                      gridTemplateColumns: `repeat(${numWeeks}, ${CELL_SIZE}px)`,
                      gap: 1,
                    }}
                  >
                    {weekMeta.map((meta, i) => (
                      <div
                        key={i}
                        className="text-[0.5rem] font-bold text-[#8494A7] truncate px-0.5"
                        style={{ ...orbitron, height: 13 }}
                      >
                        {meta.label ?? ""}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Grid rows — fixed perfect square cells */}
              <div style={{ gap: 1, display: "flex", flexDirection: "column" }}>
                {grid.map((row, rowIdx) => (
                  <div
                    key={rowIdx}
                    className="grid"
                    style={{
                      gridTemplateColumns: `repeat(${numWeeks}, ${CELL_SIZE}px)`,
                      gap: 1,
                    }}
                  >
                    {row.map((day, colIdx) => (
                      <HeatmapTile
                        key={day?.dateKey ?? `pad-${rowIdx}-${colIdx}`}
                        day={day}
                        noData={false}
                        isToday={day?.dateKey === todayKey}
                        index={rowIdx * numWeeks + colIdx}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </TooltipProvider>

      <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3 text-[0.58rem] text-[#8494A7]" style={dmSans}>
        <span className="flex items-center gap-1.5">
          <span className="flex h-3 rounded-sm overflow-hidden">
            <span className="w-3.5 h-full" style={{ background: GREEN_DEEP }} />
            <span className="w-3.5 h-full" style={{ background: GREEN_MID }} />
            <span className="w-3.5 h-full" style={{ background: GREEN_BRIGHT }} />
          </span>
          Intensity + hypertrophy
        </span>
        <span className="flex items-center gap-1.5">
          <span className="flex h-3 rounded-sm overflow-hidden">
            <span className="w-3.5 h-full" style={{ background: RED_DEEP }} />
            <span className="w-3.5 h-full" style={{ background: RED_MID }} />
            <span className="w-3.5 h-full" style={{ background: RED_BRIGHT }} />
          </span>
          Missed / gap
        </span>
        <span className="text-[#6AA3E0]/75">P·L = push · pull reps</span>
      </div>
    </div>
  );
}