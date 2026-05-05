# TaxiFlow

A taxi terminal and route management platform — mobile-first PWA for commuters with a desktop admin dashboard.

Built with Next.js 16 (App Router), TypeScript, Tailwind CSS 4, Fluent UI v9, Supabase, Gemini AI, Leaflet, and Stripe.

See [PLAN.md](./PLAN.md) for the full build plan and phase breakdown.

## Prerequisites

- Node.js v20 or higher
- pnpm v9 or higher (`npm install -g pnpm`)
- Docker Desktop (for local Supabase)
- Supabase CLI (`supabase -v`)

## Dev setup

```bash
# Clone the repo
git clone <repo-url>
cd taxiflow

# Install dependencies
pnpm install

# Copy env vars and fill in your values
cp .env.example .env.local

# Start local Supabase (Docker must be running)
supabase start

# Start the dev server
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start dev server |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint check |
| `pnpm type-check` | TypeScript check |
| `pnpm test` | Run tests (Vitest) |
| `pnpm format` | Format with Prettier |
