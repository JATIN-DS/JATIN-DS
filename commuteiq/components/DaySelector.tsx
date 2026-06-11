"use client";

import type { DayOfWeek } from "@/types";
import { ALL_DAYS, DAY_ABBR } from "@/types";

interface DaySelectorProps {
  selected: DayOfWeek[];
  onChange: (days: DayOfWeek[]) => void;
  error?: string;
}

const WEEKDAYS: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function DaySelector({ selected, onChange, error }: DaySelectorProps) {
  const toggle = (day: DayOfWeek) => {
    onChange(
      selected.includes(day)
        ? selected.filter((d) => d !== day)
        : [...ALL_DAYS.filter((d) => selected.includes(d) || d === day)]
    );
  };

  const setWeekdays = () => onChange([...WEEKDAYS]);
  const setEveryDay = () => onChange([...ALL_DAYS]);

  return (
    <section className="rounded-card bg-white p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Days to Track</h2>
          <p className="mt-1 text-sm text-gray-500">
            We&apos;ll only sample traffic on the days you commute.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={setWeekdays}
            className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            Weekdays
          </button>
          <button
            type="button"
            onClick={setEveryDay}
            className="rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            Every day
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {ALL_DAYS.map((day) => {
          const active = selected.includes(day);
          return (
            <button
              key={day}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(day)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "border-brand-primary bg-brand-primary text-white"
                  : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {DAY_ABBR[day]}
            </button>
          );
        })}
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </section>
  );
}
