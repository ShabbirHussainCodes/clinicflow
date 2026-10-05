import { ArrowRight, CalendarCheck, HeartPulse, ShieldCheck, Sparkles, Users } from "lucide-react";
import Link from "next/link";

import { HeroArt } from "@/components/illustrations/hero-art";
import { DoctorCard } from "@/components/public/doctor-card";
import { HowItWorks } from "@/components/public/how-it-works";
import { LocationSection } from "@/components/public/location-section";
import { ServiceCard } from "@/components/public/service-card";
import { TESTIMONIALS } from "@/components/public/testimonials";
import { ButtonLink } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/card";
import { getCatalog } from "@/lib/data/catalog";
import { getNextAvailable } from "@/lib/data/next-slots";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [catalog, nextAvailable] = await Promise.all([getCatalog(), getNextAvailable()]);
  const { clinic, services, doctors, openDaysPerWeek } = catalog;

  const combinedYears = doctors.reduce((total, doctor) => total + doctor.experience_years, 0);

  const trust = [
    { icon: Users, value: String(doctors.length), label: "Doctors in clinic" },
    { icon: HeartPulse, value: `${combinedYears}+`, label: "Years of combined experience" },
    { icon: Sparkles, value: String(services.length), label: "Care services" },
    { icon: CalendarCheck, value: `${openDaysPerWeek} days`, label: "Open every week" },
  ];

  return (
    <>
      {/* Hero */}
      <section aria-labelledby="hero-heading" className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-40 -top-40 size-[34rem] rounded-full bg-teal-50"
        />
        <div className="container-page relative grid items-center gap-12 pb-16 pt-12 sm:pt-16 lg:grid-cols-[1.1fr_0.9fr] lg:gap-8 lg:pb-24 lg:pt-20">
          <div className="animate-fade-up">
            <p className="eyebrow mb-5 flex items-center gap-2">
              <ShieldCheck className="size-4" aria-hidden="true" />
              {clinic.name} · {clinic.city}
            </p>
            <h1
              id="hero-heading"
              className="text-[2.6rem] leading-[1.05] sm:text-6xl lg:text-[4.25rem]"
            >
              Care that listens,
              <span className="block text-teal-600">close to home.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-700 sm:text-xl">
              Book a visit with our doctors in about a minute. Choose a service, pick a time that
              suits you, and get your booking reference straight away. No phone call needed.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <ButtonLink
                href="/book"
                size="lg"
                icon={<CalendarCheck className="size-5" aria-hidden="true" />}
              >
                Book an appointment
              </ButtonLink>
              <ButtonLink href="/services" variant="secondary" size="lg">
                Explore services
              </ButtonLink>
            </div>
            <p className="mt-5 text-sm text-ink-500">
              No account needed. We only ask for your name and mobile number.
            </p>
          </div>

          <div className="animate-fade-up [animation-delay:120ms]">
            <HeroArt next={nextAvailable} />
          </div>
        </div>

        {/* Trust indicators */}
        <div className="container-page relative pb-4">
          <ul
            aria-label="Clinic highlights"
            className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-sand-200 bg-sand-200 shadow-card lg:grid-cols-4"
          >
            {trust.map((item) => (
              <li key={item.label} className="flex items-center gap-4 bg-surface p-5 sm:p-6">
                <span className="hidden size-11 shrink-0 items-center justify-center rounded-md bg-teal-50 text-teal-700 sm:flex">
                  <item.icon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <p className="font-display text-3xl font-semibold leading-none text-ink-900">
                    {item.value}
                  </p>
                  <p className="mt-1.5 text-sm leading-snug text-ink-500">{item.label}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Services */}
      <section aria-labelledby="services-heading" className="container-page py-20 sm:py-24">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading
            id="services-heading"
            eyebrow="Our services"
            title="Everyday care for every age"
            description="From a quick follow-up to a full preventive check, book exactly what you need."
          />
          <Link
            href="/services"
            className="inline-flex items-center gap-1.5 self-start rounded-xs font-semibold text-teal-700 hover:text-teal-800 sm:self-auto"
          >
            All services <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {services.slice(0, 6).map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              doctors={catalog.doctorsForService(service.id)}
            />
          ))}
        </div>
      </section>

      <div className="bg-sand-50">
        <HowItWorks />
      </div>

      {/* Doctors */}
      <section aria-labelledby="doctors-heading" className="container-page py-20 sm:py-24">
        <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <SectionHeading
            id="doctors-heading"
            eyebrow="Meet the doctors"
            title="Experienced, approachable, unhurried"
            description="Every doctor at the clinic takes the time to listen and explain."
          />
          <Link
            href="/doctors"
            className="inline-flex items-center gap-1.5 self-start rounded-xs font-semibold text-teal-700 hover:text-teal-800 sm:self-auto"
          >
            Full profiles <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {doctors.map((doctor) => (
            <DoctorCard key={doctor.id} doctor={doctor} />
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section aria-labelledby="voices-heading" className="bg-sand-50 py-20 sm:py-24">
        <div className="container-page">
          <SectionHeading
            id="voices-heading"
            eyebrow="Patient voices"
            title="What families say"
            description="Sample testimonials written for this demonstration. They are fictional."
          />
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {TESTIMONIALS.map((item) => (
              <figure
                key={item.name}
                className="flex flex-col rounded-lg border border-sand-200 bg-surface p-7 shadow-card"
              >
                <span
                  aria-hidden="true"
                  className="font-display text-6xl leading-none text-clay-500"
                >
                  “
                </span>
                <blockquote className="-mt-3 flex-1 text-[1.0625rem] leading-relaxed text-ink-900">
                  {item.quote}
                </blockquote>
                <figcaption className="mt-6 border-t border-sand-100 pt-4 text-sm">
                  <span className="font-semibold text-ink-900">{item.name}</span>
                  <span className="text-ink-500"> · {item.context}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <LocationSection catalog={catalog} />

      {/* Closing call to action */}
      <section aria-labelledby="cta-heading" className="container-page -mb-8 pt-20">
        <div className="relative overflow-hidden rounded-lg bg-teal-700 px-6 py-12 text-center sm:px-12 sm:py-16">
          <div
            aria-hidden="true"
            className="absolute -left-10 -top-10 size-48 rounded-full bg-teal-600/50"
          />
          <div
            aria-hidden="true"
            className="absolute -bottom-16 -right-8 size-56 rounded-full bg-teal-800/60"
          />
          <div className="relative">
            <h2 id="cta-heading" className="text-3xl text-paper sm:text-4xl">
              Ready when you are.
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-lg text-teal-50">
              Find a time that works and book it in under a minute.
            </p>
            <ButtonLink
              href="/book"
              size="lg"
              variant="secondary"
              className="mt-8"
              icon={<CalendarCheck className="size-5" aria-hidden="true" />}
            >
              Book an appointment
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
