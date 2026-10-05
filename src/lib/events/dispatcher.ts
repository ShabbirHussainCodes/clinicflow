import { signPayload } from "@/lib/events/sign";

/**
 * Outbox dispatcher.
 *
 * Pure orchestration with injected dependencies so it can be unit-tested without a database or an
 * HTTP server. The route handler wires in the Supabase-backed store and a fetch-based sender.
 *
 * Delivery guarantee: AT LEAST ONCE. A crash after a successful POST but before the event is
 * marked delivered causes a retry, so consumers must de-duplicate on the event `id`
 * (documented in docs/N8N_INTEGRATION.md).
 */

export interface ClaimedEvent {
  id: string;
  event_type: string;
  payload: unknown;
  attempts: number;
}

export interface EventStore {
  enqueueReminders(leadHours: number): Promise<number>;
  claim(limit: number): Promise<ClaimedEvent[]>;
  complete(id: string): Promise<void>;
  fail(id: string, error: string, maxAttempts: number): Promise<void>;
}

export type SendResult = { ok: true } | { ok: false; error: string };
export type Sender = (event: ClaimedEvent) => Promise<SendResult>;

export interface DispatchSummary {
  remindersQueued: number;
  claimed: number;
  delivered: number;
  failed: number;
}

export async function dispatchBatch(options: {
  store: EventStore;
  send: Sender;
  reminderLeadHours: number;
  batchSize?: number;
  maxAttempts?: number;
}): Promise<DispatchSummary> {
  const { store, send, reminderLeadHours, batchSize = 25, maxAttempts = 8 } = options;

  const remindersQueued = await store.enqueueReminders(reminderLeadHours);
  const events = await store.claim(batchSize);

  let delivered = 0;
  let failed = 0;
  for (const event of events) {
    let result: SendResult;
    try {
      result = await send(event);
    } catch {
      result = { ok: false, error: "unexpected sender error" };
    }

    if (result.ok) {
      await store.complete(event.id);
      delivered += 1;
    } else {
      await store.fail(event.id, result.error, maxAttempts);
      failed += 1;
    }
  }

  return { remindersQueued, claimed: events.length, delivered, failed };
}

export function createWebhookSender(config: {
  url: string;
  secret: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
  now?: () => number;
}): Sender {
  const { url, secret, timeoutMs = 10_000, fetchImpl = fetch, now = Date.now } = config;

  return async (event) => {
    const body = JSON.stringify(event.payload);
    const timestamp = String(Math.floor(now() / 1000));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetchImpl(url, {
        method: "POST",
        redirect: "error",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "ClinicFlow-Webhook/1",
          "X-ClinicFlow-Event-Id": event.id,
          "X-ClinicFlow-Event-Type": event.event_type,
          "X-ClinicFlow-Timestamp": timestamp,
          "X-ClinicFlow-Delivery-Attempt": String(event.attempts),
          "X-ClinicFlow-Signature": signPayload(secret, timestamp, body),
        },
        body,
      });
      // Only the status code is recorded: response bodies could echo personal data.
      return response.ok ? { ok: true } : { ok: false, error: `HTTP ${response.status}` };
    } catch (error) {
      const timedOut = error instanceof Error && error.name === "AbortError";
      return { ok: false, error: timedOut ? "timeout" : "network error" };
    } finally {
      clearTimeout(timer);
    }
  };
}
