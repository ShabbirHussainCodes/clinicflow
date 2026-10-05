import { z } from "zod";

import { isIsoDate } from "@/lib/datetime";

export const APPOINTMENT_STATUSES = [
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No show",
};

/**
 * Mirrors app_private.is_allowed_transition in the database (which is the authority).
 * The UI uses this only to decide which buttons to show.
 */
export const ALLOWED_TRANSITIONS: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  pending: ["confirmed", "cancelled", "completed", "no_show"],
  confirmed: ["cancelled", "completed", "no_show"],
  completed: [],
  cancelled: [],
  no_show: [],
};

/** Transitions that the database only permits once the appointment time has started. */
export const REQUIRES_STARTED: readonly AppointmentStatus[] = ["completed", "no_show"];

export function canTransition(from: AppointmentStatus, to: AppointmentStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

const uuid = z.uuid({ error: "Invalid identifier." });

export const loginSchema = z.object({
  email: z
    .string({ error: "Enter your email address." })
    .trim()
    .toLowerCase()
    .pipe(z.email("Enter a valid email address.")),
  password: z
    .string({ error: "Enter your password." })
    .min(1, "Enter your password.")
    .max(200, "Password is too long."),
});

export const statusChangeSchema = z.object({
  appointmentId: uuid,
  status: z.enum(APPOINTMENT_STATUSES),
  note: z
    .string()
    .trim()
    .max(300, "Please keep the note under 300 characters.")
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export const rescheduleSchema = z.object({
  appointmentId: uuid,
  startAt: z.iso.datetime({ offset: true, error: "Choose a time slot." }),
  note: z
    .string()
    .trim()
    .max(300)
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export const notesSchema = z.object({
  appointmentId: uuid,
  notes: z.string().trim().max(1000, "Please keep notes under 1000 characters."),
});

const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use the format HH:MM (24-hour).");

function minutes(value: string): number {
  const [h = "0", m = "0"] = value.split(":");
  return Number(h) * 60 + Number(m);
}

export const SLOT_MINUTE_OPTIONS = [5, 10, 15, 20, 25, 30, 40, 45, 60, 90, 120] as const;

export const scheduleWindowSchema = z
  .object({
    weekday: z.number().int().min(0).max(6),
    start: clock,
    end: clock,
  })
  .refine((window) => minutes(window.end) > minutes(window.start), {
    message: "End time must be after start time.",
    path: ["end"],
  });

export const scheduleSchema = z
  .object({
    doctorId: uuid,
    slotMinutes: z
      .number()
      .int()
      .min(5, "Slots must be at least 5 minutes.")
      .max(120, "Slots can be at most 120 minutes.")
      .refine((value) => value % 5 === 0, "Slot length must be a multiple of 5 minutes."),
    windows: z.array(scheduleWindowSchema).max(40),
  })
  .superRefine((schedule, ctx) => {
    // No two windows on the same weekday may overlap.
    const byDay = new Map<number, { start: number; end: number; index: number }[]>();
    schedule.windows.forEach((window, index) => {
      const list = byDay.get(window.weekday) ?? [];
      list.push({ start: minutes(window.start), end: minutes(window.end), index });
      byDay.set(window.weekday, list);
    });
    for (const list of byDay.values()) {
      list.sort((a, b) => a.start - b.start);
      for (let i = 1; i < list.length; i += 1) {
        const previous = list[i - 1];
        const current = list[i];
        if (previous && current && current.start < previous.end) {
          ctx.addIssue({
            code: "custom",
            message: "Working hours on the same day must not overlap.",
            path: ["windows", current.index, "start"],
          });
        }
      }
    }
  });

export const breakSchema = z
  .object({
    doctorId: uuid,
    weekday: z.union([z.literal("all"), z.coerce.number().int().min(0).max(6)]),
    start: clock,
    end: clock,
    label: z
      .string()
      .trim()
      .min(1, "Give the break a short name.")
      .max(80, "Please keep the name under 80 characters."),
  })
  .refine((value) => minutes(value.end) > minutes(value.start), {
    message: "End time must be after start time.",
    path: ["end"],
  });

export const blockedDateSchema = z
  .object({
    doctorId: z.union([z.literal("clinic"), uuid]),
    startDate: z.string().refine(isIsoDate, "Choose a start date."),
    endDate: z.string().refine(isIsoDate, "Choose an end date."),
    kind: z.enum(["holiday", "unavailable"]),
    reason: z.string().trim().max(200, "Please keep the reason under 200 characters."),
  })
  .refine((value) => value.endDate >= value.startDate, {
    message: "End date cannot be before the start date.",
    path: ["endDate"],
  })
  .refine(
    (value) => {
      const days =
        (Date.parse(`${value.endDate}T00:00:00Z`) - Date.parse(`${value.startDate}T00:00:00Z`)) /
        86_400_000;
      return days <= 366;
    },
    { message: "A block can cover at most one year.", path: ["endDate"] },
  );

export const APPOINTMENT_SORTS = ["start_asc", "start_desc", "created_desc"] as const;
export type AppointmentSort = (typeof APPOINTMENT_SORTS)[number];

export const PAGE_SIZE = 20;

export interface AppointmentFilters {
  q: string;
  status: AppointmentStatus | "";
  doctor: string;
  service: string;
  from: string;
  to: string;
  sort: AppointmentSort;
  page: number;
}

type RawParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** Lenient parser: invalid URL values fall back to defaults instead of throwing. */
export function parseAppointmentFilters(params: RawParams): AppointmentFilters {
  const status = first(params.status);
  const sort = first(params.sort);
  const doctor = first(params.doctor);
  const service = first(params.service);
  const from = first(params.from);
  const to = first(params.to);
  const page = Number.parseInt(first(params.page), 10);
  return {
    q: first(params.q).trim().slice(0, 100),
    status: (APPOINTMENT_STATUSES as readonly string[]).includes(status)
      ? (status as AppointmentStatus)
      : "",
    doctor: z.uuid().safeParse(doctor).success ? doctor : "",
    service: z.uuid().safeParse(service).success ? service : "",
    from: isIsoDate(from) ? from : "",
    to: isIsoDate(to) ? to : "",
    sort: (APPOINTMENT_SORTS as readonly string[]).includes(sort)
      ? (sort as AppointmentSort)
      : "start_asc",
    page: Number.isFinite(page) && page > 0 ? Math.min(page, 10_000) : 1,
  };
}
