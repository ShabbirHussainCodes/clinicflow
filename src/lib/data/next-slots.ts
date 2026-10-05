import "server-only";
import { cache } from "react";

import { getCatalog } from "@/lib/data/catalog";
import { fetchAvailableDates, fetchSlots } from "@/lib/data/booking";
import { addDays, formatCalendarDate, formatTime, todayInZone } from "@/lib/datetime";

export interface DoctorNextAvailable {
  doctorSlug: string;
  doctorName: string;
  specialization: string;
  /** The service the times are for: the first service this doctor offers. */
  serviceSlug: string;
  serviceName: string;
  /** "Today", "Tomorrow" or a short date such as "Wed, 7 Oct". */
  dayLabel: string;
  date: string;
  slots: { start: string; label: string }[];
}

const MAX_DOCTORS = 4;
const SLOTS_PER_DOCTOR = 3;
const LOOK_AHEAD_DAYS = 14;

/**
 * The next few genuinely free times for each doctor, shown at the top of the home page. It asks the
 * same database functions as the booking flow, so what the page shows is what a patient can
 * actually book. Doctors with nothing free soon are left out, and any failure yields an empty list
 * (the page then shows a plain "Book online" panel instead of an error).
 */
export const getNextAvailability = cache(async (): Promise<DoctorNextAvailable[]> => {
  try {
    const { clinic, services, doctors } = await getCatalog();
    const today = todayInZone(clinic.timezone);
    const lastDay = addDays(today, Math.min(clinic.booking_window_days, LOOK_AHEAD_DAYS));

    const perDoctor = await Promise.all(
      doctors.slice(0, MAX_DOCTORS).map(async (doctor): Promise<DoctorNextAvailable | null> => {
        try {
          const service = services.find((item) => doctor.serviceIds.includes(item.id));
          if (!service) return null;

          const dates = await fetchAvailableDates(doctor.id, service.id, today, lastDay);
          const firstDate = dates.ok ? dates.dates[0]?.date : undefined;
          if (!firstDate) return null;

          const slots = await fetchSlots(doctor.id, service.id, firstDate);
          if (!slots.ok || slots.slots.length === 0) return null;

          const dayLabel =
            firstDate === today
              ? "Today"
              : firstDate === addDays(today, 1)
                ? "Tomorrow"
                : formatCalendarDate(firstDate, "short").replace(/,? \d{4}$/, "");

          return {
            doctorSlug: doctor.slug,
            doctorName: doctor.full_name,
            specialization: doctor.specialization,
            serviceSlug: service.slug,
            serviceName: service.name,
            dayLabel,
            date: firstDate,
            slots: slots.slots.slice(0, SLOTS_PER_DOCTOR).map((slot) => ({
              start: slot.start,
              label: formatTime(slot.start, clinic.timezone),
            })),
          };
        } catch {
          return null;
        }
      }),
    );
    return perDoctor.filter((item): item is DoctorNextAvailable => item !== null);
  } catch {
    return [];
  }
});
