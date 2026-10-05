# Build report

Branch `claude/magical-mayer-mda3ec`. Everything below was built and verified in a cloud sandbox with a real local Supabase stack (Docker, PostgreSQL 17, Auth, PostgREST).

## Completed

- **Database**: 5 migrations (schema, availability engine, booking/confirmation RPCs, history + outbox, admin functions, RLS/grants), fictional date-relative seed.
- **Public site**: home, services, doctors, privacy, multistep booking (service → doctor → date & time → details → review), confirmation with `.ics`, robots/sitemap, 404/error pages, health endpoint. Redesigned to look like a real clinic's own site (see below).
- **Admin**: login, dashboard, appointment search/filter/sort/detail, status transitions with cancel confirmation, reschedule, notes, schedule (hours, breaks, holidays), automation events page.
- **Automation**: outbox, signed webhook dispatcher, reminders, retries, retention, local receiver. Disabled unless configured.
- **Platform**: security headers + nonce CSP, hardened cookies, rate limiting, Render blueprint, CI workflow, `.env.example`, admin-creation script, screenshot script.
- **Docs**: README and `docs/` (architecture, database, deployment, n8n, security, testing, accessibility, design, decisions, next steps).

## Professional redesign of the public site

Requested by the owner after seeing the first design ("not professional looking ... looks AI made"), so the site can be handed to a real client by changing information only.

- **Removed**: the cartoon arches, faceless doctor illustrations, hero scene, floating UI cards, icon tiles, pastel circles, the fake map sketch and the ClinicFlow wordmark on the public pages.
- **Added**: clinic-branded header, footer and favicon (logo by file name, otherwise a monogram and the name); utility bar with open/closed status in the clinic's time zone; hero with each doctor's next free times as real booking links; facts computed from the data; ruled services list; doctor directory (portraits when photos exist); About, patient quotes, FAQ (native `<details>`); visit section with a day-by-day hours table (today marked) and holiday list; closing call to action; Call and Book bar on phones. Typography changed to Source Serif 4 and Source Sans 3; tokens flattened (small radii, almost no shadow); colour tokens renamed `teal-*` to `brand-*`.
- **Customisation**: clinic data stays in the database; all wording is in `src/config/site.ts`; photographs and logo are picked up from `public/` by file name; colours are one ramp in `globals.css`. Step by step: `docs/CUSTOMIZE.md`. Decisions 18 to 25 in `docs/DECISIONS.md`.
- **Corrected along the way**: clinic hours used to be shown as "earliest start to latest end", which advertised hours nobody worked (for example 9:00 AM to 7:40 PM across an afternoon gap). They are now the union of the doctors' working windows.

Redesign verification (all run in the sandbox, against the local Supabase stack):

| Check                                                                                                                                                                                                                                                                              | Result                                                                                                                                                        |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run verify` (ESLint, `next typegen` + `tsc`, unit tests, production build) and `prettier --check`                                                                                                                                                                             | pass                                                                                                                                                          |
| Unit tests                                                                                                                                                                                                                                                                         | 131 pass (new: clinic hours, open status, site text, brand text, site content)                                                                                |
| Database tests (`npm run test:db`), re-run although no migration changed                                                                                                                                                                                                           | 78 pass                                                                                                                                                       |
| Playwright full suite on a production build (desktop + mobile, axe on every public page and booking step, patient, admin, schedule, automation, new public-site spec)                                                                                                              | **46 pass**                                                                                                                                                   |
| No horizontal scroll at 320, 390, 768, 1024, 1280 and 1440 px on home, services, doctors, privacy and booking; and on a Pixel 7 profile (412 px)                                                                                                                                   | pass (automated)                                                                                                                                              |
| Photographs and logo path, on a production server with temporary test images (hero, about, map, one doctor portrait, an SVG logo)                                                                                                                                                  | images served through the Next.js optimizer (JPEG to WebP, about 7 KB from 22 KB); SVG logo served; path-traversal URL refused (400); temporary files removed |
| Visual review from screenshots by the assistant: home page at 1280 px (full page), 768 px and 390 px; services, doctors, booking, sign-in and confirmation at 1280 px; the phone menu. With the temporary test images at 1280 px only (home hero strip, doctors page, header logo) | done; **not** reviewed by a human designer                                                                                                                    |

Not verified for the redesign: real device rendering (iOS Safari, Android Chrome), a screen-reader pass of the new FAQ, hours table and pinned Call and Book bar, and how the design looks with a client's real photographs (none were available; the demo shows the finished no-photo layout). Whether the result "looks professional" is a judgement for the owner and the client.

## Verification of the original build (what was actually run)

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
