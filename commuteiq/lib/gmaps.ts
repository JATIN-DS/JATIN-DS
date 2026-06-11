import type { Direction, LogEntry, Route, TransitMode } from "@/types";
import { getLocalDayOfWeek, getLocalHHMM, minutesSinceMidnightInZone } from "@/lib/timezone";

export interface TrafficResult {
  durationInTraffic: number;
  durationInTrafficDisplay: string;
  distanceMeters: number;
  distanceDisplay: string;
  simulated: boolean;
}

// Google Routes API (v2) — the modern replacement for the legacy Distance
// Matrix API. Returns traffic-aware `duration` (e.g. "2244s") + distanceMeters.
interface RoutesResponse {
  routes?: Array<{ duration?: string; distanceMeters?: number; staticDuration?: string }>;
  error?: { message?: string };
}

function travelModeFor(mode: TransitMode): "DRIVE" | "TWO_WHEELER" {
  return mode === "two-wheeler" ? "TWO_WHEELER" : "DRIVE";
}

function kmDisplay(meters: number): string {
  return `${(meters / 1000).toFixed(1)} km`;
}

const SIM_DISTANCE_METERS = 12_400;
const SIM_DISTANCE_DISPLAY = "12.4 km";

function formatDuration(seconds: number): string {
  return `${Math.round(seconds / 60)} min`;
}

/** Resolve the origin/destination for a route in a given direction. */
export function endpointsFor(route: Route, direction: Direction): { origin: string; destination: string } {
  return direction === "outbound"
    ? { origin: route.startLocation, destination: route.endLocation }
    : { origin: route.endLocation, destination: route.startLocation };
}

/**
 * Plausible synthetic reading so the demo always works without a live key.
 * Congestion peaks around morning (~9:00) and evening (~18:00) rush.
 */
function simulateTraffic(timezone: string): TrafficResult {
  const minuteOfDay = minutesSinceMidnightInZone(new Date(), timezone);
  const morning = Math.exp(-Math.pow(minuteOfDay - 540, 2) / (2 * Math.pow(90, 2)));
  const evening = Math.exp(-Math.pow(minuteOfDay - 1080, 2) / (2 * Math.pow(90, 2)));
  const congestionFactor = Math.max(morning, evening);

  const baseSeconds = 22 * 60;
  const congestionSeconds = Math.round(congestionFactor * 18 * 60);
  const jitterSeconds = Math.round((Math.random() - 0.5) * 4 * 60);
  const durationInTraffic = Math.max(60, baseSeconds + congestionSeconds + jitterSeconds);

  return {
    durationInTraffic,
    durationInTrafficDisplay: formatDuration(durationInTraffic),
    distanceMeters: SIM_DISTANCE_METERS,
    distanceDisplay: SIM_DISTANCE_DISPLAY,
    simulated: true,
  };
}

export async function fetchTraffic(
  origin: string,
  destination: string,
  mode: TransitMode,
  timezone: string
): Promise<TrafficResult> {
  const key = process.env.GMAPS_API_KEY;
  if (!key || !origin || !destination) {
    return simulateTraffic(timezone);
  }

  try {
    // Bound the request so a slow upstream can't exceed the function budget.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);
    let res: Response;
    try {
      res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
        method: "POST",
        cache: "no-store",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": key,
          "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.staticDuration",
        },
        body: JSON.stringify({
          origin: { address: origin },
          destination: { address: destination },
          travelMode: travelModeFor(mode),
          routingPreference: "TRAFFIC_AWARE",
          units: "METRIC",
        }),
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) throw new Error(`Routes API HTTP ${res.status}`);

    const data = (await res.json()) as RoutesResponse;
    if (data.error?.message) {
      throw new Error(`Routes API error: ${data.error.message}`);
    }

    const route = data.routes?.[0];
    if (!route?.duration || route.distanceMeters == null) {
      throw new Error("Routes API returned no usable route");
    }

    // duration arrives as a protobuf-style string, e.g. "2244s".
    const seconds = parseInt(route.duration.replace(/s$/, ""), 10);
    if (!Number.isFinite(seconds)) throw new Error("Unparseable duration");

    return {
      durationInTraffic: seconds,
      durationInTrafficDisplay: formatDuration(seconds),
      distanceMeters: route.distanceMeters,
      distanceDisplay: kmDisplay(route.distanceMeters),
      simulated: false,
    };
  } catch (error) {
    console.error("fetchTraffic failed, falling back to simulated:", error);
    return simulateTraffic(timezone);
  }
}

export function buildLogEntry(
  route: Route,
  direction: Direction,
  traffic: Omit<TrafficResult, "simulated">,
  when: Date = new Date()
): LogEntry {
  const { origin, destination } = endpointsFor(route, direction);
  return {
    id: crypto.randomUUID(),
    routeId: route.id,
    direction,
    timestamp: when.toISOString(),
    dayOfWeek: getLocalDayOfWeek(when, route.timezone),
    departureTime: getLocalHHMM(when, route.timezone),
    durationInTraffic: traffic.durationInTraffic,
    durationInTrafficDisplay: traffic.durationInTrafficDisplay,
    distanceMeters: traffic.distanceMeters,
    distanceDisplay: traffic.distanceDisplay,
    startLocation: origin,
    endLocation: destination,
    mode: route.mode,
  };
}
