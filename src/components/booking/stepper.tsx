import { Check } from "lucide-react";

import { cn } from "@/lib/cn";

import { STEP_LABELS, STEP_ORDER, type WizardStep } from "./types";

export function Stepper({
  current,
  furthest,
  onNavigate,
}: {
  current: WizardStep;
  /** Highest step index the user has reached; earlier steps are clickable. */
  furthest: number;
  onNavigate: (step: WizardStep) => void;
}) {
  const currentIndex = STEP_ORDER.indexOf(current);
  return (
    <nav aria-label="Booking progress">
      {/* Compact progress for small screens */}
      <div className="sm:hidden">
        <p className="text-sm font-semibold text-ink-900">
          Step {currentIndex + 1} of {STEP_ORDER.length}
          <span className="font-normal text-ink-500"> · {STEP_LABELS[current]}</span>
        </p>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-sand-200"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={STEP_ORDER.length}
          aria-valuenow={currentIndex + 1}
          aria-label="Booking progress"
        >
          <div
            className="h-full rounded-full bg-teal-600 transition-[width] duration-300"
            style={{ width: `${((currentIndex + 1) / STEP_ORDER.length) * 100}%` }}
          />
        </div>
      </div>

      <ol className="hidden items-center sm:flex">
        {STEP_ORDER.map((step, index) => {
          const done = index < currentIndex;
          const active = index === currentIndex;
          const reachable = index <= furthest && index !== currentIndex;
          const content = (
            <>
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors",
                  done && "bg-teal-700 text-white",
                  active && "bg-teal-700 text-white ring-4 ring-teal-100",
                  !done && !active && "bg-sand-100 text-ink-500 ring-1 ring-inset ring-sand-300",
                )}
              >
                {done ? <Check className="size-4" aria-hidden="true" /> : index + 1}
              </span>
              <span
                className={cn(
                  "text-sm font-semibold",
                  active ? "text-ink-900" : done ? "text-ink-700" : "text-ink-500",
                )}
              >
                {STEP_LABELS[step]}
              </span>
            </>
          );
          return (
            <li key={step} className="flex flex-1 items-center last:flex-none">
              {reachable ? (
                <button
                  type="button"
                  onClick={() => onNavigate(step)}
                  className="flex items-center gap-2.5 rounded-sm py-1 pr-1 hover:opacity-80"
                >
                  {content}
                  <span className="sr-only"> (go back to this step)</span>
                </button>
              ) : (
                <span className="flex items-center gap-2.5 py-1 pr-1" aria-current={active ? "step" : undefined}>
                  {content}
                </span>
              )}
              {index < STEP_ORDER.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cn("mx-3 h-0.5 flex-1 rounded-full", index < currentIndex ? "bg-teal-600" : "bg-sand-200")}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
