import { Pencil } from "lucide-react";

import { formatIndianMobile, AGE_RANGE_LABELS, type AgeRange } from "@/lib/validation/booking";
import { formatCalendarDate, formatTimeRange } from "@/lib/datetime";

import type { DetailsForm } from "./step-details";
import type { WizardClinic, WizardDoctor, WizardService, WizardStep } from "./types";

function Row({
  label,
  children,
  onEdit,
  editLabel,
}: {
  label: string;
  children: React.ReactNode;
  onEdit?: () => void;
  editLabel?: string;
}) {
  return (
    <div className="py-4">
      <dt className="text-xs font-semibold uppercase tracking-wider text-ink-500">{label}</dt>
      <dd className="mt-1 flex items-start justify-between gap-4">
        <span className="min-w-0 break-words font-semibold text-ink-900">{children}</span>
        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-xs px-1 py-1 text-sm font-semibold text-brand-700 hover:text-brand-800"
          >
            <Pencil className="size-3.5" aria-hidden="true" />
            Change<span className="sr-only"> {editLabel ?? label}</span>
          </button>
        ) : null}
      </dd>
    </div>
  );
}

export function StepReview({
  clinic,
  service,
  doctor,
  date,
  slot,
  details,
  normalizedMobile,
  onEdit,
}: {
  clinic: WizardClinic;
  service: WizardService;
  doctor: WizardDoctor;
  date: string;
  slot: { start: string; end: string };
  details: DetailsForm;
  normalizedMobile: string;
  onEdit: (step: WizardStep) => void;
}) {
  return (
    <div>
      <dl className="divide-y divide-sand-200 rounded-md border border-sand-200 bg-surface px-5">
        <Row label="Service" onEdit={() => onEdit("service")}>
          {service.name}
          <span className="block text-sm font-normal text-ink-500">
            About {service.durationMinutes} minutes
          </span>
        </Row>
        <Row label="Doctor" onEdit={() => onEdit("doctor")}>
          {doctor.name}
          <span className="block text-sm font-normal text-ink-500">{doctor.specialization}</span>
        </Row>
        <Row label="Date and time" onEdit={() => onEdit("datetime")} editLabel="date and time">
          {formatCalendarDate(date, "long")}
          <span className="block">{formatTimeRange(slot.start, slot.end, clinic.timezone)}</span>
          <span className="block text-sm font-normal text-ink-500">{clinic.timezoneLabel}</span>
        </Row>
        <Row label="Your details" onEdit={() => onEdit("details")} editLabel="your details">
          {details.fullName.trim()}
          <span className="block font-normal">{formatIndianMobile(normalizedMobile)}</span>
          {details.email.trim() ? (
            <span className="block font-normal">{details.email.trim()}</span>
          ) : null}
          {details.ageRange ? (
            <span className="block text-sm font-normal text-ink-500">
              Age range: {AGE_RANGE_LABELS[details.ageRange as AgeRange] ?? details.ageRange}
            </span>
          ) : null}
          {details.visitReason.trim() ? (
            <span className="block text-sm font-normal text-ink-500">
              Reason: {details.visitReason.trim()}
            </span>
          ) : null}
        </Row>
      </dl>
      <p className="mt-4 text-sm text-ink-500">
        Your booking starts as <strong className="font-semibold text-ink-700">pending</strong>. The
        clinic may call you to confirm. Please arrive about 10 minutes early.
      </p>
    </div>
  );
}
