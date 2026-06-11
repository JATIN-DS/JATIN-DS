"use client";

import type { DayOfWeek } from "@/types";
import { DAY_ABBR } from "@/types";
import { ALL_DAYS_COLOR, DAY_COLORS } from "@/lib/dayColors";

/** "all" = combined average across every day; otherwise the chosen days. */
export type DaySelection = "all" | DayOfWeek[];

interface ChartDaySelectorProps {
  days: DayOfWeek[];
  selection: DaySelection;
  onChange: (next: DaySelection) => void;
}

export default function ChartDaySelector({ days, selection, onChange }: ChartDaySelectorProps) {
  if (days.length === 0) return null;

  const isAll = selection === "all";
  const selectedDay = isAll ? null : selection[0] ?? null;

  const selectDay = (day: DayOfWeek) => {
    // Single-select: tapping the active day clears back to "All days".
    onChange(selectedDay === day ? "all" : [day]);
  };

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Choose days to display">
      <button
        type="button"
        aria-pressed={isAll}
        onClick={() => onChange("all")}
        className="rounded-full border px-3 py-1 text-sm font-medium transition-colors"
        style={
          isAll
            ? { backgroundColor: ALL_DAYS_COLOR, borderColor: ALL_DAYS_COLOR, color: "#ffffff" }
            : { backgroundColor: "transparent", borderColor: "#D1D5DB", color: "#6B7280" }
        }
      >
        All days (avg)
      </button>

      <span aria-hidden className="mx-1 h-5 w-px bg-gray-200" />

      {days.map((day) => {
        const active = selectedDay === day;
        const color = DAY_COLORS[day];
        return (
          <button
            key={day}
            type="button"
            aria-pressed={active}
            onClick={() => selectDay(day)}
            className="rounded-full border px-3 py-1 text-sm font-medium transition-colors"
            style={
              active
                ? { backgroundColor: color, borderColor: color, color: "#ffffff" }
                : { backgroundColor: "transparent", borderColor: "#D1D5DB", color: "#6B7280" }
            }
          >
            {DAY_ABBR[day]}
          </button>
        );
      })}
    </div>
  );
}
