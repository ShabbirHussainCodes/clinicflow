import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { DoctorPortrait } from "@/components/public/doctor-portrait";
import { cn } from "@/lib/cn";
import type { Doctor } from "@/lib/data/catalog";

function shortName(fullName: string): string {
  return fullName.split(" ").slice(0, 2).join(" ");
}

/**
 * `portrait` gives every doctor a large 4:5 photo (or initials tile). Without any photographs, use
 * `portrait={false}`: a ruled column headed by a small initials badge, which looks finished
 * instead of showing a row of empty picture frames.
 */
export function DoctorCard({
  doctor,
  detailed = false,
  portrait = true,
}: {
  doctor: Doctor;
  detailed?: boolean;
  portrait?: boolean;
}) {
  return (
    <article
      className={cn("group flex h-full flex-col", !portrait && "border-t border-ink-900 pt-6")}
    >
      {portrait ? (
        <DoctorPortrait
          name={doctor.full_name}
          photoUrl={doctor.photoUrl}
          tone={doctor.avatar_theme}
          sizes="(min-width: 1024px) 22vw, (min-width: 640px) 44vw, 92vw"
          initialsClassName="text-7xl"
        />
      ) : (
        <DoctorPortrait
          name={doctor.full_name}
          photoUrl={null}
          tone={doctor.avatar_theme}
          sizes="56px"
          shape="square"
          className="size-14 rounded-sm"
          initialsClassName="text-xl"
        />
      )}
      <div className={cn("flex flex-1 flex-col", portrait ? "mt-5" : "mt-4")}>
        <h3 className="font-display text-[1.5rem] font-medium leading-tight">{doctor.full_name}</h3>
        <p className="mt-1.5 font-semibold text-brand-700">{doctor.specialization}</p>
        <p className="text-sm text-ink-500">{doctor.qualification}</p>

        <dl className="mt-4 space-y-2 border-t border-sand-200 pt-4 text-sm">
          <div className="flex gap-3">
            <dt className="w-[4.75rem] shrink-0 text-ink-500">Experience</dt>
            <dd className="text-ink-900">{doctor.experience_years} years</dd>
          </div>
          {doctor.languages.length > 0 ? (
            <div className="flex gap-3">
              <dt className="w-[4.75rem] shrink-0 text-ink-500">Speaks</dt>
              <dd className="text-ink-900">{doctor.languages.join(", ")}</dd>
            </div>
          ) : null}
          <div className="flex gap-3">
            <dt className="w-[4.75rem] shrink-0 text-ink-500">In clinic</dt>
            <dd className="text-ink-900">
              {doctor.availability.length === 0
                ? "Timings coming soon"
                : doctor.availability.map((line) => (
                    <span key={`${line.days}-${line.hours}`} className="block">
                      <span className="font-semibold">{line.days}</span>{" "}
                      <span className="whitespace-nowrap tabular-nums">{line.hours}</span>
                    </span>
                  ))}
            </dd>
          </div>
        </dl>

        {detailed && doctor.bio ? (
          <p className="mt-4 text-[0.9375rem] text-ink-700">{doctor.bio}</p>
        ) : null}

        <div className="mt-auto pt-5">
          <Link
            href={`/book?doctor=${doctor.slug}`}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xs font-semibold text-brand-700 hover:text-brand-800"
          >
            Book with {shortName(doctor.full_name)}
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </Link>
        </div>
      </div>
    </article>
  );
}
