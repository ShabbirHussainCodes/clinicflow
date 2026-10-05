import type { Metadata } from "next";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { getCatalog } from "@/lib/data/catalog";
import { getEnv } from "@/lib/env";

export async function generateMetadata(): Promise<Metadata> {
  const { clinic } = await getCatalog();
  return {
    title: { default: `${clinic.name} | Book an appointment`, template: `%s | ${clinic.name}` },
    description: clinic.description ?? undefined,
    openGraph: { title: clinic.name, description: clinic.tagline ?? undefined },
  };
}

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const { clinic } = await getCatalog();
  const showDemoNotice = getEnv().SHOW_DEMO_NOTICE;

  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-sm bg-teal-700 px-4 py-2 font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to main content
      </a>
      {showDemoNotice ? (
        <div className="bg-teal-900 px-4 py-2 text-center text-xs text-teal-100 sm:text-sm">
          Demonstration site: {clinic.name} is a fictional clinic. No real appointments are made.
        </div>
      ) : null}
      <SiteHeader clinicName={clinic.name} phone={clinic.phone} />
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <SiteFooter clinic={clinic} />
    </>
  );
}
