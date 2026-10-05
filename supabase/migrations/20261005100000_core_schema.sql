-- ClinicFlow core schema
--
-- Tables, constraints and indexes. Row Level Security, grants and the public
-- API functions live in later migrations so each file has one clear purpose.
--
-- Conventions
--   * Weekdays use the PostgreSQL day-of-week convention: 0 = Sunday ... 6 = Saturday.
--   * Every instant is stored as timestamptz. Wall-clock times (working hours,
--     breaks) are stored as `time` and interpreted in clinics.timezone.
--   * Helper functions that must not be callable through the Data API live in
--     the `app_private` schema, which is not exposed by PostgREST.

create extension if not exists btree_gist with schema extensions;

create schema if not exists app_private;
revoke all on schema app_private from public;

-- ---------------------------------------------------------------------------
-- Shared trigger helpers
-- ---------------------------------------------------------------------------

create or replace function app_private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- clinics (single-row table: this application serves one clinic)
-- ---------------------------------------------------------------------------

create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  tagline text,
  description text,
  phone text not null check (char_length(phone) between 5 and 30),
  email text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  address_line1 text not null,
  address_line2 text,
  city text not null,
  state text not null,
  postal_code text not null,
  timezone text not null default 'Asia/Kolkata',
  -- How far ahead patients may book, in days.
  booking_window_days smallint not null default 30
    check (booking_window_days between 1 and 180),
  -- Minimum notice before an appointment starts, in minutes.
  min_notice_minutes integer not null default 60
    check (min_notice_minutes between 0 and 10080),
  -- Cap on simultaneous active future bookings per mobile number (spam guard).
  max_active_bookings_per_phone smallint not null default 3
    check (max_active_bookings_per_phone between 1 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enforce "exactly one clinic".
create unique index clinics_single_row on public.clinics ((true));

create or replace function app_private.validate_clinic_timezone()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'Unknown timezone: %', new.timezone using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger clinics_validate_timezone
  before insert or update of timezone on public.clinics
  for each row execute function app_private.validate_clinic_timezone();

create trigger clinics_touch_updated_at
  before update on public.clinics
  for each row execute function app_private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- admin_profiles (one row per staff member allowed to use the dashboard)
-- ---------------------------------------------------------------------------

create table public.admin_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 120),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger admin_profiles_touch_updated_at
  before update on public.admin_profiles
  for each row execute function app_private.touch_updated_at();

-- Used by RLS policies and admin RPCs. SECURITY DEFINER so the check works even
-- though admin_profiles itself is locked down.
create or replace function app_private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_profiles p
    where p.id = (select auth.uid())
      and p.is_active
  );
$$;

-- ---------------------------------------------------------------------------
-- doctors, services and their relationship
-- ---------------------------------------------------------------------------

create table public.doctors (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  full_name text not null check (char_length(full_name) between 2 and 120),
  qualification text not null check (char_length(qualification) between 2 and 200),
  specialization text not null check (char_length(specialization) between 2 and 120),
  experience_years smallint not null check (experience_years between 0 and 70),
  bio text not null default '',
  languages text[] not null default '{}',
  -- Selects the colour palette of the locally rendered avatar illustration.
  avatar_theme text not null default 'teal'
    check (avatar_theme in ('teal', 'green', 'sand', 'clay')),
  -- Length of one bookable slot. Slots are generated on this grid.
  slot_minutes smallint not null default 20
    check (slot_minutes between 5 and 120 and slot_minutes % 5 = 0),
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger doctors_touch_updated_at
  before update on public.doctors
  for each row execute function app_private.touch_updated_at();

create table public.services (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 120),
  description text not null check (char_length(description) between 2 and 600),
  duration_minutes smallint not null check (duration_minutes between 5 and 240),
  -- Key of a locally bundled icon; the UI falls back to a default for unknown keys.
  icon text not null default 'stethoscope',
  is_active boolean not null default true,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger services_touch_updated_at
  before update on public.services
  for each row execute function app_private.touch_updated_at();

create table public.doctor_services (
  doctor_id uuid not null references public.doctors (id) on delete cascade,
  service_id uuid not null references public.services (id) on delete cascade,
  primary key (doctor_id, service_id)
);

create index doctor_services_service_idx on public.doctor_services (service_id);

-- ---------------------------------------------------------------------------
-- Availability: weekly hours, breaks and blocked dates
-- ---------------------------------------------------------------------------

-- A doctor may have several working windows per weekday (for example a morning
-- and an evening clinic) but they must not overlap.
create table public.doctor_availability (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  created_at timestamptz not null default now(),
  constraint doctor_availability_time_order check (end_time > start_time),
  constraint doctor_availability_no_overlap exclude using gist (
    doctor_id with =,
    weekday with =,
    tsrange(date '2000-01-01' + start_time, date '2000-01-01' + end_time, '[)') with &&
  )
);

create index doctor_availability_doctor_weekday_idx
  on public.doctor_availability (doctor_id, weekday);

-- Recurring breaks. weekday NULL means "every working day".
create table public.doctor_breaks (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors (id) on delete cascade,
  weekday smallint check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  label text not null default 'Break' check (char_length(label) between 1 and 80),
  created_at timestamptz not null default now(),
  constraint doctor_breaks_time_order check (end_time > start_time)
);

create index doctor_breaks_doctor_idx on public.doctor_breaks (doctor_id);

-- Whole-day closures. doctor_id NULL blocks the entire clinic (a holiday).
create table public.blocked_dates (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid references public.doctors (id) on delete cascade,
  start_date date not null,
  end_date date not null,
  kind text not null default 'unavailable' check (kind in ('holiday', 'unavailable')),
  reason text not null default '' check (char_length(reason) <= 200),
  created_by uuid references public.admin_profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  constraint blocked_dates_range_order check (end_date >= start_date),
  constraint blocked_dates_max_span check (end_date - start_date <= 366)
);

create index blocked_dates_doctor_range_idx
  on public.blocked_dates (doctor_id, start_date, end_date);
create index blocked_dates_range_idx on public.blocked_dates (start_date, end_date);

-- ---------------------------------------------------------------------------
-- Appointments
-- ---------------------------------------------------------------------------

-- Non-guessable, human-friendly booking reference such as CF-7K4MP-9QXD2.
-- gen_random_uuid() is a cryptographically strong source available in core
-- PostgreSQL, so no extension is needed. 32-symbol alphabet without I and O.
create or replace function app_private.generate_booking_reference()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  random_bytes bytea := pg_catalog.uuid_send(gen_random_uuid());
  result text := '';
  i integer;
begin
  for i in 0..9 loop
    result := result || pg_catalog.substr(alphabet, (pg_catalog.get_byte(random_bytes, i) & 31) + 1, 1);
  end loop;
  return 'CF-' || pg_catalog.substr(result, 1, 5) || '-' || pg_catalog.substr(result, 6, 5);
end;
$$;

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default app_private.generate_booking_reference()
    check (reference ~ '^CF-[A-Z2-9]{5}-[A-Z2-9]{5}$'),
  doctor_id uuid not null references public.doctors (id) on delete restrict,
  service_id uuid not null references public.services (id) on delete restrict,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'completed', 'cancelled', 'no_show')),
  patient_name text not null check (char_length(btrim(patient_name)) between 2 and 100),
  -- Normalised E.164 number, for example +919876543210.
  patient_phone text not null check (patient_phone ~ '^\+[1-9][0-9]{7,14}$'),
  patient_email text check (
    patient_email is null
    or (char_length(patient_email) <= 254 and patient_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
  ),
  age_range text check (
    age_range is null
    or age_range in ('0-12', '13-17', '18-30', '31-45', '46-60', '61+')
  ),
  -- Deliberately short and optional. The UI tells patients not to enter medical details.
  visit_reason text check (visit_reason is null or char_length(visit_reason) <= 300),
  consent_given boolean not null check (consent_given),
  consent_at timestamptz not null default now(),
  source text not null default 'web' check (source in ('web', 'admin')),
  admin_notes text check (admin_notes is null or char_length(admin_notes) <= 1000),
  cancellation_reason text check (
    cancellation_reason is null or char_length(cancellation_reason) <= 300
  ),
  status_changed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointments_time_order check (end_at > start_at),
  -- The database-level guarantee against double booking: two active
  -- appointments for the same doctor can never overlap, regardless of how many
  -- requests race. Cancelled, completed and no-show rows release the slot.
  constraint appointments_no_double_booking exclude using gist (
    doctor_id with =,
    tstzrange(start_at, end_at, '[)') with &&
  ) where (status in ('pending', 'confirmed'))
);

create index appointments_start_idx on public.appointments (start_at);
create index appointments_doctor_start_idx on public.appointments (doctor_id, start_at);
create index appointments_status_start_idx on public.appointments (status, start_at);
create index appointments_service_idx on public.appointments (service_id);
create index appointments_phone_idx on public.appointments (patient_phone);
create index appointments_created_idx on public.appointments (created_at desc);

create trigger appointments_touch_updated_at
  before update on public.appointments
  for each row execute function app_private.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Appointment history (audit trail shown in the admin dashboard)
-- ---------------------------------------------------------------------------

create table public.appointment_status_history (
  id bigint generated always as identity primary key,
  appointment_id uuid not null references public.appointments (id) on delete cascade,
  event text not null check (event in ('created', 'status_changed', 'rescheduled', 'note_updated')),
  from_status text,
  to_status text,
  changed_by uuid references public.admin_profiles (id) on delete set null,
  note text check (note is null or char_length(note) <= 500),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index appointment_status_history_appointment_idx
  on public.appointment_status_history (appointment_id, created_at);
create index appointment_status_history_created_idx
  on public.appointment_status_history (created_at desc);

-- ---------------------------------------------------------------------------
-- Automation event outbox (future n8n integration)
-- ---------------------------------------------------------------------------

create table public.automation_events (
  -- Event identifier delivered to consumers; stable across retries.
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in (
    'appointment.created',
    'appointment.confirmed',
    'appointment.rescheduled',
    'appointment.completed',
    'appointment.cancelled',
    'appointment.reminder_due'
  )),
  appointment_id uuid references public.appointments (id) on delete set null,
  -- Prevents duplicate events for the same logical occurrence (for example one
  -- reminder per appointment time).
  dedupe_key text,
  payload jsonb not null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'delivered', 'failed', 'dead')),
  attempts integer not null default 0 check (attempts >= 0),
  next_attempt_at timestamptz not null default now(),
  locked_until timestamptz,
  last_error text check (last_error is null or char_length(last_error) <= 500),
  last_attempt_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index automation_events_dedupe_key_idx
  on public.automation_events (dedupe_key) where dedupe_key is not null;
create index automation_events_due_idx
  on public.automation_events (next_attempt_at) where status in ('pending', 'failed');
create index automation_events_appointment_idx on public.automation_events (appointment_id);
create index automation_events_created_idx on public.automation_events (created_at desc);
