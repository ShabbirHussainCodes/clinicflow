import { afterAll, describe, expect, it } from "vitest";

import { asRole, dbAvailable, expectSqlState, pool, rows } from "./helpers";

const available = await dbAvailable();

/**
 * A structural audit of privileges. If a future migration adds a function or table and forgets to
 * lock it down, one of these tests fails. See docs/ARCHITECTURE.md ("Security model").
 */
describe.skipIf(!available)("privilege audit", () => {
  afterAll(async () => {
    await pool.end();
  });

  const PUBLIC_API = [
    "book_appointment",
    "get_available_dates",
    "get_available_slots",
    "get_booking_confirmation",
    "health_check",
  ];
  const ADMIN_API = [
    "admin_dashboard_summary",
    "admin_get_reschedule_slots",
    "admin_reschedule_appointment",
    "admin_retry_automation_event",
    "admin_search_appointments",
    "admin_set_appointment_status",
    "admin_set_doctor_schedule",
    "admin_update_appointment_notes",
  ];
  const SERVICE_API = [
    "claim_automation_events",
    "complete_automation_event",
    "enqueue_due_reminders",
    "fail_automation_event",
    "purge_delivered_automation_events",
  ];

  async function executable(role: string, schema = "public"): Promise<string[]> {
    const result = await rows<{ proname: string }>(
      `select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = $2 and has_function_privilege($1, p.oid, 'EXECUTE') order by 1`,
      [role, schema],
    );
    return [...new Set(result.map((row) => row.proname))];
  }

  it("exposes exactly the public booking API to anonymous visitors", async () => {
    expect(await executable("anon")).toEqual([...PUBLIC_API].sort());
  });

  it("exposes the public and administrator APIs, and nothing else, to signed-in users", async () => {
    expect(await executable("authenticated")).toEqual([...PUBLIC_API, ...ADMIN_API].sort());
  });

  it("exposes the dispatcher functions to the service role only", async () => {
    const anon = await executable("anon");
    const authenticated = await executable("authenticated");
    for (const name of SERVICE_API) {
      expect(anon).not.toContain(name);
      expect(authenticated).not.toContain(name);
      expect(await executable("service_role")).toContain(name);
    }
  });

  it("grants no function privilege to the PUBLIC pseudo-role", async () => {
    const result = await rows<{ proname: string }>(
      `select p.proname
       from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
       cross join lateral aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
       where n.nspname in ('public', 'app_private') and a.grantee = 0 and a.privilege_type = 'EXECUTE'`,
    );
    expect(result).toEqual([]);
  });

  it("keeps internal helpers unreachable: only is_admin is callable by signed-in users", async () => {
    expect(await executable("anon", "app_private")).toEqual([]);
    expect(await executable("authenticated", "app_private")).toEqual(["is_admin"]);
    const usage = await rows(
      `select has_schema_privilege('anon', 'app_private', 'USAGE') as anon, has_schema_privilege('authenticated', 'app_private', 'USAGE') as auth`,
    );
    expect(usage[0]).toEqual({ anon: false, auth: true });
  });

  it("pins search_path on every SECURITY DEFINER function", async () => {
    const result = await rows<{ nspname: string; proname: string }>(
      `select n.nspname, p.proname
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname in ('public', 'app_private') and p.prosecdef
         and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')`,
    );
    expect(result).toEqual([]);
  });

  it("enables Row Level Security on every table in the public schema", async () => {
    const result = await rows<{ relname: string }>(
      `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity`,
    );
    expect(result).toEqual([]);
  });

  it("limits anonymous table access to read-only public content", async () => {
    const result = await rows<{ table_name: string; privilege_type: string }>(
      `select table_name, privilege_type from information_schema.role_table_grants
       where grantee = 'anon' and table_schema = 'public' order by 1, 2`,
    );
    expect(result).toEqual([
      { table_name: "blocked_dates", privilege_type: "SELECT" },
      { table_name: "clinics", privilege_type: "SELECT" },
      { table_name: "doctor_availability", privilege_type: "SELECT" },
      { table_name: "doctor_services", privilege_type: "SELECT" },
      { table_name: "doctors", privilege_type: "SELECT" },
      { table_name: "services", privilege_type: "SELECT" },
    ]);
  });

  it("never lets signed-in users insert, update or delete appointment data directly", async () => {
    const result = await rows<{ table_name: string; privilege_type: string }>(
      `select table_name, privilege_type from information_schema.role_table_grants
       where grantee = 'authenticated' and table_schema = 'public'
         and table_name in ('appointments', 'appointment_status_history', 'automation_events', 'admin_profiles', 'clinics', 'services')
         and privilege_type <> 'SELECT'`,
    );
    expect(result).toEqual([]);
  });

  it("shows anonymous visitors only active doctors and services, and only clinic-wide holidays", async () => {
    await asRole("anon", null, async (client) => {
      expect(
        (await client.query("select count(*)::int as n from doctors where not is_active")).rows[0]
          .n,
      ).toBe(0);
      expect(
        (await client.query("select count(*)::int as n from services where not is_active")).rows[0]
          .n,
      ).toBe(0);
      expect(
        (
          await client.query(
            "select count(*)::int as n from blocked_dates where doctor_id is not null or kind <> 'holiday'",
          )
        ).rows[0].n,
      ).toBe(0);
      await expectSqlState(client, "select * from appointments limit 1", "42501");
      await expectSqlState(
        client,
        "insert into doctors (slug, full_name, qualification, specialization, experience_years) values ('x','x','x','x',1)",
        "42501",
      );
    });
  });
});
