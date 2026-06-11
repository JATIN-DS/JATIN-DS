import { formatInTimeZone } from "date-fns-tz";
import type { DayOfWeek } from "@/types";

/** Weekday name (e.g. "Monday") for `date` as observed in the given IANA tz. */
export function getLocalDayOfWeek(date: Date, timeZone: string): DayOfWeek {
  return formatInTimeZone(date, timeZone, "EEEE") as DayOfWeek;
}

/** "HH:MM" 24h representation of `date` in the given IANA tz. */
export function getLocalHHMM(date: Date, timeZone: string): string {
  return formatInTimeZone(date, timeZone, "HH:mm");
}

/** Minutes elapsed since local midnight in the given IANA tz. */
export function minutesSinceMidnightInZone(date: Date, timeZone: string): number {
  const hhmm = formatInTimeZone(date, timeZone, "HH:mm");
  const [hours, minutes] = hhmm.split(":").map(Number);
  return hours * 60 + minutes;
}
