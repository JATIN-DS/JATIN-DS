import type { RegressionResult } from "@/types";

/**
 * Simple ordinary-least-squares linear regression. (FR-404)
 * Input: array of [x, y] pairs. Returns slope + intercept.
 * Pure + isomorphic — safe to import on client or server.
 */
export function linearRegression(points: Array<[number, number]>): RegressionResult {
  const n = points.length;
  if (n === 0) return { slope: 0, intercept: 0, n: 0 };

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (const [x, y] of points) {
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) {
    return { slope: 0, intercept: sumY / n, n };
  }

  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept, n };
}

/** Convert "HH:MM" (24h) into minutes-since-midnight. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Round minutes-since-midnight to the nearest quarter hour (…0, 15, 30, 45). */
export function roundToQuarterHour(mins: number): number {
  return Math.round(mins / 15) * 15;
}

/** Convert minutes-since-midnight back into "HH:MM" (24h). */
export function minutesToTime(mins: number): string {
  const clamped = Math.max(0, Math.round(mins));
  const h = Math.floor(clamped / 60) % 24;
  const m = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Format "HH:MM" (24h) into 12-hour "h:MM AM/PM". */
export function formatTime12h(time: string): string {
  const [hRaw, mRaw] = time.split(":").map(Number);
  const h = hRaw ?? 0;
  const m = mRaw ?? 0;
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}
