import { createServer, type Server } from "node:http";

import { expect, test, type APIRequestContext } from "@playwright/test";

import { verifySignature } from "../src/lib/events/sign";
import { AUTOMATION_E2E } from "./automation-config";
import { bookViaRpc, findFreeSlot, serviceClient } from "./support";

interface Delivery {
  eventId: string;
  type: string;
  attempt: string;
  token: string;
  signatureValid: boolean;
  body: { id: string; type: string; version: number; data: { appointment: { reference: string } } };
}

/** A stand-in for an n8n Webhook node that records what it receives. */
let server: Server;
let deliveries: Delivery[] = [];
let respondWith = 200;

test.beforeAll(async () => {
  server = createServer((request, response) => {
    const chunks: Buffer[] = [];
    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      deliveries.push({
        eventId: String(request.headers["x-clinicflow-event-id"]),
        type: String(request.headers["x-clinicflow-event-type"]),
        attempt: String(request.headers["x-clinicflow-delivery-attempt"]),
        token: String(request.headers["x-clinicflow-token"]),
        signatureValid: verifySignature(
          AUTOMATION_E2E.webhookSecret,
          String(request.headers["x-clinicflow-timestamp"]),
          raw,
          String(request.headers["x-clinicflow-signature"]),
        ),
        body: JSON.parse(raw),
      });
      response.writeHead(respondWith).end("{}");
    });
  });
  await new Promise<void>((resolve) =>
    server.listen(AUTOMATION_E2E.receiverPort, "127.0.0.1", resolve),
  );
});

test.afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

test.beforeEach(() => {
  deliveries = [];
  respondWith = 200;
});

const dispatch = (request: APIRequestContext, token = AUTOMATION_E2E.cronSecret) =>
  request.post("/api/cron/dispatch-events", { headers: { Authorization: `Bearer ${token}` } });

/** The queue may hold events from other tests, so dispatch until ours has been handled. */
async function dispatchUntil(request: APIRequestContext, done: () => boolean) {
  for (let i = 0; i < 12 && !done(); i += 1) {
    const response = await dispatch(request);
    expect(response.status()).toBe(200);
  }
  expect(done()).toBe(true);
}

test.describe("automation dispatcher (without n8n)", () => {
  test("rejects requests without the correct bearer secret", async ({ request }) => {
    expect((await request.post("/api/cron/dispatch-events")).status()).toBe(401);
    expect((await dispatch(request, "wrong-secret-wrong-secret-0000")).status()).toBe(401);
    expect(
      (
        await request.get("/api/cron/dispatch-events", { headers: { Authorization: "Basic abc" } })
      ).status(),
    ).toBe(401);
  });

  test("delivers a signed event, marks it delivered and never sends it twice", async ({
    request,
  }) => {
    const { reference, id } = await bookViaRpc(
      await findFreeSlot("dr-meera-iyer", "general-consultation", 14),
      "Automation Patient",
    );
    const mine = () => deliveries.filter((d) => d.body.data.appointment.reference === reference);

    await dispatchUntil(request, () => mine().length > 0);
    const [delivery] = mine();
    expect(delivery).toMatchObject({
      type: "appointment.created",
      attempt: "1",
      token: AUTOMATION_E2E.authToken,
      signatureValid: true,
    });
    expect(delivery?.body).toMatchObject({ id: delivery?.eventId, version: 1 });

    const { data: row } = await serviceClient()
      .from("automation_events")
      .select("status, attempts, delivered_at")
      .eq("id", delivery!.eventId)
      .single();
    expect(row).toMatchObject({ status: "delivered", attempts: 1 });
    expect(row?.delivered_at).toBeTruthy();

    // Dispatching again must not re-send an already delivered event.
    const before = mine().length;
    await dispatch(request);
    expect(mine().length).toBe(before);
    expect(id).toBeTruthy();
  });

  test("keeps events when the receiver is down, retries later and keeps the same event id", async ({
    request,
  }) => {
    const { reference } = await bookViaRpc(
      await findFreeSlot("dr-arjun-deshmukh", "follow-up-visit", 15),
      "Retry Patient",
    );
    const mine = () => deliveries.filter((d) => d.body.data.appointment.reference === reference);
    const supabase = serviceClient();

    respondWith = 500; // the automation service is unavailable
    await dispatchUntil(request, () => mine().length > 0);
    const first = mine()[0]!;

    const { data: failed } = await supabase
      .from("automation_events")
      .select("status, attempts, last_error, next_attempt_at")
      .eq("id", first.eventId)
      .single();
    expect(failed).toMatchObject({ status: "failed", attempts: 1, last_error: "HTTP 500" });
    expect(new Date(failed!.next_attempt_at).getTime()).toBeGreaterThan(Date.now());

    // The booking itself was never affected by the outage.
    const { data: appointment } = await supabase
      .from("appointments")
      .select("status")
      .eq("reference", reference)
      .single();
    expect(appointment?.status).toBe("pending");

    // Not retried before its backoff time...
    const count = mine().length;
    await dispatch(request);
    expect(mine().length).toBe(count);

    // ...but once due and the receiver is back, it is delivered with the same id.
    respondWith = 200;
    await supabase
      .from("automation_events")
      .update({ next_attempt_at: new Date().toISOString() })
      .eq("id", first.eventId);
    await dispatchUntil(request, () => mine().some((d) => d.attempt === "2"));
    const second = mine().find((d) => d.attempt === "2")!;
    expect(second.eventId).toBe(first.eventId);
    const { data: delivered } = await supabase
      .from("automation_events")
      .select("status, attempts")
      .eq("id", first.eventId)
      .single();
    expect(delivered).toMatchObject({ status: "delivered", attempts: 2 });
  });

  test("queues and delivers reminder_due events for appointments starting soon", async ({
    request,
  }) => {
    const supabase = serviceClient();
    const { data: clinic } = await supabase.from("clinics").select("id").single();
    expect(clinic).toBeTruthy();
    const { data: service } = await supabase
      .from("services")
      .select("id")
      .eq("slug", "general-consultation")
      .single();
    const { data: doctor, error: doctorError } = await supabase
      .from("doctors")
      .insert({
        slug: `e2e-reminder-${Date.now()}`,
        full_name: "Dr. E2E Reminder",
        qualification: "MBBS",
        specialization: "Test",
        experience_years: 1,
      })
      .select("id")
      .single();
    expect(doctorError).toBeNull();

    try {
      const start = new Date(Date.now() + 5 * 3_600_000);
      const { data: appointment, error } = await supabase
        .from("appointments")
        .insert({
          doctor_id: doctor!.id,
          service_id: service!.id,
          start_at: start.toISOString(),
          end_at: new Date(start.getTime() + 20 * 60_000).toISOString(),
          status: "confirmed",
          patient_name: "Reminder Patient",
          patient_phone: "+919812345670",
          consent_given: true,
        })
        .select("reference")
        .single();
      expect(error).toBeNull();
      const reference = appointment!.reference;
      const reminders = () =>
        deliveries.filter(
          (d) =>
            d.type === "appointment.reminder_due" &&
            d.body.data.appointment.reference === reference,
        );

      await dispatchUntil(request, () => reminders().length > 0);
      expect(reminders()).toHaveLength(1);
      expect(reminders()[0]?.signatureValid).toBe(true);

      // Reminders are not queued twice for the same appointment time.
      await dispatch(request);
      await dispatch(request);
      expect(reminders()).toHaveLength(1);
    } finally {
      await supabase
        .from("automation_events")
        .delete()
        .eq("payload->data->doctor->>id", doctor!.id);
      await supabase.from("appointments").delete().eq("doctor_id", doctor!.id);
      await supabase.from("doctors").delete().eq("id", doctor!.id);
    }
  });
});
