import { CalendarOff, Clock, ExternalLink, Mail, MapPin, Phone } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { formatClinicAddress, type Catalog } from "@/lib/data/catalog";
import { formatCalendarDate } from "@/lib/datetime";

function describeClosure(startDate: string, endDate: string): string {
  return startDate === endDate
    ? formatCalendarDate(startDate)
    : `${formatCalendarDate(startDate, "month-day")} – ${formatCalendarDate(endDate, "month-day")}`;
}

/** Stylised neighbourhood sketch. Drawn locally so no map tiles or remote images are needed. */
function MapSketch() {
  return (
    <svg viewBox="0 0 400 260" className="block h-auto w-full" aria-hidden="true" focusable="false">
      <rect width="400" height="260" fill="#eaf4f2" />
      <path d="M-10 190 120 150 230 176 420 120" fill="none" stroke="#fff" strokeWidth="14" />
      <path d="M90-10 130 270" fill="none" stroke="#fff" strokeWidth="10" />
      <path d="M280-10 250 270" fill="none" stroke="#fff" strokeWidth="10" />
      <path d="M-10 70 200 40 420 80" fill="none" stroke="#fff" strokeWidth="8" />
      <rect x="150" y="196" width="70" height="46" rx="6" fill="#dcebd7" />
      <rect x="300" y="130" width="64" height="40" rx="6" fill="#dcebd7" />
      <rect x="20" y="90" width="52" height="40" rx="6" fill="#d3e8e4" />
      <circle cx="320" cy="60" r="28" fill="#a6cda0" opacity="0.55" />
      <g transform="translate(196 118)">
        <path d="M0 52C-26 22-28-2-28-12a28 28 0 1 1 56 0C28-2 26 22 0 52Z" fill="#0b5753" />
        <circle cx="0" cy="-12" r="11" fill="#fbf9f5" />
        <path d="M0-19v14M-7-12h14" stroke="#0b5753" strokeWidth="3.4" strokeLinecap="round" />
      </g>
    </svg>
  );
}

export function LocationSection({ catalog }: { catalog: Catalog }) {
  const { clinic, clinicHours, holidays } = catalog;
  const address = formatClinicAddress(clinic);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${clinic.name}, ${address.join(", ")}`,
  )}`;

  return (
    <section id="contact" aria-labelledby="contact-heading" className="scroll-mt-24 bg-teal-900 py-20 text-teal-50 sm:py-24">
      <div className="container-page grid gap-10 lg:grid-cols-2 lg:gap-14">
        <div>
          <p className="eyebrow !text-sage-300">Visit &amp; contact</p>
          <h2 id="contact-heading" className="mt-3 text-3xl text-paper sm:text-4xl">
            Easy to find. Open when you need us.
          </h2>

          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            <div>
              <h3 className="flex items-center gap-2 font-sans text-base font-semibold tracking-normal text-sage-300">
                <Clock className="size-4" aria-hidden="true" /> Clinic hours
              </h3>
              <dl className="mt-3 space-y-2.5 text-[0.9375rem]">
                {clinicHours.map((line) => (
                  <div key={`${line.days}-${line.hours}`} className="flex flex-col">
                    <dt className="font-semibold text-paper">{line.days}</dt>
                    <dd className={line.hours === "Closed" ? "text-teal-100/70" : "text-teal-50"}>{line.hours}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-xs text-teal-100/70">
                Hours show when any doctor is in clinic. Individual doctors keep their own timings.
              </p>
            </div>

            <div>
              <h3 className="flex items-center gap-2 font-sans text-base font-semibold tracking-normal text-sage-300">
                <MapPin className="size-4" aria-hidden="true" /> Find us
              </h3>
              <address className="mt-3 space-y-1 text-[0.9375rem] not-italic">
                <p className="font-semibold text-paper">{clinic.name}</p>
                {address.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </address>
              <ul className="mt-4 space-y-2 text-[0.9375rem]">
                <li className="flex items-center gap-2.5">
                  <Phone className="size-4 text-sage-300" aria-hidden="true" />
                  <a className="underline-offset-2 hover:underline" href={`tel:${clinic.phone.replace(/\s/g, "")}`}>
                    {clinic.phone}
                  </a>
                </li>
                <li className="flex items-center gap-2.5">
                  <Mail className="size-4 text-sage-300" aria-hidden="true" />
                  <a className="break-all underline-offset-2 hover:underline" href={`mailto:${clinic.email}`}>
                    {clinic.email}
                  </a>
                </li>
              </ul>
            </div>
          </div>

          {holidays.length > 0 ? (
            <div className="mt-8 rounded-md border border-teal-700 bg-teal-800/60 p-4">
              <h3 className="flex items-center gap-2 font-sans text-base font-semibold tracking-normal text-paper">
                <CalendarOff className="size-4 text-sage-300" aria-hidden="true" /> Upcoming closures
              </h3>
              <ul className="mt-2 space-y-1 text-sm">
                {holidays.map((holiday) => (
                  <li key={holiday.id}>
                    <span className="font-semibold">{describeClosure(holiday.startDate, holiday.endDate)}</span>
                    {holiday.reason ? <span className="text-teal-100/85"> · {holiday.reason}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="self-start overflow-hidden rounded-lg border border-teal-700 bg-teal-800/50 shadow-raised">
          <MapSketch />
          <div className="flex flex-wrap items-center justify-between gap-3 p-5">
            <p className="text-sm text-teal-100/90">Opens in your maps app. No map data is loaded on this page.</p>
            <ButtonLink
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              variant="secondary"
              size="sm"
              icon={<ExternalLink className="size-4" aria-hidden="true" />}
            >
              Get directions
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
