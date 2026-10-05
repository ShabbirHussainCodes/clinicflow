import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { getEnv, isDispatcherConfigured } from "@/lib/env";
import {
  createWebhookSender,
  dispatchBatch,
  type ClaimedEvent,
  type EventStore,
} from "@/lib/events/dispatcher";
import { logger } from "@/lib/logger";
import { createServiceClient } from "@/lib/supabase/clients";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Delivers queued automation events to the configured webhook (for example an n8n workflow).
 *
 * Disabled (503) until SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET and N8N_WEBHOOK_URL are all set, so
 * the application works completely without any automation service. Call it every few minutes from
 * any scheduler; see docs/N8N_INTEGRATION.md. Authenticate with `Authorization: Bearer <CRON_SECRET>`.
 */

function authorised(request: Request, secret: string): boolean {
  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return expected.length === received.length && timingSafeEqual(expected, received);
}

function supabaseStore(): EventStore {
  const supabase = createServiceClient();
  return {
    async enqueueReminders(leadHours) {
      const { data, error } = await supabase.rpc("enqueue_due_reminders", {
        p_lead_hours: leadHours,
      });
      if (error) throw error;
      return data ?? 0;
    },
    async claim(limit) {
      const { data, error } = await supabase.rpc("claim_automation_events", { p_limit: limit });
      if (error) throw error;
      return (data ?? []) as ClaimedEvent[];
    },
    async complete(id) {
      const { error } = await supabase.rpc("complete_automation_event", { p_event_id: id });
      if (error) throw error;
    },
    async purgeDelivered(olderThanDays) {
      const { data, error } = await supabase.rpc("purge_delivered_automation_events", {
        p_older_than_days: olderThanDays,
      });
      if (error) throw error;
      return data ?? 0;
    },
    async fail(id, message, maxAttempts) {
      const { error } = await supabase.rpc("fail_automation_event", {
        p_event_id: id,
        p_error: message,
        p_max_attempts: maxAttempts,
      });
      if (error) throw error;
    },
  };
}

async function handle(request: Request) {
  if (!isDispatcherConfigured()) {
    return NextResponse.json({ status: "disabled" }, { status: 503 });
  }
  const env = getEnv();
  // isDispatcherConfigured() guarantees these are present.
  const secret = env.CRON_SECRET as string;
  if (!authorised(request, secret)) {
    return NextResponse.json({ status: "unauthorized" }, { status: 401 });
  }

  try {
    const summary = await dispatchBatch({
      store: supabaseStore(),
      send: createWebhookSender({
        url: env.N8N_WEBHOOK_URL as string,
        secret: env.N8N_WEBHOOK_SECRET ?? secret,
        authToken: env.N8N_WEBHOOK_AUTH_TOKEN,
      }),
      reminderLeadHours: env.EVENT_REMINDER_LEAD_HOURS,
      retentionDays: env.EVENT_RETENTION_DAYS,
    });
    logger.info("events.dispatched", { ...summary });
    return NextResponse.json(
      { status: "ok", ...summary },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    logger.error("events.dispatch_failed", error);
    return NextResponse.json({ status: "error" }, { status: 500 });
  }
}

export const POST = handle;
// Some schedulers can only issue GET requests; the bearer token still protects the endpoint.
export const GET = handle;
