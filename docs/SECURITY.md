# Security model and honest limitations

## Controls in place

- **No keys in the browser.** All Supabase access is server-side; CSP `connect-src 'self'`. Verified: the browser contacts zero external origins.
- **Authorization in three layers**: proxy redirect (convenience) → `requireAdmin()`/`requireAdminClient()` in every admin page and Server Action (`auth.getUser()` validates the JWT with Supabase) → Row Level Security and `admin_*` functions that re-check `is_admin()`. A valid Supabase account without an active `admin_profiles` row is refused at all three.
- **No public registration**: sign-up disabled (`config.toml` locally; dashboard toggle when hosted); admins are created only with the service key via `npm run admin:create`.
- **Least privilege**: everything revoked then granted explicitly; appointment writes only via functions; anon cannot read appointments, history, outbox or admin profiles. `tests/db/security.test.ts` audits function/table grants, RLS, `search_path` pinning.
- **Booking integrity**: exclusion constraint, per-doctor lock, per-phone cap (database), honeypot, minimum interval, per-IP rate limit.
- **Sessions**: auth cookies are `HttpOnly`, `Secure` (production), `SameSite=Lax`, capped at 7 days; sign-in is throttled per e-mail and address, uses one generic error, and redirects only to `/admin…` paths.
- **Headers**: nonce-based CSP with `strict-dynamic`, HSTS, `X-Frame-Options: DENY`, `nosniff`, referrer and permissions policies, COOP; `no-store` on admin and confirmation pages; `noindex` on confirmations.
- **Privacy**: minimal data (name, mobile, optional e-mail/age range/short reason, consent); reference is 50-bit random and never a numeric id; confirmation masks the phone and shows only first name + initial; logs redact personal data; outbox excludes free text and is purged after 30 days.
- **Server Actions** validate every input with Zod; Next.js checks the `Origin` header (CSRF). Webhooks: HMAC-SHA256 with timestamp, constant-time comparison, redirects refused, bearer secret compared in constant time.
- **Dependencies**: `npm audit --omit=dev` reports 0 vulnerabilities. Five dev-only findings (`braces` via `eslint-config-next`, lint tooling) are not shipped.

## Remaining production considerations (not done)

- **Rate limiting is per process memory** and relies on `X-Forwarded-For` (set by Render's proxy). Fine for one instance; use a shared store before scaling out.
- **No CAPTCHA.** Cloudflare Turnstile (free) is the natural next step if spam appears.
- **No MFA** for administrators (Supabase supports TOTP) and **no password reset flow** (an admin can re-run `admin:create -- --reset-password`).
- **Single admin role**: every active admin can do everything.
- **`style-src-attr 'unsafe-inline'`** is allowed for inline style attributes (chart widths); scripts and style elements are nonce-only.
- **Booking references** are bearer tokens: anyone holding one can view that appointment's date/doctor/service (not contact details). Lookups are rate-limited.
- **Patient self-service** (cancel/reschedule) is intentionally absent; it would need an additional verified secret.
- **Legal**: the privacy notice is a sample. Health-adjacent data in India needs legal review (DPDP Act 2023) and a retention policy; the app has no automatic deletion of old appointments.
- **Backups and monitoring** are Supabase/Render's responsibility; configure them for a real clinic.
- Secure cookies cannot be stored by Safari over plain-HTTP `npm start` on localhost (use `npm run dev`).
