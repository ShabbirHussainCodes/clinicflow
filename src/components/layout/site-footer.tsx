import Link from "next/link";
import { Mail, MapPin, MessageCircle, Phone } from "lucide-react";

import { ClinicBrand } from "@/components/brand/clinic-brand";
import { siteContent } from "@/config/site";
import { formatClinicAddress, type Clinic } from "@/lib/data/catalog";
import { nowMs } from "@/lib/datetime";
import type { OpenStatus } from "@/lib/open-status";
import { telHref } from "@/lib/site-text";

const linkClass = "rounded-xs underline-offset-4 hover:text-white hover:underline";

export function SiteFooter({ clinic, status }: { clinic: Clinic; status: OpenStatus | null }) {
  const address = formatClinicAddress(clinic);
  const year = new Date(nowMs()).getFullYear();

  return (
    <footer className="bg-brand-900 pb-20 text-brand-100 lg:pb-0">
      <div className="container-page grid gap-12 py-16 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1.3fr]">
        <div className="max-w-sm space-y-5">
          <ClinicBrand name={clinic.name} tone="light" />
          {clinic.description ? (
            <p className="text-[0.9375rem] leading-relaxed text-brand-100/85">
              {clinic.description}
            </p>
          ) : null}
          {status ? (
            <p className="text-sm">
              <span className="font-semibold text-white">{status.label}</span>{" "}
              <span className="text-brand-100/85">{status.detail}</span>
            </p>
          ) : null}
        </div>

        <nav aria-label="Footer" className="space-y-4">
          <p className="eyebrow !text-brand-200">Explore</p>
          <ul className="space-y-2.5 text-[0.9375rem]">
            <li>
              <Link className={linkClass} href="/services">
                Services
              </Link>
            </li>
            <li>
              <Link className={linkClass} href="/doctors">
                Our doctors
              </Link>
            </li>
            <li>
              <Link className={linkClass} href="/book">
                Book an appointment
              </Link>
            </li>
            <li>
              <Link className={linkClass} href="/#contact">
                Location and hours
              </Link>
            </li>
          </ul>
        </nav>

        <div className="space-y-4">
          <p className="eyebrow !text-brand-200">Visit and contact</p>
          <address className="space-y-3 text-[0.9375rem] not-italic">
            <p className="flex gap-3">
              <MapPin className="mt-1 size-4 shrink-0 text-brand-200" aria-hidden="true" />
              <span>
                {address.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </span>
            </p>
            <p className="flex gap-3">
              <Phone className="mt-1 size-4 shrink-0 text-brand-200" aria-hidden="true" />
              <a className={`${linkClass} tabular-nums`} href={telHref(clinic.phone)}>
                {clinic.phone}
              </a>
            </p>
            {siteContent.whatsapp ? (
              <p className="flex gap-3">
                <MessageCircle className="mt-1 size-4 shrink-0 text-brand-200" aria-hidden="true" />
                <a
                  className={linkClass}
                  href={`https://wa.me/${siteContent.whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp us
                </a>
              </p>
            ) : null}
            <p className="flex gap-3">
              <Mail className="mt-1 size-4 shrink-0 text-brand-200" aria-hidden="true" />
              <a className={`${linkClass} break-all`} href={`mailto:${clinic.email}`}>
                {clinic.email}
              </a>
            </p>
          </address>
          {siteContent.social.length > 0 ? (
            <ul className="flex flex-wrap gap-x-5 gap-y-2 pt-1 text-[0.9375rem]">
              {siteContent.social.map((item) => (
                <li key={item.href}>
                  <a
                    className={linkClass}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>

      <div className="border-t border-brand-800">
        <div className="container-page space-y-4 py-6 text-[0.8125rem] leading-relaxed text-brand-100/80">
          <p className="max-w-3xl">
            Online booking is for planned visits only. In an emergency, call your local emergency
            number or go to the nearest hospital.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>
              &copy; {year} {clinic.name}
              {siteContent.registration ? <> &middot; {siteContent.registration}</> : null}
              {siteContent.credit ? <> &middot; {siteContent.credit}</> : null}
            </p>
            <p className="flex gap-5">
              <Link className={linkClass} href="/privacy">
                Privacy notice
              </Link>
              <Link className={linkClass} href="/admin/login">
                Staff sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
