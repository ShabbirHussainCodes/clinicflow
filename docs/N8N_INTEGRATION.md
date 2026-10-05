# n8n integration (optional, for later)

ClinicFlow works completely without n8n. Nothing here needs an n8n account, and no n8n workflow is included or active.

## How it works (outbox pattern)

Database triggers write a row to `automation_events` **in the same transaction** as every appointment change. A booking therefore
never fails because an automation service is down. A dispatcher endpoint, `POST /api/cron/dispatch-events`, delivers waiting
events to a webhook, retrying failures with backoff. Until configured it returns `503 {"status":"disabled"}`.

| Event type                 | Emitted when                                                                                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `appointment.created`      | A patient (or staff) creates an appointment                                                                                                     |
| `appointment.confirmed`    | Status changes to confirmed                                                                                                                     |
| `appointment.rescheduled`  | `start_at` changes                                                                                                                              |
| `appointment.completed`    | Status changes to completed                                                                                                                     |
| `appointment.cancelled`    | Status changes to cancelled                                                                                                                     |
| `appointment.reminder_due` | Queued by the dispatcher for pending/confirmed appointments starting within `EVENT_REMINDER_LEAD_HOURS` (default 24), once per appointment time |

No event is emitted for no-show. The free-text visit reason and staff notes are **never** included.

## Payload (version 1)

```json
{
  "id": "8fade5c5-2720-4607-837a-4976a15489d6",
  "type": "appointment.created",
  "version": 1,
  "created_at": "2026-10-05T12:04:30.713876+00:00",
  "data": {
    "appointment": {
      "id": "1819d290-2038-4e0b-92ba-5fa78d597dd5",
      "reference": "CF-6EZZP-EFXUJ",
      "status": "pending",
      "start_at": "2026-10-07T05:00:00+00:00",
      "end_at": "2026-10-07T05:30:00+00:00",
      "local_date": "2026-10-07",
      "local_time": "10:30",
      "timezone": "Asia/Kolkata"
    },
    "doctor": {
      "id": "a9c95905-e015-4704-ac99-8179a9307e9a",
      "name": "Dr. Sunita Menon",
      "specialization": "Women's Health Physician"
    },
    "service": {
      "id": "daed578f-1df9-4048-bdd0-e7e547a246bc",
      "name": "Follow-up Visit",
      "duration_minutes": 15
    },
    "patient": {
      "name": "Mobile Patient",
      "phone": "+919894333456",
      "email": null,
      "consent_to_contact": true
    },
    "clinic": {
      "name": "Sanjeevani Family Clinic",
      "phone": "+91 90000 00142",
      "email": "hello@sanjeevani-clinic.example"
    }
  }
}
```

This is real output captured from the database. All six types share this shape; only `type` and `data.appointment.status`
(and, for `rescheduled`, the new times) differ. `id` is the event identifier and is stable across retries.

## Delivery, authentication and idempotency

Each request is `POST` JSON with headers: `X-ClinicFlow-Event-Id`, `-Event-Type`, `-Timestamp` (unix seconds),
`-Delivery-Attempt`, `-Signature` (`v1=<hex HMAC-SHA256 of "<timestamp>.<raw body>">`) and, if `N8N_WEBHOOK_AUTH_TOKEN`
is set, `X-ClinicFlow-Token`. Redirects are refused. Delivery is **at least once**: de-duplicate on the event `id`.
Ordering is not guaranteed.

Recommended: verify the signature and reject timestamps older than ~5 minutes (replay protection). Node example for an n8n Code node
(**verify that your n8n instance allows `require('crypto')`; self-hosted n8n needs `NODE_FUNCTION_ALLOW_BUILTIN=crypto`, and I have not
tested this on n8n Cloud**):

```js
const crypto = require("crypto");
const secret = $env.CLINICFLOW_WEBHOOK_SECRET; // same value as N8N_WEBHOOK_SECRET
const h = $input.first().json.headers;
const raw = JSON.stringify($input.first().json.body); // prefer the raw body if your Webhook node exposes it ("Raw Body" option)
const expected =
  "v1=" +
  crypto.createHmac("sha256", secret).update(`${h["x-clinicflow-timestamp"]}.${raw}`).digest("hex");
if (
  expected !== h["x-clinicflow-signature"] ||
  Math.abs(Date.now() / 1000 - Number(h["x-clinicflow-timestamp"])) > 300
)
  throw new Error("bad signature");
```

If you cannot verify HMAC, set `N8N_WEBHOOK_AUTH_TOKEN` and use the Webhook node's built-in **Header Auth** with header name
`X-ClinicFlow-Token`. (Re-serialised JSON may not match the original bytes; use the raw body for HMAC.)

## Enabling it later

1. In n8n create a Webhook node (POST, respond 200 quickly) and copy its **production** URL.
2. Set on Render: `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET` (16+ random chars), `N8N_WEBHOOK_URL`, and ideally `N8N_WEBHOOK_SECRET` (+ optional `N8N_WEBHOOK_AUTH_TOKEN`). Redeploy. `/admin/events` then shows "Webhook delivery is configured".
3. Schedule a call every ~5 minutes to `POST https://<app>/api/cron/dispatch-events` with `Authorization: Bearer <CRON_SECRET>`. Free options:
   - **GitHub Actions** `schedule:` cron running `curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" $URL` (secrets in repository settings; schedules can lag).
   - **An n8n Schedule Trigger + HTTP Request node** calling the endpoint.
   - **Supabase `pg_cron` + `pg_net`** (`net.http_post(url := …, headers := …)`): check the current Supabase docs for exact signatures; the secret then lives in the database, so prefer Vault.
   - Note: Render's free web service sleeps when idle; the first call wakes it (allow a longer timeout).
4. Try it first without n8n: `WEBHOOK_SECRET=<secret> npm run webhook:receiver`, point `N8N_WEBHOOK_URL` at `http://localhost:5678/webhook/clinicflow`.

## Retries and failures

A claim locks events for 120 s (a crashed dispatcher's events become claimable again). On failure the event waits
30 s, 60 s, 120 s … capped at 1 h, up to 8 attempts, then becomes `dead`. Staff can retry failed/dead events from `/admin/events`.
Only the HTTP status (never the response body) is stored as the error. Delivered events are deleted after `EVENT_RETENTION_DAYS` (default 30) because they contain contact details.
Tested end to end in `e2e/automation.spec.ts` (auth, signature, backoff, same event id on retry, reminders).
