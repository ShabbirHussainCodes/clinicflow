import Image from "next/image";
import { CalendarCheck, Phone } from "lucide-react";

import { AvailabilityPanel } from "@/components/public/availability-panel";
import { ButtonLink, buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { DoctorNextAvailable } from "@/lib/data/next-slots";

/**
 * The top of the home page. Without a photo it is a headline beside the live booking times. When
 * the clinic adds `public/clinic/hero.jpg` the photo takes that place and the times run across the
 * page beneath it.
 */
export function Hero({
  eyebrow,
  headline,
  lede,
  phone,
  phoneHref,
  availability,
  image,
}: {
  eyebrow: string;
  headline: string;
  lede: string;
  phone: string;
  phoneHref: string;
  availability: DoctorNextAvailable[];
  image: string | null;
}) {
  return (
    <section aria-labelledby="hero-heading" className="border-b border-sand-200">
      <div
        className={cn(
          "container-page grid gap-10 pb-12 pt-10 sm:pb-16 sm:pt-14 lg:gap-16 lg:pb-20 lg:pt-20",
          image
            ? "lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch"
            : "lg:grid-cols-[minmax(0,1fr)_27rem] lg:items-start",
        )}
      >
        <div className="animate-fade-up">
          <p className="eyebrow eyebrow-rule">{eyebrow}</p>
          <h1
            id="hero-heading"
            className="mt-6 text-[2.375rem] leading-[1.08] sm:text-5xl lg:text-[3.5rem]"
          >
            {headline}
          </h1>
          {lede ? (
            <p className="mt-6 max-w-[34rem] text-[1.1875rem] leading-relaxed text-ink-700">
              {lede}
            </p>
          ) : null}
          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <ButtonLink
              href="/book"
              size="lg"
              icon={<CalendarCheck className="size-5" aria-hidden="true" />}
            >
              Book an appointment
            </ButtonLink>
            <a
              href={phoneHref}
              className={buttonClasses({
                variant: "secondary",
                size: "lg",
                // Phones and tablets already have the Call button pinned to the bottom of the screen.
                className: "max-lg:hidden",
              })}
            >
              <Phone className="size-4" aria-hidden="true" />
              <span className="tabular-nums">Call {phone}</span>
            </a>
          </div>
          <p className="mt-5 text-sm text-ink-500">
            No account needed. We only ask for your name and mobile number.
          </p>
        </div>

        {image ? (
          <div className="relative min-h-72 overflow-hidden rounded-md bg-sand-100 sm:min-h-96">
            <Image
              src={image}
              alt=""
              fill
              preload
              sizes="(min-width: 1024px) 45vw, 100vw"
              className="object-cover"
            />
          </div>
        ) : (
          <AvailabilityPanel items={availability} />
        )}
      </div>
      {image ? <AvailabilityPanel items={availability} layout="strip" /> : null}
    </section>
  );
}
