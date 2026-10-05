const TRAILING_DESCRIPTOR =
  /\s+((?:(?:Family|Dental|Child|Children's|Skin|Women's|Eye|ENT|Multispeciality|Multi-speciality|Speciality|Specialty|Polyclinic|Health|Wellness|Medical)\s+)*(?:Clinic|Clinics|Hospital|Polyclinic|Centre|Center|Healthcare|Nursing Home|Diagnostics))$/i;

/**
 * "Sanjeevani Family Clinic" -> { primary: "Sanjeevani", descriptor: "Family Clinic" }. A name that
 * does not end in a recognisable descriptor is shown on a single line.
 */
export function splitClinicName(name: string): { primary: string; descriptor: string | null } {
  const trimmed = name.trim();
  const match = TRAILING_DESCRIPTOR.exec(trimmed);
  if (!match || match.index === 0) return { primary: trimmed, descriptor: null };
  return { primary: trimmed.slice(0, match.index), descriptor: match[1] ?? null };
}

/** First letter of the clinic's name, ignoring titles such as "Dr.". */
export function monogramOf(name: string): string {
  const word = name
    .trim()
    .split(/\s+/)
    .find((part) => !/^(dr\.?|the)$/i.test(part));
  return (word ?? name).charAt(0).toUpperCase();
}

/** "Dr. Meera Iyer" -> "MI"; a single name gives one letter. */
export function initialsOf(fullName: string): string {
  const letters = fullName
    .replace(/^(dr\.?|prof\.?)\s+/i, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase());
  const first = letters[0] ?? "";
  const last = letters[letters.length - 1] ?? "";
  return letters.length > 1 ? first + last : first;
}
