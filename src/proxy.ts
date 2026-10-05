import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { hardenCookie } from "@/lib/supabase/cookies";

/**
 * Runs before every page request (see `matcher`).
 *
 * 1. Generates a per-request nonce and sets a strict Content-Security-Policy.
 * 2. For /admin routes: refreshes the Supabase session cookies and redirects anonymous visitors to
 *    the login page. This is an optimistic early check only; every admin page and Server Action
 *    re-verifies the administrator on the server (src/lib/auth.ts), and the database enforces it
 *    again with RLS.
 */

function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === "development";
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // The dev server injects un-nonced <style> tags for hot reloading; production uses stylesheets.
    isDev ? "style-src 'self' 'unsafe-inline'" : `style-src 'self' 'nonce-${nonce}'`,
    // Inline style attributes (for example chart bar widths) cannot carry a nonce.
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    // The browser never talks to Supabase: all data access is server-side.
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

const ADMIN_PUBLIC_PATHS = new Set(["/admin/login"]);

export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  let response = NextResponse.next({ request: { headers: requestHeaders } });
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_ANON_KEY;
    if (url && key) {
      const supabase = createServerClient(url, key, {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet, headers) {
            for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
            response = NextResponse.next({ request: { headers: requestHeaders } });
            for (const { name, value, options } of cookiesToSet) {
              response.cookies.set(name, value, hardenCookie(value, options));
            }
            for (const [header, value] of Object.entries(headers))
              response.headers.set(header, value);
          },
        },
      });

      // Validates the token with Supabase Auth and refreshes it when it is about to expire.
      const { data } = await supabase.auth.getUser();

      if (!data.user && !ADMIN_PUBLIC_PATHS.has(pathname)) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/admin/login";
        redirectUrl.search = "";
        const redirectResponse = NextResponse.redirect(redirectUrl);
        redirectResponse.headers.set("Content-Security-Policy", csp);
        redirectResponse.headers.set("Cache-Control", "private, no-store");
        return redirectResponse;
      }
    }
    response.headers.set("Cache-Control", "private, no-store");
  }

  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
