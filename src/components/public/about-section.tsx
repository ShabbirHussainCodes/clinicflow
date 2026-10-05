import Image from "next/image";
import { Check } from "lucide-react";

export function AboutSection({
  heading,
  paragraphs,
  facilities,
  image,
}: {
  heading: string;
  paragraphs: string[];
  facilities: string[];
  image: string | null;
}) {
  return (
    <section
      id="about"
      aria-labelledby="about-heading"
      className="bg-sand-50 py-16 sm:py-20 lg:py-24"
    >
      <div className="container-page grid gap-12 lg:grid-cols-[1fr_25rem] lg:gap-20">
        <div>
          <p className="eyebrow eyebrow-rule mb-4">About us</p>
          <h2 id="about-heading" className="text-[1.75rem] sm:text-[2.25rem]">
            {heading}
          </h2>
          <div className="mt-6 max-w-[38rem] space-y-5 text-[1.0625rem] leading-[1.75] text-ink-700">
            {paragraphs.map((text) => (
              <p key={text}>{text}</p>
            ))}
          </div>
        </div>

        <div>
          {image ? (
            <div className="relative mb-8 aspect-[4/3] overflow-hidden rounded-md bg-sand-100">
              <Image
                src={image}
                alt=""
                fill
                sizes="(min-width: 1024px) 400px, 92vw"
                className="object-cover"
              />
            </div>
          ) : null}
          {facilities.length > 0 ? (
            <>
              <h3 className="eyebrow font-sans">At the clinic</h3>
              <ul className="mt-4 divide-y divide-sand-200 border-y border-sand-200">
                {facilities.map((item) => (
                  <li key={item} className="flex gap-3 py-3.5 text-[0.9375rem] text-ink-900">
                    <Check className="mt-1 size-4 shrink-0 text-brand-600" aria-hidden="true" />
                    {item}
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </div>
    </section>
  );
}
