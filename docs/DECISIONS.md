# Technical decisions

1. **Browser never talks to Supabase.** Server Components/Actions only. Removes key exposure, makes CSP `connect-src 'self'`, allows runtime env (no `NEXT_PUBLIC_`). Trade-off: no realtime/client SDK features.
2. **Business rules in PostgreSQL** (slots, booking, transitions, search) as functions; the app is a thin typed layer. One source of truth, testable with plain SQL, enforced for every client. Trade-off: SQL is harder to refactor than TS.
3. **Exclusion constraint + advisory lock + recheck** for double booking. The constraint is the guarantee; the lock makes the function deterministic.
4. **Appointment length = service duration rounded up to the doctor's slot grid** so the grid stays aligned and a long service blocks the neighbouring slots.
5. **Date and time share one wizard step** (brief lists them separately): the time grid appears under the calendar; fewer clicks, same information.
6. **Booking reference** `CF-XXXXX-XXXXX`, 32-symbol alphabet (no I/O), 50 bits from `gen_random_uuid()` (no pgcrypto), plus lookup rate limits. Confirmation shows masked contact data.
7. **Admin via RPC + RLS, not service role.** Admins act with their own JWT; the service key is used only by the dispatcher and `create-admin`.
8. **Outbox + dispatcher** instead of calling n8n from the booking path; at-least-once, HMAC signing, optional static token. Scheduling is left to the owner because Render's free tier has no cron.
9. **In-memory rate limiting** (documented limitation) plus database per-phone cap.
10. **Sign-up disabled, email provider enabled.** `[auth.email] enable_signup=false` would also disable password login (`email_provider_disabled`); the correct switch is `[auth] enable_signup=false`.
11. **HttpOnly session cookies, 7-day cap** (`src/lib/supabase/cookies.ts`), possible because no browser Supabase client exists.
12. **Nonce CSP in `proxy.ts`** (forces dynamic rendering, which the app needs anyway). Dev relaxes `style-src` for HMR.
13. **Phone matching in admin search only for phone-like queries** (found by a flaky test: digits inside text matched unrelated numbers).
14. **Fonts/art local**: Fraunces + Figtree woff2 copied into `src/assets/fonts` (no build-time Google Fonts fetch).
15. **`agentRules: false`**: `next dev` otherwise rewrites the owner's `CLAUDE.md`.
16. **Tests use real Postgres, not mocks**; Playwright runs against a production build so CSP/caching are real.
17. **Cloud-sandbox only**: Docker Hub mirror via `SUPABASE_INTERNAL_IMAGE_REGISTRY=docker.io` because `ghcr.io` blobs were blocked by egress policy. Not needed on normal machines.

## Hosted auth settings are not pushed from `config.toml`

`supabase/config.toml` describes the local stack (localhost `site_url`). For a hosted project, disable public sign-up and set the Site URL in the Supabase dashboard rather than with `supabase config push`, which would overwrite the hosted Site URL. Documented in `docs/DEPLOYMENT.md` and in a comment in `config.toml`.
