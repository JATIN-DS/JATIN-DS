// ============================================================================
// Realistic sample-data generator (isomorphic: usable on server and client).
// Produces LogEntry[] tagged `sample: true` so it can be removed selectively
// without affecting real collected data. Honors the route's selected days,
// time windows, cadence, and (when enabled) the return direction.
// ============================================================================
import type { DayOfWeek, Direction, LogEntry, Route } from "@/types";

const DAY_INDEX: Record<DayOfWeek, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

function dayFromIndex(idx: number): DayOfWeek {
  return (Object.keys(DAY_INDEX) as DayOfWeek[]).find((k) => DAY_INDEX[k] === idx) as DayOfWeek;
}

function hhmm(totalMin: number): string {
  const h = String(Math.floor(totalMin / 60)).padStart(2, "0");
  const m = String(totalMin % 60).padStart(2, "0");
  return `${h}:${m}`;
}

/**
 * Build entries for a single direction across `days` days.
 * The travel-time model layers: a free-flow base, a congestion bump that peaks
 * mid-window, a per-weekday bias, a mild long-term upward trend (so the trend
 * line is visible), and random noise — all clamped to stay realistic.
 */
function generateDirectionEntries(
  route: Route,
  direction: Direction,
  fromTime: string,
  untilTime: string,
  peakMinute: number,
  days: number
): LogEntry[] {
  const entries: LogEntry[] = [];
  const [fromH, fromM] = fromTime.split(":").map(Number);
  const [toH, toM] = untilTime.split(":").map(Number);
  const startMin = fromH * 60 + fromM;
  const endMin = Math.max(startMin + 60, toH * 60 + toM);
  const step = route.cadenceMinutes;

  const origin = direction === "outbound" ? route.startLocation : route.endLocation;
  const destination = direction === "outbound" ? route.endLocation : route.startLocation;

  // Two-wheelers are less affected by congestion than cars.
  const congestionScale = route.mode === "two-wheeler" ? 0.6 : 1;
  const baseSec = (route.mode === "two-wheeler" ? 18 : 22) * 60;

  const now = new Date();
  for (let d = days; d >= 1; d--) {
    const date = new Date(now.getTime() - d * 864e5);
    const dow = dayFromIndex(date.getDay());
    if (!route.selectedDays.includes(dow)) continue;

    // Older days a touch faster; recent days slightly worse → gentle trend.
    const trendSec = (1 - d / days) * 5 * 60;

    for (let t = startMin; t <= endMin; t += step) {
      const congestion = Math.max(0, 1 - Math.abs(t - peakMinute) / 120) * 26 * 60 * congestionScale;
      const dayBias = (DAY_INDEX[dow] % 3) * 90;
      const noise = (Math.random() - 0.5) * 6 * 60;
      const seconds = Math.max(
        5 * 60,
        Math.round(baseSec + congestion + dayBias + trendSec + noise)
      );
      const distanceMeters = 12400 + Math.round((Math.random() - 0.5) * 400);
      const ts = new Date(date);
      ts.setHours(Math.floor(t / 60), t % 60, 0, 0);

      entries.push({
        id: crypto.randomUUID(),
        routeId: route.id,
        direction,
        timestamp: ts.toISOString(),
        dayOfWeek: dow,
        departureTime: hhmm(t),
        durationInTraffic: seconds,
        durationInTrafficDisplay: `${Math.round(seconds / 60)} mins`,
        distanceMeters,
        distanceDisplay: `${(distanceMeters / 1000).toFixed(1)} km`,
        startLocation: origin || "Start",
        endLocation: destination || "Destination",
        mode: route.mode,
        sample: true,
      });
    }
  }
  return entries;
}

/** Generate realistic sample data for a route across the last `days` days. */
export function generateSampleEntries(route: Route, days = 90): LogEntry[] {
  const outbound = generateDirectionEntries(
    route,
    "outbound",
    route.checkFrom,
    route.checkUntil,
    9 * 60 + 15,
    days
  );
  const ret = route.returnEnabled
    ? generateDirectionEntries(
        route,
        "return",
        route.returnCheckFrom,
        route.returnCheckUntil,
        18 * 60 + 30,
        days
      )
    : [];
  return [...outbound, ...ret];
}
