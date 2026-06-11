import type { DateRange, LogEntry, Recommendation } from "@/types";
import { formatTime12h } from "@/lib/regression";

const RANGE_WINDOW_DAYS: Partial<Record<DateRange, number>> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

const MIN_DATA_POINTS = 10;
const MIN_DISTINCT_SLOTS = 3;

/**
 * Smart recommendation engine. (FR-406 → FR-409)
 * Pure + isomorphic.
 */
export function computeRecommendation(entries: LogEntry[], range?: DateRange): Recommendation {
  const dataPoints = entries.length;

  // Group by departureTime slot → list of durations (seconds).
  const slots = new Map<string, number[]>();
  for (const e of entries) {
    const arr = slots.get(e.departureTime) ?? [];
    arr.push(e.durationInTraffic);
    slots.set(e.departureTime, arr);
  }
  const distinctSlots = slots.size;

  if (dataPoints < MIN_DATA_POINTS || distinctSlots < MIN_DISTINCT_SLOTS) {
    return {
      ready: false,
      dataPoints,
      distinctSlots,
      progressMessage:
        distinctSlots < MIN_DISTINCT_SLOTS && dataPoints >= MIN_DATA_POINTS
          ? `Collected ${dataPoints} data point${dataPoints === 1 ? "" : "s"} so far, but only across ${distinctSlots} departure time${distinctSlots === 1 ? "" : "s"}. Need at least ${MIN_DISTINCT_SLOTS} different departure times to compare.`
          : `Collected ${dataPoints} data point${dataPoints === 1 ? "" : "s"} so far. Need at least ${MIN_DATA_POINTS} (across ${MIN_DISTINCT_SLOTS}+ departure times) to unlock your recommendation — keep the scheduler running!`,
    };
  }

  // Mean duration per slot.
  let bestSlot = "";
  let bestMean = Infinity;
  let worstSlot = "";
  let worstMean = -Infinity;

  for (const [slot, durations] of slots.entries()) {
    const mean = durations.reduce((a, b) => a + b, 0) / durations.length;
    if (mean < bestMean) {
      bestMean = mean;
      bestSlot = slot;
    }
    if (mean > worstMean) {
      worstMean = mean;
      worstSlot = slot;
    }
  }

  const bestMeanMinutes = Math.round(bestMean / 60);
  const worstMeanMinutes = Math.round(worstMean / 60);
  const savingsMinutes = Math.max(0, worstMeanMinutes - bestMeanMinutes);
  const daysOfData = new Set(entries.map((e) => e.timestamp.slice(0, 10))).size;

  const confidence: Recommendation["confidence"] =
    dataPoints > 50 ? "High" : dataPoints >= 20 ? "Medium" : "Low";

  const windowDays = range ? RANGE_WINDOW_DAYS[range] : undefined;
  const lead = windowDays
    ? `Based on the last ${windowDays} days`
    : `Based on ${daysOfData} day${daysOfData === 1 ? "" : "s"} of data`;

  const summary = `${lead}, leaving at ${formatTime12h(
    bestSlot
  )} typically takes ${bestMeanMinutes} minutes — saving you an average of ${savingsMinutes} minute${
    savingsMinutes === 1 ? "" : "s"
  } compared to leaving at ${formatTime12h(worstSlot)}.`;

  return {
    ready: true,
    dataPoints,
    distinctSlots,
    bestSlot,
    bestMeanMinutes,
    worstSlot,
    worstMeanMinutes,
    savingsMinutes,
    daysOfData,
    confidence,
    summary,
  };
}

export const RECOMMENDATION_THRESHOLDS = {
  MIN_DATA_POINTS,
  MIN_DISTINCT_SLOTS,
};
