import Image from "next/image";

import { monogramOf, splitClinicName } from "@/lib/brand-text";
import { cn } from "@/lib/cn";
import { clinicLogo } from "@/lib/public-images";

/**
 * The clinic's own identity: its logo when `public/brand/logo.*` exists, otherwise a monogram and
 * the clinic name set in type. On dark backgrounds (`tone="light"`) it uses `logo-light.*` if present.
 */
export function ClinicBrand({
  name,
  tone = "dark",
  className,
}: {
  name: string;
  tone?: "dark" | "light";
  className?: string;
}) {
  const logo = clinicLogo(tone === "light" ? "logo-light" : "logo");
  if (logo) {
    return (
      <span className={cn("relative block h-10 w-44 sm:h-11 sm:w-52", className)}>
        <Image
          src={logo}
          alt={name}
          fill
          unoptimized
          sizes="208px"
          className="object-contain object-left"
        />
      </span>
    );
  }

  const { primary, descriptor } = splitClinicName(name);
  const light = tone === "light";
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "flex size-10 shrink-0 items-center justify-center rounded-sm font-display text-[1.5rem] font-semibold leading-none",
          light ? "bg-paper text-brand-800" : "bg-brand-700 text-paper",
        )}
      >
        {monogramOf(name)}
      </span>
      <span className="flex min-w-0 flex-col">
        <span
          className={cn(
            "truncate font-display text-[1.3125rem] font-semibold leading-[1.05] tracking-tight",
            light ? "text-paper" : "text-ink-900",
          )}
        >
          {primary}
        </span>
        {descriptor ? (
          <span
            className={cn(
              "mt-1 truncate text-[0.6875rem] font-semibold uppercase leading-none tracking-[0.18em]",
              light ? "text-brand-200" : "text-ink-500",
            )}
          >
            {descriptor}
          </span>
        ) : null}
      </span>
    </span>
  );
}
