import { beforeEach, describe, expect, it } from "vitest";

import { clientIpFrom, rateLimit, resetRateLimits } from "@/lib/rate-limit";

beforeEach(() => resetRateLimits());

describe("rateLimit", () => {
  it("allows up to the limit then blocks with a retry hint", () => {
    const t0 = 1_000_000;
    expect(rateLimit("k", 3, 60_000, t0).allowed).toBe(true);
    expect(rateLimit("k", 3, 60_000, t0 + 1_000).allowed).toBe(true);
    const third = rateLimit("k", 3, 60_000, t0 + 2_000);
    expect(third).toMatchObject({ allowed: true, remaining: 0 });

    const blocked = rateLimit("k", 3, 60_000, t0 + 3_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(57);
  });

  it("recovers once old hits leave the window", () => {
    const t0 = 5_000_000;
    for (let i = 0; i < 2; i += 1) rateLimit("k", 2, 10_000, t0);
    expect(rateLimit("k", 2, 10_000, t0 + 5_000).allowed).toBe(false);
    expect(rateLimit("k", 2, 10_000, t0 + 10_001).allowed).toBe(true);
  });

  it("keeps keys independent", () => {
    const t0 = 9_000_000;
    rateLimit("a", 1, 10_000, t0);
    expect(rateLimit("a", 1, 10_000, t0).allowed).toBe(false);
    expect(rateLimit("b", 1, 10_000, t0).allowed).toBe(true);
  });
});

describe("clientIpFrom", () => {
  const headers = (map: Record<string, string>) => ({
    get: (name: string) => map[name.toLowerCase()] ?? null,
  });

  it("uses the left-most forwarded address", () => {
    expect(clientIpFrom(headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }))).toBe(
      "203.0.113.9",
    );
  });
  it("falls back to x-real-ip and then to unknown", () => {
    expect(clientIpFrom(headers({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
    expect(clientIpFrom(headers({}))).toBe("unknown");
  });
  it("ignores absurdly long values", () => {
    expect(clientIpFrom(headers({ "x-forwarded-for": "x".repeat(200) }))).toBe("unknown");
  });
});
