"use client";

import { useMemo, useState } from "react";
import type { DayOfWeek, LogEntry } from "@/types";
import { ALL_DAYS } from "@/types";
import { formatTime12h, timeToMinutes } from "@/lib/regression";

type SortKey = "date" | "day" | "departure" | "travel" | "distance";
type SortDir = "asc" | "desc";

interface DataLogTableProps {
  entries: LogEntry[];
  onExport?: () => void;
  onClear?: () => void;
  /** Optional heading shown on the left of the header row (e.g. a day name). */
  title?: string;
  /** Show the Export/Clear toolbar buttons. Defaults to true. */
  showToolbar?: boolean;
}

const COLUMNS: ReadonlyArray<{ key: SortKey; label: string }> = [
  { key: "date", label: "Date" },
  { key: "day", label: "Day" },
  { key: "departure", label: "Departure Time" },
  { key: "travel", label: "Travel Time" },
  { key: "distance", label: "Distance" },
];

const DAY_INDEX: Record<DayOfWeek, number> = ALL_DAYS.reduce(
  (acc, day, i) => {
    acc[day] = i;
    return acc;
  },
  {} as Record<DayOfWeek, number>
);

function sortValue(entry: LogEntry, key: SortKey): number | string {
  switch (key) {
    case "date":
      return entry.timestamp;
    case "day":
      return DAY_INDEX[entry.dayOfWeek];
    case "departure":
      return timeToMinutes(entry.departureTime);
    case "travel":
      return entry.durationInTraffic;
    case "distance":
      return entry.distanceMeters;
  }
}

export default function DataLogTable({
  entries,
  onExport,
  onClear,
  title,
  showToolbar = true,
}: DataLogTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    const copy = [...entries];
    copy.sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      let cmp: number;
      if (typeof av === "number" && typeof bv === "number") {
        cmp = av - bv;
      } else {
        cmp = String(av).localeCompare(String(bv));
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [entries, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div className="rounded-card bg-white shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 sm:px-5">
        <div className="flex items-baseline gap-2">
          {title ? <h3 className="text-sm font-semibold text-gray-900">{title}</h3> : null}
          <p className="text-sm text-gray-500">
            {entries.length} {entries.length === 1 ? "entry" : "entries"}
          </p>
        </div>
        {showToolbar && (onExport || onClear) ? (
          <div className="flex flex-wrap gap-2">
            {onExport ? (
              <button
                type="button"
                onClick={onExport}
                disabled={entries.length === 0}
                className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ⬇️ Export as CSV
              </button>
            ) : null}
            {onClear ? (
              <button
                type="button"
                onClick={onClear}
                disabled={entries.length === 0}
                className="inline-flex items-center gap-1.5 rounded-md border border-brand-error/30 bg-white px-3 py-1.5 text-sm font-medium text-brand-error transition-colors hover:bg-brand-error/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                🗑️ Clear all data
              </button>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
              {COLUMNS.map((col) => {
                const active = col.key === sortKey;
                return (
                  <th key={col.key} scope="col" className="px-4 py-3 font-medium sm:px-5">
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className={`inline-flex items-center gap-1 transition-colors hover:text-gray-900 ${
                        active ? "text-gray-900" : ""
                      }`}
                      aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                    >
                      {col.label}
                      <span aria-hidden className="text-[10px]">
                        {active ? (sortDir === "asc" ? "▲" : "▼") : "↕"}
                      </span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length} className="px-4 py-10 text-center text-gray-500 sm:px-5">
                  No entries yet.
                </td>
              </tr>
            ) : (
              sorted.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-gray-50 text-gray-700 last:border-0 hover:bg-gray-50"
                >
                  <td className="px-4 py-3 sm:px-5">{entry.timestamp.slice(0, 10)}</td>
                  <td className="px-4 py-3 sm:px-5">{entry.dayOfWeek}</td>
                  <td className="px-4 py-3 sm:px-5">{formatTime12h(entry.departureTime)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900 sm:px-5">
                    {entry.durationInTrafficDisplay}
                  </td>
                  <td className="px-4 py-3 sm:px-5">{entry.distanceDisplay}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
