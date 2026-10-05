import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  asRole,
  book,
  createAdminUser,
  createFixture,
  createSideDoctor,
  dbAvailable,
  deleteAuthUsers,
  destroyFixture,
  nextPhone,
  one,
  pool,
  rows,
  startOf,
  type Fixture,
} from "./helpers";

const available = await dbAvailable();

type Event = { id: string; event_type: string; payload: Record<string, any>; attempts: number };

describe.skipIf(!available)("automation event outbox", () => {
  let f: Fixture;
  let adminId: string;

  let startedAt: string;

  beforeAll(async () => {
    startedAt = (await one<{ t: string }>(`select clock_timestamp()::text as t`)).t;
    f = await createFixture();
    adminId = await createAdminUser();
  });
  afterAll(async () => {
    // enqueue_due_reminders and claim_automation_events act on the whole table, so they may have
    // touched events that are not ours (for example demo bookings in a local database). Undo that.
    await pool.query(
      `delete from automation_events where event_type = 'appointment.reminder_due' and created_at >= $1::timestamptz`,
      [startedAt],
    );
    await pool.query(
      `update automation_events
          set status = 'pending', locked_until = null, attempts = greatest(attempts - 1, 0)
        where status = 'processing' and last_attempt_at >= $1::timestamptz
          and coalesce(payload #>> '{data,patient,name}', '') not like 'DBTEST%'`,
      [startedAt],
    );
    await destroyFixture(f);
    await deleteAuthUsers([adminId]);
    await pool.end();
  });

  const eventsFor = (reference: string) =>
    rows<{ id: string; event_type: string; status: string; payload: Record<string, any> }>(
      `select id, event_type, status, payload from automation_events where payload #>> '{data,appointment,reference}' = $1 order by created_at, id`,
      [reference],
    );

  async function createBooking(
    dayOffset: number,
    time: string,
    options: Parameters<typeof book>[2] = {},
  ) {
    const result = await book(f, await startOf(await f.day(dayOffset), time), options);
    expect(result.ok).toBe(true);
    const row = await one<{ id: string }>(`select id from appointments where reference = $1`, [
      result.reference,
    ]);
    return { reference: result.reference as string, id: row.id };
  }

  /** Claims events and returns only those belonging to this test (other data may exist locally). */
  async function claimMine(ids: string[], limit = 100): Promise<Event[]> {
    const claimed = await rows<Event>(`select * from public.claim_automation_events($1, 120)`, [
      limit,
    ]);
    return claimed.filter((event) => ids.includes(event.id));
  }

  describe("event creation", () => {
    it("records appointment.created in the same transaction as the booking, with the documented payload", async () => {
      const { reference, id } = await createBooking(21, "09:00", {
        name: "DBTEST Priya Nair",
        phone: "+919876543210",
        email: "priya@example.com",
        reason: "private visit reason",
      });
      const [event, ...rest] = await eventsFor(reference);
      expect(rest).toEqual([]);
      expect(event?.event_type).toBe("appointment.created");
      expect(event?.status).toBe("pending");

      const payload = event?.payload as Record<string, any>;
      expect(payload).toMatchObject({ id: event?.id, type: "appointment.created", version: 1 });
      expect(new Date(payload.created_at).toString()).not.toBe("Invalid Date");
      expect(payload.data.appointment).toMatchObject({
        id,
        reference,
        status: "pending",
        timezone: "Asia/Kolkata",
        local_time: "09:00",
      });
      expect(payload.data.appointment.local_date).toBe(await f.day(21));
      expect(payload.data.doctor).toMatchObject({ id: f.doctorId });
      expect(payload.data.service).toMatchObject({ id: f.serviceId, duration_minutes: 30 });
      expect(payload.data.patient).toEqual({
        name: "DBTEST Priya Nair",
        phone: "+919876543210",
        email: "priya@example.com",
        consent_to_contact: true,
      });
      expect(payload.data.clinic).toHaveProperty("name");

      // Free text the patient typed is never sent to automation services.
      expect(JSON.stringify(payload)).not.toContain("private visit reason");
    });

    it("emits confirmed, rescheduled, completed and cancelled events but nothing for no-show", async () => {
      const a = await createBooking(22, "09:00");
      const asAdmin = <T>(fn: Parameters<typeof asRole<T>>[2]) =>
        asRole("authenticated", adminId, fn);
      await asAdmin((c) =>
        c.query(`select public.admin_set_appointment_status($1, 'confirmed', null)`, [a.id]),
      );
      await asAdmin((c) =>
        c.query(`select public.admin_set_appointment_status($1, 'cancelled', null)`, [a.id]),
      );
      expect((await eventsFor(a.reference)).map((e) => e.event_type)).toEqual([
        "appointment.created",
        "appointment.confirmed",
        "appointment.cancelled",
      ]);

      // completed and no_show on past appointments (inserted directly on a side doctor).
      const side = await createSideDoctor(f);
      const past = await one<{ id: string; reference: string }>(
        `insert into appointments (doctor_id, service_id, start_at, end_at, status, patient_name, patient_phone, consent_given)
         values ($1, $2, now() - interval '3 hours', now() - interval '2 hours 30 minutes', 'confirmed', 'DBTEST Past', $3, true) returning id, reference`,
        [side, f.serviceId, nextPhone()],
      );
      const past2 = await one<{ id: string; reference: string }>(
        `insert into appointments (doctor_id, service_id, start_at, end_at, status, patient_name, patient_phone, consent_given)
         values ($1, $2, now() - interval '5 hours', now() - interval '4 hours 30 minutes', 'confirmed', 'DBTEST Past2', $3, true) returning id, reference`,
        [side, f.serviceId, nextPhone()],
      );
      await asAdmin((c) =>
        c.query(`select public.admin_set_appointment_status($1, 'completed', null)`, [past.id]),
      );
      await asAdmin((c) =>
        c.query(`select public.admin_set_appointment_status($1, 'no_show', null)`, [past2.id]),
      );
      expect((await eventsFor(past.reference)).map((e) => e.event_type)).toEqual([
        "appointment.created",
        "appointment.completed",
      ]);
      expect((await eventsFor(past2.reference)).map((e) => e.event_type)).toEqual([
        "appointment.created",
      ]);
    });

    it("emits appointment.rescheduled with the new time in the payload", async () => {
      const booked = await createBooking(23, "09:00");
      const target = await startOf(await f.day(24), "10:30");
      await asRole("authenticated", adminId, (c) =>
        c.query(`select public.admin_reschedule_appointment($1, $2::timestamptz, null)`, [
          booked.id,
          target,
        ]),
      );
      const events = await eventsFor(booked.reference);
      const rescheduled = events.find((event) => event.event_type === "appointment.rescheduled");
      expect(rescheduled?.payload.data.appointment).toMatchObject({
        local_time: "10:30",
        local_date: await f.day(24),
      });
    });

    it("still records the event when the booking is made while nothing is consuming the outbox", async () => {
      // Nothing in this test suite runs a dispatcher: events simply wait. That is the whole point.
      const { reference } = await createBooking(25, "09:00");
      expect((await eventsFor(reference))[0]?.status).toBe("pending");
    });
  });

  describe("reminders", () => {
    async function upcoming(hours: number, status = "confirmed") {
      const side = await createSideDoctor(f);
      return one<{ id: string; reference: string }>(
        `insert into appointments (doctor_id, service_id, start_at, end_at, status, patient_name, patient_phone, consent_given)
         values ($1, $2, now() + make_interval(hours => $3), now() + make_interval(hours => $3) + interval '30 minutes', $4, 'DBTEST Reminder', $5, true)
         returning id, reference`,
        [side, f.serviceId, hours, status, nextPhone()],
      );
    }
    const remindersFor = (reference: string) =>
      rows(
        `select event_type, dedupe_key from automation_events where event_type = 'appointment.reminder_due' and payload #>> '{data,appointment,reference}' = $1`,
        [reference],
      );

    it("queues one reminder per appointment inside the lead window, and is idempotent", async () => {
      const soon = await upcoming(5);
      const later = await upcoming(60);
      const cancelled = await upcoming(6, "cancelled");

      await pool.query(`select public.enqueue_due_reminders(24)`);
      await pool.query(`select public.enqueue_due_reminders(24)`);

      expect(await remindersFor(soon.reference)).toHaveLength(1);
      expect(await remindersFor(later.reference)).toHaveLength(0);
      expect(await remindersFor(cancelled.reference)).toHaveLength(0);
    });

    it("returns how many reminders were newly queued and validates the window", async () => {
      await upcoming(7);
      const first = await one<{ n: number }>(`select public.enqueue_due_reminders(24) as n`);
      expect(first.n).toBeGreaterThanOrEqual(1);
      const second = await one<{ n: number }>(`select public.enqueue_due_reminders(24) as n`);
      expect(second.n).toBe(0);
      await expect(pool.query(`select public.enqueue_due_reminders(0)`)).rejects.toThrow();
      await expect(pool.query(`select public.enqueue_due_reminders(500)`)).rejects.toThrow();
    });

    it("queues a fresh reminder when an appointment is moved to a new time", async () => {
      const appt = await upcoming(8);
      await pool.query(`select public.enqueue_due_reminders(24)`);
      await pool.query(
        `update appointments set start_at = start_at + interval '1 hour', end_at = end_at + interval '1 hour' where id = $1`,
        [appt.id],
      );
      await pool.query(`select public.enqueue_due_reminders(24)`);
      expect(await remindersFor(appt.reference)).toHaveLength(2);
    });
  });

  describe("delivery bookkeeping", () => {
    it("claims due events once, marking them as processing with an incremented attempt", async () => {
      const { reference } = await createBooking(26, "09:00");
      const [event] = await eventsFor(reference);
      const first = await claimMine([event!.id]);
      expect(first).toHaveLength(1);
      expect(first[0]?.attempts).toBe(1);

      expect(await claimMine([event!.id])).toHaveLength(0); // locked while processing
      const row = await one(
        `select status, locked_until > now() as locked from automation_events where id = $1`,
        [event!.id],
      );
      expect(row).toEqual({ status: "processing", locked: true });
    });

    it("lets a crashed dispatcher's events be claimed again after the lock expires", async () => {
      const { reference } = await createBooking(26, "09:30");
      const [event] = await eventsFor(reference);
      await claimMine([event!.id]);
      await pool.query(
        `update automation_events set locked_until = now() - interval '1 second' where id = $1`,
        [event!.id],
      );
      const again = await claimMine([event!.id]);
      expect(again).toHaveLength(1);
      expect(again[0]?.attempts).toBe(2);
    });

    it("marks delivered events complete, and only processing ones", async () => {
      const { reference } = await createBooking(26, "10:00");
      const [event] = await eventsFor(reference);
      await pool.query(`select public.complete_automation_event($1)`, [event!.id]); // not claimed: ignored
      expect(
        (await one(`select status from automation_events where id = $1`, [event!.id])).status,
      ).toBe("pending");
      await claimMine([event!.id]);
      await pool.query(`select public.complete_automation_event($1)`, [event!.id]);
      expect(
        await one(
          `select status, delivered_at is not null as stamped, last_error from automation_events where id = $1`,
          [event!.id],
        ),
      ).toEqual({
        status: "delivered",
        stamped: true,
        last_error: null,
      });
    });

    it("retries failures with exponential backoff and parks them as dead after the maximum attempts", async () => {
      const { reference } = await createBooking(26, "10:30");
      const [event] = await eventsFor(reference);
      const waits: number[] = [];

      for (let attempt = 1; attempt <= 3; attempt += 1) {
        await pool.query(`update automation_events set next_attempt_at = now() where id = $1`, [
          event!.id,
        ]);
        const claimed = await claimMine([event!.id]);
        expect(claimed[0]?.attempts).toBe(attempt);
        await pool.query(`select public.fail_automation_event($1, 'HTTP 500', 3)`, [event!.id]);
        const row = await one<{ status: string; wait: number; last_error: string }>(
          `select status, extract(epoch from (next_attempt_at - now()))::int as wait, last_error from automation_events where id = $1`,
          [event!.id],
        );
        waits.push(row.wait);
        expect(row.last_error).toBe("HTTP 500");
        expect(row.status).toBe(attempt < 3 ? "failed" : "dead");
      }
      // 30 s, 60 s, 120 s (allow a second of clock drift).
      expect(waits[0]).toBeGreaterThanOrEqual(28);
      expect(waits[0]).toBeLessThanOrEqual(30);
      expect(waits[1]).toBeGreaterThanOrEqual(58);
      expect(waits[2]).toBeGreaterThanOrEqual(118);

      // A failed event is not claimed again before its retry time.
      await pool.query(
        `update automation_events set status = 'failed', next_attempt_at = now() + interval '1 hour' where id = $1`,
        [event!.id],
      );
      expect(await claimMine([event!.id])).toHaveLength(0);
    });

    it("truncates stored error text so a misbehaving endpoint cannot bloat the table", async () => {
      const { reference } = await createBooking(26, "11:00");
      const [event] = await eventsFor(reference);
      await claimMine([event!.id]);
      await pool.query(`select public.fail_automation_event($1, $2, 8)`, [
        event!.id,
        "x".repeat(5000),
      ]);
      expect(
        (
          await one<{ n: number }>(
            `select char_length(last_error) as n from automation_events where id = $1`,
            [event!.id],
          )
        ).n,
      ).toBe(500);
    });

    it("never hands the same event to two concurrent dispatchers", async () => {
      const created = [] as string[];
      for (const time of ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"]) {
        const { reference } = await createBooking(27, time);
        created.push((await eventsFor(reference))[0]!.id);
      }
      const results = await Promise.all(Array.from({ length: 6 }, () => claimMine(created, 3)));
      const claimedIds = results.flat().map((event) => event.id);
      expect(new Set(claimedIds).size).toBe(claimedIds.length);
    });

    it("lets an administrator retry a dead event, and only a dead or failed one", async () => {
      const { reference } = await createBooking(28, "09:00");
      const [event] = await eventsFor(reference);
      const retry = (id: string) =>
        asRole(
          "authenticated",
          adminId,
          async (c) =>
            (await c.query(`select public.admin_retry_automation_event($1) as r`, [id])).rows[0].r,
        );

      expect(await retry(event!.id)).toEqual({ ok: false, error: "not_retryable" }); // still pending
      await pool.query(
        `update automation_events set status = 'dead', attempts = 8, last_error = 'HTTP 500' where id = $1`,
        [event!.id],
      );
      expect(await retry(event!.id)).toEqual({ ok: true });
      expect(
        await one(`select status, attempts from automation_events where id = $1`, [event!.id]),
      ).toEqual({ status: "pending", attempts: 0 });
    });

    it("purges only delivered events older than the retention period", async () => {
      const a = await createBooking(28, "09:30");
      const b = await createBooking(28, "10:00");
      const [old] = await eventsFor(a.reference);
      const [recent] = await eventsFor(b.reference);
      await pool.query(
        `update automation_events set status = 'delivered', delivered_at = now() - interval '45 days' where id = $1`,
        [old!.id],
      );
      await pool.query(
        `update automation_events set status = 'delivered', delivered_at = now() - interval '2 days' where id = $1`,
        [recent!.id],
      );
      await pool.query(`select public.purge_delivered_automation_events(30)`);
      expect(
        await rows(`select id from automation_events where id = any($1::uuid[])`, [
          [old!.id, recent!.id],
        ]),
      ).toEqual([{ id: recent!.id }]);
    });

    it("keeps events (without the appointment link) if an appointment is ever deleted", async () => {
      const { reference, id } = await createBooking(28, "10:30");
      const [event] = await eventsFor(reference);
      await pool.query(`delete from appointments where id = $1`, [id]);
      expect(
        await one(`select appointment_id from automation_events where id = $1`, [event!.id]),
      ).toEqual({ appointment_id: null });
    });
  });
});
