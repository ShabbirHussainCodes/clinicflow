import { describe, expect, it } from "vitest";

import { computeClinicHours } from "@/lib/availability-summary";
import { getOpenStatus } from "@/lib/open-status";

const w = (weekday: number, start_time: string, end_time: string) => ({
  weekday,
  start_time,
  end_time,
});

// Monday and Wednesday: 9-2 and 5-7:40. Friday: 9-1. Every other day closed.
const rows = computeClinicHours([
  w(1, "09:00", "14:00"),
  w(1, "17:00", "19:40"),
  w(3, "09:00", "14:00"),
  w(3, "17:00", "19:40"),
  w(5, "09:00", "13:00"),
]);
const timeZone = "Asia/Kolkata";

/** An instant expressed as India Standard Time (UTC+05:30). 2026-10-05 is a Monday. */
const ist = (date: string, time: string) => new Date(`${date}T${time}:00+05:30`);

describe("getOpenStatus", () => {
  it("says open now with the closing time of the current range", () => {
    expect(
      getOpenStatus({ rows, closures: [], timeZone, now: ist("2026-10-05", "10:15") }),
    ).toEqual({
      isOpen: true,
      label: "Open now",
      detail: "until 2:00 PM",
    });
  });

  it("says when the clinic reopens later the same day", () => {
    expect(
      getOpenStatus({ rows, closures: [], timeZone, now: ist("2026-10-05", "15:30") }),
    ).toEqual({
      isOpen: false,
      label: "Closed now",
      detail: "opens 5:00 PM today",
    });
  });

  it("treats the closing minute as closed and the opening minute as open", () => {
    expect(
      getOpenStatus({ rows, closures: [], timeZone, now: ist("2026-10-05", "14:00") })?.isOpen,
    ).toBe(false);
    expect(
      getOpenStatus({ rows, closures: [], timeZone, now: ist("2026-10-05", "09:00") })?.isOpen,
    ).toBe(true);
  });

  it("looks to the next open day after closing time", () => {
    expect(
      getOpenStatus({ rows, closures: [], timeZone, now: ist("2026-10-05", "21:00") }),
    ).toEqual({
      isOpen: false,
      label: "Closed now",
      detail: "opens Wed 9:00 AM",
    });
    expect(
      getOpenStatus({ rows, closures: [], timeZone, now: ist("2026-10-07", "21:00") }),
    ).toEqual({
      isOpen: false,
      label: "Closed now",
      detail: "opens Fri 9:00 AM",
    });
    // Tuesday is closed all day, so the next opening is Wednesday = "tomorrow" from Tuesday.
    expect(
      getOpenStatus({ rows, closures: [], timeZone, now: ist("2026-10-06", "12:00") }),
    ).toEqual({
      isOpen: false,
      label: "Closed now",
      detail: "opens tomorrow 9:00 AM",
    });
  });

  it("skips a clinic-wide closure", () => {
    const closures = [{ startDate: "2026-10-05", endDate: "2026-10-07" }];
    expect(getOpenStatus({ rows, closures, timeZone, now: ist("2026-10-05", "10:15") })).toEqual({
      isOpen: false,
      label: "Closed now",
      detail: "opens Fri 9:00 AM",
    });
  });

  it("uses the clinic timezone, not the server's", () => {
    // 04:00 UTC on Monday is 09:30 in India, so the clinic is open.
    expect(
      getOpenStatus({ rows, closures: [], timeZone, now: new Date("2026-10-05T04:00:00Z") })
        ?.isOpen,
    ).toBe(true);
    // The same instant is still Sunday evening in Los Angeles.
    expect(
      getOpenStatus({
        rows,
        closures: [],
        timeZone: "America/Los_Angeles",
        now: new Date("2026-10-05T04:00:00Z"),
      })?.isOpen,
    ).toBe(false);
  });

  it("returns null when there are no published hours", () => {
    expect(
      getOpenStatus({
        rows: computeClinicHours([]),
        closures: [],
        timeZone,
        now: ist("2026-10-05", "10:15"),
      }),
    ).toBeNull();
  });
});
