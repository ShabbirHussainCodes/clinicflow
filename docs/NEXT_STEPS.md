# Next steps (priority order)

1. **Review and merge the PR**, then run the full local gate once on your machine: `npm ci && npm run db:start && npm run env:local && npm run db:reset && npm run verify && npm run test:db && npm run test:e2e`.
2. **Manual accessibility pass** (`docs/ACCESSIBILITY.md`) and a real-device check (iOS Safari, Android Chrome); review tablet width.
3. **Real clinic data**: replace seed content, set `SHOW_DEMO_NOTICE=false`, review the privacy notice with a lawyer, add the clinic's real hours/holidays.
4. **Hosted deployment dry run** following `docs/DEPLOYMENT_DRY_RUN.md` (a step-by-step checklist; not yet performed: it needs your own Supabase and Render accounts). Record results in `docs/BUILD_REPORT.md`. Open questions to answer during the run: `db push --include-seed` flag, sign-up setting behaviour on hosted, and whether Render overwrites a client-supplied `X-Forwarded-For`.
5. **Automation**: connect n8n (`docs/N8N_INTEGRATION.md`), pick a scheduler, build confirmation/reminder workflows.
6. **Abuse protection**: Turnstile CAPTCHA; shared rate-limit store if scaling beyond one instance.
7. **Staff features**: create bookings by phone (`source='admin'` exists in the schema), edit clinic info/doctors/services in the UI, multiple roles, MFA, password reset.
8. **Patient self-service** cancel/reschedule via a verified secret; waitlist.
9. **Data lifecycle**: retention/anonymisation of old appointments; export.
10. **Quality**: visual regression snapshots, load test of the slot RPCs, CI caching.

Resume commands: `git checkout claude/magical-mayer-mda3ec && npm ci && npm run db:start && npm run env:local && npm run db:reset && npm run admin:create -- --email you@example.com --name "You" && npm run dev`.
