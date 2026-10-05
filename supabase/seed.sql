-- ClinicFlow demo seed data.
--
-- EVERYTHING HERE IS FICTIONAL: the clinic, doctors, patients, phone numbers
-- (+91 90000 xxxxx placeholders) and e-mail addresses (.example is a reserved
-- domain). Do not load real patient information into a demo environment.
--
-- Dates are generated relative to "today" in the clinic timezone, so the
-- dashboard always looks alive. Re-run with `npm run db:reset`.
--
-- The seed intentionally creates no administrator: Supabase Auth users cannot
-- be created safely from SQL. Use `npm run admin:create` (see README).

-- ---------------------------------------------------------------------------
-- Clinic
-- ---------------------------------------------------------------------------

insert into public.clinics (
  name, tagline, description, phone, email,
  address_line1, address_line2, city, state, postal_code, timezone,
  booking_window_days, min_notice_minutes, max_active_bookings_per_phone
) values (
  'Sanjeevani Family Clinic',
  'Unhurried, family-first care',
  'A neighbourhood clinic for every age, with doctors who take the time to listen. Fictional demo clinic.',
  '+91 90000 00142',
  'hello@sanjeevani-clinic.example',
  'Shop 4, Jasmine Court, Lakeview Road',
  'Shanti Nagar',
  'Pune',
  'Maharashtra',
  '411099',
  'Asia/Kolkata',
  30, 60, 3
);

-- ---------------------------------------------------------------------------
-- Services
-- ---------------------------------------------------------------------------

insert into public.services (slug, name, description, duration_minutes, icon, display_order) values
  ('general-consultation', 'General Consultation',
   'Fever, cough, aches or any everyday health concern, seen by an experienced family physician.',
   20, 'stethoscope', 1),
  ('follow-up-visit', 'Follow-up Visit',
   'A short review after a previous consultation to check progress and adjust your care plan.',
   15, 'repeat', 2),
  ('child-health-checkup', 'Child Health Check-up',
   'Growth, development and nutrition review for infants and children, with practical guidance for parents.',
   30, 'baby', 3),
  ('vaccination', 'Vaccination & Immunisation',
   'Routine childhood and adult vaccinations, with a clear schedule and reminders for your next dose.',
   15, 'syringe', 4),
  ('skin-hair-consultation', 'Skin & Hair Consultation',
   'Assessment and treatment planning for common skin, hair and nail concerns.',
   20, 'sparkles', 5),
  ('womens-wellness', 'Women''s Wellness Consultation',
   'A private, unhurried consultation covering routine women''s health and preventive care.',
   30, 'heart', 6),
  ('preventive-health-check', 'Preventive Health Check',
   'A structured check-up with a doctor to review lifestyle, vitals and risk factors, and plan screening.',
   40, 'clipboard', 7);

-- ---------------------------------------------------------------------------
-- Doctors
-- ---------------------------------------------------------------------------

insert into public.doctors (
  slug, full_name, qualification, specialization, experience_years, bio, languages,
  avatar_theme, slot_minutes, display_order
) values
  ('dr-meera-iyer', 'Dr. Meera Iyer', 'MBBS, MD (General Medicine)', 'Family Physician', 14,
   'Dr. Iyer is the clinic''s lead family physician. She is known for explaining things plainly and for caring for several generations of the same family.',
   array['English', 'Hindi', 'Marathi', 'Tamil'], 'teal', 20, 1),
  ('dr-arjun-deshmukh', 'Dr. Arjun Deshmukh', 'MBBS, DCH', 'Paediatrician', 11,
   'Dr. Deshmukh looks after newborns through teenagers, with a calm manner that helps nervous little patients and parents alike.',
   array['English', 'Hindi', 'Marathi'], 'green', 15, 2),
  ('dr-kavita-rao', 'Dr. Kavita Rao', 'MBBS, MD (Dermatology)', 'Dermatologist', 9,
   'Dr. Rao treats everyday skin, hair and nail concerns with evidence-based, no-nonsense plans.',
   array['English', 'Hindi', 'Kannada'], 'sand', 20, 3),
  ('dr-sunita-menon', 'Dr. Sunita Menon', 'MBBS, DGO', 'Women''s Health Physician', 16,
   'Dr. Menon provides respectful, confidential care for women at every stage of life.',
   array['English', 'Hindi', 'Malayalam'], 'clay', 30, 4);

insert into public.doctor_services (doctor_id, service_id)
select d.id, s.id
from public.doctors d
join public.services s on (d.slug, s.slug) in (
  ('dr-meera-iyer', 'general-consultation'),
  ('dr-meera-iyer', 'follow-up-visit'),
  ('dr-meera-iyer', 'vaccination'),
  ('dr-meera-iyer', 'preventive-health-check'),
  ('dr-arjun-deshmukh', 'general-consultation'),
  ('dr-arjun-deshmukh', 'follow-up-visit'),
  ('dr-arjun-deshmukh', 'child-health-checkup'),
  ('dr-arjun-deshmukh', 'vaccination'),
  ('dr-kavita-rao', 'skin-hair-consultation'),
  ('dr-kavita-rao', 'follow-up-visit'),
  ('dr-sunita-menon', 'womens-wellness'),
  ('dr-sunita-menon', 'follow-up-visit'),
  ('dr-sunita-menon', 'preventive-health-check')
);

-- ---------------------------------------------------------------------------
-- Weekly hours (0 = Sunday ... 6 = Saturday) and breaks
-- ---------------------------------------------------------------------------

insert into public.doctor_availability (doctor_id, weekday, start_time, end_time)
select d.id, v.weekday, v.start_time::time, v.end_time::time
from (values
  -- Dr. Iyer: Mon-Sat mornings, Mon/Wed/Fri evenings, Sunday late morning
  ('dr-meera-iyer', 1, '09:00', '13:00'), ('dr-meera-iyer', 2, '09:00', '13:00'),
  ('dr-meera-iyer', 3, '09:00', '13:00'), ('dr-meera-iyer', 4, '09:00', '13:00'),
  ('dr-meera-iyer', 5, '09:00', '13:00'), ('dr-meera-iyer', 6, '09:00', '13:00'),
  ('dr-meera-iyer', 1, '17:00', '19:40'), ('dr-meera-iyer', 3, '17:00', '19:40'),
  ('dr-meera-iyer', 5, '17:00', '19:40'), ('dr-meera-iyer', 0, '10:00', '13:00'),
  -- Dr. Deshmukh: weekdays 10-14, Saturday 10-13
  ('dr-arjun-deshmukh', 1, '10:00', '14:00'), ('dr-arjun-deshmukh', 2, '10:00', '14:00'),
  ('dr-arjun-deshmukh', 3, '10:00', '14:00'), ('dr-arjun-deshmukh', 4, '10:00', '14:00'),
  ('dr-arjun-deshmukh', 5, '10:00', '14:00'), ('dr-arjun-deshmukh', 6, '10:00', '13:00'),
  -- Dr. Rao: Tue/Thu/Sat
  ('dr-kavita-rao', 2, '11:00', '15:00'), ('dr-kavita-rao', 4, '11:00', '15:00'),
  ('dr-kavita-rao', 6, '11:00', '15:00'), ('dr-kavita-rao', 2, '17:00', '19:00'),
  ('dr-kavita-rao', 4, '17:00', '19:00'),
  -- Dr. Menon: Mon/Wed/Fri mornings, Thursday afternoon
  ('dr-sunita-menon', 1, '10:00', '14:00'), ('dr-sunita-menon', 3, '10:00', '14:00'),
  ('dr-sunita-menon', 5, '10:00', '14:00'), ('dr-sunita-menon', 4, '15:00', '19:00')
) as v(slug, weekday, start_time, end_time)
join public.doctors d on d.slug = v.slug;

insert into public.doctor_breaks (doctor_id, weekday, start_time, end_time, label)
select d.id, null, v.start_time::time, v.end_time::time, v.label
from (values
  ('dr-meera-iyer', '11:00', '11:20', 'Tea break'),
  ('dr-arjun-deshmukh', '12:00', '12:30', 'Rounds'),
  ('dr-kavita-rao', '13:00', '13:30', 'Lunch'),
  ('dr-sunita-menon', '12:00', '12:30', 'Tea break')
) as v(slug, start_time, end_time, label)
join public.doctors d on d.slug = v.slug;

-- Upcoming closures (relative dates so the demo never goes stale)
insert into public.blocked_dates (doctor_id, start_date, end_date, kind, reason)
values
  (null, ((now() at time zone 'Asia/Kolkata')::date + 12), ((now() at time zone 'Asia/Kolkata')::date + 12),
   'holiday', 'Clinic closed for annual maintenance'),
  ((select id from public.doctors where slug = 'dr-kavita-rao'),
   ((now() at time zone 'Asia/Kolkata')::date + 5), ((now() at time zone 'Asia/Kolkata')::date + 6),
   'unavailable', 'Attending a medical conference');

-- ---------------------------------------------------------------------------
-- Demo appointments (about 4 weeks of history and bookings)
-- ---------------------------------------------------------------------------

do $seed$
declare
  c_tz constant text := 'Asia/Kolkata';
  v_today date := (now() at time zone c_tz)::date;
  first_names constant text[] := array[
    'Aarav','Ananya','Vihaan','Diya','Arnav','Isha','Kabir','Meghna','Rohan','Saanvi',
    'Aditya','Nandini','Krish','Tara','Ishaan','Riya','Yash','Pooja','Neel','Sneha',
    'Dev','Anika','Om','Kiara','Rahul','Shreya','Karan','Mira','Vivaan','Prisha'];
  last_names constant text[] := array[
    'Kulkarni','Patil','Sharma','Nair','Joshi','Mehta','Bhat','Pillai','Gokhale','Sawant',
    'Chavan','Reddy','Banerjee','Kapoor','Shetty','Naik','Thakur','Dixit','Menon','Apte'];
  reasons constant text[] := array[
    'Routine check-up','Seasonal cold','Follow-up after previous visit','Vaccination due',
    'Skin concern','Annual health check','General consultation','Child growth review'];
  age_ranges constant text[] := array['0-12','13-17','18-30','31-45','46-60','61+'];
  v_doc record;
  v_svc record;
  v_slot record;
  v_day integer;
  v_date date;
  v_h integer;
  v_status text;
  v_p numeric;
  v_created timestamptz;
  v_person integer;
  v_roll integer;
  v_changed timestamptz;
begin
  for v_day in -21..21 loop
    v_date := v_today + v_day;
    for v_doc in select d.id, d.slug from public.doctors d order by d.display_order loop
      for v_svc in
        select s.id, s.slug
        from public.services s
        join public.doctor_services ds on ds.service_id = s.id and ds.doctor_id = v_doc.id
        order by s.display_order
      loop
        -- Busier for popular services, quieter further into the future.
        v_p := case v_svc.slug
                 when 'general-consultation' then 0.36
                 when 'follow-up-visit' then 0.18
                 else 0.13 end;
        v_p := v_p * case when v_day > 0 then greatest(0.35, 1 - v_day / 28.0) else 1 end;

        for v_slot in
          select g.slot_start, g.slot_end
          from app_private.generate_slots(v_doc.id, v_svc.id, v_date, null, true) g
        loop
          v_h := abs(hashtext(v_doc.slug || v_svc.slug || v_slot.slot_start::text));
          continue when (v_h % 1000) / 1000.0 >= v_p;

          v_person := v_h % 600;
          v_roll := (v_h / 7) % 100;

          if v_slot.slot_start < now() then
            v_status := case when v_roll < 76 then 'completed'
                             when v_roll < 88 then 'no_show'
                             else 'cancelled' end;
          else
            v_status := case when v_roll < 50 then 'confirmed'
                             when v_roll < 88 then 'pending'
                             else 'cancelled' end;
          end if;

          v_created := least(
            now() - interval '12 minutes',
            v_slot.slot_start - make_interval(hours => 8 + (v_h / 13) % 96)
          );
          -- Keep the most recent bookings genuinely recent for the activity feed.
          if v_slot.slot_start > now() and (v_h / 31) % 6 = 0 then
            v_created := now() - make_interval(mins => 15 + (v_h / 17) % 1500);
          end if;

          begin
            insert into public.appointments (
              doctor_id, service_id, start_at, end_at, status,
              patient_name, patient_phone, patient_email, age_range, visit_reason,
              consent_given, consent_at, source, created_at
            ) values (
              v_doc.id, v_svc.id, v_slot.slot_start, v_slot.slot_end, 'pending',
              first_names[1 + v_person % 30] || ' ' || last_names[1 + (v_person / 30) % 20],
              '+9190000' || lpad(((v_person * 7919) % 100000)::text, 5, '0'),
              case when v_person % 3 = 0 then null
                   else lower(first_names[1 + v_person % 30]) || '.' ||
                        lower(last_names[1 + (v_person / 30) % 20]) || '@example.com' end,
              age_ranges[1 + (v_h / 3) % 6],
              case when v_person % 4 = 0 then null else reasons[1 + (v_h / 11) % 8] end,
              true, v_created, 'web', v_created
            );
          exception
            when exclusion_violation then
              continue;
          end;

          if v_status <> 'pending' then
            v_changed := least(now() - interval '5 minutes', v_created + make_interval(mins => 30 + (v_h / 19) % 600));
            if v_status in ('completed', 'no_show') then
              v_changed := least(now() - interval '5 minutes', v_slot.slot_end + interval '10 minutes');
            end if;
            update public.appointments
            set status = v_status,
                status_changed_at = v_changed,
                cancellation_reason = case when v_status = 'cancelled' then 'Patient requested cancellation' end
            where doctor_id = v_doc.id and start_at = v_slot.slot_start and status = 'pending';
          end if;
        end loop;
      end loop;
    end loop;
  end loop;
end
$seed$;

-- Align the audit trail with the (backdated) appointment timestamps.
update public.appointment_status_history h
set created_at = a.created_at
from public.appointments a
where a.id = h.appointment_id and h.event = 'created';

update public.appointment_status_history h
set created_at = a.status_changed_at
from public.appointments a
where a.id = h.appointment_id and h.event = 'status_changed';

-- Demo bookings must never be delivered to a real automation service.
delete from public.automation_events;
