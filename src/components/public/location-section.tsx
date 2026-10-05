import Image from "next/image";
import { CalendarOff, ExternalLink, Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { ButtonLink, buttonClasses } from "@/components/ui/button";
import { siteContent } from "@/config/site";
import { describeRanges } from "@/lib/availability-summary";
import { formatClinicAddress, type Catalog } from "@/lib/data/catalog";
import { formatCalendarDate, todayInZone, weekdayOf, WEEKDAY_NAMES } from "@/lib/datetime";
import { clinicPhoto } from "@/lib/public-images";
import { cn } from "@/lib/cn";
import { localityOf, telHref } from "@/lib/site-text";

function describeClosure(startDate: string, endDate: string): string {
  return startDate === endDate
    ? formatCalendarDate(startDate)
    : `${formatCalendarDate(startDate, "month-day")} – ${formatCalendarDate(endDate, "month-day")}`;
}

/** Address, ways to get in touch, and the opening hours day by day with today marked. */
export function LocationSection({ catalog, now }: { catalog: Catalog; now: Date }) {
  const { clinic, hoursByDay, holidays } = catalog;
  const address = formatClinicAddress(clinic);
  const mapsUrl =
    siteContent.mapsUrl ??
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      `${clinic.name}, ${address.join(", ")}`,
    )}`;
  const mapImage = clinicPhoto("map");
  const today = weekdayOf(todayInZone(clinic.timezone, now));

  return (
    <section id="contact" aria-labelledby="contact-heading" className="py-16 sm:py-20 lg:py-24">
      <div className="container-page">
        <p className="eyebrow eyebrow-rule mb-4">Visit and contact</p>
        <h2 id="contact-heading" className="max-w-2xl text-[1.75rem] sm:text-[2.25rem]">
          Find us in {localityOf(clinic)}
        </h2>

        <div className="mt-10 grid gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <address className="not-italic">
              <p className="font-display text-[1.5rem] font-medium leading-snug">{clinic.name}</p>
              <p className="mt-2 flex gap-3 text-ink-700">
                <MapPin className="mt-1 size-4 shrink-0 text-brand-600" aria-hidden="true" />
                <span>
                  {address.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </span>
              </p>
            </address>

            <ul className="mt-6 space-y-3 text-ink-900">
              <li className="flex items-center gap-3">
                <Phone className="size-4 shrink-0 text-brand-600" aria-hidden="true" />
                <a
                  className="font-semibold tabular-nums underline-offset-4 hover:text-brand-700 hover:underline"
                  href={telHref(clinic.phone)}
                >
                  {clinic.phone}
                </a>
              </li>
              {siteContent.whatsapp ? (
                <li className="flex items-center gap-3">
                  <MessageCircle className="size-4 shrink-0 text-brand-600" aria-hidden="true" />
                  <a
                    className="font-semibold underline-offset-4 hover:text-brand-700 hover:underline"
                    href={`https://wa.me/${siteContent.whatsapp.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Message us on WhatsApp
                  </a>
                </li>
              ) : null}
              <li className="flex items-center gap-3">
                <Mail className="size-4 shrink-0 text-brand-600" aria-hidden="true" />
                <a
                  className="break-all underline-offset-4 hover:text-brand-700 hover:underline"
                  href={`mailto:${clinic.email}`}
                >
                  {clinic.email}
                </a>
              </li>
            </ul>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                icon={<ExternalLink className="size-4" aria-hidden="true" />}
              >
                Get directions
              </ButtonLink>
              <a href={telHref(clinic.phone)} className={buttonClasses({ variant: "secondary" })}>
                <Phone className="size-4" aria-hidden="true" /> Call the clinic
              </a>
            </div>
          </div>

          <div>
            <h3 className="eyebrow font-sans">Opening hours</h3>
            <table className="mt-4 w-full border-t border-sand-200 text-[0.9375rem]">
              <caption className="sr-only">Clinic opening hours</caption>
              <tbody>
                {hoursByDay.map((row) => {
                  const isToday = row.weekday === today;
                  return (
                    <tr
                      key={row.weekday}
                      className={cn("border-b border-sand-200", isToday && "bg-brand-50")}
                    >
                      <th
                        scope="row"
                        className={cn(
                          "w-[44%] px-3 py-3 text-left align-top font-medium",
                          isToday && "font-semibold",
                        )}
                      >
                        {WEEKDAY_NAMES[row.weekday]}
                        {isToday ? (
                          <span className="ml-2 text-xs font-semibold text-brand-700">Today</span>
                        ) : null}
                      </th>
                      <td
                        className={cn(
                          "px-3 py-3 text-right tabular-nums",
                          row.ranges.length === 0 ? "text-ink-500" : "text-ink-900",
                          isToday && "font-semibold",
                        )}
                      >
                        {row.ranges.length === 0
                          ? "Closed"
                          : row.ranges.map((range) => (
                              <span key={range.start} className="block">
                                {describeRanges([range])}
                              </span>
                            ))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-3 text-sm text-ink-500">
              Hours show when at least one doctor is in the clinic. Each doctor keeps their own
              timings.
            </p>

            {holidays.length > 0 ? (
              <div className="mt-6 border-l-2 border-clay-500 pl-4">
                <h3 className="flex items-center gap-2 font-sans text-base font-semibold tracking-normal">
                  <CalendarOff className="size-4 text-clay-700" aria-hidden="true" /> Upcoming
                  closures
                </h3>
                <ul className="mt-2 space-y-1 text-sm text-ink-700">
                  {holidays.map((holiday) => (
                    <li key={holiday.id}>
                      <span className="font-semibold text-ink-900">
                        {describeClosure(holiday.startDate, holiday.endDate)}
                      </span>
                      {holiday.reason ? <span> &middot; {holiday.reason}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>

        {mapImage ? (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="relative mt-14 block aspect-[16/9] overflow-hidden rounded-md border border-sand-200 sm:aspect-[21/9]"
          >
            <Image
              src={mapImage}
              alt={`Map showing where ${clinic.name} is. Opens in your maps app.`}
              fill
              sizes="(min-width: 1152px) 1100px, 92vw"
              className="object-cover"
            />
          </a>
        ) : null}
      </div>
    </section>
  );
}
