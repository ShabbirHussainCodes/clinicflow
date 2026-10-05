import { describe, expect, it, vi } from "vitest";

import {
  createWebhookSender,
  dispatchBatch,
  type ClaimedEvent,
  type EventStore,
} from "@/lib/events/dispatcher";
import { verifySignature } from "@/lib/events/sign";

function event(id: string, attempts = 1): ClaimedEvent {
  return {
    id,
    event_type: "appointment.created",
    payload: { id, type: "appointment.created" },
    attempts,
  };
}

function fakeStore(events: ClaimedEvent[]) {
  const calls = {
    completed: [] as string[],
    failed: [] as { id: string; error: string; max: number }[],
    leads: [] as number[],
    purges: [] as number[],
  };
  const store: EventStore = {
    enqueueReminders: async (lead) => {
      calls.leads.push(lead);
      return 2;
    },
    claim: async () => events,
    complete: async (id) => void calls.completed.push(id),
    purgeDelivered: async (days) => {
      calls.purges.push(days);
      return 3;
    },
    fail: async (id, error, max) => void calls.failed.push({ id, error, max }),
  };
  return { store, calls };
}

describe("dispatchBatch", () => {
  it("queues reminders, delivers events and marks them complete", async () => {
    const { store, calls } = fakeStore([event("a"), event("b")]);
    const summary = await dispatchBatch({
      store,
      send: async () => ({ ok: true }),
      reminderLeadHours: 24,
    });
    expect(summary).toEqual({ remindersQueued: 2, claimed: 2, delivered: 2, failed: 0, purged: 3 });
    expect(calls.purges).toEqual([30]);
    expect(calls.completed).toEqual(["a", "b"]);
    expect(calls.leads).toEqual([24]);
  });

  it("records failures without stopping the batch (one bad event does not block the rest)", async () => {
    const { store, calls } = fakeStore([event("a"), event("b"), event("c")]);
    const send = vi.fn(async (e: ClaimedEvent) =>
      e.id === "b" ? { ok: false as const, error: "HTTP 500" } : { ok: true as const },
    );
    const summary = await dispatchBatch({ store, send, reminderLeadHours: 24, maxAttempts: 5 });
    expect(summary).toMatchObject({ claimed: 3, delivered: 2, failed: 1 });
    expect(calls.failed).toEqual([{ id: "b", error: "HTTP 500", max: 5 }]);
    expect(calls.completed).toEqual(["a", "c"]);
  });

  it("treats a throwing sender as a failed delivery", async () => {
    const { store, calls } = fakeStore([event("a")]);
    const summary = await dispatchBatch({
      store,
      send: async () => {
        throw new Error("boom with patient details");
      },
      reminderLeadHours: 24,
    });
    expect(summary.failed).toBe(1);
    // The thrown message is replaced by a generic one so nothing sensitive is stored.
    expect(calls.failed[0]?.error).toBe("unexpected sender error");
  });

  it("does nothing when the queue is empty", async () => {
    const { store, calls } = fakeStore([]);
    const summary = await dispatchBatch({
      store,
      send: async () => ({ ok: true }),
      reminderLeadHours: 24,
    });
    expect(summary.claimed).toBe(0);
    expect(calls.completed).toEqual([]);
  });
});

describe("createWebhookSender", () => {
  const secret = "a-long-shared-secret-value";

  it("adds the optional static token header only when configured", async () => {
    const seen: Record<string, string>[] = [];
    const fetchImpl = (async (_url: string, init: RequestInit) => {
      seen.push(init.headers as Record<string, string>);
      return new Response("ok");
    }) as unknown as typeof fetch;
    await createWebhookSender({ url: "https://x.example", secret, fetchImpl })(event("a"));
    await createWebhookSender({
      url: "https://x.example",
      secret,
      authToken: "token-1234567890abcdef",
      fetchImpl,
    })(event("b"));
    expect(seen[0]).not.toHaveProperty("X-ClinicFlow-Token");
    expect(seen[1]?.["X-ClinicFlow-Token"]).toBe("token-1234567890abcdef");
  });

  it("posts the payload with verifiable signature headers", async () => {
    let captured: { url: string; init: RequestInit } | undefined;
    const fetchImpl = (async (url: string, init: RequestInit) => {
      captured = { url, init };
      return new Response("ok", { status: 200 });
    }) as unknown as typeof fetch;

    const send = createWebhookSender({
      url: "https://n8n.example/webhook/abc",
      secret,
      fetchImpl,
      now: () => 1_700_000_000_000,
    });
    const result = await send(event("evt-1", 3));
    expect(result).toEqual({ ok: true });

    const headers = captured?.init.headers as Record<string, string>;
    expect(headers["X-ClinicFlow-Event-Id"]).toBe("evt-1");
    expect(headers["X-ClinicFlow-Event-Type"]).toBe("appointment.created");
    expect(headers["X-ClinicFlow-Delivery-Attempt"]).toBe("3");
    expect(captured?.init.redirect).toBe("error");
    expect(
      verifySignature(
        secret,
        headers["X-ClinicFlow-Timestamp"] ?? "",
        String(captured?.init.body),
        headers["X-ClinicFlow-Signature"] ?? "",
        {
          now: 1_700_000_000_000,
        },
      ),
    ).toBe(true);
  });

  it("reports only the HTTP status for non-2xx responses", async () => {
    const fetchImpl = (async () =>
      new Response("secret body with PII", { status: 502 })) as unknown as typeof fetch;
    const send = createWebhookSender({ url: "https://x.example", secret, fetchImpl });
    expect(await send(event("a"))).toEqual({ ok: false, error: "HTTP 502" });
  });

  it("reports timeouts and network errors generically", async () => {
    const aborting = (async () => {
      const error = new Error("aborted");
      error.name = "AbortError";
      throw error;
    }) as unknown as typeof fetch;
    expect(
      await createWebhookSender({ url: "https://x.example", secret, fetchImpl: aborting })(
        event("a"),
      ),
    ).toEqual({
      ok: false,
      error: "timeout",
    });

    const failing = (async () => {
      throw new TypeError("fetch failed: ECONNREFUSED 10.0.0.5");
    }) as unknown as typeof fetch;
    expect(
      await createWebhookSender({ url: "https://x.example", secret, fetchImpl: failing })(
        event("a"),
      ),
    ).toEqual({
      ok: false,
      error: "network error",
    });
  });
});
