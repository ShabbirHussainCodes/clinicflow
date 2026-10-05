import type { Testimonial } from "@/config/site";

export function Testimonials({ items, note }: { items: Testimonial[]; note: string | null }) {
  return (
    <section aria-labelledby="voices-heading" className="py-16 sm:py-20 lg:py-24">
      <div className="container-page grid gap-10 lg:grid-cols-[18rem_1fr] lg:gap-16">
        <div>
          <p className="eyebrow eyebrow-rule mb-4">Patients</p>
          <h2 id="voices-heading" className="text-[1.75rem] sm:text-[2.25rem]">
            What patients say
          </h2>
          {note ? <p className="mt-4 text-sm text-ink-500">{note}</p> : null}
        </div>
        <ul className="divide-y divide-sand-200 border-y border-sand-200">
          {items.map((item) => (
            <li key={item.name} className="py-8 first:pt-7">
              <figure>
                <blockquote className="max-w-2xl font-display text-[1.375rem] leading-snug text-ink-900 sm:text-[1.5rem]">
                  &ldquo;{item.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-4 text-sm">
                  <span className="font-semibold text-ink-900">{item.name}</span>
                  <span className="text-ink-500"> &middot; {item.context}</span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
