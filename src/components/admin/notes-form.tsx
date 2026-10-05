"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { saveNotesAction } from "@/app/admin/(protected)/actions";
import { Alert } from "@/components/ui/feedback";
import { Button } from "@/components/ui/button";
import { TextAreaField } from "@/components/ui/fields";

export function NotesForm({ appointmentId, initialNotes }: { appointmentId: string; initialNotes: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  function save() {
    setFeedback(null);
    startTransition(async () => {
      const result = await saveNotesAction({ appointmentId, notes });
      setFeedback({ ok: result.ok, message: result.message });
      if (result.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <TextAreaField
        label="Internal notes"
        hint="Visible to staff only. Avoid recording diagnoses or other sensitive medical details."
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        maxLength={1000}
        rows={4}
      />
      <div aria-live="polite" className="empty:hidden">
        {feedback ? <Alert tone={feedback.ok ? "success" : "danger"}>{feedback.message}</Alert> : null}
      </div>
      <Button variant="secondary" onClick={save} loading={pending} disabled={notes === initialNotes}>
        Save notes
      </Button>
    </div>
  );
}
