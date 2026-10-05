import { MapPin, Phone } from "lucide-react";

import { cn } from "@/lib/cn";
import type { OpenStatus } from "@/lib/open-status";

/**
 * The thin strip above the header that real clinic sites carry: are they open, where are they, how
 * do I call. Hidden on small screens, where the sticky action bar at the bottom covers calling.
 */
export function UtilityBar({
  status,
  address,
  phone,
  phoneHref,
}: {
  status: OpenStatus | null;
  address: string;
  phone: string;
  phoneHref: string;
}) {
  return (
    <div className="hidden border-b border-sand-200 bg-sand-50 text-[0.8125rem] text-ink-700 lg:block">
      <div className="container-page flex h-9 items-center justify-between gap-6">
        {status ? (
          <p className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={cn("size-2 rounded-full", status.isOpen ? "bg-sage-500" : "bg-ink-400")}
            />
            <span className="font-semibold text-ink-900">{status.label}</span>
            <span>&middot; {status.detail}</span>
          </p>
        ) : (
          <span />
        )}
        <p className="flex items-center gap-5">
          <span className="flex items-center gap-1.5">
            <MapPin className="size-3.5 text-brand-600" aria-hidden="true" />
            {address}
          </span>
          <a
            href={phoneHref}
            className="flex items-center gap-1.5 font-semibold tabular-nums text-ink-900 hover:text-brand-700"
          >
            <Phone className="size-3.5 text-brand-600" aria-hidden="true" />
            {phone}
          </a>
        </p>
      </div>
    </div>
  );
}
