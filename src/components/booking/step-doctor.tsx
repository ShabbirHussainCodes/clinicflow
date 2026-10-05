import { DoctorPortrait } from "@/components/public/doctor-portrait";
import { Alert } from "@/components/ui/feedback";

import { OptionCard } from "./option-card";
import type { WizardDoctor } from "./types";

export function StepDoctor({
  doctors,
  selectedId,
  onSelect,
}: {
  doctors: WizardDoctor[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (doctors.length === 0) {
    return (
      <Alert tone="warning" title="No doctors available for this service">
        Please choose a different service, or call the clinic and we will help you book.
      </Alert>
    );
  }
  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">Choose a doctor</legend>
      <div className="grid gap-3 md:grid-cols-2">
        {doctors.map((doctor) => (
          <OptionCard
            key={doctor.id}
            name="doctor"
            value={doctor.id}
            checked={selectedId === doctor.id}
            onChange={onSelect}
            testId={`doctor-${doctor.slug}`}
          >
            <div className="flex items-start gap-4">
              <div className="w-16 shrink-0">
                <DoctorPortrait
                  name={doctor.name}
                  photoUrl={doctor.photoUrl}
                  tone={doctor.tone}
                  sizes="64px"
                  className="rounded-sm"
                  initialsClassName="text-2xl"
                />
              </div>
              <div className="min-w-0">
                <p className="font-semibold leading-snug text-ink-900">{doctor.name}</p>
                <p className="text-sm font-semibold text-brand-700">{doctor.specialization}</p>
                <p className="text-sm text-ink-500">
                  {doctor.qualification} · {doctor.experienceYears} yrs
                </p>
                <p className="mt-2 text-xs leading-snug text-ink-700">
                  {doctor.availability.map((line) => `${line.days} ${line.hours}`).join(" · ")}
                </p>
              </div>
            </div>
          </OptionCard>
        ))}
      </div>
    </fieldset>
  );
}
