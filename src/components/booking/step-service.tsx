import { Timer } from "lucide-react";

import { ServiceIcon } from "@/components/service-icon";

import { OptionCard } from "./option-card";
import type { WizardService } from "./types";

export function StepService({
  services,
  selectedId,
  onSelect,
}: {
  services: WizardService[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <fieldset className="min-w-0">
      <legend className="sr-only">Choose a service</legend>
      <div className="grid gap-3 md:grid-cols-2">
        {services.map((service) => (
          <OptionCard
            key={service.id}
            name="service"
            value={service.id}
            checked={selectedId === service.id}
            onChange={onSelect}
            testId={`service-${service.slug}`}
          >
            <div className="flex items-start gap-3.5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-teal-50 text-teal-700">
                <ServiceIcon name={service.icon} className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="font-semibold leading-snug text-ink-900">{service.name}</p>
                <p className="mt-1 text-sm leading-snug text-ink-500">{service.description}</p>
                <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-ink-700">
                  <Timer className="size-3.5" aria-hidden="true" /> About {service.durationMinutes}{" "}
                  minutes
                </p>
              </div>
            </div>
          </OptionCard>
        ))}
      </div>
    </fieldset>
  );
}
