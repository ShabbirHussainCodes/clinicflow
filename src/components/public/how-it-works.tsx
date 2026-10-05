import { CalendarClock, CircleCheck, ClipboardList, UserRound } from "lucide-react";

import { SectionHeading } from "@/components/ui/card";

const STEPS = [
  {
    icon: ClipboardList,
    title: "Choose a service",
    text: "Tell us what you need, from a general consultation to a child health check-up.",
  },
  {
    icon: UserRound,
    title: "Pick your doctor",
    text: "See who offers that service and when they are in clinic.",
  },
  {
    icon: CalendarClock,
    title: "Select a time",
    text: "Only real, open slots are shown, so the time you choose is the time you get.",
  },
  {
    icon: CircleCheck,
    title: "Get your reference",
    text: "Enter your contact details and receive a booking reference immediately.",
  },
] as const;

export function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="container-page py-20 sm:py-24">
      <SectionHeading
        id="how-heading"
        eyebrow="How booking works"
        title="Four simple steps. About a minute."
        description="No phone calls, no accounts, no waiting for a callback."
      />
      <ol className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((step, index) => (
          <li
            key={step.title}
            className="relative rounded-lg border border-sand-200 bg-surface p-6 shadow-card"
          >
            <span className="font-display text-5xl font-semibold leading-none text-teal-100">
              {index + 1}
            </span>
            <step.icon className="mt-4 size-6 text-teal-700" aria-hidden="true" />
            <h3 className="mt-3 font-sans text-lg font-semibold tracking-normal">{step.title}</h3>
            <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-ink-700">{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
