import { NextResponse, type NextRequest } from "next/server";
import type { PlacesResponse } from "@/types";

export const dynamic = "force-dynamic";

// Places API (New) — POST places:autocomplete. Returns suggestions[] where
// each placePrediction.text.text is the full human-readable description.
interface PlacesNewResponse {
  suggestions?: Array<{
    placePrediction?: { text?: { text?: string } };
  }>;
  error?: { message?: string };
}

// Curated fallback so autocomplete still helps when the Places API is
// unreachable (e.g. local dev behind a firewall, or no key).
const FALLBACK_PLACES: string[] = [
  "Bandra Station, Mumbai, Maharashtra",
  "Bandra Kurla Complex, Mumbai, Maharashtra",
  "Lower Parel, Mumbai, Maharashtra",
  "Andheri East, Mumbai, Maharashtra",
  "Andheri West, Mumbai, Maharashtra",
  "Powai, Mumbai, Maharashtra",
  "Worli, Mumbai, Maharashtra",
  "Dadar, Mumbai, Maharashtra",
  "Churchgate, Mumbai, Maharashtra",
  "Colaba, Mumbai, Maharashtra",
  "Goregaon, Mumbai, Maharashtra",
  "Malad, Mumbai, Maharashtra",
  "Borivali, Mumbai, Maharashtra",
  "Thane, Maharashtra",
  "Navi Mumbai, Maharashtra",
  "Vashi, Navi Mumbai, Maharashtra",
  "Connaught Place, New Delhi, Delhi",
  "Cyber City, Gurugram, Haryana",
  "Noida Sector 62, Uttar Pradesh",
  "Indiranagar, Bengaluru, Karnataka",
  "Koramangala, Bengaluru, Karnataka",
  "Whitefield, Bengaluru, Karnataka",
  "Electronic City, Bengaluru, Karnataka",
  "Hitech City, Hyderabad, Telangana",
  "Gachibowli, Hyderabad, Telangana",
  "T. Nagar, Chennai, Tamil Nadu",
  "OMR, Chennai, Tamil Nadu",
  "Salt Lake City, Kolkata, West Bengal",
  "Hinjewadi, Pune, Maharashtra",
  "Kharadi, Pune, Maharashtra",
];

function fallback(input: string): string[] {
  const q = input.toLowerCase();
  const matches = FALLBACK_PLACES.filter((p) => p.toLowerCase().includes(q));
  return (matches.length > 0 ? matches : FALLBACK_PLACES).slice(0, 6);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const input = (searchParams.get("input") ?? "").trim();
  if (input.length < 2) {
    return NextResponse.json({ predictions: [], source: "fallback" } satisfies PlacesResponse);
  }

  const key = process.env.GMAPS_API_KEY;
  if (!key) {
    return NextResponse.json({ predictions: fallback(input), source: "fallback" } satisfies PlacesResponse);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    let res: Response;
    try {
      res = await fetch("https://places.googleapis.com/v1/places:autocomplete", {
        method: "POST",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": "suggestions.placePrediction.text.text",
        },
        body: JSON.stringify({ input }),
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) throw new Error(`Places HTTP ${res.status}`);
    const data = (await res.json()) as PlacesNewResponse;
    if (data.error?.message) throw new Error(`Places error: ${data.error.message}`);

    const predictions = (data.suggestions ?? [])
      .map((s) => s.placePrediction?.text?.text)
      .filter((t): t is string => Boolean(t))
      .slice(0, 6);
    return NextResponse.json({ predictions, source: "google" } satisfies PlacesResponse);
  } catch (error) {
    console.error("places autocomplete failed, using fallback:", error);
    return NextResponse.json({ predictions: fallback(input), source: "fallback" } satisfies PlacesResponse);
  }
}
