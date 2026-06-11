// ============================================================================
// Client-side data access layer (multi-route).
// Talks to the serverless API when Vercel KV is available, and transparently
// falls back to browser localStorage otherwise. All UI imports from here.
// ============================================================================
"use client";

import type {
  DateRange,
  Direction,
  DayOfWeek,
  LogEntry,
  LogsResponse,
  Route,
  RouteForm,
  RouteSaveResponse,
} from "@/types";
import {
  appendLocalLog,
  clearLocalLogs,
  deleteLocalRoute,
  filterEntries,
  readLocalLogs,
  readLocalRoutes,
  upsertLocalRoute,
  writeLocalLogs,
} from "@/lib/localStore";
import { generateSampleEntries } from "@/lib/sampleData";

export type StorageMode = "kv" | "local";

let cachedMode: StorageMode | null = null;

export async function getStorageMode(): Promise<StorageMode> {
  if (cachedMode) return cachedMode;
  try {
    const res = await fetch("/api/health", { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { kvAvailable?: boolean };
      cachedMode = data.kvAvailable ? "kv" : "local";
    } else {
      cachedMode = "local";
    }
  } catch {
    cachedMode = "local";
  }
  return cachedMode;
}

/** Build a brand-new Route from form fields (assigns id + createdAt). */
export function newRoute(form: RouteForm): Route {
  return { ...form, id: crypto.randomUUID(), createdAt: new Date().toISOString() };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export async function getRoutes(): Promise<Route[]> {
  const mode = await getStorageMode();
  if (mode === "kv") {
    try {
      const res = await fetch("/api/routes", { cache: "no-store" });
      if (res.ok) return (await res.json()) as Route[];
    } catch {
      /* fall through */
    }
  }
  return readLocalRoutes();
}

export async function getRoute(id: string): Promise<Route | null> {
  const mode = await getStorageMode();
  if (mode === "kv") {
    try {
      const res = await fetch(`/api/routes/${encodeURIComponent(id)}`, { cache: "no-store" });
      if (res.ok) return (await res.json()) as Route;
      if (res.status === 404) return null;
    } catch {
      /* fall through */
    }
  }
  return readLocalRoutes().find((r) => r.id === id) ?? null;
}

export async function saveRoute(route: Route): Promise<RouteSaveResponse> {
  // Always mirror locally for instant restore.
  upsertLocalRoute(route);
  const mode = await getStorageMode();
  if (mode === "kv") {
    try {
      const res = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(route),
      });
      return (await res.json()) as RouteSaveResponse;
    } catch {
      return { success: false, error: "Could not reach the server. Saved locally instead." };
    }
  }
  return { success: true, route };
}

export async function deleteRoute(id: string): Promise<{ success: boolean }> {
  deleteLocalRoute(id);
  const mode = await getStorageMode();
  if (mode === "kv") {
    try {
      const res = await fetch(`/api/routes/${encodeURIComponent(id)}`, { method: "DELETE" });
      return (await res.json()) as { success: boolean };
    } catch {
      return { success: true };
    }
  }
  return { success: true };
}

// ---------------------------------------------------------------------------
// Logs
// ---------------------------------------------------------------------------

export async function getLogs(
  routeId: string,
  range: DateRange,
  direction?: Direction,
  day?: DayOfWeek
): Promise<LogsResponse> {
  const mode = await getStorageMode();
  if (mode === "kv") {
    try {
      const params = new URLSearchParams({ routeId, range });
      if (direction) params.set("direction", direction);
      if (day) params.set("day", day);
      const res = await fetch(`/api/logs?${params.toString()}`, { cache: "no-store" });
      if (res.ok) return (await res.json()) as LogsResponse;
    } catch {
      /* fall through */
    }
  }
  const entries = filterEntries(readLocalLogs(routeId), range, direction, day);
  return { entries, count: entries.length };
}

export async function deleteLogs(routeId: string): Promise<{ success: boolean; deletedCount: number }> {
  const mode = await getStorageMode();
  if (mode === "kv") {
    try {
      const res = await fetch("/api/logs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId, confirmDelete: true }),
      });
      if (res.ok) return (await res.json()) as { success: boolean; deletedCount: number };
    } catch {
      /* fall through */
    }
  }
  const deletedCount = clearLocalLogs(routeId);
  return { success: true, deletedCount };
}

// ---------------------------------------------------------------------------
// Manual "check traffic now" — works in both modes & directions.
// The route details travel in the request body so the server can run even
// without KV (local mode).
// ---------------------------------------------------------------------------

export interface CheckNowResult {
  executed: boolean;
  reason: string;
  entry?: LogEntry;
  simulated?: boolean;
}

export async function runCheckNow(
  route: Route,
  direction: Direction,
  persist = true
): Promise<CheckNowResult> {
  const mode = await getStorageMode();
  const shouldPersist = persist && mode === "kv";
  try {
    const res = await fetch(`/api/check-now?persist=${shouldPersist ? "1" : "0"}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ route, direction }),
      cache: "no-store",
    });
    const data = (await res.json()) as CheckNowResult;
    if (persist && data.executed && data.entry && mode === "local") {
      appendLocalLog(data.entry);
    }
    return data;
  } catch {
    return { executed: false, reason: "Check failed — the server was unreachable." };
  }
}

// ---------------------------------------------------------------------------
// Places autocomplete (proxied through the server; key stays server-side).
// ---------------------------------------------------------------------------

export async function placesAutocomplete(input: string): Promise<string[]> {
  const q = input.trim();
  if (q.length < 2) return [];
  try {
    const res = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(q)}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const data = (await res.json()) as { predictions?: string[] };
      return data.predictions ?? [];
    }
  } catch {
    /* fall through to empty */
  }
  return [];
}

// ---------------------------------------------------------------------------
// Sample (dummy) data — preview analytics before the scheduler collects.
// Entries are tagged `sample: true` so they can be removed selectively without
// touching real collected data. Persists to KV when available, else local.
// ---------------------------------------------------------------------------

/** Generate `days` of realistic sample data for a route. Returns count inserted. */
export async function generateSampleData(route: Route, days = 90): Promise<number> {
  const mode = await getStorageMode();
  if (mode === "kv") {
    try {
      const res = await fetch("/api/logs/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId: route.id, days }),
      });
      if (res.ok) {
        const data = (await res.json()) as { inserted?: number };
        return data.inserted ?? 0;
      }
    } catch {
      /* fall through to local */
    }
  }
  const generated = generateSampleEntries(route, days);
  const existing = readLocalLogs(route.id);
  writeLocalLogs(route.id, [...existing, ...generated]);
  return generated.length;
}

/** Remove ONLY sample data for a route, keeping real collected data. */
export async function removeSampleData(route: Route): Promise<number> {
  const mode = await getStorageMode();
  if (mode === "kv") {
    try {
      const res = await fetch("/api/logs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeId: route.id, confirmDelete: true, sampleOnly: true }),
      });
      if (res.ok) {
        const data = (await res.json()) as { deletedCount?: number };
        return data.deletedCount ?? 0;
      }
    } catch {
      /* fall through to local */
    }
  }
  const existing = readLocalLogs(route.id);
  const remaining = existing.filter((e) => !e.sample);
  writeLocalLogs(route.id, remaining);
  return existing.length - remaining.length;
}

export function entriesToCSV(entries: LogEntry[]): string {
  const header = [
    "Date",
    "Day",
    "Direction",
    "Departure Time",
    "Travel Time (mins)",
    "Travel Time",
    "Distance",
    "Mode",
    "From",
    "To",
  ];
  const rows = entries.map((e) => [
    e.timestamp.slice(0, 10),
    e.dayOfWeek,
    e.direction === "outbound" ? "A→B" : "B→A",
    e.departureTime,
    String(Math.round(e.durationInTraffic / 60)),
    e.durationInTrafficDisplay,
    e.distanceDisplay,
    e.mode,
    e.startLocation,
    e.endLocation,
  ]);
  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  return [header, ...rows].map((r) => r.map(escape).join(",")).join("\n");
}
