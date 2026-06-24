import { useId, useMemo } from "react";
import {
  Bar, CartesianGrid, Cell, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { StatsSparkPoint } from "../../lib/cali-analytics-types";
import { CHART_DOWN, CHART_UP, deltaColor, formatDelta } from "../../lib/cali-analytics-types";

const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

interface CaliCandleChartProps {
  data: StatsSparkPoint[];
  metric?: "athleteScore" | "movementIndex" | "volume";
  label?: string;
  height?: number;
  showVolume?: boolean;
  yDomain?: [number, number];
}

export function CaliCandleChart({
  data,
  metric = "athleteScore",
  label = "Athlete Index",
  height = 260,
  showVolume = true,
  yDomain,
}: CaliCandleChartProps) {
  const gradId = useId().replace(/:/g, "");

  const chartData = useMemo(() => {
    return data.map((p, i) => {
      const prev = i > 0 ? data[i - 1][metric] : p[metric];
      const close = p[metric];
      const open = prev;
      const high = Math.max(open, close);
      const low = Math.min(open, close);
      const delta = open > 0 ? ((close - open) / open) * 100 : 0;
      return {
        date: p.dateKey.slice(5),
        open,
        close,
        high,
        low,
        volume: p.volume,
        delta,
        up: close >= open,
      };
    });
  }, [data, metric]);

  if (chartData.length < 2) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-dashed text-xs text-[#8494A7]"
        style={{ height, borderColor: "rgba(66,116,185,0.2)", ...dmSans }}
      >
        Log more workouts to unlock chart data
      </div>
    );
  }

  const last = chartData[chartData.length - 1];
  const strokeColor = last.up ? CHART_UP : CHART_DOWN;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity={0.25} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(66,116,185,0.08)" vertical={false} />
        <XAxis dataKey="date" tick={{ fill: "#8494A7", fontSize: 10 }} axisLine={false} tickLine={false} />
        <YAxis
          yAxisId="main"
          domain={yDomain ?? ["auto", "auto"]}
          tick={{ fill: "#8494A7", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={32}
        />
        {showVolume && (
          <YAxis yAxisId="vol" orientation="right" hide domain={[0, "auto"]} />
        )}
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.[0]) return null;
            const row = payload[0].payload as typeof chartData[0];
            return (
              <div
                className="rounded-lg border px-3 py-2 text-xs shadow-lg"
                style={{ background: "rgba(11,17,32,0.92)", borderColor: "rgba(66,116,185,0.25)", ...dmSans }}
              >
                <p className="text-[#8494A7]">{row.date}</p>
                <p className="text-white font-bold">{label}</p>
                <p className="text-[#8494A7]">O {Math.round(row.open * 10) / 10} · C {Math.round(row.close * 10) / 10}</p>
                <p style={{ color: deltaColor(row.delta) }}>{formatDelta(row.delta)}</p>
              </div>
            );
          }}
        />
        {showVolume && (
          <Bar yAxisId="vol" dataKey="volume" barSize={6} radius={[2, 2, 0, 0]} opacity={0.35}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.up ? CHART_UP : CHART_DOWN} />
            ))}
          </Bar>
        )}
        <Line
          yAxisId="main"
          type="monotone"
          dataKey="close"
          stroke={strokeColor}
          strokeWidth={2}
          dot={{ r: 2, fill: strokeColor }}
          isAnimationActive
          animationDuration={900}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}