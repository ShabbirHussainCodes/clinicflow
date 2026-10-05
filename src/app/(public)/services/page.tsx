import type { Metadata } from "next";

import { PageHeader } from "@/components/public/page-header";
import { ServicesList } from "@/components/public/services-list";
import { ButtonLink } from "@/components/ui/button";
import { getCatalog } from "@/lib/data/catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Everyday and preventive care services, with the length of each visit and the doctors who offer it.",
};

export default async function ServicesPage() {
  const catalog = await getCatalog();

  return (
    <>
      <PageHeader
        eyebrow="Services"
        title="Care for every stage of family life"
        description="Each visit is booked for the time it actually needs. Choose a service to see which doctors offer it and book straight away."
      />

      <div className="container-page py-14 sm:py-20">
        <ServicesList
          services={catalog.services}
          doctorsForService={catalog.doctorsForService}
          showDoctors
        />

        <div className="mt-14 flex flex-col items-start justify-between gap-5 border-l-2 border-brand-700 bg-sand-50 p-6 sm:flex-row sm:items-center sm:p-8">
          <div>
            <h2 className="font-sans text-xl font-semibold tracking-normal">
              Not sure which service to choose?
            </h2>
            <p className="mt-1 text-ink-700">
              Choose General Consultation and the doctor will guide you from there.
            </p>
          </div>
          <ButtonLink href="/book?service=general-consultation">
            Book a general consultation
          </ButtonLink>
        </div>
      </div>
    </>
  );
}
