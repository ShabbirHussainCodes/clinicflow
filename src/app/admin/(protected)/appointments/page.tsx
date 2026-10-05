import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";

import { AppointmentFiltersForm } from "@/components/admin/appointment-filters";
import { AppointmentsTable } from "@/components/admin/appointments-table";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/ui/feedback";
import { requireAdmin } from "@/lib/auth";
import { getClinicSettings, getFilterOptions, searchAppointments, searchFromFilters } from "@/lib/admin/queries";
import { todayInZone } from "@/lib/datetime";
import { PAGE_SIZE, parseAppointmentFilters, type AppointmentFilters } from "@/lib/validation/admin";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Appointments" };

function pageHref(filters: AppointmentFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status) params.set("status", filters.status);
  if (filters.doctor) params.set("doctor", filters.doctor);
  if (filters.service) params.set("service", filters.service);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.sort !== "start_asc") params.set("sort", filters.sort);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/appointments?${query}` : "/admin/appointments";
}

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdmin();
  const filters = parseAppointmentFilters(await searchParams);
  const [{ total, rows }, options, clinic] = await Promise.all([
    searchAppointments(searchFromFilters(filters)),
    getFilterOptions(),
    getClinicSettings(),
  ]);

  const today = todayInZone(clinic.timezone);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const first = total === 0 ? 0 : (filters.page - 1) * PAGE_SIZE + 1;
  const last = Math.min(total, filters.page * PAGE_SIZE);
  const filtered = Boolean(filters.q || filters.status || filters.doctor || filters.service || filters.from || filters.to);

  return (
    <>
      <PageHeader title="Appointments" description="Search, filter and manage every booking." />

      <AppointmentFiltersForm filters={filters} doctors={options.doctors} services={options.services} today={today} />

      <p className="mb-3 mt-6 text-sm text-ink-500" aria-live="polite" data-testid="result-count">
        {total === 0 ? "No appointments match" : `Showing ${first}–${last} of ${total} appointment${total === 1 ? "" : "s"}`}
      </p>

      {rows.length === 0 ? (
        <EmptyState
          icon={<Inbox className="size-6" aria-hidden="true" />}
          title={filtered ? "No appointments match these filters" : "No appointments yet"}
          action={
            filtered ? (
              <Link href="/admin/appointments" className="font-semibold text-teal-700 underline underline-offset-2">
                Clear all filters
              </Link>
            ) : undefined
          }
        >
          {filtered ? "Try widening the date range or removing a filter." : "Bookings made on the website will appear here."}
        </EmptyState>
      ) : (
        <AppointmentsTable rows={rows} timeZone={clinic.timezone} />
      )}

      {pages > 1 ? (
        <nav aria-label="Pagination" className="mt-6 flex items-center justify-between gap-3">
          {filters.page > 1 ? (
            <Link
              href={pageHref(filters, filters.page - 1)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-sm border border-sand-300 bg-surface px-4 font-semibold hover:bg-sand-50"
            >
              <ChevronLeft className="size-4" aria-hidden="true" /> Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-sm text-ink-500">
            Page {filters.page} of {pages}
          </span>
          {filters.page < pages ? (
            <Link
              href={pageHref(filters, filters.page + 1)}
              className="inline-flex min-h-11 items-center gap-1.5 rounded-sm border border-sand-300 bg-surface px-4 font-semibold hover:bg-sand-50"
            >
              Next <ChevronRight className="size-4" aria-hidden="true" />
            </Link>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </>
  );
}
