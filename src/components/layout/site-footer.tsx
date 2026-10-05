import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";

import { Wordmark } from "@/components/brand/logo";
import { formatClinicAddress, type Clinic } from "@/lib/data/catalog";

export function SiteFooter({ clinic }: { clinic: Clinic }) {
  const address = formatClinicAddress(clinic);
  return (
    <footer className="mt-24 bg-teal-900 text-teal-100">
      <div className="container-page grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div className="space-y-4">
          <Wordmark tone="light" />
          <p className="max-w-xs text-sm leading-relaxed text-teal-100/85">
            Online booking for {clinic.name}. Choose a doctor, pick a time, and get a booking
            reference in under a minute.
          </p>
        </div>

        <nav aria-label="Footer: explore" className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wider text-sage-300">Explore</p>
          <ul className="space-y-2 text-[0.9375rem]">
            <li>
              <Link className="hover:text-white hover:underline" href="/services">
                Services
              </Link>
            </li>
            <li>
              <Link className="hover:text-white hover:underline" href="/doctors">
                Our doctors
              </Link>
            </li>
            <li>
              <Link className="hover:text-white hover:underline" href="/book">
                Book an appointment
              </Link>
            </li>
            <li>
              <Link className="hover:text-white hover:underline" href="/#contact">
                Location &amp; hours
              </Link>
            </li>
          </ul>
        </nav>

        <nav aria-label="Footer: information" className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wider text-sage-300">
            Information
          </p>
          <ul className="space-y-2 text-[0.9375rem]">
            <li>
              <Link className="hover:text-white hover:underline" href="/privacy">
                Privacy notice
              </Link>
            </li>
            <li>
              <Link className="hover:text-white hover:underline" href="/admin/login">
                Staff sign in
              </Link>
            </li>
          </ul>
        </nav>

        <div className="space-y-3">
          <p className="text-sm font-semibold uppercase tracking-wider text-sage-300">Visit us</p>
          <address className="space-y-2.5 text-[0.9375rem] not-italic">
            <p className="flex gap-2.5">
              <MapPin className="mt-1 size-4 shrink-0 text-sage-300" aria-hidden="true" />
              <span>
                {address.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </span>
            </p>
            <p className="flex gap-2.5">
              <Phone className="mt-1 size-4 shrink-0 text-sage-300" aria-hidden="true" />
              <a
                className="hover:text-white hover:underline"
                href={`tel:${clinic.phone.replace(/\s/g, "")}`}
              >
                {clinic.phone}
              </a>
            </p>
            <p className="flex gap-2.5">
              <Mail className="mt-1 size-4 shrink-0 text-sage-300" aria-hidden="true" />
              <a
                className="break-all hover:text-white hover:underline"
                href={`mailto:${clinic.email}`}
              >
                {clinic.email}
              </a>
            </p>
          </address>
        </div>
      </div>

      <div className="border-t border-teal-800">
        <div className="container-page flex flex-col gap-2 py-5 text-sm text-teal-100/80 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {clinic.name}. Appointments powered by ClinicFlow.
          </p>
          <p>
            Online booking is for scheduling only. For emergencies, call your local emergency number
            or go to the nearest hospital.
          </p>
        </div>
      </div>
    </footer>
  );
}
