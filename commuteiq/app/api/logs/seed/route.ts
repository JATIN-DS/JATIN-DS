import { NextResponse, type NextRequest } from "next/server";
import { appendLogsBulkKV, getRouteKV, isKvAvailable } from "@/lib/kv";
import { generateSampleEntries } from "@/lib/sampleData";

export const dynamic = "force-dynamic";

/**
 * Generate realistic sample (dummy) data for a route and store it in KV,
 * tagged so it can be removed later without touching real data.
 * Body: { routeId: string, days?: number }
 */
export async function POST(request: NextRequest) {
  if (!isKvAvailable()) {
    return NextResponse.json(
      { success: false, error: "KV not configured" },
      { status: 503 }
    );
  }

  let routeId = "";
  let days = 90;
  try {
    const body = (await request.json()) as { routeId?: string; days?: number };
    routeId = body.routeId ?? "";
    if (typeof body.days === "number") days = body.days;
  } catch {
    /* fall through to validation */
  }
  days = Math.min(90, Math.max(1, Math.round(days)));

  if (!routeId) {
    return NextResponse.json({ success: false, error: "routeId required" }, { status: 400 });
  }

  const route = await getRouteKV(routeId);
  if (!route) {
    return NextResponse.json({ success: false, error: "Route not found" }, { status: 404 });
  }

  const entries = generateSampleEntries(route, days);
  const inserted = await appendLogsBulkKV(entries);
  return NextResponse.json({ success: true, inserted, days });
}
