# Deployment: fresh Supabase project + Render (free tiers)

Nothing depends on the original developer's accounts. Every database object comes from `supabase/migrations`.
CLI flags below were checked against Supabase CLI 2.119 (`supabase <command> --help`); re-check if your CLI is newer.

1. **Create a Supabase project** (supabase.com → New project). Note the project ref and database password.
2. **Get the keys** (Project Settings → API): project URL, `anon`/publishable key, and (only for admin creation and automation) the `service_role`/secret key.
3. **Local environment**: `cp .env.example .env.local` and fill `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SITE_URL`.
4. **Link and apply migrations**:
   ```bash
   npx supabase login
   npx supabase link --project-ref <ref>
   npx supabase db push --dry-run     # review
   npx supabase db push               # applies every migration
   ```
5. **Demo data (demo environments only)**: `npx supabase db push --include-seed` (loads the fictional seed). For a real clinic insert your own
   clinic, doctors, services and weekly hours instead (copy the inserts from `supabase/seed.sql`).
6. **Disable public sign-up**: Dashboard → Authentication → Sign In / Providers → turn **off** "Allow new users to sign up" (keep Email enabled: it is
   how staff sign in).
   **Do not run `npx supabase config push` for this**: `supabase/config.toml` is written for the local stack (its `site_url` is `http://127.0.0.1:3000`) and pushing it would overwrite the hosted Site URL with localhost. Use the dashboard toggle and confirm with the sign-up test in the checklist below.
   Even if sign-up were on, a stranger could not reach the dashboard: access requires an active `admin_profiles` row.
7. **Create the first administrator** (uses the service key; export it for this one command only, do not commit it):
   ```bash
   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<secret> npm run admin:create -- --email you@clinic.example --name "Your Name"
   ```
   It prompts for a password (min 12 chars). `--reset-password` and `--deactivate` are available.
8. **Deploy on Render**: New → Blueprint → select the repository (uses `render.yaml`: Node web service, free plan, health check `/api/health`,
   `npm ci && npm run build`, `npm run start`). Enter `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SITE_URL` (the Render URL). Set `SHOW_DEMO_NOTICE=false` for a real clinic.
   Leave the automation variables empty unless enabling n8n.
9. **Set the Supabase Site URL**: once Render shows the real service URL (it may carry a suffix), set `SITE_URL` on Render to it and set the same value under Dashboard → Authentication → URL Configuration → Site URL.
10. **Verify** (checklist below). For a first, throwaway run use the step-by-step [dry-run checklist](DEPLOYMENT_DRY_RUN.md), which also lists which steps need your own accounts.

## Post-deployment checklist

- [ ] `GET /api/health` → `{"status":"ok"}`; `GET /api/health?deep=1` → database `ok`, `clinicConfigured: true`
- [ ] Home, services and doctors pages load with the clinic's data and no console errors
- [ ] Book an appointment end to end; the confirmation shows a reference; the row exists (Supabase → Table editor → appointments)
- [ ] Try to book the same slot from a second browser: the second attempt is refused with a clear message
- [ ] `/admin` redirects to `/admin/login` when signed out; sign in works; dashboard shows the new booking
- [ ] Confirm, then cancel the test booking; the slot becomes bookable again
- [ ] Block a date in Schedule; the public calendar greys it out
- [ ] `POST /api/cron/dispatch-events` returns 503 (disabled) unless n8n is configured
- [ ] Response headers include a CSP and HSTS; unauthenticated `…/rest/v1/appointments` returns a permission error
- [ ] Sign-up is refused: `curl -X POST $SUPABASE_URL/auth/v1/signup …` returns `signup_disabled`

## Notes

- Free Supabase projects pause after a period of inactivity; free Render services sleep when idle (first request is slow). `/api/health?deep=1` keeps the database warm if pinged.
- The Supabase **region** should be near the Render region.
- Render's free plan has no cron jobs; `POST /api/cron/dispatch-events` needs an external scheduler once n8n is enabled (see `docs/N8N_INTEGRATION.md`).
- Rate limiting is in memory and uses the left-most `X-Forwarded-For` entry; whether Render overwrites a client-supplied value has not been verified (see the dry-run checklist, gap G7).
- Rotating a leaked service key: Project Settings → API; update Render; no code change.
- Local run in Safari with `npm start` over plain HTTP cannot keep the (Secure) session cookie; use `npm run dev` or HTTPS.
