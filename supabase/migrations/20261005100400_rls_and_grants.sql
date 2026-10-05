-- Row Level Security and privileges.
--
-- Security model
--   * Visitors (role `anon`) can read public clinic content and call the public
--     booking functions. They have NO access to the appointments table at all.
--   * Administrators (role `authenticated` AND an active row in admin_profiles)
--     can read everything they need through RLS policies, and change data only
--     through the admin_* functions (appointments) or the specific policies
--     below (breaks, blocked dates, slot length).
--   * The service role (server-only, never shipped to browsers) is used only by
--     the optional automation dispatcher and the admin-creation script.
--
-- Everything is revoked first and granted explicitly, so the result does not
-- depend on the default privileges of whichever Supabase project this runs in.

-- ---------------------------------------------------------------------------
-- 1. Start from zero
-- ---------------------------------------------------------------------------

revoke all on all tables in schema public from public, anon, authenticated;
revoke all on all sequences in schema public from public, anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

-- Objects created by later migrations are private until explicitly granted.
alter default privileges in schema public revoke all on tables from public, anon, authenticated;
alter default privileges in schema public revoke all on sequences from public, anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

revoke all on all functions in schema app_private from public, anon, authenticated;
grant usage on schema app_private to authenticated;
grant execute on function app_private.is_admin() to authenticated;

-- The trusted service role may insert appointments directly (for example from a maintenance
-- script); the booking reference column default needs this one helper. It exposes nothing.
grant usage on schema app_private to service_role;
grant execute on function app_private.generate_booking_reference() to service_role;

-- ---------------------------------------------------------------------------
-- 2. Enable RLS everywhere
-- ---------------------------------------------------------------------------

alter table public.clinics enable row level security;
alter table public.admin_profiles enable row level security;
alter table public.doctors enable row level security;
alter table public.services enable row level security;
alter table public.doctor_services enable row level security;
alter table public.doctor_availability enable row level security;
alter table public.doctor_breaks enable row level security;
alter table public.blocked_dates enable row level security;
alter table public.appointments enable row level security;
alter table public.appointment_status_history enable row level security;
alter table public.automation_events enable row level security;

-- ---------------------------------------------------------------------------
-- 3. Public content (read-only)
-- ---------------------------------------------------------------------------

grant select on public.clinics to anon, authenticated;
create policy clinics_public_read on public.clinics
  for select to anon, authenticated using (true);

grant select on public.doctors to anon, authenticated;
create policy doctors_public_read on public.doctors
  for select to anon, authenticated using (is_active);
create policy doctors_admin_read on public.doctors
  for select to authenticated using ((select app_private.is_admin()));

grant select on public.services to anon, authenticated;
create policy services_public_read on public.services
  for select to anon, authenticated using (is_active);
create policy services_admin_read on public.services
  for select to authenticated using ((select app_private.is_admin()));

grant select on public.doctor_services to anon, authenticated;
create policy doctor_services_public_read on public.doctor_services
  for select to anon, authenticated using (true);

grant select on public.doctor_availability to anon, authenticated;
create policy doctor_availability_public_read on public.doctor_availability
  for select to anon, authenticated using (true);

-- Visitors may see clinic-wide holidays only; individual doctors'
-- unavailability reasons stay private.
grant select on public.blocked_dates to anon, authenticated;
create policy blocked_dates_public_read on public.blocked_dates
  for select to anon, authenticated using (doctor_id is null and kind = 'holiday');
create policy blocked_dates_admin_read on public.blocked_dates
  for select to authenticated using ((select app_private.is_admin()));

-- ---------------------------------------------------------------------------
-- 4. Administrator-only data
-- ---------------------------------------------------------------------------

grant select on public.admin_profiles to authenticated;
create policy admin_profiles_read_own on public.admin_profiles
  for select to authenticated using (id = (select auth.uid()));

grant select on public.appointments to authenticated;
create policy appointments_admin_read on public.appointments
  for select to authenticated using ((select app_private.is_admin()));

grant select on public.appointment_status_history to authenticated;
create policy appointment_history_admin_read on public.appointment_status_history
  for select to authenticated using ((select app_private.is_admin()));

grant select on public.automation_events to authenticated;
create policy automation_events_admin_read on public.automation_events
  for select to authenticated using ((select app_private.is_admin()));

-- ---------------------------------------------------------------------------
-- 5. Administrator writes outside the admin_* functions
-- ---------------------------------------------------------------------------

grant select, insert, update, delete on public.doctor_breaks to authenticated;
create policy doctor_breaks_admin_all on public.doctor_breaks
  for all to authenticated
  using ((select app_private.is_admin()))
  with check ((select app_private.is_admin()));

grant insert, update, delete on public.blocked_dates to authenticated;
create policy blocked_dates_admin_insert on public.blocked_dates
  for insert to authenticated with check ((select app_private.is_admin()));
create policy blocked_dates_admin_update on public.blocked_dates
  for update to authenticated
  using ((select app_private.is_admin()))
  with check ((select app_private.is_admin()));
create policy blocked_dates_admin_delete on public.blocked_dates
  for delete to authenticated using ((select app_private.is_admin()));

-- Administrators may change only slot length and active flag directly.
grant update (slot_minutes, is_active) on public.doctors to authenticated;
create policy doctors_admin_update on public.doctors
  for update to authenticated
  using ((select app_private.is_admin()))
  with check ((select app_private.is_admin()));

-- ---------------------------------------------------------------------------
-- 6. Function privileges
-- ---------------------------------------------------------------------------

-- Public booking API
grant execute on function public.get_available_slots(uuid, uuid, date) to anon, authenticated;
grant execute on function public.get_available_dates(uuid, uuid, date, date) to anon, authenticated;
grant execute on function public.book_appointment(uuid, uuid, timestamptz, text, text, text, text, text, boolean)
  to anon, authenticated;
grant execute on function public.get_booking_confirmation(text) to anon, authenticated;
grant execute on function public.health_check() to anon, authenticated, service_role;

-- Administrator API (each function re-checks app_private.is_admin())
grant execute on function public.admin_set_appointment_status(uuid, text, text) to authenticated;
grant execute on function public.admin_get_reschedule_slots(uuid, date) to authenticated;
grant execute on function public.admin_reschedule_appointment(uuid, timestamptz, text) to authenticated;
grant execute on function public.admin_update_appointment_notes(uuid, text) to authenticated;
grant execute on function public.admin_search_appointments(text, text, uuid, uuid, date, date, text, integer, integer)
  to authenticated;
grant execute on function public.admin_set_doctor_schedule(uuid, integer, jsonb) to authenticated;
grant execute on function public.admin_dashboard_summary() to authenticated;
grant execute on function public.admin_retry_automation_event(uuid) to authenticated;

-- Automation dispatcher (service role only)
grant execute on function public.enqueue_due_reminders(integer) to service_role;
grant execute on function public.claim_automation_events(integer, integer) to service_role;
grant execute on function public.complete_automation_event(uuid) to service_role;
grant execute on function public.fail_automation_event(uuid, text, integer) to service_role;
grant execute on function public.purge_delivered_automation_events(integer) to service_role;

-- The service role bypasses RLS but still needs table privileges for the
-- administrator-creation script and dispatcher bookkeeping.
grant select, insert, update, delete on public.admin_profiles to service_role;
grant select, update on public.automation_events to service_role;
