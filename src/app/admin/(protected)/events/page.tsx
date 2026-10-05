import type { Metadata } from "next";
import { CircleAlert, CircleCheck, Inbox, Plug, PlugZap } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { RetryEventButton } from "@/components/admin/retry-event-button";
import { Card } from "@/components/ui/card";
import { Alert, EmptyState } from "@/components/ui/feedback";
import { requireAdmin } from "@/lib/auth";
import { getAutomationEvents, getClinicSettings } from "@/lib/admin/queries";
import { formatDateTime } from "@/lib/datetime";
import { isDispatcherConfigured } from "@/lib/env";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Automation events" };

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  processing: "bg-slate-50 text-slate-700",
  delivered: "bg-sage-50 text-sage-700",
  failed: "bg-clay-50 text-clay-700",
  dead: "bg-danger-50 text-danger-700",
};

export default async function EventsPage() {
  await requireAdmin();
  const [{ rows, counts }, clinic] = await Promise.all([getAutomationEvents(), getClinicSettings()]);
  const configured = isDispatcherConfigured();
  const order = ["pending", "processing", "delivered", "failed", "dead"];

  return (
    <>
      <PageHeader
        title="Automation events"
        description="Every booking change is recorded here first, then delivered to an automation service (such as n8n) when one is connected. The clinic works fully without it."
      />

      <Alert
        tone={configured ? "success" : "info"}
        title={configured ? "Webhook delivery is configured" : "No automation service connected"}
        className="mb-6"
      >
        {configured ? (
          <span className="flex items-center gap-2"><PlugZap className="size-4" aria-hidden="true" /> Events are delivered whenever the dispatcher endpoint is called.</span>
        ) : (
          <span className="flex items-center gap-2">
            <Plug className="size-4" aria-hidden="true" /> Events are safely queued. Connect a webhook later and they will be delivered. See docs/N8N_INTEGRATION.md.
          </span>
        )}
      </Alert>

      <section aria-label="Event counts" className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {order.map((status) => (
          <div key={status} className="rounded-lg border border-sand-200 bg-surface p-4 shadow-card">
            <p className="font-display text-3xl font-semibold leading-none">{counts[status] ?? 0}</p>
            <p className="mt-2 text-sm font-semibold capitalize text-ink-700">{status}</p>
          </div>
        ))}
      </section>

      <Card className="p-5 sm:p-6">
        <h2 className="font-sans text-xl font-semibold tracking-normal">Latest 50 events</h2>
        {rows.length === 0 ? (
          <div className="mt-4">
            <EmptyState icon={<Inbox className="size-6" aria-hidden="true" />} title="No events yet">
              Events appear when appointments are created, confirmed, rescheduled, completed or cancelled.
            </EmptyState>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-left text-[0.9375rem]">
              <caption className="sr-only">Automation events</caption>
              <thead className="text-xs font-semibold uppercase tracking-wider text-ink-500">
                <tr>
                  <th scope="col" className="py-2 pr-3">Event</th>
                  <th scope="col" className="px-3 py-2">Booking</th>
                  <th scope="col" className="px-3 py-2">Status</th>
                  <th scope="col" className="px-3 py-2">Created</th>
                  <th scope="col" className="py-2 pl-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100">
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td className="py-3 pr-3 font-mono text-sm">{row.event_type}</td>
                    <td className="px-3 py-3 font-mono text-sm text-ink-700">{row.reference ?? "—"}</td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${STATUS_STYLE[row.status] ?? ""}`}>
                        {row.status === "delivered" ? <CircleCheck className="size-3.5" aria-hidden="true" /> : null}
                        {row.status === "dead" || row.status === "failed" ? <CircleAlert className="size-3.5" aria-hidden="true" /> : null}
                        {row.status}
                      </span>
                      {row.attempts > 0 ? <span className="ml-2 text-xs text-ink-500">{row.attempts} attempt{row.attempts === 1 ? "" : "s"}</span> : null}
                      {row.last_error ? <p className="mt-1 text-xs text-danger-700">{row.last_error}</p> : null}
                    </td>
                    <td className="whitespace-nowrap px-3 py-3 text-sm text-ink-500">{formatDateTime(row.created_at, clinic.timezone)}</td>
                    <td className="py-3 pl-3 text-right">
                      {row.status === "failed" || row.status === "dead" ? <RetryEventButton id={row.id} /> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
