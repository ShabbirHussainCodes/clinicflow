import { CircleCheck, Clock } from "lucide-react";
import Link from "next/link";

import { DoctorFigure } from "@/components/illustrations/doctor-avatar";
import type { NextAvailable } from "@/lib/data/next-slots";

/**
 * Hero artwork: three overlapping arches (the clinic's architectural motif) holding a doctor, a
 * plant and the morning sun. Drawn entirely in SVG so it never depends on a remote image. The
 * floating cards are decorative illustrations of the booking experience.
 */
export function HeroArt({ next }: { next: NextAvailable | null }) {
  return (
    <div className="relative mx-auto w-full max-w-[30rem]">
      <svg
        viewBox="0 0 480 540"
        className="block h-auto w-full"
        focusable="false"
        aria-hidden="true"
      >
        {/* left arch with plant */}
        <path d="M6 540V210a82 82 0 0 1 164 0v330Z" fill="#dcebd7" />
        <path d="M22 540V214a66 66 0 0 1 132 0v326Z" fill="#a6cda0" opacity="0.4" />
        <g transform="translate(88 392)">
          <path d="M-8 -6c-30-18-44-50-34-86 24 8 40 34 34 86Z" fill="#5e9a6a" />
          <path d="M2 -6c4-44 24-72 54-88 14 36-6 66-54 88Z" fill="#2f6b3f" />
          <path d="M-2 -6c-8-52 4-88 24-118 22 34 14 82-24 118Z" fill="#5e9a6a" />
          <path d="M-34 148-42 62h84l-8 86Z" fill="#c8743a" />
          <rect x="-46" y="52" width="92" height="16" rx="8" fill="#9a4a1c" />
        </g>

        {/* centre arch with doctor */}
        <path d="M120 540V220a140 140 0 0 1 280 0v320Z" fill="#0b5753" />
        <path d="M140 540V222a120 120 0 0 1 240 0v318Z" fill="#0f6b66" opacity="0.7" />
        <g transform="translate(150 218) scale(1.1)">
          <DoctorFigure theme="teal" />
        </g>

        {/* right arch with sun */}
        <path d="M352 540V360a60 60 0 0 1 120 0v180Z" fill="#f6ddca" />
        <circle cx="412" cy="392" r="22" fill="#c8743a" />
        <circle
          cx="412"
          cy="392"
          r="34"
          fill="none"
          stroke="#c8743a"
          strokeOpacity="0.35"
          strokeWidth="2"
        />

        {/* ground */}
        <rect x="0" y="526" width="480" height="14" rx="7" fill="#e1d9cb" />
      </svg>

      {/* floating cards */}
      <div className="absolute -left-2 top-10 w-48 rounded-md border border-sand-200 bg-surface p-3 shadow-raised sm:-left-6">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-500">
          <Clock className="size-3.5" aria-hidden="true" />
          {next ? `Next available · ${next.dayLabel}` : "Pick a time"}
        </p>
        {next ? (
          <>
            <p className="mt-0.5 truncate text-xs text-ink-500">{next.doctorName}</p>
            <ul className="mt-2 grid grid-cols-2 gap-1.5 text-center text-xs font-semibold">
              {next.slots.map((slot) => (
                <li key={slot.start}>
                  <Link
                    href={`/book?${new URLSearchParams({
                      service: next.serviceSlug,
                      doctor: next.doctorSlug,
                      date: next.date,
                      time: slot.start,
                    }).toString()}`}
                    className="block min-h-10 rounded-xs bg-teal-50 py-2 text-teal-700 transition-colors hover:bg-teal-700 hover:text-white"
                    aria-label={`Book ${slot.label} ${next.dayLabel} with ${next.doctorName}`}
                  >
                    {slot.label}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <Link
            href="/book"
            className="mt-2 block rounded-xs bg-teal-700 py-2 text-center text-xs font-semibold text-white hover:bg-teal-800"
          >
            Book an appointment
          </Link>
        )}
      </div>

      <div
        aria-hidden="true"
        className="absolute -right-1 bottom-24 rounded-md border border-sand-200 bg-surface p-3 pr-4 shadow-raised sm:-right-4"
      >
        <p className="flex items-center gap-1.5 text-xs font-semibold text-sage-700">
          <CircleCheck className="size-4" aria-hidden="true" /> Booking confirmed
        </p>
        <p className="mt-1 font-mono text-sm font-semibold tracking-wide text-ink-900">
          CF-7K4MP-9QXD2
        </p>
      </div>
    </div>
  );
}
