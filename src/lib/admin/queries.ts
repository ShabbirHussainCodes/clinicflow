import "server-only";
import { cache } from "react";
import { z } from "zod";

import { createSessionClient } from "@/lib/supabase/clients";
import { logger } from "@/lib/logger";
import { APPOINTMENT_STATUSES, PAGE_SIZE, type AppointmentFilters } from "@/lib/validation/admin";

export class AdminDataError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AdminDataError";
  }
}

const statusSchema = z.enum(APPOINTMENT_STATUSES);

/* ---------------------------------------------------------------- dashboard */

const dashboardSchema = z.object({
  today: z.string(),
  timezone: z.string(),
  counts: z.object({
    today_total: z.number(),
    today_remaining: z.number(),
    upcoming: z.number(),
    pending: z.number(),
    confirmed: z.number(),
    completed_30d: z.number(),
    cancelled_30d: z.number(),
    no_show_30d: z.number(),
  }),
  daily: z.array(z.object({ date: z.string(), active: z.number(), cancelled: z.number() })),
  top_services: z.array(z.object({ name: z.string(), total: z.number() })),
  doctor_load: z.array(z.object({ name: z.string(), total: z.number() })),
  recent_activity: z.array(
    z.object({
      id: z.number(),
      event: z.enum(["created", "status_changed", "rescheduled", "note_updated"]),
      from_status: z.string().nullable(),
      to_status: z.string().nullable(),
      note: z.string().nullable(),
      created_at: z.string(),
      appointment_id: z.string(),
      reference: z.string(),
      patient_name: z.string(),
      doctor_name: z.string(),
      by_staff: z.boolean(),
    }),
  ),
});

export type DashboardSummary = z.infer<typeof dashboardSchema>;

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const supabase = await createSessionClient();
  const { data, error } = await supabase.rpc("admin_dashboard_summary");
  if (error) {
    logger.error("admin.dashboard_failed", error);
    throw new AdminDataError("Could not load the dashboard.", { cause: error });
  }
  return dashboardSchema.parse(data);
}

/* ------------------------------------------------------------- appointments */

export const appointmentRowSchema = z.object({
  id: z.string(),
  reference: z.string(),
  status: statusSchema,
  start_at: z.string(),
  end_at: z.string(),
  patient_name: z.string(),
  patient_phone: z.string(),
  patient_email: z.string().nullable(),
  created_at: z.string(),
  doctor_id: z.string(),
  doctor_name: z.string(),
  service_id: z.string(),
  service_name: z.string(),
});

export type AppointmentRow = z.infer<typeof appointmentRowSchema>;

const searchSchema = z.object({ total: z.number(), rows: z.array(appointmentRowSchema) });

export interface AppointmentSearchParams {
  q?: string;
  status?: string;
  doctorId?: string;
  serviceId?: string;
  from?: string;
  to?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}

export async function searchAppointments(
  params: AppointmentSearchParams,
): Promise<{ total: number; rows: AppointmentRow[] }> {
  const supabase = await createSessionClient();
  const { data, error } = await supabase.rpc("admin_search_appointments", {
    p_query: params.q || undefined,
    p_status: params.status || undefined,
    p_doctor_id: params.doctorId || undefined,
    p_service_id: params.serviceId || undefined,
    p_date_from: params.from || undefined,
    p_date_to: params.to || undefined,
    p_sort: params.sort || "start_asc",
    p_limit: params.limit ?? PAGE_SIZE,
    p_offset: params.offset ?? 0,
  });
  if (error) {
    logger.error("admin.search_failed", error);
    throw new AdminDataError("Could not load appointments.", { cause: error });
  }
  return searchSchema.parse(data);
}

export function searchFromFilters(filters: AppointmentFilters): AppointmentSearchParams {
  return {
    q: filters.q,
    status: filters.status,
    doctorId: filters.doctor,
    serviceId: filters.service,
    from: filters.from,
    to: filters.to,
    sort: filters.sort,
    limit: PAGE_SIZE,
    offset: (filters.page - 1) * PAGE_SIZE,
  };
}

export interface AppointmentDetail {
  id: string;
  reference: string;
  status: z.infer<typeof statusSchema>;
  start_at: string;
  end_at: string;
  patient_name: string;
  patient_phone: string;
  patient_email: string | null;
  age_range: string | null;
  visit_reason: string | null;
  consent_given: boolean;
  consent_at: string;
  source: string;
  admin_notes: string | null;
  cancellation_reason: string | null;
  created_at: string;
  status_changed_at: string;
  doctor: { id: string; full_name: string; specialization: string; avatar_theme: string };
  service: { id: string; name: string; duration_minutes: number };
  history: {
    id: number;
    event: string;
    from_status: string | null;
    to_status: string | null;
    note: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
    by_staff: boolean;
  }[];
}

export async function getAppointmentDetail(id: string): Promise<AppointmentDetail | null> {
  if (!z.uuid().safeParse(id).success) return null;
  const supabase = await createSessionClient();

  const [appointmentRes, historyRes] = await Promise.all([
    supabase
      .from("appointments")
      .select(
        "id, reference, status, start_at, end_at, patient_name, patient_phone, patient_email, age_range, visit_reason, consent_given, consent_at, source, admin_notes, cancellation_reason, created_at, status_changed_at, doctor:doctors(id, full_name, specialization, avatar_theme), service:services(id, name, duration_minutes)",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("appointment_status_history")
      .select("id, event, from_status, to_status, note, metadata, created_at, changed_by")
      .eq("appointment_id", id)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true }),
  ]);

  if (appointmentRes.error || historyRes.error) {
    logger.error("admin.appointment_failed", appointmentRes.error ?? historyRes.error);
    throw new AdminDataError("Could not load the appointment.");
  }
  const row = appointmentRes.data;
  if (!row || !row.doctor || !row.service) return null;

  return {
    ...row,
    status: statusSchema.parse(row.status),
    doctor: row.doctor,
    service: row.service,
    history: (historyRes.data ?? []).map((item) => ({
      id: item.id,
      event: item.event,
      from_status: item.from_status,
      to_status: item.to_status,
      note: item.note,
      metadata:
        item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
          ? (item.metadata as Record<string, unknown>)
          : {},
      created_at: item.created_at,
      by_staff: item.changed_by !== null,
    })),
  };
}

/* ------------------------------------------------- reference data / schedule */

export interface AdminDoctor {
  id: string;
  full_name: string;
  specialization: string;
  slot_minutes: number;
  is_active: boolean;
}

export interface AdminService {
  id: string;
  name: string;
  duration_minutes: number;
}

export const getFilterOptions = cache(async () => {
  const supabase = await createSessionClient();
  const [doctors, services] = await Promise.all([
    supabase
      .from("doctors")
      .select("id, full_name, specialization, slot_minutes, is_active")
      .order("display_order"),
    supabase.from("services").select("id, name, duration_minutes").order("display_order"),
  ]);
  if (doctors.error || services.error) {
    logger.error("admin.filter_options_failed", doctors.error ?? services.error);
    throw new AdminDataError("Could not load doctors and services.");
  }
  return { doctors: doctors.data as AdminDoctor[], services: services.data as AdminService[] };
});

export const getClinicSettings = cache(async () => {
  const supabase = await createSessionClient();
  const { data, error } = await supabase
    .from("clinics")
    .select("name, timezone, booking_window_days, min_notice_minutes")
    .limit(1)
    .single();
  if (error) throw new AdminDataError("Could not load clinic settings.", { cause: error });
  return data;
});

export interface ScheduleData {
  doctor: AdminDoctor;
  windows: { id: string; weekday: number; start_time: string; end_time: string }[];
  breaks: {
    id: string;
    weekday: number | null;
    start_time: string;
    end_time: string;
    label: string;
  }[];
  blocked: {
    id: string;
    doctor_id: string | null;
    start_date: string;
    end_date: string;
    kind: "holiday" | "unavailable";
    reason: string;
  }[];
}

export async function getScheduleData(doctorId: string): Promise<ScheduleData | null> {
  if (!z.uuid().safeParse(doctorId).success) return null;
  const supabase = await createSessionClient();
  const [doctor, windows, breaks, blocked] = await Promise.all([
    supabase
      .from("doctors")
      .select("id, full_name, specialization, slot_minutes, is_active")
      .eq("id", doctorId)
      .maybeSingle(),
    supabase
      .from("doctor_availability")
      .select("id, weekday, start_time, end_time")
      .eq("doctor_id", doctorId)
      .order("weekday")
      .order("start_time"),
    supabase
      .from("doctor_breaks")
      .select("id, weekday, start_time, end_time, label")
      .eq("doctor_id", doctorId)
      .order("start_time"),
    supabase
      .from("blocked_dates")
      .select("id, doctor_id, start_date, end_date, kind, reason")
      .or(`doctor_id.eq.${doctorId},doctor_id.is.null`)
      .order("start_date"),
  ]);
  const failure = doctor.error ?? windows.error ?? breaks.error ?? blocked.error;
  if (failure) {
    logger.error("admin.schedule_failed", failure);
    throw new AdminDataError("Could not load the schedule.");
  }
  if (!doctor.data) return null;
  return {
    doctor: doctor.data as AdminDoctor,
    windows: windows.data ?? [],
    breaks: breaks.data ?? [],
    blocked: (blocked.data ?? []).map((item) => ({
      ...item,
      kind: item.kind === "holiday" ? "holiday" : "unavailable",
    })),
  };
}

/* -------------------------------------------------------- automation events */

export interface AutomationEventRow {
  id: string;
  event_type: string;
  status: string;
  attempts: number;
  last_error: string | null;
  created_at: string;
  next_attempt_at: string;
  delivered_at: string | null;
  reference: string | null;
}

export async function getAutomationEvents(): Promise<{
  rows: AutomationEventRow[];
  counts: Record<string, number>;
}> {
  const supabase = await createSessionClient();
  const [rowsRes, countsRes] = await Promise.all([
    supabase
      .from("automation_events")
      .select(
        "id, event_type, status, attempts, last_error, created_at, next_attempt_at, delivered_at, payload",
      )
      .order("created_at", { ascending: false })
      .limit(50),
    supabase.from("automation_events").select("status"),
  ]);
  if (rowsRes.error || countsRes.error) {
    logger.error("admin.events_failed", rowsRes.error ?? countsRes.error);
    throw new AdminDataError("Could not load automation events.");
  }
  const counts: Record<string, number> = {};
  for (const row of countsRes.data ?? []) counts[row.status] = (counts[row.status] ?? 0) + 1;

  const rows = (rowsRes.data ?? []).map((row) => {
    const payload = row.payload as { data?: { appointment?: { reference?: string } } } | null;
    return {
      id: row.id,
      event_type: row.event_type,
      status: row.status,
      attempts: row.attempts,
      last_error: row.last_error,
      created_at: row.created_at,
      next_attempt_at: row.next_attempt_at,
      delivered_at: row.delivered_at,
      reference: payload?.data?.appointment?.reference ?? null,
    };
  });
  return { rows, counts };
}
