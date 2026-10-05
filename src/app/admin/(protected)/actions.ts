"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { requireAdminClient } from "@/lib/auth";
import { startOfDayInZone, addDays } from "@/lib/datetime";
import { logger } from "@/lib/logger";
import { createSessionClient } from "@/lib/supabase/clients";
import {
  blockedDateSchema,
  breakSchema,
  notesSchema,
  rescheduleSchema,
  scheduleSchema,
  statusChangeSchema,
} from "@/lib/validation/admin";
import { toFieldErrors, slotsQuerySchema, type FieldErrors } from "@/lib/validation/booking";
import { z } from "zod";

/**
 * Every action re-verifies the administrator on the server (requireAdminClient) before doing
 * anything: the proxy redirect and the UI hiding buttons are conveniences, not security. The
 * database then enforces the same rule again with RLS and the admin_* functions.
 */

export type ActionResult =
  { ok: true; message: string } | { ok: false; message: string; fieldErrors?: FieldErrors };

const ERROR_MESSAGES: Record<string, string> = {
  invalid_transition: "That change isn't allowed from the appointment's current status.",
  not_started_yet: "You can mark an appointment completed or no-show once its time has started.",
  no_change: "Nothing to change: the appointment is already in that state.",
  not_found: "That record no longer exists. Please refresh the page.",
  slot_unavailable: "That time is no longer available. Please choose another.",
  note_too_long: "That note is too long.",
  overlapping_windows: "Working hours on the same day must not overlap.",
  invalid_windows: "One of the working-hour entries is not valid.",
  invalid_slot_minutes: "Slot length must be a multiple of 5 minutes, between 5 and 120.",
};

function messageFor(code: unknown): string {
  return (
    (typeof code === "string" && ERROR_MESSAGES[code]) || "Something went wrong. Please try again."
  );
}

const rpcResultSchema = z.object({ ok: z.boolean(), error: z.string().optional() }).passthrough();

function fromRpc(data: unknown, success: string): ActionResult {
  const parsed = rpcResultSchema.safeParse(data);
  if (!parsed.success) return { ok: false, message: "Unexpected response from the server." };
  return parsed.data.ok
    ? { ok: true, message: success }
    : { ok: false, message: messageFor(parsed.data.error) };
}

/* ------------------------------------------------------------------ session */

export async function signOutAction(): Promise<void> {
  const supabase = await createSessionClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

/* ------------------------------------------------------------- appointments */

export async function changeStatusAction(input: unknown): Promise<ActionResult> {
  const { supabase } = await requireAdminClient();
  const parsed = statusChangeSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, message: "Invalid request.", fieldErrors: toFieldErrors(parsed.error) };

  const { data, error } = await supabase.rpc("admin_set_appointment_status", {
    p_appointment_id: parsed.data.appointmentId,
    p_status: parsed.data.status,
    p_note: parsed.data.note,
  });
  if (error) {
    logger.error("admin.status_change_failed", error);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
  revalidatePath("/admin", "layout");
  const labels: Record<string, string> = {
    confirmed: "Appointment confirmed.",
    cancelled: "Appointment cancelled.",
    completed: "Appointment marked as completed.",
    no_show: "Appointment marked as no-show.",
  };
  return fromRpc(data, labels[parsed.data.status] ?? "Status updated.");
}

export async function loadRescheduleSlotsAction(input: {
  appointmentId: string;
  date: string;
}): Promise<
  { ok: true; slots: { start: string; end: string }[] } | { ok: false; message: string }
> {
  const { supabase } = await requireAdminClient();
  const parsed = z
    .object({ appointmentId: z.uuid(), date: slotsQuerySchema.shape.date })
    .safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid request." };

  const { data, error } = await supabase.rpc("admin_get_reschedule_slots", {
    p_appointment_id: parsed.data.appointmentId,
    p_date: parsed.data.date,
  });
  if (error) {
    logger.error("admin.reschedule_slots_failed", error);
    return { ok: false, message: "Could not load times." };
  }
  return {
    ok: true,
    slots: (data ?? []).map((row) => ({ start: row.slot_start, end: row.slot_end })),
  };
}

export async function rescheduleAction(input: unknown): Promise<ActionResult> {
  const { supabase } = await requireAdminClient();
  const parsed = rescheduleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Choose a time slot." };

  const { data, error } = await supabase.rpc("admin_reschedule_appointment", {
    p_appointment_id: parsed.data.appointmentId,
    p_new_start_at: parsed.data.startAt,
    p_note: parsed.data.note,
  });
  if (error) {
    logger.error("admin.reschedule_failed", error);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
  revalidatePath("/admin", "layout");
  return fromRpc(data, "Appointment rescheduled.");
}

export async function saveNotesAction(input: unknown): Promise<ActionResult> {
  const { supabase } = await requireAdminClient();
  const parsed = notesSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: "Please keep notes under 1000 characters.",
      fieldErrors: toFieldErrors(parsed.error),
    };

  const { data, error } = await supabase.rpc("admin_update_appointment_notes", {
    p_appointment_id: parsed.data.appointmentId,
    p_notes: parsed.data.notes,
  });
  if (error) {
    logger.error("admin.notes_failed", error);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
  revalidatePath("/admin", "layout");
  return fromRpc(data, "Notes saved.");
}

/* ----------------------------------------------------------------- schedule */

export async function saveScheduleAction(input: unknown): Promise<ActionResult> {
  const { supabase } = await requireAdminClient();
  const parsed = scheduleSchema.safeParse(input);
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Please check the working hours.";
    return { ok: false, message: first, fieldErrors: toFieldErrors(parsed.error) };
  }

  const { data, error } = await supabase.rpc("admin_set_doctor_schedule", {
    p_doctor_id: parsed.data.doctorId,
    p_slot_minutes: parsed.data.slotMinutes,
    p_windows: parsed.data.windows.map((window) => ({
      weekday: window.weekday,
      start_time: window.start,
      end_time: window.end,
    })),
  });
  if (error) {
    logger.error("admin.schedule_save_failed", error);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
  revalidatePath("/admin/schedule");
  return fromRpc(data, "Weekly schedule saved. New bookings follow it immediately.");
}

export async function addBreakAction(input: unknown): Promise<ActionResult> {
  const { supabase } = await requireAdminClient();
  const parsed = breakSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: "Please check the break details.",
      fieldErrors: toFieldErrors(parsed.error),
    };

  const { error } = await supabase.from("doctor_breaks").insert({
    doctor_id: parsed.data.doctorId,
    weekday: parsed.data.weekday === "all" ? null : parsed.data.weekday,
    start_time: parsed.data.start,
    end_time: parsed.data.end,
    label: parsed.data.label,
  });
  if (error) {
    logger.error("admin.break_add_failed", error);
    return { ok: false, message: "Could not add the break. Please try again." };
  }
  revalidatePath("/admin/schedule");
  return { ok: true, message: "Break added." };
}

export async function deleteBreakAction(input: { id: string }): Promise<ActionResult> {
  const { supabase } = await requireAdminClient();
  const parsed = z.object({ id: z.uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid request." };
  const { error } = await supabase.from("doctor_breaks").delete().eq("id", parsed.data.id);
  if (error) {
    logger.error("admin.break_delete_failed", error);
    return { ok: false, message: "Could not remove the break." };
  }
  revalidatePath("/admin/schedule");
  return { ok: true, message: "Break removed." };
}

export async function addBlockedDateAction(input: unknown): Promise<ActionResult> {
  const { supabase, session } = await requireAdminClient();
  const parsed = blockedDateSchema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      message: "Please check the dates.",
      fieldErrors: toFieldErrors(parsed.error),
    };
  const value = parsed.data;

  const { error } = await supabase.from("blocked_dates").insert({
    doctor_id: value.doctorId === "clinic" ? null : value.doctorId,
    start_date: value.startDate,
    end_date: value.endDate,
    kind: value.kind,
    reason: value.reason,
    created_by: session.userId,
  });
  if (error) {
    logger.error("admin.block_add_failed", error);
    return { ok: false, message: "Could not block those dates. Please try again." };
  }

  // Existing appointments are never cancelled automatically; tell staff how many need attention.
  const { data: clinic } = await supabase.from("clinics").select("timezone").limit(1).single();
  const timeZone = clinic?.timezone ?? "Asia/Kolkata";
  let query = supabase
    .from("appointments")
    .select("id", { count: "exact", head: true })
    .in("status", ["pending", "confirmed"])
    .gte("start_at", startOfDayInZone(value.startDate, timeZone).toISOString())
    .lt("start_at", startOfDayInZone(addDays(value.endDate, 1), timeZone).toISOString());
  if (value.doctorId !== "clinic") query = query.eq("doctor_id", value.doctorId);
  const { count } = await query;

  revalidatePath("/admin/schedule");
  const affected = count ?? 0;
  return {
    ok: true,
    message:
      affected > 0
        ? `Dates blocked. ${affected} existing appointment${affected === 1 ? " falls" : "s fall"} in this period and ${affected === 1 ? "was" : "were"} not changed. Review ${affected === 1 ? "it" : "them"} in Appointments.`
        : "Dates blocked. Patients can no longer book them.",
  };
}

export async function deleteBlockedDateAction(input: { id: string }): Promise<ActionResult> {
  const { supabase } = await requireAdminClient();
  const parsed = z.object({ id: z.uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid request." };
  const { error } = await supabase.from("blocked_dates").delete().eq("id", parsed.data.id);
  if (error) {
    logger.error("admin.block_delete_failed", error);
    return { ok: false, message: "Could not remove the block." };
  }
  revalidatePath("/admin/schedule");
  return { ok: true, message: "Block removed. Those dates are bookable again." };
}

/* ----------------------------------------------------------------- outbox */

export async function retryEventAction(input: { id: string }): Promise<ActionResult> {
  const { supabase } = await requireAdminClient();
  const parsed = z.object({ id: z.uuid() }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid request." };
  const { data, error } = await supabase.rpc("admin_retry_automation_event", {
    p_event_id: parsed.data.id,
  });
  if (error) {
    logger.error("admin.event_retry_failed", error);
    return { ok: false, message: "Something went wrong. Please try again." };
  }
  revalidatePath("/admin/events");
  const result = rpcResultSchema.safeParse(data);
  return result.success && result.data.ok
    ? { ok: true, message: "Event queued for another delivery attempt." }
    : { ok: false, message: "That event can't be retried." };
}
