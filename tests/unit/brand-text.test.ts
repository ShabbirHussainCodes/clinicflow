import { describe, expect, it } from "vitest";

import { initialsOf, monogramOf, splitClinicName } from "@/lib/brand-text";

describe("splitClinicName", () => {
  it("separates a trailing descriptor from the name", () => {
    expect(splitClinicName("Sanjeevani Family Clinic")).toEqual({
      primary: "Sanjeevani",
      descriptor: "Family Clinic",
    });
    expect(splitClinicName("Lakeview Medical Centre")).toEqual({
      primary: "Lakeview",
      descriptor: "Medical Centre",
    });
    expect(splitClinicName("Dr. Rao's Skin Clinic")).toEqual({
      primary: "Dr. Rao's",
      descriptor: "Skin Clinic",
    });
  });

  it("keeps a name without a descriptor on one line", () => {
    expect(splitClinicName("Asha Health")).toEqual({ primary: "Asha Health", descriptor: null });
    expect(splitClinicName("Clinic")).toEqual({ primary: "Clinic", descriptor: null });
    expect(splitClinicName("  Sunrise  ")).toEqual({ primary: "Sunrise", descriptor: null });
  });
});

describe("monogramOf", () => {
  it("uses the first letter of the first real word", () => {
    expect(monogramOf("Sanjeevani Family Clinic")).toBe("S");
    expect(monogramOf("Dr. Rao's Clinic")).toBe("R");
    expect(monogramOf("The Wellness Centre")).toBe("W");
  });
});

describe("initialsOf", () => {
  it("uses first and last name", () => {
    expect(initialsOf("Dr. Meera Iyer")).toBe("MI");
    expect(initialsOf("Dr. Arjun Kumar Deshmukh")).toBe("AD");
    expect(initialsOf("Dr Sunita Menon")).toBe("SM");
  });
  it("copes with a single name", () => {
    expect(initialsOf("Dr. Rao")).toBe("R");
  });
});
