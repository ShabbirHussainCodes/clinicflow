# ClinicFlow Development Instructions

Read `docs/PROJECT_BRIEF.md` completely before planning or changing code. It is the authoritative product specification.

## Working approach

- Build a complete working product, not only a prototype or visual mockup.
- Continue autonomously through implementation, testing and refinement.
- Make sensible decisions when the brief leaves a small detail open.
- Prioritize reliability, usability and visual quality over adding excessive features.
- Use a separate feature branch.
- Commit and push completed work to that branch.
- Create a pull request for review.
- Never merge the pull request into `main`; the repository owner will merge it.
- Never commit credentials, tokens, `.env` files or real patient information.
- Keep the project compatible with free tiers and local development.
- Run linting, type checks, meaningful tests and a production build before completion.
- Fix every reproducible error found during verification.
- Maintain `docs/BUILD_REPORT.md` with completed work, verification results and genuine limitations.

## Product boundaries

- Supabase will provide PostgreSQL and admin authentication.
- n8n will be connected later by the repository owner.
- Prepare a clean event and webhook interface for n8n without making n8n necessary for the application to work.
- Do not add paid services.
- Do not collect diagnoses, medical records or unnecessary sensitive patient data.
- Use fictional information and demo data only.

## Continuity and handoff

The repository must contain enough information for a new Claude Code session or another developer to continue without access to previous conversations.

Before ending every substantial work session:

- Update `docs/BUILD_REPORT.md` with completed work and verification results.
- Update `docs/NEXT_STEPS.md` with unfinished work in priority order.
- Record important technical decisions in `docs/DECISIONS.md`.
- Keep setup and run instructions in `README.md` accurate.
- Document new environment variables in `.env.example`.
- Keep all database changes inside versioned Supabase migrations.
- Update seed data when the schema changes.
- Commit and push all completed work to the active feature branch.
- State the exact commands needed to resume development.

Never depend on undocumented chat context.

Keep the application portable between Supabase accounts and projects:

- Do not hardcode a Supabase project reference, URL or key.
- Read connection information from environment variables.
- Keep schema, functions, policies and seed data in the repository.
- Document how to link a different hosted Supabase project.
- Document how to apply all migrations to a fresh project.