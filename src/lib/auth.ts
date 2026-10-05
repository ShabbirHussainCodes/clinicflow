import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";

import { createSessionClient, type AppSupabaseClient } from "@/lib/supabase/clients";

export interface AdminSession {
  userId: string;
  email: string;
  fullName: string;
}

/**
 * Resolves the signed-in administrator, or null.
 *
 * Uses auth.getUser(), which validates the JWT with the Supabase Auth server, rather than trusting
 * the cookie contents. Being signed in is not enough: the user must also have an active row in
 * admin_profiles, so a stray Supabase account (for example created by an enabled sign-up setting)
 * never reaches the dashboard. The database enforces the same rule again through RLS.
 */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const supabase = await createSessionClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;

  const { data: profile, error: profileError } = await supabase
    .from("admin_profiles")
    .select("id, full_name, is_active")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !profile || !profile.is_active) return null;

  return { userId: profile.id, email: data.user.email ?? "", fullName: profile.full_name };
});

/** For pages and layouts: redirect to the login page when not an administrator. */
export async function requireAdmin(): Promise<AdminSession> {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return session;
}

/** For Server Actions: returns the session plus a client that carries the admin's JWT. */
export async function requireAdminClient(): Promise<{
  session: AdminSession;
  supabase: AppSupabaseClient;
}> {
  const session = await requireAdmin();
  const supabase = await createSessionClient();
  return { session, supabase };
}
