/**
 * Hardens the auth cookies written by @supabase/ssr.
 *
 * The library's defaults make the cookies readable by JavaScript because its *browser* client
 * needs that. ClinicFlow never creates a browser client (all data access is server-side), so the
 * session cookies can be HttpOnly: an XSS bug can then no longer read the tokens. They are also
 * Secure in production and capped at seven days, so a stolen laptop is not a permanent session.
 */

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export interface CookieOptionsLike {
  maxAge?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: boolean | "lax" | "strict" | "none";
  path?: string;
  [key: string]: unknown;
}

export function hardenCookie<T extends CookieOptionsLike>(
  value: string,
  options: T,
  production: boolean = process.env.NODE_ENV === "production",
): T {
  const removing = value === "" || options.maxAge === 0;
  return {
    ...options,
    httpOnly: true,
    secure: production,
    sameSite: "lax",
    // Never extend the lifetime of a cookie that is being deleted.
    ...(removing
      ? {}
      : { maxAge: Math.min(options.maxAge ?? SESSION_MAX_AGE_SECONDS, SESSION_MAX_AGE_SECONDS) }),
  };
}
