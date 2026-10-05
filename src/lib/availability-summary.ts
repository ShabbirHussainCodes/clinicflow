import { formatClockTime, WEEKDAY_DISPLAY_ORDER, WEEKDAY_SHORT } from "@/lib/datetime";

export interface WeeklyWindow {
  weekday: number;
  start_time: string;
  end_time: string;
}

export interface SummaryLine {
  /** For example "Mon – Fri" or "Mon, Wed, Fri". */
  days: string;
  /** For example "9:00 AM – 1:00 PM". */
  hours: string;
}

/** Collapses weekdays (0 = Sunday) into Monday-first display labels such as "Mon – Fri, Sun". */
export function describeWeekdays(weekdays: readonly number[]): string {
  const wanted = new Set(weekdays);
  const ordered = WEEKDAY_DISPLAY_ORDER.filter((day) => wanted.has(day));
  if (ordered.length === 0) return "";
  if (ordered.length === 7) return "Every day";

  const runs: number[][] = [];
  for (const day of ordered) {
    const run = runs[runs.length - 1];
    const previous = run?.[run.length - 1];
    if (run && previous !== undefined && indexInWeek(day) === indexInWeek(previous) + 1)
      run.push(day);
    else runs.push([day]);
  }

  return runs
    .map((run) => {
      const firstDay = run[0];
      const lastDay = run[run.length - 1];
      if (firstDay === undefined || lastDay === undefined) return "";
      if (run.length >= 3) return `${WEEKDAY_SHORT[firstDay]} – ${WEEKDAY_SHORT[lastDay]}`;
      return run.map((day) => WEEKDAY_SHORT[day]).join(", ");
    })
    .join(", ");
}

function indexInWeek(weekday: number): number {
  return WEEKDAY_DISPLAY_ORDER.indexOf(weekday as (typeof WEEKDAY_DISPLAY_ORDER)[number]);
}

function hoursLabel(start: string, end: string): string {
  return `${formatClockTime(start)} – ${formatClockTime(end)}`;
}

/**
 * One doctor's availability grouped by identical hours, in order of first appearance in the week.
 * Example: [{ days: "Mon – Sat", hours: "9:00 AM – 1:00 PM" }, { days: "Mon, Wed, Fri", hours: "5:00 PM – 7:40 PM" }]
 */
export function summarizeDoctorAvailability(windows: readonly WeeklyWindow[]): SummaryLine[] {
  const byHours = new Map<string, { sortKey: string; weekdays: Set<number> }>();
  for (const window of windows) {
    const key = hoursLabel(window.start_time, window.end_time);
    const entry = byHours.get(key) ?? { sortKey: window.start_time, weekdays: new Set<number>() };
    entry.weekdays.add(window.weekday);
    byHours.set(key, entry);
  }
  return [...byHours.entries()]
    .sort(([, a], [, b]) => a.sortKey.localeCompare(b.sortKey))
    .map(([hours, entry]) => ({ days: describeWeekdays([...entry.weekdays]), hours }));
}

export interface TimeRange {
  /** 24-hour "HH:MM". */
  start: string;
  end: string;
}

export interface ClinicHoursRow {
  weekday: number;
  /** Merged working ranges, earliest first. Empty when no doctor works that day. */
  ranges: TimeRange[];
}

const hhmm = (clock: string) => clock.slice(0, 5);

/**
 * The clinic is "open" whenever at least one doctor is in. Overlapping or back-to-back doctor
 * windows become one range, but a real gap (for example a mid-afternoon break in which nobody is
 * in clinic) stays visible, so the published hours never promise more than the doctors' schedules.
 */
export function computeClinicHours(windows: readonly WeeklyWindow[]): ClinicHoursRow[] {
  return WEEKDAY_DISPLAY_ORDER.map((weekday) => {
    const sorted = windows
      .filter((window) => window.weekday === weekday)
      .map((window) => ({ start: hhmm(window.start_time), end: hhmm(window.end_time) }))
      .sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
    const ranges: TimeRange[] = [];
    for (const range of sorted) {
      const last = ranges[ranges.length - 1];
      if (last && range.start <= last.end) {
        if (range.end > last.end) last.end = range.end;
      } else {
        ranges.push({ ...range });
      }
    }
    return { weekday, ranges };
  });
}

/** "9:00 AM – 2:00 PM, 5:00 PM – 7:40 PM", or "Closed" when there are no ranges. */
export function describeRanges(ranges: readonly TimeRange[]): string {
  return ranges.length === 0
    ? "Closed"
    : ranges.map((range) => hoursLabel(range.start, range.end)).join(", ");
}

/** Groups consecutive identical days: "Mon – Fri  9:00 AM – 7:40 PM", "Sun  Closed". */
export function summarizeClinicHours(rows: readonly ClinicHoursRow[]): SummaryLine[] {
  const groups: { weekdays: number[]; hours: string }[] = [];
  for (const row of rows) {
    const hours = describeRanges(row.ranges);
    const last = groups[groups.length - 1];
    if (last && last.hours === hours) last.weekdays.push(row.weekday);
    else groups.push({ weekdays: [row.weekday], hours });
  }
  return groups.map((group) => ({ days: describeWeekdays(group.weekdays), hours: group.hours }));
}
