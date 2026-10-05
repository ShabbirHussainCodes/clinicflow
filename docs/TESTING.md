# Testing

| Command                              | What it runs                                                                                                                                                    | Needs                   |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `npm run lint` / `npm run typecheck` | ESLint, `tsc --noEmit` (strict, `noUncheckedIndexedAccess`)                                                                                                     | nothing                 |
| `npm test`                           | Unit tests (`tests/unit`): dates/timezones, validation, rate limit, ICS, signing, dispatcher, logger, env, cookies, clinic hours, open status, site text/config | nothing                 |
| `npm run test:db`                    | Integration tests (`tests/db`) against local Postgres                                                                                                           | `npm run db:start`      |
| `npm run test:e2e`                   | Playwright against a **production build**: patient, admin, schedule, accessibility (axe), mobile, automation                                                    | `db:start`, `env:local` |

Single test: `npx vitest run tests/unit/datetime.test.ts`, `npx playwright test e2e/admin-schedule.spec.ts --project=desktop`.
Sandboxes without Playwright's browser download: `E2E_CHROMIUM_PATH=/path/to/chrome npm run test:e2e`.

## What the database tests prove

Slot rules (hours, split shifts, breaks, blocks, window, min-notice, long services, timezone, inactive/unlinked); booking validation; **25 simultaneous
requests for one slot yield exactly one booking**; mixed-length overlapping races never overlap; raw inserts are stopped by the constraint; status
transition matrix equals the TypeScript table; history and actors; reschedule rules; search (wildcard/phone-text escaping); atomic schedule replacement;
RLS/grant audit; outbox payload, events, reminders (idempotent), claim/lock/backoff/dead/retry/purge, concurrent dispatchers.
They create throw-away fixtures and clean up (including side effects of global outbox functions); they are intended for the local database.

## Browser tests

Patient: full booking with persistence and outbox check, deep links, slot taken during review, 404s. Admin: auth (anonymous redirect, wrong password, a real
non-admin account, sign-out, open-redirect), search/filter, confirm → cancel with confirmation, reschedule, notes, blocked dates, breaks, weekly hours, overlap error.
Accessibility: axe WCAG A/AA on all public and admin pages and every booking step, keyboard calendar, skip link, reduced motion. Public site (`e2e/public-site.spec.ts`): clinic identity in the header, open/closed status and hours table, per-doctor booking links, FAQ, navigation, no horizontal scroll at 320 to 1440 px.
Mobile (Pixel 7): no horizontal scroll, menus, the pinned Call and Book bar, touch targets, a complete booking, admin on a phone. Automation: dispatcher against a local webhook receiver.
The browser and database tests expect the demo seed data (see `docs/CUSTOMIZE.md`). The checks on the public site read the clinic's name from the database and do not depend on the wording in `src/config/site.ts`.
Test admins are created with random passwords per run (`.e2e-state.json`, git-ignored); no credential is committed.

## Known gaps

Automated axe finds only part of the issues; do the manual pass in `docs/ACCESSIBILITY.md`. No visual-regression tests. No load tests. Real devices (iOS Safari) were not tested.
