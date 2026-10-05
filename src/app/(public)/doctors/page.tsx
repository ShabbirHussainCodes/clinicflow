import type { Metadata } from "next";

import { DoctorCard } from "@/components/public/doctor-card";
import { PageHeader } from "@/components/public/page-header";
import { getCatalog } from "@/lib/data/catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Our doctors",
  description: "Meet the doctors, their qualifications, experience and clinic timings.",
};

export default async function DoctorsPage() {
  const { doctors } = await getCatalog();

  return (
    <>
      <PageHeader
        eyebrow="Our doctors"
        title="The doctors at the clinic"
        description="Qualifications, languages and weekly timings for every doctor. Choose a doctor to see their next free time."
      />
      <div className="container-page py-14 sm:py-20">
        <div className="grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
          {doctors.map((doctor) => (
            <DoctorCard
              key={doctor.id}
              doctor={doctor}
              detailed
              portrait={doctors.some((d) => d.photoUrl)}
            />
          ))}
        </div>
      </div>
    </>
  );
}
