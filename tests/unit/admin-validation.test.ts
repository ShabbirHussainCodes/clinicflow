import { describe, expect, it } from "vitest";

import {
  ALLOWED_TRANSITIONS,
  APPOINTMENT_STATUSES,
  blockedDateSchema,
  breakSchema,
  canTransition,
  parseAppointmentFilters,
  scheduleSchema,
  statusChangeSchema,
} from "@/lib/validation/admin";

const doctorId = "6f1c3c52-0a3a-4a45-9e4d-6a3a8d2b1c11";

describe("status transitions", () => {
  it("allows the documented moves and nothing else", () => {
    expect(canTransition("pending", "confirmed")).toBe(true);
    expect(canTransition("pending", "cancelled")).toBe(true);
    expect(canTransition("confirmed", "completed")).toBe(true);
    expect(canTransition("confirmed", "no_show")).toBe(true);
    expect(canTransition("confirmed", "pending")).toBe(false);
    expect(canTransition("pending", "pending")).toBe(false);
  });

  it("treats completed, cancelled and no-show as final", () => {
    for (const status of ["completed", "cancelled", "no_show"] as const) {
      expect(ALLOWED_TRANSITIONS[status]).toEqual([]);
    }
  });

  it("only offers known statuses", () => {
    for (const from of APPOINTMENT_STATUSES) {
      for (const to of ALLOWED_TRANSITIONS[from]) expect(APPOINTMENT_STATUSES).toContain(to);
    }
  });

  it("validates status change requests", () => {
    expect(
      statusChangeSchema.safeParse({ appointmentId: doctorId, status: "confirmed" }).success,
    ).toBe(true);
    expect(
      statusChangeSchema.safeParse({ appointmentId: doctorId, status: "deleted" }).success,
    ).toBe(false);
    expect(statusChangeSchema.safeParse({ appointmentId: "x", status: "confirmed" }).success).toBe(
      false,
    );
    expect(
      statusChangeSchema.safeParse({
        appointmentId: doctorId,
        status: "cancelled",
        note: "x".repeat(301),
      }).success,
    ).toBe(false);
  });
});

describe("scheduleSchema", () => {
  const base = { doctorId, slotMinutes: 20 };

  it("accepts split-shift days", () => {
    const result = scheduleSchema.safeParse({
      ...base,
      windows: [
        { weekday: 1, start: "09:00", end: "13:00" },
        { weekday: 1, start: "17:00", end: "19:40" },
        { weekday: 2, start: "09:00", end: "13:00" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects overlapping windows on the same day only", () => {
    const overlapping = scheduleSchema.safeParse({
      ...base,
      windows: [
        { weekday: 1, start: "09:00", end: "13:00" },
        { weekday: 1, start: "12:00", end: "15:00" },
      ],
    });
    expect(overlapping.success).toBe(false);

    const differentDays = scheduleSchema.safeParse({
      ...base,
      windows: [
        { weekday: 1, start: "09:00", end: "13:00" },
        { weekday: 2, start: "12:00", end: "15:00" },
      ],
    });
    expect(differentDays.success).toBe(true);
  });

  it("allows windows that touch end-to-start", () => {
    expect(
      scheduleSchema.safeParse({
        ...base,
        windows: [
          { weekday: 1, start: "09:00", end: "13:00" },
          { weekday: 1, start: "13:00", end: "15:00" },
        ],
      }).success,
    ).toBe(true);
  });

  it("rejects end before start, bad clock values and bad slot lengths", () => {
    expect(
      scheduleSchema.safeParse({ ...base, windows: [{ weekday: 1, start: "13:00", end: "09:00" }] })
        .success,
    ).toBe(false);
    expect(
      scheduleSchema.safeParse({ ...base, windows: [{ weekday: 1, start: "25:00", end: "26:00" }] })
        .success,
    ).toBe(false);
    expect(scheduleSchema.safeParse({ ...base, slotMinutes: 17, windows: [] }).success).toBe(false);
    expect(scheduleSchema.safeParse({ ...base, slotMinutes: 0, windows: [] }).success).toBe(false);
    expect(
      scheduleSchema.safeParse({ ...base, windows: [{ weekday: 7, start: "09:00", end: "10:00" }] })
        .success,
    ).toBe(false);
  });

  it("allows a doctor with no working days", () => {
    expect(scheduleSchema.safeParse({ ...base, windows: [] }).success).toBe(true);
  });
});

describe("breakSchema and blockedDateSchema", () => {
  it("validates breaks", () => {
    expect(
      breakSchema.safeParse({
        doctorId,
        weekday: "all",
        start: "13:00",
        end: "14:00",
        label: "Lunch",
      }).success,
    ).toBe(true);
    expect(
      breakSchema.safeParse({
        doctorId,
        weekday: "3",
        start: "13:00",
        end: "14:00",
        label: "Lunch",
      }).success,
    ).toBe(true);
    expect(
      breakSchema.safeParse({
        doctorId,
        weekday: "all",
        start: "14:00",
        end: "13:00",
        label: "Lunch",
      }).success,
    ).toBe(false);
    expect(
      breakSchema.safeParse({ doctorId, weekday: "all", start: "13:00", end: "14:00", label: " " })
        .success,
    ).toBe(false);
  });

  it("validates blocked date ranges", () => {
    const ok = {
      doctorId: "clinic",
      startDate: "2026-10-12",
      endDate: "2026-10-14",
      kind: "holiday",
      reason: "Festival",
    };
    expect(blockedDateSchema.safeParse(ok).success).toBe(true);
    expect(blockedDateSchema.safeParse({ ...ok, endDate: "2026-10-11" }).success).toBe(false);
    expect(blockedDateSchema.safeParse({ ...ok, startDate: "12/10/2026" }).success).toBe(false);
    expect(blockedDateSchema.safeParse({ ...ok, endDate: "2028-10-14" }).success).toBe(false);
    expect(blockedDateSchema.safeParse({ ...ok, doctorId }).success).toBe(true);
    expect(blockedDateSchema.safeParse({ ...ok, kind: "vacation" }).success).toBe(false);
  });
});

describe("parseAppointmentFilters", () => {
  it("falls back to safe defaults for junk input", () => {
    expect(
      parseAppointmentFilters({
        status: "hacked",
        doctor: "not-a-uuid",
        from: "2026-99-99",
        sort: "drop",
        page: "-4",
      }),
    ).toEqual({
      q: "",
      status: "",
      doctor: "",
      service: "",
      from: "",
      to: "",
      sort: "start_asc",
      page: 1,
    });
  });

  it("keeps valid values and takes the first of repeated parameters", () => {
    const parsed = parseAppointmentFilters({
      q: ["  priya  ", "ignored"],
      status: "pending",
      doctor: doctorId,
      from: "2026-10-05",
      to: "2026-10-12",
      sort: "created_desc",
      page: "3",
    });
    expect(parsed).toMatchObject({
      q: "priya",
      status: "pending",
      doctor: doctorId,
      from: "2026-10-05",
      sort: "created_desc",
      page: 3,
    });
  });

  it("limits the search string length", () => {
    expect(parseAppointmentFilters({ q: "x".repeat(500) }).q).toHaveLength(100);
  });
});
