import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";

import { BookingWizard } from "@/components/booking/booking-wizard";
import type { WizardClinic, WizardDoctor, WizardService } from "@/components/booking/types";
import { getCatalog } from "@/lib/data/catalog";
import { addDays, isIsoDate, timeZoneLabel, todayInZone } from "@/lib/datetime";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Book an appointment",
  description: "Choose a service, doctor and time, and book your appointment online.",
};

function firstParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const { clinic, services, doctors } = await getCatalog();

  const today = todayInZone(clinic.timezone);
  const wizardClinic: WizardClinic = {
    name: clinic.name,
    phone: clinic.phone,
    timezone: clinic.timezone,
    timezoneLabel: timeZoneLabel(clinic.timezone),
    today,
    lastDate: addDays(today, clinic.booking_window_days),
  };

  const wizardServices: WizardService[] = services.map((service) => ({
    id: service.id,
    slug: service.slug,
    name: service.name,
    description: service.description,
    durationMinutes: service.duration_minutes,
    icon: service.icon,
  }));

  const wizardDoctors: WizardDoctor[] = doctors.map((doctor) => ({
    id: doctor.id,
    slug: doctor.slug,
    name: doctor.full_name,
    qualification: doctor.qualification,
    specialization: doctor.specialization,
    experienceYears: doctor.experience_years,
    avatarTheme: doctor.avatar_theme,
    serviceIds: doctor.serviceIds,
    availability: doctor.availability,
  }));

  const serviceSlug = firstParam(params.service);
  const doctorSlug = firstParam(params.doctor);
  const initialServiceId = services.find((item) => item.slug === serviceSlug)?.id ?? null;
  const initialDoctorId = doctors.find((item) => item.slug === doctorSlug)?.id ?? null;

  // Optional deep link from the home page: /book?service=...&doctor=...&date=YYYY-MM-DD&time=<ISO instant>
  const dateParam = firstParam(params.date);
  const timeParam = firstParam(params.time);
  const initialDate =
    isIsoDate(dateParam) && dateParam >= today && dateParam <= wizardClinic.lastDate
      ? dateParam
      : null;
  const initialSlotStart =
    initialDate && !Number.isNaN(Date.parse(timeParam)) ? new Date(timeParam).toISOString() : null;

  return (
    <div className="container-page py-10 sm:py-14">
      <header className="mb-8 max-w-2xl">
        <p className="eyebrow mb-3">Book online</p>
        <h1 className="text-4xl sm:text-5xl">Book an appointment</h1>
        <p className="mt-4 flex items-start gap-2 text-ink-700">
          <ShieldCheck className="mt-1 size-5 shrink-0 text-teal-600" aria-hidden="true" />
          It takes about a minute. We only ask for your name and mobile number.
        </p>
      </header>

      <BookingWizard
        clinic={wizardClinic}
        services={wizardServices}
        doctors={wizardDoctors}
        initialServiceId={initialServiceId}
        initialDoctorId={initialDoctorId}
        initialDate={initialDate}
        initialSlotStart={initialSlotStart}
      />
    </div>
  );
}
