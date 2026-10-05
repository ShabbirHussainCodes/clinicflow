import { describe, expect, it } from "vitest";

import { fillText, localityOf, telHref } from "@/lib/site-text";

const clinic = {
  name: "Sanjeevani Family Clinic",
  city: "Pune",
  address_line2: "Shanti Nagar",
  phone: "+91 90000 00142",
  email: "hello@sanjeevani-clinic.example",
};

describe("fillText", () => {
  it("fills every known placeholder", () => {
    expect(
      fillText(
        "{clinic} in {locality}, {city} since {year}. Call {phone} or write to {email}.",
        clinic,
        2011,
      ),
    ).toBe(
      "Sanjeevani Family Clinic in Shanti Nagar, Pune since 2011. Call +91\u00a090000\u00a000142 or write to hello@sanjeevani-clinic.example.",
    );
  });

  it("keeps a phone number on one line by using non-breaking spaces", () => {
    const filled = fillText("{phone}", clinic, 2011);
    expect(filled).not.toContain(" ");
    expect(filled.replaceAll("\u00a0", " ")).toBe("+91 90000 00142");
  });

  it("leaves unknown placeholders and a missing year visible instead of hiding them", () => {
    expect(fillText("{nonsense} {year}", clinic, null)).toBe("{nonsense} {year}");
  });

  it("returns text without placeholders unchanged", () => {
    expect(fillText("Plain text.", clinic, 2011)).toBe("Plain text.");
  });
});

describe("localityOf", () => {
  it("prefers the second address line and falls back to the city", () => {
    expect(localityOf(clinic)).toBe("Shanti Nagar");
    expect(localityOf({ address_line2: null, city: "Pune" })).toBe("Pune");
    expect(localityOf({ address_line2: "  ", city: "Pune" })).toBe("Pune");
  });
});

describe("telHref", () => {
  it("strips spaces and punctuation", () => {
    expect(telHref("+91 90000 00142")).toBe("tel:+919000000142");
    expect(telHref("(020) 2345-6789")).toBe("tel:02023456789");
  });
});
