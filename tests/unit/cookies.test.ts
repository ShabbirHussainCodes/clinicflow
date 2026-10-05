import { describe, expect, it } from "vitest";

import {
  SESSION_MAX_AGE_SECONDS,
  hardenCookie,
  type CookieOptionsLike,
} from "@/lib/supabase/cookies";

const harden = (value: string, options: CookieOptionsLike, production: boolean) =>
  hardenCookie<CookieOptionsLike>(value, options, production);

describe("hardenCookie", () => {
  it("makes session cookies HttpOnly, SameSite=Lax and Secure in production", () => {
    const result = harden("token", { path: "/", maxAge: 34_560_000, httpOnly: false }, true);
    expect(result).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", path: "/" });
  });

  it("does not require HTTPS in development so localhost sign-in works", () => {
    expect(harden("token", {}, false).secure).toBe(false);
  });

  it("caps the lifetime at seven days but never lengthens a shorter one", () => {
    expect(harden("t", { maxAge: 400 * 86_400 }, true).maxAge).toBe(SESSION_MAX_AGE_SECONDS);
    expect(harden("t", { maxAge: 3600 }, true).maxAge).toBe(3600);
    expect(harden("t", {}, true).maxAge).toBe(SESSION_MAX_AGE_SECONDS);
  });

  it("keeps deletion cookies deleting (maxAge 0 / empty value) so sign-out works", () => {
    expect(harden("", { maxAge: 0 }, true).maxAge).toBe(0);
    expect(harden("", {}, true)).not.toHaveProperty("maxAge");
    expect(harden("x", { maxAge: 0 }, true).maxAge).toBe(0);
  });
});
