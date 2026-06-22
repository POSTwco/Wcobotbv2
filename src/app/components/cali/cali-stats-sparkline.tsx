import { Area, AreaChart, ResponsiveContainer } from "recharts";

interface CaliStatsSparklineProps {
  data: number[];
  color?: string;
  height?: number;
}

export function CaliStatsSparkline({ data, color = "#4274B9", height = 32 }: CaliStatsSparklineProps) {
  const chartData = data.map((value, i) => ({ i, value }));
  const gradId = `spark-${color.replace("#", "")}`;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={chartData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
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