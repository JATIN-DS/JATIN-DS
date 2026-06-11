"use client";

import { useMemo } from "react";
import type { DateRange, LogEntry } from "@/types";
import { computeRecommendation, RECOMMENDATION_THRESHOLDS } from "@/lib/recommendation";

interface RecommendationCardProps {
  entries: LogEntry[];
  range?: DateRange;
}

export default function RecommendationCard({ entries, range }: RecommendationCardProps) {
  const rec = useMemo(() => computeRecommendation(entries, range), [entries, range]);

  const progress = Math.min(
    100,
    Math.round((rec.dataPoints / RECOMMENDATION_THRESHOLDS.MIN_DATA_POINTS) * 100)
  );

  return (
    <section className="rounded-card border border-brand-accent/30 bg-brand-accent/5 p-5 shadow-card sm:p-6">
      <h2 className="text-base font-semibold text-gray-900">
        🎯 Your Optimal Departure Time
      </h2>

      {rec.ready ? (
        <div className="mt-3">
          <p className="text-lg font-semibold leading-snug text-gray-900 sm:text-xl">
            {rec.summary}
          </p>
          <p className="mt-3 text-xs text-gray-500">
            Calculated from all {rec.dataPoints} data point{rec.dataPoints === 1 ? "" : "s"} collected
            across {rec.distinctSlots} departure time{rec.distinctSlots === 1 ? "" : "s"}.
          </p>
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-sm text-gray-600">
            {rec.progressMessage ?? "Keep collecting data to unlock your recommendation."}
          </p>
          <div
            className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-200"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Data collection progress"
          >
            <div
              className="h-full rounded-full bg-brand-accent transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-gray-500">
            {rec.dataPoints} data point{rec.dataPoints === 1 ? "" : "s"} collected so far
            {rec.dataPoints < RECOMMENDATION_THRESHOLDS.MIN_DATA_POINTS
              ? ` · ${RECOMMENDATION_THRESHOLDS.MIN_DATA_POINTS} needed to unlock`
              : ""}
          </p>
        </div>
      )}
    </section>
  );
}
