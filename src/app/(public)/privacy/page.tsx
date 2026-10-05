import type { Metadata } from "next";

import { getCatalog } from "@/lib/data/catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Privacy notice",
  description: "What information is collected when you book an appointment, and why.",
};

export default async function PrivacyPage() {
  const { clinic } = await getCatalog();
  return (
    <div className="container-page max-w-3xl py-14 sm:py-20">
      <p className="eyebrow mb-3">Privacy notice</p>
      <h1 className="text-4xl sm:text-5xl">How we handle your booking details</h1>
      <p className="mt-5 rounded-md border border-clay-100 bg-amber-50 p-4 text-sm text-ink-700">
        This is a sample notice supplied with the ClinicFlow demonstration. A clinic that goes live
        must have it reviewed against the privacy law that applies to it (in India, the Digital
        Personal Data Protection Act, 2023) before use.
      </p>

      <div className="mt-10 space-y-8 text-[1.0625rem] leading-relaxed text-ink-700 [&_h2]:mb-3 [&_h2]:font-sans [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:tracking-normal [&_h2]:text-ink-900 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-6">
        <section>
          <h2>What we collect</h2>
          <ul>
            <li>Your full name and mobile number, so the clinic can reach you about your appointment.</li>
            <li>Your email address, age range and a short visit reason, only if you choose to provide them.</li>
            <li>Your consent to be contacted about this appointment, and when you gave it.</li>
          </ul>
          <p className="mt-3">
            We do not ask for diagnoses, medical history, test results or identity documents. Please
            do not enter sensitive medical details in the visit reason field.
          </p>
        </section>
        <section>
          <h2>Why we collect it</h2>
          <p>
            To schedule your visit, to confirm, remind or reschedule it, and to let the clinic know who
            to expect. We do not use your details for advertising and we do not sell them.
          </p>
        </section>
        <section>
          <h2>Who can see it</h2>
          <p>
            Authorised clinic staff who sign in to the appointment dashboard. If the clinic enables
            automated reminders, your name, mobile number and email are passed to the messaging service
            the clinic has chosen, solely to send you appointment messages.
          </p>
        </section>
        <section>
          <h2>Your booking reference</h2>
          <p>
            Your booking reference is the only way to view your confirmation page. Keep it private:
            anyone who has it can see the date, doctor and service of your appointment (but not your
            full contact details).
          </p>
        </section>
        <section>
          <h2>Questions or requests</h2>
          <p>
            To correct or delete your details, contact the clinic at{" "}
            <a className="font-semibold text-teal-700 underline underline-offset-2" href={`mailto:${clinic.email}`}>
              {clinic.email}
            </a>{" "}
            or {clinic.phone}.
          </p>
        </section>
      </div>
    </div>
  );
}
