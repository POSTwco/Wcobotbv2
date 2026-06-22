import { useId } from "react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { CHART_DOWN, CHART_UP } from "../../lib/cali-analytics-types";

interface CaliStatsSparklineProps {
  data: number[];
  color?: string;
  height?: number;
  bicolor?: boolean;
}

export function CaliStatsSparkline({
  data,
  color = "#4274B9",
  height = 32,
  bicolor = false,
}: CaliStatsSparklineProps) {
  const gradId = useId().replace(/:/g, "");
  const chartData = data.map((value, i) => {
    const prev = i > 0 ? data[i - 1] : value;
    return { i, value, up: value >= prev };
  });

  const last = chartData[chartData.length - 1];
  const stroke = bicolor ? (last?.up ? CHART_UP : CHART_DOWN) : color;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.4} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={stroke}
          strokeWidth={1.5}
          fill={`url(#${gradId})`}
          dot={false}
          isAnimationActive
          animationDuration={800}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}