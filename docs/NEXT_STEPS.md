# Next steps (priority order)

1. **Manual accessibility pass** (`docs/ACCESSIBILITY.md`) and a real-device check (iOS Safari, Android Chrome). (The first PR is merged and the end-to-end suite passed on the owner's Mac; tablet width has been reviewed.)
2. **Investigate the `The destination stream closed early` server log lines** seen during e2e runs (see `docs/BUILD_REPORT.md`); confirm they are only aborted-connection noise.
3. **Real clinic data**: replace seed content, set `SHOW_DEMO_NOTICE=false`, review the privacy notice with a lawyer, add the clinic's real hours/holidays.
4. **Hosted deployment dry run** following `docs/DEPLOYMENT.md` (not performed here: no hosted Supabase/Render access). Verify the checklist.
5. **Automation**: connect n8n (`docs/N8N_INTEGRATION.md`), pick a scheduler, build confirmation/reminder workflows.
6. **Abuse protection**: Turnstile CAPTCHA; shared rate-limit store if scaling beyond one instance.
7. **Staff features**: create bookings by phone (`source='admin'` exists in the schema), edit clinic info/doctors/services in the UI, multiple roles, MFA, password reset.
8. **Patient self-service** cancel/reschedule via a verified secret; waitlist.
9. **Data lifecycle**: retention/anonymisation of old appointments; export.
10. **Quality**: visual regression snapshots, load test of the slot RPCs, CI caching.

Resume commands: `git checkout claude/magical-mayer-mda3ec && npm ci && npm run db:start && npm run env:local && npm run db:reset && npm run admin:create -- --email you@example.com --name "You" && npm run dev`.
