import type { DayOfWeek } from "@/types";

/** Shared day-series color palette used across charts and selectors. */
export const DAY_COLORS: Record<DayOfWeek, string> = {
  Monday: "#2563EB",
  Tuesday: "#10B981",
  Wednesday: "#F59E0B",
  Thursday: "#8B5CF6",
  Friday: "#EC4899",
  Saturday: "#14B8A6",
  Sunday: "#F97316",
};

/** Color for the combined "All days" averaged series. */
export const ALL_DAYS_COLOR = "#2563EB";
