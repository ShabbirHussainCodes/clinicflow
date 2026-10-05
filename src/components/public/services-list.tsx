import Link from "next/link";
import { ArrowRight } from "lucide-react";

import type { Doctor, Service } from "@/lib/data/catalog";

/**
 * Services as a ruled list, the way a printed menu of services reads: name, a plain sentence,
 * the length of the visit, and a link to book it. The whole row is clickable.
 */
export function ServicesList({
  services,
  doctorsForService,
  showDoctors = false,
}: {
  services: Service[];
  doctorsForService?: (serviceId: string) => Doctor[];
  showDoctors?: boolean;
}) {
  return (
    <ul className="divide-y divide-sand-200 border-y border-sand-200">
      {services.map((service, index) => {
        const doctors = showDoctors ? (doctorsForService?.(service.id) ?? []) : [];
        return (
          <li
            key={service.id}
            className="group relative grid gap-x-6 gap-y-3 py-6 transition-colors hover:bg-sand-50 sm:grid-cols-[2.5rem_1fr_auto] sm:px-3 sm:py-7"
          >
            <span
              aria-hidden="true"
              className="hidden pt-1 font-display text-lg tabular-nums text-ink-500 sm:block"
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <div>
              <h3 className="font-display text-[1.375rem] font-medium leading-snug">
                {service.name}
              </h3>
              <p className="mt-1.5 max-w-xl text-ink-700">{service.description}</p>
              {doctors.length > 0 ? (
                <p className="mt-2.5 text-sm text-ink-500">
                  With {doctors.map((doctor) => doctor.full_name).join(", ")}
                </p>
              ) : null}
            </div>
            <div className="flex items-center justify-between gap-6 sm:flex-col sm:items-end sm:justify-start sm:gap-2 sm:pt-1.5">
              <p className="text-sm tabular-nums text-ink-500">{service.duration_minutes} min</p>
              <Link
                href={`/book?service=${service.slug}`}
                aria-label={`Book ${service.name}`}
                className="inline-flex items-center gap-1.5 font-semibold text-brand-700 after:absolute after:inset-0 group-hover:text-brand-800"
              >
                Book
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
