import "server-only";
import { z } from "zod";

import type { SlotDto } from "@/components/booking/types";
import { logger } from "@/lib/logger";
import { createPublicClient } from "@/lib/supabase/clients";

const slotRowSchema = z.object({ slot_start: z.string(), slot_end: z.string() });
const dateRowSchema = z.object({ slot_date: z.string(), slot_count: z.number() });


export type { SlotDto };

export async function fetchSlots(
  doctorId: string,
  serviceId: string,
  date: string,
): Promise<{ ok: true; slots: SlotDto[] } | { ok: false }> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("get_available_slots", {
    p_doctor_id: doctorId,
    p_service_id: serviceId,
    p_date: date,
  });
  if (error) {
    logger.error("booking.slots_failed", error);
    return { ok: false };
  }
  const rows = z.array(slotRowSchema).parse(data ?? []);
  return { ok: true, slots: rows.map((row) => ({ start: row.slot_start, end: row.slot_end })) };
}

export interface DateAvailabilityDto {
  date: string;
  count: number;
}

export async function fetchAvailableDates(
  doctorId: string,
  serviceId: string,
  from: string,
  to: string,
): Promise<{ ok: true; dates: DateAvailabilityDto[] } | { ok: false }> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("get_available_dates", {
    p_doctor_id: doctorId,
    p_service_id: serviceId,
    p_from: from,
    p_to: to,
  });
  if (error) {
    logger.error("booking.dates_failed", error);
    return { ok: false };
  }
  const rows = z.array(dateRowSchema).parse(data ?? []);
  return { ok: true, dates: rows.map((row) => ({ date: row.slot_date, count: row.slot_count })) };
}

const bookingResultSchema = z.discriminatedUnion("ok", [
  z.object({ ok: z.literal(true), reference: z.string() }),
  z.object({
    ok: z.literal(false),
    error: z.enum(["slot_unavailable", "too_many_bookings", "invalid_input"]),
    field: z.string().optional(),
  }),
]);

export type BookingRpcResult = z.infer<typeof bookingResultSchema>;

export interface BookAppointmentArgs {
  doctorId: string;
  serviceId: string;
  startAt: string;
  name: string;
  phone: string;
  email: string | undefined;
  ageRange: string | undefined;
  visitReason: string | undefined;
}

export async function bookAppointment(args: BookAppointmentArgs): Promise<BookingRpcResult | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("book_appointment", {
    p_doctor_id: args.doctorId,
    p_service_id: args.serviceId,
    p_start_at: args.startAt,
    p_patient_name: args.name,
    p_patient_phone: args.phone,
    p_patient_email: args.email,
    p_age_range: args.ageRange,
    p_visit_reason: args.visitReason,
    p_consent: true,
  });
  if (error) {
    logger.error("booking.rpc_failed", error);
    return null;
  }
  const parsed = bookingResultSchema.safeParse(data);
  if (!parsed.success) {
    logger.error("booking.rpc_unexpected_shape", parsed.error);
    return null;
  }
  return parsed.data;
}

const confirmationSchema = z.object({
  reference: z.string(),
  status: z.enum(["pending", "confirmed", "completed", "cancelled", "no_show"]),
  start_at: z.string(),
  end_at: z.string(),
  created_at: z.string(),
  timezone: z.string(),
  patient: z.object({
    display_name: z.string(),
    phone_hint: z.string(),
    has_email: z.boolean(),
  }),
  doctor: z.object({
    name: z.string(),
    slug: z.string(),
    specialization: z.string(),
    qualification: z.string(),
    avatar_theme: z.string(),
  }),
  service: z.object({ name: z.string(), duration_minutes: z.number() }),
  clinic: z.object({
    name: z.string(),
    phone: z.string(),
    email: z.string(),
    address_line1: z.string(),
    address_line2: z.string().nullable(),
    city: z.string(),
    state: z.string(),
    postal_code: z.string(),
  }),
});

export type BookingConfirmation = z.infer<typeof confirmationSchema>;

export async function fetchConfirmation(reference: string): Promise<BookingConfirmation | null> {
  const supabase = createPublicClient();
  const { data, error } = await supabase.rpc("get_booking_confirmation", {
    p_reference: reference,
  });
  if (error) {
    logger.error("booking.confirmation_failed", error);
    throw new Error("confirmation_lookup_failed");
  }
  if (!data) return null;
  const parsed = confirmationSchema.safeParse(data);
  if (!parsed.success) {
    logger.error("booking.confirmation_unexpected_shape", parsed.error);
    throw new Error("confirmation_unexpected_shape");
  }
  return parsed.data;
}
