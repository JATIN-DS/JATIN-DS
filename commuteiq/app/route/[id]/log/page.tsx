"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DayOfWeek, LogEntry, Route } from "@/types";
import { ALL_DAYS } from "@/types";
import { deleteLogs, entriesToCSV, getLogs, getRoute } from "@/lib/store";
import { useToast } from "@/components/ToastProvider";
import DataLogTable from "@/components/DataLogTable";

function download(filename: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function RouteLog({ params }: { params: { id: string } }) {
  const { showToast } = useToast();

  const [route, setRoute] = useState<Route | null>(null);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEntries = useCallback(async () => {
    const { entries: loaded } = await getLogs(params.id, "all");
    setEntries(loaded);
  }, [params.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [loadedRoute, logs] = await Promise.all([
          getRoute(params.id),
          getLogs(params.id, "all"),
        ]);
        if (cancelled) return;
        setRoute(loadedRoute);
        setEntries(logs.entries);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  // Group entries by day of week, preserving Mon→Sun order, only days with data.
  const byDay = useMemo(() => {
    const groups = ALL_DAYS.map((day) => ({
      day,
      rows: entries.filter((e) => e.dayOfWeek === day),
    })).filter((g) => g.rows.length > 0);
    return groups;
  }, [entries]);

  const handleExportAll = useCallback(() => {
    download(`commuteiq-${params.id}.csv`, entriesToCSV(entries));
  }, [entries, params.id]);

  const handleExportDay = useCallback(
    (day: DayOfWeek, rows: LogEntry[]) => {
      download(`commuteiq-${params.id}-${day.toLowerCase()}.csv`, entriesToCSV(rows));
    },
    [params.id]
  );

  const handleClear = useCallback(async () => {
    if (!window.confirm("Delete all logged entries for this route? This cannot be undone.")) {
      return;
    }
    const { deletedCount } = await deleteLogs(params.id);
    await loadEntries();
    showToast(`Deleted ${deletedCount} entries.`, "success");
  }, [params.id, loadEntries, showToast]);

  const title = route ? `${route.name} — Data Log` : "Data Log";

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          href={`/route/${params.id}`}
          className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
        >
          ← Back to dashboard
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {entries.length} total {entries.length === 1 ? "entry" : "entries"}, grouped by day.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExportAll}
              disabled={entries.length === 0}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ⬇️ Export all as CSV
            </button>
            <button
              type="button"
              onClick={handleClear}
              disabled={entries.length === 0}
              className="inline-flex items-center gap-1.5 rounded-md border border-brand-error/30 bg-white px-3 py-1.5 text-sm font-medium text-brand-error transition-colors hover:bg-brand-error/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              🗑️ Clear all data
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-card bg-white p-10 text-center text-sm text-gray-500 shadow-card">
          Loading…
        </div>
      ) : byDay.length === 0 ? (
        <div className="rounded-card bg-white p-10 text-center text-sm text-gray-500 shadow-card">
          No entries logged yet for this route.
        </div>
      ) : (
        <div className="space-y-6">
          {byDay.map(({ day, rows }) => (
            <DataLogTable
              key={day}
              title={day}
              entries={rows}
              showToolbar
              onExport={() => handleExportDay(day, rows)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
