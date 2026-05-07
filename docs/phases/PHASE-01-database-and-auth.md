# Phase 1 — Database Schema, RLS, and Auth

> **Status:** Ready to execute
> **Estimated time:** 3–4 hours
> **Branch:** `phase-01-database-and-auth`
> **Prerequisite:** Phase 0 merged to `main`, CI green, Vercel deploy live at https://taxi-flow-five.vercel.app/

---

## 1.1 Goal

Full Supabase schema in place with RLS policies, a working email/password auth flow, and session middleware routing users to the correct dashboard. At the end of this phase:

- All 12 tables exist locally via committed migrations
- Every table has RLS enabled and role-based access is verified by a test script
- A new user signup automatically creates a `profiles` row
- Audit log triggers fire on `trips`, `payments`, and `system_settings`
- `/auth/login`, `/auth/register`, `/auth/reset-password`, and `/auth/callback` all work end-to-end
- The session middleware protects routes and redirects: `user` role → `/dashboard`, `admin`/`super_admin` → `/admin/dashboard`
- TypeScript types are generated from the live local schema and compile clean

**Covers:** SRS §4.1 (FR-AU-01..06), §11 (all tables), §12.3 (NFR-SE-01, 03, 07)

---

## 1.2 Pre-flight check

Run these before touching any code:

```bash
# Must be on main, clean working tree
git status               # "nothing to commit, working tree clean"
git log --oneline -1     # should be your Phase 0 merge commit

# Local Supabase must be running
supabase status          # all services green

# .env.local must exist and be populated
cat .env.local
# Expected keys:
#   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
#   SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

If Supabase is not running: `supabase start`
If `.env.local` is missing or empty: re-run `supabase start` and copy the printed anon key and service_role key.

---

## 1.3 Step-by-step tasks

---

### Task 1 — Create the phase branch

```bash
git checkout -b phase-01-database-and-auth
```

---

### Task 2 — Claude Code Prompt A: Write the database migration and seed

Copy everything inside the fence and paste into Claude Code:

```
Read PLAN.md and docs/phases/PHASE-01-database-and-auth.md in full before doing anything.
Also read node_modules/next/dist/docs/ for any guides relevant to middleware and server components
before writing any Next.js code.

We are on branch phase-01-database-and-auth. Your job in this prompt is ONLY the database layer —
no Next.js code yet. We will generate TypeScript types after the migration runs, then implement
the application code in a second prompt.

─────────────────────────────────────────────────────────────────────
TASK A-1: Create the migration file
─────────────────────────────────────────────────────────────────────

Create supabase/migrations/20260506000001_initial_schema.sql with the full schema below.
Write it exactly as specified — do not invent columns, change types, or add extras.

---- PART 1: Helper functions (must come first, used by RLS) ----

-- get_my_role: returns the role string of the calling user from profiles
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT role FROM public.profiles WHERE id = auth.uid() $$;

-- is_admin: true if calling user has role 'admin' or 'super_admin'
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')) $$;

-- is_super_admin: true if calling user has role 'super_admin'
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin') $$;

NOTE: These functions must be defined BEFORE any table that references them in RLS policies,
so put them at the very top of the migration, before CREATE TABLE statements.

---- PART 2: Tables (in this exact order to satisfy FK dependencies) ----

Table 1 — profiles
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE
  full_name       TEXT
  phone           TEXT
  avatar_url      TEXT
  role            TEXT NOT NULL DEFAULT 'user'  CHECK (role IN ('user', 'admin', 'super_admin'))
  is_suspended    BOOLEAN NOT NULL DEFAULT false
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()

Table 2 — terminals
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
  name            TEXT NOT NULL
  address         TEXT
  city            TEXT NOT NULL
  lat             DOUBLE PRECISION NOT NULL
  lng             DOUBLE PRECISION NOT NULL
  is_active       BOOLEAN NOT NULL DEFAULT true
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()

Table 3 — routes
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid()
  name                  TEXT NOT NULL
  start_terminal_id     UUID NOT NULL REFERENCES public.terminals(id)
  end_terminal_id       UUID NOT NULL REFERENCES public.terminals(id)
  intermediate_stops    UUID[] NOT NULL DEFAULT '{}'
  is_active             BOOLEAN NOT NULL DEFAULT true
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now()
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()

Table 4 — fares
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
  route_id        UUID NOT NULL REFERENCES public.routes(id) ON DELETE CASCADE
  amount          NUMERIC(10,2) NOT NULL CHECK (amount >= 0)
  currency        TEXT NOT NULL DEFAULT 'USD'
  effective_from  DATE NOT NULL DEFAULT CURRENT_DATE
  effective_to    DATE
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()

Table 5 — distances
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid()
  from_terminal_id    UUID NOT NULL REFERENCES public.terminals(id)
  to_terminal_id      UUID NOT NULL REFERENCES public.terminals(id)
  distance_km         NUMERIC(8,2) NOT NULL CHECK (distance_km > 0)
  duration_minutes    INTEGER CHECK (duration_minutes > 0)
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
  UNIQUE (from_terminal_id, to_terminal_id)

Table 6 — trips
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid()
  user_id             UUID NOT NULL REFERENCES auth.users(id)
  route_id            UUID REFERENCES public.routes(id)
  start_terminal_id   UUID REFERENCES public.terminals(id)
  end_terminal_id     UUID REFERENCES public.terminals(id)
  status              TEXT NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','completed','cancelled','payment_pending','paid'))
  fare_amount         NUMERIC(10,2) CHECK (fare_amount >= 0)
  started_at          TIMESTAMPTZ NOT NULL DEFAULT now()
  ended_at            TIMESTAMPTZ
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()

Table 7 — trip_locations
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
  trip_id         UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE
  lat             DOUBLE PRECISION NOT NULL
  lng             DOUBLE PRECISION NOT NULL
  accuracy        DOUBLE PRECISION
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT now()

Table 8 — share_tokens
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
  trip_id     UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE
  token       TEXT NOT NULL UNIQUE DEFAULT gen_random_uuid()::TEXT
  expires_at  TIMESTAMPTZ
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()

Table 9 — chat_logs
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
  user_id     UUID NOT NULL REFERENCES auth.users(id)
  session_id  UUID NOT NULL
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant'))
  content     TEXT NOT NULL
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()

Table 10 — payments
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid()
  trip_id                     UUID NOT NULL REFERENCES public.trips(id)
  user_id                     UUID NOT NULL REFERENCES auth.users(id)
  stripe_payment_intent_id    TEXT UNIQUE
  amount                      NUMERIC(10,2) NOT NULL CHECK (amount >= 0)
  currency                    TEXT NOT NULL DEFAULT 'USD'
  status                      TEXT NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending','succeeded','failed','cancelled','waived'))
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT now()
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT now()

Table 11 — system_settings
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid()
  key           TEXT NOT NULL UNIQUE
  value         JSONB NOT NULL
  description   TEXT
  updated_by    UUID REFERENCES auth.users(id)
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()

Table 12 — audit_logs
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid()
  actor_id    UUID REFERENCES auth.users(id)
  action      TEXT NOT NULL
  table_name  TEXT
  record_id   TEXT
  old_data    JSONB
  new_data    JSONB
  ip_address  INET
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()

---- PART 3: updated_at trigger (apply to every table that has an updated_at column) ----

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

Apply the trigger to: profiles, terminals, routes, fares, distances, trips, payments, system_settings.
Pattern: CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.<table> FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

---- PART 4: handle_new_user trigger ----

When a new auth.users row is inserted, automatically INSERT into public.profiles
using id = NEW.id, full_name from NEW.raw_user_meta_data->>'full_name',
avatar_url from NEW.raw_user_meta_data->>'avatar_url'.
Function must be SECURITY DEFINER with SET search_path = ''.
Trigger: AFTER INSERT ON auth.users FOR EACH ROW.

---- PART 5: audit log trigger ----

Function public.log_audit_event():
  SECURITY DEFINER, SET search_path = ''
  Inserts into public.audit_logs:
    actor_id  = auth.uid() (may be NULL for service-role calls — that's fine)
    action    = TG_OP  ('INSERT' | 'UPDATE' | 'DELETE')
    table_name = TG_TABLE_NAME
    record_id = CASE WHEN TG_OP = 'DELETE' THEN OLD.id::TEXT ELSE NEW.id::TEXT END
    old_data  = CASE WHEN TG_OP IN ('UPDATE','DELETE') THEN to_jsonb(OLD) ELSE NULL END
    new_data  = CASE WHEN TG_OP IN ('INSERT','UPDATE') THEN to_jsonb(NEW) ELSE NULL END
  Returns COALESCE(NEW, OLD)

Apply the trigger AFTER INSERT OR UPDATE OR DELETE on:
  public.trips, public.payments, public.system_settings

---- PART 6: Row Level Security ----

Enable RLS on every table with: ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;
Then create these policies. Use SECURITY DEFINER functions (is_admin, is_super_admin) in USING clauses.

profiles
  "profiles_select":  FOR SELECT USING (auth.uid() = id OR public.is_admin())
  "profiles_update":  FOR UPDATE USING (auth.uid() = id OR public.is_admin())
  (No INSERT policy — trigger only. No DELETE policy from app layer.)

terminals
  "terminals_public_select":  FOR SELECT USING (is_active = true OR public.is_admin())
  "terminals_admin_insert":   FOR INSERT WITH CHECK (public.is_admin())
  "terminals_admin_update":   FOR UPDATE USING (public.is_admin())
  "terminals_admin_delete":   FOR DELETE USING (public.is_admin())

routes
  "routes_public_select":   FOR SELECT USING (is_active = true OR public.is_admin())
  "routes_admin_insert":    FOR INSERT WITH CHECK (public.is_admin())
  "routes_admin_update":    FOR UPDATE USING (public.is_admin())
  "routes_admin_delete":    FOR DELETE USING (public.is_admin())

fares
  "fares_public_select":    FOR SELECT USING (true)
  "fares_admin_insert":     FOR INSERT WITH CHECK (public.is_admin())
  "fares_admin_update":     FOR UPDATE USING (public.is_admin())
  "fares_admin_delete":     FOR DELETE USING (public.is_admin())

distances
  "distances_public_select":  FOR SELECT USING (true)
  "distances_admin_insert":   FOR INSERT WITH CHECK (public.is_admin())
  "distances_admin_update":   FOR UPDATE USING (public.is_admin())
  "distances_admin_delete":   FOR DELETE USING (public.is_admin())

trips
  "trips_select":   FOR SELECT USING (auth.uid() = user_id OR public.is_admin())
  "trips_insert":   FOR INSERT WITH CHECK (auth.uid() = user_id)
  "trips_update":   FOR UPDATE USING (auth.uid() = user_id OR public.is_admin())

trip_locations
  "trip_locations_select": FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.trips WHERE id = trip_id AND user_id = auth.uid())
    OR public.is_admin()
  )
  "trip_locations_insert": FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.trips WHERE id = trip_id AND user_id = auth.uid())
  )

share_tokens
  "share_tokens_public_select": FOR SELECT USING (true)
    (token is a UUID capability — anyone with the token may read it)
  "share_tokens_owner_insert":  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.trips WHERE id = trip_id AND user_id = auth.uid())
  )
  "share_tokens_owner_delete":  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.trips WHERE id = trip_id AND user_id = auth.uid())
  )

chat_logs
  "chat_logs_user_select":  FOR SELECT USING (auth.uid() = user_id OR public.is_admin())
  "chat_logs_user_insert":  FOR INSERT WITH CHECK (auth.uid() = user_id)
  "chat_logs_admin_delete": FOR DELETE USING (public.is_admin())

payments
  "payments_select":       FOR SELECT USING (auth.uid() = user_id OR public.is_admin())
  "payments_user_insert":  FOR INSERT WITH CHECK (auth.uid() = user_id)
  "payments_admin_update": FOR UPDATE USING (public.is_admin())

system_settings
  "system_settings_admin_select":       FOR SELECT USING (public.is_admin())
  "system_settings_super_admin_insert": FOR INSERT WITH CHECK (public.is_super_admin())
  "system_settings_super_admin_update": FOR UPDATE USING (public.is_super_admin())
  "system_settings_super_admin_delete": FOR DELETE USING (public.is_super_admin())

audit_logs
  "audit_logs_super_admin_select": FOR SELECT USING (public.is_super_admin())
  (No write policies — the trigger function uses SECURITY DEFINER)

─────────────────────────────────────────────────────────────────────
TASK A-2: Update the seed file
─────────────────────────────────────────────────────────────────────

Overwrite supabase/seed.sql with:

SECTION 1 — Four auth.users rows (for local dev only).
  Use these fixed UUIDs so they're stable across db resets:
  Super Admin:  '11111111-1111-1111-1111-111111111111'
  Admin:        '22222222-2222-2222-2222-222222222222'
  Alice (user): '33333333-3333-3333-3333-333333333333'
  Bob (user):   '44444444-4444-4444-4444-444444444444'

  All users must have:
    instance_id = '00000000-0000-0000-0000-000000000000'
    aud = 'authenticated'
    role = 'authenticated'
    encrypted_password = crypt('<password>', gen_salt('bf'))
    email_confirmed_at = now()
    raw_app_meta_data = '{"provider":"email","providers":["email"]}'
    raw_user_meta_data = '{"full_name":"<Name>"}'
    created_at = now(), updated_at = now()

  Passwords to use:
    Super Admin: Admin1234!
    Admin:       Admin1234!
    Alice:       User1234!
    Bob:         User1234!

  Emails:
    superadmin@taxiflow.test
    admin@taxiflow.test
    alice@taxiflow.test
    bob@taxiflow.test

SECTION 2 — auth.identities rows for each user.
  Each identity needs: id = user_id UUID, user_id, provider = 'email',
  provider_id = email address,
  identity_data = format('{"sub":"%s","email":"%s"}', user_id, email)::jsonb,
  last_sign_in_at = now(), created_at = now(), updated_at = now()

SECTION 3 — Update profiles table to set roles.
  The handle_new_user trigger fires during the auth.users INSERT and creates profiles with
  role = 'user'. After all users are inserted, UPDATE profiles:
    SET role = 'super_admin' WHERE id = '11111111-1111-1111-1111-111111111111'
    SET role = 'admin'       WHERE id = '22222222-2222-2222-2222-222222222222'

SECTION 4 — Five terminals (in Addis Ababa for the TaxiFlow domain):
  Use these IDs and data:
  'aaaa0000-0000-0000-0000-000000000001', 'Merkato Terminal',   'Merkato',    'Addis Ababa',  9.0178,  38.7441
  'aaaa0000-0000-0000-0000-000000000002', 'Piassa Terminal',    'Piassa',     'Addis Ababa',  9.0350,  38.7469
  'aaaa0000-0000-0000-0000-000000000003', 'Megenagna Terminal', 'Megenagna',  'Addis Ababa',  9.0225,  38.7996
  'aaaa0000-0000-0000-0000-000000000004', 'Kaliti Terminal',    'Kaliti',     'Addis Ababa',  8.9581,  38.7571
  'aaaa0000-0000-0000-0000-000000000005', 'Saris Terminal',     'Saris',      'Addis Ababa',  8.9855,  38.7241

SECTION 5 — Three routes:
  'bbbb0000-0000-0000-0000-000000000001', 'Merkato ↔ Megenagna', aaaa...0001, aaaa...0003
  'bbbb0000-0000-0000-0000-000000000002', 'Piassa ↔ Kaliti',     aaaa...0002, aaaa...0004
  'bbbb0000-0000-0000-0000-000000000003', 'Saris ↔ Megenagna',   aaaa...0005, aaaa...0003

SECTION 6 — Fares (one per route, currency USD):
  Route 1: 2.50, Route 2: 3.00, Route 3: 2.00

SECTION 7 — Distances (both directions for each route pair):
  Merkato ↔ Megenagna: 8.5 km, 25 min (both directions)
  Piassa ↔ Kaliti:    12.0 km, 35 min (both directions)
  Saris ↔ Megenagna:   6.5 km, 20 min (both directions)

SECTION 8 — system_settings defaults (6 rows):
  key: 'ai_chat_enabled',         value: 'true',  description: 'Enable AI chatbot for all users'
  key: 'registration_enabled',    value: 'true',  description: 'Allow new user registrations'
  key: 'login_enabled',           value: 'true',  description: 'Allow user logins'
  key: 'maintenance_mode',        value: 'false', description: 'Show maintenance page to non-admin users'
  key: 'share_tracking_enabled',  value: 'true',  description: 'Allow users to share trip tracking links'
  key: 'announcement',            value: 'null',  description: 'Broadcast announcement to all users (null = none)'

─────────────────────────────────────────────────────────────────────
TASK A-3: Add a db:types script to package.json
─────────────────────────────────────────────────────────────────────

In package.json "scripts", add:
  "db:types": "supabase gen types typescript --local --schema public > types/database.types.ts"

─────────────────────────────────────────────────────────────────────
CONSTRAINTS
─────────────────────────────────────────────────────────────────────

- Do NOT implement any Next.js code yet (no changes to app/, lib/, middleware.ts).
- Do NOT run supabase db reset — I will do that manually after reviewing the SQL.
- Do NOT modify PLAN.md or any docs/ files.
- The migration file must be idempotent (use CREATE OR REPLACE for functions).
- If a step is ambiguous, stop and ask.
- Stage all changes but do NOT commit.
```

**Review the migration SQL and seed SQL before proceeding.** Pay attention to FK ordering, the trigger definitions, and the RLS policies. Approve or push back before running Task 3.

---

### Task 3 — Apply the migration and seed locally

After reviewing and approving Claude Code's output:

```bash
# Reset local Supabase: drops all data, re-runs migrations, then seed.sql
supabase db reset
```

This command:
1. Drops the local database
2. Applies all migrations in `supabase/migrations/` in filename order
3. Runs `supabase/seed.sql`

Expected output ends with something like:
```
Finished supabase db reset.
```

If it errors, read the SQL error, fix the migration file, and re-run `supabase db reset`.

**Verify the schema loaded correctly in Supabase Studio:**

Open http://127.0.0.1:54323 → Table Editor. You should see all 12 tables. Click on `profiles` — you should see 4 rows (one per seeded user). Click on `terminals` — 5 rows. Click on `system_settings` — 6 rows.

**Quick sanity check in Studio's SQL editor:**

```sql
-- Should show 4 profiles with correct roles
SELECT id, full_name, role FROM profiles ORDER BY role;

-- Should show 3 routes
SELECT name FROM routes;

-- Should show 6 system_settings keys
SELECT key, value FROM system_settings;
```

If any of these look wrong, fix the seed SQL and run `supabase db reset` again.

---

### Task 4 — Generate TypeScript types

```bash
pnpm db:types
```

This runs `supabase gen types typescript --local --schema public > types/database.types.ts`.

Open `types/database.types.ts` and confirm it is not empty and contains a `Database` type with a `public` key that has `Tables` with entries for all 12 tables.

Run a quick type-check to confirm the generated file is valid:

```bash
pnpm type-check
# Must exit 0 (lib/supabase/client.ts and server.ts are still placeholders — that's fine)
```

---

### Task 5 — Claude Code Prompt B: Application code

Copy everything inside the fence and paste into Claude Code as a new prompt:

```
Read PLAN.md and docs/phases/PHASE-01-database-and-auth.md in full.
Read node_modules/next/dist/docs/ for middleware, server components, server actions,
and cookies APIs before writing any code — Next.js 16 may have breaking changes
from your training data.
Also read the @supabase/ssr package README at node_modules/@supabase/ssr/README.md.

The migration has been applied locally. types/database.types.ts has been generated.
We are on branch phase-01-database-and-auth.

─────────────────────────────────────────────────────────────────────
TASK B-1: Implement lib/supabase/client.ts
─────────────────────────────────────────────────────────────────────

// FR-AU-04
Browser (client component) Supabase client.
Use createBrowserClient from @supabase/ssr, typed with Database from @/types/database.types.
Export a createClient() factory function.
Environment variables: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.

─────────────────────────────────────────────────────────────────────
TASK B-2: Implement lib/supabase/server.ts
─────────────────────────────────────────────────────────────────────

// FR-AU-04
Server (Server Component / Route Handler / Server Action) Supabase client.
Use createServerClient from @supabase/ssr, typed with Database from @/types/database.types.
Export an async createClient() factory function that reads cookies via next/headers cookies().
Handle the case where setAll is called from a read-only Server Component context (wrap in try/catch).

─────────────────────────────────────────────────────────────────────
TASK B-3: Implement middleware.ts
─────────────────────────────────────────────────────────────────────

// FR-AU-05
Session guard middleware at the repo root.

Behaviour:
1. Create a Supabase server client using createServerClient with request/response cookie
   management (NOT next/headers — middleware uses NextRequest/NextResponse cookies directly).
2. Call supabase.auth.getUser() to refresh the session token and keep cookies in sync.
3. Apply this routing logic:

   PUBLIC paths (no auth required, no redirect):
     - pathname === '/'
     - pathname.startsWith('/track/')
     - pathname.startsWith('/api/webhooks/')

   AUTH paths (auth pages — redirect AWAY if already logged in):
     - pathname.startsWith('/auth/')
     - If user is authenticated, look up profiles.role, then redirect to:
         role 'admin' or 'super_admin' → /admin/dashboard
         role 'user' or anything else  → /dashboard

   ADMIN paths (require admin or super_admin role):
     - pathname.startsWith('/admin/')
     - If no user → redirect to /auth/login
     - If user role is 'user' → redirect to /dashboard

   ALL OTHER paths (protected user routes):
     - If no user → redirect to /auth/login

4. Always return the supabaseResponse (never a plain NextResponse.next()) to keep the
   session cookie synced.

Matcher config: exclude _next/static, _next/image, favicon.ico, and common static extensions
(svg, png, jpg, jpeg, gif, webp, ico). Everything else goes through middleware.

─────────────────────────────────────────────────────────────────────
TASK B-4: Create auth pages
─────────────────────────────────────────────────────────────────────

// FR-AU-01, FR-AU-02, FR-AU-03, FR-AU-06

Create app/auth/ with these four routes. Use Server Actions for form submissions (NOT
Route Handlers). Keep the UI minimal — plain HTML + Tailwind classes, no Fluent components
yet (Fluent design system is Phase 2). A clean centred card with a form is all that's needed.
All forms must be functional end-to-end.

app/auth/login/page.tsx
  - Email + password form
  - Server action calls supabase.auth.signInWithPassword({ email, password })
  - On success: redirect to /auth/callback (which will then route to the right dashboard)
  - On error: display the Supabase error message inline
  - Link to /auth/register and /auth/reset-password

app/auth/register/page.tsx
  - Full name + email + password form (password min 8 chars)
  - Server action calls supabase.auth.signUp({ email, password, options: { data: { full_name } } })
  - On success: show "Check your email to confirm your account" message (even though
    confirmations are disabled locally, keep the message for production readiness)
  - On error: display inline
  - Link to /auth/login

app/auth/reset-password/page.tsx
  - Email form only
  - Server action calls supabase.auth.resetPasswordForEmail(email, { redirectTo: '<NEXT_PUBLIC_SITE_URL>/auth/callback?type=recovery' })
  - NEXT_PUBLIC_SITE_URL env var (add to .env.example with value http://localhost:3000)
  - On success: "Password reset email sent" message
  - On error: display inline

app/auth/callback/route.ts  (Route Handler, not a page)
  - GET handler that exchanges the code for a session via supabase.auth.exchangeCodeForSession(code)
  - After exchange, fetch the user's profile role, then redirect:
      role 'admin' or 'super_admin' → /admin/dashboard
      else → /dashboard
  - If code is missing or exchange fails → redirect to /auth/login?error=1

─────────────────────────────────────────────────────────────────────
TASK B-5: Create placeholder dashboard pages
─────────────────────────────────────────────────────────────────────

These are minimal skeletons — the full dashboards are built in Phase 3 and Phase 8.
Their only job is to exist at the correct URL so the auth redirect works.

app/(user)/dashboard/page.tsx
  - Must be a Server Component
  - Calls createClient() from lib/supabase/server.ts, fetches the user with getUser()
  - Renders: <h1>Welcome, {user.email}</h1> and a sign-out button (client component or form action)
  - Sign-out action calls supabase.auth.signOut() then redirects to /auth/login

app/(admin)/admin/dashboard/page.tsx
  - Same pattern as user dashboard
  - Renders: <h1>Admin Dashboard</h1> with user.email and sign-out

─────────────────────────────────────────────────────────────────────
TASK B-6: Add NEXT_PUBLIC_SITE_URL to .env.example
─────────────────────────────────────────────────────────────────────

Add to .env.example under the Supabase section:
  # PUBLIC — base URL of the app (used for auth redirect callbacks)
  NEXT_PUBLIC_SITE_URL=

Add to .env.local (you'll need to instruct the user to add this — don't touch .env.local yourself):
  Document in a comment in the file that they need NEXT_PUBLIC_SITE_URL=http://localhost:3000

─────────────────────────────────────────────────────────────────────
TASK B-7: Write the RLS test script
─────────────────────────────────────────────────────────────────────

Create tests/rls.test.ts — a Vitest test file that proves RLS works correctly.

The test file should:
  - Import createClient from @supabase/supabase-js (not our lib/ wrappers)
  - Define a helper that creates a client authenticated as a specific user
    using supabase.auth.signInWithPassword() against the local Supabase URL
  - Run these test scenarios in order:

  Test suite: "RLS — anon access"
    - anon can SELECT from terminals (should succeed, returns rows)
    - anon can SELECT from routes (should succeed)
    - anon can SELECT from fares (should succeed)
    - anon canNOT SELECT from profiles (should return empty or error)
    - anon canNOT SELECT from trips (should return empty or error)
    - anon canNOT SELECT from system_settings (should return empty or error)

  Test suite: "RLS — Alice (user role)"
    - Alice can read her own profile (profiles WHERE id = alice_id)
    - Alice canNOT read Bob's profile
    - Alice can INSERT a trip for herself (user_id = alice_id)
    - Alice can SELECT her own trip
    - Alice canNOT SELECT Bob's trips
    - Alice canNOT read system_settings
    - Alice canNOT UPDATE system_settings

  Test suite: "RLS — Admin (admin role)"
    - Admin can SELECT all profiles
    - Admin can SELECT Alice's trips
    - Admin can SELECT system_settings
    - Admin canNOT UPDATE system_settings (super_admin only)

  Test suite: "RLS — Super Admin (super_admin role)"
    - Super Admin can SELECT system_settings
    - Super Admin can UPDATE a system_settings row
    - Super Admin can SELECT audit_logs

  Use the seeded user credentials:
    alice@taxiflow.test / User1234!
    admin@taxiflow.test / Admin1234!
    superadmin@taxiflow.test / Admin1234!
    NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY from process.env

  At the top of the file add:
    // @vitest-environment node
  (The RLS tests hit the real local Supabase — no jsdom needed.)

─────────────────────────────────────────────────────────────────────
TASK B-8: Run verification
─────────────────────────────────────────────────────────────────────

Run these and fix any failures before declaring done:
  pnpm type-check   # must pass
  pnpm lint         # must pass
  pnpm test         # must pass (including rls.test.ts — local Supabase must be running)
  pnpm build        # must pass

─────────────────────────────────────────────────────────────────────
CONSTRAINTS
─────────────────────────────────────────────────────────────────────

- Every new file that implements a requirement must have the SRS requirement ID
  commented at the top (e.g., // FR-AU-01).
- TypeScript strict mode is on. No `any` without an inline justification comment.
- Server-only modules ONLY import from lib/supabase/server.ts.
  Client modules ONLY import from lib/supabase/client.ts. Never mix.
- Do not modify PLAN.md or any docs/ files.
- Do not modify supabase/migrations/ or supabase/seed.sql.
- Stage all changes but do NOT commit.
- If a step is ambiguous, stop and ask.
```

**Review every file Claude Code produces.** Pay special attention to:
- `middleware.ts` — the cookie management pattern must match the @supabase/ssr v0.10 API
- `app/auth/callback/route.ts` — the code exchange + role redirect is critical
- `tests/rls.test.ts` — make sure it uses the actual local Supabase, not mocks

---

### Task 6 — Add NEXT_PUBLIC_SITE_URL to .env.local

Claude Code cannot touch `.env.local`. Add this yourself:

```bash
# append to .env.local
echo "NEXT_PUBLIC_SITE_URL=http://localhost:3000" >> .env.local
```

---

### Task 7 — Manual end-to-end smoke test

Start the dev server:
```bash
pnpm dev
```

Then do this manually in a browser:

1. **Register a new user:**
   - Go to http://localhost:3000/auth/register
   - Enter any name, a new email (e.g. `testuser@test.com`), and password `Test1234!`
   - You should see the "check your email" message

2. **Check Inbucket for the confirmation email** (even with confirmations disabled, the link
   flow tests the callback):
   - Open http://127.0.0.1:54324
   - You should see an email for `testuser@test.com`
   - (Skip clicking the link — confirmations are off locally, so the user can log in directly)

3. **Log in as Alice:**
   - Go to http://localhost:3000/auth/login
   - Email: `alice@taxiflow.test` / Password: `User1234!`
   - Should redirect to http://localhost:3000/dashboard
   - Page should show Alice's email

4. **Sign out,** then log in as Admin:
   - Email: `admin@taxiflow.test` / Password: `Admin1234!`
   - Should redirect to http://localhost:3000/admin/dashboard
   - Page should show the admin's email

5. **Session persistence:**
   - While logged in, hard-refresh the page (Ctrl+F5)
   - Should stay logged in (not redirect to /auth/login)

6. **Protected route guard:**
   - Sign out, then manually visit http://localhost:3000/dashboard
   - Should redirect to http://localhost:3000/auth/login

7. **Admin route protection:**
   - Log in as Alice, then manually visit http://localhost:3000/admin/dashboard
   - Should redirect to http://localhost:3000/dashboard (not admin dashboard)

Stop the dev server when done.

---

### Task 8 — Commit and open the PR

```bash
git add supabase/migrations/20260506000001_initial_schema.sql
git add supabase/seed.sql
git add types/database.types.ts
git add lib/supabase/client.ts
git add lib/supabase/server.ts
git add middleware.ts
git add app/auth/
git add app/\(user\)/dashboard/
git add app/\(admin\)/admin/dashboard/
git add tests/rls.test.ts
git add .env.example
git add package.json

git commit -m "phase-1: database schema, RLS, email/password auth"

git push -u origin phase-01-database-and-auth

gh pr create --title "phase-1: database schema, RLS, and auth" --body "
## Summary
- 12-table schema via single migration with RLS on all tables
- handle_new_user trigger auto-creates profiles on signup
- Audit log triggers on trips, payments, system_settings
- Email/password auth pages with Server Actions
- Session middleware with role-based routing
- RLS test suite covering anon / user / admin / super_admin scenarios
- TypeScript types generated from live schema

## Test plan
- [ ] pnpm test (including rls.test.ts) passes
- [ ] pnpm build passes
- [ ] CI green
- [ ] Manual smoke test: login as Alice → /dashboard, login as Admin → /admin/dashboard
- [ ] Session persists across hard refresh
- [ ] Protected routes redirect unauthenticated users
"
```

Wait for CI to go green before merging.

**Note for CI:** The RLS test hits the live local Supabase, which is NOT available in GitHub Actions. Before pushing, check whether `rls.test.ts` uses `process.env.NEXT_PUBLIC_SUPABASE_URL`. If it does, the CI job will fail because the URL is a placeholder in the CI env. Two options:
1. Skip the RLS test in CI with `vitest.config.ts` exclusion and run it locally only (preferred for now)
2. Spin up Supabase in CI (adds complexity — defer to a later phase)

**Recommended fix:** Add a `// @vitest-skip-ci` marker to the RLS test file, or configure `vitest.config.ts` to exclude `tests/rls.test.ts` from the default `pnpm test` run, and create a separate `pnpm test:rls` script that includes it. This way CI passes and you still have the local RLS proof.

Ask Claude Code to implement this exclusion before committing.

---

## 1.4 Acceptance script

Run all of these. Every one must succeed.

```bash
# 1. Local build and test (unit tests only — RLS tests are separate)
pnpm install
pnpm lint
pnpm type-check
pnpm test       # excludes rls.test.ts in default run
pnpm build
# All must exit 0

# 2. RLS test (requires local Supabase running)
supabase status           # confirm all services up
pnpm test:rls             # all RLS scenarios must pass

# 3. Generated types are present and non-empty
wc -l types/database.types.ts   # should be 200+ lines

# 4. Smoke test via dev server
pnpm dev &
sleep 5
# Manually visit http://localhost:3000/auth/login and test the scenarios in Task 7
# Ctrl+C to stop dev server

# 5. CI green
gh run list --limit 1    # most recent run shows "completed success"

# 6. Schema in Studio
# Open http://127.0.0.1:54323 → confirm 12 tables visible with correct row counts
```

**All pass = Phase 1 complete.**

---

## 1.5 Common failure modes

**`supabase db reset` fails with "relation does not exist".**
Check FK ordering in the migration. Tables must be created before being referenced as FKs.
The helper functions (get_my_role, is_admin, is_super_admin) must come before any RLS policies that call them.

**`supabase db reset` fails with "permission denied for table users".**
The `handle_new_user` trigger function must use `SECURITY DEFINER SET search_path = ''` and reference `auth.users` with the full `auth.` schema prefix. Do not use just `users`.

**`pnpm db:types` exits 0 but types/database.types.ts is empty or very small.**
The migration didn't apply correctly. Re-check `supabase db reset` output for errors.
Run `supabase status` to confirm the local DB is up, then retry `pnpm db:types`.

**`pnpm type-check` fails with "Cannot find module '@/types/database.types'".**
You haven't run `pnpm db:types` yet, or the file path is wrong. The script writes to `types/database.types.ts` at the repo root; the `@/` alias maps to the repo root in this project. Double-check `tsconfig.json` paths.

**Login redirects to /auth/login instead of /dashboard.**
The auth callback route is not running `exchangeCodeForSession` before redirecting. Check `app/auth/callback/route.ts`. Also check that `NEXT_PUBLIC_SITE_URL` is in `.env.local` — the reset-password callback needs it.

**Session is lost on hard refresh.**
The middleware is not returning the `supabaseResponse` object. A plain `NextResponse.next()` won't carry the refreshed cookie back to the browser. Make sure the middleware always returns the `supabaseResponse` variable (not a new `NextResponse.next()`).

**RLS test: anon can read profiles.**
The `profiles_select` policy uses `auth.uid() = id OR public.is_admin()`. When anon, `auth.uid()` is NULL and `is_admin()` returns false, so no rows should be returned. If rows are returned, RLS may not be enabled on the table (`ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;` missing).

**RLS test: Alice can read Bob's data.**
The `trips_select` policy condition `auth.uid() = user_id` should filter correctly. Confirm that the test is using Alice's JWT (not the service role key), and that `user_id` in the inserted row matches Alice's UUID.

**CI fails on `pnpm test` because rls.test.ts tries to connect to 127.0.0.1:54321.**
The RLS test should be excluded from the default `pnpm test` run (see Task 8 note). Make sure `vitest.config.ts` excludes it and there's a separate `pnpm test:rls` command.

**`pnpm build` fails with "cookies() was called outside a request scope".**
You're calling `cookies()` at module initialization time instead of inside a function. Make sure `lib/supabase/server.ts` exports a factory function (`createClient()`) and does not call `cookies()` at the top level.

---

## 1.6 What's NOT in Phase 1

These belong to later phases. If you find yourself doing them, stop.

- ❌ Fluent-styled auth forms (Phase 2 — keep the forms plain Tailwind for now)
- ❌ Bottom navigation (Phase 3)
- ❌ Any page beyond `/dashboard` and `/admin/dashboard` skeletons (Phase 3 / Phase 8)
- ❌ OAuth providers (not in scope for v1.0)
- ❌ Stripe or Gemini integration (Phases 5, 7)
- ❌ Maps or Leaflet (Phase 4)
- ❌ PWA manifest or service worker (Phase 3)
- ❌ Production Supabase project (Phase 10)
- ❌ Vercel environment variable updates for Supabase (Phase 10)

---

## 1.7 When you're done

Reply with:
1. Confirmation that all acceptance checks passed (or which ones needed deviation and why).
2. The PR URL.
3. Any schema changes you had to make vs. the spec, and why.
4. Paste the output of `pnpm test:rls` so I can see all RLS scenarios pass.

I'll then write `PHASE-02-design-system-and-landing.md`.
