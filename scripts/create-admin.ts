/**
 * Creates (or updates) a clinic administrator.
 *
 *   npm run admin:create -- --email owner@yourclinic.example --name "Dr. Owner"
 *
 * Password: taken from the ADMIN_PASSWORD environment variable, else asked for interactively
 * (hidden input), else - when there is no terminal - generated and printed once. It is never
 * accepted as a command-line argument, so it does not end up in shell history.
 *
 * Connection: reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the environment or .env.local.
 * To target a hosted project, export those two variables for this one command; do not commit them.
 *
 *   --reset-password   change the password of an existing administrator
 *   --deactivate       keep the account but remove dashboard access
 *
 * Public sign-up is disabled in Supabase Auth, so this script (which uses the server-only service
 * role key) is the only way to create a dashboard user.
 */
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { randomBytes } from "node:crypto";
import { createInterface } from "node:readline";

loadEnv({ path: ".env.local", quiet: true });
loadEnv({ path: ".env", quiet: true });

function argValue(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}
const hasFlag = (name: string) => process.argv.includes(`--${name}`);

function fail(message: string): never {
  console.error(`Error: ${message}`);
  process.exit(1);
}

async function askHidden(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const writer = rl as unknown as { _writeToOutput: (text: string) => void };
    process.stdout.write(prompt);
    writer._writeToOutput = () => undefined; // do not echo the password
    rl.question("", (answer) => {
      rl.close();
      process.stdout.write("\n");
      resolve(answer);
    });
  });
}

function validatePassword(password: string): string | null {
  if (password.length < 12) return "Password must be at least 12 characters.";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) return "Password must contain letters and digits.";
  return null;
}

async function main() {
  const email = argValue("email")?.trim().toLowerCase();
  const name = argValue("name")?.trim() ?? "Clinic Administrator";
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) fail("Provide a valid --email address.");
  if (name.length < 2 || name.length > 120) fail("--name must be between 2 and 120 characters.");

  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    fail("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (see .env.example).");
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  // Find an existing account first (listUsers is paginated; clinics have a handful of users).
  let existingId: string | undefined;
  for (let page = 1; page <= 20 && !existingId; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) fail(`Could not list users: ${error.message}`);
    existingId = data.users.find((user) => user.email?.toLowerCase() === email)?.id;
    if (data.users.length < 200) break;
  }

  if (hasFlag("deactivate")) {
    if (!existingId) fail("No such user.");
    const { error } = await supabase.from("admin_profiles").update({ is_active: false }).eq("id", existingId);
    if (error) fail(error.message);
    console.log(`Deactivated dashboard access for ${email}.`);
    return;
  }

  if (existingId && !hasFlag("reset-password")) {
    const { error } = await supabase
      .from("admin_profiles")
      .upsert({ id: existingId, full_name: name, is_active: true });
    if (error) fail(error.message);
    console.log(`${email} already exists; ensured they are an active administrator. (Use --reset-password to change the password.)`);
    return;
  }

  let password = process.env.ADMIN_PASSWORD;
  let generated = false;
  if (!password) {
    if (process.stdin.isTTY) {
      password = await askHidden("Password (min 12 characters, letters and digits): ");
    } else {
      password = `${randomBytes(15).toString("base64url")}9a`;
      generated = true;
    }
  }
  const problem = validatePassword(password);
  if (problem) fail(problem);

  let userId = existingId;
  if (existingId) {
    const { error } = await supabase.auth.admin.updateUserById(existingId, { password, email_confirm: true });
    if (error) fail(`Could not update the password: ${error.message}`);
  } else {
    const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data.user) fail(`Could not create the user: ${error?.message ?? "unknown error"}`);
    userId = data.user.id;
  }

  const { error: profileError } = await supabase
    .from("admin_profiles")
    .upsert({ id: userId as string, full_name: name, is_active: true });
  if (profileError) fail(`Could not create the administrator profile: ${profileError.message}`);

  console.log(`Administrator ready: ${email}`);
  if (generated) {
    console.log(`Generated password (shown once, store it in a password manager): ${password}`);
  }
}

main().catch((error: unknown) => {
  console.error("Unexpected error:", error instanceof Error ? error.message : error);
  process.exit(1);
});
