# Phase 8 — Admin Dashboard

> **Status:** Ready to implement
> **Estimated time:** 5–7 hours
> **Branch:** `phase-08-admin-dashboard`
> **Prerequisite:** Phase 7 PR merged to `main`, CI green

---

## 8.1 Goal

Replace the Phase 1 admin placeholder at `/admin/dashboard` with a fully-featured management console. Admins and super_admins can view platform KPIs, manage users, terminals, routes, fares, and browse trip/payment history — all from a consistent sidebar layout.

At the end of this phase:

- A shared sidebar layout wraps every `/admin/*` page
- The dashboard overview shows live KPIs (users, trips, revenue, active trips) and a recent-trips table
- User list lets admins suspend/unsuspend accounts; super_admins can also promote/demote roles
- Terminals and Routes support full CRUD (add, edit, toggle active)
- Fares page lets admins update the amount per route
- Trips and Payments pages are read-only tables with status/date filters
- All data is fetched server-side with Supabase service-role client; writes use Server Actions
- UI uses the existing shadcn Card, Button, and design tokens throughout

**Covers:** SRS §10 (FR-AD-01..20), §12.2 (NFR-SE-05,06)

---

## 8.2 Pre-flight check

```bash
# 1. Merge phase-07 PR to main, then:
git checkout main && git pull origin main

# 2. Create branch
git checkout -b phase-08-admin-dashboard

# 3. Confirm admin test credentials work locally
#    admin@taxiflow.test / Admin1234!
#    superadmin@taxiflow.test / Admin1234!
```

---

## 8.3 URL & file map

| URL | File |
|-----|------|
| `/admin/dashboard` | `app/(admin)/admin/dashboard/page.tsx` ← replace existing |
| `/admin/users` | `app/(admin)/admin/users/page.tsx` |
| `/admin/terminals` | `app/(admin)/admin/terminals/page.tsx` |
| `/admin/terminals/new` | `app/(admin)/admin/terminals/new/page.tsx` |
| `/admin/terminals/[id]/edit` | `app/(admin)/admin/terminals/[id]/edit/page.tsx` |
| `/admin/routes` | `app/(admin)/admin/routes/page.tsx` |
| `/admin/routes/new` | `app/(admin)/admin/routes/new/page.tsx` |
| `/admin/routes/[id]/edit` | `app/(admin)/admin/routes/[id]/edit/page.tsx` |
| `/admin/fares` | `app/(admin)/admin/fares/page.tsx` |
| `/admin/trips` | `app/(admin)/admin/trips/page.tsx` |
| `/admin/payments` | `app/(admin)/admin/payments/page.tsx` |
| Shared layout | `app/(admin)/admin/layout.tsx` |
| Server Actions | `app/(admin)/admin/_actions/` |

---

## 8.4 Step-by-step tasks

---

### Task 1 — Branch

```bash
git checkout -b phase-08-admin-dashboard
```

---

### Task 2 — Shared admin layout (`app/(admin)/admin/layout.tsx`)

Server component. Reads the current user + role and renders:

- **Left sidebar** (desktop) / **bottom sheet** (mobile):
  - TaxiFlow logo + "Admin" label
  - Nav links: Dashboard · Users · Terminals · Routes · Fares · Trips · Payments
  - Active link highlighted with `bg-primary/10 text-primary`
  - Role badge at the bottom (admin / super_admin)
  - Sign-out button

- **Top bar**: page title (from the active nav item), admin avatar initial
- Redirects to `/auth/login` if no session (belt-and-suspenders alongside middleware)

```tsx
// app/(admin)/admin/layout.tsx
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminSidebar from "./_components/AdminSidebar";

export default async function AdminLayout({ children }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin" && profile?.role !== "super_admin") {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar role={profile.role} email={user.email} />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
```

---

### Task 3 — Dashboard overview (`/admin/dashboard`)

Replace the existing placeholder. Server component — all data fetched in parallel with `Promise.all`.

**KPI cards (4):**
| Card | Query |
|------|-------|
| Total Users | `SELECT count(*) FROM profiles WHERE role = 'user'` |
| Trips Today | `SELECT count(*) FROM trips WHERE started_at >= today` |
| Revenue This Month | `SELECT sum(amount) FROM payments WHERE paid_at >= month_start AND status='succeeded'` |
| Active Trips | `SELECT count(*) FROM trips WHERE status = 'active'` |

**Recent Trips table (last 10):**
Columns: Trip ID (TFR format) · Route · User email · Status badge · Fare · Started

---

### Task 4 — Users page (`/admin/users`)

Server component with optional `?search=` query param.

**Table columns:** Name · Email · Role badge · Suspended badge · Joined date · Actions

**Actions (Server Actions in `_actions/users.ts`):**
- `suspendUser(userId)` — sets `is_suspended = true`
- `unsuspendUser(userId)` — sets `is_suspended = false`
- `setRole(userId, role)` — super_admin only; updates `profiles.role`

Uses `createServiceClient()` for writes (bypasses RLS). The page passes the current viewer's role down so buttons are conditionally shown.

---

### Task 5 — Terminals CRUD

**List page** (`/admin/terminals`): Table of all terminals — Name · City · Lat/Lng · Active toggle · Edit link · New terminal button.

**New/Edit pages** share a `TerminalForm` component:
```
Fields: name* · address · city* · lat* · lng* · is_active (checkbox)
```

Server Actions in `_actions/terminals.ts`:
- `createTerminal(formData)` — insert into `terminals`
- `updateTerminal(id, formData)` — update by id
- `toggleTerminalActive(id, current)` — flip `is_active`

All validate with Zod before writing. Redirect back to `/admin/terminals` on success.

---

### Task 6 — Routes CRUD

**List page** (`/admin/routes`): Table — Name · Start terminal · End terminal · Active · Edit link · New button.

**New/Edit pages** share a `RouteForm`:
```
Fields: name* · start_terminal_id* (select) · end_terminal_id* (select) · is_active
```

Server Actions in `_actions/routes.ts`:
- `createRoute(formData)`
- `updateRoute(id, formData)`
- `toggleRouteActive(id, current)`

---

### Task 7 — Fares page (`/admin/fares`)

**List page**: Table — Route name · Amount (ETB) · Currency · Effective from · Effective to · Edit button.

Inline edit modal (client component): amount input + save button.

Server Action `updateFare(id, amount)` — updates `fares.amount`.

---

### Task 8 — Trips page (`/admin/trips`)

Read-only server component. Supports `?status=` and `?from=` / `?to=` search params.

**Table columns:** Trip ID · User email · Route · Status badge · Fare · Started · Ended

Status badge colours:
- `active` → blue
- `completed` / `payment_pending` → amber
- `paid` → green
- `cancelled` → red

Pagination: 25 rows per page with `?page=` param.

---

### Task 9 — Payments page (`/admin/payments`)

Read-only server component. Supports `?method=` and `?from=` / `?to=` filters.

**Table columns:** Trip ID · User email · Amount · Method badge · Stripe PI (truncated) · Paid at

---

### Task 10 — Server Actions security

All write actions in `_actions/` must:
1. Re-verify the caller is `admin` or `super_admin` (don't rely on UI alone)
2. Use `createServiceClient()` for writes
3. Validate input with Zod
4. Call `revalidatePath("/admin/...")` after mutation

---

### Task 11 — Type-check, lint, test, build

```bash
pnpm type-check && pnpm lint && pnpm test && pnpm build
```

---

## 8.5 Acceptance checklist

| # | Check |
|---|-------|
| 1 | Sign in as `admin@taxiflow.test` → lands on `/admin/dashboard` with KPI cards populated |
| 2 | Sign in as `alice@taxiflow.test` (user) → cannot access `/admin/*`, redirected to `/dashboard` |
| 3 | Dashboard shows correct counts (verify against Supabase Studio) |
| 4 | Users page lists all users; suspend/unsuspend toggles `is_suspended` in DB |
| 5 | `setRole` button is hidden for `admin` role, visible for `super_admin` |
| 6 | Create a new terminal → appears in list; edit it → changes persist |
| 7 | Create a new route using the two new terminals; toggle inactive |
| 8 | Fares page shows all routes; update a fare amount → persists |
| 9 | Trips page filters by `paid` status → shows only paid trips |
| 10 | Payments page filters by `cash` method → shows cash payments |
| 11 | `pnpm type-check`, `pnpm lint`, `pnpm test`, `pnpm build` all green |
| 12 | Vercel preview deploy succeeds |

---

## 8.6 Out of scope for this phase

- Analytics charts / graphs (deferred)
- Terminal map picker (lat/lng entered manually)
- Bulk actions on tables
- Export to CSV
- System settings page (super_admin only — deferred to Phase 9)
- AI chat log viewer
