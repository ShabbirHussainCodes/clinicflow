import type { Metadata } from "next";

import { ServiceCard } from "@/components/public/service-card";
import { ButtonLink } from "@/components/ui/button";
import { getCatalog } from "@/lib/data/catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Services",
  description: "Everyday and preventive care services, with duration and doctors for each.",
};

export default async function ServicesPage() {
  const catalog = await getCatalog();

  return (
    <div className="container-page py-14 sm:py-20">
      <header className="max-w-2xl">
        <p className="eyebrow mb-3">Services</p>
        <h1 className="text-4xl sm:text-5xl">Care for every stage of family life</h1>
        <p className="mt-5 text-lg text-ink-700">
          Each visit is booked for the time it actually needs. Choose a service to see which doctors
          offer it and book straight away.
        </p>
      </header>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {catalog.services.map((service) => (
          <ServiceCard
            key={service.id}
            service={service}
            doctors={catalog.doctorsForService(service.id)}
            showDoctors
          />
        ))}
      </div>

      <div className="mt-14 flex flex-col items-start justify-between gap-5 rounded-lg bg-teal-50 p-7 sm:flex-row sm:items-center">
        <div>
          <h2 className="font-sans text-xl font-semibold tracking-normal">Not sure which service to choose?</h2>
          <p className="mt-1 text-ink-700">
            Pick General Consultation and the doctor will guide you from there.
          </p>
        </div>
        <ButtonLink href="/book?service=general-consultation">Book a general consultation</ButtonLink>
      </div>
    </div>
  );
}
