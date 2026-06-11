"use client";

import type { TransitMode } from "@/types";

interface ModeToggleProps {
  value: TransitMode;
  onChange: (m: TransitMode) => void;
}

const OPTIONS: ReadonlyArray<{ mode: TransitMode; label: string }> = [
  { mode: "car", label: "🚗 Car" },
  { mode: "two-wheeler", label: "🏍️ Two-Wheeler" },
];

export default function ModeToggle({ value, onChange }: ModeToggleProps) {
  return (
    <section className="rounded-card bg-white p-5 shadow-card sm:p-6">
      <h2 className="text-base font-semibold text-gray-900">
        Mode of Transport
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        How do you make this trip?
      </p>

      <div
        role="radiogroup"
        aria-label="Mode of Transport"
        className="mt-4 grid grid-cols-2 gap-2 rounded-lg bg-gray-100 p-1"
      >
        {OPTIONS.map(({ mode, label }) => {
          const selected = value === mode;
          return (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-pressed={selected}
              onClick={() => onChange(mode)}
              className={`rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
                selected
                  ? "bg-brand-primary text-white shadow-sm"
                  : "bg-transparent text-gray-600 hover:bg-white/60"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
