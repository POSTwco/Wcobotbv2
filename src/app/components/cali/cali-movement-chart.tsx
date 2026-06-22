import { useMemo } from "react";
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { StatsSparkPoint } from "../../lib/cali-analytics-types";
import { deltaColor, formatDelta } from "../../lib/cali-analytics-types";

const dmSans: React.CSSProperties = { fontFamily: "'DM Sans', sans-serif" };

interface CaliMovementChartProps {
  data: StatsSparkPoint[];
  metric?: "athleteScore" | "movementIndex" | "volume";
  label?: string;
  color?: string;
  height?: number;
}

export function CaliMovementChart({
  data,
  metric = "athleteScore",
  label = "Athlete Index",
  color = "#4274B9",
  height = 220,
}: CaliMovementChartProps) {
  const chartData = useMemo(() => {
    return data.map((p, i) => {
      const prev = i > 0 ? data[i - 1][metric] : p[metric];
      const delta = prev > 0 ? ((p[metric] - prev) / prev) * 100 : 0;
      return {
        date: p.dateKey.slice(5),
        value: p[metric],
        delta,
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

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="movGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="rgba(66,116,185,0.08)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: "#8494A7", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: "#8494A7", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={32}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload?.[0]) return null;
            const row = payload[0].payload as { date: string; value: number; delta: number };
            return (
              <div
                className="rounded-lg border px-3 py-2 text-xs shadow-lg"
                style={{ background: "#0B1120", borderColor: "rgba(66,116,185,0.25)", ...dmSans }}
              >
                <p className="text-[#8494A7]">{row.date}</p>
                <p className="text-white font-bold">{label}: {Math.round(row.value * 10) / 10}</p>
                <p style={{ color: deltaColor(row.delta) }}>{formatDelta(row.delta)}</p>
              </div>
            );
          }}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill="url(#movGrad)"
          isAnimationActive
          animationDuration={1000}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}