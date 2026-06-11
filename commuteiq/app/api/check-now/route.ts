import { NextResponse, type NextRequest } from "next/server";
import type { Direction, Route } from "@/types";
import { appendLogKV, isKvAvailable, setLastChecked } from "@/lib/kv";
import { buildLogEntry, endpointsFor, fetchTraffic } from "@/lib/gmaps";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const persist = searchParams.get("persist") === "1";

  let route: Route;
  let direction: Direction;
  try {
    const body = (await request.json()) as { route: Route; direction?: Direction };
    route = body.route;
    direction = body.direction === "return" ? "return" : "outbound";
  } catch {
    return NextResponse.json({ executed: false, reason: "Invalid request body" }, { status: 400 });
  }

  if (!route?.id) {
    return NextResponse.json({ executed: false, reason: "Missing route" }, { status: 400 });
  }

  const { origin, destination } = endpointsFor(route, direction);
  const traffic = await fetchTraffic(origin, destination, route.mode, route.timezone);
  const entry = buildLogEntry(route, direction, traffic);

  if (persist && isKvAvailable()) {
    await appendLogKV(entry);
    await setLastChecked(route.id, direction, entry.timestamp);
  }

  return NextResponse.json({
    executed: true,
    reason: traffic.simulated ? "Logged (simulated value)" : "Logged",
    entry,
    simulated: traffic.simulated,
  });
}
