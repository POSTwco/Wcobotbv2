import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import type { HeatmapDayPoint, StatsRange } from "../../lib/cali-analytics-types";
import { layoutCoin360Treemap, type TreemapTile } from "../../lib/coin360-treemap-layout";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "../ui/tooltip";

const orbitron: React.CSSProperties = { fontFamily: "Orbitron, sans-serif" };
const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

const GREEN_DEEP = "#0e4429";
const GREEN_MID = "#26a641";
const GREEN_BRIGHT = "#39d353";
const RED_DEEP = "#3d1418";
const RED_MID = "#da3633";
const RED_BRIGHT = "#ff6b6b";
const NEUTRAL = "#1e2329";
const CANVAS = "#0b0e11";

interface CaliProgressionHeatmapProps {
  data: HeatmapDayPoint[];
  range: StatsRange;
}

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

function windowDays(range: StatsRange): number {
  return range === "7d" ? 7 : range === "30d" ? 30 : 90;
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

function vibrantTileColor(day: HeatmapDayPoint, noData: boolean): string {
  if (noData) return NEUTRAL;
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
  return {
    pushReps: days.reduce((s, d) => s + d.pushReps, 0),
    pullReps: days.reduce((s, d) => s + d.pullReps, 0),
    pushTimeSec: days.reduce((s, d) => s + d.pushTimeSec, 0),
    pullTimeSec: days.reduce((s, d) => s + d.pullTimeSec, 0),
    hypertrophyAvg: active.length
      ? Math.round(active.reduce((s, d) => s + d.hypertrophyScore, 0) / active.length)
      : 0,
    intensityAvg: active.length
      ? Math.round(active.reduce((s, d) => s + d.greenScore, 0) / active.length)
      : 0,
    sessions: active.length,
    missed: missed.length,
  };
}

function formatDateLabel(dateKey: string): string {
  const d = new Date(`${dateKey}T12:00:00Z`);
  const dow = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"][d.getUTCDay()];
  const date = d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).toUpperCase();
  return `${dow} ${date}`;
}

function formatHold(sec: number): string {
  if (sec <= 0) return "";
  if (sec < 60) return `${sec}s`;
  return `${Math.floor(sec / 60)}m`;
}

function scoreDisplay(day: HeatmapDayPoint): { text: string; positive: boolean } {
  if (day.active && day.greenScore > 0) {
    return { text: `+${day.greenScore}%`, positive: true };
  }
  if (day.redScore > 0) {
    return { text: `-${day.redScore}%`, positive: false };
  }
  return { text: "—", positive: true };
}

function volumeDisplay(day: HeatmapDayPoint): string {
  const total = day.pushReps + day.pullReps;
  if (total > 0) return `${total} reps`;
  if (day.volume > 0) return `${day.volume} vol`;
  return "REST";
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

type TileTier = "hero" | "large" | "medium" | "micro";

function tileTier(w: number, h: number): TileTier {
  const area = w * h;
  if (area >= 14000) return "hero";
  if (area >= 5000) return "large";
  if (area >= 900) return "medium";
  return "micro";
}

function TileContent({ tile, tier }: { tile: TreemapTile; tier: TileTier }) {
  const { day, label, dominancePct } = tile;
  const score = scoreDisplay(day);

  if (tier === "micro") return null;

  if (tier === "hero") {
    return (
      <div className="flex flex-col justify-between h-full p-3 sm:p-4 pointer-events-none">
        <p
          className="font-bold text-white leading-none"
          style={{ fontSize: "clamp(1.4rem, 5vw, 2.4rem)", ...orbitron }}
        >
          {label}
        </p>
        <div>
          <p
            className="font-bold text-white/90 leading-tight"
            style={{ fontSize: "clamp(0.75rem, 2vw, 1rem)", ...orbitron }}
          >
            {volumeDisplay(day)}
          </p>
          <p
            className="font-bold mt-1 flex items-center gap-1"
            style={{
              fontSize: "clamp(0.85rem, 2.5vw, 1.15rem)",
              color: score.positive ? "#e8fff4" : "#ffe8ea",
              ...orbitron,
            }}
          >
            <span>{score.positive ? "▲" : "▼"}</span>
            {score.text}
          </p>
          <p className="text-white/55 mt-2" style={{ fontSize: "0.6rem", ...dmSans }}>
            Recency: {dominancePct}%
          </p>
          {(day.pushReps > 0 || day.pullReps > 0) && (
            <p className="text-white/70 mt-1" style={{ fontSize: "0.58rem", ...dmSans }}>
              PUSH {day.pushReps} · PULL {day.pullReps} · HYP {day.hypertrophyScore}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (tier === "large") {
    return (
      <div className="flex flex-col justify-center h-full p-2 sm:p-3 pointer-events-none">
        <p
          className="font-bold text-white leading-none"
          style={{ fontSize: "clamp(0.9rem, 2.5vw, 1.35rem)", ...orbitron }}
        >
          {label}
        </p>
        <p className="text-white/80 mt-1" style={{ fontSize: "clamp(0.55rem, 1.5vw, 0.7rem)", ...orbitron }}>
          {volumeDisplay(day)}
        </p>
        <p
          className="font-bold mt-1"
          style={{
            fontSize: "clamp(0.65rem, 1.8vw, 0.85rem)",
            color: score.positive ? "#e8fff4" : "#ffe8ea",
            ...orbitron,
          }}
        >
          {score.positive ? "▲" : "▼"} {score.text}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-full p-1 pointer-events-none text-center">
      <p
        className="font-bold text-white/95 leading-none"
        style={{ fontSize: "clamp(0.45rem, 1.2vw, 0.65rem)", ...orbitron }}
      >
        {label}
      </p>
      <p
        className="font-bold mt-0.5"
        style={{
          fontSize: "clamp(0.4rem, 1vw, 0.55rem)",
          color: score.positive ? "#e8fff4" : "#ffe8ea",
          ...orbitron,
        }}
      >
        {score.text}
      </p>
    </div>
  );
}

function TreemapTileView({
  tile,
  noData,
  index,
}: {
  tile: TreemapTile;
  noData: boolean;
  index: number;
}) {
  const { day, x, y, w, h } = tile;
  const bg = vibrantTileColor(day, noData);
  const tier = tileTier(w, h);
  const isToday = tile.dayIndex === 0;

  const inner = (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.012, duration: 0.2 }}
      className="absolute overflow-hidden cursor-crosshair select-none transition-[filter] duration-100 hover:brightness-110 hover:z-20"
      style={{
        left: x,
        top: y,
        width: w,
        height: h,
        background: bg,
        boxShadow: isToday ? "inset 0 0 0 2px rgba(255,255,255,0.45)" : undefined,
      }}
    >
      <TileContent tile={tile} tier={tier} />
    </motion.div>
  );

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

export function CaliProgressionHeatmap({ data, range }: CaliProgressionHeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const noData = useMemo(
    () => data.every((d) => !d.active && d.greenScore === 0 && d.redScore === 0),
    [data],
  );

  const days = windowDays(range);
  const recencyDays = useMemo(
    () => (data.length ? [...data.slice(-days)].reverse() : []),
    [data, days],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      const w = Math.floor(rect.width);
      const h = Math.max(280, Math.floor(w / 2));
      setSize({ w, h });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const tiles = useMemo(() => {
    if (size.w <= 0 || recencyDays.length === 0) return [];
    return layoutCoin360Treemap(recencyDays, size.w, size.h);
  }, [recencyDays, size.w, size.h]);

  const summaryWindow = useMemo(() => summarizePeriod(recencyDays), [recencyDays]);
  const summary30 = useMemo(() => summarizePeriod(data.slice(-30)), [data]);

  if (data.length === 0) return null;

  if (noData) {
    return (
      <div>
        <p className="text-[0.6rem] font-bold tracking-widest text-[#8494A7] mb-3" style={orbitron}>
          ACTIVITY HEATMAP
        </p>
        <div
          className="flex items-center justify-center rounded-lg border border-dashed text-xs text-[#8494A7] py-10"
          style={{ borderColor: "rgba(66,116,185,0.25)", background: CANVAS, ...dmSans }}
        >
          Complete your first workout to unlock activity heatmap
        </div>
      </div>
    );
  }

  const pushSub = [
    summaryWindow.pushReps > 0 ? `${summaryWindow.pushReps} reps` : null,
    summaryWindow.pushTimeSec > 0 ? `${formatHold(summaryWindow.pushTimeSec)} hold` : null,
    `${summary30.pushReps} reps (30d)`,
  ].filter(Boolean).join(" · ");

  const pullSub = [
    summaryWindow.pullReps > 0 ? `${summaryWindow.pullReps} reps` : null,
    summaryWindow.pullTimeSec > 0 ? `${formatHold(summaryWindow.pullTimeSec)} hold` : null,
    `${summary30.pullReps} reps (30d)`,
  ].filter(Boolean).join(" · ");

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-3">
        <p className="text-[0.6rem] font-bold tracking-widest text-[#8494A7]" style={orbitron}>
          ACTIVITY HEATMAP
        </p>
        <p className="text-[0.55rem] text-[#6AA3E0]/80 tracking-wider" style={orbitron}>
          ACTIVITY · {range.toUpperCase()} · RECENCY DOMINANCE
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <SummaryCard
          label="PUSH MOTION"
          value={`${summaryWindow.pushReps}`}
          sub={pushSub || "No push volume"}
          accent={GREEN_MID}
        />
        <SummaryCard
          label="PULL MOTION"
          value={`${summaryWindow.pullReps}`}
          sub={pullSub || "No pull volume"}
          accent="#6AA3E0"
        />
        <SummaryCard
          label="HYPERTROPHY"
          value={`${summaryWindow.hypertrophyAvg}`}
          sub={`${summaryWindow.sessions}/${days} sessions · avg ${summary30.hypertrophyAvg} (30d)`}
          accent="#D4A843"
        />
        <SummaryCard
          label="INTENSITY"
          value={summaryWindow.intensityAvg > 0 ? `+${summaryWindow.intensityAvg}%` : "—"}
          sub={`${summaryWindow.missed} missed · ${summary30.sessions} sessions (30d)`}
          accent={summaryWindow.missed > 0 ? RED_MID : GREEN_BRIGHT}
        />
      </div>

      <TooltipProvider delayDuration={60}>
        <div
          ref={containerRef}
          className="w-full rounded-lg overflow-hidden border border-white/5"
          style={{ background: CANVAS, aspectRatio: "2 / 1", minHeight: 280 }}
        >
          {tiles.length > 0 && size.w > 0 && (
            <div className="relative w-full" style={{ width: size.w, height: size.h }}>
              {tiles.map((tile, idx) => (
                <TreemapTileView
                  key={tile.day.dateKey}
                  tile={tile}
                  noData={false}
                  index={idx}
                />
              ))}
            </div>
          )}
        </div>
      </TooltipProvider>

      <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-3 text-[0.58rem] text-[#8494A7]" style={dmSans}>
        <span className="flex items-center gap-1.5">
          <span className="flex h-3 rounded-sm overflow-hidden">
            <span className="w-3.5 h-full" style={{ background: GREEN_DEEP }} />
            <span className="w-3.5 h-full" style={{ background: GREEN_MID }} />
            <span className="w-3.5 h-full" style={{ background: GREEN_BRIGHT }} />
          </span>
          Session intensity + hypertrophy
        </span>
        <span className="flex items-center gap-1.5">
          <span className="flex h-3 rounded-sm overflow-hidden">
            <span className="w-3.5 h-full" style={{ background: RED_DEEP }} />
            <span className="w-3.5 h-full" style={{ background: RED_MID }} />
            <span className="w-3.5 h-full" style={{ background: RED_BRIGHT }} />
          </span>
          Missed / gap
        </span>
      </div>
    </div>
  );
}