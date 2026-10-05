import { SectionHeading } from "@/components/ui/card";

const STEPS = [
  {
    title: "Choose a service",
    text: "Tell us what you need, from a general consultation to a child health check-up.",
  },
  {
    title: "Pick your doctor",
    text: "See who offers that service and when they are in the clinic.",
  },
  {
    title: "Select a time",
    text: "Only open times are shown, so the time you choose is the time you get.",
  },
  {
    title: "Get your reference",
    text: "Enter your name and mobile number and receive a booking reference at once.",
  },
] as const;

export function HowItWorks() {
  return (
    <section aria-labelledby="how-heading" className="bg-sand-50 py-16 sm:py-20 lg:py-24">
      <div className="container-page">
        <SectionHeading
          id="how-heading"
          eyebrow="How booking works"
          title="Four steps, about a minute"
          description="No phone call, no account and no waiting for a call back."
        />
        <ol className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {STEPS.map((step, index) => (
            <li key={step.title} className="border-t border-ink-900 pt-5">
              <span className="font-display text-[1.75rem] font-medium leading-none tabular-nums text-brand-700">
                {index + 1}
              </span>
              <h3 className="mt-4 font-sans text-lg font-semibold tracking-normal">{step.title}</h3>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-ink-700">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
