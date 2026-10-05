"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Coffee, Plus, Trash2 } from "lucide-react";

import { addBreakAction, deleteBreakAction } from "@/app/admin/(protected)/actions";
import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/fields";
import { WEEKDAY_DISPLAY_ORDER, WEEKDAY_NAMES, formatClockTime } from "@/lib/datetime";
import type { FieldErrors } from "@/lib/validation/booking";

interface Break {
  id: string;
  weekday: number | null;
  start_time: string;
  end_time: string;
  label: string;
}

export function BreaksPanel({ doctorId, breaks }: { doctorId: string; breaks: Break[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [weekday, setWeekday] = useState("all");
  const [start, setStart] = useState("13:00");
  const [end, setEnd] = useState("14:00");
  const [label, setLabel] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  function add() {
    setErrors({});
    setFeedback(null);
    startTransition(async () => {
      const result = await addBreakAction({ doctorId, weekday, start, end, label });
      if (result.ok) {
        setLabel("");
        router.refresh();
      } else if (result.fieldErrors) {
        setErrors(result.fieldErrors);
      }
      setFeedback({ ok: result.ok, message: result.message });
    });
  }

  function remove(id: string) {
    setFeedback(null);
    startTransition(async () => {
      const result = await deleteBreakAction({ id });
      setFeedback({ ok: result.ok, message: result.message });
      if (result.ok) router.refresh();
    });
  }

  return (
    <div>
      {breaks.length === 0 ? (
        <p className="rounded-md bg-sand-50 p-4 text-ink-500">
          No breaks set. Patients can book any time inside working hours.
        </p>
      ) : (
        <ul className="divide-y divide-sand-100 rounded-md border border-sand-200">
          {breaks.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <Coffee className="size-4 shrink-0 text-clay-700" aria-hidden="true" />
                <p className="min-w-0 text-[0.9375rem]">
                  <span className="font-semibold">{item.label}</span>
                  <span className="text-ink-700">
                    {" "}
                    · {formatClockTime(item.start_time)} – {formatClockTime(item.end_time)} ·{" "}
                    {item.weekday === null
                      ? "every working day"
                      : `${WEEKDAY_NAMES[item.weekday]}s`}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(item.id)}
                disabled={pending}
                className="flex size-10 shrink-0 items-center justify-center rounded-sm text-ink-500 hover:bg-danger-50 hover:text-danger-700"
                aria-label={`Remove break ${item.label}`}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form
        className="mt-5 grid gap-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          add();
        }}
      >
        <SelectField
          label="Day"
          wrapperClassName="sm:col-span-2"
          value={weekday}
          onChange={(event) => setWeekday(event.target.value)}
        >
          <option value="all">Every working day</option>
          {WEEKDAY_DISPLAY_ORDER.map((day) => (
            <option key={day} value={day}>
              {WEEKDAY_NAMES[day]}
            </option>
          ))}
        </SelectField>
        <TextField
          label="From"
          type="time"
          step={300}
          value={start}
          onChange={(event) => setStart(event.target.value)}
          error={errors.start}
        />
        <TextField
          label="To"
          type="time"
          step={300}
          value={end}
          onChange={(event) => setEnd(event.target.value)}
          error={errors.end}
        />
        <TextField
          label="Name"
          wrapperClassName="sm:col-span-2"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="Lunch"
          maxLength={80}
          error={errors.label}
        />
        <div className="sm:col-span-2">
          <Button
            type="submit"
            variant="secondary"
            loading={pending}
            icon={<Plus className="size-4" aria-hidden="true" />}
          >
            Add break
          </Button>
        </div>
      </form>

      <div aria-live="polite" className="mt-4 empty:hidden">
        {feedback ? (
          <Alert tone={feedback.ok ? "success" : "danger"}>{feedback.message}</Alert>
        ) : null}
      </div>
    </div>
  );
}
