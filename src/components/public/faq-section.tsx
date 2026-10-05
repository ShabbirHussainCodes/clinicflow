import { Plus } from "lucide-react";

import type { Faq } from "@/config/site";

export function FaqSection({ items, phone }: { items: Faq[]; phone: string }) {
  return (
    <section id="faq" aria-labelledby="faq-heading" className="bg-sand-50 py-16 sm:py-20 lg:py-24">
      <div className="container-page grid gap-10 lg:grid-cols-[18rem_1fr] lg:gap-16">
        <div>
          <p className="eyebrow eyebrow-rule mb-4">Questions</p>
          <h2 id="faq-heading" className="text-[1.75rem] sm:text-[2.25rem]">
            Before you book
          </h2>
          <p className="mt-4 text-ink-700">
            Something not covered here? Call us on{" "}
            <span className="whitespace-nowrap tabular-nums">{phone}</span>.
          </p>
        </div>
        <div className="divide-y divide-sand-200 border-y border-sand-200">
          {items.map((item) => (
            <details key={item.question} className="group">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-6 py-3 text-[1.0625rem] font-semibold text-ink-900 marker:hidden [&::-webkit-details-marker]:hidden">
                {item.question}
                <Plus
                  className="size-5 shrink-0 text-brand-700 transition-transform duration-200 group-open:rotate-45"
                  aria-hidden="true"
                />
              </summary>
              <p className="max-w-2xl pb-6 pr-10 text-ink-700">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
