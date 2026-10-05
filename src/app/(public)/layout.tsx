import type { Metadata } from "next";

import { ClinicBrand } from "@/components/brand/clinic-brand";
import { MobileActionBar } from "@/components/layout/mobile-action-bar";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader, type NavItem } from "@/components/layout/site-header";
import { UtilityBar } from "@/components/layout/utility-bar";
import { siteContent } from "@/config/site";
import { formatClinicAddress, getCatalog } from "@/lib/data/catalog";
import { nowMs } from "@/lib/datetime";
import { getEnv } from "@/lib/env";
import { getOpenStatus } from "@/lib/open-status";
import { telHref } from "@/lib/site-text";

export async function generateMetadata(): Promise<Metadata> {
  const { clinic } = await getCatalog();
  return {
    title: { default: `${clinic.name} | Book an appointment`, template: `%s | ${clinic.name}` },
    description: clinic.description ?? undefined,
    applicationName: clinic.name,
    openGraph: {
      title: clinic.name,
      description: clinic.tagline ?? clinic.description ?? undefined,
      siteName: clinic.name,
    },
  };
}

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const catalog = await getCatalog();
  const { clinic } = catalog;
  const showDemoNotice = getEnv().SHOW_DEMO_NOTICE;

  const status = getOpenStatus({
    rows: catalog.hoursByDay,
    closures: catalog.holidays,
    timeZone: clinic.timezone,
    now: new Date(nowMs()),
  });
  const phoneHref = telHref(clinic.phone);
  const addressLines = formatClinicAddress(clinic);
  const nav: NavItem[] = [
    { href: "/services", label: "Services" },
    { href: "/doctors", label: "Doctors" },
    ...(siteContent.about ? [{ href: "/#about", label: "About" }] : []),
    { href: "/#contact", label: "Contact" },
  ];

  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-sm bg-brand-700 px-4 py-2 font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to main content
      </a>
      {showDemoNotice ? (
        <div className="bg-brand-900 px-4 py-2 text-center text-xs text-brand-100 sm:text-[0.8125rem]">
          Demonstration site: {clinic.name} is a fictional clinic. No real appointments are made.
        </div>
      ) : null}
      <UtilityBar
        status={status}
        address={`${addressLines[0] ?? ""}, ${clinic.city}`}
        phone={clinic.phone}
        phoneHref={phoneHref}
      />
      <SiteHeader
        brand={<ClinicBrand name={clinic.name} />}
        clinicName={clinic.name}
        phone={clinic.phone}
        phoneHref={phoneHref}
        nav={nav}
      />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <SiteFooter clinic={clinic} status={status} />
      <MobileActionBar phoneHref={phoneHref} />
    </>
  );
}
