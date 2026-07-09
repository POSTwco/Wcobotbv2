/**
 * True OHLC-style candlesticks (green up / red down body + wick).
 * Open = previous period close, close = current value — real sparkline data only.
 */

import { useMemo } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Customized,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
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

type CandleRow = {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  delta: number;
  up: boolean;
};

function buildCandles(
  data: StatsSparkPoint[],
  metric: "athleteScore" | "movementIndex" | "volume",
): CandleRow[] {
  return data.map((p, i) => {
    const prev = i > 0 ? data[i - 1][metric] : p[metric];
    const close = Number(p[metric]) || 0;
    const open = Number(prev) || 0;
    const span = Math.abs(close - open);
    // Wick so doji / flat days still look like sticks
    const wickPad = Math.max(span * 0.18, 0.4);
    const high = Math.max(open, close) + wickPad;
    const low = Math.max(0, Math.min(open, close) - wickPad * 0.55);
    const delta = open > 0 ? ((close - open) / open) * 100 : close !== open ? (close > open ? 100 : -100) : 0;
    return {
      date: p.dateKey.slice(5),
      open,
      close,
      high,
      low,
      volume: p.volume ?? 0,
      delta,
      up: close >= open,
    };
  });
}

type AxisScale = {
  scale: ((v: string | number) => number) & { bandwidth?: () => number };
};

function CandleLayer(props: {
  candles: CandleRow[];
  xAxisMap?: Record<string, AxisScale>;
  yAxisMap?: Record<string, AxisScale>;
  offset?: { left: number; top: number; width: number; height: number };
}) {
  const { candles, xAxisMap, yAxisMap, offset } = props;
  if (!xAxisMap || !yAxisMap || !offset || candles.length === 0) return null;

  const xAxis = Object.values(xAxisMap)[0];
  // Prefer left/main axis (first numeric scale)
  const yAxes = Object.values(yAxisMap).filter((a) => a && typeof a.scale === "function");
  const yAxis = yAxes[0];
  if (!xAxis?.scale || !yAxis?.scale) return null;

  const n = candles.length;
  const band =
    typeof xAxis.scale.bandwidth === "function"
      ? xAxis.scale.bandwidth()
      : Math.max(10, (offset.width || 240) / Math.max(n, 1));
  const bodyW = Math.max(5, Math.min(16, band * 0.58));
  const yScale = yAxis.scale;

  return (
    <g className="recharts-layer recharts-candlesticks" style={{ pointerEvents: "none" }}>
      {candles.map((c, i) => {
        const x0 = xAxis.scale(c.date);
        if (x0 == null || Number.isNaN(Number(x0))) return null;
        const cx = Number(x0) + band / 2;
        const yHigh = yScale(c.high);
        const yLow = yScale(c.low);
        const yOpen = yScale(c.open);
        const yClose = yScale(c.close);
        if ([yHigh, yLow, yOpen, yClose].some((v) => v == null || Number.isNaN(Number(v)))) return null;

        const bodyTop = Math.min(yOpen, yClose);
        const bodyBot = Math.max(yOpen, yClose);
        const bodyH = Math.max(bodyBot - bodyTop, 2.5);
        const color = c.up ? CHART_UP : CHART_DOWN;
        const bx = cx - bodyW / 2;

        return (
          <g key={`${c.date}-${i}`}>
            {/* High–low wick */}
            <line
              x1={cx}
              y1={yHigh}
              x2={cx}
              y2={yLow}
              stroke={color}
              strokeWidth={1.35}
              strokeLinecap="round"
            />
            {/* Body: solid green up, filled red down */}
            <rect
              x={bx}
              y={bodyTop}
              width={bodyW}
              height={bodyH}
              fill={c.up ? color : `${CHART_DOWN}E6`}
              stroke={color}
              strokeWidth={1.15}
              rx={1.25}
              ry={1.25}
            />
          </g>
        );
      })}
    </g>
  );
}

export function CaliCandleChart({
  data,
  metric = "athleteScore",
  label = "Athlete Index",
  height = 260,
  showVolume = true,
  yDomain,
}: CaliCandleChartProps) {
  const chartData = useMemo(() => buildCandles(data, metric), [data, metric]);

  /** Zoom domain so small day-to-day moves show as real candle bodies (not a hair on 0–100). */
  const domain = useMemo((): [number, number] => {
    const lows = chartData.map((d) => d.low);
    const highs = chartData.map((d) => d.high);
    let minV = Math.min(...lows);
    let maxV = Math.max(...highs);
    const span = Math.max(maxV - minV, 0.01);
    const pad = Math.max(span * 0.2, 1.25);
    minV -= pad;
    maxV += pad;
    if (yDomain) {
      minV = Math.max(yDomain[0], minV);
      maxV = Math.min(yDomain[1], maxV);
      // Flat series on fixed 0–100: focus a window around the value
      if (maxV - minV < 5) {
        const mid = (Math.min(...lows) + Math.max(...highs)) / 2;
        minV = Math.max(yDomain[0], mid - 8);
        maxV = Math.min(yDomain[1], mid + 8);
      }
    } else {
      minV = Math.max(0, minV);
    }
    if (maxV <= minV) maxV = minV + 4;
    return [minV, maxV];
  }, [chartData, yDomain]);

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
      <ComposedChart data={chartData} margin={{ top: 10, right: 6, left: -10, bottom: 0 }}>
        <CartesianGrid stroke="rgba(66,116,185,0.08)" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fill: "#8494A7", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
          padding={{ left: 8, right: 8 }}
        />
        <YAxis
          yAxisId="main"
          domain={domain}
          tick={{ fill: "#8494A7", fontSize: 10 }}
          axisLine={false}
          tickLine={false}
          width={34}
          tickFormatter={(v) =>
            Math.abs(v) >= 10 ? String(Math.round(v)) : String(Math.round(Number(v) * 10) / 10)
          }
        />
        {showVolume && <YAxis yAxisId="vol" orientation="right" hide domain={[0, "auto"]} />}
        <Tooltip
          cursor={{ stroke: "rgba(212,168,67,0.22)", strokeWidth: 1, strokeDasharray: "3 3" }}
          content={({ active, payload }) => {
            if (!active || !payload?.[0]) return null;
            const row = payload[0].payload as CandleRow;
            return (
              <div
                className="rounded-lg border px-3 py-2 text-xs shadow-lg"
                style={{ background: "rgba(11,17,32,0.96)", borderColor: "rgba(66,116,185,0.3)", ...dmSans }}
              >
                <p className="text-[#8494A7] mb-0.5">{row.date}</p>
                <p className="text-white font-bold mb-1">{label}</p>
                <p className="text-[#8494A7] tabular-nums">
                  O {Math.round(row.open * 10) / 10}
                  {"  H "}
                  {Math.round(row.high * 10) / 10}
                  {"  L "}
                  {Math.round(row.low * 10) / 10}
                  {"  C "}
                  {Math.round(row.close * 10) / 10}
                </p>
                <p style={{ color: deltaColor(row.delta) }} className="font-semibold mt-0.5">
                  {row.up ? "▲" : "▼"} {formatDelta(row.delta)}
                </p>
              </div>
            );
          }}
        />
        {showVolume && (
          <Bar yAxisId="vol" dataKey="volume" barSize={5} radius={[2, 2, 0, 0]} opacity={0.2} isAnimationActive={false}>
            {chartData.map((entry, i) => (
              <Cell key={i} fill={entry.up ? CHART_UP : CHART_DOWN} />
            ))}
          </Bar>
        )}
        {/* Transparent line carries tooltip / hover without drawing over candles */}
        <Line
          yAxisId="main"
          type="monotone"
          dataKey="close"
          stroke="transparent"
          strokeWidth={18}
          dot={false}
          activeDot={{ r: 3.5, fill: "#D4A843", stroke: "#0B1120", strokeWidth: 1 }}
          isAnimationActive={false}
          legendType="none"
        />
        <Customized component={(p: object) => <CandleLayer {...(p as object)} candles={chartData} />} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
