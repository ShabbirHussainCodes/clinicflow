"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Phone, X } from "lucide-react";

import { Wordmark } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/doctors", label: "Doctors" },
  { href: "/#contact", label: "Contact" },
];

export function SiteHeader({ clinicName, phone }: { clinicName: string; phone: string }) {
  const pathname = usePathname();
  // The menu is "open for" the page it was opened on, so navigating closes it without an effect.
  const [openFor, setOpenFor] = useState<string | null>(null);
  const open = openFor === pathname;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenFor(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const isCurrent = (href: string) => {
    if (href.includes("#")) return false;
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-sand-200/80 bg-paper/95 backdrop-blur-sm supports-[backdrop-filter]:bg-paper/85">
      <div className="container-page flex h-16 items-center justify-between gap-4 sm:h-[4.5rem]">
        <Link href="/" className="rounded-sm" aria-label={`ClinicFlow, ${clinicName} home`}>
          <Wordmark />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 lg:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isCurrent(item.href) ? "page" : undefined}
              className={cn(
                "rounded-sm px-3.5 py-2 text-[0.9375rem] font-medium text-ink-700 transition-colors hover:bg-sand-100 hover:text-ink-900",
                isCurrent(item.href) && "bg-sand-100 text-ink-900",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <a
            href={`tel:${phone.replace(/\s/g, "")}`}
            className="hidden items-center gap-2 rounded-sm px-3 py-2 text-sm font-semibold text-ink-700 hover:bg-sand-100 xl:inline-flex"
          >
            <Phone className="size-4 text-teal-600" aria-hidden="true" />
            {phone}
          </a>
          <ButtonLink href="/book" size="md" className="max-sm:hidden">
            Book appointment
          </ButtonLink>
          <button
            type="button"
            className="flex size-11 items-center justify-center rounded-sm text-ink-900 hover:bg-sand-100 lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpenFor(open ? null : pathname)}
          >
            {open ? (
              <X className="size-6" aria-hidden="true" />
            ) : (
              <Menu className="size-6" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <div id="mobile-menu" hidden={!open} className="border-t border-sand-200 bg-paper lg:hidden">
        <nav aria-label="Mobile" className="container-page flex flex-col gap-1 py-4">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isCurrent(item.href) ? "page" : undefined}
              className="rounded-sm px-3 py-3 text-lg font-medium text-ink-900 hover:bg-sand-100"
            >
              {item.label}
            </Link>
          ))}
          <ButtonLink href="/book" size="lg" className="mt-3">
            Book appointment
          </ButtonLink>
          <a
            href={`tel:${phone.replace(/\s/g, "")}`}
            className="mt-1 flex items-center justify-center gap-2 rounded-sm px-3 py-3 text-base font-semibold text-teal-700"
          >
            <Phone className="size-4" aria-hidden="true" /> Call {phone}
          </a>
        </nav>
      </div>
    </header>
  );
}
