"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarOff, Plus, Trash2 } from "lucide-react";

import { addBlockedDateAction, deleteBlockedDateAction } from "@/app/admin/(protected)/actions";
import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/fields";
import { formatCalendarDate } from "@/lib/datetime";
import type { FieldErrors } from "@/lib/validation/booking";

interface Block {
  id: string;
  doctor_id: string | null;
  start_date: string;
  end_date: string;
  kind: "holiday" | "unavailable";
  reason: string;
}

function range(block: Block): string {
  return block.start_date === block.end_date
    ? formatCalendarDate(block.start_date)
    : `${formatCalendarDate(block.start_date, "month-day")} – ${formatCalendarDate(block.end_date)}`;
}

export function BlockedPanel({
  doctorId,
  doctorName,
  blocks,
  today,
}: {
  doctorId: string;
  doctorName: string;
  blocks: Block[];
  today: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [scope, setScope] = useState<"doctor" | "clinic">("doctor");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  const upcoming = blocks.filter((block) => block.end_date >= today);

  function add() {
    setErrors({});
    setFeedback(null);
    startTransition(async () => {
      const result = await addBlockedDateAction({
        doctorId: scope === "clinic" ? "clinic" : doctorId,
        startDate,
        endDate: endDate || startDate,
        kind: scope === "clinic" ? "holiday" : "unavailable",
        reason,
      });
      if (result.ok) {
        setStartDate("");
        setEndDate("");
        setReason("");
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
      const result = await deleteBlockedDateAction({ id });
      setFeedback({ ok: result.ok, message: result.message });
      if (result.ok) router.refresh();
    });
  }

  return (
    <div>
      {upcoming.length === 0 ? (
        <p className="rounded-md bg-sand-50 p-4 text-ink-500">No upcoming blocked dates.</p>
      ) : (
        <ul
          className="divide-y divide-sand-100 rounded-md border border-sand-200"
          data-testid="blocked-list"
        >
          {upcoming.map((block) => (
            <li key={block.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 items-start gap-3">
                <CalendarOff
                  className="mt-0.5 size-4 shrink-0 text-danger-600"
                  aria-hidden="true"
                />
                <p className="min-w-0 text-[0.9375rem]">
                  <span className="font-semibold">{range(block)}</span>
                  <span className="block text-sm text-ink-500">
                    {block.doctor_id === null ? "Whole clinic closed" : `${doctorName} unavailable`}
                    {block.reason ? ` · ${block.reason}` : ""}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => remove(block.id)}
                disabled={pending}
                className="flex size-10 shrink-0 items-center justify-center rounded-sm text-ink-500 hover:bg-danger-50 hover:text-danger-700"
                aria-label={`Remove block for ${range(block)}`}
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
          label="Applies to"
          value={scope}
          onChange={(event) => setScope(event.target.value === "clinic" ? "clinic" : "doctor")}
          wrapperClassName="sm:col-span-2"
          hint="A clinic holiday closes every doctor. Doctor unavailability affects only the doctor you are editing."
        >
          <option value="doctor">{doctorName} only (leave, conference, unwell)</option>
          <option value="clinic">Whole clinic (public holiday, closure)</option>
        </SelectField>
        <TextField
          label="First day"
          type="date"
          min={today}
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
          error={errors.startDate}
          required
        />
        <TextField
          label="Last day"
          type="date"
          min={startDate || today}
          value={endDate}
          onChange={(event) => setEndDate(event.target.value)}
          hint="Leave blank for a single day."
          error={errors.endDate}
        />
        <TextField
          label="Reason"
          optional
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={200}
          placeholder={scope === "clinic" ? "Public holiday" : "Attending a conference"}
          hint={scope === "clinic" ? "Shown to patients on the website." : "Visible to staff only."}
          wrapperClassName="sm:col-span-2"
          error={errors.reason}
        />
        <div className="sm:col-span-2">
          <Button
            type="submit"
            variant="secondary"
            loading={pending}
            icon={<Plus className="size-4" aria-hidden="true" />}
            data-testid="add-block"
          >
            Block these dates
          </Button>
        </div>
      </form>

      <div aria-live="polite" className="mt-4 empty:hidden" data-testid="block-feedback">
        {feedback ? (
          <Alert tone={feedback.ok ? "success" : "danger"}>{feedback.message}</Alert>
        ) : null}
      </div>
    </div>
  );
}
