import "server-only";
import { cache } from "react";

import { getCatalog } from "@/lib/data/catalog";
import { fetchAvailableDates, fetchSlots } from "@/lib/data/booking";
import { addDays, formatCalendarDate, formatTime, todayInZone } from "@/lib/datetime";

export interface NextAvailable {
  serviceSlug: string;
  doctorSlug: string;
  doctorName: string;
  /** "Today", "Tomorrow" or a short date such as "Wed, 7 Oct". */
  dayLabel: string;
  date: string;
  slots: { start: string; label: string }[];
}

/**
 * The next few genuinely free times for the clinic's first service, used by the home page hero.
 * It asks the same database functions as the booking flow, so what the hero shows is what the
 * patient can actually book. Returns null when nothing is free soon (the hero then falls back to a
 * plain "Book now" card) or when the database cannot be reached.
 */
export const getNextAvailable = cache(async (): Promise<NextAvailable | null> => {
  try {
    const { clinic, services, doctorsForService } = await getCatalog();
    const service = services[0];
    if (!service) return null;

    const today = todayInZone(clinic.timezone);
    const lastLookAhead = addDays(today, Math.min(clinic.booking_window_days, 14));

    for (const doctor of doctorsForService(service.id).slice(0, 3)) {
      const dates = await fetchAvailableDates(doctor.id, service.id, today, lastLookAhead);
      const firstDate = dates.ok ? dates.dates[0]?.date : undefined;
      if (!firstDate) continue;

      const slots = await fetchSlots(doctor.id, service.id, firstDate);
      if (!slots.ok || slots.slots.length === 0) continue;

      const dayLabel =
        firstDate === today
          ? "Today"
          : firstDate === addDays(today, 1)
            ? "Tomorrow"
            : formatCalendarDate(firstDate, "short").replace(/,? \d{4}$/, "");

      return {
        serviceSlug: service.slug,
        doctorSlug: doctor.slug,
        doctorName: doctor.full_name,
        dayLabel,
        date: firstDate,
        slots: slots.slots.slice(0, 4).map((slot) => ({
          start: slot.start,
          label: formatTime(slot.start, clinic.timezone),
        })),
      };
    }
    return null;
  } catch {
    return null;
  }
});
