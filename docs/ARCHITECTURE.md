# Architecture

## Shape of the system

```
Browser ──(HTML, RSC, Server Actions)──▶ Next.js App Router (Node)
                                            │   all data access is server-side
              anon key ─ public content + booking RPCs
              user JWT ─ admin pages (Row Level Security applies)
              service key ─ only the dispatcher route and scripts/create-admin.ts
                                            ▼
                         Supabase: PostgreSQL 17 + Auth (+ PostgREST)
                                            │ automation_events (outbox)
                                            ▼
                    /api/cron/dispatch-events ─ signed webhook ─▶ n8n (optional)
```

The browser never talks to Supabase and never receives a key, so there are no `NEXT_PUBLIC_` variables, the
CSP says `connect-src 'self'`, and configuration is read at runtime (no rebuild to change it).

## Code map

| Path                  | Responsibility                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------- |
| `src/app/(public)`    | Home, services, doctors, privacy, booking wizard page, confirmation page + `.ics` route                 |
| `src/app/admin`       | `login` (public) and `(protected)` dashboard, appointments, schedule, events; Server Actions            |
| `src/app/api`         | `health` and `cron/dispatch-events`                                                                     |
| `src/proxy.ts`        | Next 16 "proxy" (formerly middleware): per-request CSP nonce, session refresh, optimistic `/admin` gate |
| `src/lib/data`        | Typed reads for the public site; RPC wrappers parsed with Zod                                           |
| `src/lib/admin`       | Admin queries (run with the signed-in user's JWT)                                                       |
| `src/lib/validation`  | Zod schemas shared by client and server                                                                 |
| `src/lib/events`      | Webhook signing and the dispatcher (pure, injectable, unit-tested)                                      |
| `src/lib/supabase`    | The three clients, cookie hardening, generated types                                                    |
| `src/components`      | `ui` kit, `public` page sections, `layout` (header, footer), `brand`, `booking` wizard, `admin`         |
| `src/config/site.ts`  | The clinic's website wording (not in the database); see `docs/CUSTOMIZE.md`                             |
| `supabase/migrations` | The database: schema, functions, RLS, grants                                                            |

## Booking: single source of truth

`app_private.generate_slots` (wrapped by `slots_for_day`) decides which slots exist: doctor active and linked to the
service, date inside the booking window, not blocked (clinic or doctor), inside a weekly window, clear of breaks and of
active appointments, and at least `min_notice_minutes` from now. Appointment length is the service duration rounded **up**
to whole slots. The public listing (`get_available_slots`/`get_available_dates`), the booking recheck
(`book_appointment`) and admin rescheduling all call it, so they cannot disagree.

Double-booking defence in depth: (1) the UI only shows free slots; (2) `book_appointment` re-runs the same rules inside
a transaction holding a per-doctor advisory lock; (3) the `appointments_no_double_booking` **exclusion constraint** rejects
any overlapping pending/confirmed rows even if everything above were bypassed. Direct concurrent inserts lose with SQLSTATE
`23P01` or `40P01` (deadlock victim); the function never deadlocks because it serialises first.

## Time

Instants are `timestamptz`; wall-clock hours are `time` interpreted in `clinics.timezone`. "Calendar dates" are
`YYYY-MM-DD` strings handled without `Date` local-zone conversion (`src/lib/datetime.ts`).

## Status lifecycle

`pending → confirmed | cancelled | completed* | no_show*`, `confirmed → cancelled | completed* | no_show*`; completed,
cancelled and no-show are final. `*` only once the start time has passed. Enforced in `admin_set_appointment_status`;
`src/lib/validation/admin.ts` mirrors it for the UI and a database test asserts the two tables are identical.

## Rendering and caching

Every data page is dynamic (`force-dynamic` or request-time APIs): nothing touches the database at build time, so
`next build` works with no environment. Booking confirmations and `/admin/*` send `Cache-Control: private, no-store`.

## Next.js 16 notes for the next developer

`params`/`searchParams` are Promises; `middleware.ts` is now `proxy.ts`; `next lint` is gone (ESLint CLI is used).
`next dev` tries to append agent rules to `CLAUDE.md`; this is disabled with `agentRules: false` in `next.config.ts`
because that file belongs to the repository owner. Read `node_modules/next/dist/docs/` before changing framework APIs.

## Logging

`src/lib/logger.ts` writes JSON lines, redacts any key that looks like personal data, and reduces errors to
name/message/code. Patient names, numbers and e-mail addresses are never logged; booking references are.

## Error handling

Public pages degrade to `error.tsx`/`not-found.tsx` with a call-the-clinic message; Server Actions return typed results
(never throw to the user); RPC results are validated with Zod, and unknown shapes are logged and surfaced as a generic error.
