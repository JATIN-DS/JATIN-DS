"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from "recharts";
import type { DayOfWeek, LogEntry } from "@/types";
import {
  linearRegression,
  minutesToTime,
  formatTime12h,
  roundToQuarterHour,
  timeToMinutes,
} from "@/lib/regression";
import { ALL_DAYS_COLOR, DAY_COLORS } from "@/lib/dayColors";
import type { DaySelection } from "@/components/ChartDaySelector";

const TREND_MIN_POINTS = 5;
const ALL_DAYS_KEY = "__all__";
const HIGHLIGHT_COLOR = "#16A34A";

interface TimeSeriesChartProps {
  entries: LogEntry[];
  selection: DaySelection;
  /** Departure slots whose avg travel time is at/under this (min) get a green ring. */
  threshold: number;
}

interface ChartPoint {
  x: number;
  y: number;
  label: string;
  departureTime: string;
  samples: number;
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload as ChartPoint | undefined;
  if (!point) return null;
  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-xs shadow-card">
      <p className="font-semibold text-gray-900">
        {point.label}, {formatTime12h(point.departureTime)}
      </p>
      <p className="text-gray-500">
        avg {point.y} minute{point.y === 1 ? "" : "s"}
      </p>
      <p className="text-gray-400">
        across {point.samples} trip{point.samples === 1 ? "" : "s"}
      </p>
    </div>
  );
}

interface DotShapeProps {
  cx?: number;
  cy?: number;
  fill?: string;
  payload?: ChartPoint;
}

/** Renders each data point; slots at/under the threshold get a larger green ring. */
function makeDotShape(threshold: number) {
  return function DotShape({ cx, cy, fill, payload }: DotShapeProps) {
    if (cx == null || cy == null) return <g />;
    const highlight = payload != null && payload.y <= threshold;
    return (
      <g>
        {highlight && (
          <circle
            cx={cx}
            cy={cy}
            r={12}
            fill={HIGHLIGHT_COLOR}
            fillOpacity={0.18}
            stroke={HIGHLIGHT_COLOR}
            strokeWidth={2}
          />
        )}
        <circle cx={cx} cy={cy} r={4} fill={fill ?? "#2563EB"} />
      </g>
    );
  };
}

/** Average entries that fall in the same 15-min slot into one point per slot. */
function aggregateBySlot(entries: LogEntry[], label: string): ChartPoint[] {
  const bySlot = new Map<number, number[]>();
  for (const e of entries) {
    const slot = roundToQuarterHour(timeToMinutes(e.departureTime));
    const arr = bySlot.get(slot) ?? [];
    arr.push(e.durationInTraffic);
    bySlot.set(slot, arr);
  }
  const points: ChartPoint[] = [];
  for (const [slot, durations] of bySlot.entries()) {
    const meanSec = durations.reduce((a, b) => a + b, 0) / durations.length;
    points.push({
      x: slot,
      y: Math.round(meanSec / 60),
      label,
      departureTime: minutesToTime(slot),
      samples: durations.length,
    });
  }
  points.sort((a, b) => a.x - b.x);
  return points;
}

export default function TimeSeriesChart({ entries, selection, threshold }: TimeSeriesChartProps) {
  // Build one series per selected key. "all" → a single averaged line across
  // every day; otherwise one line per chosen day. Every point is snapped to a
  // 15-minute slot so points land on the 9:00 / 9:15 / 9:30 grid.
  const series = useMemo(() => {
    const map = new Map<string, ChartPoint[]>();
    if (selection === "all") {
      map.set(ALL_DAYS_KEY, aggregateBySlot(entries, "All days"));
    } else {
      for (const day of selection) {
        map.set(
          day,
          aggregateBySlot(
            entries.filter((e) => e.dayOfWeek === day),
            day
          )
        );
      }
    }
    return map;
  }, [entries, selection]);

  const allPoints = useMemo(() => Array.from(series.values()).flat(), [series]);

  // 15-minute tick grid spanning the data (coarser steps for very wide windows).
  const { ticks, domain } = useMemo(() => {
    if (allPoints.length === 0) return { ticks: [] as number[], domain: [0, 0] as [number, number] };
    const xs = allPoints.map((p) => p.x);
    const start = Math.floor(Math.min(...xs) / 15) * 15;
    const end = Math.ceil(Math.max(...xs) / 15) * 15;
    const span = end - start;
    const step = span <= 180 ? 15 : span <= 360 ? 30 : 60;
    const t: number[] = [];
    for (let v = start; v <= end; v += step) t.push(v);
    return { ticks: t, domain: [start, end] as [number, number] };
  }, [allPoints]);

  const trend = useMemo(() => {
    if (allPoints.length < TREND_MIN_POINTS) return null;
    const reg = linearRegression(allPoints.map((p) => [p.x, p.y] as [number, number]));
    const xs = allPoints.map((p) => p.x);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const data = [
      { x: minX, y: reg.slope * minX + reg.intercept },
      { x: maxX, y: reg.slope * maxX + reg.intercept },
    ];
    const deltaOverWindow = reg.slope * (maxX - minX);
    let summary: string;
    if (deltaOverWindow > 2) {
      summary = "Traffic appears to worsen later in the window.";
    } else if (deltaOverWindow < -2) {
      summary = "Traffic improves later in the window.";
    } else {
      summary = "Traffic is fairly steady across your window.";
    }
    return { data, summary };
  }, [allPoints]);

  if (allPoints.length < 1) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg bg-gray-50 text-sm text-gray-500">
        Not enough data to chart yet.
      </div>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={360}>
        <ScatterChart margin={{ top: 10, right: 16, bottom: 24, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
          <XAxis
            type="number"
            dataKey="x"
            name="Departure time"
            domain={domain}
            ticks={ticks}
            interval={0}
            tickFormatter={(value: number) => formatTime12h(minutesToTime(value))}
            tick={{ fontSize: 11, fill: "#6B7280" }}
            angle={-30}
            textAnchor="end"
            height={48}
            label={{
              value: "Departure time",
              position: "insideBottom",
              offset: -14,
              fontSize: 12,
              fill: "#6B7280",
            }}
          />
          <YAxis
            type="number"
            dataKey="y"
            name="Travel time"
            unit=" min"
            tick={{ fontSize: 12, fill: "#6B7280" }}
            width={56}
            label={{
              value: "Travel (min)",
              angle: -90,
              position: "insideLeft",
              fontSize: 12,
              fill: "#6B7280",
            }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3" }} />
          {Array.from(series.entries()).map(([key, data]) => {
            if (data.length === 0) return null;
            const color = key === ALL_DAYS_KEY ? ALL_DAYS_COLOR : DAY_COLORS[key as DayOfWeek];
            return (
              <Scatter
                key={key}
                name={key === ALL_DAYS_KEY ? "All days" : key}
                data={data}
                fill={color}
                line={{ stroke: color, strokeWidth: 2 }}
                lineType="joint"
                shape={makeDotShape(threshold)}
                isAnimationActive={false}
              />
            );
          })}
        </ScatterChart>
      </ResponsiveContainer>

      <div className="mt-3 flex flex-col gap-1">
        {trend && <p className="text-sm text-gray-600">{trend.summary}</p>}
        <p className="flex items-center gap-1.5 text-xs text-gray-500">
          <span
            aria-hidden
            className="inline-block h-3 w-3 rounded-full border-2"
            style={{ borderColor: HIGHLIGHT_COLOR, backgroundColor: "rgba(22,163,74,0.18)" }}
          />
          Green ring = departure at or under your {threshold}-minute target.
        </p>
      </div>
    </div>
  );
}
