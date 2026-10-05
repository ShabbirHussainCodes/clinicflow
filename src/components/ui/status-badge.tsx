import { Ban, CheckCheck, CircleCheck, Clock, UserX, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/cn";
import { STATUS_LABELS, type AppointmentStatus } from "@/lib/validation/admin";

/**
 * Status is always conveyed by icon + text as well as colour, so it stays readable for people who
 * cannot distinguish the colours.
 */
const STYLES: Record<AppointmentStatus, { className: string; Icon: LucideIcon }> = {
  pending: { className: "bg-amber-50 text-amber-700 ring-amber-700/20", Icon: Clock },
  confirmed: { className: "bg-brand-50 text-brand-700 ring-brand-700/20", Icon: CircleCheck },
  completed: { className: "bg-slate-50 text-slate-700 ring-slate-700/20", Icon: CheckCheck },
  cancelled: { className: "bg-danger-50 text-danger-700 ring-danger-700/20", Icon: Ban },
  no_show: { className: "bg-violet-50 text-violet-700 ring-violet-700/20", Icon: UserX },
};

export function StatusBadge({
  status,
  className,
}: {
  status: AppointmentStatus;
  className?: string;
}) {
  const { className: tone, Icon } = STYLES[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
        tone,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  );
}
