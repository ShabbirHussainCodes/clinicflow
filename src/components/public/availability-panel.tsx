import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { DoctorNextAvailable } from "@/lib/data/next-slots";

function bookingHref(item: DoctorNextAvailable, slotStart: string): string {
  return `/book?${new URLSearchParams({
    service: item.serviceSlug,
    doctor: item.doctorSlug,
    date: item.date,
    time: slotStart,
  }).toString()}`;
}

/**
 * The next free times for each doctor, straight from the booking database. Every time is a link
 * that opens the booking form with that doctor, service and time already chosen. As a `panel` it
 * is a list beside the headline; as a `strip` it runs across the page under a photograph.
 */
export function AvailabilityPanel({
  items,
  layout = "panel",
}: {
  items: DoctorNextAvailable[];
  layout?: "panel" | "strip";
}) {
  if (items.length === 0) {
    return (
      <section
        aria-labelledby="next-heading"
        className="rounded-md border border-sand-200 bg-surface p-6 sm:p-7"
      >
        <h2
          id="next-heading"
          className="font-sans text-[0.8125rem] font-semibold uppercase tracking-[0.14em]"
        >
          Book online
        </h2>
        <p className="mt-3 text-ink-700">
          Choose a service, a doctor and a time. Only genuinely free times are offered.
        </p>
        <ButtonLink href="/book" className="mt-5" variant="secondary">
          Start booking
        </ButtonLink>
      </section>
    );
  }

  const strip = layout === "strip";
  const list = (
    <ul
      className={cn(
        "divide-y divide-sand-200",
        strip && "sm:grid sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-4 lg:divide-x",
      )}
    >
      {items.map((item) => (
        <li key={item.doctorSlug} className={cn("px-5 py-5 sm:px-6", strip && "sm:py-6")}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="font-semibold text-ink-900">{item.doctorName}</p>
            <p className="shrink-0 text-sm font-semibold text-ink-700">{item.dayLabel}</p>
          </div>
          <p className="text-sm text-ink-500">
            {item.specialization} &middot; {item.serviceName}
          </p>
          <ul className="mt-3.5 flex flex-wrap gap-2">
            {item.slots.slice(0, strip ? 2 : item.slots.length).map((slot) => (
              <li key={slot.start}>
                <Link
                  href={bookingHref(item, slot.start)}
                  aria-label={`Book ${slot.label} ${item.dayLabel} with ${item.doctorName}`}
                  className="inline-flex min-h-10 min-w-[5.5rem] items-center justify-center rounded-sm border border-sand-300 bg-surface px-3 text-sm font-semibold tabular-nums text-ink-900 transition-colors hover:border-brand-700 hover:bg-brand-700 hover:text-white"
                >
                  {slot.label}
                </Link>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );

  const header = (
    <div className="flex items-baseline justify-between gap-4 border-b border-sand-200 px-5 py-4 sm:px-6">
      <h2
        id="next-heading"
        className="font-sans text-[0.8125rem] font-semibold uppercase tracking-[0.14em] text-ink-900"
      >
        Next available times
      </h2>
      <Link
        href="/book"
        className="inline-flex items-center gap-1 rounded-xs text-sm font-semibold text-brand-700 hover:text-brand-800"
      >
        All times <ArrowRight className="size-3.5" aria-hidden="true" />
      </Link>
    </div>
  );

  if (strip) {
    return (
      <section aria-labelledby="next-heading" className="border-t border-sand-200 bg-surface">
        <div className="container-page">
          {header}
          {list}
        </div>
      </section>
    );
  }
  return (
    <section
      aria-labelledby="next-heading"
      className="rounded-md border border-sand-200 bg-surface"
    >
      {header}
      {list}
    </section>
  );
}
