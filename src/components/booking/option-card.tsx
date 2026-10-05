import type { ReactNode } from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/cn";

/**
 * A selectable card backed by a real radio input, so arrow keys, focus and screen reader
 * semantics come from the browser.
 */
export function OptionCard({
  name,
  value,
  checked,
  onChange,
  children,
  testId,
}: {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <label
      data-testid={testId}
      className={cn(
        "relative flex cursor-pointer gap-4 rounded-md border bg-surface p-4 transition-[border-color,box-shadow,background-color] duration-150 sm:p-5",
        "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand-500",
        checked
          ? "border-brand-600 bg-brand-50/60 shadow-[0_0_0_1px_var(--color-brand-600)]"
          : "border-sand-300 hover:border-ink-400 hover:shadow-card",
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        className="peer sr-only"
      />
      <div className="min-w-0 flex-1">{children}</div>
      <span
        aria-hidden="true"
        className={cn(
          "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
          checked ? "border-brand-700 bg-brand-700 text-white" : "border-ink-400 bg-surface",
        )}
      >
        {checked ? <Check className="size-3.5" strokeWidth={3} /> : null}
      </span>
    </label>
  );
}
