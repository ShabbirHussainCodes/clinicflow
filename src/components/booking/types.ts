import type { SummaryLine } from "@/lib/availability-summary";

export interface WizardService {
  id: string;
  slug: string;
  name: string;
  description: string;
  durationMinutes: number;
  icon: string;
}

export interface WizardDoctor {
  id: string;
  slug: string;
  name: string;
  qualification: string;
  specialization: string;
  experienceYears: number;
  /** Colour name for the initials tile when the doctor has no photo. */
  tone: string;
  photoUrl: string | null;
  serviceIds: string[];
  availability: SummaryLine[];
}

export interface WizardClinic {
  name: string;
  phone: string;
  timezone: string;
  timezoneLabel: string;
  /** Today's calendar date in the clinic timezone (YYYY-MM-DD). */
  today: string;
  /** Last bookable calendar date (YYYY-MM-DD). */
  lastDate: string;
}

export type WizardStep = "service" | "doctor" | "datetime" | "details" | "review";

export const STEP_ORDER: readonly WizardStep[] = [
  "service",
  "doctor",
  "datetime",
  "details",
  "review",
];

export const STEP_LABELS: Record<WizardStep, string> = {
  service: "Service",
  doctor: "Doctor",
  datetime: "Date & time",
  details: "Your details",
  review: "Review",
};

export interface SlotDto {
  start: string;
  end: string;
}
