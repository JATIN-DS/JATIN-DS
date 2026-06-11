import { NextResponse, type NextRequest } from "next/server";
import type { DateRange, Direction, LogEntry, LogsResponse } from "@/types";
import { deleteLogsKV, deleteSampleLogsKV, getLogsKV, isKvAvailable } from "@/lib/kv";

export const dynamic = "force-dynamic";

const VALID_RANGES: DateRange[] = ["7d", "30d", "90d", "all"];

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const routeId = searchParams.get("routeId");
  if (!routeId) {
    return NextResponse.json({ entries: [], count: 0 } satisfies LogsResponse);
  }

  const rangeParam = searchParams.get("range") ?? "30d";
  const range: DateRange = VALID_RANGES.includes(rangeParam as DateRange)
    ? (rangeParam as DateRange)
    : "30d";
  const directionParam = searchParams.get("direction");
  const direction =
    directionParam === "outbound" || directionParam === "return"
      ? (directionParam as Direction)
      : undefined;
  const day = searchParams.get("day") ?? undefined;

  const entries: LogEntry[] = isKvAvailable()
    ? await getLogsKV(routeId, range, direction, day)
    : [];
  return NextResponse.json({ entries, count: entries.length } satisfies LogsResponse);
}

export async function DELETE(request: NextRequest) {
  let routeId = "";
  let confirmDelete = false;
  let sampleOnly = false;
  try {
    const body = (await request.json()) as {
      routeId?: string;
      confirmDelete?: boolean;
      sampleOnly?: boolean;
    };
    routeId = body.routeId ?? "";
    confirmDelete = body.confirmDelete === true;
    sampleOnly = body.sampleOnly === true;
  } catch {
    confirmDelete = false;
  }

  if (!confirmDelete || !routeId) {
    return NextResponse.json(
      { success: false, error: "routeId and confirmDelete:true required" },
      { status: 400 }
    );
  }

  let deletedCount = 0;
  if (isKvAvailable()) {
    deletedCount = sampleOnly ? await deleteSampleLogsKV(routeId) : await deleteLogsKV(routeId);
  }
  return NextResponse.json({ success: true, deletedCount });
}
