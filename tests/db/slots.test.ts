import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  book,
  createFixture,
  dbAvailable,
  destroyFixture,
  inRollback,
  one,
  pool,
  rows,
  slotTimes,
  startOf,
  type Fixture,
} from "./helpers";

const available = await dbAvailable();
if (!available)
  console.warn(
    "Skipping database tests: local Supabase is not reachable (run `npm run db:start`).",
  );

describe.skipIf(!available)("slot generation", () => {
  let f: Fixture;

  beforeAll(async () => {
    f = await createFixture();
  });
  afterAll(async () => {
    await destroyFixture(f);
    await pool.end();
  });

  it("offers every grid slot inside working hours", async () => {
    expect(await slotTimes(f, await f.day(3))).toEqual([
      "09:00",
      "09:30",
      "10:00",
      "10:30",
      "11:00",
      "11:30",
    ]);
  });

  it("removes slots that overlap a recurring break", async () => {
    const breakRow = await one<{ id: string }>(
      `insert into doctor_breaks (doctor_id, weekday, start_time, end_time, label) values ($1, null, '10:00', '10:30', 'Tea') returning id`,
      [f.doctorId],
    );
    try {
      expect(await slotTimes(f, await f.day(3))).toEqual([
        "09:00",
        "09:30",
        "10:30",
        "11:00",
        "11:30",
      ]);
    } finally {
      await pool.query(`delete from doctor_breaks where id = $1`, [breakRow.id]);
    }
  });

  it("rounds long services up to whole slots and keeps the whole visit inside working hours and clear of breaks", async () => {
    // 45 minutes on a 30-minute grid occupies 60 minutes.
    expect(await slotTimes(f, await f.day(3), f.longServiceId)).toEqual([
      "09:00",
      "09:30",
      "10:00",
      "10:30",
      "11:00",
    ]);

    const breakRow = await one<{ id: string }>(
      `insert into doctor_breaks (doctor_id, weekday, start_time, end_time, label) values ($1, null, '10:00', '10:30', 'Tea') returning id`,
      [f.doctorId],
    );
    try {
      // 09:00-10:00 fits; 09:30-10:30, 10:00-11:00 touch the break; 10:30-11:30 and 11:00-12:00 fit.
      expect(await slotTimes(f, await f.day(3), f.longServiceId)).toEqual([
        "09:00",
        "10:30",
        "11:00",
      ]);
    } finally {
      await pool.query(`delete from doctor_breaks where id = $1`, [breakRow.id]);
    }
  });

  it("supports split shifts", async () => {
    const window = await one<{ id: string }>(
      `insert into doctor_availability (doctor_id, weekday, start_time, end_time)
       select $1, extract(dow from ($2::date))::int, '14:00', '15:00' returning id`,
      [f.doctorId, await f.day(3)],
    );
    try {
      expect(await slotTimes(f, await f.day(3))).toEqual([
        "09:00",
        "09:30",
        "10:00",
        "10:30",
        "11:00",
        "11:30",
        "14:00",
        "14:30",
      ]);
    } finally {
      await pool.query(`delete from doctor_availability where id = $1`, [window.id]);
    }
  });

  it("uses only the hours for the requested weekday", async () => {
    const target = await f.day(3);
    const other = await f.day(4);
    const saved = await rows(
      `select weekday, start_time, end_time from doctor_availability where doctor_id = $1`,
      [f.doctorId],
    );
    await pool.query(`delete from doctor_availability where doctor_id = $1`, [f.doctorId]);
    await pool.query(
      `insert into doctor_availability (doctor_id, weekday, start_time, end_time)
       values ($1, extract(dow from $2::date)::int, '09:00', '10:00')`,
      [f.doctorId, target],
    );
    try {
      expect(await slotTimes(f, target)).toEqual(["09:00", "09:30"]);
      expect(await slotTimes(f, other)).toEqual([]);
    } finally {
      await pool.query(`delete from doctor_availability where doctor_id = $1`, [f.doctorId]);
      for (const row of saved as { weekday: number; start_time: string; end_time: string }[]) {
        await pool.query(
          `insert into doctor_availability (doctor_id, weekday, start_time, end_time) values ($1,$2,$3,$4)`,
          [f.doctorId, row.weekday, row.start_time, row.end_time],
        );
      }
    }
  });

  it("hides doctor-specific and clinic-wide blocked dates, and only those dates", async () => {
    const [blocked, clinicBlocked, free] = [await f.day(5), await f.day(7), await f.day(6)];
    const mine = await one<{ id: string }>(
      `insert into blocked_dates (doctor_id, start_date, end_date, kind, reason) values ($1, $2, $2, 'unavailable', $3) returning id`,
      [f.doctorId, blocked, `${f.tag} leave`],
    );
    const clinic = await one<{ id: string }>(
      `insert into blocked_dates (doctor_id, start_date, end_date, kind, reason) values (null, $1, $1, 'holiday', $2) returning id`,
      [clinicBlocked, `${f.tag} holiday`],
    );
    try {
      expect(await slotTimes(f, blocked)).toEqual([]);
      expect(await slotTimes(f, clinicBlocked)).toEqual([]);
      expect((await slotTimes(f, free)).length).toBe(6);
    } finally {
      await pool.query(`delete from blocked_dates where id = any($1::uuid[])`, [
        [mine.id, clinic.id],
      ]);
    }
  });

  it("supports multi-day blocks that include both end dates", async () => {
    const [start, end, after] = [await f.day(8), await f.day(10), await f.day(11)];
    const range = await one<{ id: string }>(
      `insert into blocked_dates (doctor_id, start_date, end_date, kind, reason) values ($1, $2, $3, 'unavailable', $4) returning id`,
      [f.doctorId, start, end, `${f.tag} range`],
    );
    try {
      expect(await slotTimes(f, start)).toEqual([]);
      expect(await slotTimes(f, await f.day(9))).toEqual([]);
      expect(await slotTimes(f, end)).toEqual([]);
      expect((await slotTimes(f, after)).length).toBeGreaterThan(0);
    } finally {
      await pool.query(`delete from blocked_dates where id = $1`, [range.id]);
    }
  });

  it("never offers past dates or dates beyond the booking window", async () => {
    expect(await slotTimes(f, await f.day(-1))).toEqual([]);
    expect(await slotTimes(f, await f.day(31))).toEqual([]); // window is 30 days
    expect((await slotTimes(f, await f.day(30))).length).toBeGreaterThan(0);
  });

  it("never offers a slot that starts before now + minimum notice, and ignore_clock exists only for seeding", async () => {
    const today = await f.day(0);
    const offered = await rows<{ slot_start: string; ok: boolean }>(
      `select slot_start::text, slot_start >= now() + interval '60 minutes' as ok
       from public.get_available_slots($1, $2, $3::date)`,
      [f.doctorId, f.serviceId, today],
    );
    expect(offered.every((row) => row.ok)).toBe(true);

    // The clock-free generator (seed/test helper) returns the full day...
    const all = await one<{ n: string }>(
      `select count(*)::text as n from app_private.generate_slots($1, $2, $3::date, null, true)`,
      [f.doctorId, f.serviceId, today],
    );
    expect(Number(all.n)).toBe(6);
    // ...but it is not reachable by API roles.
    const { rows: exposed } = await pool.query(
      `select has_function_privilege('anon', 'app_private.generate_slots(uuid,uuid,date,uuid,boolean)', 'EXECUTE') as a,
              has_schema_privilege('anon', 'app_private', 'USAGE') as u`,
    );
    expect(exposed[0]).toEqual({ a: false, u: false });
  });

  it("offers nothing for inactive doctors, inactive services or unlinked pairs", async () => {
    const date = await f.day(3);
    await pool.query(`update doctors set is_active = false where id = $1`, [f.doctorId]);
    expect(await slotTimes(f, date)).toEqual([]);
    await pool.query(`update doctors set is_active = true where id = $1`, [f.doctorId]);

    await pool.query(`update services set is_active = false where id = $1`, [f.serviceId]);
    expect(await slotTimes(f, date)).toEqual([]);
    await pool.query(`update services set is_active = true where id = $1`, [f.serviceId]);

    await pool.query(`delete from doctor_services where doctor_id = $1 and service_id = $2`, [
      f.doctorId,
      f.serviceId,
    ]);
    expect(await slotTimes(f, date)).toEqual([]);
    await pool.query(`insert into doctor_services (doctor_id, service_id) values ($1, $2)`, [
      f.doctorId,
      f.serviceId,
    ]);
    expect((await slotTimes(f, date)).length).toBe(6);
  });

  it("removes slots taken by active appointments, including neighbours of longer visits, and frees them on cancellation", async () => {
    const date = await f.day(12);
    const first = await book(f, await startOf(date, "10:00"));
    expect(first.ok).toBe(true);
    expect(await slotTimes(f, date)).toEqual(["09:00", "09:30", "10:30", "11:00", "11:30"]);

    // A 60-minute block starting 09:30 would collide with the 10:00 booking, so only 09:00 (ends 10:00) fits before it.
    expect(await slotTimes(f, date, f.longServiceId)).toEqual(["09:00", "10:30", "11:00"]);

    await pool.query(`update appointments set status = 'cancelled' where reference = $1`, [
      first.reference,
    ]);
    expect((await slotTimes(f, date)).length).toBe(6);
  });

  it("generates slots in the clinic timezone", async () => {
    await inRollback(async (client) => {
      await client.query(`update clinics set timezone = 'UTC'`);
      const day = (await client.query(`select ((now() at time zone 'UTC')::date + 3)::text as d`))
        .rows[0].d as string;
      const result = await client.query(
        `select to_char(slot_start at time zone 'UTC', 'HH24:MI') as t from public.get_available_slots($1, $2, $3::date) order by slot_start limit 1`,
        [f.doctorId, f.serviceId, day],
      );
      expect(result.rows[0]?.t).toBe("09:00");
    });
  });

  it("reports which dates have availability", async () => {
    const [from, to] = [await f.day(1), await f.day(5)];
    await pool.query(
      `insert into blocked_dates (doctor_id, start_date, end_date, kind, reason) values ($1, $2, $2, 'unavailable', $3)`,
      [f.doctorId, await f.day(3), `${f.tag} dates`],
    );
    try {
      const result = await rows<{ slot_date: string; slot_count: number }>(
        `select slot_date::text, slot_count from public.get_available_dates($1, $2, $3::date, $4::date) order by 1`,
        [f.doctorId, f.serviceId, from, to],
      );
      expect(result.map((row) => row.slot_date)).toEqual([
        await f.day(1),
        await f.day(2),
        await f.day(4),
        await f.day(5),
      ]);
      expect(result.every((row) => row.slot_count === 6)).toBe(true);
    } finally {
      await pool.query(`delete from blocked_dates where reason = $1`, [`${f.tag} dates`]);
    }
  });

  it("rejects absurd date ranges", async () => {
    await expect(
      pool.query(
        `select * from public.get_available_dates($1, $2, current_date, current_date + 200)`,
        [f.doctorId, f.serviceId],
      ),
    ).rejects.toThrow(/Invalid date range/);
  });
});
