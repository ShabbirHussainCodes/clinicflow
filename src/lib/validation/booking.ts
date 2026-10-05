import { z } from "zod";

import { isIsoDate } from "@/lib/datetime";

export const AGE_RANGES = ["0-12", "13-17", "18-30", "31-45", "46-60", "61+"] as const;
export type AgeRange = (typeof AGE_RANGES)[number];

export const AGE_RANGE_LABELS: Record<AgeRange, string> = {
  "0-12": "0 – 12 years",
  "13-17": "13 – 17 years",
  "18-30": "18 – 30 years",
  "31-45": "31 – 45 years",
  "46-60": "46 – 60 years",
  "61+": "61 years or older",
};

export const VISIT_REASON_MAX = 300;

/**
 * Normalises an Indian mobile number to E.164 (+91XXXXXXXXXX).
 * Accepts spaces, dashes and brackets, with or without +91 / 91 / 0 prefix.
 * Returns null when the number is not a plausible Indian mobile number.
 */
export function normalizeIndianMobile(input: string): string | null {
  const stripped = input.replace(/[\s\-().]/g, "");
  let digits: string;
  if (/^\+91\d{10}$/.test(stripped)) digits = stripped.slice(3);
  else if (/^91\d{10}$/.test(stripped)) digits = stripped.slice(2);
  else if (/^0\d{10}$/.test(stripped)) digits = stripped.slice(1);
  else if (/^\d{10}$/.test(stripped)) digits = stripped;
  else return null;

  // Indian mobile numbers start with 6, 7, 8 or 9.
  if (!/^[6-9]/.test(digits)) return null;
  // Reject obviously fake repeated-digit numbers such as 9999999999.
  if (/^(\d)\1{9}$/.test(digits)) return null;
  return `+91${digits}`;
}

/** "+919876543210" -> "+91 98765 43210" */
export function formatIndianMobile(e164: string): string {
  const match = /^\+91(\d{5})(\d{5})$/.exec(e164);
  return match ? `+91 ${match[1]} ${match[2]}` : e164;
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

const CONTROL_CHARS = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;

export const patientNameSchema = z
  .string({ error: "Please enter your full name." })
  .transform(collapseWhitespace)
  .pipe(
    z
      .string()
      .min(2, "Please enter your full name (at least 2 characters).")
      .max(100, "Name must be 100 characters or fewer.")
      .regex(
        /^[\p{L}\p{M}][\p{L}\p{M}\s.'’-]*$/u,
        "Name can contain letters, spaces, hyphens, apostrophes and full stops only.",
      ),
  );

export const mobileSchema = z
  .string({ error: "Please enter your mobile number." })
  .trim()
  .min(1, "Please enter your mobile number.")
  .transform((value, ctx) => {
    const normalized = normalizeIndianMobile(value);
    if (!normalized) {
      ctx.issues.push({
        code: "custom",
        message: "Enter a valid 10-digit Indian mobile number, for example 98765 43210.",
        input: value,
      });
      return z.NEVER;
    }
    return normalized;
  });

export const optionalEmailSchema = z
  .string()
  .trim()
  .max(254, "Email address is too long.")
  .transform((value) => (value === "" ? undefined : value.toLowerCase()))
  .pipe(z.email("Enter a valid email address, or leave this blank.").optional());

export const optionalAgeRangeSchema = z
  .string()
  .transform((value) => (value === "" ? undefined : value))
  .pipe(z.enum(AGE_RANGES, { error: "Choose an age range from the list." }).optional());

export const optionalVisitReasonSchema = z
  .string()
  .transform((value) => collapseWhitespace(value.replace(CONTROL_CHARS, "")))
  .transform((value) => (value === "" ? undefined : value))
  .pipe(
    z
      .string()
      .max(VISIT_REASON_MAX, `Please keep this under ${VISIT_REASON_MAX} characters.`)
      .optional(),
  );

/** Fields the patient types in on the "Your details" step. */
export const patientDetailsSchema = z.object({
  fullName: patientNameSchema,
  mobile: mobileSchema,
  email: optionalEmailSchema,
  ageRange: optionalAgeRangeSchema,
  visitReason: optionalVisitReasonSchema,
  consent: z.literal(true, {
    error: "Please confirm that the clinic may contact you about this appointment.",
  }),
});

export type PatientDetailsInput = z.input<typeof patientDetailsSchema>;
export type PatientDetails = z.output<typeof patientDetailsSchema>;

const uuidSchema = z.uuid({ error: "Invalid selection." });

export const slotSelectionSchema = z.object({
  doctorId: uuidSchema,
  serviceId: uuidSchema,
  startAt: z.iso.datetime({ offset: true, error: "Invalid time slot." }),
});

/** Everything the server action receives when the patient confirms. */
export const bookingSubmissionSchema = slotSelectionSchema.extend({
  details: patientDetailsSchema,
  /** Honeypot: real users never see or fill this field. */
  website: z.string().max(0).optional().default(""),
  /** Milliseconds between the booking page opening and submission (bot heuristic). */
  elapsedMs: z.number().int().nonnegative().max(86_400_000),
});

export const MIN_HUMAN_ELAPSED_MS = 3_000;

export const slotsQuerySchema = z.object({
  doctorId: uuidSchema,
  serviceId: uuidSchema,
  date: z.string().refine(isIsoDate, "Invalid date."),
});

export const datesQuerySchema = z.object({
  doctorId: uuidSchema,
  serviceId: uuidSchema,
  from: z.string().refine(isIsoDate, "Invalid date."),
  to: z.string().refine(isIsoDate, "Invalid date."),
});

export type FieldErrors = Record<string, string>;

/** Collapses Zod issues to one message per field path (first message wins). */
export function toFieldErrors(error: z.ZodError, prefix = ""): FieldErrors {
  const errors: FieldErrors = {};
  for (const issue of error.issues) {
    const path = issue.path.map(String);
    const key = (prefix && path[0] === prefix ? path.slice(1) : path).join(".") || "form";
    errors[key] ??= issue.message;
  }
  return errors;
}

export const BOOKING_REFERENCE_RE = /^CF-[A-HJ-NP-Z2-9]{5}-[A-HJ-NP-Z2-9]{5}$/;

export function normalizeReference(input: string): string | null {
  const candidate = input.trim().toUpperCase();
  return BOOKING_REFERENCE_RE.test(candidate) ? candidate : null;
}
