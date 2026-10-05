import { CalendarDays, Clock, Stethoscope, UserRound } from "lucide-react";

import { formatCalendarDate, formatTime } from "@/lib/datetime";

import type { WizardClinic, WizardDoctor, WizardService } from "./types";

export function SummaryCard({
  clinic,
  service,
  doctor,
  date,
  slotStart,
}: {
  clinic: WizardClinic;
  service: WizardService | undefined;
  doctor: WizardDoctor | undefined;
  date: string | null;
  slotStart: string | null;
}) {
  const rows = [
    {
      icon: Stethoscope,
      label: "Service",
      value: service?.name,
      extra: service ? `${service.durationMinutes} min` : undefined,
    },
    { icon: UserRound, label: "Doctor", value: doctor?.name, extra: doctor?.specialization },
    {
      icon: CalendarDays,
      label: "Date",
      value: date ? formatCalendarDate(date, "long") : undefined,
    },
    {
      icon: Clock,
      label: "Time",
      value: slotStart ? formatTime(slotStart, clinic.timezone) : undefined,
    },
  ];
  return (
    <aside
      aria-label="Your appointment so far"
      className="rounded-lg border border-sand-200 bg-surface p-5 shadow-card"
      data-testid="booking-summary"
    >
      <h2 className="font-sans text-base font-semibold tracking-normal">Your appointment</h2>
      <p className="text-sm text-ink-500">{clinic.name}</p>
      <dl className="mt-4 space-y-3.5">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-500">
              <row.icon className="size-4 shrink-0 text-brand-600" aria-hidden="true" />
              {row.label}
            </dt>
            <dd
              className={
                row.value ? "mt-0.5 pl-6 font-semibold text-ink-900" : "mt-0.5 pl-6 text-ink-500"
              }
            >
              {row.value ?? "Not chosen yet"}
              {row.value && row.extra ? (
                <span className="block text-sm font-normal text-ink-500">{row.extra}</span>
              ) : null}
            </dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
