import Image from "next/image";

import { initialsOf } from "@/lib/brand-text";
import { cn } from "@/lib/cn";

/** The doctor's colour from the database (`avatar_theme`), used only for the initials tile. */
const TONES: Record<string, string> = {
  teal: "bg-brand-100 text-brand-800",
  green: "bg-sage-100 text-sage-700",
  sand: "bg-sand-100 text-ink-700",
  clay: "bg-clay-100 text-clay-700",
};

/**
 * A doctor's portrait: their photograph from `public/doctors/<slug>.*` when there is one, otherwise
 * a quiet tile with their initials. Portraits are 4:5 so a mix of photos and tiles lines up.
 */
export function DoctorPortrait({
  name,
  photoUrl,
  tone,
  sizes,
  shape = "portrait",
  className,
  initialsClassName,
}: {
  name: string;
  photoUrl: string | null;
  tone: string;
  sizes: string;
  shape?: "portrait" | "square";
  className?: string;
  initialsClassName?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md",
        shape === "portrait" ? "aspect-[4/5]" : "aspect-square",
        photoUrl ? "bg-sand-100" : (TONES[tone] ?? TONES.teal),
        className,
      )}
    >
      {photoUrl ? (
        <Image
          src={photoUrl}
          alt={`Portrait of ${name}`}
          fill
          sizes={sizes}
          className="object-cover object-top"
        />
      ) : (
        <span
          aria-hidden="true"
          className={cn(
            "absolute inset-0 flex items-center justify-center font-display text-6xl font-medium tracking-wide",
            initialsClassName,
          )}
        >
          {initialsOf(name)}
        </span>
      )}
    </div>
  );
}
