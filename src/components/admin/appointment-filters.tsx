import Link from "next/link";
import { Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/fields";
import type { AdminDoctor, AdminService } from "@/lib/admin/queries";
import { addDays } from "@/lib/datetime";
import {
  APPOINTMENT_STATUSES,
  STATUS_LABELS,
  type AppointmentFilters,
} from "@/lib/validation/admin";

/**
 * A plain GET form: filters live in the URL, so views can be bookmarked, shared with colleagues
 * and navigated with the browser's back button, and the page works without client-side JavaScript.
 */
export function AppointmentFiltersForm({
  filters,
  doctors,
  services,
  today,
}: {
  filters: AppointmentFilters;
  doctors: AdminDoctor[];
  services: AdminService[];
  today: string;
}) {
  const quick = [
    { label: "Today", from: today, to: today },
    { label: "Tomorrow", from: addDays(today, 1), to: addDays(today, 1) },
    { label: "Next 7 days", from: today, to: addDays(today, 7) },
  ];
  const hasFilters = Boolean(
    filters.q || filters.status || filters.doctor || filters.service || filters.from || filters.to,
  );

  return (
    <form
      method="get"
      action="/admin/appointments"
      className="rounded-lg border border-sand-200 bg-surface p-4 shadow-card sm:p-5"
      role="search"
      aria-label="Filter appointments"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TextField
          label="Search"
          name="q"
          type="search"
          defaultValue={filters.q}
          placeholder="Name, phone or booking reference"
          wrapperClassName="sm:col-span-2"
          autoComplete="off"
        />
        <SelectField label="Status" name="status" defaultValue={filters.status}>
          <option value="">All statuses</option>
          {APPOINTMENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </SelectField>
        <SelectField label="Sort by" name="sort" defaultValue={filters.sort}>
          <option value="start_asc">Appointment time (earliest first)</option>
          <option value="start_desc">Appointment time (latest first)</option>
          <option value="created_desc">Recently booked</option>
        </SelectField>
        <SelectField label="Doctor" name="doctor" defaultValue={filters.doctor}>
          <option value="">All doctors</option>
          {doctors.map((doctor) => (
            <option key={doctor.id} value={doctor.id}>
              {doctor.full_name}
            </option>
          ))}
        </SelectField>
        <SelectField label="Service" name="service" defaultValue={filters.service}>
          <option value="">All services</option>
          {services.map((service) => (
            <option key={service.id} value={service.id}>
              {service.name}
            </option>
          ))}
        </SelectField>
        <TextField label="From date" name="from" type="date" defaultValue={filters.from} />
        <TextField label="To date" name="to" type="date" defaultValue={filters.to} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="submit" icon={<Search className="size-4" aria-hidden="true" />}>
          Apply filters
        </Button>
        {hasFilters ? (
          <Link
            href="/admin/appointments"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-sm px-3 text-sm font-semibold text-ink-700 hover:bg-sand-100"
          >
            <X className="size-4" aria-hidden="true" /> Clear
          </Link>
        ) : null}
        <span className="mx-1 hidden h-6 w-px bg-sand-200 sm:block" aria-hidden="true" />
        <p className="text-sm text-ink-500">Quick range:</p>
        {quick.map((item) => (
          <Link
            key={item.label}
            href={`/admin/appointments?from=${item.from}&to=${item.to}`}
            className="rounded-full border border-sand-300 px-3.5 py-1.5 text-sm font-semibold text-ink-700 hover:border-teal-600 hover:bg-teal-50 hover:text-teal-800"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </form>
  );
}
