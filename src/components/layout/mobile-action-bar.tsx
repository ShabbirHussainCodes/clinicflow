"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Phone } from "lucide-react";

import { buttonClasses } from "@/components/ui/button";

/**
 * Two big buttons pinned to the bottom of phone screens: the two things a patient came to do.
 * Not shown during booking itself, where the form has its own controls.
 */
export function MobileActionBar({ phoneHref }: { phoneHref: string }) {
  const pathname = usePathname();
  if (pathname.startsWith("/book")) return null;

  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-30 border-t border-sand-200 bg-paper/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-sm lg:hidden">
      <div className="mx-auto flex max-w-xl gap-3">
        <a
          href={phoneHref}
          className={buttonClasses({ variant: "secondary", size: "lg", className: "flex-1" })}
        >
          <Phone className="size-4" aria-hidden="true" /> Call
        </a>
        <Link href="/book" className={buttonClasses({ size: "lg", className: "flex-[1.7]" })}>
          Book appointment
        </Link>
      </div>
    </div>
  );
}
