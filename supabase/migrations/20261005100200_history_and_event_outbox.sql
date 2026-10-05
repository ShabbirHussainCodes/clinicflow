-- Appointment history and the automation event outbox.
--
-- Every appointment change is recorded in the same transaction that makes the
-- change, so the application never has to remember to emit an event and an
-- unavailable automation service can never make a booking fail. Events wait in
-- public.automation_events until a dispatcher (see docs/N8N_INTEGRATION.md)
-- delivers them. The application works fully if no dispatcher ever runs.

-- ---------------------------------------------------------------------------
-- Payload builder
-- ---------------------------------------------------------------------------
--
-- Payload contract (version 1) is documented in docs/N8N_INTEGRATION.md.
-- Only the contact fields needed to notify the patient are included; the free
-- text visit reason and admin notes are deliberately excluded.

create or replace function app_private.build_event_payload(
  p_event_id uuid,
  p_event_type text,
  p_appointment_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_clinic public.clinics;
  v_row record;
begin
  select * into v_clinic from public.clinics limit 1;

  select a.id, a.reference, a.status, a.start_at, a.end_at, a.patient_name,
         a.patient_phone, a.patient_email, a.consent_given,
         d.id as doctor_id, d.full_name as doctor_name, d.specialization,
         s.id as service_id, s.name as service_name, s.duration_minutes
  into v_row
  from public.appointments a
  join public.doctors d on d.id = a.doctor_id
  join public.services s on s.id = a.service_id
  where a.id = p_appointment_id;

  return jsonb_build_object(
    'id', p_event_id,
    'type', p_event_type,
    'version', 1,
    'created_at', now(),
    'data', jsonb_build_object(
      'appointment', jsonb_build_object(
        'id', v_row.id,
        'reference', v_row.reference,
        'status', v_row.status,
        'start_at', v_row.start_at,
        'end_at', v_row.end_at,
        'local_date', to_char(v_row.start_at at time zone v_clinic.timezone, 'YYYY-MM-DD'),
        'local_time', to_char(v_row.start_at at time zone v_clinic.timezone, 'HH24:MI'),
        'timezone', v_clinic.timezone
      ),
      'doctor', jsonb_build_object(
        'id', v_row.doctor_id,
        'name', v_row.doctor_name,
        'specialization', v_row.specialization
      ),
      'service', jsonb_build_object(
        'id', v_row.service_id,
        'name', v_row.service_name,
        'duration_minutes', v_row.duration_minutes
      ),
      'patient', jsonb_build_object(
        'name', v_row.patient_name,
        'phone', v_row.patient_phone,
        'email', v_row.patient_email,
        'consent_to_contact', v_row.consent_given
      ),
      'clinic', jsonb_build_object(
        'name', v_clinic.name,
        'phone', v_clinic.phone,
        'email', v_clinic.email
      )
    )
  );
end;
$$;

create or replace function app_private.enqueue_automation_event(
  p_event_type text,
  p_appointment_id uuid,
  p_dedupe_key text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_event_id uuid := gen_random_uuid();
begin
  insert into public.automation_events (id, event_type, appointment_id, dedupe_key, payload)
  values (
    v_event_id,
    p_event_type,
    p_appointment_id,
    p_dedupe_key,
    app_private.build_event_payload(v_event_id, p_event_type, p_appointment_id)
  )
  on conflict (dedupe_key) where dedupe_key is not null do nothing;
end;
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create or replace function app_private.actor_admin_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
  from public.admin_profiles p
  where p.id = (select auth.uid()) and p.is_active;
$$;

create or replace function app_private.appointments_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.appointment_status_history (appointment_id, event, to_status, changed_by)
  values (new.id, 'created', new.status, app_private.actor_admin_id());

  perform app_private.enqueue_automation_event('appointment.created', new.id);
  return null;
end;
$$;

create trigger appointments_after_insert
  after insert on public.appointments
  for each row execute function app_private.appointments_after_insert();

create or replace function app_private.appointments_after_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_note text := nullif(current_setting('clinicflow.change_note', true), '');
  v_event_type text;
begin
  if new.status is distinct from old.status then
    insert into public.appointment_status_history
      (appointment_id, event, from_status, to_status, changed_by, note)
    values
      (new.id, 'status_changed', old.status, new.status, app_private.actor_admin_id(), v_note);

    v_event_type := case new.status
      when 'confirmed' then 'appointment.confirmed'
      when 'completed' then 'appointment.completed'
      when 'cancelled' then 'appointment.cancelled'
      else null
    end;

    if v_event_type is not null then
      perform app_private.enqueue_automation_event(v_event_type, new.id);
    end if;
  end if;

  if new.start_at is distinct from old.start_at then
    insert into public.appointment_status_history
      (appointment_id, event, from_status, to_status, changed_by, note, metadata)
    values (
      new.id, 'rescheduled', old.status, new.status, app_private.actor_admin_id(), v_note,
      jsonb_build_object('from_start_at', old.start_at, 'to_start_at', new.start_at)
    );

    perform app_private.enqueue_automation_event('appointment.rescheduled', new.id);
  end if;

  return null;
end;
$$;

create trigger appointments_after_update
  after update on public.appointments
  for each row execute function app_private.appointments_after_update();

-- ---------------------------------------------------------------------------
-- Reminders
-- ---------------------------------------------------------------------------
--
-- Queues one reminder_due event per appointment (per start time, so a
-- rescheduled appointment gets a fresh reminder) for active appointments
-- starting within the next p_lead_hours. Idempotent: safe to call every few
-- minutes. Called by the dispatcher endpoint before it delivers events.

create or replace function public.enqueue_due_reminders(p_lead_hours integer default 24)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_row record;
  v_before integer;
  v_after integer;
begin
  if p_lead_hours < 1 or p_lead_hours > 168 then
    raise exception 'p_lead_hours must be between 1 and 168' using errcode = '22023';
  end if;

  select count(*) into v_before from public.automation_events
  where event_type = 'appointment.reminder_due';

  for v_row in
    select a.id, a.start_at
    from public.appointments a
    where a.status in ('pending', 'confirmed')
      and a.start_at > now()
      and a.start_at <= now() + make_interval(hours => p_lead_hours)
  loop
    perform app_private.enqueue_automation_event(
      'appointment.reminder_due',
      v_row.id,
      'reminder:' || v_row.id::text || ':' || extract(epoch from v_row.start_at)::bigint::text
    );
  end loop;

  select count(*) into v_after from public.automation_events
  where event_type = 'appointment.reminder_due';

  return v_after - v_before;
end;
$$;

-- ---------------------------------------------------------------------------
-- Dispatcher interface (service role only)
-- ---------------------------------------------------------------------------

-- Atomically claims due events. Rows stuck in "processing" after a crashed
-- dispatcher become claimable again once their lock expires.
create or replace function public.claim_automation_events(
  p_limit integer default 10,
  p_lock_seconds integer default 120
)
returns table (id uuid, event_type text, payload jsonb, attempts integer)
language sql
volatile
security definer
set search_path = ''
as $$
  update public.automation_events e
  set status = 'processing',
      attempts = e.attempts + 1,
      last_attempt_at = now(),
      locked_until = now() + make_interval(secs => greatest(p_lock_seconds, 10))
  where e.id in (
    select c.id
    from public.automation_events c
    where (c.status in ('pending', 'failed') and c.next_attempt_at <= now())
       or (c.status = 'processing' and c.locked_until < now())
    order by c.next_attempt_at, c.created_at
    limit least(greatest(p_limit, 1), 100)
    for update skip locked
  )
  returning e.id, e.event_type, e.payload, e.attempts;
$$;

create or replace function public.complete_automation_event(p_event_id uuid)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.automation_events
  set status = 'delivered',
      delivered_at = now(),
      locked_until = null,
      last_error = null
  where id = p_event_id and status = 'processing';
$$;

-- Records a failed delivery. Retries use exponential backoff
-- (30 s, 1 m, 2 m, ... capped at 1 h); after p_max_attempts the event is
-- parked as "dead" until an administrator retries it.
create or replace function public.fail_automation_event(
  p_event_id uuid,
  p_error text,
  p_max_attempts integer default 8
)
returns void
language sql
volatile
security definer
set search_path = ''
as $$
  update public.automation_events e
  set status = case when e.attempts >= greatest(p_max_attempts, 1) then 'dead' else 'failed' end,
      next_attempt_at = now() + least(
        make_interval(secs => 30 * power(2, greatest(e.attempts - 1, 0))::integer),
        interval '1 hour'
      ),
      locked_until = null,
      last_error = left(coalesce(p_error, 'unknown error'), 500)
  where e.id = p_event_id and e.status = 'processing';
$$;

-- Housekeeping: delivered events carry patient contact details, so purge them
-- after a retention period.
create or replace function public.purge_delivered_automation_events(p_older_than_days integer default 30)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  delete from public.automation_events
  where status = 'delivered'
    and delivered_at < now() - make_interval(days => greatest(p_older_than_days, 1));
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;
