"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, CalendarClock, CheckCheck, CircleCheck, UserX } from "lucide-react";

import {
  changeStatusAction,
  loadRescheduleSlotsAction,
  rescheduleAction,
  type ActionResult,
} from "@/app/admin/(protected)/actions";
import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { TextAreaField, TextField } from "@/components/ui/fields";
import { cn } from "@/lib/cn";
import { formatTime } from "@/lib/datetime";
import { STATUS_LABELS, canTransition, type AppointmentStatus } from "@/lib/validation/admin";

type Feedback = { tone: "success" | "danger"; message: string } | null;

export function AppointmentActions({
  appointmentId,
  status,
  hasStarted,
  timeZone,
  today,
  lastDate,
  patientName,
}: {
  appointmentId: string;
  status: AppointmentStatus;
  hasStarted: boolean;
  timeZone: string;
  today: string;
  lastDate: string;
  patientName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<Feedback>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelNote, setCancelNote] = useState("");
  const [rescheduleOpen, setRescheduleOpen] = useState(false);

  function run(action: () => Promise<ActionResult>, after?: () => void) {
    setFeedback(null);
    startTransition(async () => {
      const result = await action();
      setFeedback({ tone: result.ok ? "success" : "danger", message: result.message });
      if (result.ok) {
        after?.();
        router.refresh();
      }
    });
  }

  function setStatus(next: AppointmentStatus, note?: string, after?: () => void) {
    run(() => changeStatusAction({ appointmentId, status: next, note }), after);
  }

  const terminal = status === "completed" || status === "cancelled" || status === "no_show";
  const startedHint = "Available once the appointment time has started.";

  return (
    <div>
      <div aria-live="polite" className="mb-4 empty:hidden" data-testid="action-feedback">
        {feedback ? (
          <Alert tone={feedback.tone} live={feedback.tone === "danger" ? "assertive" : "polite"}>
            {feedback.message}
          </Alert>
        ) : null}
      </div>

      {terminal ? (
        <p className="rounded-md bg-sand-50 p-4 text-sm text-ink-700">
          This appointment is <strong>{STATUS_LABELS[status].toLowerCase()}</strong>. Finished
          appointments can&rsquo;t be changed, which keeps the history trustworthy.
        </p>
      ) : (
        <div className="grid gap-2.5">
          {canTransition(status, "confirmed") ? (
            <Button
              onClick={() => setStatus("confirmed")}
              loading={pending}
              icon={<CircleCheck className="size-4" aria-hidden="true" />}
              data-testid="action-confirm"
            >
              Confirm appointment
            </Button>
          ) : null}

          {canTransition(status, "completed") ? (
            <Button
              variant="secondary"
              onClick={() => setStatus("completed")}
              disabled={pending || !hasStarted}
              icon={<CheckCheck className="size-4" aria-hidden="true" />}
              data-testid="action-complete"
              title={!hasStarted ? startedHint : undefined}
            >
              Mark as completed
            </Button>
          ) : null}

          {canTransition(status, "no_show") ? (
            <Button
              variant="secondary"
              onClick={() => setStatus("no_show")}
              disabled={pending || !hasStarted}
              icon={<UserX className="size-4" aria-hidden="true" />}
              data-testid="action-no-show"
              title={!hasStarted ? startedHint : undefined}
            >
              Mark as no-show
            </Button>
          ) : null}

          {!hasStarted && (canTransition(status, "completed") || canTransition(status, "no_show")) ? (
            <p className="text-xs text-ink-500">Completed and no-show can be set once the appointment time has started.</p>
          ) : null}

          <Button
            variant="secondary"
            onClick={() => setRescheduleOpen(true)}
            disabled={pending}
            icon={<CalendarClock className="size-4" aria-hidden="true" />}
            data-testid="action-reschedule"
          >
            Reschedule
          </Button>

          <Button
            variant="danger-outline"
            onClick={() => {
              setCancelNote("");
              setCancelOpen(true);
            }}
            disabled={pending}
            icon={<Ban className="size-4" aria-hidden="true" />}
            data-testid="action-cancel"
          >
            Cancel appointment
          </Button>
        </div>
      )}

      <Dialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title="Cancel this appointment?"
        description={`${patientName}'s time slot will be released for other patients. This can't be undone.`}
        testId="cancel-dialog"
      >
        <TextAreaField
          label="Reason"
          optional
          hint="Recorded in the appointment history. Not sent to the patient automatically."
          value={cancelNote}
          onChange={(event) => setCancelNote(event.target.value)}
          maxLength={300}
          rows={3}
        />
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={() => setCancelOpen(false)} disabled={pending}>
            Keep appointment
          </Button>
          <Button
            variant="danger"
            loading={pending}
            data-testid="confirm-cancel"
            onClick={() => setStatus("cancelled", cancelNote, () => setCancelOpen(false))}
          >
            Yes, cancel appointment
          </Button>
        </div>
      </Dialog>

      <RescheduleDialog
        open={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        appointmentId={appointmentId}
        timeZone={timeZone}
        today={today}
        lastDate={lastDate}
        onDone={(result) => {
          setFeedback({ tone: result.ok ? "success" : "danger", message: result.message });
          if (result.ok) {
            setRescheduleOpen(false);
            router.refresh();
          }
        }}
      />
    </div>
  );
}

function RescheduleDialog({
  open,
  onClose,
  appointmentId,
  timeZone,
  today,
  lastDate,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  appointmentId: string;
  timeZone: string;
  today: string;
  lastDate: string;
  onDone: (result: ActionResult) => void;
}) {
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<{ start: string; end: string }[]>([]);
  const [slotsState, setSlotsState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [chosen, setChosen] = useState("");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  async function onDateChange(value: string) {
    setDate(value);
    setChosen("");
    setSlots([]);
    if (!value) {
      setSlotsState("idle");
      return;
    }
    setSlotsState("loading");
    const result = await loadRescheduleSlotsAction({ appointmentId, date: value });
    if (result.ok) {
      setSlots(result.slots);
      setSlotsState("ready");
    } else {
      setSlotsState("error");
    }
  }

  function save() {
    startTransition(async () => {
      const result = await rescheduleAction({ appointmentId, startAt: chosen, note });
      onDone(result);
    });
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Reschedule appointment"
      description="Only times that are genuinely free for this doctor are offered. The patient keeps the same booking reference."
      testId="reschedule-dialog"
    >
      <div className="space-y-5">
        <TextField
          label="New date"
          type="date"
          min={today}
          max={lastDate}
          value={date}
          onChange={(event) => void onDateChange(event.target.value)}
        />

        <div aria-live="polite">
          {slotsState === "loading" ? <p className="text-sm text-ink-500">Loading available times…</p> : null}
          {slotsState === "error" ? <Alert tone="danger" title="Couldn't load times for that day" /> : null}
          {slotsState === "ready" && slots.length === 0 ? (
            <Alert tone="info" title="No free times on this day">
              Choose another date. The doctor may be off, on a break, or fully booked.
            </Alert>
          ) : null}
          {slotsState === "ready" && slots.length > 0 ? (
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Available times</legend>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {slots.map((slot) => (
                  <label
                    key={slot.start}
                    className={cn(
                      "flex min-h-11 cursor-pointer items-center justify-center rounded-sm border text-sm font-semibold",
                      "has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-teal-500",
                      chosen === slot.start
                        ? "border-teal-700 bg-teal-700 text-white"
                        : "border-sand-300 hover:border-teal-600 hover:bg-teal-50",
                    )}
                  >
                    <input
                      type="radio"
                      name="reschedule-slot"
                      value={slot.start}
                      checked={chosen === slot.start}
                      onChange={() => setChosen(slot.start)}
                      className="sr-only"
                    />
                    {formatTime(slot.start, timeZone)}
                  </label>
                ))}
              </div>
            </fieldset>
          ) : null}
        </div>

        <TextAreaField
          label="Note"
          optional
          hint="Recorded in the appointment history."
          value={note}
          onChange={(event) => setNote(event.target.value)}
          maxLength={300}
          rows={2}
        />
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button variant="secondary" onClick={onClose} disabled={pending}>
          Close
        </Button>
        <Button onClick={save} disabled={!chosen} loading={pending} data-testid="confirm-reschedule">
          Save new time
        </Button>
      </div>
    </Dialog>
  );
}
