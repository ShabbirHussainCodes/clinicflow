import { randomUUID } from "node:crypto";

import { Pool, type PoolClient } from "pg";

/**
 * Database integration tests run against the LOCAL Supabase Postgres (`npm run db:start`).
 * They create their own isolated fixtures (a throw-away doctor and service) and remove them again,
 * so they are safe to run against a database that also holds the demo seed data.
 */

export const DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

export const pool = new Pool({ connectionString: DATABASE_URL, max: 30 });

export async function dbAvailable(): Promise<boolean> {
  try {
    await pool.query("select 1");
    return true;
  } catch {
    return false;
  }
}

export async function rows<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await pool.query(sql, params);
  return result.rows as T[];
}

export async function one<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = [],
): Promise<T> {
  const [row] = await rows<T>(sql, params);
  if (!row) throw new Error(`Expected one row from: ${sql}`);
  return row;
}

/** Runs `fn` inside a transaction that is always rolled back. */
export async function inRollback<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    return await fn(client);
  } finally {
    await client.query("rollback");
    client.release();
  }
}

/**
 * Runs `fn` as a Supabase API role (anon / authenticated) with optional JWT claims. The transaction
 * commits when `fn` succeeds so that effects of admin_* functions can be verified afterwards (all
 * data is created by the tests themselves and removed by destroyFixture).
 */
export async function asRole<T>(
  role: "anon" | "authenticated",
  userId: string | null,
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(`set local role ${role}`);
    if (userId) {
      await client.query("select set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: userId, role: "authenticated" }),
      ]);
    }
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}

/** Expects a statement to fail with the given SQLSTATE and returns the error. */
export async function expectSqlState(
  client: PoolClient,
  sql: string,
  state: string,
  params: unknown[] = [],
) {
  await client.query("savepoint expecting");
  try {
    await client.query(sql, params);
  } catch (error) {
    await client.query("rollback to savepoint expecting");
    const code = (error as { code?: string }).code;
    if (code !== state)
      throw new Error(`Expected SQLSTATE ${state} but got ${code}: ${(error as Error).message}`);
    return error as Error;
  }
  await client.query("rollback to savepoint expecting");
  throw new Error(`Expected SQLSTATE ${state} but the statement succeeded: ${sql}`);
}

export interface Fixture {
  doctorId: string;
  serviceId: string;
  /** A 45-minute service on the same doctor (blocks 60 minutes on a 30-minute grid). */
  longServiceId: string;
  tag: string;
  /**
   * Calendar date (YYYY-MM-DD, clinic timezone). For 1 <= n <= 29 this is the n-th upcoming day that
   * is not covered by a clinic-wide closure (the demo seed contains one), so tests are independent
   * of the seed. Other values are plain offsets from today (0 = today, -1 = yesterday, 30 = edge of window).
   */
  day: (n: number) => Promise<string>;
}

export const TZ = "Asia/Kolkata";

/**
 * A doctor who works every day 09:00-12:00 on a 30-minute grid, offering a 30-minute service and a
 * 45-minute service. No breaks, so each test adds exactly the rules it wants to exercise.
 */
export async function createFixture(): Promise<Fixture> {
  const tag = `dbtest-${randomUUID().slice(0, 8)}`;
  const doctor = await one<{ id: string }>(
    `insert into doctors (slug, full_name, qualification, specialization, experience_years, slot_minutes)
     values ($1, $2, 'MBBS', 'Test Medicine', 5, 30) returning id`,
    [tag, `Dr. ${tag}`],
  );
  const service = await one<{ id: string }>(
    `insert into services (slug, name, description, duration_minutes) values ($1, $2, 'Test service', 30) returning id`,
    [`${tag}-s30`, `Service 30 ${tag}`],
  );
  const longService = await one<{ id: string }>(
    `insert into services (slug, name, description, duration_minutes) values ($1, $2, 'Long test service', 45) returning id`,
    [`${tag}-s45`, `Service 45 ${tag}`],
  );
  await pool.query(
    `insert into doctor_services (doctor_id, service_id) values ($1, $2), ($1, $3)`,
    [doctor.id, service.id, longService.id],
  );
  await pool.query(
    `insert into doctor_availability (doctor_id, weekday, start_time, end_time)
     select $1, d, '09:00', '12:00' from generate_series(0, 6) d`,
    [doctor.id],
  );

  return {
    doctorId: doctor.id,
    serviceId: service.id,
    longServiceId: longService.id,
    tag,
    day: async (n: number) => {
      if (n < 1 || n > 29) {
        return (
          await one<{ d: string }>(
            `select (((now() at time zone $1)::date) + $2::int)::text as d`,
            [TZ, n],
          )
        ).d;
      }
      const open = await rows<{ d: string }>(
        `select d::text as d
         from generate_series(1, 29) off,
              lateral (select ((now() at time zone $1)::date + off) as d) x
         where not exists (
           select 1 from blocked_dates b where b.doctor_id is null and x.d between b.start_date and b.end_date
         )
         order by off`,
        [TZ],
      );
      const date = open[n - 1]?.d;
      if (!date) throw new Error(`No open day #${n} available in the booking window`);
      return date;
    },
  };
}

export async function destroyFixture(fixture: Fixture): Promise<void> {
  const doctors = `select id from doctors where slug like $1`;
  const pattern = `${fixture.tag}%`;
  await pool.query(
    `delete from automation_events where payload #>> '{data,doctor,id}' in (select id::text from doctors where slug like $1)`,
    [pattern],
  );
  await pool.query(`delete from appointments where doctor_id in (${doctors})`, [pattern]);
  await pool.query(`delete from blocked_dates where doctor_id in (${doctors}) or reason like $1`, [
    pattern,
  ]);
  await pool.query(`delete from doctors where slug like $1`, [pattern]);
  await pool.query(`delete from services where slug like $1`, [pattern]);
}

/** Creates an extra throw-away doctor (cleaned up with the fixture) so tests can seed rows freely. */
export async function createSideDoctor(fixture: Fixture): Promise<string> {
  const row = await one<{ id: string }>(
    `insert into doctors (slug, full_name, qualification, specialization, experience_years)
     values ($1, 'Dr. Side', 'MBBS', 'Test', 1) returning id`,
    [`${fixture.tag}-${randomUUID().slice(0, 6)}`],
  );
  return row.id;
}

/** Local wall-clock times ("09:00") of the slots offered for a day. */
export async function slotTimes(
  fixture: Fixture,
  date: string,
  serviceId: string = fixture.serviceId,
): Promise<string[]> {
  const result = await rows<{ t: string }>(
    `select to_char(slot_start at time zone $4, 'HH24:MI') as t
     from public.get_available_slots($1, $2, $3::date) order by slot_start`,
    [fixture.doctorId, serviceId, date, TZ],
  );
  return result.map((row) => row.t);
}

export async function startOf(date: string, time: string): Promise<string> {
  return (
    await one<{ t: string }>(`select (($1::date + $2::time) at time zone $3)::text as t`, [
      date,
      time,
      TZ,
    ])
  ).t;
}

export interface BookResult {
  ok: boolean;
  reference?: string;
  error?: string;
  field?: string;
}

let phoneCounter = Math.floor(Math.random() * 1e6);
export function nextPhone(): string {
  phoneCounter += 1;
  return `+9190001${String(phoneCounter % 100000).padStart(5, "0")}`;
}

export async function book(
  fixture: Fixture,
  startAt: string,
  options: {
    serviceId?: string;
    name?: string;
    phone?: string;
    email?: string | null;
    age?: string | null;
    reason?: string | null;
    consent?: boolean;
    client?: Pick<PoolClient, "query">;
  } = {},
): Promise<BookResult> {
  const runner = options.client ?? pool;
  const result = await runner.query(
    `select public.book_appointment($1, $2, $3::timestamptz, $4, $5, $6, $7, $8, $9) as r`,
    [
      fixture.doctorId,
      options.serviceId ?? fixture.serviceId,
      startAt,
      options.name ?? `DBTEST ${fixture.tag}`,
      options.phone ?? nextPhone(),
      options.email ?? null,
      options.age ?? null,
      options.reason ?? null,
      options.consent ?? true,
    ],
  );
  return result.rows[0].r as BookResult;
}

/** Creates a user in auth.users plus an admin profile; returns the user id. */
export async function createAdminUser(active = true): Promise<string> {
  const id = randomUUID();
  await insertAuthUser(id);
  await pool.query(
    `insert into admin_profiles (id, full_name, is_active) values ($1, 'DBTEST Admin', $2)`,
    [id, active],
  );
  return id;
}

/** A real auth user with NO admin profile. */
export async function createOutsiderUser(): Promise<string> {
  const id = randomUUID();
  await insertAuthUser(id);
  return id;
}

async function insertAuthUser(id: string): Promise<void> {
  await pool.query(
    `insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                             created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
     values ('00000000-0000-0000-0000-000000000000', $1, 'authenticated', 'authenticated', $2, '', now(), now(), now(),
             '{"provider":"email","providers":["email"]}', '{}')`,
    [id, `dbtest-${id}@clinicflow.test`],
  );
}

export async function deleteAuthUsers(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  await pool.query(`delete from auth.users where id = any($1::uuid[])`, [ids]);
}
