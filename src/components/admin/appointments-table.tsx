import Link from "next/link";

import { StatusBadge } from "@/components/ui/status-badge";
import type { AppointmentRow } from "@/lib/admin/queries";
import { formatDate, formatTime } from "@/lib/datetime";
import { formatIndianMobile } from "@/lib/validation/booking";

export function AppointmentsTable({ rows, timeZone }: { rows: AppointmentRow[]; timeZone: string }) {
  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-lg border border-sand-200 bg-surface shadow-card md:block">
        <table className="w-full text-left text-[0.9375rem]">
          <caption className="sr-only">Appointments</caption>
          <thead className="bg-sand-50 text-xs font-semibold uppercase tracking-wider text-ink-500">
            <tr>
              <th scope="col" className="px-5 py-3">When</th>
              <th scope="col" className="px-3 py-3">Patient</th>
              <th scope="col" className="px-3 py-3">Doctor &amp; service</th>
              <th scope="col" className="px-3 py-3">Status</th>
              <th scope="col" className="px-5 py-3">Reference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-100">
            {rows.map((row) => (
              <tr key={row.id} className="transition-colors hover:bg-sand-50/70">
                <td className="whitespace-nowrap px-5 py-3.5">
                  <p className="font-semibold text-ink-900">{formatTime(row.start_at, timeZone)}</p>
                  <p className="text-sm text-ink-500">{formatDate(row.start_at, timeZone)}</p>
                </td>
                <td className="px-3 py-3.5">
                  <Link
                    href={`/admin/appointments/${row.id}`}
                    className="font-semibold text-teal-800 underline-offset-2 hover:underline"
                  >
                    {row.patient_name}
                    <span className="sr-only">, {formatDate(row.start_at, timeZone)} {formatTime(row.start_at, timeZone)}</span>
                  </Link>
                  <p className="text-sm text-ink-500">{formatIndianMobile(row.patient_phone)}</p>
                </td>
                <td className="px-3 py-3.5">
                  <p className="text-ink-900">{row.doctor_name}</p>
                  <p className="text-sm text-ink-500">{row.service_name}</p>
                </td>
                <td className="px-3 py-3.5"><StatusBadge status={row.status} /></td>
                <td className="whitespace-nowrap px-5 py-3.5 font-mono text-sm text-ink-700">{row.reference}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <ul className="space-y-3 md:hidden">
        {rows.map((row) => (
          <li key={row.id}>
            <Link
              href={`/admin/appointments/${row.id}`}
              className="block rounded-lg border border-sand-200 bg-surface p-4 shadow-card"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink-900">{row.patient_name}</p>
                  <p className="text-sm text-ink-500">{formatIndianMobile(row.patient_phone)}</p>
                </div>
                <StatusBadge status={row.status} />
              </div>
              <p className="mt-3 text-sm font-semibold text-ink-900">
                {formatDate(row.start_at, timeZone)} · {formatTime(row.start_at, timeZone)}
              </p>
              <p className="text-sm text-ink-500">
                {row.service_name} · {row.doctor_name}
              </p>
              <p className="mt-2 font-mono text-xs text-ink-500">{row.reference}</p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
