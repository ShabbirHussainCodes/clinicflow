# Hosted dry run checklist: Supabase + Render

This checklist was written from reading `docs/DEPLOYMENT.md`, `render.yaml`, `supabase/config.toml` and the five migrations. It has **not** been executed against hosted services: fill in the results as you go.
Legend: [YOU] needs your Supabase/Render/GitHub account or a secret. [REPO] can be done or checked from the repo.

## Phase 0: before touching hosted services

- [ ] [REPO] Confirm main contains the merged PR (#1) and the local gate passes (NEXT_STEPS item 1): `npm ci && npm run verify && npm run test:db`.
- [ ] [YOU] Decide: throwaway demo project first (recommended), real clinic later. Free tiers only.

## Phase 1: Supabase

1. [YOU] Create a project (free plan). Pick a region near the Render region (render.yaml uses singapore; the clinic default timezone is Asia/Kolkata). Save the DB password in a password manager.
2. [YOU] Project Settings > API: copy project URL, anon/publishable key, and service_role/secret key. Never paste these into chat or commit them.
3. [YOU] `npx supabase login`, then `npx supabase link --project-ref <ref>`.
4. [YOU] `npx supabase db push --dry-run`, review, then `npx supabase db push`. Expect 5 migrations in order: core_schema, availability_and_booking, history_and_event_outbox, admin_functions, rls_and_grants. core_schema runs `create extension btree_gist with schema extensions`; this is allowed on hosted Supabase.
5. [YOU] Demo only: `npx supabase db push --include-seed`. Seed dates are relative to today. Skip for a real clinic.
6. [YOU] Dashboard > Authentication > Sign In / Providers: turn OFF "Allow new users to sign up", keep Email on. See gap G2 before using `config push`.
7. [YOU] Create the first admin with the service key exported for that one command only:
   `SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<secret> npm run admin:create -- --email <you> --name "<you>"` (password prompt, min 12 chars).
8. [YOU] Dashboard > Authentication > URL Configuration: set Site URL to the Render URL once known (step 2.2).

## Phase 2: Render

1. [YOU] Render dashboard > New > Blueprint > pick ShabbirHussainCodes/clinicflow (needs the Render GitHub app granted on the repo).
2. [YOU] Enter the `sync: false` values: SUPABASE*URL, SUPABASE_ANON_KEY, SITE_URL (use `https://<service>.onrender.com`; if the name is taken Render appends a suffix, so check the real URL, then update SITE_URL). Leave SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET and N8N*\* empty for the first pass.
3. [YOU] Keep SHOW_DEMO_NOTICE=true for the dry run.
4. [YOU] Trigger the first deploy (autoDeploy is false). Watch the build log: `npm ci && npm run build` must succeed with no secrets present (env is validated lazily).
5. [YOU] Confirm the health check goes green and the service stays Live.

## Phase 3: verification (from docs/DEPLOYMENT.md, plus additions)

- [ ] `GET /api/health` returns ok; `GET /api/health?deep=1` returns database ok and clinicConfigured true (503 "degraded" means no clinic row, i.e. seed not loaded).
- [ ] Home, services, doctors render with demo data and no console errors.
- [ ] Book end to end; confirmation shows a reference; row visible in Supabase Table editor.
- [ ] Same slot from a second browser is refused with a clear message.
- [ ] `/admin` redirects to `/admin/login` when signed out; sign-in works over HTTPS; dashboard shows the booking. (Secure cookie is only an issue over plain HTTP.)
- [ ] Confirm then cancel the test booking; slot is bookable again.
- [ ] Block a date; the public calendar greys it out.
- [ ] `POST /api/cron/dispatch-events` returns 503.
- [ ] Response headers: CSP (comes from src/proxy.ts, not next.config.ts), HSTS, X-Frame-Options.
- [ ] Anonymous `GET $SUPABASE_URL/rest/v1/appointments` with the anon key returns a permission error or no rows, and cannot insert.
- [ ] `curl -X POST $SUPABASE_URL/auth/v1/signup` with the anon key returns signup_disabled.
- [ ] Wait for Render to sleep (~15 min idle), then time the first request. Record the cold-start time.
- [ ] Record results in docs/BUILD_REPORT.md and tick NEXT_STEPS item 4.

## Phase 4: optional automation (later)

- [ ] [YOU] Set SUPABASE_SERVICE_ROLE_KEY, CRON_SECRET (16+ chars), N8N_WEBHOOK_URL, N8N_WEBHOOK_SECRET on Render; redeploy; confirm dispatch endpoint now needs the Bearer secret.
- [ ] [YOU] Pick a scheduler to call the endpoint (see G6).

## Gaps and risks found

- G1 (docs): The health check path is fine, but Render's free web service sleeps, so a dry run will show a slow first request and the Render health check does not keep the DB warm. `/api/health?deep=1` is the only thing that touches Supabase; free Supabase projects pause after inactivity, so a pinger (UptimeRobot-style, own account) is needed for anything real.
- G2 (config, mitigated): supabase/config.toml has `site_url = "http://127.0.0.1:3000"` and `[auth.email] enable_signup = true` while `[auth] enable_signup = false`. Running `supabase config push` as DEPLOYMENT.md step 6 suggests would overwrite the hosted Site URL with localhost and I am not certain how the two signup flags interact on hosted. Prefer the dashboard toggle and verify with the signup curl test. DEPLOYMENT.md and config.toml now warn against `config push`.
- G3 (verify): `supabase db push --include-seed` flag: DEPLOYMENT.md says it was checked against CLI 2.119; you may want to re-run `npx supabase db push --help` to confirm, since I did not run it here.
- G4 (docs, fixed): No step covers setting Supabase Site URL / redirect URLs after Render assigns the URL (added above as Phase 1 step 8, and DEPLOYMENT.md step 9). Admin password reset by email is listed as unbuilt, so this mostly matters for future auth emails. Hosted Supabase's built-in email sender is heavily rate limited; fine for the dry run.
- G5 (render.yaml): `NODE_VERSION: 22` is set while package.json engines is `>=20.9.0`; consistent. `region: singapore` is hardcoded; change if your Supabase region differs. `healthCheckPath: /api/health` does not test the database by design.
- G6 (automation): Render free has no cron job. The dispatch endpoint needs an external scheduler (n8n schedule, GitHub Actions cron, or cron-job.org). Not decided in the repo yet (NEXT_STEPS item 5).
- G7 (abuse): rate limiting is in-memory and keyed off the left-most x-forwarded-for, which is spoofable unless the platform overwrites it. I have not verified that Render overwrites or appends. Test by sending a forged X-Forwarded-For header 9+ times to the booking action. DB cap of active bookings per phone still applies.
- G8 (data): Seed contains fictional people only (CLAUDE.md rule); do not run it on a project meant for real patients. There is no documented way to remove seed rows on a project later.
- G9 (CI): .github/workflows/ci.yml exists but nothing deploys or pushes migrations; deployment is fully manual. Acceptable, but record it as intended.

## Not verified yet

No Supabase or Render access was used when this was written, and the CLI was not run. Everything above is from reading the files. G3, G7 and the signup interaction in G2 are open questions to answer during the run.
