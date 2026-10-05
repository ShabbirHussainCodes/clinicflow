import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";

import { STATE_FILE, serviceClient, type E2eState } from "./support";

/**
 * Creates (or resets the password of) a dedicated administrator for the tests. The password is
 * random on every run and kept only in a git-ignored file, so no credential is ever committed.
 */
export default async function globalSetup() {
  const supabase = serviceClient();
  const email = "e2e-admin@clinicflow.test";
  const password = `Pw-${randomBytes(12).toString("hex")}`;

  const { data: existing } = await supabase.auth.admin.listUsers({ page: 1, perPage: 200 });
  const found = existing?.users.find((user) => user.email === email);

  let userId: string;
  if (found) {
    const { error } = await supabase.auth.admin.updateUserById(found.id, { password, email_confirm: true });
    if (error) throw error;
    userId = found.id;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) throw error ?? new Error("Could not create the e2e administrator");
    userId = data.user.id;
  }

  const { error: profileError } = await supabase
    .from("admin_profiles")
    .upsert({ id: userId, full_name: "E2E Administrator", is_active: true });
  if (profileError) throw profileError;

  const state: E2eState = { adminEmail: email, adminPassword: password };
  writeFileSync(STATE_FILE, JSON.stringify(state), { mode: 0o600 });
}
