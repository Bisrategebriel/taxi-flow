# Phase 6 — Trip Tracking & Share Links

> **Status:** Ready to implement
> **Estimated time:** 3–4 hours
> **Branch:** `phase-06-trip-tracking`
> **Prerequisite:** Phase 5 PR merged to `main`, CI green

---

## 6.1 Goal

Wire the existing trip UI to Supabase. When a user taps **Start Trip** on the route result page, a real `trips` row is created, GPS coordinates broadcast via Supabase Realtime every 5 seconds, and a snapshot saved to `trip_locations` every 30 seconds. A share button generates a UUID share token so anyone with the link can watch the traveller's live position on a public `/track/[token]` page — no login required. An `ActiveTripBanner` persists across all PWA screens while a trip is in progress.

At the end of this phase:

- `hooks/useGeolocation.ts`, `hooks/useTripTracking.ts`, `hooks/useRealtimeLocation.ts` are complete
- `components/trip/ActiveTripBanner.tsx` is shown in the user layout whenever a trip is active
- `TripInProgress` is fully wired to Supabase (creates trip, broadcasts, snapshots, ends cleanly)
- `app/track/[token]/page.tsx` works in incognito — shows live map, route, traveller name, start time
- Share button generates a real share URL via Web Share API / clipboard
- Trip history is visible (trips rows in DB)

**Covers:** SRS §7 (FR-TR-01..13), §8 (FR-ST-01..17), §12.2 (NFR-PE-04), §12.3 (NFR-SE-05, 06)

---

## 6.2 Pre-flight check

```bash
# 1. Merge phase-05 PR to main first, then:
git checkout main && git pull origin main
git log --oneline -1   # should be the phase-05 merge commit

# 2. Clean build on main
pnpm install && pnpm type-check && pnpm build

# 3. Local Supabase running
supabase status

# 4. Confirm trips, trip_locations, share_tokens tables exist
# supabase db query "SELECT table_name FROM information_schema.tables WHERE table_name IN ('trips','trip_locations','share_tokens');"

# 5. Confirm proxy.ts already marks /track/* as public
grep "track" proxy.ts   # must print pathname.startsWith('/track/')
```

---

## 6.3 Step-by-step tasks

---

### Task 1 — Create the phase branch

```bash
git checkout -b phase-06-trip-tracking
```

---

### Task 2 — Database migration: public-read RLS for tracking

Create `supabase/migrations/20260520000003_trip_tracking_rls.sql`:

```sql
-- FR-TR-05, FR-ST-01..17, NFR-SE-05,06
-- Phase 6: RLS for public trip tracking via share tokens

-- share_tokens ─────────────────────────────────────────────────────────────────
-- Anon and authenticated users can read share tokens (needed for /track/[token])
CREATE POLICY "share_tokens_public_select"
  ON public.share_tokens FOR SELECT
  TO anon, authenticated
  USING (expires_at IS NULL OR expires_at > now());

-- Authenticated users can create share tokens for their own trips
CREATE POLICY "share_tokens_insert_own"
  ON public.share_tokens FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_id AND t.user_id = auth.uid()
    )
  );

-- trips ────────────────────────────────────────────────────────────────────────
-- Anon users can read a trip if a valid share token exists for it (NFR-SE-06)
CREATE POLICY "trips_public_read_via_share_token"
  ON public.trips FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.share_tokens st
      WHERE st.trip_id = id
        AND (st.expires_at IS NULL OR st.expires_at > now())
    )
  );

-- trip_locations ───────────────────────────────────────────────────────────────
-- Authenticated users can insert location snapshots for their own trips (FR-TR-05)
CREATE POLICY "trip_locations_insert_own"
  ON public.trip_locations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trips t
      WHERE t.id = trip_id AND t.user_id = auth.uid()
    )
  );

-- Anon users can read locations for trips that have a valid share token
CREATE POLICY "trip_locations_public_read_via_share_token"
  ON public.trip_locations FOR SELECT
  TO anon
  USING (
    EXISTS (
      SELECT 1 FROM public.share_tokens st
      WHERE st.trip_id = trip_id
        AND (st.expires_at IS NULL OR st.expires_at > now())
    )
  );
```

Apply it:

```bash
supabase migration up
```

---

### Task 3 — Claude Code Prompt: trip tracking core

Copy everything inside the fence and paste into Claude Code:

```
Read PLAN.md before doing anything. We are on branch phase-06-trip-tracking.

─────────────────────────────────────────────────────────────────────
IMPORTANT CONTEXT
─────────────────────────────────────────────────────────────────────

Tailwind 4, CSS-first, no tailwind.config.ts.
shadcn/ui + cn() from @/lib/utils. Uppercase component filenames.
Next.js 16 App Router. Server components by default; "use client" only when needed.
Supabase client for browser: @/lib/supabase/client.ts
Supabase client for server: @/lib/supabase/server.ts — never mix.

Database schema (relevant tables for this phase):
  trips:          id, user_id, route_id, start_terminal_id, end_terminal_id,
                  status ('active'|'completed'|'cancelled'|'payment_pending'|'paid'),
                  fare_amount, started_at, ended_at
  trip_locations: id, trip_id, lat, lng, accuracy, recorded_at
  share_tokens:   id, trip_id, token (UUID string, unique), expires_at
  profiles:       id, full_name, role
  terminals:      id, name, lat, lng

Existing files you WILL modify:
  app/(user)/route-search/result/page.tsx   — add routeId + fare to Start Trip link
  app/(user)/trip/page.tsx                  — accept routeId, fare, tripId params
  app/(user)/trip/_components/TripInProgress.tsx  — full rewrite to use hooks
  app/(user)/layout.tsx                     — add <ActiveTripBanner />

Files you must NOT touch:
  supabase/, types/, lib/supabase/, app/(landing)/, app/(admin)/, auth pages,
  app/api/chat/, lib/groq/, components/chat/

Realtime channel naming: "trip-location:<tripId>"
localStorage keys:
  "taxiflow_active_trip" — JSON: { tripId, fromId, toId, routeId, fare }

Do not create tailwind.config.ts.
Stage all changes but do NOT commit.

─────────────────────────────────────────────────────────────────────
TASK 1: hooks/useGeolocation.ts
─────────────────────────────────────────────────────────────────────

// FR-TR-02
"use client";
Wrap navigator.geolocation.watchPosition.
Export: useGeolocation(options?: PositionOptions)
Returns: { position: GeolocationCoordinates | null, error: GeolocationPositionError | null, isLoading: boolean }
If geolocation unavailable: position stays null, isLoading becomes false.
Clean up watchId on unmount.

─────────────────────────────────────────────────────────────────────
TASK 2: hooks/useTripTracking.ts
─────────────────────────────────────────────────────────────────────

// FR-TR-01..08, FR-ST-01..04
"use client";
Import createClient from @/lib/supabase/client.
Import useGeolocation.

Interface TripTrackingParams {
  startTerminalId: string;
  endTerminalId: string;
  routeId: string | null;
  fareAmount: number | null;
  initialTripId?: string; // provided when resuming an existing active trip
}

Behaviour:
1. On mount:
   - If initialTripId provided: store it in state, skip DB insert, subscribe to Realtime channel
   - If no initialTripId: insert into trips (status: 'active'), store returned id in state,
     save JSON to localStorage key "taxiflow_active_trip"
2. After tripId is set: subscribe to supabase.channel("trip-location:<tripId>")
3. Broadcast position every 5 s via channel.send({ type: "broadcast", event: "location",
   payload: { lat, lng, accuracy } }) — only when position is non-null
4. Save snapshot to trip_locations every 30 s — only when position is non-null
5. endTrip(): update trips set status='completed', ended_at=now() where id=tripId;
   remove channel; clear intervals; delete "taxiflow_active_trip" from localStorage
6. generateShareToken(): insert into share_tokens { trip_id: tripId };
   return the generated token string (share_tokens.token column)

Export: useTripTracking(params)
Returns: { tripId, position, geoError, isLoading, endTrip, generateShareToken }

─────────────────────────────────────────────────────────────────────
TASK 3: hooks/useRealtimeLocation.ts
─────────────────────────────────────────────────────────────────────

// FR-ST-07, FR-ST-09
"use client";
Subscribe to supabase.channel("trip-location:<tripId>")
  .on("broadcast", { event: "location" }, handler).subscribe()
Return latest { lat: number, lng: number } or null.
Clean up (supabase.removeChannel) on unmount or when tripId changes.

─────────────────────────────────────────────────────────────────────
TASK 4: components/trip/ActiveTripBanner.tsx
─────────────────────────────────────────────────────────────────────

// NFR-US-06
"use client";
On mount: read JSON from localStorage "taxiflow_active_trip".
If present: show a sticky banner at top of screen:
  - Small pulsing green dot + "Trip in progress"
  - "View" button/link → href built from stored { fromId, toId, routeId, fare, tripId }:
    /trip?from=<fromId>&to=<toId>&routeId=<routeId>&fare=<fare>&tripId=<tripId>
If not present: render null.
Use Tailwind: fixed top-0 left-0 right-0 z-40 bg-primary text-primary-foreground text-sm
  (sits below any modals but above page content).

─────────────────────────────────────────────────────────────────────
TASK 5: Rewrite app/(user)/trip/_components/TripInProgress.tsx
─────────────────────────────────────────────────────────────────────

// FR-TR-01..08, FR-ST-01..04
"use client";
Props:
  start: { id: string; name: string; lat: number; lng: number } | null
  end:   { id: string; name: string; lat: number; lng: number } | null
  routeId: string | null
  fareAmount: number | null
  initialTripId?: string

Use useTripTracking({ startTerminalId: start.id, endTerminalId: end.id, routeId,
  fareAmount, initialTripId }).

Share button behaviour (FR-ST-01..04):
  1. Call generateShareToken() to get token
  2. Build shareUrl = window.location.origin + "/track/" + token
  3. Try navigator.share({ title: "Track my TaxiFlow trip", url: shareUrl })
  4. Fallback: navigator.clipboard.writeText(shareUrl) → show brief "Copied!" toast

End Trip button:
  await endTrip()
  router.push("/dashboard")
  // Phase 7 will change this to router.push("/payment?tripId=" + tripId)

Keep the existing full-screen map layout (fixed inset-0 z-50) and bottom panel UI.
Replace fake tripId display with real tripId (last 6 chars, uppercase).
Replace distance calculation with running total from haversine on position updates.
Add a loading/locating state while position is null.

─────────────────────────────────────────────────────────────────────
TASK 6: Update app/(user)/trip/page.tsx
─────────────────────────────────────────────────────────────────────

// FR-TR-01
Accept additional searchParams: routeId, fare, tripId.
Pass them as props to TripInProgress:
  routeId={routeId ?? null}
  fareAmount={fare ? parseFloat(fare) : null}
  initialTripId={tripId ?? undefined}

─────────────────────────────────────────────────────────────────────
TASK 7: Update app/(user)/route-search/result/page.tsx — Start Trip link
─────────────────────────────────────────────────────────────────────

// FR-TR-01
Change the existing Start Trip <Link> href from:
  /trip?from=${fromId}&to=${toId}
To:
  /trip?from=${fromId}&to=${toId}&routeId=${route.id}&fare=${fare?.amount ?? ''}

─────────────────────────────────────────────────────────────────────
TASK 8: Update app/(user)/layout.tsx — add ActiveTripBanner
─────────────────────────────────────────────────────────────────────

// NFR-US-06
Import ActiveTripBanner from @/components/trip/ActiveTripBanner.
Add <ActiveTripBanner /> as the first child inside the layout wrapper,
before the page content and BottomNav.
ActiveTripBanner is a client component, so the server layout can render it directly
(Next.js client-component boundary is fine here).

─────────────────────────────────────────────────────────────────────
TASK 9: Public tracking page — app/track/[token]/page.tsx
─────────────────────────────────────────────────────────────────────

// FR-ST-05..17, NFR-SE-05,06
Server component. No auth required (proxy.ts already marks /track/* public).
Use createClient from @/lib/supabase/server (anon key, no service role).

Steps:
1. params: Promise<{ token: string }> — await it
2. Query share_tokens: select trip_id, expires_at where token = params.token, single()
   - If not found: notFound()
3. Check expiry: if expires_at && new Date(expires_at) < new Date() → isExpired = true
4. Query trips (RLS allows anon read via share token):
   select id, status, started_at, ended_at, fare_amount, route_id, user_id,
   start:terminals!trips_start_terminal_id_fkey(id, name, lat, lng),
   end:terminals!trips_end_terminal_id_fkey(id, name, lat, lng),
   routes(name)
   where id = shareToken.trip_id
   - If not found: notFound()
5. Query profiles: select full_name where id = trip.user_id
   - firstName = profile.full_name?.split(" ")[0] ?? "Traveller"
6. Render <TrackingView ... /> (see next task)

─────────────────────────────────────────────────────────────────────
TASK 10: app/track/[token]/_components/TrackingView.tsx
─────────────────────────────────────────────────────────────────────

// FR-ST-05..17
"use client";
Props:
  tripId: string
  isExpired: boolean
  tripStatus: string
  routeName: string
  traveller: string        // first name only (NFR-SE-06 — never expose last name)
  startedAt: string
  start: { id: string; name: string; lat: number; lng: number } | null
  end:   { id: string; name: string; lat: number; lng: number } | null

Use useRealtimeLocation(tripId) for the live position.
Use dynamic import (ssr: false) for the Leaflet map component — reuse TripMapInner
  from app/(user)/trip/_components/TripMapInner.tsx.

Ended / expired state (FR-ST-13):
  If isExpired || tripStatus !== "active": show a "Trip Ended" / "Link Expired" screen
  instead of the live map — no map rendered.

Active state layout (mobile-first):
  - Full-screen or near-full-screen map showing traveller's live dot
    (falls back to start terminal coords while waiting for first broadcast)
  - Bottom info panel:
    · Route name
    · "🧑 <traveller> is travelling"
    · Started at (formatted: "Started 14:32")
    · Live pulsing indicator: "● Live" (when position received) or "Waiting for location…"
  - Page title: "Tracking <traveller>'s trip"

─────────────────────────────────────────────────────────────────────
CONSTRAINTS
─────────────────────────────────────────────────────────────────────

- Never expose the full name, email, or user_id of the traveller on the public page (NFR-SE-06).
  Only the first name from profiles.full_name is permitted.
- GROQ_API_KEY, SUPABASE_SERVICE_ROLE_KEY — server-only, never in client bundles.
- No tailwind.config.ts.
- Every new file must reference its FR/NFR IDs in a comment at the top.
- Stage all changes but do NOT commit.
```

---

### Task 4 — Manual QA

```bash
supabase start
pnpm dev
```

Sign in as `alice@taxiflow.test / User1234!`.

**Start a trip:**
- [ ] Navigate to Route Search → pick Piassa → Megenagna → tap Search
- [ ] On the result page the **Start Trip** button appears
- [ ] Tap Start Trip → arrives at `/trip?from=...&to=...&routeId=...&fare=...`
- [ ] GPS permission prompt appears (or "Locating…" shown)
- [ ] Map shows start and end terminal pins
- [ ] Trip row created in DB: `SELECT id, status, route_id FROM trips WHERE user_id = '<alice-uuid>' ORDER BY created_at DESC LIMIT 1;`
- [ ] Status = `active`

**Realtime broadcast:**
- [ ] Wait 6 seconds — check server logs for no errors
- [ ] After 30 s: `SELECT lat, lng FROM trip_locations ORDER BY recorded_at DESC LIMIT 1;`
  should return a row (GPS may show Addis Ababa or your real coords)

**ActiveTripBanner:**
- [ ] Navigate to /dashboard while trip is in progress (use browser back)
- [ ] Banner visible at top: "Trip in progress" with a View link
- [ ] Tapping View returns to the trip screen

**Share link (FR-ST-01..04):**
- [ ] On the trip screen tap Share
- [ ] Share sheet / "Copied!" message appears
- [ ] Copy the `/track/<token>` URL
- [ ] Open it in a private/incognito window (no login)
- [ ] TrackingView shows: route name, traveller first name ("Alice"), start time
- [ ] Live position updates every ~5 seconds on the public page

**End Trip (FR-TR-07):**
- [ ] Tap End Trip on the trip screen
- [ ] Redirects to /dashboard
- [ ] `SELECT status, ended_at FROM trips WHERE id = '<trip-id>';` → `completed`, non-null `ended_at`
- [ ] `/track/<token>` in incognito now shows "Trip Ended" state
- [ ] ActiveTripBanner no longer visible on /dashboard

**Expired token (FR-ST-13):**
- [ ] `UPDATE share_tokens SET expires_at = now() - interval '1 second' WHERE trip_id = '<trip-id>';`
- [ ] Reload `/track/<token>` → "Link Expired" state shown

**Mobile (375 px):**
- [ ] Trip screen fills full screen, end-trip button reachable
- [ ] Tracking page bottom panel readable, map takes most of screen

---

### Task 5 — Write tests — tests/trip.test.ts

```ts
import { describe, it, expect } from "vitest";

describe("useGeolocation", () => {
  it("module is importable", async () => {
    const mod = await import("@/hooks/useGeolocation");
    expect(mod.useGeolocation).toBeDefined();
  });
});

describe("useTripTracking", () => {
  it("module is importable", async () => {
    const mod = await import("@/hooks/useTripTracking");
    expect(mod.useTripTracking).toBeDefined();
  });
});

describe("useRealtimeLocation", () => {
  it("module is importable", async () => {
    const mod = await import("@/hooks/useRealtimeLocation");
    expect(mod.useRealtimeLocation).toBeDefined();
  });
});

describe("Trip status values", () => {
  it("active trip statuses are a known set", () => {
    const valid = ["active", "completed", "cancelled", "payment_pending", "paid"];
    expect(valid).toContain("active");
    expect(valid).toContain("completed");
    expect(valid).toHaveLength(5);
  });
});
```

---

### Task 6 — Commit and open PR

```bash
git add hooks/
git add components/trip/
git add "app/(user)/trip/"
git add "app/(user)/layout.tsx"
git add "app/(user)/route-search/result/page.tsx"
git add app/track/
git add "supabase/migrations/20260520000003_trip_tracking_rls.sql"
git add tests/trip.test.ts

git commit -m "phase-6: live GPS trip tracking, share links, and public tracking page"

git push -u origin phase-06-trip-tracking

gh pr create \
  --title "phase-6: GPS trip tracking, share links, public /track/[token]" \
  --body "$(cat <<'EOF'
## Summary
- hooks/useGeolocation.ts: watchPosition wrapper
- hooks/useTripTracking.ts: DB insert, Realtime broadcast (5 s), trip_locations snapshot (30 s), endTrip, generateShareToken
- hooks/useRealtimeLocation.ts: subscribes to trip-location channel
- components/trip/ActiveTripBanner.tsx: localStorage-based persistent banner
- TripInProgress rewrite: fully wired to Supabase via hooks
- app/track/[token]: public server + client tracking page (no auth)
- Migration: RLS for share_tokens, trips, trip_locations (public read via token)
- FR-TR-01..13, FR-ST-01..17, NFR-PE-04, NFR-SE-05,06 implemented

## Test plan
- [ ] pnpm type-check passes
- [ ] pnpm lint passes
- [ ] pnpm test passes
- [ ] pnpm build passes
- [ ] CI green
- [ ] Trip row created in DB on Start Trip
- [ ] trip_locations row inserted after 30 s
- [ ] /track/[token] loads in incognito, shows traveller first name
- [ ] Live position updates on public page while trip active
- [ ] End Trip → status = completed, ended_at set, tracking page shows "Trip Ended"
- [ ] Expired token shows correct state
EOF
)"
```

---

## 6.4 Acceptance script

```bash
pnpm type-check                              # 0 errors
pnpm lint                                    # 0 errors
pnpm test                                    # all pass including trip tests
pnpm build                                   # exits 0
gh run list --limit 1                        # "completed success"

# Manual:
# Start trip from Piassa → Megenagna
# SELECT status FROM trips ORDER BY created_at DESC LIMIT 1; → active
# Wait 30 s → SELECT lat FROM trip_locations ORDER BY recorded_at DESC LIMIT 1; → non-null
# Share link → open in incognito → see live tracking
# End trip → SELECT status FROM trips ORDER BY created_at DESC LIMIT 1; → completed
# Tracking page → "Trip Ended"
```

**All pass = Phase 6 complete.**

---

## 6.5 Common failure modes

**`trip_locations` insert 403.**
The RLS policy `trip_locations_insert_own` requires `auth.uid()` to match the trip's `user_id`. Verify the user is authenticated when the snapshot fires and the trip row has the correct `user_id`.

**Share token public page returns 404.**
The anon SELECT on `share_tokens` and `trips` requires the migration to have been applied (`supabase migration up`). Verify with:
```sql
SELECT * FROM share_tokens LIMIT 1;  -- as anon via supabase client
```

**Realtime broadcast not received on public page.**
Supabase Realtime Broadcast requires both the sender and receiver to use the same channel name. Confirm both use `"trip-location:<tripId>"` exactly. Check Supabase dashboard → Realtime → Inspector.

**`navigator.geolocation` returns no position in dev.**
Chrome requires HTTPS or `localhost` for geolocation. `pnpm dev` runs on `localhost:3000` — this is fine. If testing on a real device over the network, either use HTTPS or ngrok.

**ActiveTripBanner flickers on first render.**
localStorage is only available client-side. The banner reads on mount inside a `useEffect`, so it correctly avoids SSR mismatch. If you see hydration errors, verify the banner renders `null` on server and only shows content after mount.

**Leaflet `window is not defined` on tracking page.**
`TripMapInner` must be loaded with `dynamic(() => import("..."), { ssr: false })` in `TrackingView`. This is already the pattern in `TripInProgress` — replicate it.

---

## 6.6 What's NOT in Phase 6

- ❌ Payment trigger after End Trip (Phase 7 — `router.push("/dashboard")` for now)
- ❌ Trip history list in Profile (Phase 9)
- ❌ Admin trip management view (Phase 8)
- ❌ ORS-based ETA on the live tracking page
- ❌ Share token expiry UI (admin sets it in Phase 8; for now tokens never expire)
- ❌ Push notifications when trip ends

---

## 6.7 When you're done

Reply with:
1. Confirmation that all acceptance checks passed (or deviations and why).
2. The PR URL.
3. Any changes made vs. the spec and why.
4. DB query output showing the completed trip row.

I'll then write `PHASE-07-stripe-payments.md`.
