import { afterEach, describe, expect, it, vi } from "vitest";

import { describeError, logger } from "@/lib/logger";

afterEach(() => vi.restoreAllMocks());

describe("logger", () => {
  it("redacts keys that could carry personal data", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    logger.warn("test.event", {
      reference: "CF-AAAAA-BBBBB",
      patient_name: "Priya Nair",
      patientPhone: "+919876543210",
      email: "priya@example.com",
      visitReason: "private",
      count: 3,
    });
    const line = JSON.parse(String(spy.mock.calls[0]?.[0])) as Record<string, unknown>;
    expect(line).toMatchObject({
      level: "warn",
      event: "test.event",
      reference: "CF-AAAAA-BBBBB",
      patient_name: "[redacted]",
      patientPhone: "[redacted]",
      email: "[redacted]",
      visitReason: "[redacted]",
      count: 3,
    });
    expect(JSON.stringify(line)).not.toContain("Priya");
    expect(JSON.stringify(line)).not.toContain("9876543210");
  });

  it("reduces errors to name, message and code only", () => {
    const error = Object.assign(new Error("duplicate key"), {
      code: "23505",
      detail: "Key (patient_phone)=(+9198...) exists",
    });
    expect(describeError(error)).toEqual({
      name: "Error",
      message: "duplicate key",
      code: "23505",
    });
    expect(describeError({ message: "x", code: "42501", hint: "secret" })).toEqual({
      name: "Error",
      message: "x",
      code: "42501",
    });
    expect(describeError("weird")).toEqual({ name: "Error", message: "Unknown error" });
  });

  it("truncates very long error messages", () => {
    expect(describeError(new Error("x".repeat(1000))).message).toHaveLength(300);
  });
});
