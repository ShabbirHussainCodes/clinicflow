import type { Metadata } from "next";
import Link from "next/link";

import { BlockedPanel } from "@/components/admin/blocked-panel";
import { BreaksPanel } from "@/components/admin/breaks-panel";
import { PageHeader } from "@/components/admin/page-header";
import { ScheduleEditor } from "@/components/admin/schedule-editor";
import { Card } from "@/components/ui/card";
import { Alert } from "@/components/ui/feedback";
import { requireAdmin } from "@/lib/auth";
import { getClinicSettings, getFilterOptions, getScheduleData } from "@/lib/admin/queries";
import { todayInZone } from "@/lib/datetime";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Schedule" };

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const requested = Array.isArray(params.doctor) ? params.doctor[0] : params.doctor;

  const [{ doctors }, clinic] = await Promise.all([getFilterOptions(), getClinicSettings()]);
  const selectedId = doctors.find((doctor) => doctor.id === requested)?.id ?? doctors[0]?.id;
  const schedule = selectedId ? await getScheduleData(selectedId) : null;
  const today = todayInZone(clinic.timezone);

  if (!schedule) {
    return (
      <>
        <PageHeader title="Schedule" />
        <Alert tone="info" title="No doctors yet">
          Add doctors to the database to manage their schedules.
        </Alert>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Schedule"
        description="Working hours, breaks and closures decide which times patients can book. Changes apply to new bookings immediately; existing appointments are never changed automatically."
      />

      <nav aria-label="Choose a doctor" className="mb-6 flex flex-wrap gap-2">
        {doctors.map((doctor) => {
          const active = doctor.id === schedule.doctor.id;
          return (
            <Link
              key={doctor.id}
              href={`/admin/schedule?doctor=${doctor.id}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                active
                  ? "border-teal-700 bg-teal-700 text-white"
                  : "border-sand-300 bg-surface text-ink-700 hover:border-teal-600 hover:bg-teal-50",
              )}
            >
              {doctor.full_name}
              {!doctor.is_active ? " (inactive)" : ""}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-6">
        <Card className="p-5 sm:p-7">
          <h2 className="font-sans text-xl font-semibold tracking-normal">Weekly working hours</h2>
          <p className="mb-5 mt-1 text-sm text-ink-500">
            {schedule.doctor.full_name} · {schedule.doctor.specialization} · times in{" "}
            {clinic.timezone}
          </p>
          <ScheduleEditor
            key={`${schedule.doctor.id}-${schedule.doctor.slot_minutes}-${schedule.windows.map((w) => w.id).join(",")}`}
            doctorId={schedule.doctor.id}
            doctorName={schedule.doctor.full_name}
            initialSlotMinutes={schedule.doctor.slot_minutes}
            initialWindows={schedule.windows}
          />
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="p-5 sm:p-7">
            <h2 className="font-sans text-xl font-semibold tracking-normal">Breaks</h2>
            <p className="mb-5 mt-1 text-sm text-ink-500">
              Recurring time off inside working hours, such as lunch.
            </p>
            <BreaksPanel doctorId={schedule.doctor.id} breaks={schedule.breaks} />
          </Card>

          <Card className="p-5 sm:p-7">
            <h2 className="font-sans text-xl font-semibold tracking-normal">
              Holidays &amp; unavailable dates
            </h2>
            <p className="mb-5 mt-1 text-sm text-ink-500">
              Block whole days so patients cannot book them.
            </p>
            <BlockedPanel
              doctorId={schedule.doctor.id}
              doctorName={schedule.doctor.full_name}
              blocks={schedule.blocked}
              today={today}
            />
          </Card>
        </div>
      </div>
    </>
  );
}
