import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Clock, Mail, Phone, ShieldCheck, Stethoscope, UserRound } from "lucide-react";

import { AppointmentActions } from "@/components/admin/appointment-actions";
import { NotesForm } from "@/components/admin/notes-form";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { requireAdmin } from "@/lib/auth";
import { getAppointmentDetail, getClinicSettings } from "@/lib/admin/queries";
import { addDays, formatDateLong, formatDateTime, formatTimeRange, todayInZone } from "@/lib/datetime";
import { STATUS_LABELS, type AppointmentStatus } from "@/lib/validation/admin";
import { AGE_RANGE_LABELS, formatIndianMobile, type AgeRange } from "@/lib/validation/booking";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Appointment" };

function historyLabel(item: { event: string; from_status: string | null; to_status: string | null; metadata: Record<string, unknown> }, timeZone: string): string {
  if (item.event === "created") return "Booking created";
  if (item.event === "note_updated") return "Internal notes updated";
  if (item.event === "rescheduled") {
    const from = typeof item.metadata.from_start_at === "string" ? formatDateTime(item.metadata.from_start_at, timeZone) : "";
    const to = typeof item.metadata.to_start_at === "string" ? formatDateTime(item.metadata.to_start_at, timeZone) : "";
    return from && to ? `Rescheduled from ${from} to ${to}` : "Rescheduled";
  }
  const to = item.to_status as AppointmentStatus | null;
  return to ? `Status changed to ${STATUS_LABELS[to]}` : "Status changed";
}

export default async function AppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [appointment, clinic] = await Promise.all([getAppointmentDetail(id), getClinicSettings()]);
  if (!appointment) notFound();

  const tz = clinic.timezone;
  const today = todayInZone(tz);
  const hasStarted = Date.parse(appointment.start_at) <= Date.now();

  return (
    <>
      <Link href="/admin/appointments" className="mb-5 inline-flex items-center gap-1.5 rounded-xs text-sm font-semibold text-ink-700 hover:text-ink-900">
        <ArrowLeft className="size-4" aria-hidden="true" /> All appointments
      </Link>

      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl" data-testid="detail-patient">{appointment.patient_name}</h1>
          <p className="mt-2 font-mono text-sm text-ink-500" data-testid="detail-reference">{appointment.reference}</p>
        </div>
        <StatusBadge status={appointment.status} className="self-start text-sm" />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <Card className="p-6">
            <h2 className="font-sans text-xl font-semibold tracking-normal">Appointment</h2>
            <dl className="mt-4 grid gap-5 sm:grid-cols-2">
              <div className="flex gap-3">
                <CalendarDays className="mt-0.5 size-5 shrink-0 text-teal-600" aria-hidden="true" />
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-ink-500">Date</dt>
                  <dd className="font-semibold" data-testid="detail-date">{formatDateLong(appointment.start_at, tz)}</dd>
                </div>
              </div>
              <div className="flex gap-3">
                <Clock className="mt-0.5 size-5 shrink-0 text-teal-600" aria-hidden="true" />
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-ink-500">Time</dt>
                  <dd className="font-semibold" data-testid="detail-time">{formatTimeRange(appointment.start_at, appointment.end_at, tz)}</dd>
                </div>
              </div>
              <div className="flex gap-3">
                <UserRound className="mt-0.5 size-5 shrink-0 text-teal-600" aria-hidden="true" />
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-ink-500">Doctor</dt>
                  <dd className="font-semibold">{appointment.doctor.full_name}</dd>
                  <dd className="text-sm text-ink-500">{appointment.doctor.specialization}</dd>
                </div>
              </div>
              <div className="flex gap-3">
                <Stethoscope className="mt-0.5 size-5 shrink-0 text-teal-600" aria-hidden="true" />
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-ink-500">Service</dt>
                  <dd className="font-semibold">{appointment.service.name}</dd>
                  <dd className="text-sm text-ink-500">About {appointment.service.duration_minutes} minutes</dd>
                </div>
              </div>
            </dl>
            {appointment.cancellation_reason ? (
              <p className="mt-5 rounded-md bg-danger-50 p-3 text-sm text-ink-900">
                <span className="font-semibold">Cancellation reason:</span> {appointment.cancellation_reason}
              </p>
            ) : null}
          </Card>

          <Card className="p-6">
            <h2 className="font-sans text-xl font-semibold tracking-normal">Patient</h2>
            <dl className="mt-4 grid gap-5 sm:grid-cols-2">
              <div className="flex gap-3">
                <Phone className="mt-0.5 size-5 shrink-0 text-teal-600" aria-hidden="true" />
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wider text-ink-500">Mobile</dt>
                  <dd>
                    <a className="font-semibold text-teal-800 underline-offset-2 hover:underline" href={`tel:${appointment.patient_phone}`}>
                      {formatIndianMobile(appointment.patient_phone)}
                    </a>
                  </dd>
                </div>
              </div>
              <div className="flex gap-3">
                <Mail className="mt-0.5 size-5 shrink-0 text-teal-600" aria-hidden="true" />
                <div className="min-w-0">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-ink-500">Email</dt>
                  <dd className="break-all">
                    {appointment.patient_email ? (
                      <a className="font-semibold text-teal-800 underline-offset-2 hover:underline" href={`mailto:${appointment.patient_email}`}>
                        {appointment.patient_email}
                      </a>
                    ) : (
                      <span className="text-ink-500">Not provided</span>
                    )}
                  </dd>
                </div>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-ink-500">Age range</dt>
                <dd>{appointment.age_range ? AGE_RANGE_LABELS[appointment.age_range as AgeRange] ?? appointment.age_range : <span className="text-ink-500">Not provided</span>}</dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wider text-ink-500">Booked</dt>
                <dd>{formatDateTime(appointment.created_at, tz)} <span className="text-ink-500">· {appointment.source === "web" ? "online" : "by staff"}</span></dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wider text-ink-500">Reason for visit</dt>
                <dd className="whitespace-pre-wrap break-words">{appointment.visit_reason ?? <span className="text-ink-500">Not provided</span>}</dd>
              </div>
            </dl>
            <p className="mt-5 flex items-start gap-2 rounded-md bg-teal-50 p-3 text-sm text-teal-900">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-teal-600" aria-hidden="true" />
              Patient consented to be contacted about this appointment on {formatDateTime(appointment.consent_at, tz)}.
            </p>
          </Card>

          <Card className="p-6">
            <h2 className="font-sans text-xl font-semibold tracking-normal">History</h2>
            <ol className="mt-5 space-y-5 border-l-2 border-sand-200 pl-6">
              {appointment.history.map((item) => (
                <li key={item.id} className="relative">
                  <span className="absolute -left-[1.9rem] top-1.5 size-3 rounded-full border-2 border-surface bg-teal-600 ring-2 ring-teal-100" aria-hidden="true" />
                  <p className="font-semibold text-ink-900">{historyLabel(item, tz)}</p>
                  <p className="text-sm text-ink-500">
                    {formatDateTime(item.created_at, tz)} · {item.by_staff ? "by staff" : "by patient or system"}
                  </p>
                  {item.note ? <p className="mt-1 text-sm text-ink-700">“{item.note}”</p> : null}
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-6 lg:sticky lg:top-8">
          <Card className="p-6">
            <h2 className="mb-4 font-sans text-xl font-semibold tracking-normal">Actions</h2>
            <AppointmentActions
              appointmentId={appointment.id}
              status={appointment.status}
              hasStarted={hasStarted}
              timeZone={tz}
              today={today}
              lastDate={addDays(today, clinic.booking_window_days)}
              patientName={appointment.patient_name}
            />
          </Card>
          <Card className="p-6">
            <NotesForm appointmentId={appointment.id} initialNotes={appointment.admin_notes ?? ""} />
          </Card>
        </div>
      </div>
    </>
  );
}
