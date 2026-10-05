import { ArrowRight, Timer } from "lucide-react";
import Link from "next/link";

import { ServiceIcon } from "@/components/service-icon";
import type { Doctor, Service } from "@/lib/data/catalog";

export function ServiceCard({
  service,
  doctors,
  showDoctors = false,
}: {
  service: Service;
  doctors: Doctor[];
  showDoctors?: boolean;
}) {
  return (
    <article className="group flex h-full flex-col rounded-lg border border-sand-200 bg-surface p-6 shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-raised">
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-12 items-center justify-center rounded-md bg-teal-50 text-teal-700 transition-colors group-hover:bg-teal-700 group-hover:text-white">
          <ServiceIcon name={service.icon} className="size-6" />
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-sand-100 px-2.5 py-1 text-xs font-semibold text-ink-700">
          <Timer className="size-3.5" aria-hidden="true" />
          {service.duration_minutes} min
        </span>
      </div>
      <h3 className="mt-5 font-sans text-xl font-semibold tracking-normal">{service.name}</h3>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-700">{service.description}</p>

      {showDoctors ? (
        <div className="mt-4 border-t border-sand-100 pt-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">Offered by</p>
          <ul className="mt-2 space-y-1 text-sm text-ink-900">
            {doctors.map((doctor) => (
              <li key={doctor.id}>
                <span className="font-semibold">{doctor.full_name}</span>
                <span className="text-ink-500"> · {doctor.specialization}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-auto pt-5">
        <Link
          href={`/book?service=${service.slug}`}
          className="inline-flex items-center gap-1.5 rounded-xs text-[0.9375rem] font-semibold text-teal-700 hover:text-teal-800"
        >
          Book this service
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
