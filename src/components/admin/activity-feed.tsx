import Link from "next/link";
import {
  CalendarClock,
  CalendarPlus,
  CircleCheck,
  NotebookPen,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import type { DashboardSummary } from "@/lib/admin/queries";
import { formatDateTime } from "@/lib/datetime";
import { STATUS_LABELS, type AppointmentStatus } from "@/lib/validation/admin";

type Item = DashboardSummary["recent_activity"][number];

function describe(item: Item): { text: string; icon: LucideIcon; tone: string } {
  if (item.event === "created") {
    return {
      text: "booked an appointment",
      icon: CalendarPlus,
      tone: "bg-brand-50 text-brand-700",
    };
  }
  if (item.event === "rescheduled") {
    return {
      text: "had an appointment rescheduled",
      icon: CalendarClock,
      tone: "bg-amber-50 text-amber-700",
    };
  }
  if (item.event === "note_updated") {
    return { text: "had staff notes updated", icon: NotebookPen, tone: "bg-sand-100 text-ink-700" };
  }
  const to = item.to_status as AppointmentStatus | null;
  const label = to ? STATUS_LABELS[to].toLowerCase() : "updated";
  if (to === "cancelled" || to === "no_show") {
    return {
      text: `had an appointment marked ${label}`,
      icon: XCircle,
      tone: "bg-danger-50 text-danger-700",
    };
  }
  return {
    text: `had an appointment marked ${label}`,
    icon: CircleCheck,
    tone: "bg-sage-50 text-sage-700",
  };
}

export function ActivityFeed({ items, timeZone }: { items: Item[]; timeZone: string }) {
  if (items.length === 0) return <p className="text-sm text-ink-500">No activity yet.</p>;
  return (
    <ol className="space-y-4">
      {items.map((item) => {
        const { text, icon: Icon, tone } = describe(item);
        return (
          <li key={item.id} className="flex gap-3">
            <span
              className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${tone}`}
            >
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0 text-sm">
              <p className="text-ink-900">
                <Link
                  href={`/admin/appointments/${item.appointment_id}`}
                  className="font-semibold hover:underline"
                >
                  {item.patient_name}
                </Link>{" "}
                {text}
                <span className="text-ink-500"> with {item.doctor_name}</span>
              </p>
              <p className="text-xs text-ink-500">
                {formatDateTime(item.created_at, timeZone)} · {item.reference}
                {item.by_staff ? " · by staff" : ""}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
