import { describe, expect, it } from "vitest";

import {
  addDays,
  dateInZone,
  formatCalendarDate,
  formatClockTime,
  formatTime,
  formatTimeRange,
  hourInZone,
  isIsoDate,
  startOfDayInZone,
  timeZoneLabel,
  todayInZone,
  trimSeconds,
  weekdayOf,
} from "@/lib/datetime";

describe("calendar date helpers", () => {
  it("validates ISO dates strictly", () => {
    expect(isIsoDate("2026-10-05")).toBe(true);
    expect(isIsoDate("2028-02-29")).toBe(true);
    expect(isIsoDate("2026-02-29")).toBe(false);
    expect(isIsoDate("2026-13-01")).toBe(false);
    expect(isIsoDate("26-10-05")).toBe(false);
    expect(isIsoDate("2026-10-05T00:00:00Z")).toBe(false);
  });

  it("adds days across month, year and leap boundaries", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-10-05", 30)).toBe("2026-11-04");
  });

  it("returns weekdays with Sunday = 0", () => {
    expect(weekdayOf("2026-10-04")).toBe(0); // Sunday
    expect(weekdayOf("2026-10-05")).toBe(1); // Monday
    expect(weekdayOf("2026-10-10")).toBe(6); // Saturday
  });

  it("throws on invalid input rather than silently shifting dates", () => {
    expect(() => addDays("nonsense", 1)).toThrow(RangeError);
  });

  it("formats calendar dates without timezone drift", () => {
    expect(formatCalendarDate("2026-10-05", "long")).toBe("Monday, 5 October 2026");
    expect(formatCalendarDate("2026-10-05", "month-day")).toBe("5 Oct");
    expect(formatCalendarDate("2026-10-05", "weekday-short")).toBe("Mon");
  });
});

describe("timezone handling", () => {
  // 20:00 UTC on 5 Oct is 01:30 on 6 Oct in India (UTC+05:30).
  const instant = "2026-10-05T20:00:00Z";

  it("resolves the calendar date in the clinic timezone", () => {
    expect(todayInZone("Asia/Kolkata", new Date(instant))).toBe("2026-10-06");
    expect(todayInZone("UTC", new Date(instant))).toBe("2026-10-05");
    expect(dateInZone(instant, "America/Los_Angeles")).toBe("2026-10-05");
  });

  it("formats times in the clinic timezone with an upper-case day period", () => {
    expect(formatTime("2026-10-05T04:50:00Z", "Asia/Kolkata")).toBe("10:20 AM");
    expect(formatTime("2026-10-05T12:30:00Z", "Asia/Kolkata")).toBe("6:00 PM");
    expect(formatTimeRange("2026-10-05T04:50:00Z", "2026-10-05T05:10:00Z", "Asia/Kolkata")).toBe(
      "10:20 AM – 10:40 AM",
    );
  });

  it("finds the hour of day in the clinic timezone", () => {
    expect(hourInZone("2026-10-05T04:50:00Z", "Asia/Kolkata")).toBe(10);
    expect(hourInZone("2026-10-05T20:00:00Z", "Asia/Kolkata")).toBe(1);
  });

  it("computes the start of a calendar day as a UTC instant", () => {
    expect(startOfDayInZone("2026-10-06", "Asia/Kolkata").toISOString()).toBe(
      "2026-10-05T18:30:00.000Z",
    );
    expect(startOfDayInZone("2026-10-06", "UTC").toISOString()).toBe("2026-10-06T00:00:00.000Z");
    // US daylight saving: 2026-03-08 is the spring-forward day in New York (UTC-5 at midnight).
    expect(startOfDayInZone("2026-03-08", "America/New_York").toISOString()).toBe(
      "2026-03-08T05:00:00.000Z",
    );
    expect(startOfDayInZone("2026-03-09", "America/New_York").toISOString()).toBe(
      "2026-03-09T04:00:00.000Z",
    );
  });

  it("names the timezone for display", () => {
    expect(timeZoneLabel("Asia/Kolkata")).toBe("India Standard Time");
  });
});

describe("clock helpers", () => {
  it("formats 24-hour clock strings", () => {
    expect(formatClockTime("09:00")).toBe("9:00 AM");
    expect(formatClockTime("12:00:00")).toBe("12:00 PM");
    expect(formatClockTime("00:30")).toBe("12:30 AM");
    expect(formatClockTime("19:40")).toBe("7:40 PM");
    expect(trimSeconds("09:00:00")).toBe("09:00");
  });
});
