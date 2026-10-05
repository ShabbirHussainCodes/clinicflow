import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ALLOWED_TRANSITIONS, APPOINTMENT_STATUSES, canTransition } from "@/lib/validation/admin";

import {
  asRole,
  book,
  createAdminUser,
  createFixture,
  createOutsiderUser,
  createSideDoctor,
  dbAvailable,
  deleteAuthUsers,
  destroyFixture,
  expectSqlState,
  nextPhone,
  one,
  pool,
  rows,
  startOf,
  type Fixture,
} from "./helpers";

const available = await dbAvailable();

type Json = Record<string, any>;

describe.skipIf(!available)("administrator API", () => {
  let f: Fixture;
  let adminId: string;
  let inactiveAdminId: string;
  let outsiderId: string;

  beforeAll(async () => {
    f = await createFixture();
    adminId = await createAdminUser(true);
    inactiveAdminId = await createAdminUser(false);
    outsiderId = await createOutsiderUser();
  });
  afterAll(async () => {
    await destroyFixture(f);
    await deleteAuthUsers([adminId, inactiveAdminId, outsiderId]);
    await pool.end();
  });

  /** Inserts an appointment directly (bypassing availability), for lifecycle tests. */
  async function seedAppointment(
    offsetMinutes: number,
    status = "pending",
    name = "DBTEST Patient",
  ) {
    const doctorId = await createSideDoctor(f);
    const row = await one<{ id: string; reference: string }>(
      `insert into appointments (doctor_id, service_id, start_at, end_at, status, patient_name, patient_phone, consent_given)
       values ($1, $2, now() + make_interval(mins => $3), now() + make_interval(mins => $3 + 30), $4, $5, $6, true)
       returning id, reference`,
      [doctorId, f.serviceId, offsetMinutes, status, name, nextPhone()],
    );
    return row;
  }

  const asAdmin = <T>(fn: Parameters<typeof asRole<T>>[2]) => asRole("authenticated", adminId, fn);
  const rpc = async (
    client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: any[] }> },
    sql: string,
    params: unknown[] = [],
  ) => (await client.query(sql, params)).rows[0].r as Json;

  describe("who may call what", () => {
    it("denies anonymous callers every admin function and table", async () => {
      await asRole("anon", null, async (client) => {
        for (const sql of [
          "select public.admin_dashboard_summary()",
          "select public.admin_search_appointments()",
          "select public.admin_set_appointment_status(gen_random_uuid(), 'confirmed', null)",
          "select public.admin_retry_automation_event(gen_random_uuid())",
          "select * from appointments",
          "select * from appointment_status_history",
          "select * from automation_events",
          "select * from admin_profiles",
        ]) {
          await expectSqlState(client, sql, "42501");
        }
      });
    });

    it("denies a signed-in user who is not an administrator", async () => {
      await asRole("authenticated", outsiderId, async (client) => {
        await expectSqlState(client, "select public.admin_dashboard_summary()", "42501");
        await expectSqlState(client, "select public.admin_search_appointments()", "42501");
        await expectSqlState(
          client,
          "select public.admin_get_reschedule_slots(gen_random_uuid(), current_date)",
          "42501",
        );
        // Table reads return nothing (RLS) and writes are refused outright.
        expect((await client.query("select count(*)::int as n from appointments")).rows[0].n).toBe(
          0,
        );
        expect(
          (await client.query("select count(*)::int as n from automation_events")).rows[0].n,
        ).toBe(0);
        await expectSqlState(client, "update appointments set status = 'cancelled'", "42501");
        await expectSqlState(client, "delete from appointments", "42501");
        await expectSqlState(
          client,
          `insert into blocked_dates (doctor_id, start_date, end_date) values (null, current_date, current_date)`,
          "42501",
        );
      });
    });

    it("denies an administrator whose profile has been deactivated", async () => {
      await asRole("authenticated", inactiveAdminId, async (client) => {
        await expectSqlState(client, "select public.admin_dashboard_summary()", "42501");
        expect((await client.query("select count(*)::int as n from appointments")).rows[0].n).toBe(
          0,
        );
      });
    });

    it("lets an administrator read but not directly write appointments", async () => {
      await seedAppointment(60 * 24 * 3);
      await asAdmin(async (client) => {
        expect(
          (await client.query("select count(*)::int as n from appointments")).rows[0].n,
        ).toBeGreaterThan(0);
        // Writes must go through admin_* functions so rules and history cannot be bypassed.
        await expectSqlState(client, "update appointments set status = 'completed'", "42501");
        await expectSqlState(client, "delete from appointments", "42501");
        await expectSqlState(client, "update appointment_status_history set note = 'x'", "42501");
        await expectSqlState(client, "update automation_events set status = 'delivered'", "42501");
      });
    });

    it("limits direct doctor edits to slot length and active flag", async () => {
      await asAdmin(async (client) => {
        await client.query("update doctors set slot_minutes = 15 where id = $1", [f.doctorId]);
        await expectSqlState(
          client,
          "update doctors set full_name = 'Hacked' where id = $1",
          "42501",
          [f.doctorId],
        );
        await expectSqlState(client, "update services set name = 'x'", "42501");
        await expectSqlState(client, "update clinics set name = 'x'", "42501");
      });
    });
  });

  describe("status transitions", () => {
    it("matches the TypeScript transition table for every pair of statuses", async () => {
      for (const from of APPOINTMENT_STATUSES) {
        for (const to of APPOINTMENT_STATUSES) {
          const result = await one<{ ok: boolean }>(
            `select app_private.is_allowed_transition($1, $2) as ok`,
            [from, to],
          );
          expect(result.ok, `${from} -> ${to}`).toBe(canTransition(from, to));
        }
      }
      expect(Object.keys(ALLOWED_TRANSITIONS)).toEqual(
        expect.arrayContaining([...APPOINTMENT_STATUSES]),
      );
    });

    it("confirms, records history with the acting administrator, and emits an event", async () => {
      const { id, reference } = await seedAppointment(60 * 24 * 2);
      const result = await asAdmin((c) =>
        rpc(
          c,
          `select public.admin_set_appointment_status($1, 'confirmed', 'Called patient') as r`,
          [id],
        ),
      );
      expect(result).toEqual({ ok: true, status: "confirmed" });

      const history = await rows(
        `select event, from_status, to_status, changed_by, note from appointment_status_history where appointment_id = $1 order by id`,
        [id],
      );
      expect(history).toEqual([
        { event: "created", from_status: null, to_status: "pending", changed_by: null, note: null },
        {
          event: "status_changed",
          from_status: "pending",
          to_status: "confirmed",
          changed_by: adminId,
          note: "Called patient",
        },
      ]);
      const events = await rows(
        `select event_type from automation_events where payload #>> '{data,appointment,reference}' = $1 order by created_at`,
        [reference],
      );
      expect(events.map((e) => e.event_type)).toEqual([
        "appointment.created",
        "appointment.confirmed",
      ]);
    });

    it("rejects impossible, repeated and unknown transitions with machine-readable errors", async () => {
      const { id } = await seedAppointment(60 * 24 * 2, "confirmed");
      await asAdmin(async (client) => {
        expect(
          await rpc(
            client,
            `select public.admin_set_appointment_status($1, 'pending', null) as r`,
            [id],
          ),
        ).toMatchObject({ ok: false, error: "invalid_transition" });
        expect(
          await rpc(
            client,
            `select public.admin_set_appointment_status($1, 'confirmed', null) as r`,
            [id],
          ),
        ).toMatchObject({ ok: false, error: "no_change" });
        expect(
          await rpc(
            client,
            `select public.admin_set_appointment_status($1, 'archived', null) as r`,
            [id],
          ),
        ).toMatchObject({ ok: false, error: "invalid_status" });
        expect(
          await rpc(
            client,
            `select public.admin_set_appointment_status(gen_random_uuid(), 'confirmed', null) as r`,
          ),
        ).toMatchObject({ ok: false, error: "not_found" });
        expect(
          await rpc(
            client,
            `select public.admin_set_appointment_status($1, 'confirmed', $2) as r`,
            [id, "x".repeat(301)],
          ),
        ).toMatchObject({ ok: false });
      });
    });

    it("allows completed and no-show only after the appointment has started", async () => {
      const future = await seedAppointment(60 * 5, "confirmed");
      const past = await seedAppointment(-90, "confirmed");
      const pastPending = await seedAppointment(-200, "pending");
      await asAdmin(async (client) => {
        expect(
          await rpc(
            client,
            `select public.admin_set_appointment_status($1, 'completed', null) as r`,
            [future.id],
          ),
        ).toMatchObject({ ok: false, error: "not_started_yet" });
        expect(
          await rpc(
            client,
            `select public.admin_set_appointment_status($1, 'no_show', null) as r`,
            [future.id],
          ),
        ).toMatchObject({ ok: false, error: "not_started_yet" });
        expect(
          await rpc(
            client,
            `select public.admin_set_appointment_status($1, 'completed', null) as r`,
            [past.id],
          ),
        ).toEqual({ ok: true, status: "completed" });
        expect(
          await rpc(
            client,
            `select public.admin_set_appointment_status($1, 'no_show', null) as r`,
            [pastPending.id],
          ),
        ).toEqual({ ok: true, status: "no_show" });
      });
    });

    it("treats completed, cancelled and no-show as final", async () => {
      for (const status of ["completed", "cancelled", "no_show"]) {
        const { id } = await seedAppointment(-300, status);
        await asAdmin(async (client) => {
          for (const to of ["pending", "confirmed", "cancelled", "completed"]) {
            const result = await rpc(
              client,
              `select public.admin_set_appointment_status($1, $2, null) as r`,
              [id, to],
            );
            expect(result.ok, `${status} -> ${to}`).toBe(false);
          }
        });
      }
    });

    it("cancelling records the reason, releases the slot and emits a cancelled event", async () => {
      const start = await startOf(await f.day(14), "09:00");
      const booked = await book(f, start);
      const { id } = await one<{ id: string }>(`select id from appointments where reference = $1`, [
        booked.reference,
      ]);
      const result = await asAdmin((c) =>
        rpc(
          c,
          `select public.admin_set_appointment_status($1, 'cancelled', 'Doctor unavailable') as r`,
          [id],
        ),
      );
      expect(result.ok).toBe(true);
      const row = await one(`select status, cancellation_reason from appointments where id = $1`, [
        id,
      ]);
      expect(row).toEqual({ status: "cancelled", cancellation_reason: "Doctor unavailable" });
      expect((await book(f, start)).ok).toBe(true);
      const events = await rows(
        `select event_type from automation_events where appointment_id = $1`,
        [id],
      );
      expect(events.map((e) => e.event_type)).toContain("appointment.cancelled");
    });
  });

  describe("rescheduling", () => {
    it("moves the appointment, frees the old slot, records history and emits an event", async () => {
      const [from, to] = [
        await startOf(await f.day(15), "09:00"),
        await startOf(await f.day(16), "10:30"),
      ];
      const booked = await book(f, from);
      const { id } = await one<{ id: string }>(`select id from appointments where reference = $1`, [
        booked.reference,
      ]);

      const result = await asAdmin((c) =>
        rpc(
          c,
          `select public.admin_reschedule_appointment($1, $2::timestamptz, 'Patient request') as r`,
          [id, to],
        ),
      );
      expect(result.ok).toBe(true);

      const row = await one<{ start: string; ms: number }>(
        `select start_at::text as start, extract(epoch from (end_at - start_at))::int as ms from appointments where id = $1`,
        [id],
      );
      expect(new Date(row.start).getTime()).toBe(new Date(to).getTime());
      expect(row.ms).toBe(1800);
      expect((await book(f, from)).ok).toBe(true);

      const history = await one(
        `select event, note, metadata from appointment_status_history where appointment_id = $1 and event = 'rescheduled'`,
        [id],
      );
      expect(history).toMatchObject({ event: "rescheduled", note: "Patient request" });
      expect((history as Json).metadata).toHaveProperty("from_start_at");
      const events = await rows(
        `select event_type from automation_events where appointment_id = $1`,
        [id],
      );
      expect(events.map((e) => e.event_type)).toContain("appointment.rescheduled");
    });

    it("refuses an occupied, unavailable or identical target and non-active appointments", async () => {
      const date = await f.day(17);
      const a = await book(f, await startOf(date, "09:00"));
      const b = await book(f, await startOf(date, "09:30"));
      const idA = (
        await one<{ id: string }>(`select id from appointments where reference = $1`, [a.reference])
      ).id;
      await asAdmin(async (client) => {
        expect(
          await rpc(
            client,
            `select public.admin_reschedule_appointment($1, $2::timestamptz, null) as r`,
            [idA, await startOf(date, "09:30")],
          ),
        ).toMatchObject({ ok: false, error: "slot_unavailable" });
        expect(
          await rpc(
            client,
            `select public.admin_reschedule_appointment($1, $2::timestamptz, null) as r`,
            [idA, await startOf(date, "10:10")],
          ),
        ).toMatchObject({ ok: false, error: "slot_unavailable" });
        expect(
          await rpc(
            client,
            `select public.admin_reschedule_appointment($1, $2::timestamptz, null) as r`,
            [idA, await startOf(date, "09:00")],
          ),
        ).toMatchObject({ ok: false, error: "no_change" });
      });
      const cancelled = await seedAppointment(60 * 24 * 5, "cancelled");
      await asAdmin(async (client) => {
        expect(
          await rpc(
            client,
            `select public.admin_reschedule_appointment($1, now() + interval '2 days', null) as r`,
            [cancelled.id],
          ),
        ).toMatchObject({ ok: false, error: "invalid_transition" });
      });
      expect(b.ok).toBe(true);
    });

    it("excludes the appointment itself when listing reschedule slots", async () => {
      const date = await f.day(18);
      const booked = await book(f, await startOf(date, "09:00"));
      const { id } = await one<{ id: string }>(`select id from appointments where reference = $1`, [
        booked.reference,
      ]);
      const slots = await asAdmin(async (client) =>
        (
          await client.query(
            `select to_char(slot_start at time zone 'Asia/Kolkata', 'HH24:MI') as t from public.admin_get_reschedule_slots($1, $2::date) order by slot_start`,
            [id, date],
          )
        ).rows.map((r) => r.t),
      );
      expect(slots).toContain("09:00"); // its own slot is offered as "no change"
      const publicSlots = (
        await rows(
          `select to_char(slot_start at time zone 'Asia/Kolkata', 'HH24:MI') as t from public.get_available_slots($1, $2, $3::date)`,
          [f.doctorId, f.serviceId, date],
        )
      ).map((r) => r.t);
      expect(publicSlots).not.toContain("09:00");
    });
  });

  describe("notes", () => {
    it("saves notes with an audit entry and enforces the length limit", async () => {
      const { id } = await seedAppointment(60 * 24 * 4);
      await asAdmin(async (client) => {
        expect(
          await rpc(
            client,
            `select public.admin_update_appointment_notes($1, '  Call before 9am ') as r`,
            [id],
          ),
        ).toEqual({ ok: true });
        expect(
          await rpc(client, `select public.admin_update_appointment_notes($1, $2) as r`, [
            id,
            "x".repeat(1001),
          ]),
        ).toMatchObject({ ok: false, error: "note_too_long" });
        expect(
          await rpc(
            client,
            `select public.admin_update_appointment_notes(gen_random_uuid(), 'x') as r`,
          ),
        ).toMatchObject({ ok: false, error: "not_found" });
      });
      expect(await one(`select admin_notes from appointments where id = $1`, [id])).toEqual({
        admin_notes: "Call before 9am",
      });
      const history = await rows(
        `select event from appointment_status_history where appointment_id = $1 and event = 'note_updated'`,
        [id],
      );
      expect(history).toHaveLength(1);
    });
  });

  describe("search", () => {
    it("matches name, phone digits (however typed) and reference, and escapes wildcards", async () => {
      const name = `DBTEST Zelda${Date.now()}`;
      const phone = "+919123456780";
      const { id, reference } = await one<{ id: string; reference: string }>(
        `insert into appointments (doctor_id, service_id, start_at, end_at, patient_name, patient_phone, consent_given)
         values ($1, $2, now() + interval '9 days', now() + interval '9 days 30 minutes', $3, $4, true) returning id, reference`,
        [f.doctorId, f.serviceId, name, phone],
      );
      await asAdmin(async (client) => {
        const search = async (q: string) =>
          (await rpc(client, `select public.admin_search_appointments(p_query => $1) as r`, [
            q,
          ])) as { total: number; rows: Json[] };
        expect((await search(name.toLowerCase())).rows.map((r) => r.id)).toEqual([id]);
        expect((await search("91234 56780")).rows.map((r) => r.id)).toContain(id);
        expect((await search("+91 91234-56780")).rows.map((r) => r.id)).toContain(id);
        expect((await search(reference.toLowerCase())).rows.map((r) => r.id)).toEqual([id]);
        // A literal percent sign or underscore must not behave as a wildcard.
        expect((await search("%")).total).toBe(0);
        expect((await search("_")).total).toBe(0);
        expect((await search("DBTEST Zelda%")).total).toBe(0);
        // Digits inside ordinary text must not trigger phone matching: "zz9123456780zz" is not a phone number.
        expect((await search("zz9123456780zz")).total).toBe(0);
        expect((await search("Zelda9123456780")).total).toBe(0);
        // Hostile input is just text.
        expect((await search("'; drop table appointments; --")).total).toBe(0);
      });
      expect((await one(`select count(*)::int as n from appointments`)).n).toBeGreaterThan(0);
    });

    it("filters by status, doctor, service and clinic-timezone date range, sorts and paginates", async () => {
      const date = await f.day(19);
      const refs: string[] = [];
      for (const t of ["09:00", "09:30", "10:00", "10:30", "11:00"])
        refs.push(
          (await book(f, await startOf(date, t), { name: "DBTEST Page" })).reference as string,
        );
      await pool.query(`update appointments set status = 'confirmed' where reference = $1`, [
        refs[0],
      ]);

      await asAdmin(async (client) => {
        const run = async (args: string) =>
          (await rpc(client, `select public.admin_search_appointments(${args}) as r`)) as {
            total: number;
            rows: Json[];
          };

        const day = await run(
          `p_doctor_id => '${f.doctorId}', p_date_from => '${date}', p_date_to => '${date}'`,
        );
        expect(day.total).toBe(5);
        expect(day.rows.map((r) => r.reference)).toEqual(refs); // earliest first

        const desc = await run(
          `p_doctor_id => '${f.doctorId}', p_date_from => '${date}', p_date_to => '${date}', p_sort => 'start_desc'`,
        );
        expect(desc.rows.map((r) => r.reference)).toEqual([...refs].reverse());

        const confirmed = await run(
          `p_doctor_id => '${f.doctorId}', p_status => 'confirmed', p_date_from => '${date}', p_date_to => '${date}'`,
        );
        expect(confirmed.rows.map((r) => r.reference)).toEqual([refs[0]]);

        const page2 = await run(
          `p_doctor_id => '${f.doctorId}', p_date_from => '${date}', p_date_to => '${date}', p_limit => 2, p_offset => 2`,
        );
        expect(page2.total).toBe(5);
        expect(page2.rows.map((r) => r.reference)).toEqual(refs.slice(2, 4));

        const otherService = await run(
          `p_doctor_id => '${f.doctorId}', p_service_id => '${f.longServiceId}', p_date_from => '${date}', p_date_to => '${date}'`,
        );
        expect(otherService.total).toBe(0);

        // The boundary is the clinic's midnight, not UTC's: a day filter must not leak neighbours.
        const nextDay = await run(
          `p_doctor_id => '${f.doctorId}', p_date_from => '${await f.day(20)}', p_date_to => '${await f.day(20)}'`,
        );
        expect(nextDay.rows.every((r) => !refs.includes(r.reference))).toBe(true);
      });
    });
  });

  describe("schedule and dashboard", () => {
    it("replaces weekly hours atomically and rolls back on overlap", async () => {
      await asAdmin(async (client) => {
        const ok = await rpc(
          client,
          `select public.admin_set_doctor_schedule($1, 15, '[{"weekday":1,"start_time":"09:00","end_time":"10:00"},{"weekday":1,"start_time":"14:00","end_time":"16:00"}]'::jsonb) as r`,
          [f.doctorId],
        );
        expect(ok).toEqual({ ok: true });
        const after = await client.query(
          `select weekday, start_time::text, slot_minutes from doctor_availability a join doctors d on d.id = a.doctor_id where a.doctor_id = $1 order by start_time`,
          [f.doctorId],
        );
        expect(after.rows).toEqual([
          { weekday: 1, start_time: "09:00:00", slot_minutes: 15 },
          { weekday: 1, start_time: "14:00:00", slot_minutes: 15 },
        ]);

        const overlap = await rpc(
          client,
          `select public.admin_set_doctor_schedule($1, 30, '[{"weekday":2,"start_time":"09:00","end_time":"12:00"},{"weekday":2,"start_time":"11:00","end_time":"13:00"}]'::jsonb) as r`,
          [f.doctorId],
        );
        expect(overlap).toEqual({ ok: false, error: "overlapping_windows" });
        // Nothing changed: the previous schedule and slot length are intact.
        const unchanged = await client.query(
          `select count(*)::int as n, max(slot_minutes) as m from doctor_availability a join doctors d on d.id = a.doctor_id where a.doctor_id = $1`,
          [f.doctorId],
        );
        expect(unchanged.rows[0]).toEqual({ n: 2, m: 15 });

        expect(
          await rpc(client, `select public.admin_set_doctor_schedule($1, 17, '[]'::jsonb) as r`, [
            f.doctorId,
          ]),
        ).toEqual({ ok: false, error: "invalid_slot_minutes" });
        expect(
          await rpc(
            client,
            `select public.admin_set_doctor_schedule($1, 15, '[{"weekday":9,"start_time":"09:00","end_time":"10:00"}]'::jsonb) as r`,
            [f.doctorId],
          ),
        ).toEqual({ ok: false, error: "invalid_windows" });
        expect(
          await rpc(
            client,
            `select public.admin_set_doctor_schedule($1, 15, '[{"weekday":1,"start_time":"25:00","end_time":"26:00"}]'::jsonb) as r`,
            [f.doctorId],
          ),
        ).toEqual({ ok: false, error: "invalid_windows" });
        expect(
          await rpc(
            client,
            `select public.admin_set_doctor_schedule(gen_random_uuid(), 15, '[]'::jsonb) as r`,
          ),
        ).toEqual({ ok: false, error: "not_found" });
      });
    });

    it("lets administrators manage breaks and blocked dates, and nobody else", async () => {
      await asAdmin(async (client) => {
        await client.query(
          `insert into doctor_breaks (doctor_id, weekday, start_time, end_time, label) values ($1, null, '10:00', '10:15', 'DBTEST')`,
          [f.doctorId],
        );
        await client.query(
          `insert into blocked_dates (doctor_id, start_date, end_date, kind, reason, created_by) values ($1, current_date + 40, current_date + 41, 'unavailable', 'DBTEST', $2)`,
          [f.doctorId, adminId],
        );
        expect(
          (
            await client.query(
              `select count(*)::int as n from blocked_dates where reason = 'DBTEST'`,
            )
          ).rows[0].n,
        ).toBe(1);
      });
      await asRole("authenticated", outsiderId, async (client) => {
        await expectSqlState(
          client,
          `insert into doctor_breaks (doctor_id, weekday, start_time, end_time, label) values ($1, null, '10:00', '10:15', 'x')`,
          "42501",
          [f.doctorId],
        );
      });
      await pool.query(`delete from blocked_dates where reason = 'DBTEST'`);
    });

    it("summarises the clinic for the dashboard", async () => {
      await seedAppointment(60 * 3, "confirmed");
      const summary = await asAdmin((c) => rpc(c, `select public.admin_dashboard_summary() as r`));
      expect(Object.keys(summary)).toEqual(
        expect.arrayContaining([
          "today",
          "timezone",
          "counts",
          "daily",
          "top_services",
          "doctor_load",
          "recent_activity",
        ]),
      );
      expect(Object.keys(summary.counts)).toEqual(
        expect.arrayContaining([
          "today_total",
          "today_remaining",
          "upcoming",
          "pending",
          "confirmed",
          "completed_30d",
          "cancelled_30d",
          "no_show_30d",
        ]),
      );
      expect(summary.daily).toHaveLength(14);
      expect(summary.daily[6].date).toBe(summary.today);
      expect(summary.recent_activity.length).toBeGreaterThan(0);
    });
  });
});
