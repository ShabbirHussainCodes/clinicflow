import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, Info, LoaderCircle, TriangleAlert } from "lucide-react";

import { cn } from "@/lib/cn";

type AlertTone = "info" | "success" | "warning" | "danger";

const tones: Record<AlertTone, { box: string; icon: ReactNode }> = {
  info: {
    box: "border-teal-200 bg-teal-50 text-teal-900",
    icon: <Info className="size-5 text-teal-600" aria-hidden="true" />,
  },
  success: {
    box: "border-sage-300 bg-sage-50 text-ink-900",
    icon: <CircleCheck className="size-5 text-sage-700" aria-hidden="true" />,
  },
  warning: {
    box: "border-clay-100 bg-amber-50 text-ink-900",
    icon: <TriangleAlert className="size-5 text-amber-700" aria-hidden="true" />,
  },
  danger: {
    box: "border-danger-600/30 bg-danger-50 text-ink-900",
    icon: <CircleAlert className="size-5 text-danger-600" aria-hidden="true" />,
  },
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
  live,
  ...rest
}: {
  tone?: AlertTone;
  title?: string;
  children?: ReactNode;
  className?: string;
  /** "assertive" for errors that need immediate attention, "polite" for confirmations. */
  live?: "assertive" | "polite" | "off";
} & { id?: string; "data-testid"?: string }) {
  const role = live === "off" ? undefined : tone === "danger" ? "alert" : "status";
  return (
    <div
      role={role}
      aria-live={live && live !== "off" ? live : undefined}
      className={cn("flex gap-3 rounded-md border p-4 text-[0.9375rem] leading-snug", tones[tone].box, className)}
      {...rest}
    >
      <span className="mt-0.5 shrink-0">{tones[tone].icon}</span>
      <div className="min-w-0 space-y-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className="text-ink-700">{children}</div> : null}
      </div>
    </div>
  );
}

export function Spinner({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <span role="status" className={cn("inline-flex items-center gap-2 text-ink-500", className)}>
      <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
      <span className="text-sm">{label}</span>
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("animate-pulse rounded-sm bg-sand-100 motion-reduce:animate-none", className)}
    />
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-dashed border-sand-300 bg-surface/60 px-6 py-12 text-center">
      {icon ? (
        <span className="mb-4 flex size-12 items-center justify-center rounded-full bg-teal-50 text-teal-700">
          {icon}
        </span>
      ) : null}
      <h3 className="font-sans text-lg font-semibold tracking-normal">{title}</h3>
      {children ? <p className="mt-1.5 max-w-md text-ink-500">{children}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
