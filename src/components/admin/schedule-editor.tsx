"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save, Trash2 } from "lucide-react";

import { saveScheduleAction } from "@/app/admin/(protected)/actions";
import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/fields";
import { cn } from "@/lib/cn";
import { WEEKDAY_DISPLAY_ORDER, WEEKDAY_NAMES, trimSeconds } from "@/lib/datetime";
import { SLOT_MINUTE_OPTIONS, scheduleSchema } from "@/lib/validation/admin";

interface Window {
  start: string;
  end: string;
}

type Week = Record<number, Window[]>;

function toWeek(windows: { weekday: number; start_time: string; end_time: string }[]): Week {
  const week: Week = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  for (const item of windows) {
    week[item.weekday]?.push({
      start: trimSeconds(item.start_time),
      end: trimSeconds(item.end_time),
    });
  }
  return week;
}

const inputClass =
  "min-h-11 w-[9.5rem] rounded-sm border border-ink-400 bg-surface px-2.5 text-base text-ink-900 hover:border-ink-500 focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-500/20 aria-[invalid=true]:border-danger-600";

export function ScheduleEditor({
  doctorId,
  doctorName,
  initialSlotMinutes,
  initialWindows,
}: {
  doctorId: string;
  doctorName: string;
  initialSlotMinutes: number;
  initialWindows: { weekday: number; start_time: string; end_time: string }[];
}) {
  const router = useRouter();
  const initialWeek = useMemo(() => toWeek(initialWindows), [initialWindows]);
  const [week, setWeek] = useState<Week>(initialWeek);
  const [slotMinutes, setSlotMinutes] = useState(String(initialSlotMinutes));
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const payload = {
    doctorId,
    slotMinutes: Number(slotMinutes),
    windows: WEEKDAY_DISPLAY_ORDER.flatMap((weekday) =>
      (week[weekday] ?? []).map((window) => ({ weekday, start: window.start, end: window.end })),
    ),
  };
  const validation = scheduleSchema.safeParse(payload);
  const dirty =
    JSON.stringify(week) !== JSON.stringify(initialWeek) ||
    Number(slotMinutes) !== initialSlotMinutes;

  // Per-window problems, keyed "weekday:index".
  const problems = new Map<string, string>();
  if (!validation.success) {
    for (const issue of validation.error.issues) {
      if (issue.path[0] === "windows" && typeof issue.path[1] === "number") {
        const window = payload.windows[issue.path[1]];
        if (window) {
          const indexInDay = payload.windows
            .slice(0, issue.path[1])
            .filter((w) => w.weekday === window.weekday).length;
          problems.set(`${window.weekday}:${indexInDay}`, issue.message);
        }
      }
    }
  }

  function update(weekday: number, next: Window[]) {
    setWeek((current) => ({ ...current, [weekday]: next }));
    setFeedback(null);
  }

  function save() {
    if (!validation.success) {
      setFeedback({
        ok: false,
        message: validation.error.issues[0]?.message ?? "Please check the working hours.",
      });
      return;
    }
    setFeedback(null);
    startTransition(async () => {
      const result = await saveScheduleAction(validation.data);
      setFeedback({ ok: result.ok, message: result.message });
      if (result.ok) router.refresh();
    });
  }

  return (
    <div>
      <div className="grid gap-4 sm:max-w-xs">
        <SelectField
          label="Appointment slot length"
          hint="Bookable times are generated on this grid."
          value={slotMinutes}
          onChange={(event) => {
            setSlotMinutes(event.target.value);
            setFeedback(null);
          }}
        >
          {[...new Set([...SLOT_MINUTE_OPTIONS, initialSlotMinutes])]
            .sort((a, b) => a - b)
            .map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} minutes
              </option>
            ))}
        </SelectField>
      </div>

      <ul className="mt-6 divide-y divide-sand-200 rounded-md border border-sand-200">
        {WEEKDAY_DISPLAY_ORDER.map((weekday) => {
          const windows = week[weekday] ?? [];
          const working = windows.length > 0;
          const name = WEEKDAY_NAMES[weekday];
          return (
            <li
              key={weekday}
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:gap-6"
            >
              <label className="flex w-40 shrink-0 cursor-pointer items-center gap-3 sm:pt-2.5">
                <input
                  type="checkbox"
                  checked={working}
                  onChange={(event) =>
                    update(weekday, event.target.checked ? [{ start: "09:00", end: "13:00" }] : [])
                  }
                  className="size-5 cursor-pointer rounded-xs accent-brand-700"
                  data-testid={`day-toggle-${weekday}`}
                />
                <span className="font-semibold text-ink-900">{name}</span>
              </label>

              <div className="min-w-0 flex-1">
                {!working ? (
                  <p className="py-2.5 text-ink-500">Not working</p>
                ) : (
                  <div className="space-y-3">
                    {windows.map((window, index) => {
                      const problem = problems.get(`${weekday}:${index}`);
                      return (
                        <div key={index}>
                          <div className="flex flex-wrap items-center gap-2">
                            <label className="sr-only" htmlFor={`start-${weekday}-${index}`}>
                              {name} window {index + 1} start time
                            </label>
                            <input
                              id={`start-${weekday}-${index}`}
                              type="time"
                              step={300}
                              value={window.start}
                              aria-invalid={problem ? true : undefined}
                              onChange={(event) =>
                                update(
                                  weekday,
                                  windows.map((w, i) =>
                                    i === index ? { ...w, start: event.target.value } : w,
                                  ),
                                )
                              }
                              className={inputClass}
                            />
                            <span aria-hidden="true" className="text-ink-500">
                              to
                            </span>
                            <label className="sr-only" htmlFor={`end-${weekday}-${index}`}>
                              {name} window {index + 1} end time
                            </label>
                            <input
                              id={`end-${weekday}-${index}`}
                              type="time"
                              step={300}
                              value={window.end}
                              aria-invalid={problem ? true : undefined}
                              onChange={(event) =>
                                update(
                                  weekday,
                                  windows.map((w, i) =>
                                    i === index ? { ...w, end: event.target.value } : w,
                                  ),
                                )
                              }
                              className={inputClass}
                            />
                            <button
                              type="button"
                              onClick={() =>
                                update(
                                  weekday,
                                  windows.filter((_, i) => i !== index),
                                )
                              }
                              className="flex size-10 items-center justify-center rounded-sm text-ink-500 hover:bg-danger-50 hover:text-danger-700"
                              aria-label={`Remove ${name} window ${index + 1}`}
                            >
                              <Trash2 className="size-4" aria-hidden="true" />
                            </button>
                          </div>
                          {problem ? (
                            <p className="mt-1 text-sm font-medium text-danger-700">{problem}</p>
                          ) : null}
                        </div>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => {
                        const last = windows[windows.length - 1];
                        const start = last && last.end < "17:00" ? "17:00" : "14:00";
                        update(weekday, [
                          ...windows,
                          { start, end: start < "17:00" ? "17:00" : "19:00" },
                        ]);
                      }}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-xs text-sm font-semibold text-brand-700 hover:text-brand-800",
                      )}
                    >
                      <Plus className="size-4" aria-hidden="true" /> Add another time window
                    </button>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <Button
          onClick={save}
          loading={pending}
          disabled={!dirty}
          icon={<Save className="size-4" aria-hidden="true" />}
          data-testid="save-schedule"
        >
          Save weekly schedule
        </Button>
        {dirty && !pending ? (
          <span className="text-sm text-ink-500">You have unsaved changes for {doctorName}.</span>
        ) : null}
      </div>

      <div aria-live="polite" className="mt-4 empty:hidden" data-testid="schedule-feedback">
        {feedback ? (
          <Alert tone={feedback.ok ? "success" : "danger"}>{feedback.message}</Alert>
        ) : null}
      </div>
    </div>
  );
}
