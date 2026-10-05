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
   how staff sign in). Alternatively `npx supabase config push` pushes `supabase/config.toml`; review it first because it also contains `site_url`.
   Even if sign-up were on, a stranger could not reach the dashboard: access requires an active `admin_profiles` row.
7. **Create the first administrator** (uses the service key; export it for this one command only, do not commit it):
   ```bash
   SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<secret> npm run admin:create -- --email you@clinic.example --name "Your Name"
   ```
   It prompts for a password (min 12 chars). `--reset-password` and `--deactivate` are available.
8. **Deploy on Render**: New → Blueprint → select the repository (uses `render.yaml`: Node web service, free plan, health check `/api/health`,
   `npm ci && npm run build`, `npm run start`). Enter `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SITE_URL` (the Render URL). Set `SHOW_DEMO_NOTICE=false` for a real clinic.
   Leave the automation variables empty unless enabling n8n.
9. **Verify** (checklist below).

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
- Rotating a leaked service key: Project Settings → API; update Render; no code change.
- Local run in Safari with `npm start` over plain HTTP cannot keep the (Secure) session cookie; use `npm run dev` or HTTPS.
