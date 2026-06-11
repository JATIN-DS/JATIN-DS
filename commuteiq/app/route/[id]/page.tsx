"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DateRange, DayOfWeek, Direction, LogEntry, Route } from "@/types";
import { ALL_DAYS } from "@/types";
import { formatTime12h, minutesToTime, roundToQuarterHour, timeToMinutes } from "@/lib/regression";
import {
  getLogs,
  getRoute,
  getStorageMode,
  runCheckNow,
  type CheckNowResult,
  type StorageMode,
} from "@/lib/store";
import { useToast } from "@/components/ToastProvider";
import DateRangeSelector from "@/components/DateRangeSelector";
import ChartDaySelector, { type DaySelection } from "@/components/ChartDaySelector";
import EmptyState from "@/components/EmptyState";
import ErrorBanner from "@/components/ErrorBanner";
import TimeSeriesChart from "@/components/TimeSeriesChart";

function distinctDays(entries: LogEntry[]): DayOfWeek[] {
  const present = new Set(entries.map((e) => e.dayOfWeek));
  return ALL_DAYS.filter((d) => present.has(d));
}

interface BestWorst {
  best: { slot: number; min: number } | null;
  worst: { slot: number; min: number } | null;
  scopeLabel: string;
}

/** Best / worst 15-min departure slot for the current day selection. */
function computeBestWorst(entries: LogEntry[], daySelection: DaySelection): BestWorst {
  const scoped =
    daySelection === "all"
      ? entries
      : entries.filter((e) => daySelection.includes(e.dayOfWeek));
  const bySlot = new Map<number, number[]>();
  for (const e of scoped) {
    const slot = roundToQuarterHour(timeToMinutes(e.departureTime));
    const arr = bySlot.get(slot) ?? [];
    arr.push(e.durationInTraffic);
    bySlot.set(slot, arr);
  }
  let best: { slot: number; min: number } | null = null;
  let worst: { slot: number; min: number } | null = null;
  for (const [slot, durations] of bySlot.entries()) {
    const avg = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length / 60);
    if (!best || avg < best.min) best = { slot, min: avg };
    if (!worst || avg > worst.min) worst = { slot, min: avg };
  }
  const scopeLabel = daySelection === "all" ? "across all days" : `on ${daySelection.join(", ")}`;
  return { best, worst, scopeLabel };
}

export default function RouteDashboard({ params }: { params: { id: string } }) {
  const { showToast } = useToast();

  const [route, setRoute] = useState<Route | null>(null);
  const [outboundEntries, setOutboundEntries] = useState<LogEntry[]>([]);
  const [returnEntries, setReturnEntries] = useState<LogEntry[]>([]);
  const [range, setRange] = useState<DateRange>("30d");
  const [daySelection, setDaySelection] = useState<DaySelection>("all");
  // Always defaults to 45 on a fresh load (intentionally not persisted).
  const [threshold, setThreshold] = useState<number>(45);
  const [storageMode, setStorageMode] = useState<StorageMode | null>(null);

  const [loading, setLoading] = useState(true);
  const [entriesLoading, setEntriesLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<{
    time: string;
    results: Array<{ direction: Direction; result: CheckNowResult }>;
  } | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [showLocalBanner, setShowLocalBanner] = useState(true);

  const loadEntries = useCallback(async (current: Route, nextRange: DateRange) => {
    setEntriesLoading(true);
    try {
      const [out, ret] = await Promise.all([
        getLogs(current.id, nextRange, "outbound"),
        getLogs(current.id, nextRange, "return"),
      ]);
      setOutboundEntries(out.entries);
      setReturnEntries(ret.entries);
    } finally {
      setEntriesLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [loadedRoute, mode] = await Promise.all([
          getRoute(params.id),
          getStorageMode(),
        ]);
        if (cancelled) return;
        setStorageMode(mode);
        if (!loadedRoute) {
          setNotFound(true);
          return;
        }
        setRoute(loadedRoute);
        await loadEntries(loadedRoute, "30d");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.id, loadEntries]);

  const handleRangeChange = useCallback(
    async (next: DateRange) => {
      setRange(next);
      if (route) await loadEntries(route, next);
    },
    [route, loadEntries]
  );

  const handleDayChange = useCallback((next: DaySelection) => {
    setDaySelection(next);
  }, []);

  const handleCheckNow = useCallback(async () => {
    if (!route) return;
    setChecking(true);
    try {
      // Manual checks are a live readout only — they are NOT persisted to the
      // graph. The chart shows historically (scheduler) collected data only.
      const dirs: Direction[] = route.returnEnabled ? ["outbound", "return"] : ["outbound"];
      const results: Array<{ direction: Direction; result: CheckNowResult }> = [];
      for (const d of dirs) {
        results.push({ direction: d, result: await runCheckNow(route, d, false) });
      }
      const time = new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
      setLastCheck({ time, results });
      const anyExecuted = results.some((r) => r.result.executed);
      showToast(
        anyExecuted ? "Live traffic checked." : results[0]?.result.reason ?? "No check ran.",
        anyExecuted ? "success" : "info"
      );
    } finally {
      setChecking(false);
    }
  }, [route, showToast]);

  const days = useMemo(
    () => distinctDays([...outboundEntries, ...returnEntries]),
    [outboundEntries, returnEntries]
  );
  const hasData = outboundEntries.length > 0 || returnEntries.length > 0;

  const bestWorstOutbound = useMemo(
    () => computeBestWorst(outboundEntries, daySelection),
    [outboundEntries, daySelection]
  );
  const bestWorstReturn = useMemo(
    () => computeBestWorst(returnEntries, daySelection),
    [returnEntries, daySelection]
  );

  if (loading) {
    return (
      <div className="rounded-card bg-white p-10 text-center text-sm text-gray-500 shadow-card">
        Loading…
      </div>
    );
  }

  if (notFound || !route) {
    return (
      <section className="flex flex-col items-center rounded-card bg-white px-6 py-12 text-center shadow-card sm:py-16">
        <div
          aria-hidden
          className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 text-4xl"
        >
          🧭
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Route not found</h2>
        <p className="mt-2 max-w-md text-sm text-gray-500">
          This route may have been deleted or the link is incorrect.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-brand-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
        >
          ← Back to My Routes
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
        >
          ← My Routes
        </Link>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">{route.name}</h1>
            <dl className="mt-2 space-y-1">
              <div className="flex gap-2 text-sm">
                <dt className="w-6 shrink-0 font-semibold text-gray-500">A</dt>
                <dd className="min-w-0 truncate text-gray-900">{route.startLocation}</dd>
              </div>
              <div className="flex gap-2 text-sm">
                <dt className="w-6 shrink-0 font-semibold text-gray-500">B</dt>
                <dd className="min-w-0 truncate text-gray-900">{route.endLocation}</dd>
              </div>
            </dl>
          </div>
          <Link
            href={`/settings?id=${route.id}`}
            className="inline-flex items-center justify-center gap-1.5 self-start rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            Edit route
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <DateRangeSelector value={range} onChange={handleRangeChange} />
        <div className="flex flex-col items-start gap-1.5 sm:items-end">
          <button
            type="button"
            onClick={handleCheckNow}
            disabled={checking}
            className="inline-flex items-center justify-center gap-1.5 self-start rounded-md bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
          >
            {checking ? "Checking…" : "Check traffic now"}
          </button>
          {lastCheck && (
            <div className="text-xs text-gray-500 sm:text-right">
              <span className="text-gray-400">Checked at {lastCheck.time}</span>
              {lastCheck.results.map(({ direction, result }) => (
                <p key={direction}>
                  <span className="font-semibold text-gray-700">
                    {direction === "outbound" ? "A→B" : "B→A"}
                  </span>{" "}
                  {result.executed && result.entry ? (
                    <>
                      <span className="font-semibold text-gray-700">
                        {result.entry.durationInTrafficDisplay}
                      </span>
                      {result.simulated ? " · simulated" : ""}
                    </>
                  ) : (
                    <span>{result.reason}</span>
                  )}
                </p>
              ))}
              <span className="block text-gray-400">Live reading — not added to the graph.</span>
            </div>
          )}
        </div>
      </div>

      {storageMode === "local" && showLocalBanner && (
        <ErrorBanner
          tone="info"
          message="Running in local mode — data is stored in this browser only."
          onDismiss={() => setShowLocalBanner(false)}
        />
      )}

      {entriesLoading ? (
        <div className="rounded-card bg-white p-10 text-center text-sm text-gray-500 shadow-card">
          Loading…
        </div>
      ) : !hasData ? (
        <EmptyState />
      ) : (
        <>
          <div className="flex flex-col gap-3 rounded-card bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <ChartDaySelector days={days} selection={daySelection} onChange={handleDayChange} />
            <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-2.5">
              <span
                aria-hidden
                className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border-2"
                style={{ borderColor: "#16A34A", backgroundColor: "rgba(22,163,74,0.18)" }}
              />
              <label htmlFor="threshold" className="text-sm font-medium text-green-900">
                Highlight departures at or under
              </label>
              <div className="relative">
                <input
                  id="threshold"
                  type="number"
                  min={1}
                  step={1}
                  value={threshold}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v) && v > 0) setThreshold(Math.round(v));
                  }}
                  className="w-24 rounded-lg border border-green-300 bg-white py-2 pl-3 pr-12 text-sm font-semibold text-gray-900 transition-colors focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-200"
                  aria-label="Commute time threshold in minutes"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-500">
                  min
                </span>
              </div>
            </div>
          </div>

          <ChartSection
            title="A → B"
            entries={outboundEntries}
            bestWorst={bestWorstOutbound}
            selection={daySelection}
            threshold={threshold}
          />

          {route.returnEnabled && (
            <ChartSection
              title="B → A"
              entries={returnEntries}
              bestWorst={bestWorstReturn}
              selection={daySelection}
              threshold={threshold}
            />
          )}

          <div className="flex justify-end">
            <Link
              href={`/route/${route.id}/log`}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              View data log →
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

interface ChartSectionProps {
  title: string;
  entries: LogEntry[];
  bestWorst: BestWorst;
  selection: DaySelection;
  threshold: number;
}

function ChartSection({ title, entries, bestWorst, selection, threshold }: ChartSectionProps) {
  return (
    <section className="rounded-card bg-white p-5 shadow-card sm:p-6">
      <div className="flex items-baseline gap-2">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <span className="text-xs text-gray-400">Travel time by departure time</span>
      </div>
      {bestWorst.best && bestWorst.worst && (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm">
            <span className="font-semibold text-green-800">Best time {bestWorst.scopeLabel}</span>
            <span className="text-green-900">
              {formatTime12h(minutesToTime(bestWorst.best.slot))} · {bestWorst.best.min} min
            </span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm">
            <span className="font-semibold text-red-800">Worst time {bestWorst.scopeLabel}</span>
            <span className="text-red-900">
              {formatTime12h(minutesToTime(bestWorst.worst.slot))} · {bestWorst.worst.min} min
            </span>
          </div>
        </div>
      )}
      <div className="mt-4">
        <TimeSeriesChart entries={entries} selection={selection} threshold={threshold} />
      </div>
    </section>
  );
}
