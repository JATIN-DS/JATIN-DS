import type { Direction, Route } from "@/types";
import { getLocalDayOfWeek, minutesSinceMidnightInZone } from "@/lib/timezone";

function hhmmToMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Grace window (minutes) subtracted from a route's cadence when checking
 * whether enough time has elapsed. The scheduler "ticks" at the finest UI
 * cadence (15 min), and ticks can arrive a few seconds early relative to the
 * exact interval. Without this grace, a 15-min route could measure ~14.97 min
 * since its last run and skip the slot, effectively halving its frequency.
 * Kept well below the smallest cadence step (15 min) so a slower route never
 * fires on the wrong tick.
 */
const CADENCE_GRACE_MIN = 2;

/**
 * Decide whether a scheduled check should run now for a route + direction.
 * Outbound uses checkFrom/checkUntil; return uses returnCheckFrom/returnCheckUntil
 * (and only when returnEnabled). Returns the first failing reason.
 */
export function evaluateSchedule(
  route: Route,
  direction: Direction,
  lastCheckedISO: string | null,
  now: Date
): { shouldRun: boolean; reason: string } {
  if (!route.schedulerActive) {
    return { shouldRun: false, reason: "Scheduler paused" };
  }

  if (direction === "return" && !route.returnEnabled) {
    return { shouldRun: false, reason: "Return tracking disabled" };
  }

  const localDay = getLocalDayOfWeek(now, route.timezone);
  if (!route.selectedDays.includes(localDay)) {
    return { shouldRun: false, reason: "Day not selected" };
  }

  const nowMin = minutesSinceMidnightInZone(now, route.timezone);
  const fromMin = hhmmToMinutes(direction === "outbound" ? route.checkFrom : route.returnCheckFrom);
  const untilMin = hhmmToMinutes(
    direction === "outbound" ? route.checkUntil : route.returnCheckUntil
  );
  if (nowMin < fromMin || nowMin > untilMin) {
    return { shouldRun: false, reason: "Outside time window" };
  }

  if (lastCheckedISO) {
    const elapsedMin = (now.getTime() - new Date(lastCheckedISO).getTime()) / 60000;
    if (elapsedMin < route.cadenceMinutes - CADENCE_GRACE_MIN) {
      return { shouldRun: false, reason: "Cadence not elapsed" };
    }
  }

  return { shouldRun: true, reason: "Conditions met" };
}
