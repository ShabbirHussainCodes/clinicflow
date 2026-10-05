import Link from "next/link";
import { Phone, Stethoscope } from "lucide-react";

import { StatusBadge } from "@/components/ui/status-badge";
import { formatDate, formatTime } from "@/lib/datetime";
import { formatIndianMobile } from "@/lib/validation/booking";
import type { AppointmentRow } from "@/lib/admin/queries";

/** Compact list used on the dashboard. */
export function CompactAppointmentList({
  rows,
  timeZone,
  showDate = false,
}: {
  rows: AppointmentRow[];
  timeZone: string;
  showDate?: boolean;
}) {
  return (
    <ul className="divide-y divide-sand-100">
      {rows.map((row) => (
        <li key={row.id}>
          <Link
            href={`/admin/appointments/${row.id}`}
            className="flex items-center gap-4 rounded-sm px-2 py-3.5 transition-colors hover:bg-sand-50 sm:px-3"
          >
            <div className="w-[5.75rem] shrink-0 text-right">
              <p className="whitespace-nowrap font-display text-lg font-semibold leading-tight text-ink-900">
                {formatTime(row.start_at, timeZone)}
              </p>
              {showDate ? <p className="text-xs text-ink-500">{formatDate(row.start_at, timeZone).replace(/,? \d{4}$/, "")}</p> : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink-900">{row.patient_name}</p>
              <p className="flex items-center gap-1.5 truncate text-sm text-ink-500">
                <Stethoscope className="size-3.5 shrink-0" aria-hidden="true" />
                {row.service_name} · {row.doctor_name}
              </p>
              <p className="flex items-center gap-1.5 text-sm text-ink-500 sm:hidden">
                <Phone className="size-3.5 shrink-0" aria-hidden="true" />
                {formatIndianMobile(row.patient_phone)}
              </p>
            </div>
            <StatusBadge status={row.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
