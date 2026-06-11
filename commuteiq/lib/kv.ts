import { kv } from "@vercel/kv";
import type { DateRange, Direction, LogEntry, Route } from "@/types";

const ROUTES_INDEX_KEY = "routes:index";
const routeKey = (id: string) => `route:${id}`;
const logsIndexKey = (routeId: string) => `logs:${routeId}:index`;
const logsKey = (routeId: string, date: string) => `logs:${routeId}:${date}`;
const lastCheckedKey = (routeId: string, direction: Direction) =>
  `meta:last-checked:${routeId}:${direction}`;

/** True when the runtime has Vercel KV credentials configured. */
export function isKvAvailable(): boolean {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

// ---- Routes ----------------------------------------------------------------

export async function getRoutesKV(): Promise<Route[]> {
  try {
    const ids = (await kv.get<string[]>(ROUTES_INDEX_KEY)) ?? [];
    const routes = await Promise.all(ids.map((id) => kv.get<Route>(routeKey(id))));
    return routes.filter((r): r is Route => Boolean(r));
  } catch (error) {
    console.error("getRoutesKV failed:", error);
    return [];
  }
}

export async function getRouteKV(id: string): Promise<Route | null> {
  try {
    return (await kv.get<Route>(routeKey(id))) ?? null;
  } catch (error) {
    console.error("getRouteKV failed:", error);
    return null;
  }
}

export async function saveRouteKV(route: Route): Promise<void> {
  try {
    await kv.set(routeKey(route.id), route);
    const ids = (await kv.get<string[]>(ROUTES_INDEX_KEY)) ?? [];
    if (!ids.includes(route.id)) {
      ids.push(route.id);
      await kv.set(ROUTES_INDEX_KEY, ids);
    }
  } catch (error) {
    console.error("saveRouteKV failed:", error);
  }
}

export async function deleteRouteKV(id: string): Promise<void> {
  try {
    await deleteLogsKV(id);
    await kv.del(routeKey(id));
    await kv.del(lastCheckedKey(id, "outbound"));
    await kv.del(lastCheckedKey(id, "return"));
    const ids = (await kv.get<string[]>(ROUTES_INDEX_KEY)) ?? [];
    const next = ids.filter((x) => x !== id);
    if (next.length !== ids.length) await kv.set(ROUTES_INDEX_KEY, next);
  } catch (error) {
    console.error("deleteRouteKV failed:", error);
  }
}

// ---- Logs ------------------------------------------------------------------

export async function appendLogKV(entry: LogEntry): Promise<void> {
  try {
    const date = entry.timestamp.slice(0, 10);
    const key = logsKey(entry.routeId, date);
    const existing = (await kv.get<LogEntry[]>(key)) ?? [];
    existing.push(entry);
    await kv.set(key, existing);

    const idxKey = logsIndexKey(entry.routeId);
    const index = (await kv.get<string[]>(idxKey)) ?? [];
    if (!index.includes(date)) {
      index.push(date);
      await kv.set(idxKey, index);
    }
  } catch (error) {
    console.error("appendLogKV failed:", error);
  }
}

/**
 * Append many entries at once, grouping by route + date so each KV key is
 * written a single time. Returns the number of entries inserted.
 */
export async function appendLogsBulkKV(entries: LogEntry[]): Promise<number> {
  try {
    const byRouteDate = new Map<string, Map<string, LogEntry[]>>();
    for (const entry of entries) {
      const date = entry.timestamp.slice(0, 10);
      let dates = byRouteDate.get(entry.routeId);
      if (!dates) {
        dates = new Map();
        byRouteDate.set(entry.routeId, dates);
      }
      const arr = dates.get(date) ?? [];
      arr.push(entry);
      dates.set(date, arr);
    }

    let inserted = 0;
    for (const [routeId, dates] of byRouteDate.entries()) {
      const idxKey = logsIndexKey(routeId);
      const index = new Set((await kv.get<string[]>(idxKey)) ?? []);
      for (const [date, newEntries] of dates.entries()) {
        const key = logsKey(routeId, date);
        const existing = (await kv.get<LogEntry[]>(key)) ?? [];
        existing.push(...newEntries);
        await kv.set(key, existing);
        index.add(date);
        inserted += newEntries.length;
      }
      await kv.set(idxKey, Array.from(index));
    }
    return inserted;
  } catch (error) {
    console.error("appendLogsBulkKV failed:", error);
    return 0;
  }
}

/** Delete only entries flagged `sample` for a route, keeping real data. */
export async function deleteSampleLogsKV(routeId: string): Promise<number> {
  try {
    const idxKey = logsIndexKey(routeId);
    const index = (await kv.get<string[]>(idxKey)) ?? [];
    let deleted = 0;
    const keptDates: string[] = [];
    for (const date of index) {
      const key = logsKey(routeId, date);
      const arr = (await kv.get<LogEntry[]>(key)) ?? [];
      const remaining = arr.filter((e) => !e.sample);
      deleted += arr.length - remaining.length;
      if (remaining.length === 0) {
        await kv.del(key);
      } else if (remaining.length !== arr.length) {
        await kv.set(key, remaining);
        keptDates.push(date);
      } else {
        keptDates.push(date);
      }
    }
    if (keptDates.length !== index.length) await kv.set(idxKey, keptDates);
    return deleted;
  } catch (error) {
    console.error("deleteSampleLogsKV failed:", error);
    return 0;
  }
}

function rangeCutoffMs(range: DateRange, now: number): number {
  const day = 24 * 60 * 60 * 1000;
  switch (range) {
    case "7d":
      return now - 7 * day;
    case "30d":
      return now - 30 * day;
    case "90d":
      return now - 90 * day;
    case "all":
    default:
      return Number.NEGATIVE_INFINITY;
  }
}

export async function getLogsKV(
  routeId: string,
  range: DateRange,
  direction?: Direction,
  day?: string
): Promise<LogEntry[]> {
  try {
    const index = (await kv.get<string[]>(logsIndexKey(routeId))) ?? [];
    const arrays = await Promise.all(
      index.map((date) => kv.get<LogEntry[]>(logsKey(routeId, date)))
    );

    const cutoff = rangeCutoffMs(range, Date.now());
    const entries: LogEntry[] = [];
    for (const arr of arrays) {
      if (!arr) continue;
      for (const entry of arr) {
        if (new Date(entry.timestamp).getTime() < cutoff) continue;
        if (direction && entry.direction !== direction) continue;
        if (day && entry.dayOfWeek !== day) continue;
        entries.push(entry);
      }
    }
    entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    return entries;
  } catch (error) {
    console.error("getLogsKV failed:", error);
    return [];
  }
}

export async function deleteLogsKV(routeId: string): Promise<number> {
  try {
    const index = (await kv.get<string[]>(logsIndexKey(routeId))) ?? [];
    let deleted = 0;
    for (const date of index) {
      const arr = await kv.get<LogEntry[]>(logsKey(routeId, date));
      deleted += arr?.length ?? 0;
      await kv.del(logsKey(routeId, date));
    }
    await kv.del(logsIndexKey(routeId));
    return deleted;
  } catch (error) {
    console.error("deleteLogsKV failed:", error);
    return 0;
  }
}

// ---- Cadence bookkeeping ---------------------------------------------------

export async function getLastChecked(
  routeId: string,
  direction: Direction
): Promise<string | null> {
  try {
    return (await kv.get<string>(lastCheckedKey(routeId, direction))) ?? null;
  } catch (error) {
    console.error("getLastChecked failed:", error);
    return null;
  }
}

export async function setLastChecked(
  routeId: string,
  direction: Direction,
  ts: string
): Promise<void> {
  try {
    await kv.set(lastCheckedKey(routeId, direction), ts);
  } catch (error) {
    console.error("setLastChecked failed:", error);
  }
}

export async function pruneOldLogsKV(routeId: string): Promise<void> {
  try {
    const idxKey = logsIndexKey(routeId);
    const index = (await kv.get<string[]>(idxKey)) ?? [];
    const cutoff = Date.now() - 90 * 24 * 60 * 60 * 1000;
    const kept: string[] = [];
    for (const date of index) {
      if (new Date(`${date}T00:00:00Z`).getTime() < cutoff) {
        await kv.del(logsKey(routeId, date));
      } else {
        kept.push(date);
      }
    }
    if (kept.length !== index.length) await kv.set(idxKey, kept);
  } catch (error) {
    console.error("pruneOldLogsKV failed:", error);
  }
}
