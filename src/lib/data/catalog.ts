import "server-only";
import { cache } from "react";

import {
  computeClinicHours,
  summarizeClinicHours,
  summarizeDoctorAvailability,
  type ClinicHoursRow,
  type SummaryLine,
  type WeeklyWindow,
} from "@/lib/availability-summary";
import { todayInZone } from "@/lib/datetime";
import { logger } from "@/lib/logger";
import { doctorPhoto } from "@/lib/public-images";
import { createPublicClient } from "@/lib/supabase/clients";
import type { Tables } from "@/lib/supabase/database.types";

export type Clinic = Tables<"clinics">;
export type Service = Tables<"services">;
export type DoctorRow = Tables<"doctors">;

export interface Doctor extends DoctorRow {
  serviceIds: string[];
  availability: SummaryLine[];
  /** Portrait found in `public/doctors/<slug>.*`, or null (the page then shows initials). */
  photoUrl: string | null;
}

export interface Holiday {
  id: string;
  startDate: string;
  endDate: string;
  reason: string;
}

export interface Catalog {
  clinic: Clinic;
  services: Service[];
  doctors: Doctor[];
  /** Clinic hours grouped into runs of identical days, for compact displays. */
  clinicHours: SummaryLine[];
  /** The clinic's hours day by day (Monday first): merged ranges in which any doctor is in. */
  hoursByDay: ClinicHoursRow[];
  /** Number of weekdays on which at least one doctor is in clinic. */
  openDaysPerWeek: number;
  holidays: Holiday[];
  /** Doctors offering a given service, in display order. */
  doctorsForService: (serviceId: string) => Doctor[];
}

export class CatalogUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "CatalogUnavailableError";
  }
}

/**
 * Everything the public website needs, in one cached-per-request call. Public tables are readable
 * by the anonymous role through RLS, so no credentials beyond the anon key are involved.
 */
export const getCatalog = cache(async (): Promise<Catalog> => {
  const supabase = createPublicClient();

  const [clinicRes, servicesRes, doctorsRes, linksRes, availabilityRes, holidaysRes] =
    await Promise.all([
      supabase.from("clinics").select("*").limit(1).maybeSingle(),
      supabase.from("services").select("*").eq("is_active", true).order("display_order"),
      supabase.from("doctors").select("*").eq("is_active", true).order("display_order"),
      supabase.from("doctor_services").select("doctor_id, service_id"),
      supabase.from("doctor_availability").select("doctor_id, weekday, start_time, end_time"),
      supabase.from("blocked_dates").select("id, start_date, end_date, reason"),
    ]);

  const failure =
    clinicRes.error ??
    servicesRes.error ??
    doctorsRes.error ??
    linksRes.error ??
    availabilityRes.error ??
    holidaysRes.error;
  if (failure) {
    logger.error("catalog.query_failed", failure);
    throw new CatalogUnavailableError("Could not load clinic information.", { cause: failure });
  }
  if (!clinicRes.data) {
    throw new CatalogUnavailableError("The clinic has not been configured yet.");
  }

  const clinic = clinicRes.data;
  const services = servicesRes.data ?? [];
  const doctorRows = doctorsRes.data ?? [];
  const links = linksRes.data ?? [];
  const availabilityRows = availabilityRes.data ?? [];
  const holidayRows = holidaysRes.data ?? [];
  const activeServiceIds = new Set(services.map((service) => service.id));

  const windowsByDoctor = new Map<string, WeeklyWindow[]>();
  for (const row of availabilityRows) {
    const list = windowsByDoctor.get(row.doctor_id) ?? [];
    list.push({ weekday: row.weekday, start_time: row.start_time, end_time: row.end_time });
    windowsByDoctor.set(row.doctor_id, list);
  }

  const doctors: Doctor[] = doctorRows.map((doctor) => ({
    ...doctor,
    serviceIds: links
      .filter((link) => link.doctor_id === doctor.id && activeServiceIds.has(link.service_id))
      .map((link) => link.service_id),
    availability: summarizeDoctorAvailability(windowsByDoctor.get(doctor.id) ?? []),
    photoUrl: doctorPhoto(doctor.slug),
  }));

  const activeDoctorIds = new Set(doctors.map((doctor) => doctor.id));
  const clinicWindows = availabilityRows.filter((row) => activeDoctorIds.has(row.doctor_id));

  const today = todayInZone(clinic.timezone);
  const holidays: Holiday[] = holidayRows
    .filter((holiday) => holiday.end_date >= today)
    .map((holiday) => ({
      id: holiday.id,
      startDate: holiday.start_date,
      endDate: holiday.end_date,
      reason: holiday.reason,
    }))
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
    .slice(0, 5);

  const hoursRows = computeClinicHours(clinicWindows);

  return {
    clinic,
    services,
    doctors,
    clinicHours: summarizeClinicHours(hoursRows),
    hoursByDay: hoursRows,
    openDaysPerWeek: hoursRows.filter((row) => row.ranges.length > 0).length,
    holidays,
    doctorsForService: (serviceId: string) =>
      doctors.filter((doctor) => doctor.serviceIds.includes(serviceId)),
  };
});

export function formatClinicAddress(
  clinic: Pick<Clinic, "address_line1" | "address_line2" | "city" | "state" | "postal_code">,
): string[] {
  return [
    clinic.address_line1,
    clinic.address_line2 ?? "",
    `${clinic.city}, ${clinic.state} ${clinic.postal_code}`,
  ].filter(Boolean);
}
