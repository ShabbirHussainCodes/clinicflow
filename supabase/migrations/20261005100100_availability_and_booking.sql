-- Availability engine and public booking API.
--
-- app_private.slots_for_day is the single source of truth for "which slots can
-- be booked". The public listing, the booking recheck and the admin
-- reschedule flow all call it, so the three can never disagree.
--
-- The appointments_no_double_booking exclusion constraint remains the final
-- guard: even if two transactions pass the availability check at the same
-- instant, the database rejects the second insert.

-- ---------------------------------------------------------------------------
-- Slot generation
-- ---------------------------------------------------------------------------
--
-- A slot is offered when ALL of these hold:
--   * doctor and service are active and linked to each other
--   * the date is within [today, today + booking_window_days] in clinic time
--   * the date is not blocked (clinic-wide or for this doctor)
--   * the whole appointment fits inside one of the doctor's weekly windows
--   * it does not overlap a recurring break
--   * it does not overlap an active (pending/confirmed) appointment
--   * it starts at least min_notice_minutes from now (this also removes the past)
--
-- Appointment length = service duration rounded UP to a whole number of the
-- doctor's slots, so the slot grid stays aligned.

create or replace function app_private.generate_slots(
  p_doctor_id uuid,
  p_service_id uuid,
  p_date date,
  p_exclude_appointment_id uuid default null,
  -- Seed data and tests only: skip the "not in the past" and booking-window
  -- rules. Everything else (hours, breaks, blocks, conflicts) still applies.
  p_ignore_clock boolean default false
)
returns table (slot_start timestamptz, slot_end timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_clinic public.clinics;
  v_doctor public.doctors;
  v_service public.services;
  v_now timestamptz := now();
  v_today date;
  v_block_minutes integer;
  v_weekday smallint;
begin
  select * into v_clinic from public.clinics limit 1;
  if not found then
    return;
  end if;

  select * into v_doctor from public.doctors d where d.id = p_doctor_id and d.is_active;
  if not found then
    return;
  end if;

  select * into v_service from public.services s where s.id = p_service_id and s.is_active;
  if not found then
    return;
  end if;

  if not exists (
    select 1 from public.doctor_services ds
    where ds.doctor_id = p_doctor_id and ds.service_id = p_service_id
  ) then
    return;
  end if;

  v_today := (v_now at time zone v_clinic.timezone)::date;
  if not p_ignore_clock
     and (p_date < v_today or p_date > v_today + v_clinic.booking_window_days) then
    return;
  end if;

  if exists (
    select 1 from public.blocked_dates b
    where (b.doctor_id is null or b.doctor_id = p_doctor_id)
      and p_date between b.start_date and b.end_date
  ) then
    return;
  end if;

  v_block_minutes := (
    ceil(v_service.duration_minutes::numeric / v_doctor.slot_minutes) * v_doctor.slot_minutes
  )::integer;
  v_weekday := extract(dow from p_date)::smallint;

  return query
  with windows as (
    select a.start_time, a.end_time
    from public.doctor_availability a
    where a.doctor_id = p_doctor_id and a.weekday = v_weekday
  ),
  candidates as (
    select
      gs.local_start,
      gs.local_start + make_interval(mins => v_block_minutes) as local_end
    from windows w
    cross join lateral generate_series(
      p_date + w.start_time,
      p_date + w.end_time - make_interval(mins => v_block_minutes),
      make_interval(mins => v_doctor.slot_minutes)
    ) as gs(local_start)
  ),
  resolved as (
    select
      (c.local_start at time zone v_clinic.timezone) as s_start,
      (c.local_end at time zone v_clinic.timezone) as s_end,
      c.local_start,
      c.local_end
    from candidates c
  )
  select r.s_start, r.s_end
  from resolved r
  where (p_ignore_clock or r.s_start >= v_now + make_interval(mins => v_clinic.min_notice_minutes))
    and not exists (
      select 1
      from public.doctor_breaks br
      where br.doctor_id = p_doctor_id
        and (br.weekday is null or br.weekday = v_weekday)
        and (p_date + br.start_time) < r.local_end
        and (p_date + br.end_time) > r.local_start
    )
    and not exists (
      select 1
      from public.appointments ap
      where ap.doctor_id = p_doctor_id
        and ap.status in ('pending', 'confirmed')
        and (p_exclude_appointment_id is null or ap.id <> p_exclude_appointment_id)
        and tstzrange(ap.start_at, ap.end_at, '[)') && tstzrange(r.s_start, r.s_end, '[)')
    )
  order by r.s_start;
end;
$$;

-- The rule set every real booking path uses: the clock always applies.
create or replace function app_private.slots_for_day(
  p_doctor_id uuid,
  p_service_id uuid,
  p_date date,
  p_exclude_appointment_id uuid default null
)
returns table (slot_start timestamptz, slot_end timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select g.slot_start, g.slot_end
  from app_private.generate_slots(p_doctor_id, p_service_id, p_date, p_exclude_appointment_id, false) g;
$$;

-- ---------------------------------------------------------------------------
-- Public API: availability
-- ---------------------------------------------------------------------------

create or replace function public.get_available_slots(
  p_doctor_id uuid,
  p_service_id uuid,
  p_date date
)
returns table (slot_start timestamptz, slot_end timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select s.slot_start, s.slot_end
  from app_private.slots_for_day(p_doctor_id, p_service_id, p_date) s;
$$;

-- Dates in [p_from, p_to] that still have at least one free slot.
create or replace function public.get_available_dates(
  p_doctor_id uuid,
  p_service_id uuid,
  p_from date,
  p_to date
)
returns table (slot_date date, slot_count integer)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 62 then
    raise exception 'Invalid date range' using errcode = '22023';
  end if;

  return query
  select d.day::date, count(*)::integer
  from generate_series(p_from::timestamp, p_to::timestamp, interval '1 day') as d(day)
  cross join lateral app_private.slots_for_day(p_doctor_id, p_service_id, d.day::date) s
  group by d.day
  order by d.day;
end;
$$;

-- ---------------------------------------------------------------------------
-- Public API: booking
-- ---------------------------------------------------------------------------
--
-- Returns jsonb:
--   { "ok": true,  "reference": "CF-XXXXX-XXXXX" }
--   { "ok": false, "error": "slot_unavailable" | "too_many_bookings" | "invalid_input", "field"?: "..." }
--
-- The application validates every field first; the checks here protect against
-- callers using the RPC directly.

create or replace function public.book_appointment(
  p_doctor_id uuid,
  p_service_id uuid,
  p_start_at timestamptz,
  p_patient_name text,
  p_patient_phone text,
  p_patient_email text default null,
  p_age_range text default null,
  p_visit_reason text default null,
  p_consent boolean default false
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_clinic public.clinics;
  v_slot record;
  v_name text := btrim(coalesce(p_patient_name, ''));
  v_phone text := btrim(coalesce(p_patient_phone, ''));
  v_email text := nullif(btrim(coalesce(p_patient_email, '')), '');
  v_age text := nullif(btrim(coalesce(p_age_range, '')), '');
  v_reason text := nullif(btrim(coalesce(p_visit_reason, '')), '');
  v_active integer;
  v_reference text;
  v_attempt integer := 0;
begin
  if p_doctor_id is null or p_service_id is null or p_start_at is null then
    return jsonb_build_object('ok', false, 'error', 'invalid_input', 'field', 'slot');
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 100 then
    return jsonb_build_object('ok', false, 'error', 'invalid_input', 'field', 'patient_name');
  end if;
  if v_phone !~ '^\+[1-9][0-9]{7,14}$' then
    return jsonb_build_object('ok', false, 'error', 'invalid_input', 'field', 'patient_phone');
  end if;
  if v_email is not null
     and (char_length(v_email) > 254 or v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$') then
    return jsonb_build_object('ok', false, 'error', 'invalid_input', 'field', 'patient_email');
  end if;
  if v_age is not null and v_age not in ('0-12', '13-17', '18-30', '31-45', '46-60', '61+') then
    return jsonb_build_object('ok', false, 'error', 'invalid_input', 'field', 'age_range');
  end if;
  if v_reason is not null and char_length(v_reason) > 300 then
    return jsonb_build_object('ok', false, 'error', 'invalid_input', 'field', 'visit_reason');
  end if;
  if p_consent is not true then
    return jsonb_build_object('ok', false, 'error', 'invalid_input', 'field', 'consent');
  end if;

  select * into v_clinic from public.clinics limit 1;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'slot_unavailable');
  end if;

  -- Serialise concurrent bookings for the same doctor. The exclusion
  -- constraint below is still the final guard if this were ever bypassed.
  perform pg_advisory_xact_lock(
    pg_catalog.hashtextextended('clinicflow:doctor:' || p_doctor_id::text, 0)
  );

  select s.slot_start, s.slot_end into v_slot
  from app_private.slots_for_day(
    p_doctor_id,
    p_service_id,
    (p_start_at at time zone v_clinic.timezone)::date
  ) s
  where s.slot_start = p_start_at;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'slot_unavailable');
  end if;

  select count(*) into v_active
  from public.appointments a
  where a.patient_phone = v_phone
    and a.status in ('pending', 'confirmed')
    and a.start_at > now();

  if v_active >= v_clinic.max_active_bookings_per_phone then
    return jsonb_build_object('ok', false, 'error', 'too_many_bookings');
  end if;

  loop
    v_attempt := v_attempt + 1;
    begin
      insert into public.appointments (
        doctor_id, service_id, start_at, end_at, status,
        patient_name, patient_phone, patient_email, age_range, visit_reason,
        consent_given, consent_at, source
      ) values (
        p_doctor_id, p_service_id, v_slot.slot_start, v_slot.slot_end, 'pending',
        v_name, v_phone, v_email, v_age, v_reason,
        true, now(), 'web'
      )
      returning reference into v_reference;

      return jsonb_build_object('ok', true, 'reference', v_reference);
    exception
      when exclusion_violation then
        return jsonb_build_object('ok', false, 'error', 'slot_unavailable');
      when unique_violation then
        -- Astronomically unlikely reference collision: retry with a new one.
        if v_attempt >= 5 then
          raise;
        end if;
    end;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Public API: booking confirmation lookup
-- ---------------------------------------------------------------------------
--
-- Looks an appointment up by its unguessable reference and returns only what
-- the confirmation page needs. Contact details are masked.

create or replace function public.get_booking_confirmation(p_reference text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_ref text := upper(btrim(coalesce(p_reference, '')));
  v_clinic public.clinics;
  v_row record;
  v_first text;
  v_last text;
begin
  if v_ref !~ '^CF-[A-Z2-9]{5}-[A-Z2-9]{5}$' then
    return null;
  end if;

  select * into v_clinic from public.clinics limit 1;

  select a.reference, a.status, a.start_at, a.end_at, a.patient_name, a.patient_phone,
         a.patient_email, a.created_at,
         d.full_name as doctor_name, d.specialization, d.qualification, d.slug as doctor_slug,
         d.avatar_theme,
         s.name as service_name, s.duration_minutes
  into v_row
  from public.appointments a
  join public.doctors d on d.id = a.doctor_id
  join public.services s on s.id = a.service_id
  where a.reference = v_ref;

  if not found then
    return null;
  end if;

  v_first := split_part(btrim(v_row.patient_name), ' ', 1);
  v_last := nullif(split_part(btrim(v_row.patient_name), ' ', 2), '');

  return jsonb_build_object(
    'reference', v_row.reference,
    'status', v_row.status,
    'start_at', v_row.start_at,
    'end_at', v_row.end_at,
    'created_at', v_row.created_at,
    'timezone', v_clinic.timezone,
    'patient', jsonb_build_object(
      'display_name', v_first || coalesce(' ' || left(v_last, 1) || '.', ''),
      'phone_hint', '••••' || right(v_row.patient_phone, 4),
      'has_email', v_row.patient_email is not null
    ),
    'doctor', jsonb_build_object(
      'name', v_row.doctor_name,
      'slug', v_row.doctor_slug,
      'specialization', v_row.specialization,
      'qualification', v_row.qualification,
      'avatar_theme', v_row.avatar_theme
    ),
    'service', jsonb_build_object(
      'name', v_row.service_name,
      'duration_minutes', v_row.duration_minutes
    ),
    'clinic', jsonb_build_object(
      'name', v_clinic.name,
      'phone', v_clinic.phone,
      'email', v_clinic.email,
      'address_line1', v_clinic.address_line1,
      'address_line2', v_clinic.address_line2,
      'city', v_clinic.city,
      'state', v_clinic.state,
      'postal_code', v_clinic.postal_code
    )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Liveness probe used by /api/health?deep=1
-- ---------------------------------------------------------------------------

create or replace function public.health_check()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'ok', true,
    'clinic_configured', exists (select 1 from public.clinics)
  );
$$;
