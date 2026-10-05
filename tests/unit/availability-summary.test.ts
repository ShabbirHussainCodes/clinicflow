import { describe, expect, it } from "vitest";

import {
  computeClinicHours,
  describeRanges,
  describeWeekdays,
  summarizeClinicHours,
  summarizeDoctorAvailability,
} from "@/lib/availability-summary";

const w = (weekday: number, start_time: string, end_time: string) => ({
  weekday,
  start_time,
  end_time,
});

describe("describeWeekdays", () => {
  it("collapses runs of three or more days", () => {
    expect(describeWeekdays([1, 2, 3, 4, 5])).toBe("Mon – Fri");
    expect(describeWeekdays([1, 2, 3, 4, 5, 6])).toBe("Mon – Sat");
  });
  it("lists pairs and gaps individually", () => {
    expect(describeWeekdays([1, 2])).toBe("Mon, Tue");
    expect(describeWeekdays([1, 3, 5])).toBe("Mon, Wed, Fri");
    expect(describeWeekdays([2, 4, 6])).toBe("Tue, Thu, Sat");
  });
  it("treats Sunday as the end of the week", () => {
    expect(describeWeekdays([5, 6, 0])).toBe("Fri – Sun");
    expect(describeWeekdays([1, 2, 3, 4, 5, 6, 0])).toBe("Every day");
    expect(describeWeekdays([0])).toBe("Sun");
  });
  it("returns an empty string for no days", () => {
    expect(describeWeekdays([])).toBe("");
  });
});

describe("summarizeDoctorAvailability", () => {
  it("groups days that share the same hours", () => {
    const lines = summarizeDoctorAvailability([
      w(1, "09:00:00", "13:00:00"),
      w(2, "09:00:00", "13:00:00"),
      w(3, "09:00:00", "13:00:00"),
      w(1, "17:00:00", "19:40:00"),
      w(3, "17:00:00", "19:40:00"),
    ]);
    expect(lines).toEqual([
      { days: "Mon – Wed", hours: "9:00 AM – 1:00 PM" },
      { days: "Mon, Wed", hours: "5:00 PM – 7:40 PM" },
    ]);
  });
  it("returns nothing for a doctor without hours", () => {
    expect(summarizeDoctorAvailability([])).toEqual([]);
  });
});

describe("clinic hours", () => {
  it("merges overlapping and back-to-back windows but keeps a real gap", () => {
    const rows = computeClinicHours([
      w(1, "10:00:00", "14:00:00"),
      w(1, "09:00:00", "13:00:00"),
      w(1, "17:00:00", "19:40:00"),
      w(1, "14:00:00", "15:00:00"),
      w(0, "10:00:00", "13:00:00"),
    ]);
    expect(rows.find((row) => row.weekday === 1)).toEqual({
      weekday: 1,
      ranges: [
        { start: "09:00", end: "15:00" },
        { start: "17:00", end: "19:40" },
      ],
    });
    expect(rows.find((row) => row.weekday === 2)).toEqual({ weekday: 2, ranges: [] });
  });

  it("lists days Monday first", () => {
    const rows = computeClinicHours([]);
    expect(rows.map((row) => row.weekday)).toEqual([1, 2, 3, 4, 5, 6, 0]);
  });

  it("describes ranges for display", () => {
    expect(
      describeRanges([
        { start: "09:00", end: "14:00" },
        { start: "17:00", end: "19:40" },
      ]),
    ).toBe("9:00 AM – 2:00 PM, 5:00 PM – 7:40 PM");
    expect(describeRanges([])).toBe("Closed");
  });

  it("groups consecutive identical days", () => {
    const rows = computeClinicHours([1, 2, 3, 4, 5].map((day) => w(day, "09:00", "17:00")));
    expect(summarizeClinicHours(rows)).toEqual([
      { days: "Mon – Fri", hours: "9:00 AM – 5:00 PM" },
      { days: "Sat, Sun", hours: "Closed" },
    ]);
  });
});
