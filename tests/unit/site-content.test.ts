import { describe, expect, it } from "vitest";

import { siteContent } from "@/config/site";

/** Every string a clinic can edit in src/config/site.ts, so typos are caught before they ship. */
function allText(): string[] {
  const { hero, about, testimonials, faqs, cta, testimonialsNote, registration, credit } =
    siteContent;
  return [
    hero.headline,
    hero.subheadline,
    about?.heading,
    ...(about?.paragraphs ?? []),
    ...(about?.facilities ?? []),
    ...testimonials.flatMap((item) => [item.quote, item.name, item.context]),
    testimonialsNote,
    ...faqs.flatMap((item) => [item.question, item.answer]),
    cta.heading,
    cta.text,
    registration,
    credit,
  ].filter((value): value is string => typeof value === "string");
}

const KNOWN_PLACEHOLDERS = new Set(["clinic", "city", "locality", "phone", "email", "year"]);

describe("site content (src/config/site.ts)", () => {
  it("only uses placeholders that exist", () => {
    for (const text of allText()) {
      for (const [, name] of text.matchAll(/\{(\w+)\}/g)) {
        expect(
          KNOWN_PLACEHOLDERS.has(name ?? ""),
          `unknown placeholder {${name}} in "${text}"`,
        ).toBe(true);
      }
    }
  });

  it("has no empty text, which would render as a blank gap", () => {
    for (const text of allText()) expect(text.trim(), "empty text").not.toBe("");
  });

  it("uses {year} only when an establishment year is set", () => {
    if (siteContent.establishedYear !== null) return;
    expect(allText().filter((text) => text.includes("{year}"))).toEqual([]);
  });

  it("has unique questions and people, because they are used as list keys", () => {
    const questions = siteContent.faqs.map((item) => item.question);
    expect(new Set(questions).size).toBe(questions.length);
    const names = siteContent.testimonials.map((item) => item.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it("keeps the WhatsApp number in international digits when set", () => {
    if (siteContent.whatsapp === null) return;
    expect(siteContent.whatsapp).toMatch(/^\d{10,15}$/);
  });

  it("only links to https addresses", () => {
    for (const link of siteContent.social) expect(link.href).toMatch(/^https:\/\//);
    if (siteContent.mapsUrl) expect(siteContent.mapsUrl).toMatch(/^https:\/\//);
  });
});
