/**
 * A tiny local stand-in for an n8n Webhook node, for trying the automation integration without n8n.
 *
 *   npm run webhook:receiver                 # listens on http://localhost:5678/webhook/clinicflow
 *   WEBHOOK_SECRET=... PORT=5678 npm run webhook:receiver
 *
 * It verifies the HMAC signature exactly as docs/N8N_INTEGRATION.md describes, prints each event and
 * answers 200. Point N8N_WEBHOOK_URL at it and set N8N_WEBHOOK_SECRET (or CRON_SECRET) to the same
 * secret the app uses. Set FAIL_FIRST=1 to answer 500 once per event, to see retries.
 */
import { createServer } from "node:http";

import { verifySignature } from "../src/lib/events/sign";

const port = Number(process.env.PORT ?? 5678);
const secret =
  process.env.WEBHOOK_SECRET ?? process.env.N8N_WEBHOOK_SECRET ?? process.env.CRON_SECRET;
const failFirst = process.env.FAIL_FIRST === "1";
const seen = new Set<string>();

if (!secret) {
  console.error(
    "Set WEBHOOK_SECRET (or N8N_WEBHOOK_SECRET / CRON_SECRET) to the shared signing secret.",
  );
  process.exit(1);
}

createServer((request, response) => {
  if (request.method !== "POST" || !request.url?.startsWith("/webhook/clinicflow")) {
    response.writeHead(404).end();
    return;
  }
  const chunks: Buffer[] = [];
  request.on("data", (chunk: Buffer) => chunks.push(chunk));
  request.on("end", () => {
    const body = Buffer.concat(chunks).toString("utf8");
    const timestamp = String(request.headers["x-clinicflow-timestamp"] ?? "");
    const signature = String(request.headers["x-clinicflow-signature"] ?? "");
    const eventId = String(request.headers["x-clinicflow-event-id"] ?? "");

    if (!verifySignature(secret, timestamp, body, signature)) {
      console.log(`rejected ${eventId || "request"}: bad signature`);
      response.writeHead(401).end("bad signature");
      return;
    }
    if (failFirst && !seen.has(eventId)) {
      seen.add(eventId);
      console.log(`simulated failure for ${eventId}`);
      response.writeHead(500).end("simulated failure");
      return;
    }
    const event = JSON.parse(body) as {
      type: string;
      data?: { appointment?: { reference?: string } };
    };
    console.log(
      `received ${event.type} ${event.data?.appointment?.reference ?? ""} (id ${eventId}, attempt ${request.headers["x-clinicflow-delivery-attempt"]})`,
    );
    response
      .writeHead(200, { "Content-Type": "application/json" })
      .end(JSON.stringify({ received: true }));
  });
}).listen(port, () =>
  console.log(`Webhook receiver listening on http://localhost:${port}/webhook/clinicflow`),
);
