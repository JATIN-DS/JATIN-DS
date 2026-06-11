"use client";

import type { CadenceMinutes } from "@/types";

interface CadenceDropdownProps {
  value: CadenceMinutes;
  onChange: (v: CadenceMinutes) => void;
}

const OPTIONS: ReadonlyArray<{ value: CadenceMinutes; label: string }> = [
  { value: 15, label: "Every 15 minutes" },
  { value: 30, label: "Every 30 minutes" },
  { value: 60, label: "Every 60 minutes" },
];

export default function CadenceDropdown({
  value,
  onChange,
}: CadenceDropdownProps) {
  return (
    <section className="rounded-card bg-white p-5 shadow-card sm:p-6">
      <h2 className="text-base font-semibold text-gray-900">Check Frequency</h2>
      <p className="mt-1 text-sm text-gray-500">
        More frequent checks build data faster.
      </p>

      <div className="mt-4">
        <label
          htmlFor="cadence"
          className="mb-1.5 block text-sm font-medium text-gray-900"
        >
          How often should we check?
        </label>
        <select
          id="cadence"
          value={value}
          onChange={(e) =>
            onChange(Number(e.target.value) as CadenceMinutes)
          }
          className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 transition-colors focus:border-brand-primary"
        >
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}
