import { describe, expect, it } from "vitest";

import {
  MIN_HUMAN_ELAPSED_MS,
  bookingSubmissionSchema,
  formatIndianMobile,
  normalizeIndianMobile,
  normalizeReference,
  patientDetailsSchema,
  toFieldErrors,
} from "@/lib/validation/booking";

describe("normalizeIndianMobile", () => {
  it.each([
    ["98765 43210", "+919876543210"],
    ["9876543210", "+919876543210"],
    ["+91 98765-43210", "+919876543210"],
    ["919876543210", "+919876543210"],
    ["09876543210", "+919876543210"],
    ["(98765) 43210", "+919876543210"],
    ["6000000001", "+916000000001"],
  ])("accepts %s", (input, expected) => {
    expect(normalizeIndianMobile(input)).toBe(expected);
  });

  it.each([
    "",
    "12345",
    "5876543210", // must start with 6-9
    "98765432101", // too long
    "+1 415 555 0100",
    "9999999999", // repeated digit
    "abcdefghij",
    "98765 4321",
  ])("rejects %j", (input) => {
    expect(normalizeIndianMobile(input)).toBeNull();
  });

  it("formats E.164 numbers for display", () => {
    expect(formatIndianMobile("+919876543210")).toBe("+91 98765 43210");
    expect(formatIndianMobile("+14155550100")).toBe("+14155550100");
  });
});

describe("patientDetailsSchema", () => {
  const valid = {
    fullName: "  Priya   Nair ",
    mobile: "98765 43210",
    email: "Priya@Example.com ",
    ageRange: "31-45",
    visitReason: "Routine   check-up",
    consent: true,
  };

  it("normalises a valid submission", () => {
    const result = patientDetailsSchema.parse(valid);
    expect(result).toEqual({
      fullName: "Priya Nair",
      mobile: "+919876543210",
      email: "priya@example.com",
      ageRange: "31-45",
      visitReason: "Routine check-up",
      consent: true,
    });
  });

  it("treats blank optional fields as absent", () => {
    const result = patientDetailsSchema.parse({
      ...valid,
      email: "",
      ageRange: "",
      visitReason: "  ",
    });
    expect(result.email).toBeUndefined();
    expect(result.ageRange).toBeUndefined();
    expect(result.visitReason).toBeUndefined();
  });

  it("accepts names with apostrophes, hyphens and non-Latin letters", () => {
    for (const fullName of [
      "Ananya D'Souza",
      "Mary-Anne Fernandes",
      "राहुल शर्मा",
      "Dr. A. P. J.",
    ]) {
      expect(patientDetailsSchema.safeParse({ ...valid, fullName }).success, fullName).toBe(true);
    }
  });

  it.each([
    ["fullName", { fullName: "A" }],
    ["fullName", { fullName: "12345" }],
    ["fullName", { fullName: "x".repeat(101) }],
    ["fullName", { fullName: "Robert'); DROP TABLE appointments;--" }],
    ["mobile", { mobile: "12345" }],
    ["email", { email: "not-an-email" }],
    ["ageRange", { ageRange: "200" }],
    ["visitReason", { visitReason: "x".repeat(301) }],
    ["consent", { consent: false }],
  ])("reports an error beside %s", (field, patch) => {
    const result = patientDetailsSchema.safeParse({ ...valid, ...patch });
    expect(result.success).toBe(false);
    if (!result.success) expect(Object.keys(toFieldErrors(result.error))).toContain(field);
  });

  it("strips control characters from the free-text reason", () => {
    const result = patientDetailsSchema.parse({
      ...valid,
      visitReason: "fever\u0000\u0007 and cold",
    });
    expect(result.visitReason).toBe("fever and cold");
  });

  it("requires a mobile number and consent when fields are missing entirely", () => {
    const result = patientDetailsSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = toFieldErrors(result.error);
      expect(errors.fullName).toBeTruthy();
      expect(errors.mobile).toBeTruthy();
      expect(errors.consent).toBeTruthy();
    }
  });
});

describe("bookingSubmissionSchema", () => {
  const base = {
    doctorId: "6f1c3c52-0a3a-4a45-9e4d-6a3a8d2b1c11",
    serviceId: "0b7b5f60-5a37-4d44-8f7a-1b1d0d0b2c22",
    startAt: "2026-10-12T04:50:00+00:00",
    details: {
      fullName: "Priya Nair",
      mobile: "9876543210",
      email: "",
      ageRange: "",
      visitReason: "",
      consent: true,
    },
    elapsedMs: 20_000,
  };

  it("accepts a complete submission and defaults the honeypot", () => {
    const parsed = bookingSubmissionSchema.parse(base);
    expect(parsed.website).toBe("");
    expect(parsed.details.mobile).toBe("+919876543210");
  });

  it("rejects a filled honeypot at the schema level", () => {
    expect(
      bookingSubmissionSchema.safeParse({ ...base, website: "http://spam.example" }).success,
    ).toBe(false);
  });

  it("rejects malformed identifiers and instants", () => {
    expect(bookingSubmissionSchema.safeParse({ ...base, doctorId: "1" }).success).toBe(false);
    expect(bookingSubmissionSchema.safeParse({ ...base, startAt: "tomorrow" }).success).toBe(false);
  });

  it("exposes the minimum human interval used by the server action", () => {
    expect(MIN_HUMAN_ELAPSED_MS).toBeGreaterThanOrEqual(2000);
  });
});

describe("normalizeReference", () => {
  it("accepts well-formed references in any case", () => {
    expect(normalizeReference("CF-7K4MP-9QXD2")).toBe("CF-7K4MP-9QXD2");
    expect(normalizeReference(" cf-7k4mp-9qxd2 ")).toBe("CF-7K4MP-9QXD2");
  });
  it("rejects guessable or malformed values", () => {
    for (const value of [
      "12345",
      "CF-1234",
      "CF-OOOOO-IIIII",
      "../../etc/passwd",
      "CF-7K4MP-9QXD2-EXTRA",
    ]) {
      expect(normalizeReference(value), value).toBeNull();
    }
  });
});
