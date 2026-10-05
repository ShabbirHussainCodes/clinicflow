# Database reference

Source of truth: `supabase/migrations/*.sql` (apply in filename order). Regenerate TypeScript types with `npm run db:types`.

| Migration                          | Purpose                                                                          |
| ---------------------------------- | -------------------------------------------------------------------------------- |
| `…100000_core_schema`              | Tables, constraints, indexes, `btree_gist`, `app_private` schema                 |
| `…100100_availability_and_booking` | Slot engine, public booking/confirmation RPCs, health check                      |
| `…100200_history_and_event_outbox` | History + outbox triggers, payload builder, reminders, dispatcher functions      |
| `…100300_admin_functions`          | Admin RPCs: status, reschedule, notes, search, schedule, dashboard, outbox retry |
| `…100400_rls_and_grants`           | Revokes everything, enables RLS, explicit policies and grants                    |

## Tables

`clinics` (exactly one row; timezone, booking window, min notice, per-phone cap) · `admin_profiles` (extends `auth.users`;
`is_active`) · `doctors` (slug, qualification, `slot_minutes`, `avatar_theme`) · `services` (duration, icon) ·
`doctor_services` · `doctor_availability` (weekday 0=Sunday, windows; overlapping windows rejected by an exclusion
constraint) · `doctor_breaks` (weekday NULL = every day) · `blocked_dates` (doctor NULL = whole clinic; `holiday`/`unavailable`) ·
`appointments` · `appointment_status_history` (audit trail) · `automation_events` (outbox).

Appointment constraints: `end_at > start_at`; status in the five values; phone `^\+[1-9][0-9]{7,14}$`; consent must be true;
reference `^CF-[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$` (50 bits, from `gen_random_uuid()`, no extension needed); and
`EXCLUDE USING gist (doctor_id =, tstzrange(start_at,end_at) &&) WHERE status IN ('pending','confirmed')`.

## Functions

Public (anon + signed-in): `get_available_slots`, `get_available_dates`, `book_appointment`, `get_booking_confirmation`, `health_check`.
Admin (signed-in, each checks `app_private.is_admin()` and raises `42501` otherwise): `admin_set_appointment_status`,
`admin_reschedule_appointment`, `admin_get_reschedule_slots`, `admin_update_appointment_notes`, `admin_search_appointments`,
`admin_set_doctor_schedule`, `admin_dashboard_summary`, `admin_retry_automation_event`.
Service role only: `enqueue_due_reminders`, `claim_automation_events`, `complete_automation_event`, `fail_automation_event`,
`purge_delivered_automation_events`.
All `SECURITY DEFINER` functions pin `search_path`; helpers live in `app_private`, which the API does not expose.

## Access model (RLS and grants)

- `anon`: SELECT on clinics, active doctors/services, doctor_services, availability and **clinic-wide holidays only**. Nothing on appointments.
- `authenticated` + active `admin_profiles` row: SELECT on appointments, history, events, all doctors/services; direct writes only to breaks,
  blocked dates, and `doctors(slot_minutes,is_active)`. Appointment changes go through the admin functions.
- A signed-in user without an admin profile sees nothing and is refused by every admin function.
- `tests/db/security.test.ts` audits all of this structurally, so a future migration that forgets a revoke fails the suite.

## Seed data

`supabase/seed.sql` is fictional and date-relative: clinic, 4 doctors, 7 services, weekly hours, breaks, one clinic holiday and one
doctor leave, and about 700 appointments over ±3 weeks. It deletes the outbox events it triggers so demo data is never delivered.
For a real clinic, replace the clinic/doctor/service inserts with your own and drop the appointment block.

## Adding a migration

Create `supabase/migrations/<timestamp>_name.sql`, run `npm run db:reset`, `npm run db:types`, `npm run test:db`.
Re-state `revoke`/`grant` for any new function or table (default privileges are revoked, so new objects are private until granted).
