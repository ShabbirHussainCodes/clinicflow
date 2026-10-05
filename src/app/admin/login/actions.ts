"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { getAdminSession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { getEnv } from "@/lib/env";
import { clientIpFrom, rateLimit } from "@/lib/rate-limit";
import { createSessionClient } from "@/lib/supabase/clients";
import { loginSchema } from "@/lib/validation/admin";
import { toFieldErrors, type FieldErrors } from "@/lib/validation/booking";

export interface LoginState {
  error?: string;
  fieldErrors?: FieldErrors;
  email?: string;
}

/** Only allow redirects to admin pages on this site (prevents open redirects). */
function safeAdminPath(value: FormDataEntryValue | null): string {
  const path = typeof value === "string" ? value : "";
  return path.startsWith("/admin") && !path.startsWith("//") && !path.includes("\\") && !path.startsWith("/admin/login")
    ? path
    : "/admin";
}

const GENERIC_FAILURE = "That email and password combination wasn't recognised. Please try again.";

export async function signIn(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const raw = { email: formData.get("email"), password: formData.get("password") };
  const parsed = loginSchema.safeParse(raw);
  const email = typeof raw.email === "string" ? raw.email : "";
  if (!parsed.success) {
    return { fieldErrors: toFieldErrors(parsed.error), email };
  }

  // Throttle password guessing per address and per client, on top of Supabase Auth's own limits.
  const ip = clientIpFrom(await headers());
  const perEmail = getEnv().LOGIN_ATTEMPTS_PER_15_MIN;
  const byIp = rateLimit(`login-ip:${ip}`, perEmail * 4, 15 * 60 * 1000);
  const byEmail = rateLimit(`login-email:${parsed.data.email}`, perEmail, 15 * 60 * 1000);
  if (!byIp.allowed || !byEmail.allowed) {
    logger.warn("admin.login_rate_limited");
    return {
      error: "Too many sign-in attempts. Please wait a few minutes and try again.",
      email: parsed.data.email,
    };
  }

  const supabase = await createSessionClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    // Same message for every failure so the form cannot be used to discover valid accounts.
    logger.warn("admin.login_failed", { code: error.code ?? "unknown" });
    return { error: GENERIC_FAILURE, email: parsed.data.email };
  }

  // Signing in is not enough: the account must be an active administrator.
  const session = await getAdminSession();
  if (!session) {
    await supabase.auth.signOut();
    logger.warn("admin.login_not_an_admin");
    return { error: GENERIC_FAILURE, email: parsed.data.email };
  }

  logger.info("admin.login_succeeded");
  redirect(safeAdminPath(formData.get("next")));
}
