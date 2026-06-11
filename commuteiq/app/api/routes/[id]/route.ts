import { NextResponse } from "next/server";
import { deleteRouteKV, getRouteKV, isKvAvailable } from "@/lib/kv";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  if (!isKvAvailable()) {
    return NextResponse.json({ error: "KV not configured" }, { status: 404 });
  }
  const route = await getRouteKV(params.id);
  if (!route) {
    return NextResponse.json({ error: "Route not found" }, { status: 404 });
  }
  return NextResponse.json(route);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  if (isKvAvailable()) await deleteRouteKV(params.id);
  return NextResponse.json({ success: true });
}
