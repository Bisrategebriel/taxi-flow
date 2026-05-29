# Phase 10 — Polish, Performance & Production Deploy

## Scope note

Third-party integrations (Stripe, Groq, ORS) stay on **test/dev keys** throughout this phase. No live-mode Stripe keys are needed. The production Supabase project is a hosted Supabase Cloud project; local Docker is for dev only.

---

## Pre-flight check

- Branch `phase-10-production-deployment` exists and is checked out.
- `pnpm build --webpack` succeeds locally.
- `pnpm test` passes.
- `pnpm lint` is clean.
- Docker Desktop and local Supabase are running (`supabase status` shows all services up).
- You have accounts on: Supabase (supabase.com), Vercel (vercel.com), Stripe (test dashboard), GitHub.
- The GitHub repo is at `https://github.com/Bisrategebriel/taxi-flow`.
- Vercel project already linked from Phase 0 — deployment URL: `https://taxi-flow-five.vercel.app`.

---

## Numbered task list

### Task 1 — Add missing error boundaries

Every route segment should have an `error.tsx` so unhandled server errors show a user-friendly message instead of a Next.js crash screen.

Add an `error.tsx` at the `(user)` group level and the `(admin)` group level if they do not already exist:

**File:** `app/(user)/error.tsx`

```tsx
"use client";

import { useEffect } from "react";

export default function UserError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-lg font-semibold">Something went wrong</p>
      <p className="text-sm text-muted-foreground max-w-sm">
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={reset}
        className="h-9 rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground"
      >
        Try again
      </button>
    </div>
  );
}
```

**File:** `app/(admin)/error.tsx` — same pattern, same content.

**File:** `app/error.tsx` — root-level catch-all, same pattern.

Verify none of these already exist first (`ls app/(user)/error.tsx` etc.).

---

### Task 2 — Update README

Replace `README.md` with a complete setup + deploy reference:

```markdown
# TaxiFlow

A taxi terminal and route management platform — mobile-first PWA for commuters, desktop admin dashboard for operators.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase · Groq AI · Leaflet · Stripe

---

## Local development

### Prerequisites
- Node.js ≥ 20
- pnpm ≥ 9 (`npm install -g pnpm`)
- Docker Desktop (for local Supabase)
- Supabase CLI (`brew install supabase/tap/supabase` or see supabase.com/docs/guides/cli)

### Setup

```bash
git clone https://github.com/Bisrategebriel/taxi-flow.git
cd taxi-flow
pnpm install
cp .env.example .env.local   # fill in values — see .env.example comments
supabase start               # starts local Postgres + Auth + Storage
supabase db reset            # applies migrations + seed.sql
pnpm dev                     # http://localhost:3000
```

### Test credentials (local only, after `supabase db reset`)

| Role | Email | Password |
|---|---|---|
| Super Admin | superadmin@taxiflow.test | Admin1234! |
| Admin | admin@taxiflow.test | Admin1234! |
| User | alice@taxiflow.test | User1234! |

### Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Dev server (webpack mode, required for Serwist PWA) |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint |
| `pnpm type-check` | TypeScript strict check |
| `pnpm test` | Vitest unit + smoke tests |
| `pnpm test:rls` | RLS integration tests (requires local Supabase running) |
| `pnpm db:types` | Regenerate `types/database.types.ts` from local schema |
| `supabase db push` | Push local migrations to linked remote Supabase project |

---

## Production deploy

See `docs/phases/PHASE-10-production-deployment.md` for the full provisioning guide.

Quick summary:
1. Provision a Supabase Cloud project and push migrations (`supabase db push`).
2. Set all env vars in the Vercel project dashboard.
3. Configure Supabase Auth → Site URL and redirect URLs.
4. Merge `phase-10-production-deployment` → `main` — Vercel auto-deploys.

---

## Architecture

```
app/
├── (landing)/            public landing page
├── (user)/               protected PWA routes (mobile-first)
├── (admin)/              protected admin dashboard (desktop)
├── track/[token]/        public live-tracking page (no auth)
├── api/                  Route Handlers (chat, payment, stripe webhook)
└── auth/                 login · register · password reset · callback
```

See `PLAN.md` for the full phase breakdown and SRS requirement mapping.
```

---

### Task 3 — Provision the production Supabase project

Do this in a browser — **not** in the terminal (Supabase project creation is dashboard-only).

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard).
2. Click **New project**.
3. Organisation: your personal org (or create one).
4. Project name: `taxiflow-prod`.
5. Database password: generate a strong random password and **save it** — you will need it to run `supabase db push`.
6. Region: pick the region closest to your users (e.g. EU West if deploying for Ethiopia region, or closest available).
7. Click **Create new project** and wait ~2 minutes for provisioning.

Once provisioned, from the project dashboard collect these four values:

| Value | Where to find it |
|---|---|
| **Project ref** | URL: `supabase.com/dashboard/project/<REF>` |
| **Project URL** | Settings → API → Project URL |
| **Anon (public) key** | Settings → API → `anon` `public` |
| **Service role key** | Settings → API → `service_role` `secret` (click reveal) |

Keep the service role key secret — it bypasses RLS.

---

### Task 4 — Link local project and push migrations

In the terminal, authenticate and link:

```bash
supabase login          # opens browser — sign in once
supabase link --project-ref <YOUR_PROJECT_REF>
# when prompted for DB password, enter the one from Task 3
```

Push all migrations to the production database:

```bash
supabase db push
```

Expected output: a list of migration files applied in order, ending with no errors.

Verify in the Supabase dashboard → **Table Editor** that all 12+ tables exist (`profiles`, `terminals`, `routes`, `fares`, `distances`, `trips`, `trip_locations`, `share_tokens`, `payments`, `chat_logs`, `notifications`, `system_settings`, `audit_logs`).

> **Do NOT run `supabase db reset` against the production project.** `db reset` drops the database before applying migrations. Use `db push` only, which applies pending migrations only.

> **Do NOT run `seed.sql` in production.** The seed contains test-only accounts. Production users are created in Task 6.

---

### Task 5 — Configure Supabase Auth for production

In the Supabase dashboard for `taxiflow-prod`:

1. Go to **Authentication → URL Configuration**.
2. Set **Site URL** to:
   ```
   https://taxi-flow-five.vercel.app
   ```
3. Under **Redirect URLs**, add these entries (one per line):
   ```
   https://taxi-flow-five.vercel.app/**
   https://*.vercel.app/**
   http://localhost:3000/**
   ```
   The wildcard entries cover Vercel preview deployments and local dev.

4. Go to **Authentication → Providers → Email** — confirm:
   - Email confirmations: enabled (or disabled for easier dev testing — your call)
   - Secure email change: enabled

---

### Task 6 — Create the production super admin account

Production has no seed data. Create the super admin manually:

**Step A — Create the auth user via Supabase dashboard:**

1. Go to **Authentication → Users → Add user**.
2. Email: your real admin email address.
3. Password: a strong password.
4. Click **Create user**.
5. Copy the **UUID** from the Users table (you will need it in Step B).

**Step B — Set the role in the SQL editor:**

In the Supabase dashboard → **SQL Editor**, run:

```sql
UPDATE public.profiles
SET role = 'super_admin',
    full_name = 'Super Admin'   -- replace with your actual name
WHERE id = '<PASTE_UUID_FROM_STEP_A>';
```

If the `profiles` row was not auto-created by the trigger (the trigger fires on `auth.users` insert — it should have run), insert it manually:

```sql
INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
VALUES (
  '<PASTE_UUID_FROM_STEP_A>',
  '<your-email>',
  'Super Admin',
  'super_admin',
  now(),
  now()
)
ON CONFLICT (id) DO UPDATE SET role = 'super_admin';
```

**Step C — Seed the system_settings defaults:**

The `seed.sql` system_settings rows are needed in production but without test users. Run this in the SQL editor:

```sql
INSERT INTO public.system_settings (key, value, description) VALUES
  ('ai_chat_enabled',          'true',  'Enable or disable AI chat for all users'),
  ('registration_enabled',     'true',  'Allow new user registrations'),
  ('login_enabled',            'true',  'Allow user logins'),
  ('maintenance_mode',         'false', 'Put the platform into maintenance mode'),
  ('share_tracking_enabled',   'true',  'Allow users to share live trip tracking links'),
  ('session_timeout_minutes',  '0',     'Session inactivity timeout in minutes (0 = disabled)'),
  ('announcement',             'null',  'Broadcast message shown to all users')
ON CONFLICT (key) DO NOTHING;
```

---

### Task 7 — Configure Vercel environment variables

Go to [vercel.com/dashboard](https://vercel.com/dashboard) → your `taxi-flow` project → **Settings → Environment Variables**.

Add each variable below. Set scope to **Production** (and optionally **Preview** — use the same values).

| Variable | Value source |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://taxi-flow-five.vercel.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard → Settings → API → anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Settings → API → service_role key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe dashboard (test mode) → Developers → API keys → Publishable key |
| `STRIPE_SECRET_KEY` | Stripe dashboard (test mode) → Developers → API keys → Secret key |
| `STRIPE_WEBHOOK_SECRET` | Created in Task 8 below |
| `GROQ_API_KEY` | console.groq.com → API Keys |
| `ORS_API_KEY` | openrouteservice.org → Dashboard → API Key |

> **Stripe stays in test mode.** Use the `pk_test_...` and `sk_test_...` keys from the Stripe test dashboard. Do not use live keys.

After adding all variables, click **Save** and confirm they appear in the list.

---

### Task 8 — Set up Stripe webhook for the production URL (test mode)

Since Stripe stays in test mode, configure the webhook in the **Stripe test dashboard** pointing at the live Vercel URL.

1. Go to [dashboard.stripe.com](https://dashboard.stripe.com) → make sure you are in **Test mode** (toggle in the top-right).
2. Go to **Developers → Webhooks → Add endpoint**.
3. Endpoint URL:
   ```
   https://taxi-flow-five.vercel.app/api/webhooks/stripe
   ```
4. Events to listen to — select these three:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `payment_intent.canceled`
5. Click **Add endpoint**.
6. On the webhook detail page, click **Reveal** next to **Signing secret** — copy the `whsec_...` value.
7. Go back to Vercel → Settings → Environment Variables → add:
   - `STRIPE_WEBHOOK_SECRET` = `whsec_...`

> The Stripe CLI (`stripe listen --forward-to localhost:3000/api/webhooks/stripe`) is still the correct tool for local dev. The dashboard webhook is for production requests only.

---

### Task 9 — Verify the build with production env values (optional but recommended)

You can do a dry-run locally against the production Supabase by temporarily setting the production values in `.env.local`:

```bash
# In .env.local (local only, never commit)
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<prod-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<prod-service-role-key>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
# Stripe and others stay the same (test keys)
```

Run `pnpm dev` and verify:
- Sign in as the super admin created in Task 6.
- Dashboard loads without errors.
- Admin panel loads.

Restore your local Supabase values in `.env.local` afterwards.

---

### Task 10 — Final build and lint check

```bash
pnpm build --webpack   # must succeed
pnpm lint              # must be clean
pnpm tsc --noEmit      # must have 0 errors
pnpm test              # must pass
```

Fix any failures before proceeding.

---

### Task 11 — Commit all phase 10 changes

```bash
git add -A
git commit -m "phase-10: error boundaries, README, production deploy config"
git push -u origin phase-10-production-deployment
```

---

### Task 12 — Open PR and merge to main

1. Open a PR from `phase-10-production-deployment` → `main` on GitHub.
   ```bash
   gh pr create \
     --title "Phase 10: production deploy — Supabase + Vercel" \
     --body "Merges phases 8, 9, and 10. Production Supabase provisioned, migrations pushed, Vercel env vars set, Stripe test-mode webhook configured. All CI checks green." \
     --base main
   ```
2. Wait for CI (GitHub Actions) to go green.
3. Merge the PR.
4. Vercel auto-deploys from `main` — watch the deployment in the Vercel dashboard.

---

### Task 13 — Post-deploy smoke test

Once the Vercel deployment finishes (usually 2–3 minutes):

**Public pages:**
- `https://taxi-flow-five.vercel.app/` — landing page loads
- `https://taxi-flow-five.vercel.app/auth/login` — login form renders

**Auth flow:**
- Sign in as the super admin created in Task 6.
- Confirm redirect to `/admin/dashboard`.

**Admin dashboard:**
- Dashboard loads with metric cards.
- Navigate to Users, Terminals, Routes, Fares — tables render (empty is fine in production).
- Navigate to Super Admin → all cards render.

**User PWA:**
- Sign in as a regular user (or create one via the Register page).
- Dashboard, Route Search, AI Chat — verify each page loads without a blank screen or error boundary.

**Stripe payment (test mode):**
- Complete a test trip end-to-end.
- On payment screen use `4242 4242 4242 4242` / any future date / any CVC.
- Verify webhook fires and trip status updates to `paid` in Supabase.

**PWA install:**
- Open the app in Chrome on Android (or iOS Safari).
- Verify the install prompt appears or the "Add to Home Screen" option is available.

---

## Acceptance script

```bash
# 1. Build
pnpm build --webpack

# 2. Type check
pnpm tsc --noEmit

# 3. Lint
pnpm lint

# 4. Tests
pnpm test
```

After CI green + Vercel deploy:

```bash
# Confirm production URL is live
curl -I https://taxi-flow-five.vercel.app/
# Expected: HTTP/2 200
```

---

## Common failure modes

### `supabase db push` fails with "relation already exists"
The migrations contain `CREATE TABLE IF NOT EXISTS` — this should be safe. If a specific migration fails, check if the table was partially created. Run `supabase db push --dry-run` first to see what would be applied.

### `supabase link` fails with "project not found"
Confirm the project ref is correct — it is the alphanumeric string in the dashboard URL (`supabase.com/dashboard/project/<REF>`), not the project name.

### Auth redirect loop on production (`/auth/callback` keeps redirecting)
The Site URL in Supabase Auth must exactly match the deployed URL (no trailing slash). If using a custom domain on Vercel, update the Site URL in Supabase Auth to match the custom domain.

### Service role key not working on Vercel (500 errors on admin actions)
Vercel caches environment variables at build time for edge functions but reads them at runtime for Node.js functions. After adding/changing env vars, trigger a **Redeploy** in the Vercel dashboard (not just a new push) to pick up the new values.

### Stripe webhook returns 400 (signature verification failed)
The `STRIPE_WEBHOOK_SECRET` must be the signing secret from the **specific webhook endpoint** created in Task 8, not the general API secret. Each endpoint has its own `whsec_...` secret. Copy it from the Stripe dashboard webhook detail page.

### `profiles` row not auto-created for new users
The trigger `on_auth_user_created` runs in the `auth` schema. If it failed silently, check Supabase dashboard → **Database → Functions** — the `handle_new_user` function should exist. If missing, it means the trigger migration was not applied. Run `supabase db push` again.

### Vercel build fails: "Cannot find module" or missing env vars at build time
- Confirm all `NEXT_PUBLIC_*` vars are set for the **Production** scope in Vercel (not just Preview).
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` must be set even though Stripe stays in test mode — the build references it.
- After adding missing vars, trigger a fresh deployment from the Vercel dashboard.

### PWA service worker not installing on production
Serwist is disabled in `development` mode (`disable: process.env.NODE_ENV === "development"`). It is enabled in `production` builds. Confirm the Vercel deployment shows `NODE_ENV=production` (this is Vercel's default). Check Chrome DevTools → Application → Service Workers to see if `sw.js` is registered.

---

## The Claude Code prompt

```
We are on branch `phase-10-production-deployment`. The goal is to finish the final Polish & Production Deploy phase of TaxiFlow.

Read CLAUDE.md and AGENTS.md first. Then read docs/phases/PHASE-10-production-deployment.md top to bottom before writing any code.

Key context:
- Stripe stays in TEST MODE — do not change any Stripe keys to live mode.
- Production Supabase provisioning (Tasks 3–6) requires browser work in the Supabase dashboard. Do not attempt to automate it with CLI commands that require interactive input.
- All migrations are already written — Task 4 is just `supabase db push` after linking.
- Task 1 (error boundaries) is the main code change. Tasks 2+ are config and infrastructure.
- After all code tasks: run pnpm build --webpack, pnpm test, pnpm lint, pnpm tsc --noEmit — all must pass.

Start with Task 1 (error boundaries — check if they already exist first), then Task 2 (README), then walk through the infrastructure tasks with guidance for what needs to be done in a browser vs terminal.
```
