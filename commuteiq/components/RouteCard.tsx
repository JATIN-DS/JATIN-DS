"use client";

import Link from "next/link";
import type { DayOfWeek, Route } from "@/types";
import { ALL_DAYS, DAY_ABBR } from "@/types";
import { formatTime12h } from "@/lib/regression";

interface RouteCardProps {
  route: Route;
  onDelete: (id: string) => void;
}

const MODE_LABEL: Record<Route["mode"], string> = {
  car: "🚗 Car",
  "two-wheeler": "🏍️ Two-Wheeler",
};

/** Summarize selected days as a contiguous range ("Mon–Fri") or a comma list. */
function summarizeDays(days: DayOfWeek[]): string {
  if (days.length === 0) return "No days";
  if (days.length === 7) return "Every day";

  const ordered = ALL_DAYS.filter((d) => days.includes(d));
  const indices = ordered.map((d) => ALL_DAYS.indexOf(d));
  const isContiguous = indices.every(
    (idx, i) => i === 0 || idx === indices[i - 1] + 1
  );

  if (isContiguous && ordered.length > 2) {
    return `${DAY_ABBR[ordered[0]]}–${DAY_ABBR[ordered[ordered.length - 1]]}`;
  }
  return ordered.map((d) => DAY_ABBR[d]).join(", ");
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">
      {children}
    </span>
  );
}

export default function RouteCard({ route, onDelete }: RouteCardProps) {
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDelete(route.id);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <div className="group flex flex-col overflow-hidden rounded-card bg-white shadow-card transition-shadow hover:shadow-lg">
      <Link
        href={`/route/${route.id}`}
        className="flex flex-1 flex-col gap-4 p-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 sm:p-6"
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-base font-bold text-gray-900 sm:text-lg">{route.name}</h3>
          <span
            className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
              route.schedulerActive
                ? "bg-brand-accent/10 text-brand-accent"
                : "bg-gray-100 text-gray-500"
            }`}
          >
            {route.schedulerActive ? "🟢 Active" : "⏸ Paused"}
          </span>
        </div>

        <div className="space-y-2">
          <p className="truncate text-sm text-gray-500">
            <span className="font-medium text-gray-700">{route.startLocation}</span>
            <span className="mx-1 text-gray-400">→</span>
            <span className="font-medium text-gray-700">{route.endLocation}</span>
          </p>
          {route.returnEnabled && (
            <span className="inline-flex items-center gap-1 rounded-full bg-brand-primary/10 px-2 py-0.5 text-[11px] font-semibold text-brand-primary">
              ↔ return tracked
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Chip>{MODE_LABEL[route.mode]}</Chip>
          <Chip>📅 {summarizeDays(route.selectedDays)}</Chip>
          <Chip>
            → {formatTime12h(route.checkFrom)}–{formatTime12h(route.checkUntil)}
          </Chip>
          {route.returnEnabled && (
            <Chip>
              ← {formatTime12h(route.returnCheckFrom)}–{formatTime12h(route.returnCheckUntil)}
            </Chip>
          )}
        </div>
      </Link>

      <div className="flex items-center justify-end gap-1 border-t border-gray-100 px-5 py-3 sm:px-6">
        <Link
          href={`/settings?id=${route.id}`}
          onClick={handleEdit}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
        >
          Edit
        </Link>
        <button
          type="button"
          onClick={handleDelete}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-brand-error transition-colors hover:bg-brand-error/10"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
