import type { ClinicHoursRow } from "@/lib/availability-summary";
import { addDays, formatClockTime, todayInZone, weekdayOf, WEEKDAY_SHORT } from "@/lib/datetime";

export interface OpenStatus {
  isOpen: boolean;
  /** "Open now" or "Closed now". */
  label: string;
  /** "until 2:00 PM", "opens 5:00 PM today", "opens tomorrow 9:00 AM" or "opens Mon 9:00 AM". */
  detail: string;
}

export interface ClosureRange {
  startDate: string;
  endDate: string;
}

function minutesOf(clock: string): number {
  const [hours = "0", minutes = "0"] = clock.split(":");
  return Number(hours) * 60 + Number(minutes);
}

function minutesNowInZone(now: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");
  return get("hour") * 60 + get("minute");
}

/**
 * Whether the clinic (that is, at least one doctor) is in right now, in the clinic's own timezone,
 * and when that next changes. Clinic-wide closures (holidays) count as closed. Returns null when
 * the clinic has no published hours in the next two weeks, so the page simply shows nothing.
 */
export function getOpenStatus({
  rows,
  closures,
  timeZone,
  now,
}: {
  rows: readonly ClinicHoursRow[];
  closures: readonly ClosureRange[];
  timeZone: string;
  now: Date;
}): OpenStatus | null {
  const today = todayInZone(timeZone, now);
  const rangesOn = (date: string) => {
    if (closures.some((closure) => closure.startDate <= date && date <= closure.endDate)) return [];
    return rows.find((row) => row.weekday === weekdayOf(date))?.ranges ?? [];
  };

  const minutes = minutesNowInZone(now, timeZone);
  const todayRanges = rangesOn(today);

  const current = todayRanges.find(
    (range) => minutesOf(range.start) <= minutes && minutes < minutesOf(range.end),
  );
  if (current) {
    return { isOpen: true, label: "Open now", detail: `until ${formatClockTime(current.end)}` };
  }

  const later = todayRanges.find((range) => minutesOf(range.start) > minutes);
  if (later) {
    return {
      isOpen: false,
      label: "Closed now",
      detail: `opens ${formatClockTime(later.start)} today`,
    };
  }

  for (let offset = 1; offset <= 14; offset += 1) {
    const date = addDays(today, offset);
    const first = rangesOn(date)[0];
    if (first) {
      const when = offset === 1 ? "tomorrow" : WEEKDAY_SHORT[weekdayOf(date)];
      return {
        isOpen: false,
        label: "Closed now",
        detail: `opens ${when} ${formatClockTime(first.start)}`,
      };
    }
  }
  return null;
}
