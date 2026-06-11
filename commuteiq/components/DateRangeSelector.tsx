"use client";

import type { DateRange } from "@/types";

interface DateRangeSelectorProps {
  value: DateRange;
  onChange: (r: DateRange) => void;
}

const OPTIONS: ReadonlyArray<{ value: DateRange; label: string }> = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

export default function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  return (
    <div
      role="group"
      aria-label="Date range"
      className="inline-flex flex-wrap gap-1 rounded-lg bg-gray-100 p-1"
    >
      {OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(option.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-brand-primary text-white shadow-sm"
                : "text-gray-600 hover:bg-white/70"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
