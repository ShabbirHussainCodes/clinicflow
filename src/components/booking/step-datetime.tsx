"use client";

import { CalendarX2, SunMedium, Sunrise, Sunset } from "lucide-react";

import { Alert, Skeleton } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatCalendarDate, formatTime, hourInZone } from "@/lib/datetime";

import { Calendar } from "./calendar";
import type { SlotDto, WizardClinic } from "./types";

export type LoadStatus = "idle" | "loading" | "ready" | "error";

const PERIODS = [
  { key: "morning", label: "Morning", icon: Sunrise, test: (hour: number) => hour < 12 },
  {
    key: "afternoon",
    label: "Afternoon",
    icon: SunMedium,
    test: (hour: number) => hour >= 12 && hour < 17,
  },
  { key: "evening", label: "Evening", icon: Sunset, test: (hour: number) => hour >= 17 },
] as const;

export function StepDateTime({
  clinic,
  availability,
  datesStatus,
  onRetryDates,
  selectedDate,
  onSelectDate,
  slots,
  slotsStatus,
  onRetrySlots,
  selectedSlot,
  onSelectSlot,
  notice,
}: {
  clinic: WizardClinic;
  availability: ReadonlyMap<string, number>;
  datesStatus: LoadStatus;
  onRetryDates: () => void;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  slots: SlotDto[];
  slotsStatus: LoadStatus;
  onRetrySlots: () => void;
  selectedSlot: string | null;
  onSelectSlot: (startAt: string) => void;
  notice: string | null;
}) {
  if (datesStatus === "error") {
    return (
      <Alert tone="danger" title="We couldn't load available dates">
        <p>Please check your connection and try again.</p>
        <Button size="sm" variant="secondary" className="mt-3" onClick={onRetryDates}>
          Try again
        </Button>
      </Alert>
    );
  }

  const noDatesAtAll = datesStatus === "ready" && availability.size === 0;

  return (
    <div className="space-y-5">
      {notice ? (
        <Alert
          tone="warning"
          title="Please choose another time"
          live="assertive"
          data-testid="slot-taken-alert"
        >
          {notice}
        </Alert>
      ) : null}

      <p className="text-sm text-ink-500">
        Times are shown in {clinic.timezoneLabel}. Only open times are listed.
      </p>

      {datesStatus === "loading" || datesStatus === "idle" ? (
        <Skeleton className="h-[22rem] w-full rounded-md" />
      ) : noDatesAtAll ? (
        <Alert tone="info" title="No open times in the next few weeks">
          This doctor has no free appointments for this service right now. Try another doctor, or
          call the clinic on {clinic.phone}.
        </Alert>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
          <Calendar
            today={clinic.today}
            lastDate={clinic.lastDate}
            availability={availability}
            selected={selectedDate}
            onSelect={onSelectDate}
            loading={false}
          />

          <div aria-live="polite" className="min-w-0">
            {!selectedDate ? (
              <div className="flex h-full min-h-40 flex-col items-center justify-center rounded-md border border-dashed border-sand-300 p-6 text-center text-ink-500">
                <CalendarX2 className="mb-2 size-6 text-ink-400" aria-hidden="true" />
                Choose a highlighted date to see open times.
              </div>
            ) : slotsStatus === "loading" ? (
              <div className="space-y-3" role="status">
                <span className="sr-only">Loading available times</span>
                <Skeleton className="h-6 w-40" />
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {Array.from({ length: 8 }, (_, index) => (
                    <Skeleton key={index} className="h-11" />
                  ))}
                </div>
              </div>
            ) : slotsStatus === "error" ? (
              <Alert tone="danger" title="We couldn't load times for that day">
                <Button size="sm" variant="secondary" className="mt-2" onClick={onRetrySlots}>
                  Try again
                </Button>
              </Alert>
            ) : slots.length === 0 ? (
              <Alert tone="info" title="No open times on this day">
                Someone may have just booked the last one. Please choose another date.
              </Alert>
            ) : (
              <fieldset className="min-w-0">
                <legend className="mb-4 font-sans text-lg font-semibold tracking-normal">
                  {formatCalendarDate(selectedDate, "long")}
                </legend>
                <div className="space-y-5">
                  {PERIODS.map((period) => {
                    const periodSlots = slots.filter((slot) =>
                      period.test(hourInZone(slot.start, clinic.timezone)),
                    );
                    if (periodSlots.length === 0) return null;
                    return (
                      <div key={period.key}>
                        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-700">
                          <period.icon className="size-4 text-clay-700" aria-hidden="true" />{" "}
                          {period.label}
                        </p>
                        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                          {periodSlots.map((slot) => {
                            const checked = selectedSlot === slot.start;
                            return (
                              <label
                                key={slot.start}
                                className={cn(
                                  "flex min-h-11 cursor-pointer items-center justify-center rounded-sm border text-sm font-semibold transition-colors",
                                  "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-teal-500",
                                  checked
                                    ? "border-teal-700 bg-teal-700 text-white"
                                    : "border-sand-300 bg-surface text-ink-900 hover:border-teal-600 hover:bg-teal-50",
                                )}
                              >
                                <input
                                  type="radio"
                                  name="slot"
                                  value={slot.start}
                                  checked={checked}
                                  onChange={() => onSelectSlot(slot.start)}
                                  className="sr-only"
                                />
                                {formatTime(slot.start, clinic.timezone)}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </fieldset>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
