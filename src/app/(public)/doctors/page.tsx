import type { Metadata } from "next";

import { DoctorCard } from "@/components/public/doctor-card";
import { getCatalog } from "@/lib/data/catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Our doctors",
  description: "Meet the doctors, their qualifications, experience and clinic timings.",
};

export default async function DoctorsPage() {
  const { doctors } = await getCatalog();

  return (
    <div className="container-page py-14 sm:py-20">
      <header className="max-w-2xl">
        <p className="eyebrow mb-3">Our doctors</p>
        <h1 className="text-4xl sm:text-5xl">People who take the time to listen</h1>
        <p className="mt-5 text-lg text-ink-700">
          Qualifications, experience and weekly timings for every doctor. The portraits on this
          demonstration site are original illustrations.
        </p>
      </header>

      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {doctors.map((doctor) => (
          <DoctorCard key={doctor.id} doctor={doctor} detailed />
        ))}
      </div>
    </div>
  );
}
