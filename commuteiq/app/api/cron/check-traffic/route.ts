import { NextResponse } from "next/server";
import type { CronResult, Direction } from "@/types";
import {
  appendLogKV,
  getLastChecked,
  getRoutesKV,
  isKvAvailable,
  pruneOldLogsKV,
  setLastChecked,
} from "@/lib/kv";
import { buildLogEntry, endpointsFor, fetchTraffic } from "@/lib/gmaps";
import { evaluateSchedule } from "@/lib/scheduler";

export const dynamic = "force-dynamic";

const DIRECTIONS: Direction[] = ["outbound", "return"];

/**
 * Verify the caller is authorized. When CRON_SECRET is set, callers must send
 * the secret either as `Authorization: Bearer <secret>` (used automatically by
 * Vercel Cron) or as a `?secret=<secret>` query param (easier for external
 * schedulers like cron-job.org). If CRON_SECRET is unset, access is open
 * (e.g. local development).
 */
function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const auth = request.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const url = new URL(request.url);
  return url.searchParams.get("secret") === secret;
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ executed: false, reason: "Unauthorized" }, { status: 401 });
  }

  if (!isKvAvailable()) {
    return NextResponse.json({ executed: false, reason: "KV not configured" } satisfies CronResult);
  }

  const routes = await getRoutesKV();
  const now = new Date();
  const results: NonNullable<CronResult["results"]> = [];

  for (const route of routes) {
    await pruneOldLogsKV(route.id);

    for (const direction of DIRECTIONS) {
      const lastChecked = await getLastChecked(route.id, direction);
      const { shouldRun, reason } = evaluateSchedule(route, direction, lastChecked, now);

      if (!shouldRun) {
        results.push({ routeId: route.id, direction, reason, logged: false });
        continue;
      }

      const { origin, destination } = endpointsFor(route, direction);
      const traffic = await fetchTraffic(origin, destination, route.mode, route.timezone);
      const entry = buildLogEntry(route, direction, traffic, now);
      await appendLogKV(entry);
      await setLastChecked(route.id, direction, now.toISOString());
      results.push({ routeId: route.id, direction, reason: "Conditions met", logged: true });
    }
  }

  return NextResponse.json({
    executed: results.some((r) => r.logged),
    results,
  } satisfies CronResult);
}
