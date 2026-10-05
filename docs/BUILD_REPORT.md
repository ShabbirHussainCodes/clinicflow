# Build report

Branch `claude/magical-mayer-mda3ec`. Everything below was built and verified in a cloud sandbox with a real local Supabase stack (Docker, PostgreSQL 17, Auth, PostgREST).

## Completed

- **Database**: 5 migrations (schema, availability engine, booking/confirmation RPCs, history + outbox, admin functions, RLS/grants), fictional date-relative seed.
- **Public site**: home, services, doctors, privacy, multistep booking (service → doctor → date & time → details → review), confirmation with `.ics`, robots/sitemap, 404/error pages, health endpoint.
- **Admin**: login, dashboard, appointment search/filter/sort/detail, status transitions with cancel confirmation, reschedule, notes, schedule (hours, breaks, holidays), automation events page.
- **Automation**: outbox, signed webhook dispatcher, reminders, retries, retention, local receiver. Disabled unless configured.
- **Platform**: security headers + nonce CSP, hardened cookies, rate limiting, Render blueprint, CI workflow, `.env.example`, admin-creation script, screenshot script.
- **Docs**: README and `docs/` (architecture, database, deployment, n8n, security, testing, accessibility, design, decisions, next steps).

## Verification (what was actually run)

| Check                                                                                                        | Result                                                                                                  |
| ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| ESLint, `tsc --noEmit` (strict)                                                                              | clean (last run before final commit)                                                                    |
| Unit tests                                                                                                   | 105 pass                                                                                                |
| Database integration tests                                                                                   | 78 pass against a freshly reset database                                                                |
| Playwright full suite on a production build (desktop + mobile, axe, patient, admin, schedule)                | 33 pass                                                                                                 |
| Playwright automation spec (dispatcher ↔ local receiver)                                                     | 4 pass (run separately)                                                                                 |
| `next build` with and without environment variables                                                          | passes                                                                                                  |
| Production probe: headers, CSP console violations, external requests, cookie flags                           | no violations; 0 external origins; cookie HttpOnly/Secure/Lax/7d                                        |
| Live API with a real non-admin JWT                                                                           | admin RPCs and writes refused; appointments read returns `[]`                                           |
| `npm audit --omit=dev`                                                                                       | 0 vulnerabilities                                                                                       |
| Owner's run on macOS after PR #1 was merged: `npm run test:e2e` on the final code                            | **37 passed** (desktop + mobile, axe, patient, admin, schedule, automation)                             |
| Owner's local setup on macOS: `db:start`, `env:local`, `db:reset`, `admin:create`, `dev`                     | worked, after clearing a port conflict with another local Supabase project (see README troubleshooting) |
| Tablet width (768 px) visual review: home, services, doctors, booking, admin dashboard/appointments/schedule | no horizontal overflow; layouts adapt (booking summary moves under the form)                            |

Bugs found and fixed by this verification: email provider disabled by the sign-up setting (login failed); loose reference regex; search matching phones from digits in text; build failing without env;
insufficient contrast on a few text colours; invalid `<dl>` markup; test-induced pollution of outbox data; service role unable to insert appointments directly.

## Genuine limitations and what was NOT verified

- **Resolved by the owner**: the full Playwright suite was re-run on the final code on macOS (37 passed), and a fresh local setup worked.
- **Still unverified**: that `supabase start` on a completely empty volume applies migrations and seed data by itself. Use `npm run db:reset` (verified) after the first start.
- **Unexplained log noise**: the Playwright web-server log shows `Error: The destination stream closed early` a few times during otherwise passing tests (observed on the owner's Mac). It is most likely Next.js reporting that the test browser closed a connection mid-response when a page navigated away, but it was not root-caused. No test fails because of it.
- **No hosted Supabase or Render deployment was performed** (no access); `render.yaml` and `docs/DEPLOYMENT.md` follow documented commands (CLI flags checked with `--help`) but are untested end to end.
- **No manual accessibility/screen-reader review and no real-device (iOS) test.** Automated axe checks pass; tablet width was reviewed visually.
- n8n itself was never connected (by design); n8n Code-node `crypto` availability is unverified (noted in the doc).
- Placeholder phone numbers are fictional but follow real-looking formats.
- No patient self-service, no CAPTCHA, no MFA, in-memory rate limiting (see `docs/SECURITY.md`).
- Dev-only `npm audit` findings (5, lint toolchain) remain.
