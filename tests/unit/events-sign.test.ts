import { describe, expect, it } from "vitest";

import { signPayload, verifySignature } from "@/lib/events/sign";

const secret = "a-long-shared-secret-value";
const body = JSON.stringify({ id: "evt_1", type: "appointment.created" });

describe("webhook signatures", () => {
  it("is deterministic and versioned", () => {
    const a = signPayload(secret, "1700000000", body);
    expect(a).toBe(signPayload(secret, "1700000000", body));
    expect(a).toMatch(/^v1=[0-9a-f]{64}$/);
  });

  it("verifies a genuine request", () => {
    const now = 1_700_000_100_000;
    const signature = signPayload(secret, "1700000000", body);
    expect(verifySignature(secret, "1700000000", body, signature, { now })).toBe(true);
  });

  it("rejects a modified body, wrong secret or tampered timestamp", () => {
    const now = 1_700_000_100_000;
    const signature = signPayload(secret, "1700000000", body);
    expect(verifySignature(secret, "1700000000", body + " ", signature, { now })).toBe(false);
    expect(verifySignature("other-secret-value-xx", "1700000000", body, signature, { now })).toBe(
      false,
    );
    expect(verifySignature(secret, "1700000001", body, signature, { now })).toBe(false);
  });

  it("rejects replayed requests outside the tolerance window", () => {
    const signature = signPayload(secret, "1700000000", body);
    expect(
      verifySignature(secret, "1700000000", body, signature, { now: 1_700_000_000_000 + 301_000 }),
    ).toBe(false);
    expect(
      verifySignature(secret, "1700000000", body, signature, { now: 1_700_000_000_000 + 299_000 }),
    ).toBe(true);
  });

  it("rejects malformed signatures and timestamps without throwing", () => {
    expect(
      verifySignature(secret, "1700000000", body, "v1=short", { now: 1_700_000_000_000 }),
    ).toBe(false);
    expect(verifySignature(secret, "not-a-number", body, "v1=abc")).toBe(false);
  });
});
