"use server";

import { headers } from "next/headers";

import type { SlotDto } from "@/components/booking/types";
import {
  bookAppointment,
  fetchAvailableDates,
  fetchSlots,
  type DateAvailabilityDto,
} from "@/lib/data/booking";
import { getCatalog } from "@/lib/data/catalog";
import { addDays, todayInZone } from "@/lib/datetime";
import { getEnv } from "@/lib/env";
import { logger } from "@/lib/logger";
import { clientIpFrom, rateLimit } from "@/lib/rate-limit";
import {
  MIN_HUMAN_ELAPSED_MS,
  bookingSubmissionSchema,
  datesQuerySchema,
  slotsQuerySchema,
  toFieldErrors,
  type FieldErrors,
} from "@/lib/validation/booking";

/**
 * Server Actions are publicly callable HTTP endpoints, so every one of them validates its input
 * with Zod and never trusts the client's idea of what is available. The database remains the
 * authority on availability (see book_appointment).
 */

export type LoadDatesResult =
  { ok: true; dates: DateAvailabilityDto[] } | { ok: false; message: string };

export async function loadAvailableDates(input: {
  doctorId: string;
  serviceId: string;
}): Promise<LoadDatesResult> {
  const parsed = datesQuerySchema.pick({ doctorId: true, serviceId: true }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid selection." };

  const { clinic } = await getCatalog();
  const today = todayInZone(clinic.timezone);
  const last = addDays(today, clinic.booking_window_days);

  // The database limits one call to 62 days, so long booking windows are fetched in chunks.
  const dates: DateAvailabilityDto[] = [];
  let from = today;
  while (from <= last) {
    const to = addDays(from, 61) < last ? addDays(from, 61) : last;
    const result = await fetchAvailableDates(parsed.data.doctorId, parsed.data.serviceId, from, to);
    if (!result.ok)
      return { ok: false, message: "We couldn't load available dates. Please try again." };
    dates.push(...result.dates);
    from = addDays(to, 1);
  }
  return { ok: true, dates };
}

export type LoadSlotsResult = { ok: true; slots: SlotDto[] } | { ok: false; message: string };

export async function loadSlots(input: {
  doctorId: string;
  serviceId: string;
  date: string;
}): Promise<LoadSlotsResult> {
  const parsed = slotsQuerySchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid selection." };

  const result = await fetchSlots(parsed.data.doctorId, parsed.data.serviceId, parsed.data.date);
  if (!result.ok)
    return { ok: false, message: "We couldn't load times for that day. Please try again." };
  return { ok: true, slots: result.slots };
}

export type SubmitBookingResult =
  | { ok: true; reference: string }
  | {
      ok: false;
      code:
        | "validation"
        | "slot_unavailable"
        | "too_many_bookings"
        | "rate_limited"
        | "rejected"
        | "server";
      message: string;
      fieldErrors?: FieldErrors;
    };

export async function submitBooking(input: unknown): Promise<SubmitBookingResult> {
  const parsed = bookingSubmissionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      code: "validation",
      message: "Please check the highlighted fields.",
      fieldErrors: toFieldErrors(parsed.error, "details"),
    };
  }
  const submission = parsed.data;

  // Bot heuristics: the honeypot must be empty and a human needs a few seconds to get here.
  if (submission.website !== "" || submission.elapsedMs < MIN_HUMAN_ELAPSED_MS) {
    logger.warn("booking.rejected_as_spam");
    return {
      ok: false,
      code: "rejected",
      message: "We couldn't process this request. Please refresh the page and try again.",
    };
  }

  const ip = clientIpFrom(await headers());
  const limit = rateLimit(`book:${ip}`, getEnv().BOOKING_RATE_LIMIT_PER_HOUR, 60 * 60 * 1000);
  if (!limit.allowed) {
    logger.warn("booking.rate_limited");
    const minutes = Math.max(1, Math.ceil(limit.retryAfterSeconds / 60));
    return {
      ok: false,
      code: "rate_limited",
      message: `Too many booking attempts from your connection. Please try again in about ${minutes} minute${minutes === 1 ? "" : "s"}, or call the clinic.`,
    };
  }

  const { details } = submission;
  const result = await bookAppointment({
    doctorId: submission.doctorId,
    serviceId: submission.serviceId,
    startAt: submission.startAt,
    name: details.fullName,
    phone: details.mobile,
    email: details.email,
    ageRange: details.ageRange,
    visitReason: details.visitReason,
  });

  if (!result) {
    return {
      ok: false,
      code: "server",
      message:
        "We couldn't complete your booking right now. Nothing has been booked. Please try again in a moment, or call the clinic.",
    };
  }

  if (result.ok) {
    logger.info("booking.created", { reference: result.reference });
    return { ok: true, reference: result.reference };
  }

  switch (result.error) {
    case "slot_unavailable":
      return {
        ok: false,
        code: "slot_unavailable",
        message:
          "Sorry, that time was just taken by someone else. Please choose another time. Your details are saved.",
      };
    case "too_many_bookings":
      return {
        ok: false,
        code: "too_many_bookings",
        message:
          "This mobile number already has several upcoming appointments. Please call the clinic to book another.",
      };
    default:
      return {
        ok: false,
        code: "validation",
        message: "Some of your details could not be accepted. Please review them and try again.",
      };
  }
}
