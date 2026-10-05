import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { Database } from "../src/lib/supabase/database.types";

export const STATE_FILE = resolve(process.cwd(), ".e2e-state.json");

export interface E2eState {
  adminEmail: string;
  adminPassword: string;
}

export function readState(): E2eState {
  return JSON.parse(readFileSync(STATE_FILE, "utf8")) as E2eState;
}

/** Service-role client for test setup and assertions only (never used by the app under test). */
export function serviceClient(): SupabaseClient<Database> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing. Run `npm run env:local` first.");
  }
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}

/** A syntactically valid Indian mobile number that is unique per call. */
export function uniquePhone(): string {
  const tail = String(Math.floor(Math.random() * 1e8)).padStart(8, "0");
  return `98${tail}`.replace(/^(\d)\1+$/, "9876543210");
}
