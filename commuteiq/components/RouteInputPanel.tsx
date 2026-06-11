"use client";

import LocationAutocomplete from "@/components/LocationAutocomplete";

interface RouteInputPanelProps {
  name: string;
  startLocation: string;
  endLocation: string;
  onNameChange: (v: string) => void;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  nameError?: string;
  startError?: string;
  endError?: string;
}

export default function RouteInputPanel({
  name,
  startLocation,
  endLocation,
  onNameChange,
  onStartChange,
  onEndChange,
  nameError,
  startError,
  endError,
}: RouteInputPanelProps) {
  return (
    <section className="rounded-card bg-white p-5 shadow-card sm:p-6">
      <h2 className="text-base font-semibold text-gray-900">Route</h2>
      <p className="mt-1 text-sm text-gray-500">
        Name this commute and tell us where it starts and ends.
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <label
            htmlFor="route-name"
            className="mb-1.5 block text-sm font-medium text-gray-900"
          >
            Route name
          </label>
          <input
            id="route-name"
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="e.g., Home → Office"
            aria-invalid={nameError ? true : undefined}
            aria-describedby={nameError ? "route-name-error" : undefined}
            className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 transition-colors focus:outline-none ${
              nameError
                ? "border-brand-error focus:border-brand-error"
                : "border-gray-300 focus:border-brand-primary"
            }`}
          />
          {nameError ? (
            <p id="route-name-error" className="mt-1.5 text-sm text-brand-error">
              {nameError}
            </p>
          ) : null}
        </div>

        <LocationAutocomplete
          id="route-start"
          label="Start Location (Point A)"
          value={startLocation}
          onChange={onStartChange}
          placeholder="e.g., Bandra Station, Mumbai"
          error={startError}
        />

        <LocationAutocomplete
          id="route-end"
          label="End Location (Point B)"
          value={endLocation}
          onChange={onEndChange}
          placeholder="e.g., Lower Parel, Mumbai"
          error={endError}
        />
      </div>
    </section>
  );
}
