import { ArrowRight } from "lucide-react";
import Link from "next/link";

import { AboutSection } from "@/components/public/about-section";
import { ClosingCta } from "@/components/public/closing-cta";
import { DoctorCard } from "@/components/public/doctor-card";
import { FactsRow } from "@/components/public/facts-row";
import { FaqSection } from "@/components/public/faq-section";
import { Hero } from "@/components/public/hero";
import { HowItWorks } from "@/components/public/how-it-works";
import { LocationSection } from "@/components/public/location-section";
import { ServicesList } from "@/components/public/services-list";
import { Testimonials } from "@/components/public/testimonials";
import { SectionHeading } from "@/components/ui/card";
import { siteContent } from "@/config/site";
import { getCatalog } from "@/lib/data/catalog";
import { getNextAvailability } from "@/lib/data/next-slots";
import { nowMs } from "@/lib/datetime";
import { clinicPhoto } from "@/lib/public-images";
import { fillText, localityOf, telHref } from "@/lib/site-text";

export const dynamic = "force-dynamic";

const textLink =
  "inline-flex items-center gap-1.5 self-start rounded-xs font-semibold text-brand-700 hover:text-brand-800 sm:self-auto";

export default async function HomePage() {
  const [catalog, availability] = await Promise.all([getCatalog(), getNextAvailability()]);
  const { clinic, services, doctors, openDaysPerWeek } = catalog;
  const text = (value: string) => fillText(value, clinic);
  const phoneHref = telHref(clinic.phone);

  const combinedYears = doctors.reduce((total, doctor) => total + doctor.experience_years, 0);
  const facts = [
    {
      value: String(doctors.length),
      label: doctors.length === 1 ? "Doctor in the clinic" : "Doctors in the clinic",
    },
    { value: String(combinedYears), label: "Years of combined experience" },
    { value: String(services.length), label: "Services you can book online" },
    { value: String(openDaysPerWeek), label: "Days open every week" },
  ];

  const { hero, about } = siteContent;
  const locality = localityOf(clinic);
  const eyebrow = [
    siteContent.establishedYear ? `Est. ${siteContent.establishedYear}` : null,
    locality === clinic.city ? clinic.city : `${locality}, ${clinic.city}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      <Hero
        eyebrow={eyebrow}
        headline={text(hero.headline ?? clinic.tagline ?? clinic.name)}
        lede={text(hero.subheadline ?? clinic.description ?? "")}
        phone={clinic.phone}
        phoneHref={phoneHref}
        availability={availability}
        image={clinicPhoto("hero")}
      />
      <div className="border-b border-sand-200">
        <FactsRow facts={facts} />
      </div>

      <section aria-labelledby="services-heading" className="py-16 sm:py-20 lg:py-24">
        <div className="container-page grid gap-10 lg:grid-cols-[18rem_1fr] lg:gap-16">
          <div className="self-start lg:sticky lg:top-28">
            <SectionHeading
              id="services-heading"
              eyebrow="Services"
              title="Care for the whole family"
              description="Choose what you need and book it online. Each service has its own appointment length."
            />
            <Link href="/services" className={`${textLink} mt-6`}>
              All services <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <ServicesList services={services.slice(0, 6)} />
        </div>
      </section>

      <HowItWorks />

      <section aria-labelledby="doctors-heading" className="py-16 sm:py-20 lg:py-24">
        <div className="container-page">
          <div className="flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
            <SectionHeading
              id="doctors-heading"
              eyebrow="Our doctors"
              title="Meet the doctors"
              description="Qualifications, languages and weekly timings. Choose any doctor to book with them."
            />
            <Link href="/doctors" className={textLink}>
              Full profiles <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-12 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {doctors.map((doctor) => (
              <DoctorCard
                key={doctor.id}
                doctor={doctor}
                portrait={doctors.some((d) => d.photoUrl)}
              />
            ))}
          </div>
        </div>
      </section>

      {about ? (
        <AboutSection
          heading={text(about.heading)}
          paragraphs={about.paragraphs.map(text)}
          facilities={about.facilities}
          image={clinicPhoto("about")}
        />
      ) : null}

      {siteContent.testimonials.length > 0 ? (
        <Testimonials items={siteContent.testimonials} note={siteContent.testimonialsNote} />
      ) : null}

      {siteContent.faqs.length > 0 ? (
        <FaqSection
          items={siteContent.faqs.map((faq) => ({ ...faq, answer: text(faq.answer) }))}
          phone={clinic.phone}
        />
      ) : null}

      <LocationSection catalog={catalog} now={new Date(nowMs())} />

      <ClosingCta
        heading={text(siteContent.cta.heading)}
        text={text(siteContent.cta.text)}
        phone={clinic.phone}
        phoneHref={phoneHref}
      />
    </>
  );
}
