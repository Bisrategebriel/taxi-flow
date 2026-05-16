# Phase 4 — Maps, Routing & Core Search

> **Status:** Ready to execute
> **Estimated time:** 4–5 hours
> **Branch:** `phase-04-maps-routing-search`
> **Prerequisite:** Phase 3 PR merged to `main`, CI green

---

## 4.1 Goal

Wire up the two core user flows: route search (pick start terminal, pick end terminal, see the route on a Leaflet map with fare and distance) and nearest terminal (GPS or tap to locate the closest terminal). At the end of this phase:

- `lib/ors/client.ts` fetches road polylines + directions from OpenRouteService with a 1-hour in-memory cache
- Leaflet maps render correctly on mobile via dynamic import (SSR disabled)
- Route search resolves from the Supabase `routes` / `fares` / `distances` tables and overlays the ORS polyline
- Nearest-terminal page uses the browser Geolocation API and sorts terminals by haversine distance
- Recent searches are persisted in `localStorage` (FR-RS-07)
- Lighthouse performance ≥ 80 on the result page (NFR-PE-01, 02)

**Covers:** SRS §4.3 (FR-RS-01..07), §4.4 (FR-NT-01..05), §4.5 (FR-FI-01..03), §6.1–6.5 (FR-MP-01..19), §6.8

---

## 4.2 Pre-flight check

```bash
# 1. Merge phase-03 PR to main first, then:
git checkout main && git pull origin main
git log --oneline -1   # should be the phase-03 merge commit

# 2. Clean build on main
pnpm install && pnpm type-check && pnpm build

# 3. Confirm .env.local has ORS key (add it if missing)
grep ORS_API_KEY .env.local   # must print a line

# 4. Local Supabase running with seed data
supabase status
# Confirm terminals exist:
# supabase db query "SELECT name, lat, lng FROM terminals LIMIT 5;"
```

> **ORS API key (free tier):**
> 1. Sign up at https://openrouteservice.org/dev/#/signup
> 2. Copy your API token from the dashboard
> 3. Add to `.env.local`:
>    ```
>    ORS_API_KEY=your_token_here
>    ```
> The free tier allows 2 000 requests/day and 40/minute — plenty for development.

---

## 4.3 Step-by-step tasks

---

### Task 1 — Create the phase branch

```bash
git checkout -b phase-04-maps-routing-search
```

---

### Task 2 — Claude Code Prompt: Maps, routing & search

Copy everything inside the fence and paste into Claude Code:

```
Read PLAN.md and docs/phases/PHASE-04-maps-routing-search.md in full before doing anything.
Read node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md
and node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md
before writing any code.

We are on branch phase-04-maps-routing-search.

─────────────────────────────────────────────────────────────────────
IMPORTANT CONTEXT
─────────────────────────────────────────────────────────────────────

Tailwind 4, CSS-first, no tailwind.config.ts.
shadcn/ui + cn() from @/lib/utils. Uppercase component filenames (Container, Heading, Card).
Next.js 16 uses proxy.ts (not middleware.ts). Build uses --webpack due to Serwist.

Leaflet and react-leaflet MUST use dynamic import with ssr:false.
Never import leaflet or react-leaflet at the top level of a Server Component —
it will crash with "window is not defined".

The ORS API key is stored as ORS_API_KEY (no NEXT_PUBLIC prefix — server only).
ORS coordinates are in [lng, lat] order, NOT [lat, lng].

Database schema (relevant tables):
  terminals: id, name, address, city, lat, lng, is_active
  routes:    id, name, start_terminal_id, end_terminal_id, intermediate_stops (string[]), is_active
  fares:     id, route_id, amount, currency, effective_from, effective_to
  distances: from_terminal_id, to_terminal_id, distance_km, duration_minutes

Seed data (5 terminals, 3 routes):
  Merkato   (9.0178, 38.7441) — Piassa    (9.0350, 38.7469)
  Megenagna (9.0225, 38.7996) — Kaliti    (8.9581, 38.7571)
  Saris     (8.9855, 38.7241)

Routes:
  Merkato → Megenagna  (8.5 km, 25 min, $2.50)
  Piassa  → Kaliti     (12 km, 35 min, $3.00)
  Saris   → Megenagna  (6.5 km, 20 min, $2.00)

Do not touch supabase/, types/, app/(landing)/, app/(admin)/, auth pages, or
any lib/supabase/ files. Stage all changes but do NOT commit.

─────────────────────────────────────────────────────────────────────
TASK 1: Install packages
─────────────────────────────────────────────────────────────────────

Run:
  pnpm add leaflet react-leaflet
  pnpm add -D @types/leaflet

If ERR_PNPM_IGNORED_BUILDS, add the package to onlyBuiltDependencies in package.json.

─────────────────────────────────────────────────────────────────────
TASK 2: Haversine utility — lib/utils/haversine.ts
─────────────────────────────────────────────────────────────────────

// FR-NT-03
Create lib/utils/haversine.ts:

/**
 * Returns the great-circle distance in km between two lat/lng points.
 */
export function haversine(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

─────────────────────────────────────────────────────────────────────
TASK 3: ORS client — lib/ors/client.ts
─────────────────────────────────────────────────────────────────────

// FR-MP-16 (caching), FR-RS-03, FR-MP-01..05
Create lib/ors/client.ts:

const ORS_BASE = "https://api.openrouteservice.org/v2";

export interface ORSStep {
  distance: number;       // metres
  duration: number;       // seconds
  instruction: string;
  name: string;
  type: number;
}

export interface ORSDirectionsResult {
  polyline: [number, number][];  // [lat, lng] pairs ready for Leaflet
  distance_m: number;
  duration_s: number;
  steps: ORSStep[];
}

// In-memory cache — keyed by "lat1,lng1:lat2,lng2"
const _cache = new Map<string, { data: ORSDirectionsResult; ts: number }>();
const TTL = 60 * 60 * 1000; // 1 hour

export async function getDirections(
  start: { lat: number; lng: number },
  end: { lat: number; lng: number }
): Promise<ORSDirectionsResult | null> {
  const key = `${start.lat},${start.lng}:${end.lat},${end.lng}`;
  const cached = _cache.get(key);
  if (cached && Date.now() - cached.ts < TTL) return cached.data;

  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) {
    console.warn("[ORS] ORS_API_KEY not set — skipping directions fetch");
    return null;
  }

  const url =
    `${ORS_BASE}/directions/driving-car` +
    `?api_key=${apiKey}` +
    `&start=${start.lng},${start.lat}` +   // ORS uses lng,lat order
    `&end=${end.lng},${end.lat}`;

  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) {
      console.error(`[ORS] ${res.status} ${res.statusText}`);
      return null;
    }

    const json = await res.json();
    const feature = json?.features?.[0];
    if (!feature) return null;

    // ORS GeoJSON geometry uses [lng, lat] — flip to [lat, lng] for Leaflet
    const polyline: [number, number][] = (
      feature.geometry.coordinates as [number, number][]
    ).map(([lng, lat]) => [lat, lng]);

    const segment = feature.properties?.segments?.[0];
    const result: ORSDirectionsResult = {
      polyline,
      distance_m: segment?.distance ?? 0,
      duration_s: segment?.duration ?? 0,
      steps: (segment?.steps ?? []) as ORSStep[],
    };

    _cache.set(key, { data: result, ts: Date.now() });
    return result;
  } catch (err) {
    console.error("[ORS] fetch error", err);
    return null;
  }
}

─────────────────────────────────────────────────────────────────────
TASK 4: Leaflet map components — components/map/
─────────────────────────────────────────────────────────────────────

// FR-MP-01..06, FR-MP-10..12

──────────────────────────────────────────
4a. components/map/leaflet-setup.ts
──────────────────────────────────────────

This module MUST only be imported inside client components that are
themselves dynamically loaded (ssr: false). Never import it at the top
level of a server component or layout.

// FR-MP-10
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function makePin(color: string, label: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="
      width:32px;height:32px;border-radius:50% 50% 50% 0;
      background:${color};transform:rotate(-45deg);
      border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,.4);
      display:flex;align-items:center;justify-content:center;">
      <span style="transform:rotate(45deg);color:white;font-size:11px;font-weight:700;">${label}</span>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -36],
  });
}

export const startIcon = makePin("#0f6cbd", "A");
export const endIcon   = makePin("#16a34a", "B");
export const pinIcon   = makePin("#64748b", "•");

──────────────────────────────────────────
4b. components/map/RouteMapInner.tsx
──────────────────────────────────────────

// FR-MP-01..06, FR-RS-04
"use client";

This is the actual Leaflet component — NOT exported directly.
It is the target of the dynamic import in RouteMap.tsx.

Import at the top: import "leaflet/dist/leaflet.css"
Then import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap }
from "react-leaflet".
Then import { startIcon, endIcon } from "@/components/map/leaflet-setup".

Props:
  start: { lat: number; lng: number; name: string }
  end:   { lat: number; lng: number; name: string }
  polyline?: [number, number][]   // if null, draw straight line fallback
  className?: string

The map should:
  - Default zoom: 13, center on midpoint of start/end
  - TileLayer: https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png
    attribution: © OpenStreetMap contributors
  - If polyline provided: draw a <Polyline> in primary blue (#0f6cbd) weight=4
  - If no polyline: draw a straight line between [start.lat,start.lng] and [end.lat,end.lng]
  - <Marker position={[start.lat, start.lng]} icon={startIcon}>
      <Popup>{start.name}</Popup>
    </Marker>
  - <Marker position={[end.lat, end.lng]} icon={endIcon}>
      <Popup>{end.name}</Popup>
    </Marker>
  - A <FitBounds> inner component (using useMap()) that calls
    map.fitBounds([[start.lat,start.lng],[end.lat,end.lng]], { padding: [40,40] })
    in a useEffect whenever start/end change.

Container: <div className={cn("h-64 md:h-80 rounded-2xl overflow-hidden", className)}>

──────────────────────────────────────────
4c. components/map/RouteMap.tsx
──────────────────────────────────────────

// FR-MP-01
Client component that re-exports the dynamically-imported inner map:

"use client";
import dynamic from "next/dynamic";

const RouteMapInner = dynamic(
  () => import("@/components/map/RouteMapInner"),
  {
    ssr: false,
    loading: () => (
      <div className="h-64 md:h-80 rounded-2xl bg-muted animate-pulse" />
    ),
  }
);

export default RouteMapInner;

(RouteMap.tsx is just the dynamic wrapper. All actual props are forwarded.)

──────────────────────────────────────────
4d. components/map/TerminalsMapInner.tsx
──────────────────────────────────────────

// FR-NT-01, FR-MP-01
"use client";

Similar to RouteMapInner but for the terminals list.

Props:
  terminals: Array<{ id: string; name: string; lat: number; lng: number }>
  userLocation?: { lat: number; lng: number } | null
  className?: string

The map should:
  - Center: 9.02, 38.75 (Addis Ababa), zoom: 12
  - TileLayer: OpenStreetMap
  - A <Marker> with <Popup> for each terminal using pinIcon
  - If userLocation provided: a <Marker> with a distinct circle-style DivIcon
    (blue dot, 12px) and popup "Your location"
  - A <FitToBounds> component that fits all terminal positions

Import "leaflet/dist/leaflet.css" and { pinIcon } from "@/components/map/leaflet-setup".

──────────────────────────────────────────
4e. components/map/TerminalsMap.tsx
──────────────────────────────────────────

// FR-NT-01
"use client";
import dynamic from "next/dynamic";

const TerminalsMapInner = dynamic(
  () => import("@/components/map/TerminalsMapInner"),
  {
    ssr: false,
    loading: () => (
      <div className="h-56 rounded-2xl bg-muted animate-pulse" />
    ),
  }
);

export default TerminalsMapInner;

─────────────────────────────────────────────────────────────────────
TASK 5: Recent searches hook — hooks/useRecentSearches.ts
─────────────────────────────────────────────────────────────────────

// FR-RS-07
Create hooks/useRecentSearches.ts as a client hook ('use client' is NOT
needed in hook files — it is only needed in components).

The hook stores up to 5 recent searches in localStorage under the key
"taxiflow_recent_searches".

Each entry: { fromId: string; fromName: string; toId: string; toName: string; ts: number }

export interface RecentSearch {
  fromId: string;
  fromName: string;
  toId: string;
  toName: string;
  ts: number;
}

const KEY = "taxiflow_recent_searches";
const MAX = 5;

export function useRecentSearches() {
  // Read from localStorage (safe — only runs in browser)
  function getAll(): RecentSearch[] {
    try {
      return JSON.parse(localStorage.getItem(KEY) ?? "[]");
    } catch {
      return [];
    }
  }

  function add(entry: Omit<RecentSearch, "ts">) {
    const existing = getAll().filter(
      (s) => !(s.fromId === entry.fromId && s.toId === entry.toId)
    );
    const next = [{ ...entry, ts: Date.now() }, ...existing].slice(0, MAX);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  }

  return { getAll, add };
}

─────────────────────────────────────────────────────────────────────
TASK 6: Rebuild route-search — app/(user)/route-search/
─────────────────────────────────────────────────────────────────────

──────────────────────────────────────────────────────────────────
6a. app/(user)/route-search/page.tsx  (Server Component)
──────────────────────────────────────────────────────────────────

// FR-RS-01, FR-RS-02
Fetches all active terminals from Supabase and renders the search form.

import { createClient } from "@/lib/supabase/server";
import Container from "@/components/ui/Container";
import Heading from "@/components/ui/Heading";
import RouteSearchForm from "@/app/(user)/route-search/_components/RouteSearchForm";

export default async function RouteSearchPage() {
  const supabase = await createClient();
  const { data: terminals } = await supabase
    .from("terminals")
    .select("id, name, city")
    .eq("is_active", true)
    .order("name");

  return (
    <Container className="py-6 max-w-lg">
      <Heading level={1} className="text-xl sm:text-2xl mb-1">
        Route Search
      </Heading>
      <p className="text-muted-foreground text-sm mb-6">
        Find routes, fares, and directions between terminals.
      </p>
      <RouteSearchForm terminals={terminals ?? []} />
    </Container>
  );
}

──────────────────────────────────────────────────────────────────
6b. app/(user)/route-search/_components/RouteSearchForm.tsx  (Client Component)
──────────────────────────────────────────────────────────────────

// FR-RS-01, FR-RS-02, FR-RS-06, FR-RS-07
"use client";

Props:
  terminals: Array<{ id: string; name: string; city: string }>

State:
  fromId: string, toId: string

The form uses a standard <form> with action="/route-search/result" method="GET"
(so results are accessible via URL and shareable).

UI:
  - Two <select> elements: "From" and "To" — each lists all terminals
  - A swap/reverse button between them (FR-RS-06): clicking swaps fromId ↔ toId
  - A "Search Routes" submit button (disabled if fromId === toId or either is empty)
  - A recent searches section below the form

On mount, read recent searches from useRecentSearches().getAll() and display up
to 3 as clickable chips: "{fromName} → {toName}". Clicking a chip sets the
from/to selects to that pair.

Import useRecentSearches from "@/hooks/useRecentSearches".
Import { ArrowLeftRight } from "lucide-react" for the swap button.
Import { buttonVariants } from "@/components/ui/Button".

The swap button:
  type="button" (not submit)
  onClick={() => { setFromId(toId); setToId(fromId); }}
  className: small rounded-full icon button using muted background

──────────────────────────────────────────────────────────────────
6c. app/(user)/route-search/result/page.tsx  (Server Component)
──────────────────────────────────────────────────────────────────

// FR-RS-03, FR-RS-04, FR-RS-05, FR-FI-01..03, FR-MP-01..05
This page receives searchParams: { from: string; to: string }
(terminal IDs, passed as GET query params by the form).

Fetch sequence (all in parallel where possible):
  1. Fetch both terminals by ID
  2. Find a route where (start=from AND end=to) OR (start=to AND end=from)
  3. If no route found → render "no route found" empty state
  4. Fetch fare for the found route (latest effective fare)
  5. Fetch distance record (from→to direction if exists, else to→from)
  6. Call getDirections(fromTerminal, toTerminal) from lib/ors/client.ts

Then save to recent searches — but since this is a Server Component, the
localStorage write must happen client-side. Render a small
<SaveRecentSearch> client component that runs useRecentSearches().add(...)
in a useEffect.

Page layout:
  A. Map (top): <RouteMap> with the polyline (or straight line fallback)
  B. Route info card:
       - Route name (e.g. "Merkato — Megenagna")
       - Reversed badge if direction is reversed: "Reverse direction"
       - From terminal → To terminal
       - Distance: from distances table (distance_km km · duration_minutes min)
       - Fare: from fares table (amount currency)
       - Note if ORS key missing: "Detailed directions unavailable — add ORS_API_KEY"
  C. Step-by-step directions (if ORS data available):
       - A collapsible list of steps from ors.steps
       - Each step: instruction + distance in metres

If no route exists between the two terminals, render:
  <div className="text-center py-12">
    <MapX size={48} className="mx-auto text-muted-foreground mb-4" />
    <Heading level={2}>No route found</Heading>
    <p className="text-muted-foreground mt-2">
      No direct route exists between these two terminals.
    </p>
    <Link href="/route-search" className={buttonVariants({ variant: "outline", size: "sm", className: "mt-6" })}>
      Try another search
    </Link>
  </div>

Import MapX from "lucide-react" for the empty state icon.

──────────────────────────────────────────────────────────────────
6d. app/(user)/route-search/result/_components/SaveRecentSearch.tsx
──────────────────────────────────────────────────────────────────

// FR-RS-07
"use client";

Props: fromId, fromName, toId, toName (all string)

This component renders nothing (<> </>) but saves the search to
localStorage on mount:

import { useEffect } from "react";
import { useRecentSearches } from "@/hooks/useRecentSearches";

export default function SaveRecentSearch({ fromId, fromName, toId, toName }: {...}) {
  const { add } = useRecentSearches();
  useEffect(() => {
    add({ fromId, fromName, toId, toName });
  }, []);    // intentionally run once on mount only
  return null;
}

─────────────────────────────────────────────────────────────────────
TASK 7: Rebuild terminals page — app/(user)/terminals/
─────────────────────────────────────────────────────────────────────

──────────────────────────────────────────────────────────────────
7a. app/(user)/terminals/page.tsx  (Server Component)
──────────────────────────────────────────────────────────────────

// FR-NT-01, FR-NT-04
Fetches all active terminals and passes them to a client component.

import { createClient } from "@/lib/supabase/server";
import Container from "@/components/ui/Container";
import Heading from "@/components/ui/Heading";
import TerminalsNearMe from "@/app/(user)/terminals/_components/TerminalsNearMe";

export default async function TerminalsPage() {
  const supabase = await createClient();
  const { data: terminals } = await supabase
    .from("terminals")
    .select("id, name, address, city, lat, lng")
    .eq("is_active", true)
    .order("name");

  return (
    <Container className="py-6 max-w-lg">
      <Heading level={1} className="text-xl sm:text-2xl mb-1">
        Terminals
      </Heading>
      <p className="text-muted-foreground text-sm mb-6">
        Find the nearest taxi terminal to your location.
      </p>
      <TerminalsNearMe terminals={terminals ?? []} />
    </Container>
  );
}

──────────────────────────────────────────────────────────────────
7b. app/(user)/terminals/_components/TerminalsNearMe.tsx  (Client Component)
──────────────────────────────────────────────────────────────────

// FR-NT-02, FR-NT-03, FR-NT-04, FR-NT-05
"use client";

Props:
  terminals: Array<{ id: string; name: string; address: string | null; city: string; lat: number; lng: number }>

State:
  userLocation: { lat: number; lng: number } | null
  gpsStatus: "idle" | "requesting" | "granted" | "denied"
  sorted: (terminal with added distanceKm?: number)[]

On initial render: sorted = terminals sorted alphabetically.
When userLocation is set: re-sort by haversine distance ascending.

"Use My Location" button:
  - Visible when gpsStatus === "idle" or "denied"
  - On click: set gpsStatus = "requesting", call navigator.geolocation.getCurrentPosition(...)
    On success: set userLocation + gpsStatus = "granted"
    On error: set gpsStatus = "denied"
  - While requesting: show spinner + "Getting your location…"
  - If denied: show "Location access denied. Showing all terminals."

Map:
  <TerminalsMap terminals={terminals} userLocation={userLocation} className="mb-4" />

Terminal list (below map):
  {sorted.map(t => (
    <div key={t.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors">
      <div>
        <p className="font-medium text-sm text-foreground">{t.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{t.address ?? t.city}</p>
        {t.distanceKm !== undefined && (
          <p className="text-xs text-primary font-medium mt-0.5">
            {t.distanceKm.toFixed(1)} km away
          </p>
        )}
      </div>
      <Link href={`/route-search?to=${t.id}`}
        className="shrink-0 ml-4 text-xs rounded-full border border-border px-3 py-1.5
          text-muted-foreground hover:bg-primary hover:text-primary-foreground
          hover:border-primary transition-colors font-medium">
        Routes
      </Link>
    </div>
  ))}

Import haversine from "@/lib/utils/haversine".
Import TerminalsMap from "@/components/map/TerminalsMap".
Import { MapPin, Loader2 } from "lucide-react".
Import Link from "next/link".

─────────────────────────────────────────────────────────────────────
TASK 8: Wire up the "Search Route" pre-fill from terminals page
─────────────────────────────────────────────────────────────────────

// FR-NT-05
The "Routes" link from each terminal card (/route-search?to=<id>) should
pre-fill the RouteSearchForm "To" field.

In RouteSearchForm.tsx, read the initial `to` value from the URL using
useSearchParams() from "next/navigation":

  const searchParams = useSearchParams();
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState(searchParams.get("to") ?? "");

─────────────────────────────────────────────────────────────────────
TASK 9: Run verification
─────────────────────────────────────────────────────────────────────

pnpm type-check   # must pass (0 errors)
pnpm lint         # must pass
pnpm test         # must pass
pnpm build        # must pass

─────────────────────────────────────────────────────────────────────
CONSTRAINTS
─────────────────────────────────────────────────────────────────────

- Never import leaflet or react-leaflet at the top level of any Server Component.
- Dynamic import with ssr:false is REQUIRED for all Leaflet components.
- ORS_API_KEY has no NEXT_PUBLIC prefix — server-side only.
- ORS coordinates are [lng, lat] in the API; Leaflet uses [lat, lng]. Flip in the client.
- TypeScript strict mode. No `any`.
- Every new file must have // FR-XX-XX or // NFR-XX-XX at the top.
- Do not create tailwind.config.ts.
- Stage all changes but do NOT commit.
```

---

### Task 3 — Manual QA

```bash
supabase start   # ensure local Supabase is running
pnpm dev
```

Sign in as `alice@taxiflow.test / User1234!`.

**Route Search — `/route-search`:**
- [ ] Two dropdowns list all 5 terminals
- [ ] Swap button swaps the selections
- [ ] Submitting "Merkato Terminal" → "Megenagna Terminal" navigates to `/route-search/result?from=...&to=...`
- [ ] Result page: map renders (OSM tiles load), blue polyline (or straight line if no ORS key)
- [ ] Route name, distance (8.5 km · 25 min), fare ($2.50) displayed
- [ ] Step-by-step panel shows (if ORS key configured) or shows "Directions unavailable" note
- [ ] Trying Piassa → Kaliti shows correct fare ($3.00)
- [ ] Reverse: Megenagna → Merkato finds the same route with "Reverse direction" badge
- [ ] No-route state: pick two terminals with no route (e.g. Merkato → Saris) → empty state shown
- [ ] Result is saved to recent searches; revisiting `/route-search` shows the chip

**Nearest Terminal — `/terminals`:**
- [ ] Map loads with all 5 terminal pins visible
- [ ] "Use My Location" button visible; tapping it requests GPS
- [ ] If GPS granted: terminals reorder by distance, distances shown in cards
- [ ] If GPS denied: message shown, terminals shown alphabetically
- [ ] "Routes" link on each card navigates to `/route-search?to=<id>` with "To" pre-filled

**Mobile (375px):**
- [ ] Map fills full width, no overflow
- [ ] Terminal list cards are touch-friendly (min 44px tap target)
- [ ] Step-by-step directions readable on small screen

---

### Task 4 — Lighthouse performance check

```bash
pnpm build && pnpm start
```

Open Chrome → http://localhost:3000/route-search/result?from=aaaa0000-0000-0000-0000-000000000001&to=aaaa0000-0000-0000-0000-000000000003

Run Lighthouse → Performance. Target: **≥ 80**.

Leaflet is loaded lazily (dynamic import), so the initial JS bundle stays small. If score is below 80, check the Lighthouse waterfall for any blocking resources.

---

### Task 5 — Write tests — tests/maps.test.ts

```bash
# After Claude Code finishes, add this test file manually or ask Claude to add it:
```

Create `tests/maps.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { haversine } from "@/lib/utils/haversine";

describe("haversine", () => {
  it("returns 0 for identical points", () => {
    expect(haversine({ lat: 9.02, lng: 38.75 }, { lat: 9.02, lng: 38.75 })).toBe(0);
  });

  it("Merkato → Megenagna is approximately 6–11 km", () => {
    const d = haversine({ lat: 9.0178, lng: 38.7441 }, { lat: 9.0225, lng: 38.7996 });
    expect(d).toBeGreaterThan(4);
    expect(d).toBeLessThan(12);
  });
});

describe("ORS client imports", () => {
  it("getDirections is importable", async () => {
    const mod = await import("@/lib/ors/client");
    expect(mod.getDirections).toBeDefined();
  });
});
```

---

### Task 6 — Commit and open PR

```bash
git add lib/ors/client.ts lib/utils/haversine.ts
git add components/map/
git add hooks/useRecentSearches.ts
git add "app/(user)/route-search/"
git add "app/(user)/terminals/"
git add tests/maps.test.ts
git add package.json pnpm-lock.yaml

git commit -m "phase-4: maps, route search, nearest terminal, ORS, Leaflet"

git push -u origin phase-04-maps-routing-search

gh pr create \
  --title "phase-4: maps, route search, nearest terminal" \
  --body "$(cat <<'EOF'
## Summary
- lib/ors/client.ts: ORS directions client with 1-hour in-memory cache (FR-MP-16)
- lib/utils/haversine.ts: great-circle distance utility
- components/map/: Leaflet RouteMap + TerminalsMap (dynamic import, SSR disabled)
- app/(user)/route-search/: rebuilt — terminal select form, result page with map + fare + ORS directions
- app/(user)/terminals/: rebuilt — GPS sort, all-terminals map, pre-fill route search
- hooks/useRecentSearches.ts: localStorage recent searches (FR-RS-07)
- FR-RS-01..07, FR-NT-01..05, FR-FI-01..03, FR-MP-01..16 implemented

## Test plan
- [ ] pnpm type-check passes
- [ ] pnpm lint passes
- [ ] pnpm test passes (haversine + import tests)
- [ ] pnpm build passes
- [ ] CI green
- [ ] Route search finds correct fare and distance from DB
- [ ] Map renders with OSM tiles on mobile
- [ ] ORS polyline displayed (or graceful fallback if key missing)
- [ ] Reverse direction works
- [ ] No-route empty state shown
- [ ] GPS location sorts terminals by distance
- [ ] Recent searches persist across page visits
EOF
)"
```

---

## 4.4 Acceptance script

```bash
pnpm type-check                              # 0 errors
pnpm lint                                    # 0 errors
pnpm test                                    # all pass including haversine tests
pnpm build                                   # exits 0
gh run list --limit 1                        # "completed success"

# Manual:
# /route-search → pick terminals → result page loads with map + fare
# Merkato→Megenagna: $2.50, 8.5 km, 25 min
# Piassa→Kaliti: $3.00, 12 km, 35 min
# Unknown pair → no-route empty state
# /terminals → GPS button → list reorders by distance
# Recent search chip appears after first search
# Lighthouse perf ≥ 80 on result page (production build)
```

**All pass = Phase 4 complete.**

---

## 4.5 Common failure modes

**`window is not defined` during build.**
You imported `leaflet` or `react-leaflet` in a Server Component or at the top level of a
module that gets imported server-side. Only import them inside the component body of a
`"use client"` file that itself is loaded via `dynamic(() => import(...), { ssr: false })`.

**Leaflet CSS not loading / map renders grey.**
`import "leaflet/dist/leaflet.css"` must appear inside `RouteMapInner.tsx` or
`TerminalsMapInner.tsx` — the dynamically-imported files. Do not put it in globals.css.

**Marker icons show as broken images.**
The default Leaflet marker icons use relative image paths that break in webpack.
Use the `DivIcon` approach defined in `leaflet-setup.ts` — it creates markers with inline HTML
and has no external image dependencies.

**ORS returns 403 / 429.**
Check that `ORS_API_KEY` in `.env.local` is valid and the free-tier rate limit (40 req/min,
2000 req/day) has not been hit. The in-memory cache in `lib/ors/client.ts` deduplicates
identical requests for 1 hour.

**`useSearchParams()` causes build error "Missing Suspense boundary".**
In Next.js 16, any Client Component that calls `useSearchParams()` must be wrapped in
`<Suspense>` in its parent. Wrap `<RouteSearchForm>` with
`<Suspense fallback={<div className="h-40 bg-muted animate-pulse rounded-xl" />}>` in
`route-search/page.tsx`.

**Map tiles don't load on Vercel / production.**
OSM tile servers block requests from servers. Since Leaflet runs fully client-side
(SSR disabled), tiles are requested by the user's browser, not the server — this should
not be an issue. If tiles are blank, check browser console for CORS or CSP errors.

**`react-leaflet` types conflict with React 19 types.**
Add `"skipLibCheck": true` to `tsconfig.json` if not already present (it is). If
`@types/leaflet` causes conflicts, check that its version is compatible with the installed
`leaflet` version (`pnpm list leaflet @types/leaflet`).

**`useMap()` hook throws "No map context".**
`useMap()` only works inside a `<MapContainer>`. Ensure `FitBounds` is rendered as a child
of `<MapContainer>`, not alongside it.

**`searchParams` in Server Component causes TypeScript error.**
In Next.js 16, `searchParams` in page components is typed as
`Promise<{ [key: string]: string | string[] | undefined }>`. Use
`const { from, to } = await searchParams` (await it). Do NOT destructure synchronously.

---

## 4.6 What's NOT in Phase 4

- ❌ AI chatbot (Phase 5)
- ❌ Live GPS trip tracking (Phase 6)
- ❌ Stripe payments (Phase 7)
- ❌ Multi-waypoint ORS routing for intermediate stops (Phase 10 polish)
- ❌ Turn-by-turn voice navigation
- ❌ Arbitrary address geocoding ("type any address") — terminals only
- ❌ Public `/track/[token]` page (Phase 6)
- ❌ Admin terminal/route management (Phase 8)

---

## 4.7 When you're done

Reply with:
1. Confirmation that all acceptance checks passed (or deviations and why).
2. The PR URL.
3. Any changes made vs. the spec and why.
4. A description of the route search result at 375px — what the map looks like, whether ORS polyline loaded, and whether fare/distance are correct.

I'll then write `PHASE-05-ai-chatbot.md`.
