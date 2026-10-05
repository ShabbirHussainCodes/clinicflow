import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { CalendarPlus, CalendarX2, CircleCheck, Clock, MapPin, Phone } from "lucide-react";

import { CopyReference } from "@/components/booking/copy-reference";
import { PrintButton } from "@/components/booking/print-button";
import { DoctorPortrait } from "@/components/public/doctor-portrait";
import { ButtonLink } from "@/components/ui/button";
import { Alert } from "@/components/ui/feedback";
import { StatusBadge } from "@/components/ui/status-badge";
import { fetchConfirmation } from "@/lib/data/booking";
import { formatDateLong, formatTimeRange } from "@/lib/datetime";
import { doctorPhoto } from "@/lib/public-images";
import { clientIpFrom, rateLimit } from "@/lib/rate-limit";
import { normalizeReference } from "@/lib/validation/booking";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Booking confirmation",
  // A booking reference must never end up in a search index.
  robots: { index: false, follow: false },
};

export default async function ConfirmationPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const reference = normalizeReference((await params).reference);
  if (!reference) notFound();

  // Throttle reference guessing: references are 50 bits of randomness, and lookups are limited.
  const ip = clientIpFrom(await headers());
  if (!rateLimit(`confirm:${ip}`, 40, 10 * 60 * 1000).allowed) {
    return (
      <div className="container-page max-w-2xl py-20">
        <Alert tone="warning" title="Too many lookups">
          Please wait a few minutes and try again.
        </Alert>
      </div>
    );
  }

  const confirmation = await fetchConfirmation(reference);
  if (!confirmation) notFound();

  const { doctor, service, clinic, patient } = confirmation;
  const tz = confirmation.timezone;
  const cancelled = confirmation.status === "cancelled";
  const address = [
    clinic.address_line1,
    clinic.address_line2,
    `${clinic.city}, ${clinic.state} ${clinic.postal_code}`,
  ]
    .filter(Boolean)
    .join(", ");

  const nextSteps = [
    "The clinic will contact you on your mobile number to confirm. Your booking is held in the meantime.",
    "Please arrive about 10 minutes early and carry any previous prescriptions or reports you have.",
    `Need to change or cancel? Call ${clinic.phone} and quote your booking reference.`,
  ];

  return (
    <div className="container-page max-w-4xl py-10 sm:py-14">
      <div className="text-center">
        <span
          className={`mx-auto flex size-16 items-center justify-center rounded-full ${cancelled ? "bg-danger-50 text-danger-600" : "bg-sage-100 text-sage-700"}`}
        >
          {cancelled ? (
            <CalendarX2 className="size-8" aria-hidden="true" />
          ) : (
            <CircleCheck className="size-8" aria-hidden="true" />
          )}
        </span>
        <h1 className="mt-5 text-4xl sm:text-5xl" data-testid="confirmation-heading">
          {cancelled ? "This appointment was cancelled" : "Your appointment is booked"}
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-lg text-ink-700">
          {cancelled
            ? "If this is unexpected, please call the clinic."
            : `Thank you, ${patient.display_name.replace(/\.$/, "")}. Keep your booking reference handy.`}
        </p>
      </div>

      <div className="mt-10 rounded-lg border border-brand-200 bg-brand-50 p-6 text-center sm:p-8">
        <p className="eyebrow">Booking reference</p>
        <p
          className="mt-2 break-all font-mono text-3xl font-bold tracking-wider text-brand-900 sm:text-4xl"
          data-testid="booking-reference"
        >
          {confirmation.reference}
        </p>
        <div className="no-print mt-4 flex justify-center">
          <CopyReference reference={confirmation.reference} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[1.2fr_1fr]">
        <section
          aria-labelledby="details-heading"
          className="rounded-lg border border-sand-200 bg-surface p-6 shadow-card sm:p-7"
        >
          <div className="flex items-start justify-between gap-3">
            <h2 id="details-heading" className="font-sans text-xl font-semibold tracking-normal">
              Appointment details
            </h2>
            <StatusBadge status={confirmation.status} />
          </div>

          <div className="mt-5 flex items-center gap-4 rounded-md bg-sand-50 p-4">
            <div className="w-14 shrink-0">
              <DoctorPortrait
                name={doctor.name}
                photoUrl={doctorPhoto(doctor.slug)}
                tone={doctor.avatar_theme}
                sizes="56px"
                className="rounded-sm"
                initialsClassName="text-xl"
              />
            </div>
            <div>
              <p className="font-semibold text-ink-900">{doctor.name}</p>
              <p className="text-sm text-brand-700">{doctor.specialization}</p>
              <p className="text-sm text-ink-500">{doctor.qualification}</p>
            </div>
          </div>

          <dl className="mt-5 space-y-4">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                Service
              </dt>
              <dd className="mt-0.5 font-semibold">
                {service.name}{" "}
                <span className="font-normal text-ink-500">
                  · about {service.duration_minutes} min
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                Date and time
              </dt>
              <dd className="mt-0.5 font-semibold" data-testid="confirmation-datetime">
                {formatDateLong(confirmation.start_at, tz)}
                <span className="mt-0.5 flex items-center gap-1.5 text-brand-800">
                  <Clock className="size-4" aria-hidden="true" />
                  {formatTimeRange(confirmation.start_at, confirmation.end_at, tz)}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                Patient
              </dt>
              <dd className="mt-0.5 font-semibold">
                {patient.display_name}
                <span className="font-normal text-ink-500"> · mobile {patient.phone_hint}</span>
              </dd>
            </div>
          </dl>

          {!cancelled ? (
            <div className="no-print mt-6 flex flex-wrap gap-3">
              <ButtonLink
                href={`/book/confirmation/${confirmation.reference}/calendar`}
                prefetch={false}
                icon={<CalendarPlus className="size-4" aria-hidden="true" />}
              >
                Add to calendar
              </ButtonLink>
              <PrintButton />
            </div>
          ) : null}
        </section>

        <div className="space-y-6">
          <section
            aria-labelledby="where-heading"
            className="rounded-lg border border-sand-200 bg-surface p-6 shadow-card"
          >
            <h2 id="where-heading" className="font-sans text-xl font-semibold tracking-normal">
              Where to go
            </h2>
            <address className="mt-3 space-y-3 text-[0.9375rem] not-italic">
              <p className="flex gap-2.5">
                <MapPin className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden="true" />
                <span>
                  <span className="block font-semibold">{clinic.name}</span>
                  {address}
                </span>
              </p>
              <p className="flex gap-2.5">
                <Phone className="mt-0.5 size-4 shrink-0 text-brand-600" aria-hidden="true" />
                <a
                  className="font-semibold text-brand-700 underline-offset-2 hover:underline"
                  href={`tel:${clinic.phone.replace(/\s/g, "")}`}
                >
                  {clinic.phone}
                </a>
              </p>
            </address>
          </section>

          <section
            aria-labelledby="next-heading"
            className="rounded-lg border border-sand-200 bg-surface p-6 shadow-card"
          >
            <h2 id="next-heading" className="font-sans text-xl font-semibold tracking-normal">
              What happens next
            </h2>
            <ol className="mt-3 space-y-3 text-[0.9375rem] text-ink-700">
              {nextSteps.map((text, index) => (
                <li key={text} className="flex gap-3">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800">
                    {index + 1}
                  </span>
                  <span>{text}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>

      <div className="no-print mt-10 text-center">
        <ButtonLink href="/" variant="ghost">
          Back to the home page
        </ButtonLink>
      </div>
    </div>
  );
}
