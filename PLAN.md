# TaxiFlow — Master Build Plan

> **Document purpose:** This is the authoritative build plan for TaxiFlow v1.0. It defines the phased delivery, success criteria for each phase, conventions enforced throughout the codebase, and the protocol for handing each phase to Claude Code.
>
> **Source of truth for requirements:** `docs/TaxiFlow_SRS_v1_3.docx` (committed to the repo at the start of Phase 0). When this plan and the SRS disagree, the SRS wins for *what* to build; this plan wins for *how* and *in what order*.

---

## 1. Project summary

TaxiFlow is a taxi terminal & route management platform consisting of:

- A **mobile-first PWA** for commuters (route search, nearest terminal, fare lookup, AI chat, live trip tracking, public share links, post-ride Stripe payments, profile & history).
- A **desktop admin dashboard** for managing terminals, routes, fares, distances, users, trips, payments, AI chat, and (for Super Admins) auth/system/emergency settings.
- A **public tracking page** at `/track/[token]` requiring no authentication.

**Tech stack** (per SRS §15.1, with the Fluent 2 hybrid layered on top):

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript + React 19 |
| Styling | Tailwind CSS 4 (CSS-first config) + Fluent 2 design tokens |
| Components | `@fluentui/react-components` v9 (complex controls) + custom Tailwind components (layout, mobile shell) |
| Database & Auth | Supabase (Postgres, RLS, Realtime) |
| AI | Groq API (`llama-3.3-70b-versatile`) with function-calling |
| Maps | Leaflet via react-leaflet + OpenStreetMap tiles |
| Routing engine | OpenRouteService (free tier) |
| Payments | Stripe (Payment Intents + webhooks) |
| Hosting | Vercel |
| CI | GitHub Actions |
| Testing | Vitest + React Testing Library |
| PWA | Serwist (Next.js 15/16-compatible service worker library) |

---

## 2. Environment strategy

| Environment | Supabase | Stripe | Hosting |
|---|---|---|---|
| Development | Local Supabase via CLI (Docker under the hood) | Stripe test mode + Stripe CLI for webhook forwarding | `pnpm dev` on `localhost:3000` |
| Production | Hosted Supabase project | Stripe live mode | Vercel production |

Vercel preview deployments point at the production Supabase. Preview URLs are for PR review only — destructive testing happens locally.

---

## 3. Repo conventions

These rules apply to every phase. Claude Code will be told to honor them in every prompt.

### 3.1 Folder structure (per SRS §15.2)

```
taxiflow/
├── app/
│   ├── (landing)/            # public landing page
│   ├── (user)/               # protected user PWA routes
│   │   ├── dashboard/
│   │   ├── route-search/
│   │   ├── terminals/
│   │   ├── chat/
│   │   ├── trip/
│   │   └── profile/
│   ├── (admin)/              # protected admin routes
│   │   ├── dashboard/
│   │   ├── users/
│   │   ├── terminals/
│   │   ├── routes/
│   │   ├── fares/
│   │   ├── trips/
│   │   ├── payments/
│   │   ├── ai-chat/
│   │   └── settings/
│   ├── track/[token]/        # public share-tracking page (no auth)
│   ├── api/
│   │   ├── chat/
│   │   ├── payment/
│   │   └── webhooks/stripe/
│   └── auth/                 # login, register, password reset
├── components/
│   ├── ui/                   # shared primitives (Fluent + Tailwind wrappers)
│   ├── map/                  # Leaflet components (dynamic import, SSR off)
│   ├── trip/                 # ActiveTripBanner, TripTracker, ShareButton
│   ├── payment/              # StripePaymentForm, PaymentConfirmation
│   ├── chat/                 # ChatWindow, ChatMessage, ChatInput
│   └── admin/                # admin-only shells, sidebar, data tables
├── lib/
│   ├── supabase/             # client, server, middleware clients
│   ├── groq/                 # Groq client + tool definitions
│   ├── ors/                  # OpenRouteService client
│   ├── stripe/               # Stripe server + client helpers
│   ├── fluent-tokens.ts      # Fluent 2 tokens → Tailwind theme bridge
│   └── utils/
├── hooks/
│   ├── useGeolocation.ts
│   ├── useTripTracking.ts
│   └── useRealtimeLocation.ts
├── types/
│   └── database.types.ts     # generated from Supabase
├── supabase/
│   ├── migrations/           # all schema changes, version-controlled
│   ├── seed.sql              # local dev seed data
│   └── config.toml
├── public/
│   ├── manifest.json
│   └── icons/
├── docs/
│   ├── TaxiFlow_SRS_v1_3.docx
│   └── phases/               # one markdown file per phase
├── .github/workflows/        # CI configuration
├── middleware.ts             # session guard (excludes /track/* and /api/webhooks/*)
├── next.config.ts           # Tailwind 4 uses CSS-first config — no tailwind.config.ts
└── package.json
```

### 3.2 Naming & code style

- TypeScript strict mode on. No `any` without an inline justification comment.
- Components: PascalCase files (`RouteSearchForm.tsx`); hooks: camelCase prefixed `use` (`useTripTracking.ts`); route segments: lowercase-kebab (`route-search/page.tsx`).
- Server-only modules import from `lib/supabase/server.ts`; client modules from `lib/supabase/client.ts`. Never mix.
- Every requirement implemented references its SRS ID in a comment at the top of the relevant file or function (e.g. `// FR-RS-03`).

### 3.3 Git workflow

- Branch per phase: `phase-NN-short-description`.
- One PR per phase, opened against `main`, merged only when CI is green.
- Commit messages prefixed with phase: `phase-3: add bottom nav with Fluent icons`.
- No direct pushes to `main` (enforced by branch protection in Phase 0).

### 3.4 Secrets

- Anything client-readable: `NEXT_PUBLIC_*` prefix.
- Anything server-only: no prefix, never logged, never committed.
- `.env.local` is gitignored. `.env.example` is committed with placeholder values and lives at repo root.

### 3.5 Testing minimums per phase

- Every phase that adds business logic ships at least one Vitest unit test.
- Every phase that adds a route ships at least a smoke test (renders without throwing).
- RLS policies are tested with a script that runs as `anon`, `authenticated user A`, `authenticated user B`, and `admin` and asserts expected pass/fail.

---

## 4. Phase breakdown

Each phase has: a goal, prerequisite phases, deliverables, acceptance criteria, and the SRS requirement IDs it covers. Phases are designed to ship working slices — **at the end of every phase the app must build, type-check, lint, and run.**

### Phase 0 — Foundations & tooling
**Goal:** Empty machine → working dev environment with a deployed "hello world" Next.js app, local Supabase running, GitHub repo with CI green.

**Covers:** SRS §14 (CI/CD), §15.2 (folder structure scaffold).

**Deliverables:**
- pnpm, Supabase CLI, GitHub CLI installed
- `taxiflow/` folder with Next.js 14 + TS + Tailwind scaffolded
- Folder structure from §3.1 created (empty placeholder files where useful)
- `@fluentui/react-components` installed and a smoke-test page renders one Fluent component
- Local Supabase running (`supabase start` succeeds)
- GitHub repo created, first commit pushed
- `.github/workflows/ci.yml` runs lint + type-check + build + test on every PR
- Branch protection on `main` requires CI green
- Vercel project linked, first deploy live
- `PLAN.md` and SRS committed to `docs/`

**Acceptance:** `pnpm build` succeeds, CI is green on a throwaway PR, `localhost:3000` shows a Fluent-styled hello page, `supabase status` reports all services up.

---

### Phase 1 — Database schema, RLS, and auth
**Goal:** Full Supabase schema migrated, RLS policies in place and tested, email/password auth working end-to-end.

**Covers:** SRS §4.1 (FR-AU-01..06), §11 (all tables), §12.3 (NFR-SE-01, 03, 07).

**Deliverables:**
- All 12 tables from SRS §11.2 created via committed migrations
- RLS policies for every table, with a test script proving role-based access works
- `profiles` row auto-created on user signup via trigger
- Audit log triggers on critical tables (FR-EC-03, NFR-SE-07)
- TypeScript types generated from the schema (`supabase gen types`)
- Auth pages: `/auth/login`, `/auth/register`, `/auth/reset-password`, `/auth/callback`
- Supabase SSR session middleware in `middleware.ts` (excludes `/track/*` and `/api/webhooks/*`)
- Role-based redirect logic (user → `/dashboard`, admin → `/admin/dashboard`)
- Seed data: 1 super admin, 1 admin, 2 users, 5 terminals, 3 routes, fares, distances

**Acceptance:** Sign up, verify session persists across reload, RLS test script passes all expected outcomes, generated types compile.

---

### Phase 2 — Design system + landing page
**Goal:** Fluent 2 design tokens wired into Tailwind, shared UI primitives built, public landing page complete.

**Covers:** SRS §3 (FR-LP-01..10), §12.1 (NFR-US-03 contrast).

**Deliverables:**
- `lib/fluent-tokens.ts` exporting Fluent 2 colors, type ramp, spacing, motion as Tailwind theme extensions
- `tailwind.config.ts` extended with Fluent tokens
- Fluent provider wrapping the root layout with light/dark theme support
- Shared primitives in `components/ui/`: `Button`, `Card`, `Input`, `Heading`, `Container` — all Fluent-token-driven
- Landing page sections: Hero, Features, How It Works, About, Footer
- All landing requirements (FR-LP-01..10) implemented
- WCAG 2.1 AA contrast verified with axe DevTools

**Acceptance:** Landing page passes Lighthouse a11y ≥ 95, all CTAs route correctly, looks correct at 320px and 1920px.

---

### Phase 3 — User PWA shell & dashboard
**Goal:** Mobile-first user app shell with bottom nav, home dashboard, and PWA installability.

**Covers:** SRS §4.2 (FR-UD-01..07), §12.5 (NFR-CO-01, 03).

**Deliverables:**
- Bottom nav component (Home, Route Search, Nearest Terminal, AI Chat, Profile) — mobile only
- Top sidebar variant for tablet/desktop breakpoints
- Home screen: welcome message, quick-action cards
- Serwist configured: manifest.json, icons (multiple sizes), service worker, install prompt
- Profile page skeleton (FR-PS-01..04 — full impl in Phase 9)
- Skeleton loading states for all screens
- Persistent layout shell across all `(user)` routes

**Acceptance:** Install prompt fires on Chrome/Android. Lighthouse PWA audit passes. Bottom nav active state correct on every route.

---

### Phase 4 — Maps, routing, and core search
**Goal:** Route search and nearest-terminal flows fully working with interactive Leaflet maps and ORS step-by-step directions.

**Covers:** SRS §4.3 (FR-RS-01..07), §4.4 (FR-NT-01..05), §4.5 (FR-FI-01..03), §6.1–6.5 (FR-MP-01..19), §6.8 (limitations).

**Deliverables:**
- ORS client in `lib/ors/` with caching layer (FR-MP-16)
- `components/map/` with Leaflet wrapper using dynamic import + SSR off (avoids `window is not defined`)
- Route search form with terminal autocomplete
- Route result page: map + polyline + start/end pins + intermediate stops + step-by-step directions panel + total distance + ETA + fare
- Nearest terminal page: typed location OR GPS, list sorted by distance, map with all pins
- Reverse start/destination tap (FR-RS-06)
- LocalStorage recent searches (FR-RS-07)
- "No route found" empty state (FR-RS-05)
- GPS permission flow (FR-NT-02, FR-MP-07..09)
- All map interactions touch-friendly on mobile (FR-MP-06)

**Acceptance:** End-to-end: pick start, pick end, see route on map, see steps, see fare. Lighthouse perf ≥ 80 on the result page (NFR-PE-01, 02).

---

### Phase 5 — AI chatbot
**Goal:** Groq-powered chat with function-calling against Supabase, streamed responses, persisted history.

**Covers:** SRS §4.6 (FR-AI-01..08), §10 (FR-CB-01..08), §12.2 (NFR-PE-03).

**Deliverables:**
- `lib/groq/` with client and tool definitions: `get_routes`, `get_terminals`, `get_fare`, `get_route_details`
- `app/api/chat/route.ts` Route Handler: auth check → Groq call → tool execution → streamed response
- Chat UI in `components/chat/`: ChatWindow, ChatMessage, ChatInput, streaming indicator
- Conversation history persisted to `chat_logs` (FR-AI-06)
- System prompt with TaxiFlow schema context
- Disabled state when admin toggles AI off (FR-AI-08, gated by `system_settings.ai_chat_enabled`)
- Graceful fallback when Groq is unreachable (NFR-RE-06)

**Acceptance:** Ask "what's the fare from Terminal A to Terminal B" → bot calls `get_fare`, returns real value. First token within 3s (NFR-PE-03). Toggle off in admin disables UI for users.

---

### Phase 6 — Trip tracking & share links
**Goal:** Live GPS trip tracking with public share-tracking pages.

**Covers:** SRS §7 (FR-TR-01..13), §8 (FR-ST-01..17), §12.2 (NFR-PE-04), §12.3 (NFR-SE-05, 06).

**Deliverables:**
- `useGeolocation`, `useTripTracking`, `useRealtimeLocation` hooks
- "Start Trip" button on route result page
- ActiveTripBanner persistent across all PWA screens (NFR-US-06)
- 5-second GPS broadcast to Supabase Realtime channel
- 30-second snapshot to `trip_locations` (FR-TR-05)
- "End Trip" → status `completed`, transitions to payment (Phase 7 hook)
- Share Location button → UUID share token → tracking URL
- Native share sheet integration via Web Share API
- Public `/track/[token]/page.tsx`: no auth, live marker, route polyline, traveller first name, route name, start time
- Expired token state (FR-ST-13)
- Public-read RLS function for share tokens (private user data NEVER exposed — NFR-SE-06)

**Acceptance:** Open `/track/[token]` in incognito → see live position update every 5s while trip active. End trip → tracking page shows "Trip Ended". Trip history visible in profile.

---

### Phase 7 — Stripe post-ride payments
**Goal:** Full post-ride payment flow with Stripe Elements and webhooks.

**Covers:** SRS §9 (FR-PM-01..21), §12.3 (NFR-SE-04), §12.4 (NFR-RE-03, 04).

**Deliverables:**
- `lib/stripe/` server + client helpers
- `app/api/payment/route.ts`: creates Payment Intent, returns client secret
- `app/api/webhooks/stripe/route.ts`: signature verification + idempotent event handling for `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`
- Payment screen post-trip: route summary + fare + Stripe Elements card form
- Payment confirmation screen with receipt option
- "Pay later" flow → trip marked `payment_pending` (FR-PM-08)
- Payment history in profile
- Stripe CLI documented for local webhook forwarding
- USD currency configured

**Acceptance:** End trip → see payment screen → pay with `4242 4242 4242 4242` → webhook fires → trip marked `paid` in DB → receipt visible. Test failure card → trip stays `payment_pending`.

---

### Phase 8 — Admin dashboard core
**Goal:** Admin interface for terminals, routes, fares, distances, users, trips, payments — full CRUD with Fluent DataGrid.

**Covers:** SRS §5.1–5.8 (FR-AD-01..03, FR-UM-01..07, FR-TM-01..05, FR-RM-01..06, FR-FM-01..04, FR-DM-01..03, FR-AC-01..03), §6.6–6.7 (FR-MA-01..07), §9.4 (FR-PM-13..17).

**Deliverables:**
- Admin sidebar layout (1280px+ optimized — NFR-CO-02)
- Dashboard overview with metric cards
- Recent activity feed
- User management with Fluent DataGrid: list, edit, suspend, delete, reset password, search/filter
- Terminal management: table + interactive Leaflet placement map (click to place pin, drag to move)
- Route management: table + start/end terminal pickers + intermediate stops + live route preview map
- Fare management with bulk-update confirmation
- Distance management
- AI chat control: global toggle + chat log viewer with filters
- Payments management: revenue overview, transaction list, Stripe PI lookup, waive flow
- Trip management: list view across all users with filters

**Acceptance:** Every admin CRUD operation works end-to-end. Map-based terminal placement updates lat/lng. Disabling AI chat in admin disables it in user PWA in real-time.

---

### Phase 9 — Super Admin: auth, system, emergency controls
**Goal:** Super-Admin-only screens and the audit log viewer.

**Covers:** SRS §5.9–5.11 (FR-AS-01..04, FR-SS-01..03, FR-EC-01..03), §8.4 (FR-ST-16, 17).

**Deliverables:**
- Auth Settings: registration toggle, login toggle, force-logout-all, session timeout
- System Settings: maintenance mode, broadcast announcement, reset non-critical data
- Emergency Controls: emergency stop with two-step confirmation
- Audit log viewer with filtering
- Maintenance mode middleware: when enabled, all non-admin routes show maintenance screen
- Announcement banner component for users
- Share tracking global toggle

**Acceptance:** Super Admin can flip maintenance → user PWA shows maintenance page. Force-logout-all signs out every active session. Every super-admin action lands in `audit_logs`.

---

### Phase 10 — Polish, performance, a11y, production deploy
**Goal:** Ship-ready quality bar.

**Covers:** SRS §12 (all NFRs).

**Deliverables:**
- Lighthouse Performance ≥ 80 on user PWA (NFR-PE-01) — verified across all primary screens
- WCAG 2.1 AA contrast pass (NFR-US-03)
- Loading skeletons on every async screen (NFR-US-04)
- Confirmation dialogs on every destructive action (NFR-US-05)
- Error boundaries on every route segment with user-friendly messages (NFR-RE-01)
- Cross-browser smoke test: Chrome, Safari, Firefox, Edge — last 2 versions (NFR-CO-01)
- iOS Safari "Add to Home Screen" verified (NFR-CO-03)
- Production Supabase project provisioned, migrations applied
- Stripe live mode keys swapped in
- Vercel production deploy live with custom domain (if applicable)
- README with setup, dev, deploy instructions

**Acceptance:** Lighthouse audits all pass thresholds. Production URL serves the app. End-to-end happy path works on a real iPhone and a real Android.

---

## 5. Claude Code handoff protocol

Each phase has a corresponding `docs/phases/PHASE-NN-<name>.md` that I will write *after you approve this plan and the previous phase is complete*. Each phase doc contains:

1. **Pre-flight check** — what should be true before starting (previous phase merged, env vars set, etc.)
2. **Numbered task list** — each task has the exact commands, file paths, and code snippets needed
3. **Acceptance script** — commands you run at the end to verify the phase is done
4. **Common failure modes** — what to do if something breaks
5. **The Claude Code prompt** — the literal text to paste into Claude Code, scoped to that phase

You drive Claude Code one phase at a time:

1. Read the phase doc top-to-bottom yourself first.
2. Create the branch: `git checkout -b phase-NN-name`.
3. Paste the Claude Code prompt from the phase doc.
4. Review every diff Claude Code proposes — do not blanket-accept.
5. Run the acceptance script.
6. Open a PR, wait for CI green, merge, delete branch.
7. Come back to me — I'll write the next phase doc.

**Rule:** I do not write phase N+1 until phase N is merged. This prevents the plan from drifting if reality forces a change mid-phase.

---

## 6. Open questions deferred to later phases

These are intentionally not decided yet — we'll resolve them at the phase that needs them:

- **Phase 2:** Fluent 2 light vs dark default, brand color overlay (if any)
- **Phase 4:** ORS request-budget strategy if free tier limits become tight
- **Phase 5:** AI system prompt wording — first draft in phase, refined after testing
- **Phase 7:** Receipt format (PDF vs HTML email vs in-app screen) — FR-PM-11 is "Low" priority
- **Phase 10:** Custom domain or `*.vercel.app` for v1.0

---

## 7. Sign-off

When you've read this plan and you're ready to start Phase 0, reply: **"Approved — start Phase 0."**

If anything in this plan is wrong, missing, or you want changed, push back now. Cheaper to fix here than mid-build.
