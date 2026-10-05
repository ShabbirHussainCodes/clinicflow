import { ButtonLink, buttonClasses } from "@/components/ui/button";

export function ClosingCta({
  heading,
  text,
  phone,
  phoneHref,
}: {
  heading: string;
  text: string;
  phone: string;
  phoneHref: string;
}) {
  return (
    <section aria-labelledby="cta-heading" className="bg-brand-800 text-brand-50">
      <div className="container-page flex flex-col gap-8 py-14 sm:py-16 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
        <div className="max-w-xl">
          <h2 id="cta-heading" className="text-[1.75rem] text-paper sm:text-[2.25rem]">
            {heading}
          </h2>
          <p className="mt-3 text-lg text-brand-100">{text}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/book" size="lg" variant="light">
            Book an appointment
          </ButtonLink>
          <a href={phoneHref} className={buttonClasses({ variant: "outline-light", size: "lg" })}>
            <span className="tabular-nums">Call {phone}</span>
          </a>
        </div>
      </div>
    </section>
  );
}
