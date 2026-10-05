import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { ConfigError, getEnv } from "@/lib/env";
import { hardenCookie } from "@/lib/supabase/cookies";
import type { Database } from "@/lib/supabase/database.types";

export type AppSupabaseClient = SupabaseClient<Database>;

/**
 * Anonymous client with no session. Used for everything the public site does: reading published
 * clinic content and calling the public booking functions. Row Level Security and function
 * grants decide what it may see.
 */
export function createPublicClient(): AppSupabaseClient {
  const env = getEnv();
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

/**
 * Client bound to the visitor's auth cookies. Used by the admin area; every query runs with the
 * signed-in administrator's JWT, so the database's RLS policies apply to it.
 */
export async function createSessionClient(): Promise<AppSupabaseClient> {
  const env = getEnv();
  const cookieStore = await cookies();
  return createServerClient<Database>(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, hardenCookie(value, options));
          }
        } catch {
          // Called from a Server Component, where cookies are read-only. The proxy
          // (src/proxy.ts) refreshes the session on every request, so this is safe to ignore.
        }
      },
    },
  });
}

/**
 * Privileged client that bypasses Row Level Security. Server-only and used in exactly two places:
 * the automation dispatcher route and the administrator-creation script. Never import this from
 * UI code.
 */
export function createServiceClient(): AppSupabaseClient {
  const env = getEnv();
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new ConfigError("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }
  return createClient<Database>(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
