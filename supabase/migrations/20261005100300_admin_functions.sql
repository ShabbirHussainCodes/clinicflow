-- Administrator API.
--
-- Appointments are never modified with direct table writes. Every mutation
-- goes through one of these functions so the rules (allowed status
-- transitions, availability recheck on reschedule, audit trail) are enforced in
-- one place, in the database, for every client.
--
-- Each function starts with app_private.require_admin(), which raises
-- SQLSTATE 42501 for anyone who is not an active administrator.

create or replace function app_private.require_admin()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not app_private.is_admin() then
    raise exception 'Administrator access required' using errcode = '42501';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Status transitions
-- ---------------------------------------------------------------------------
--
--   pending   -> confirmed | cancelled | completed* | no_show*
--   confirmed -> cancelled | completed* | no_show*
--   completed, cancelled, no_show are final
--
--   * only once the appointment start time has passed

create or replace function app_private.is_allowed_transition(p_from text, p_to text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case p_from
    when 'pending' then p_to in ('confirmed', 'cancelled', 'completed', 'no_show')
    when 'confirmed' then p_to in ('cancelled', 'completed', 'no_show')
    else false
  end;
$$;

create or replace function public.admin_set_appointment_status(
  p_appointment_id uuid,
  p_status text,
  p_note text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_appt public.appointments;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  perform app_private.require_admin();

  if p_status not in ('pending', 'confirmed', 'completed', 'cancelled', 'no_show') then
    return jsonb_build_object('ok', false, 'error', 'invalid_status');
  end if;
  if v_note is not null and char_length(v_note) > 300 then
    return jsonb_build_object('ok', false, 'error', 'note_too_long');
  end if;

  select * into v_appt from public.appointments where id = p_appointment_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  if v_appt.status = p_status then
    return jsonb_build_object('ok', false, 'error', 'no_change', 'status', v_appt.status);
  end if;

  if not app_private.is_allowed_transition(v_appt.status, p_status) then
    return jsonb_build_object('ok', false, 'error', 'invalid_transition', 'status', v_appt.status);
  end if;

  if p_status in ('completed', 'no_show') and v_appt.start_at > now() then
    return jsonb_build_object('ok', false, 'error', 'not_started_yet', 'status', v_appt.status);
  end if;

  perform set_config('clinicflow.change_note', coalesce(v_note, ''), true);

  update public.appointments
  set status = p_status,
      status_changed_at = now(),
      cancellation_reason = case when p_status = 'cancelled' then v_note else cancellation_reason end
  where id = p_appointment_id;

  return jsonb_build_object('ok', true, 'status', p_status);
end;
$$;

-- ---------------------------------------------------------------------------
-- Reschedule
-- ---------------------------------------------------------------------------

create or replace function public.admin_get_reschedule_slots(
  p_appointment_id uuid,
  p_date date
)
returns table (slot_start timestamptz, slot_end timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_appt public.appointments;
begin
  perform app_private.require_admin();

  select * into v_appt from public.appointments where id = p_appointment_id;
  if not found then
    return;
  end if;

  return query
  select s.slot_start, s.slot_end
  from app_private.slots_for_day(v_appt.doctor_id, v_appt.service_id, p_date, v_appt.id) s;
end;
$$;

create or replace function public.admin_reschedule_appointment(
  p_appointment_id uuid,
  p_new_start_at timestamptz,
  p_note text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_appt public.appointments;
  v_clinic public.clinics;
  v_slot record;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  perform app_private.require_admin();

  select * into v_clinic from public.clinics limit 1;

  select * into v_appt from public.appointments where id = p_appointment_id for update;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if v_appt.status not in ('pending', 'confirmed') then
    return jsonb_build_object('ok', false, 'error', 'invalid_transition', 'status', v_appt.status);
  end if;

  perform pg_advisory_xact_lock(
    pg_catalog.hashtextextended('clinicflow:doctor:' || v_appt.doctor_id::text, 0)
  );

  select s.slot_start, s.slot_end into v_slot
  from app_private.slots_for_day(
    v_appt.doctor_id,
    v_appt.service_id,
    (p_new_start_at at time zone v_clinic.timezone)::date,
    v_appt.id
  ) s
  where s.slot_start = p_new_start_at;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'slot_unavailable');
  end if;

  if v_slot.slot_start = v_appt.start_at then
    return jsonb_build_object('ok', false, 'error', 'no_change');
  end if;

  perform set_config('clinicflow.change_note', coalesce(v_note, ''), true);

  begin
    update public.appointments
    set start_at = v_slot.slot_start, end_at = v_slot.slot_end
    where id = p_appointment_id;
  exception
    when exclusion_violation then
      return jsonb_build_object('ok', false, 'error', 'slot_unavailable');
  end;

  return jsonb_build_object('ok', true, 'start_at', v_slot.slot_start);
end;
$$;

-- ---------------------------------------------------------------------------
-- Internal notes
-- ---------------------------------------------------------------------------

create or replace function public.admin_update_appointment_notes(
  p_appointment_id uuid,
  p_notes text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_notes text := nullif(btrim(coalesce(p_notes, '')), '');
begin
  perform app_private.require_admin();

  if v_notes is not null and char_length(v_notes) > 1000 then
    return jsonb_build_object('ok', false, 'error', 'note_too_long');
  end if;

  update public.appointments set admin_notes = v_notes where id = p_appointment_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  insert into public.appointment_status_history (appointment_id, event, changed_by)
  values (p_appointment_id, 'note_updated', app_private.actor_admin_id());

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- Appointment search (parameterised: no string-built filters in the client)
-- ---------------------------------------------------------------------------
--
-- Dates are interpreted in the clinic timezone. p_sort is one of
-- start_asc, start_desc, created_desc. Returns { total, rows: [...] }.

create or replace function public.admin_search_appointments(
  p_query text default null,
  p_status text default null,
  p_doctor_id uuid default null,
  p_service_id uuid default null,
  p_date_from date default null,
  p_date_to date default null,
  p_sort text default 'start_asc',
  p_limit integer default 25,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_clinic public.clinics;
  v_q text := btrim(coalesce(p_query, ''));
  v_pattern text;
  v_digits text;
  v_from timestamptz;
  v_to timestamptz;
  v_total integer;
  v_rows jsonb;
begin
  perform app_private.require_admin();

  select * into v_clinic from public.clinics limit 1;

  if v_q <> '' then
    -- Escape LIKE wildcards so user input is always matched literally.
    v_pattern := '%' || replace(replace(replace(v_q, '\', '\\'), '%', '\%'), '_', '\_') || '%';
    -- Only treat the text as a phone number when it looks like one (digits and phone punctuation).
    -- Otherwise "Priya2" or a booking reference would match unrelated phone numbers.
    if v_q ~ '^[+0-9\s().-]+$' then
      v_digits := regexp_replace(v_q, '\D', '', 'g');
    else
      v_digits := '';
    end if;
  end if;

  v_from := case when p_date_from is not null
    then p_date_from::timestamp at time zone v_clinic.timezone end;
  v_to := case when p_date_to is not null
    then (p_date_to + 1)::timestamp at time zone v_clinic.timezone end;

  with filtered as (
    select a.*, d.full_name as doctor_name, s.name as service_name
    from public.appointments a
    join public.doctors d on d.id = a.doctor_id
    join public.services s on s.id = a.service_id
    where (v_q = ''
        or a.patient_name ilike v_pattern
        or a.reference ilike v_pattern
        or (char_length(v_digits) >= 3 and a.patient_phone like '%' || v_digits || '%'))
      and (p_status is null or a.status = p_status)
      and (p_doctor_id is null or a.doctor_id = p_doctor_id)
      and (p_service_id is null or a.service_id = p_service_id)
      and (v_from is null or a.start_at >= v_from)
      and (v_to is null or a.start_at < v_to)
  )
  select
    (select count(*) from filtered),
    coalesce(jsonb_agg(to_jsonb(page) - 'sort_key' order by page.sort_key, page.id), '[]'::jsonb)
  into v_total, v_rows
  from (
    select
      f.id, f.reference, f.status, f.start_at, f.end_at, f.patient_name, f.patient_phone,
      f.patient_email, f.created_at, f.doctor_id, f.doctor_name, f.service_id, f.service_name,
      case coalesce(p_sort, 'start_asc')
        when 'start_desc' then -extract(epoch from f.start_at)
        when 'created_desc' then -extract(epoch from f.created_at)
        else extract(epoch from f.start_at)
      end as sort_key
    from filtered f
    order by 14, f.id
    limit least(greatest(p_limit, 1), 100)
    offset greatest(p_offset, 0)
  ) page;

  return jsonb_build_object('total', v_total, 'rows', v_rows);
end;
$$;

-- ---------------------------------------------------------------------------
-- Schedule management
-- ---------------------------------------------------------------------------
--
-- Atomically replaces a doctor's weekly working windows and slot length.
-- p_windows: [{ "weekday": 1, "start_time": "09:00", "end_time": "13:00" }, ...]
-- Existing appointments are never touched; they simply stop influencing
-- availability if they fall outside the new hours (staff review them separately).

create or replace function public.admin_set_doctor_schedule(
  p_doctor_id uuid,
  p_slot_minutes integer,
  p_windows jsonb
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_window jsonb;
begin
  perform app_private.require_admin();

  if p_slot_minutes is null or p_slot_minutes < 5 or p_slot_minutes > 120 or p_slot_minutes % 5 <> 0 then
    return jsonb_build_object('ok', false, 'error', 'invalid_slot_minutes');
  end if;
  if jsonb_typeof(p_windows) <> 'array' or jsonb_array_length(p_windows) > 40 then
    return jsonb_build_object('ok', false, 'error', 'invalid_windows');
  end if;
  if not exists (select 1 from public.doctors where id = p_doctor_id) then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  update public.doctors set slot_minutes = p_slot_minutes where id = p_doctor_id;
  delete from public.doctor_availability where doctor_id = p_doctor_id;

  for v_window in select * from jsonb_array_elements(p_windows)
  loop
    begin
      insert into public.doctor_availability (doctor_id, weekday, start_time, end_time)
      values (
        p_doctor_id,
        (v_window ->> 'weekday')::smallint,
        (v_window ->> 'start_time')::time,
        (v_window ->> 'end_time')::time
      );
    exception
      when exclusion_violation then
        raise exception 'overlapping_windows' using errcode = 'P0001';
      when check_violation or invalid_text_representation or datetime_field_overflow
           or invalid_datetime_format or not_null_violation then
        raise exception 'invalid_windows' using errcode = 'P0001';
    end;
  end loop;

  return jsonb_build_object('ok', true);
exception
  when sqlstate 'P0001' then
    -- Re-raised errors roll back the delete above; report them as data.
    return jsonb_build_object('ok', false, 'error', sqlerrm);
end;
$$;

-- ---------------------------------------------------------------------------
-- Dashboard
-- ---------------------------------------------------------------------------

create or replace function public.admin_dashboard_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_clinic public.clinics;
  v_now timestamptz := now();
  v_today date;
  v_today_start timestamptz;
  v_tomorrow_start timestamptz;
  v_week_end timestamptz;
  v_month_start timestamptz;
  v_result jsonb;
begin
  perform app_private.require_admin();

  select * into v_clinic from public.clinics limit 1;
  v_today := (v_now at time zone v_clinic.timezone)::date;
  v_today_start := v_today::timestamp at time zone v_clinic.timezone;
  v_tomorrow_start := (v_today + 1)::timestamp at time zone v_clinic.timezone;
  v_week_end := (v_today + 8)::timestamp at time zone v_clinic.timezone;
  v_month_start := (v_today - 29)::timestamp at time zone v_clinic.timezone;

  select jsonb_build_object(
    'today', v_today,
    'timezone', v_clinic.timezone,
    'counts', jsonb_build_object(
      'today_total', (select count(*) from public.appointments a
        where a.start_at >= v_today_start and a.start_at < v_tomorrow_start and a.status <> 'cancelled'),
      'today_remaining', (select count(*) from public.appointments a
        where a.start_at >= v_now and a.start_at < v_tomorrow_start and a.status in ('pending', 'confirmed')),
      'upcoming', (select count(*) from public.appointments a
        where a.start_at >= v_tomorrow_start and a.start_at < v_week_end and a.status in ('pending', 'confirmed')),
      'pending', (select count(*) from public.appointments a
        where a.status = 'pending' and a.start_at >= v_today_start),
      'confirmed', (select count(*) from public.appointments a
        where a.status = 'confirmed' and a.start_at >= v_today_start),
      'completed_30d', (select count(*) from public.appointments a
        where a.status = 'completed' and a.start_at >= v_month_start),
      'cancelled_30d', (select count(*) from public.appointments a
        where a.status = 'cancelled' and a.start_at >= v_month_start),
      'no_show_30d', (select count(*) from public.appointments a
        where a.status = 'no_show' and a.start_at >= v_month_start)
    ),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'date', d.day::date,
        'active', (select count(*) from public.appointments a
          where a.status in ('pending', 'confirmed', 'completed')
            and a.start_at >= (d.day::date)::timestamp at time zone v_clinic.timezone
            and a.start_at < (d.day::date + 1)::timestamp at time zone v_clinic.timezone),
        'cancelled', (select count(*) from public.appointments a
          where a.status in ('cancelled', 'no_show')
            and a.start_at >= (d.day::date)::timestamp at time zone v_clinic.timezone
            and a.start_at < (d.day::date + 1)::timestamp at time zone v_clinic.timezone)
      ) order by d.day), '[]'::jsonb)
      from generate_series((v_today - 6)::timestamp, (v_today + 7)::timestamp, interval '1 day') as d(day)
    ),
    'top_services', (
      select coalesce(jsonb_agg(t order by t.total desc, t.name), '[]'::jsonb)
      from (
        select s.name, count(*)::integer as total
        from public.appointments a
        join public.services s on s.id = a.service_id
        where a.status <> 'cancelled' and a.start_at >= v_month_start and a.start_at < v_week_end
        group by s.name
        order by count(*) desc, s.name
        limit 5
      ) t
    ),
    'doctor_load', (
      select coalesce(jsonb_agg(t order by t.total desc, t.name), '[]'::jsonb)
      from (
        select d.full_name as name, count(*)::integer as total
        from public.appointments a
        join public.doctors d on d.id = a.doctor_id
        where a.status in ('pending', 'confirmed') and a.start_at >= v_today_start and a.start_at < v_week_end
        group by d.full_name
      ) t
    ),
    'recent_activity', (
      select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at desc, r.id desc), '[]'::jsonb)
      from (
        select h.id, h.event, h.from_status, h.to_status, h.note, h.created_at,
               a.id as appointment_id, a.reference, a.patient_name,
               d.full_name as doctor_name, h.changed_by is not null as by_staff
        from public.appointment_status_history h
        join public.appointments a on a.id = h.appointment_id
        join public.doctors d on d.id = a.doctor_id
        order by h.created_at desc, h.id desc
        limit 12
      ) r
    )
  ) into v_result;

  return v_result;
end;
$$;

-- ---------------------------------------------------------------------------
-- Outbox administration
-- ---------------------------------------------------------------------------

create or replace function public.admin_retry_automation_event(p_event_id uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
begin
  perform app_private.require_admin();

  update public.automation_events
  set status = 'pending', attempts = 0, next_attempt_at = now(), locked_until = null
  where id = p_event_id and status in ('failed', 'dead');

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_retryable');
  end if;
  return jsonb_build_object('ok', true);
end;
$$;
