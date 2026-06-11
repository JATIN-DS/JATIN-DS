import { NextResponse, type NextRequest } from "next/server";
import type { Route, RouteSaveResponse } from "@/types";
import { getRoutesKV, isKvAvailable, saveRouteKV } from "@/lib/kv";

export const dynamic = "force-dynamic";

function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export async function GET() {
  const routes: Route[] = isKvAvailable() ? await getRoutesKV() : [];
  return NextResponse.json(routes);
}

export async function POST(request: NextRequest) {
  let route: Route;
  try {
    route = (await request.json()) as Route;
  } catch {
    const body: RouteSaveResponse = { success: false, error: "Invalid JSON body" };
    return NextResponse.json(body, { status: 400 });
  }

  if (!route.id || !route.name?.trim()) {
    return NextResponse.json(
      { success: false, error: "Route id and name are required" } satisfies RouteSaveResponse,
      { status: 400 }
    );
  }
  if (!route.startLocation?.trim() || !route.endLocation?.trim()) {
    return NextResponse.json(
      { success: false, error: "Start and end locations are required" } satisfies RouteSaveResponse,
      { status: 400 }
    );
  }
  if (!Array.isArray(route.selectedDays) || route.selectedDays.length < 1) {
    return NextResponse.json(
      { success: false, error: "At least one day must be selected" } satisfies RouteSaveResponse,
      { status: 400 }
    );
  }
  if (hhmmToMinutes(route.checkUntil) < hhmmToMinutes(route.checkFrom) + 15) {
    return NextResponse.json(
      { success: false, error: "Outbound end time must be after start time" } satisfies RouteSaveResponse,
      { status: 400 }
    );
  }
  if (
    route.returnEnabled &&
    hhmmToMinutes(route.returnCheckUntil) < hhmmToMinutes(route.returnCheckFrom) + 15
  ) {
    return NextResponse.json(
      { success: false, error: "Return end time must be after start time" } satisfies RouteSaveResponse,
      { status: 400 }
    );
  }

  if (isKvAvailable()) await saveRouteKV(route);

  const body: RouteSaveResponse = { success: true, route };
  return NextResponse.json(body);
}
