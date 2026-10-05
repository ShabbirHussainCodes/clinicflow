import { Award, CalendarDays, Languages } from "lucide-react";

import { DoctorAvatar } from "@/components/illustrations/doctor-avatar";
import { ButtonLink } from "@/components/ui/button";
import type { Doctor } from "@/lib/data/catalog";

export function DoctorCard({ doctor, detailed = false }: { doctor: Doctor; detailed?: boolean }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-lg border border-sand-200 bg-surface shadow-card transition-shadow duration-200 hover:shadow-raised">
      <div className="bg-sand-50 px-8 pt-8">
        <div className="mx-auto w-full max-w-[11rem]">
          <DoctorAvatar theme={doctor.avatar_theme} />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-6">
        <h3 className="text-2xl">{doctor.full_name}</h3>
        <p className="mt-1 font-semibold text-teal-700">{doctor.specialization}</p>
        <p className="mt-0.5 text-sm text-ink-500">{doctor.qualification}</p>

        <ul className="mt-4 space-y-2 text-sm text-ink-700">
          <li className="flex items-center gap-2.5">
            <Award className="size-4 shrink-0 text-teal-600" aria-hidden="true" />
            {doctor.experience_years} years of experience
          </li>
          {doctor.languages.length > 0 ? (
            <li className="flex items-center gap-2.5">
              <Languages className="size-4 shrink-0 text-teal-600" aria-hidden="true" />
              {doctor.languages.join(", ")}
            </li>
          ) : null}
          <li className="flex gap-2.5">
            <CalendarDays className="mt-0.5 size-4 shrink-0 text-teal-600" aria-hidden="true" />
            <span>
              {doctor.availability.length === 0 ? (
                "Availability coming soon"
              ) : (
                doctor.availability.map((line) => (
                  <span key={`${line.days}-${line.hours}`} className="block">
                    <span className="font-semibold text-ink-900">{line.days}</span>{" "}
                    <span className="whitespace-nowrap">{line.hours}</span>
                  </span>
                ))
              )}
            </span>
          </li>
        </ul>

        {detailed && doctor.bio ? <p className="mt-4 text-[0.9375rem] text-ink-700">{doctor.bio}</p> : null}

        <div className="mt-auto pt-6">
          <ButtonLink
            href={`/book?doctor=${doctor.slug}`}
            variant="secondary"
            className="w-full group-hover:border-teal-600"
          >
            Book with {doctor.full_name.replace(/^Dr\.\s*/, "Dr. ").split(" ").slice(0, 2).join(" ")}
          </ButtonLink>
        </div>
      </div>
    </article>
  );
}
