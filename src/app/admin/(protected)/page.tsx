import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarCheck, CalendarX2, CheckCheck, Clock, Hourglass, Sun } from "lucide-react";

import { ActivityFeed } from "@/components/admin/activity-feed";
import { CompactAppointmentList } from "@/components/admin/appointment-list";
import { DailyBarChart, HorizontalBars } from "@/components/admin/bar-chart";
import { PageHeader } from "@/components/admin/page-header";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/feedback";
import { requireAdmin } from "@/lib/auth";
import { getDashboardSummary, searchAppointments } from "@/lib/admin/queries";
import { addDays, formatCalendarDate, hourInZone } from "@/lib/datetime";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Dashboard" };

function greeting(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const session = await requireAdmin();
  const summary = await getDashboardSummary();
  const { today, timezone, counts } = summary;

  const [todayList, pendingList] = await Promise.all([
    searchAppointments({ from: today, to: today, sort: "start_asc", limit: 30 }),
    searchAppointments({ status: "pending", from: today, sort: "start_asc", limit: 6 }),
  ]);
  const todayVisible = todayList.rows.filter((row) => row.status !== "cancelled");
  const nowMs = Date.now();
  // "Still to come" first; everything already finished goes behind a disclosure to keep the page short.
  const stillToCome = todayVisible.filter(
    (row) => Date.parse(row.end_at) > nowMs && (row.status === "pending" || row.status === "confirmed"),
  );
  const earlierToday = todayVisible.filter((row) => !stillToCome.includes(row));

  const firstName =
    session.fullName.replace(/^(dr|mr|mrs|ms|miss|prof)\.?\s+/i, "").split(" ")[0] || session.fullName;
  const noShowRate =
    counts.completed_30d + counts.no_show_30d > 0
      ? Math.round((counts.no_show_30d / (counts.completed_30d + counts.no_show_30d)) * 100)
      : null;

  const stats = [
    { label: "Today", value: counts.today_total, sub: `${counts.today_remaining} still to come`, href: `/admin/appointments?from=${today}&to=${today}`, icon: Sun, tone: "text-teal-700 bg-teal-50" },
    { label: "Upcoming 7 days", value: counts.upcoming, sub: "Pending or confirmed", href: `/admin/appointments?from=${addDays(today, 1)}&to=${addDays(today, 7)}`, icon: CalendarCheck, tone: "text-teal-700 bg-teal-50" },
    { label: "Pending", value: counts.pending, sub: "Awaiting confirmation", href: "/admin/appointments?status=pending", icon: Hourglass, tone: "text-amber-700 bg-amber-50" },
    { label: "Confirmed", value: counts.confirmed, sub: "From today onwards", href: "/admin/appointments?status=confirmed", icon: Clock, tone: "text-sage-700 bg-sage-50" },
    { label: "Completed", value: counts.completed_30d, sub: "Last 30 days", href: "/admin/appointments?status=completed&sort=start_desc", icon: CheckCheck, tone: "text-slate-700 bg-slate-50" },
    { label: "Cancelled", value: counts.cancelled_30d, sub: noShowRate === null ? "Last 30 days" : `Last 30 days · ${noShowRate}% no-show rate`, href: "/admin/appointments?status=cancelled&sort=start_desc", icon: CalendarX2, tone: "text-danger-700 bg-danger-50" },
  ];

  return (
    <>
      <PageHeader
        title={`${greeting(hourInZone(new Date(), timezone))}, ${firstName}`}
        description={`${formatCalendarDate(today, "long")}. Here is what's happening at the clinic.`}
        actions={
          <ButtonLink href="/admin/appointments" variant="secondary">
            All appointments
          </ButtonLink>
        }
      />

      <section aria-label="Key figures" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="group rounded-lg border border-sand-200 bg-surface p-4 shadow-card transition-shadow hover:shadow-raised sm:p-5"
          >
            <span className={`flex size-9 items-center justify-center rounded-sm ${stat.tone}`}>
              <stat.icon className="size-[1.1rem]" aria-hidden="true" />
            </span>
            <p className="mt-4 font-display text-4xl font-semibold leading-none" data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}>
              {stat.value}
            </p>
            <p className="mt-2 text-sm font-semibold text-ink-900">{stat.label}</p>
            <p className="text-xs leading-snug text-ink-500">{stat.sub}</p>
          </Link>
        ))}
      </section>

      <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-sans text-xl font-semibold tracking-normal">Today&rsquo;s appointments</h2>
              <Link href={`/admin/appointments?from=${today}&to=${today}`} className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-800">
                View all <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="mt-3">
              {todayVisible.length === 0 ? (
                <EmptyState icon={<Sun className="size-6" aria-hidden="true" />} title="No appointments today">
                  New bookings will appear here as soon as patients make them.
                </EmptyState>
              ) : (
                <>
                  {stillToCome.length === 0 ? (
                    <p className="py-5 text-center text-ink-500">Nothing else is scheduled for the rest of today.</p>
                  ) : (
                    <CompactAppointmentList rows={stillToCome.slice(0, 12)} timeZone={timezone} />
                  )}
                  {stillToCome.length > 12 ? (
                    <p className="px-3 pb-2 text-sm text-ink-500">
                      and {stillToCome.length - 12} more later today.{" "}
                      <Link className="font-semibold text-teal-700 underline underline-offset-2" href={`/admin/appointments?from=${today}&to=${today}`}>
                        See the full day
                      </Link>
                    </p>
                  ) : null}
                  {earlierToday.length > 0 ? (
                    <details className="mt-3 rounded-md border border-sand-200 bg-sand-50/60">
                      <summary className="cursor-pointer select-none rounded-md px-4 py-3 text-sm font-semibold text-ink-700 hover:bg-sand-100">
                        Earlier today ({earlierToday.length})
                      </summary>
                      <div className="px-2 pb-2">
                        <CompactAppointmentList rows={earlierToday} timeZone={timezone} />
                      </div>
                    </details>
                  ) : null}
                </>
              )}
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-sans text-xl font-semibold tracking-normal">Waiting for confirmation</h2>
                <p className="text-sm text-ink-500">Pending bookings, soonest first.</p>
              </div>
              <Link href="/admin/appointments?status=pending" className="inline-flex items-center gap-1 text-sm font-semibold text-teal-700 hover:text-teal-800">
                View all {counts.pending} <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="mt-3">
              {pendingList.rows.length === 0 ? (
                <p className="py-6 text-center text-ink-500">Nothing is waiting. You&rsquo;re all caught up.</p>
              ) : (
                <CompactAppointmentList rows={pendingList.rows} timeZone={timezone} showDate />
              )}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="p-5 sm:p-6">
            <h2 className="font-sans text-xl font-semibold tracking-normal">Daily appointments</h2>
            <p className="mb-4 text-sm text-ink-500">The last 7 days and the next 7 days.</p>
            <DailyBarChart days={summary.daily} today={today} />
          </Card>

          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-1">
            <Card className="p-5 sm:p-6">
              <h2 className="font-sans text-lg font-semibold tracking-normal">Popular services</h2>
              <p className="mb-4 text-sm text-ink-500">Last 30 days and the coming week.</p>
              <HorizontalBars items={summary.top_services} emptyLabel="No bookings yet." />
            </Card>
            <Card className="p-5 sm:p-6">
              <h2 className="font-sans text-lg font-semibold tracking-normal">Doctor workload</h2>
              <p className="mb-4 text-sm text-ink-500">Active bookings in the next 7 days.</p>
              <HorizontalBars items={summary.doctor_load} emptyLabel="No upcoming bookings." />
            </Card>
          </div>

          <Card className="p-5 sm:p-6">
            <h2 className="font-sans text-xl font-semibold tracking-normal">Recent activity</h2>
            <div className="mt-4">
              <ActivityFeed items={summary.recent_activity} timeZone={timezone} />
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
