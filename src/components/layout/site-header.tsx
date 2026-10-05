"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Phone, X } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export interface NavItem {
  href: string;
  label: string;
}

export function SiteHeader({
  brand,
  clinicName,
  phone,
  phoneHref,
  nav,
}: {
  /** The clinic's logo or name, rendered on the server. */
  brand: ReactNode;
  clinicName: string;
  phone: string;
  phoneHref: string;
  nav: NavItem[];
}) {
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
    <header className="sticky top-0 z-40 border-b border-sand-200 bg-paper/95 backdrop-blur-sm supports-[backdrop-filter]:bg-paper/90">
      <div className="container-page flex h-16 items-center justify-between gap-6 sm:h-[4.5rem]">
        <Link href="/" className="rounded-sm" aria-label={`${clinicName}, home page`}>
          {brand}
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-8 lg:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isCurrent(item.href) ? "page" : undefined}
              className={cn(
                "border-b-2 py-1.5 text-[0.9375rem] font-medium transition-colors hover:text-ink-900",
                isCurrent(item.href)
                  ? "border-brand-700 text-ink-900"
                  : "border-transparent text-ink-700 hover:border-sand-300",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
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
        <nav aria-label="Mobile" className="container-page flex flex-col py-2">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isCurrent(item.href) ? "page" : undefined}
              className="border-b border-sand-100 px-1 py-3.5 font-display text-xl text-ink-900"
            >
              {item.label}
            </Link>
          ))}
          <div className="flex flex-col gap-3 py-5">
            <ButtonLink href="/book" size="lg">
              Book appointment
            </ButtonLink>
            <a
              href={phoneHref}
              className="flex min-h-12 items-center justify-center gap-2 rounded-sm border border-sand-300 text-base font-semibold tabular-nums text-ink-900"
            >
              <Phone className="size-4" aria-hidden="true" /> Call {phone}
            </a>
          </div>
        </nav>
      </div>
    </header>
  );
}
