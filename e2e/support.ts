import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import type { Database } from "../src/lib/supabase/database.types";

export const STATE_FILE = resolve(process.cwd(), ".e2e-state.json");

export interface E2eState {
  adminEmail: string;
  adminPassword: string;
  /** A valid Supabase account that is deliberately NOT a clinic administrator. */
  outsiderEmail: string;
  outsiderPassword: string;
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

/** Local calendar date (YYYY-MM-DD) of an instant in the clinic timezone. */
export function clinicDate(instant: string, timeZone = "Asia/Kolkata"): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(instant),
  );
}

export interface FreeSlot {
  doctorId: string;
  serviceId: string;
  date: string;
  start: string;
}

/** Finds a genuinely bookable slot through the same public RPCs the website uses. */
export async function findFreeSlot(doctorSlug: string, serviceSlug: string, skip = 0): Promise<FreeSlot> {
  const supabase = serviceClient();
  const { data: doctor } = await supabase.from("doctors").select("id").eq("slug", doctorSlug).single();
  const { data: service } = await supabase.from("services").select("id").eq("slug", serviceSlug).single();
  if (!doctor || !service) throw new Error("Seed data missing: run `npm run db:reset`.");

  const today = clinicDate(new Date().toISOString());
  const to = new Date(Date.now() + 40 * 86_400_000).toISOString().slice(0, 10);
  const { data: dates, error } = await supabase.rpc("get_available_dates", {
    p_doctor_id: doctor.id,
    p_service_id: service.id,
    p_from: today,
    p_to: to,
  });
  if (error || !dates?.length) throw new Error("No available dates found for the test.");

  // Skip the nearest days so tests do not collide with minimum-notice boundaries.
  const day = dates[Math.min(skip + 1, dates.length - 1)];
  if (!day) throw new Error("No available dates found for the test.");
  const { data: slots } = await supabase.rpc("get_available_slots", {
    p_doctor_id: doctor.id,
    p_service_id: service.id,
    p_date: day.slot_date,
  });
  const slot = slots?.[Math.floor((slots?.length ?? 1) / 2)];
  if (!slot) throw new Error("No slots found for the test.");
  return { doctorId: doctor.id, serviceId: service.id, date: day.slot_date, start: slot.slot_start };
}

/** Creates a pending appointment the way the website does (through the public RPC). */
export async function bookViaRpc(slot: FreeSlot, name = "E2E Patient"): Promise<{ reference: string; id: string }> {
  const supabase = serviceClient();
  const { data, error } = await supabase.rpc("book_appointment", {
    p_doctor_id: slot.doctorId,
    p_service_id: slot.serviceId,
    p_start_at: slot.start,
    p_patient_name: name,
    p_patient_phone: `+91${uniquePhone()}`,
    p_consent: true,
  });
  const result = data as { ok?: boolean; reference?: string } | null;
  if (error || !result?.ok || !result.reference) throw new Error(`Could not create test booking: ${JSON.stringify(data ?? error)}`);
  const { data: row } = await supabase.from("appointments").select("id").eq("reference", result.reference).single();
  if (!row) throw new Error("Test booking not found");
  return { reference: result.reference, id: row.id };
}

export async function slotIsOffered(slot: FreeSlot): Promise<boolean> {
  const { data } = await serviceClient().rpc("get_available_slots", {
    p_doctor_id: slot.doctorId,
    p_service_id: slot.serviceId,
    p_date: slot.date,
  });
  return (data ?? []).some((row) => new Date(row.slot_start).getTime() === new Date(slot.start).getTime());
}
