// ============================================================================
// Browser localStorage fallback store (multi-route). Client-only.
// Mirrors the server KV schema so the app is fully usable without a backend.
// ============================================================================
import type { Direction, LogEntry, Route, DateRange } from "@/types";

const ROUTES_KEY = "commuteiq:routes";
const logsKeyFor = (routeId: string) => `commuteiq:logs:${routeId}`;

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

// ---- Routes ----------------------------------------------------------------

export function readLocalRoutes(): Route[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(ROUTES_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Route[];
  } catch {
    return [];
  }
}

export function writeLocalRoutes(routes: Route[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(ROUTES_KEY, JSON.stringify(routes));
}

export function upsertLocalRoute(route: Route): void {
  const routes = readLocalRoutes();
  const idx = routes.findIndex((r) => r.id === route.id);
  if (idx >= 0) routes[idx] = route;
  else routes.push(route);
  writeLocalRoutes(routes);
}

export function deleteLocalRoute(routeId: string): void {
  writeLocalRoutes(readLocalRoutes().filter((r) => r.id !== routeId));
  if (isBrowser()) window.localStorage.removeItem(logsKeyFor(routeId));
}

// ---- Logs ------------------------------------------------------------------

export function readLocalLogs(routeId: string): LogEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(logsKeyFor(routeId));
    if (!raw) return [];
    return JSON.parse(raw) as LogEntry[];
  } catch {
    return [];
  }
}

export function writeLocalLogs(routeId: string, entries: LogEntry[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(logsKeyFor(routeId), JSON.stringify(entries));
}

export function appendLocalLog(entry: LogEntry): void {
  const logs = readLocalLogs(entry.routeId);
  logs.push(entry);
  writeLocalLogs(entry.routeId, logs);
}

export function clearLocalLogs(routeId: string): number {
  const count = readLocalLogs(routeId).length;
  if (isBrowser()) window.localStorage.removeItem(logsKeyFor(routeId));
  return count;
}

/** Filter entries by range + optional direction + optional day. */
export function filterEntries(
  entries: LogEntry[],
  range: DateRange,
  direction?: Direction,
  day?: string
): LogEntry[] {
  let cutoff = 0;
  const now = Date.now();
  if (range === "7d") cutoff = now - 7 * 864e5;
  else if (range === "30d") cutoff = now - 30 * 864e5;
  else if (range === "90d") cutoff = now - 90 * 864e5;

  return entries
    .filter((e) => (cutoff === 0 ? true : new Date(e.timestamp).getTime() >= cutoff))
    .filter((e) => (direction ? e.direction === direction : true))
    .filter((e) => (day ? e.dayOfWeek === day : true))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}
