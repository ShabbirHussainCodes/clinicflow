import { siteContent } from "@/config/site";

interface ClinicText {
  name: string;
  city: string;
  address_line2: string | null;
  phone: string;
  email: string;
}

/** The neighbourhood: the second address line when there is one, otherwise the city. */
export function localityOf(clinic: Pick<ClinicText, "address_line2" | "city">): string {
  return clinic.address_line2?.trim() || clinic.city;
}

/**
 * Fills {clinic}, {city}, {locality}, {phone}, {email} and {year} in text from `src/config/site.ts`.
 * Unknown placeholders are left as written so a typo is visible on the page instead of vanishing.
 */
export function fillText(
  text: string,
  clinic: ClinicText,
  establishedYear: number | null = siteContent.establishedYear,
): string {
  const values: Record<string, string | undefined> = {
    clinic: clinic.name,
    city: clinic.city,
    locality: localityOf(clinic),
    // Non-breaking spaces keep a phone number on one line when the sentence wraps.
    phone: clinic.phone.replace(/ /g, "\u00a0"),
    email: clinic.email,
    year: establishedYear === null ? undefined : String(establishedYear),
  };
  return text.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

/** `+91 90000 00142` -> `tel:+919000000142` */
export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}
