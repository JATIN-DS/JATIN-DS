import { NextResponse } from "next/server";
import { isKvAvailable } from "@/lib/kv";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ kvAvailable: isKvAvailable() });
}
