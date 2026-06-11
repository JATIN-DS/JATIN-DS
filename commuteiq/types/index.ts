// ============================================================================
// CommuteIQ — Shared TypeScript Contract (multi-route)
// Every module (backend, settings, home, route dashboard) conforms to these.
// ============================================================================

export type TransitMode = "car" | "two-wheeler";

/** A→B is "outbound", B→A is "return". */
export type Direction = "outbound" | "return";

export type DayOfWeek =
  | "Monday"
  | "Tuesday"
  | "Wednesday"
  | "Thursday"
  | "Friday"
  | "Saturday"
  | "Sunday";

export const ALL_DAYS: DayOfWeek[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export const DAY_ABBR: Record<DayOfWeek, string> = {
  Monday: "Mon",
  Tuesday: "Tue",
  Wednesday: "Wed",
  Thursday: "Thu",
  Friday: "Fri",
  Saturday: "Sat",
  Sunday: "Sun",
};

export type CadenceMinutes = 15 | 30 | 60;

export type DateRange = "7d" | "30d" | "90d" | "all";

/**
 * A single tracked commute. Holds the outbound (A→B) schedule plus an optional
 * return (B→A) schedule with its own time window.
 */
export interface Route {
  id: string;
  /** Friendly label, e.g. "Home → Office". */
  name: string;
  startLocation: string;
  endLocation: string;
  mode: TransitMode;
  selectedDays: DayOfWeek[];
  /** Outbound (A→B) window, 24h "HH:MM". */
  checkFrom: string;
  checkUntil: string;
  cadenceMinutes: CadenceMinutes;
  /** Return-trip (B→A) tracking. */
  returnEnabled: boolean;
  returnCheckFrom: string;
  returnCheckUntil: string;
  schedulerActive: boolean;
  /** IANA timezone, e.g. "Asia/Kolkata". */
  timezone: string;
  /** ISO 8601 creation timestamp. */
  createdAt: string;
}

/** Fields a user edits when creating/updating a route (no id/createdAt). */
export type RouteForm = Omit<Route, "id" | "createdAt">;

export const DEFAULT_ROUTE_FORM: RouteForm = {
  name: "",
  startLocation: "",
  endLocation: "",
  mode: "car",
  selectedDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  checkFrom: "08:00",
  checkUntil: "10:00",
  cadenceMinutes: 30,
  returnEnabled: false,
  returnCheckFrom: "17:00",
  returnCheckUntil: "19:00",
  schedulerActive: true,
  timezone: "Asia/Kolkata",
};

/** A single traffic data point. */
export interface LogEntry {
  id: string;
  routeId: string;
  direction: Direction;
  /** ISO 8601 UTC string */
  timestamp: string;
  dayOfWeek: DayOfWeek;
  /** "HH:MM" 24h, local timezone */
  departureTime: string;
  /** seconds */
  durationInTraffic: number;
  durationInTrafficDisplay: string;
  distanceMeters: number;
  distanceDisplay: string;
  /** origin for this entry (already swapped for return entries) */
  startLocation: string;
  /** destination for this entry (already swapped for return entries) */
  endLocation: string;
  mode: TransitMode;
  /** True for generated preview/dummy data so it can be removed selectively. */
  sample?: boolean;
}

// ---------------------------------------------------------------------------
// API response shapes
// ---------------------------------------------------------------------------

export interface LogsResponse {
  entries: LogEntry[];
  count: number;
}

export interface RouteSaveResponse {
  success: boolean;
  error?: string;
  route?: Route;
}

export interface CronResult {
  executed: boolean;
  /** per-route / per-direction outcomes (cron iterates all routes) */
  results?: Array<{ routeId: string; direction: Direction; reason: string; logged: boolean }>;
  reason?: string;
}

export interface PlacesResponse {
  predictions: string[];
  source: "google" | "fallback";
}

// ---------------------------------------------------------------------------
// Analytics helper shapes
// ---------------------------------------------------------------------------

export interface RegressionResult {
  slope: number;
  intercept: number;
  n: number;
}

export interface Recommendation {
  ready: boolean;
  progressMessage?: string;
  dataPoints: number;
  distinctSlots: number;
  bestSlot?: string;
  bestMeanMinutes?: number;
  worstSlot?: string;
  worstMeanMinutes?: number;
  savingsMinutes?: number;
  daysOfData?: number;
  confidence?: "Low" | "Medium" | "High";
  summary?: string;
}
