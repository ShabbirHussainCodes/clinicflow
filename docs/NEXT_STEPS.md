# Next steps (priority order)

1. **Real photography and logo for each client** (portraits, clinic photo, map picture, logo) and a read-through of every sentence in `src/config/site.ts`. Without photographs the site is clean but cannot look like a specific clinic. See `docs/CUSTOMIZE.md`.
2. **Edit the site from the staff area**: clinic details, doctors, services, the wording in `src/config/site.ts` (move it to a table) and photo upload through Supabase Storage, so a client never edits files or the database by hand.
3. **Manual accessibility pass** (`docs/ACCESSIBILITY.md`) and a real-device check (iOS Safari, Android Chrome), including the new FAQ accordion, hours table and the pinned Call and Book bar.
4. **Investigate the `The destination stream closed early` server log lines** seen during e2e runs (see `docs/BUILD_REPORT.md`); confirm they are only aborted-connection noise. They are now more frequent because one test navigates quickly between pages.
5. **Real clinic data**: replace seed content, set `SHOW_DEMO_NOTICE=false`, review the privacy notice with a lawyer, add the clinic's real hours/holidays.
6. **Hosted deployment dry run** following `docs/DEPLOYMENT.md` (not performed here: no hosted Supabase/Render access). Verify the checklist.
7. **Search and sharing**: structured data (`MedicalClinic`, `Physician`), a social preview image, a page per doctor and per service.
8. **Automation**: connect n8n (`docs/N8N_INTEGRATION.md`), pick a scheduler, build confirmation/reminder workflows.
9. **Abuse protection**: Turnstile CAPTCHA; shared rate-limit store if scaling beyond one instance.
10. **Staff features**: create bookings by phone (`source='admin'` exists in the schema), multiple roles, MFA, password reset.
11. **Patient self-service** cancel/reschedule via a verified secret; waitlist.
12. **Languages**: Hindi and Marathi copy needs a Devanagari font subset (the bundled fonts are Latin only).
13. **Data lifecycle**: retention/anonymisation of old appointments; export.
14. **Quality**: visual regression snapshots, load test of the slot RPCs, CI caching.

Resume commands: `git checkout claude/magical-mayer-mda3ec && npm ci && npm run db:start && npm run env:local && npm run db:reset && npm run admin:create -- --email you@example.com --name "You" && npm run dev`.
