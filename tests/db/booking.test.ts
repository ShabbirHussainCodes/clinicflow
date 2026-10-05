import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  book,
  createFixture,
  dbAvailable,
  destroyFixture,
  expectSqlState,
  inRollback,
  nextPhone,
  one,
  pool,
  rows,
  slotTimes,
  startOf,
  type Fixture,
} from "./helpers";

const available = await dbAvailable();

describe.skipIf(!available)("booking", () => {
  let f: Fixture;

  beforeAll(async () => {
    f = await createFixture();
  });
  afterAll(async () => {
    await destroyFixture(f);
    await pool.end();
  });

  it("creates a pending appointment with a non-guessable reference and normalised data", async () => {
    const date = await f.day(2);
    const start = await startOf(date, "09:00");
    const result = await book(f, start, {
      name: "  DBTEST   Priya  Nair ",
      phone: "+919876543210",
      email: "  priya@example.com ",
      age: "31-45",
      reason: " Routine check-up ",
    });
    expect(result.ok).toBe(true);
    expect(result.reference).toMatch(/^CF-[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/);

    const row = await one<Record<string, unknown>>(
      `select status, patient_name, patient_phone, patient_email, age_range, visit_reason, consent_given, source,
              start_at::text, end_at::text, (end_at - start_at)::text as length
       from appointments where reference = $1`,
      [result.reference],
    );
    expect(row).toMatchObject({
      status: "pending",
      patient_name: "DBTEST   Priya  Nair",
      patient_phone: "+919876543210",
      patient_email: "priya@example.com",
      age_range: "31-45",
      visit_reason: "Routine check-up",
      consent_given: true,
      source: "web",
      length: "00:30:00",
    });
  });

  it("stores optional fields as null when blank", async () => {
    const start = await startOf(await f.day(2), "09:30");
    const result = await book(f, start, { email: "  ", age: "", reason: "" });
    expect(result.ok).toBe(true);
    const row = await one(
      `select patient_email, age_range, visit_reason from appointments where reference = $1`,
      [result.reference],
    );
    expect(row).toEqual({ patient_email: null, age_range: null, visit_reason: null });
  });

  it("refuses to book a slot that is already taken", async () => {
    const start = await startOf(await f.day(3), "10:00");
    expect((await book(f, start)).ok).toBe(true);
    expect(await book(f, start)).toEqual({ ok: false, error: "slot_unavailable" });
  });

  it("refuses times that are not genuinely offered", async () => {
    const date = await f.day(3);
    const cases: [string, string][] = [
      ["off the slot grid", await startOf(date, "10:10")],
      ["before opening hours", await startOf(date, "08:30")],
      ["after closing", await startOf(date, "12:00")],
      ["yesterday", await startOf(await f.day(-1), "10:00")],
      ["beyond the booking window", await startOf(await f.day(31), "10:00")],
    ];
    for (const [label, start] of cases) {
      expect(await book(f, start), label).toEqual({ ok: false, error: "slot_unavailable" });
    }

    const breakRow = await one<{ id: string }>(
      `insert into doctor_breaks (doctor_id, weekday, start_time, end_time, label) values ($1, null, '11:00', '11:30', 'Tea') returning id`,
      [f.doctorId],
    );
    try {
      expect(await book(f, await startOf(date, "11:00")), "during a break").toEqual({
        ok: false,
        error: "slot_unavailable",
      });
    } finally {
      await pool.query(`delete from doctor_breaks where id = $1`, [breakRow.id]);
    }

    const blocked = await one<{ id: string }>(
      `insert into blocked_dates (doctor_id, start_date, end_date, kind, reason) values ($1, $2, $2, 'unavailable', $3) returning id`,
      [f.doctorId, await f.day(4), `${f.tag} x`],
    );
    try {
      expect(await book(f, await startOf(await f.day(4), "10:00")), "on a blocked date").toEqual({
        ok: false,
        error: "slot_unavailable",
      });
    } finally {
      await pool.query(`delete from blocked_dates where id = $1`, [blocked.id]);
    }
  });

  it("refuses an unknown doctor or service without leaking details", async () => {
    const start = await startOf(await f.day(5), "10:00");
    const result = await pool.query(
      `select public.book_appointment(gen_random_uuid(), $1, $2::timestamptz, 'DBTEST X', $3, null, null, null, true) as r`,
      [f.serviceId, start, nextPhone()],
    );
    expect(result.rows[0].r).toEqual({ ok: false, error: "slot_unavailable" });
  });

  it("validates input independently of the application", async () => {
    const start = await startOf(await f.day(5), "09:00");
    const bad: [string, Parameters<typeof book>[2], string][] = [
      ["short name", { name: "A" }, "patient_name"],
      ["bad phone", { phone: "12345" }, "patient_phone"],
      ["phone without plus", { phone: "919876543210" }, "patient_phone"],
      ["bad email", { email: "nope" }, "patient_email"],
      ["bad age", { age: "200" }, "age_range"],
      ["long reason", { reason: "x".repeat(301) }, "visit_reason"],
      ["no consent", { consent: false }, "consent"],
    ];
    for (const [label, options, field] of bad) {
      expect(await book(f, start, options), label).toEqual({
        ok: false,
        error: "invalid_input",
        field,
      });
    }
    // None of the invalid attempts reserved the slot.
    expect((await slotTimes(f, await f.day(5))).includes("09:00")).toBe(true);
  });

  it("limits active upcoming bookings per mobile number", async () => {
    const phone = nextPhone();
    const date = await f.day(6);
    expect((await book(f, await startOf(date, "09:00"), { phone })).ok).toBe(true);
    expect((await book(f, await startOf(date, "09:30"), { phone })).ok).toBe(true);
    expect((await book(f, await startOf(date, "10:00"), { phone })).ok).toBe(true);
    expect(await book(f, await startOf(date, "10:30"), { phone })).toEqual({
      ok: false,
      error: "too_many_bookings",
    });

    // Cancelling one frees capacity for that number.
    await pool.query(
      `update appointments set status = 'cancelled' where id = (select id from appointments where patient_phone = $1 order by start_at limit 1)`,
      [phone],
    );
    expect((await book(f, await startOf(date, "10:30"), { phone })).ok).toBe(true);
  });

  describe("concurrency", () => {
    it("lets exactly one of many simultaneous requests win the same slot", async () => {
      const start = await startOf(await f.day(7), "09:00");
      const attempts = 25;
      const results = await Promise.all(
        Array.from({ length: attempts }, () => book(f, start, { name: "DBTEST Racer" })),
      );
      expect(results.filter((r) => r.ok)).toHaveLength(1);
      expect(results.filter((r) => !r.ok && r.error === "slot_unavailable")).toHaveLength(
        attempts - 1,
      );

      const active = await one<{ n: string }>(
        `select count(*)::text as n from appointments where doctor_id = $1 and start_at = $2::timestamptz and status in ('pending','confirmed')`,
        [f.doctorId, start],
      );
      expect(active.n).toBe("1");
    });

    it("never double-books when requests overlap but start at different times", async () => {
      const date = await f.day(8);
      const starts = await Promise.all(
        ["09:00", "09:30", "10:00", "10:30", "11:00"].map((t) => startOf(date, t)),
      );
      // Mix 30-minute and 60-minute visits so many requests partially overlap each other.
      const attempts = starts.flatMap((start) => [
        book(f, start, { serviceId: f.serviceId, name: "DBTEST Mix" }),
        book(f, start, { serviceId: f.longServiceId, name: "DBTEST Mix" }),
        book(f, start, { serviceId: f.serviceId, name: "DBTEST Mix" }),
      ]);
      await Promise.all(attempts);

      const overlaps = await one<{ n: string }>(
        `select count(*)::text as n
         from appointments a join appointments b
           on a.doctor_id = b.doctor_id and a.id < b.id
          and tstzrange(a.start_at, a.end_at, '[)') && tstzrange(b.start_at, b.end_at, '[)')
         where a.doctor_id = $1 and a.status in ('pending','confirmed') and b.status in ('pending','confirmed')`,
        [f.doctorId],
      );
      expect(overlaps.n).toBe("0");
    });

    it("lets different slots be booked in parallel", async () => {
      const date = await f.day(9);
      const times = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"];
      const results = await Promise.all(times.map(async (t) => book(f, await startOf(date, t))));
      expect(results.every((r) => r.ok)).toBe(true);
      expect(await slotTimes(f, date)).toEqual([]);
    });

    it("is protected by the database even when the booking function is bypassed", async () => {
      const start = await startOf(await f.day(10), "09:00");
      const insert = `insert into appointments (doctor_id, service_id, start_at, end_at, patient_name, patient_phone, consent_given)
                      values ($1, $2, $3::timestamptz, $3::timestamptz + interval '30 minutes', 'DBTEST Direct', $4, true)`;
      const outcomes = await Promise.allSettled(
        Array.from({ length: 6 }, () =>
          pool.query(insert, [f.doctorId, f.serviceId, start, nextPhone()]),
        ),
      );
      expect(outcomes.filter((o) => o.status === "fulfilled")).toHaveLength(1);
      for (const outcome of outcomes) {
        // Losers fail with an exclusion violation, or are aborted as a deadlock victim when several
        // raw inserts race for the same range. Either way no second row is created.
        if (outcome.status === "rejected")
          expect(["23P01", "40P01"]).toContain((outcome.reason as { code?: string }).code);
      }
    });
  });

  describe("constraints", () => {
    it("lets a cancelled, completed or no-show appointment coexist with a new one in the same time", async () => {
      const start = await startOf(await f.day(11), "09:00");
      for (const status of ["cancelled", "completed", "no_show"]) {
        const first = await book(f, start);
        expect(first.ok, status).toBe(true);
        await pool.query(`update appointments set status = $2 where reference = $1`, [
          first.reference,
          status,
        ]);
      }
      expect((await book(f, start)).ok).toBe(true);
    });

    it("rejects malformed rows inserted directly", async () => {
      await inRollback(async (client) => {
        // end_at must be after start_at
        await expectSqlState(
          client,
          `insert into appointments (doctor_id, service_id, start_at, end_at, patient_name, patient_phone, consent_given)
           values ($1, $2, now() + interval '30 days', now() + interval '30 days', 'DBTEST A', '+919876543210', true)`,
          "23514",
          [f.doctorId, f.serviceId],
        );
        await expectSqlState(
          client,
          `insert into appointments (doctor_id, service_id, start_at, end_at, patient_name, patient_phone, consent_given)
           values ($1, $2, now() + interval '30 days', now() + interval '31 days', 'DBTEST A', 'not-a-phone', true)`,
          "23514",
          [f.doctorId, f.serviceId],
        );
        await expectSqlState(
          client,
          `insert into appointments (doctor_id, service_id, start_at, end_at, patient_name, patient_phone, consent_given)
           values ($1, $2, now() + interval '30 days', now() + interval '31 days', 'DBTEST A', '+919876543210', false)`,
          "23514",
          [f.doctorId, f.serviceId],
        );
        await expectSqlState(
          client,
          `insert into appointments (doctor_id, service_id, start_at, end_at, patient_name, patient_phone, consent_given, status)
           values ($1, $2, now() + interval '30 days', now() + interval '31 days', 'DBTEST A', '+919876543210', true, 'bogus')`,
          "23514",
          [f.doctorId, f.serviceId],
        );
      });
    });

    it("rejects overlapping weekly windows and inverted times", async () => {
      await inRollback(async (client) => {
        // The fixture already works 09:00-12:00 every day; an overlapping window must be refused.
        await expectSqlState(
          client,
          `insert into doctor_availability (doctor_id, weekday, start_time, end_time) values ($1, 1, '11:00', '13:00')`,
          "23P01",
          [f.doctorId],
        );
        await expectSqlState(
          client,
          `insert into doctor_availability (doctor_id, weekday, start_time, end_time) values ($1, 1, '15:00', '14:00')`,
          "23514",
          [f.doctorId],
        );
        await expectSqlState(
          client,
          `insert into doctor_breaks (doctor_id, weekday, start_time, end_time, label) values ($1, 9, '10:00', '11:00', 'x')`,
          "23514",
          [f.doctorId],
        );
        await expectSqlState(
          client,
          `insert into blocked_dates (doctor_id, start_date, end_date) values ($1, '2026-10-10', '2026-10-09')`,
          "23514",
          [f.doctorId],
        );
      });
    });

    it("keeps exactly one clinic row and validates the timezone", async () => {
      await inRollback(async (client) => {
        await expectSqlState(
          client,
          `insert into clinics (name, phone, email, address_line1, city, state, postal_code) values ('Second', '123456', 'a@b.co', 'x', 'y', 'z', '1')`,
          "23505",
        );
        await expectSqlState(client, `update clinics set timezone = 'Mars/Olympus'`, "22023");
      });
    });
  });

  describe("references", () => {
    it("generates unique, well-formed references", async () => {
      const result = await rows<{ ref: string }>(
        `select app_private.generate_booking_reference() as ref from generate_series(1, 3000)`,
      );
      const refs = new Set(result.map((row) => row.ref));
      expect(refs.size).toBe(3000);
      for (const ref of refs) expect(ref).toMatch(/^CF-[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/);
    });
  });

  describe("confirmation lookup", () => {
    it("returns only what the confirmation page needs, with contact details masked", async () => {
      const start = await startOf(await f.day(13), "09:00");
      const { reference } = await book(f, start, {
        name: "DBTEST Priya Nair",
        phone: "+919876543210",
        email: "priya@example.com",
        reason: "private reason",
      });
      const confirmation = (
        await pool.query(`select public.get_booking_confirmation($1) as c`, [
          reference?.toLowerCase(),
        ])
      ).rows[0].c as Record<string, any>;

      expect(confirmation.reference).toBe(reference);
      expect(confirmation.status).toBe("pending");
      expect(confirmation.patient).toEqual({
        display_name: "DBTEST P.",
        phone_hint: "••••3210",
        has_email: true,
      });
      expect(confirmation.doctor.name).toBe(`Dr. ${f.tag}`);
      expect(confirmation.timezone).toBe("Asia/Kolkata");

      const serialised = JSON.stringify(confirmation);
      for (const secret of ["9876543210", "priya@example.com", "private reason", "Nair"]) {
        expect(serialised, secret).not.toContain(secret);
      }
    });

    it("returns null for unknown or malformed references", async () => {
      for (const reference of ["CF-AAAAA-BBBBB", "nonsense", "", "CF-OOOOO-IIIII"]) {
        const result = await pool.query(`select public.get_booking_confirmation($1) as c`, [
          reference,
        ]);
        expect(result.rows[0].c, reference).toBeNull();
      }
    });
  });
});
