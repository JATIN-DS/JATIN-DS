"use client";

import { useMemo } from "react";
import { formatTime12h, minutesToTime } from "@/lib/regression";

interface TimeWindowPickerProps {
  checkFrom: string;
  checkUntil: string;
  onFromChange: (v: string) => void;
  onUntilChange: (v: string) => void;
  error?: string;
}

export default function TimeWindowPicker({
  checkFrom,
  checkUntil,
  onFromChange,
  onUntilChange,
  error,
}: TimeWindowPickerProps) {
  const options = useMemo(() => {
    const slots: Array<{ value: string; label: string }> = [];
    for (let mins = 0; mins < 24 * 60; mins += 15) {
      const value = minutesToTime(mins);
      slots.push({ value, label: formatTime12h(value) });
    }
    return slots;
  }, []);

  const selectClass =
    "w-full appearance-none rounded-lg border bg-white px-3 py-2.5 text-sm text-gray-900 transition-colors focus:border-brand-primary";

  return (
    <section className="rounded-card bg-white p-5 shadow-card sm:p-6">
      <h2 className="text-base font-semibold text-gray-900">Time Window</h2>
      <p className="mt-1 text-sm text-gray-500">
        The daily window we&apos;ll sample for traffic.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label
            htmlFor="time-from"
            className="mb-1.5 block text-sm font-medium text-gray-900"
          >
            Check From
          </label>
          <select
            id="time-from"
            value={checkFrom}
            onChange={(e) => onFromChange(e.target.value)}
            aria-invalid={error ? true : undefined}
            className={`${selectClass} ${
              error ? "border-brand-error" : "border-gray-300"
            }`}
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="time-until"
            className="mb-1.5 block text-sm font-medium text-gray-900"
          >
            Check Until
          </label>
          <select
            id="time-until"
            value={checkUntil}
            onChange={(e) => onUntilChange(e.target.value)}
            aria-invalid={error ? true : undefined}
            className={`${selectClass} ${
              error ? "border-brand-error" : "border-gray-300"
            }`}
          >
            {options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <p className="mt-3 text-sm text-brand-error" role="alert">
          {error}
        </p>
      ) : null}
    </section>
  );
}
