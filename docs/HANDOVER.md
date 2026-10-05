# Handover guide (short version)

Run commands **one line at a time**. Do not paste lines starting with `#` into zsh.

## Step 0: before anything (install once)

- [ ] **Node.js 22 or newer**: check with `node -v`
- [ ] **Docker Desktop**: installed and **open** (the whale icon must say "running")
- [ ] **Git** and **VS Code**
- [ ] Nothing else using ports 3000 and 54321 to 54324. If unsure, run `npx supabase stop --all` later.

## Step 1: first-time setup (once per computer)

```
git clone https://github.com/ShabbirHussainCodes/clinicflow.git
cd clinicflow
npm ci
npm run db:start
npm run env:local
npm run db:reset
npm run admin:create -- --email YOUR_EMAIL --name "Your Name"
```

`admin:create` asks for a password: at least 12 characters, letters and digits. Typing is hidden.

## Step 2: start everything (every day)

1. Open **Docker Desktop** and wait until it is running.
2. In the `clinicflow` folder:

```
npm run db:start
npm run dev
```

3. Open:
   - Patient site: http://localhost:3000
   - Staff login: http://localhost:3000/admin/login

**Stop:** press `Ctrl + C` in the terminal, then run `npm run db:stop`.

You do **not** repeat `env:local`, `db:reset` or `admin:create` each day.

## If something breaks

| Problem                          | Fix                                                          |
| -------------------------------- | ------------------------------------------------------------ |
| `port is already allocated`      | `npx supabase stop --all`, then `npm run db:start`           |
| Site says "We're having trouble" | Database is not running: open Docker, run `npm run db:start` |
| `SUPABASE_URL ... must be set`   | Start the database, then `npm run env:local -- --force`      |
| Cannot log in after `db:reset`   | `db:reset` deletes the admin. Run `admin:create` again       |

## Working with Claude Code and Git (your own commits)

```
git checkout main
git pull origin main
git checkout -b feature/short-name
```

Work with Claude Code (start it inside the `clinicflow` folder; it reads `CLAUDE.md`). Before committing:

```
git status
npm run verify
```

- `git status` must **not** list `.env.local`, `node_modules` or `test-results`.
- Changed anything in `supabase/`? Also run `npm run test:db`.

```
git add .
git commit -m "feat: what you changed"
git push -u origin feature/short-name
```

Open a Pull Request on GitHub, review it, merge it yourself, then `git checkout main` and `git pull origin main`.
**Never commit directly on `main`.**

## Handing over to a client

1. The **client owns** the Supabase, Render and GitHub accounts.
2. Set up their project with [DEPLOYMENT.md](DEPLOYMENT.md).
3. Create **their** admin first (for a hosted project, use that project's URL and service key for this one command only):

```
SUPABASE_URL=https://PROJECT-REF.supabase.co SUPABASE_SERVICE_ROLE_KEY=SECRET npm run admin:create -- --email client@theirclinic.com --name "Client Name"
```

4. Remove **your** access:

```
SUPABASE_URL=https://PROJECT-REF.supabase.co SUPABASE_SERVICE_ROLE_KEY=SECRET npm run admin:create -- --email your@email.com --deactivate
```

5. Forgot password later: same command as step 3 with `--reset-password` instead of `--name`. There is no self-service reset screen yet.
6. Replace the demo clinic data, set `SHOW_DEMO_NOTICE=false`, and get the privacy page reviewed.
7. Never send passwords or keys by chat or email in plain text; use a password manager.

## Danger zone

- `npm run db:reset` **erases the local database** (all data and the admin login). Local only. Never run it with `--linked`, and never on a real clinic's project.
- Never commit `.env.local`, passwords, the service key or real patient data.

## Read more

| Need                               | File                                     |
| ---------------------------------- | ---------------------------------------- |
| What is built, how to run and test | [../README.md](../README.md)             |
| Going live (Supabase and Render)   | [DEPLOYMENT.md](DEPLOYMENT.md)           |
| What to build next                 | [NEXT_STEPS.md](NEXT_STEPS.md)           |
| What was verified and what was not | [BUILD_REPORT.md](BUILD_REPORT.md)       |
| Connecting n8n later               | [N8N_INTEGRATION.md](N8N_INTEGRATION.md) |
| Security notes                     | [SECURITY.md](SECURITY.md)               |
