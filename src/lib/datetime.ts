/**
 * Date/time helpers.
 *
 * All appointment instants are stored as UTC timestamps and shown in the clinic's configured
 * timezone. "Calendar dates" (a day with no time) are plain `YYYY-MM-DD` strings that are always
 * interpreted in the clinic timezone; they are never converted through `Date` in the browser's
 * local zone, which would shift them for visitors in other timezones.
 */

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: string): boolean {
  const match = DATE_RE.exec(value);
  if (!match) return false;
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  return (
    date.getUTCFullYear() === Number(y) &&
    date.getUTCMonth() === Number(m) - 1 &&
    date.getUTCDate() === Number(d)
  );
}

function toUtcDate(isoDate: string): Date {
  const match = DATE_RE.exec(isoDate);
  if (!match) throw new RangeError(`Invalid date: ${isoDate}`);
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function fromUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  const date = toUtcDate(isoDate);
  date.setUTCDate(date.getUTCDate() + days);
  return fromUtcDate(date);
}

/** Day of week for a calendar date: 0 = Sunday ... 6 = Saturday (matches PostgreSQL's `dow`). */
export function weekdayOf(isoDate: string): number {
  return toUtcDate(isoDate).getUTCDay();
}

export function compareDates(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** The calendar date "now" falls on in the given timezone. */
export function todayInZone(timeZone: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** Calendar date of an instant in the given timezone. */
export function dateInZone(instant: string | Date, timeZone: string): string {
  return todayInZone(timeZone, typeof instant === "string" ? new Date(instant) : instant);
}

function normaliseSpaces(value: string): string {
  // Newer ICU versions insert a narrow no-break space before AM/PM.
  return value.replace(/[  ]/g, " ");
}

function upperDayPeriod(value: string): string {
  return value.replace(/\b(am|pm)\b/gi, (match) => match.toUpperCase());
}

export function formatTime(instant: string | Date, timeZone: string): string {
  const text = new Intl.DateTimeFormat("en-IN", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(typeof instant === "string" ? new Date(instant) : instant);
  return upperDayPeriod(normaliseSpaces(text));
}

/** "Mon, 12 Oct 2026" */
export function formatDate(instant: string | Date, timeZone: string): string {
  return normaliseSpaces(
    new Intl.DateTimeFormat("en-IN", {
      timeZone,
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(typeof instant === "string" ? new Date(instant) : instant),
  );
}

/** "Monday, 12 October 2026" */
export function formatDateLong(instant: string | Date, timeZone: string): string {
  return normaliseSpaces(
    new Intl.DateTimeFormat("en-IN", {
      timeZone,
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(typeof instant === "string" ? new Date(instant) : instant),
  );
}

/** Formats a `YYYY-MM-DD` calendar date without any timezone conversion. */
export function formatCalendarDate(
  isoDate: string,
  style: "short" | "long" | "weekday-short" | "month-day" = "short",
): string {
  const date = toUtcDate(isoDate);
  const options: Intl.DateTimeFormatOptions =
    style === "long"
      ? { weekday: "long", day: "numeric", month: "long", year: "numeric" }
      : style === "weekday-short"
        ? { weekday: "short" }
        : style === "month-day"
          ? { day: "numeric", month: "short" }
          : { weekday: "short", day: "numeric", month: "short", year: "numeric" };
  return normaliseSpaces(
    new Intl.DateTimeFormat("en-IN", { ...options, timeZone: "UTC" }).format(date),
  );
}

export function formatDateTime(instant: string | Date, timeZone: string): string {
  return `${formatDate(instant, timeZone)}, ${formatTime(instant, timeZone)}`;
}

export function formatTimeRange(
  start: string | Date,
  end: string | Date,
  timeZone: string,
): string {
  return `${formatTime(start, timeZone)} – ${formatTime(end, timeZone)}`;
}

/** "09:00" / "09:00:00" -> "9:00 AM" */
export function formatClockTime(clock: string): string {
  const [hh = "0", mm = "0"] = clock.split(":");
  const hours = Number(hh);
  const minutes = Number(mm);
  const period = hours >= 12 && hours < 24 ? "PM" : "AM";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${String(minutes).padStart(2, "0")} ${period}`;
}

/** "09:00:00" -> "09:00" (value for <input type="time">) */
export function trimSeconds(clock: string): string {
  return clock.slice(0, 5);
}

export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Monday-first display order for weekdays (indices into the 0 = Sunday scheme). */
export const WEEKDAY_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

/** The UTC instant at which a calendar date begins in the given timezone. */
export function startOfDayInZone(isoDate: string, timeZone: string): Date {
  // Find the offset of the zone at (approximately) that moment, then correct once to handle DST edges.
  const guess = new Date(`${isoDate}T00:00:00Z`);
  const offset = zoneOffsetMinutes(guess, timeZone);
  const corrected = new Date(guess.getTime() - offset * 60_000);
  const offsetAfter = zoneOffsetMinutes(corrected, timeZone);
  return offsetAfter === offset ? corrected : new Date(guess.getTime() - offsetAfter * 60_000);
}

function zoneOffsetMinutes(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return Math.round((asUtc - instant.getTime()) / 60_000);
}

/** Hour of day (0-23) of an instant in the given timezone. */
export function hourInZone(instant: string | Date, timeZone: string): number {
  const text = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "numeric",
    hourCycle: "h23",
  }).format(typeof instant === "string" ? new Date(instant) : instant);
  return Number(text);
}

/** "India Standard Time" for "Asia/Kolkata". */
export function timeZoneLabel(timeZone: string, now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-IN", { timeZone, timeZoneName: "long" }).formatToParts(
    now,
  );
  return parts.find((part) => part.type === "timeZoneName")?.value ?? timeZone;
}

/**
 * Current time in epoch milliseconds. Server Components call this instead of Date.now() directly:
 * they render once per request, so reading the clock is correct there, and routing it through one
 * function keeps the intent explicit (and testable).
 */
export function nowMs(): number {
  return Date.now();
}
