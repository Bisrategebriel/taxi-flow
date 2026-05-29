# TaxiFlow

A taxi terminal and route management platform — mobile-first PWA for commuters, desktop admin dashboard for operators.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · Supabase · Groq AI · Leaflet · Stripe

---

## Local development

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9 (`npm install -g pnpm`)
- Docker Desktop (for local Supabase)
- Supabase CLI (`brew install supabase/tap/supabase` or see [supabase.com/docs/guides/cli](https://supabase.com/docs/guides/cli))

### Setup

```bash
git clone https://github.com/Bisrategebriel/taxi-flow.git
cd taxi-flow
pnpm install
cp .env.example .env.local   # fill in values — see .env.example for guidance
supabase start               # starts local Postgres + Auth + Storage (Docker required)
supabase db reset            # applies all migrations and seed.sql
pnpm dev                     # http://localhost:3000
```

### Test credentials (local only, after `supabase db reset`)

| Role | Email | Password |
|---|---|---|
| Super Admin | superadmin@taxiflow.test | Admin1234! |
| Admin | admin@taxiflow.test | Admin1234! |
| User | alice@taxiflow.test | User1234! |
| User | bob@taxiflow.test | User1234! |

### Required env vars

Copy `.env.example` to `.env.local` and fill in:

| Variable | Source |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `supabase status` → API URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `supabase status` → anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | `supabase status` → service_role key |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` for local dev |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe dashboard → Developers → API keys |
| `STRIPE_SECRET_KEY` | Stripe dashboard → Developers → API keys |
| `STRIPE_WEBHOOK_SECRET` | `stripe listen` output (see Stripe section below) |
| `GROQ_API_KEY` | [console.groq.com](https://console.groq.com) → API Keys |
| `ORS_API_KEY` | [openrouteservice.org](https://openrouteservice.org) → Dashboard |

### Stripe local webhook forwarding

Install the [Stripe CLI](https://stripe.com/docs/stripe-cli), then in a separate terminal:

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

Copy the `whsec_...` signing secret printed by `stripe listen` into `STRIPE_WEBHOOK_SECRET` in `.env.local`.

---

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Dev server (webpack mode — required for Serwist PWA) |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint |
| `pnpm type-check` | TypeScript strict check |
| `pnpm test` | Vitest unit + smoke tests |
| `pnpm test:rls` | RLS integration tests (requires local Supabase running) |
| `pnpm db:types` | Regenerate `types/database.types.ts` from local schema |
| `supabase db push` | Push pending migrations to the linked remote Supabase project |
| `supabase db reset` | Drop and recreate local DB from migrations + seed (local only) |

---

## Production deploy

### 1 — Provision Supabase Cloud

1. Create a new project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Link locally and push all migrations:
   ```bash
   supabase login
   supabase link --project-ref <YOUR_PROJECT_REF>
   supabase db push
   ```
3. In the Supabase dashboard → **Authentication → URL Configuration**:
   - Site URL: `https://<your-vercel-url>.vercel.app`
   - Redirect URLs: `https://<your-vercel-url>.vercel.app/**`
4. Create the super admin account via **Authentication → Users → Add user**, then set the role in the SQL editor:
   ```sql
   UPDATE public.profiles SET role = 'super_admin' WHERE id = '<user-uuid>';
   ```

### 2 — Configure Vercel

In your Vercel project → **Settings → Environment Variables**, add all variables from the table above using the production Supabase keys.

### 3 — Stripe webhook (production)

Create a webhook endpoint in the Stripe dashboard (test mode) pointing at:
```
https://<your-vercel-url>.vercel.app/api/webhooks/stripe
```
Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`.

Copy the endpoint's `whsec_...` signing secret to the `STRIPE_WEBHOOK_SECRET` env var in Vercel.

### 4 — Deploy

Merge your branch to `main` — Vercel auto-deploys from `main`.

See [docs/phases/PHASE-10-production-deployment.md](docs/phases/PHASE-10-production-deployment.md) for the full step-by-step guide.

---

## Architecture

```
app/
├── (landing)/            public landing page
├── (user)/               protected PWA routes (mobile-first)
├── (admin)/              protected admin dashboard (desktop-optimised)
├── track/[token]/        public live-tracking page (no auth required)
├── api/                  Route Handlers — chat, payment, Stripe webhook
└── auth/                 login · register · password reset · callback
```

See [PLAN.md](./PLAN.md) for the full phase breakdown and SRS requirement mapping.
