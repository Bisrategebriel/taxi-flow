# Phase 3 — User PWA Shell & Dashboard

> **Status:** Ready to execute
> **Estimated time:** 3–4 hours
> **Branch:** `phase-03-user-pwa-shell`
> **Prerequisite:** Phase 2 PR merged to `main`, CI green

---

## 3.1 Goal

Build the persistent mobile-first shell for all authenticated user routes: bottom navigation on mobile, a sidebar on tablet/desktop, a rebuilt home dashboard, route stubs for all five sections, skeleton loading states, and a fully configured Serwist PWA (manifest, service worker, install prompt). At the end of this phase:

- `proxy.ts` guards all `(user)` routes — unauthenticated visitors are sent to `/auth/login`
- A persistent `app/(user)/layout.tsx` wraps every user page with the nav shell
- Bottom nav (mobile) + sidebar (md+) with correct active-state highlighting on every route
- Five user routes exist: dashboard, route-search, terminals, chat, profile — each with a `loading.tsx` skeleton
- TaxiFlow is installable as a PWA: manifest, icons, and Serwist service worker all wired up
- Lighthouse PWA audit: "Installable" ✓ and "PWA Optimized" ✓

**Covers:** SRS §4.2 (FR-UD-01..07), §12.5 (NFR-CO-01, 03)

---

## 3.2 Pre-flight check

```bash
# 1. Merge phase-02 PR to main first, then:
git checkout main
git pull origin main
git log --oneline -1    # should be the phase-02 merge commit

# 2. Confirm the build is clean on main
pnpm install
pnpm type-check         # must exit 0
pnpm build              # must exit 0

# 3. Confirm current user routes exist as stubs
# Expected:
#   app/(user)/dashboard/page.tsx   ← Phase 1 placeholder, will be replaced
#   app/(admin)/admin/dashboard/page.tsx
```

---

## 3.3 Step-by-step tasks

---

### Task 1 — Create the phase branch

```bash
git checkout -b phase-03-user-pwa-shell
```

---

### Task 2 — Claude Code Prompt: User PWA shell

Copy everything inside the fence and paste into Claude Code:

```
Read PLAN.md and docs/phases/PHASE-03-user-pwa-shell.md in full before doing anything.
Read node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md
and node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md
and node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/01-metadata/manifest.md
before writing any code.

We are on branch phase-03-user-pwa-shell.

─────────────────────────────────────────────────────────────────────
IMPORTANT CONTEXT
─────────────────────────────────────────────────────────────────────

Next.js 16 renames middleware.ts → proxy.ts. The export is named `proxy` (or default).
There is no middleware.ts in this project — create proxy.ts at the root.

Tailwind 4 is CSS-first. No tailwind.config.ts. All tokens are in app/globals.css.

shadcn/ui is installed. Use existing components from components/ui/ (button, card, etc.).
Use cn() from @/lib/utils for class merging.

For navigation active state: components that call usePathname() must be 'use client'.
The (user)/layout.tsx itself should be a Server Component for the auth check.
The BottomNav and UserSidebar are Client Components (they need usePathname).

Lucide React is already installed. Use it for nav icons.

For the service worker: app/sw.ts is compiled by Serwist separately.
It must be excluded from the main TypeScript compilation to avoid lib conflicts.
Add "app/sw.ts" to the "exclude" array in tsconfig.json.

pnpm 11 blocks build scripts by default. After installing Serwist packages,
check if they need build scripts and add them to the "onlyBuiltDependencies" array
in package.json's "pnpm" field if needed.

Do not touch supabase/, types/, lib/supabase/, app/(landing)/, or any auth pages.
Stage all changes but do NOT commit.

─────────────────────────────────────────────────────────────────────
TASK 1: Install Serwist
─────────────────────────────────────────────────────────────────────

Run:
  pnpm add @serwist/next serwist

If the install fails with ERR_PNPM_IGNORED_BUILDS, add the package name to the
"onlyBuiltDependencies" array in package.json's "pnpm" field and re-run.

─────────────────────────────────────────────────────────────────────
TASK 2: Configure Serwist in next.config.ts
─────────────────────────────────────────────────────────────────────

// NFR-CO-01, NFR-CO-03

Replace next.config.ts with:

import type { NextConfig } from "next";
import withSerwist from "@serwist/next";

const withSerwistConfig = withSerwist({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {};

export default withSerwistConfig(nextConfig);

─────────────────────────────────────────────────────────────────────
TASK 3: Create the service worker — app/sw.ts
─────────────────────────────────────────────────────────────────────

// NFR-CO-01

Create app/sw.ts:

import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
});

serwist.addEventListeners();

Then add "app/sw.ts" to the "exclude" array in tsconfig.json so the main
TypeScript compiler does not try to compile it as part of the app bundle
(it uses webworker globals that conflict with the dom lib).

─────────────────────────────────────────────────────────────────────
TASK 4: Create PWA manifest — app/manifest.ts
─────────────────────────────────────────────────────────────────────

// NFR-CO-01, NFR-CO-03

Create app/manifest.ts:

import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "TaxiFlow",
    short_name: "TaxiFlow",
    description: "Taxi terminal and route management platform for Addis Ababa",
    start_url: "/dashboard",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a0a0a",
    theme_color: "#0f6cbd",
    categories: ["travel", "navigation"],
    icons: [
      {
        src: "/icons/icon-192.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}

─────────────────────────────────────────────────────────────────────
TASK 5: Create PWA icons — public/icons/
─────────────────────────────────────────────────────────────────────

// NFR-CO-01

Create public/icons/icon-192.svg:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" width="192" height="192">
  <rect width="192" height="192" rx="32" fill="#0f6cbd"/>
  <text x="96" y="130" font-family="Arial, sans-serif" font-weight="700" font-size="80"
        text-anchor="middle" fill="#ffffff">TF</text>
</svg>

Create public/icons/icon-512.svg:

<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="80" fill="#0f6cbd"/>
  <text x="256" y="348" font-family="Arial, sans-serif" font-weight="700" font-size="220"
        text-anchor="middle" fill="#ffffff">TF</text>
</svg>

─────────────────────────────────────────────────────────────────────
TASK 6: Create proxy.ts — auth guard for (user) routes
─────────────────────────────────────────────────────────────────────

// FR-AU-05

Create proxy.ts at the project root:

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirectTo", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/route-search/:path*",
    "/terminals/:path*",
    "/chat/:path*",
    "/trip/:path*",
    "/profile/:path*",
  ],
};

─────────────────────────────────────────────────────────────────────
TASK 7: Build BottomNav — components/ui/BottomNav.tsx
─────────────────────────────────────────────────────────────────────

// FR-UD-01, FR-UD-02

'use client'

Create components/ui/BottomNav.tsx as a Client Component.

Import usePathname from "next/navigation".
Import Link from "next/link".
Import these Lucide icons: Home, Search, MapPin, MessageCircle, User.
Import cn from "@/lib/utils".

Nav items (label, href, icon):
  Home        → /dashboard       → Home
  Routes      → /route-search    → Search
  Terminals   → /terminals       → MapPin
  Chat        → /chat            → MessageCircle
  Profile     → /profile         → User

Render as:
<nav aria-label="Main navigation" className="fixed bottom-0 left-0 right-0 z-40 md:hidden
  border-t border-border bg-background/95 backdrop-blur-sm safe-area-pb">
  <div className="flex items-stretch h-16">
    {/* one <Link> per item */}
  </div>
</nav>

Each <Link>:
  - className: flex flex-col items-center justify-center flex-1 gap-1 text-xs
  - Active state (pathname starts with item.href):
      text-primary
    Inactive:
      text-muted-foreground hover:text-foreground transition-colors
  - Icon: size={22} strokeWidth={1.75}
  - Label: <span className="text-[10px] font-medium leading-none">{item.label}</span>

Active check: use pathname.startsWith(item.href). For /dashboard use exact match
(pathname === "/dashboard") to avoid false positives.

─────────────────────────────────────────────────────────────────────
TASK 8: Build UserSidebar — components/ui/UserSidebar.tsx
─────────────────────────────────────────────────────────────────────

// FR-UD-01, FR-UD-02

'use client'

Create components/ui/UserSidebar.tsx as a Client Component.

Same nav items and active-state logic as BottomNav (extract to a shared constant
NAV_ITEMS in a separate file components/ui/nav-items.ts if preferred, or inline).

Render as:
<nav aria-label="Main navigation"
  className="hidden md:flex flex-col w-56 lg:w-64 shrink-0 border-r border-border
  bg-background min-h-screen">
  {/* TaxiFlow logo at top */}
  <div className="flex items-center gap-2 px-4 py-5 border-b border-border">
    <Link href="/dashboard" className="text-lg font-bold tracking-tight">
      <span className="text-primary">Taxi</span>
      <span className="text-foreground">Flow</span>
    </Link>
  </div>
  {/* Nav items */}
  <div className="flex flex-col gap-1 p-3 flex-1">
    {/* one <Link> per item */}
  </div>
</nav>

Each nav Link in the sidebar:
  - className: flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium
  - Active: bg-primary/10 text-primary
  - Inactive: text-muted-foreground hover:bg-muted hover:text-foreground transition-colors
  - Icon: size={18} strokeWidth={1.75}
  - Label: {item.label}

─────────────────────────────────────────────────────────────────────
TASK 9: Build InstallPrompt — components/ui/InstallPrompt.tsx
─────────────────────────────────────────────────────────────────────

// NFR-CO-01, NFR-CO-03

'use client'

Create components/ui/InstallPrompt.tsx as a Client Component.

This component listens for the browser's `beforeinstallprompt` event and renders
a dismissible banner when the app can be installed.

State: deferredPrompt (BeforeInstallPromptEvent | null), dismissed (boolean)

The BeforeInstallPromptEvent is not in standard TypeScript DOM types.
Declare the interface at the top of the file:

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

useEffect: listen for "beforeinstallprompt", store event in state, prevent default.
Also listen for "appinstalled" to hide the banner after successful install.

Render nothing if dismissed === true or deferredPrompt === null.

When visible, render a fixed bottom-center banner (above the BottomNav — use
bottom-20 md:bottom-4 z-50):

<div role="banner" aria-live="polite"
  className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-50
  flex items-center gap-3 rounded-xl border border-border bg-background
  px-4 py-3 shadow-lg text-sm max-w-xs w-full mx-4">
  <span className="flex-1 text-foreground font-medium">
    Install TaxiFlow for the best experience
  </span>
  <button onClick={handleInstall}
    className="shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold
    text-primary-foreground hover:bg-primary/90 transition-colors">
    Install
  </button>
  <button onClick={() => setDismissed(true)} aria-label="Dismiss"
    className="shrink-0 text-muted-foreground hover:text-foreground transition-colors">
    <X size={16} />  {/* import X from lucide-react */}
  </button>
</div>

handleInstall: call deferredPrompt.prompt(), await userChoice, set deferredPrompt
to null regardless of outcome.

─────────────────────────────────────────────────────────────────────
TASK 10: Build the (user) layout shell — app/(user)/layout.tsx
─────────────────────────────────────────────────────────────────────

// FR-UD-01, FR-AU-05

Replace (or create) app/(user)/layout.tsx as a Server Component.

This layout:
  1. Calls createClient() from @/lib/supabase/server and fetches the user.
  2. Redirects to /auth/login if no user (belt-and-suspenders — proxy.ts already does this,
     but the layout provides a fallback for any missed routes).
  3. Renders the shell: sidebar on md+, BottomNav on mobile, InstallPrompt always.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import UserSidebar from "@/components/ui/UserSidebar";
import BottomNav from "@/components/ui/BottomNav";
import InstallPrompt from "@/components/ui/InstallPrompt";

export default async function UserLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <div className="flex min-h-screen bg-background">
      <UserSidebar />
      <main className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {children}
      </main>
      <BottomNav />
      <InstallPrompt />
    </div>
  );
}

─────────────────────────────────────────────────────────────────────
TASK 11: Rebuild the dashboard page — app/(user)/dashboard/page.tsx
─────────────────────────────────────────────────────────────────────

// FR-UD-03, FR-UD-04, FR-UD-05

Replace app/(user)/dashboard/page.tsx entirely. It is a Server Component.

Fetch profile (full_name, role) from the profiles table.

The page renders:
  1. Page header:
     <div className="border-b border-border px-4 sm:px-6 py-4">
       <Heading level={1} className="text-xl sm:text-2xl">
         Good {timeOfDay}, {profile?.full_name ?? "there"}
       </Heading>
       <p className="text-muted-foreground text-sm mt-0.5">{user.email}</p>
     </div>

  2. Quick-action cards grid — 4 cards in grid-cols-2 sm:grid-cols-4 gap-4 px-4 sm:px-6 py-6:

     Each card is a <Link href={item.href}> wrapping a <Card>/<CardContent>:
       - Icon (32×32, text-primary) from Lucide: Search, MapPin, MessageCircle, Clock
       - Heading level={3} className="text-sm font-semibold mt-3"
       - Description: text-muted-foreground text-xs

     Quick actions:
       Route Search  → /route-search  → Search icon     → "Find routes and fares"
       Terminals     → /terminals     → MapPin icon      → "Nearest taxi terminal"
       AI Chat       → /chat          → MessageCircle icon → "Ask our AI assistant"
       My Trips      → /trip          → Clock icon       → "View your trip history"

     Card classes: h-full p-4 hover:shadow-md hover:border-primary/30 transition-all
     cursor-pointer

  3. Recent activity section (static for now — real data in Phase 6):
     <section className="px-4 sm:px-6 pb-8">
       <Heading level={2} className="text-base font-semibold mb-4">Recent Activity</Heading>
       <p className="text-muted-foreground text-sm">
         Your trips and activity will appear here.
       </p>
     </section>

timeOfDay helper (server-side, no use client needed):
  const hour = new Date().getHours();
  const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

Import Heading from "@/components/ui/Heading", Card/CardContent from "@/components/ui/card",
Link from "next/link", createClient from "@/lib/supabase/server", redirect from "next/navigation".
Import icons: Search, MapPin, MessageCircle, Clock from "lucide-react".

─────────────────────────────────────────────────────────────────────
TASK 12: Create route stubs with loading skeletons
─────────────────────────────────────────────────────────────────────

// FR-UD-06, FR-UD-07

Create the following files. Each page.tsx is a Server Component placeholder.
Each loading.tsx is a Skeleton that renders while the page fetches data.

──────────────────────────────────────────
12a. app/(user)/route-search/page.tsx
──────────────────────────────────────────

// FR-RS-01 (stub — full implementation Phase 4)
import Heading from "@/components/ui/Heading";
import Container from "@/components/ui/Container";

export default function RouteSearchPage() {
  return (
    <Container className="py-6">
      <Heading level={1} className="text-xl sm:text-2xl mb-2">Route Search</Heading>
      <p className="text-muted-foreground text-sm">
        Search for routes between terminals — coming in Phase 4.
      </p>
    </Container>
  );
}

──────────────────────────────────────────
12b. app/(user)/terminals/page.tsx
──────────────────────────────────────────

// FR-NT-01 (stub — full implementation Phase 4)
import Heading from "@/components/ui/Heading";
import Container from "@/components/ui/Container";

export default function TerminalsPage() {
  return (
    <Container className="py-6">
      <Heading level={1} className="text-xl sm:text-2xl mb-2">Terminals</Heading>
      <p className="text-muted-foreground text-sm">
        Find the nearest taxi terminal — coming in Phase 4.
      </p>
    </Container>
  );
}

──────────────────────────────────────────
12c. app/(user)/chat/page.tsx
──────────────────────────────────────────

// FR-AI-01 (stub — full implementation Phase 5)
import Heading from "@/components/ui/Heading";
import Container from "@/components/ui/Container";

export default function ChatPage() {
  return (
    <Container className="py-6">
      <Heading level={1} className="text-xl sm:text-2xl mb-2">AI Assistant</Heading>
      <p className="text-muted-foreground text-sm">
        Chat with our AI about routes and fares — coming in Phase 5.
      </p>
    </Container>
  );
}

──────────────────────────────────────────
12d. app/(user)/trip/page.tsx
──────────────────────────────────────────

// FR-TR-01 (stub — full implementation Phase 6)
import Heading from "@/components/ui/Heading";
import Container from "@/components/ui/Container";

export default function TripPage() {
  return (
    <Container className="py-6">
      <Heading level={1} className="text-xl sm:text-2xl mb-2">My Trips</Heading>
      <p className="text-muted-foreground text-sm">
        View your trip history and active trips — coming in Phase 6.
      </p>
    </Container>
  );
}

──────────────────────────────────────────
12e. app/(user)/profile/page.tsx
──────────────────────────────────────────

// FR-PS-01 (stub — full implementation Phase 9)
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Heading from "@/components/ui/Heading";
import Container from "@/components/ui/Container";
import { signout } from "@/app/auth/signout/actions";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  return (
    <Container className="py-6">
      <Heading level={1} className="text-xl sm:text-2xl mb-2">Profile</Heading>
      <div className="mt-4 space-y-1">
        <p className="font-medium text-foreground">{profile?.full_name ?? "—"}</p>
        <p className="text-muted-foreground text-sm">{user.email}</p>
        <p className="text-muted-foreground text-xs capitalize">{profile?.role}</p>
      </div>
      <form action={signout} className="mt-8">
        <button
          type="submit"
          className="rounded-md border border-border px-4 py-2 text-sm font-medium
          text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          Sign out
        </button>
      </form>
    </Container>
  );
}

──────────────────────────────────────────
12f. Skeleton loading states
──────────────────────────────────────────

Create a shared skeleton primitive (do NOT use a file named loading.tsx for this):

Create components/ui/PageSkeleton.tsx as a Server Component:

// NFR-US-04
import { cn } from "@/lib/utils";

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      aria-hidden="true"
    />
  );
}

export default function PageSkeleton() {
  return (
    <div className="px-4 sm:px-6 py-6 space-y-6" aria-label="Loading…" role="status">
      <SkeletonBlock className="h-7 w-48" />
      <SkeletonBlock className="h-4 w-64" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <SkeletonBlock className="h-5 w-32 mt-4" />
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-14 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

Now create loading.tsx files for each user route — each one just renders PageSkeleton:

app/(user)/dashboard/loading.tsx:
  // NFR-US-04
  import PageSkeleton from "@/components/ui/PageSkeleton";
  export default function DashboardLoading() { return <PageSkeleton />; }

app/(user)/route-search/loading.tsx:
  // NFR-US-04
  import PageSkeleton from "@/components/ui/PageSkeleton";
  export default function RouteSearchLoading() { return <PageSkeleton />; }

app/(user)/terminals/loading.tsx:
  // NFR-US-04
  import PageSkeleton from "@/components/ui/PageSkeleton";
  export default function TerminalsLoading() { return <PageSkeleton />; }

app/(user)/chat/loading.tsx:
  // NFR-US-04
  import PageSkeleton from "@/components/ui/PageSkeleton";
  export default function ChatLoading() { return <PageSkeleton />; }

app/(user)/trip/loading.tsx:
  // NFR-US-04
  import PageSkeleton from "@/components/ui/PageSkeleton";
  export default function TripLoading() { return <PageSkeleton />; }

app/(user)/profile/loading.tsx:
  // NFR-US-04
  import PageSkeleton from "@/components/ui/PageSkeleton";
  export default function ProfileLoading() { return <PageSkeleton />; }

─────────────────────────────────────────────────────────────────────
TASK 13: Add smoke tests for user routes — tests/user-shell.test.ts
─────────────────────────────────────────────────────────────────────

Create tests/user-shell.test.ts:

import { describe, it, expect } from "vitest";

describe("user shell component imports", () => {
  it("BottomNav is importable", async () => {
    const mod = await import("@/components/ui/BottomNav");
    expect(mod.default).toBeDefined();
  });

  it("UserSidebar is importable", async () => {
    const mod = await import("@/components/ui/UserSidebar");
    expect(mod.default).toBeDefined();
  });

  it("InstallPrompt is importable", async () => {
    const mod = await import("@/components/ui/InstallPrompt");
    expect(mod.default).toBeDefined();
  });

  it("PageSkeleton is importable", async () => {
    const mod = await import("@/components/ui/PageSkeleton");
    expect(mod.default).toBeDefined();
  });
});

─────────────────────────────────────────────────────────────────────
TASK 14: Run verification
─────────────────────────────────────────────────────────────────────

pnpm type-check   # must pass (0 errors)
pnpm lint         # must pass
pnpm test         # must pass (all tests including user-shell)
pnpm build        # must pass

After build, verify the service worker is emitted:
  Check that public/sw.js exists.

─────────────────────────────────────────────────────────────────────
CONSTRAINTS
─────────────────────────────────────────────────────────────────────

- Do NOT create tailwind.config.ts or tailwind.config.js.
- Do NOT import Fluent UI anywhere.
- BottomNav and UserSidebar MUST be 'use client' (they call usePathname).
- (user)/layout.tsx MUST be a Server Component (auth check needs server context).
- InstallPrompt MUST be 'use client' (uses browser events).
- app/sw.ts MUST be excluded from tsconfig.json include/compilation.
- proxy.ts uses the named export `proxy`, not `middleware`.
- TypeScript strict mode. No `any`.
- Every new file must have // FR-XX-XX or // NFR-XX-XX at the top.
- Stage all changes but do NOT commit.
```

---

### Task 3 — Manual visual QA

```bash
pnpm dev
```

Sign in as `alice@taxiflow.test / User1234!` then open http://localhost:3000/dashboard and check:

**Mobile (375px DevTools):**
- [ ] Bottom nav visible with 5 tabs: Home, Routes, Terminals, Chat, Profile
- [ ] Active tab (Home) highlighted in `text-primary` on dashboard
- [ ] Switching tabs changes active highlight, navigates correctly
- [ ] Dashboard: greeting + 4 quick-action cards in 2-column grid
- [ ] Cards are tappable (navigate to correct stub routes)
- [ ] No horizontal overflow at 375px
- [ ] Sidebar is hidden
- [ ] InstallPrompt banner may appear (only if Chrome triggers beforeinstallprompt)

**Tablet (768px DevTools):**
- [ ] Sidebar visible on left
- [ ] Bottom nav hidden
- [ ] Main content takes remaining width

**Desktop (1280px):**
- [ ] Sidebar wider (w-64)
- [ ] Quick-action cards in 4-column grid
- [ ] All nav links navigate without full page reload

**All viewports:**
- [ ] Unauthenticated visit to /dashboard → redirect to /auth/login
- [ ] After sign-out (from Profile page) → redirect to landing or login
- [ ] Loading skeleton appears briefly on initial route navigation
- [ ] Each stub page shows its placeholder text

---

### Task 4 — Lighthouse PWA audit

```bash
pnpm build && pnpm start
```

Open http://localhost:3000 in Chrome, run Lighthouse → PWA audit.
The service worker is disabled in development (`disable: process.env.NODE_ENV === "development"`),
so you must test against the production build.

Required:
- [ ] "Installable" section: all checks pass
- [ ] Web App Manifest detected
- [ ] Service worker registered
- [ ] `start_url` responds with 200

> **Note:** The install prompt itself only fires on Chrome 73+ and requires HTTPS in production.
> On localhost it fires over HTTP. If Chrome does not show the banner during dev testing,
> verify the manifest is valid and the service worker is registered in DevTools → Application.

---

### Task 5 — Commit and open PR

```bash
git add next.config.ts tsconfig.json proxy.ts app/manifest.ts app/sw.ts
git add public/icons/icon-192.svg public/icons/icon-512.svg
git add app/(user)/layout.tsx
git add app/(user)/dashboard/page.tsx app/(user)/dashboard/loading.tsx
git add app/(user)/route-search/page.tsx app/(user)/route-search/loading.tsx
git add app/(user)/terminals/page.tsx app/(user)/terminals/loading.tsx
git add app/(user)/chat/page.tsx app/(user)/chat/loading.tsx
git add app/(user)/trip/page.tsx app/(user)/trip/loading.tsx
git add app/(user)/profile/page.tsx app/(user)/profile/loading.tsx
git add components/ui/BottomNav.tsx components/ui/UserSidebar.tsx
git add components/ui/InstallPrompt.tsx components/ui/PageSkeleton.tsx
git add tests/user-shell.test.ts
git add package.json pnpm-lock.yaml

git commit -m "phase-3: user PWA shell, bottom nav, dashboard, Serwist"

git push -u origin phase-03-user-pwa-shell

gh pr create \
  --title "phase-3: user PWA shell, bottom nav, dashboard, Serwist" \
  --body "$(cat <<'EOF'
## Summary
- proxy.ts: auth guard for all (user) routes — redirects to /auth/login if not authenticated
- app/(user)/layout.tsx: persistent shell with sidebar (md+) + bottom nav (mobile) + install prompt
- components/ui/BottomNav.tsx: 5-tab fixed bottom nav, active state via usePathname
- components/ui/UserSidebar.tsx: collapsible sidebar for md+ viewports
- components/ui/InstallPrompt.tsx: beforeinstallprompt banner with dismiss
- app/(user)/dashboard/page.tsx: rebuilt home with greeting + 4 quick-action cards
- Route stubs: route-search, terminals, chat, trip, profile — each with loading.tsx skeleton
- components/ui/PageSkeleton.tsx: reusable animated skeleton for all loading states
- Serwist: @serwist/next configured, service worker precaches, manifest.ts registered
- FR-UD-01..07 implemented; NFR-CO-01, NFR-CO-03 met

## Test plan
- [ ] pnpm type-check passes
- [ ] pnpm lint passes
- [ ] pnpm test passes (user-shell import tests)
- [ ] pnpm build passes, public/sw.js emitted
- [ ] CI green
- [ ] Unauthenticated /dashboard → redirects to /auth/login
- [ ] BottomNav active state correct on all 5 routes
- [ ] Sidebar visible md+, hidden on mobile
- [ ] Install prompt appears in Chrome on localhost
- [ ] Lighthouse PWA audit: Installable + Optimized
EOF
)"
```

---

## 3.4 Acceptance script

```bash
pnpm type-check          # 0 errors
pnpm lint                # 0 warnings/errors
pnpm test                # all pass
pnpm build               # exits 0
ls public/sw.js          # service worker emitted
gh run list --limit 1    # "completed success"

# Manual:
# - Sign in, visit /dashboard → shell renders with nav
# - Visit /route-search, /terminals, /chat, /trip, /profile → nav active state correct
# - Resize to 375px → bottom nav visible, sidebar hidden
# - Resize to 768px → sidebar visible, bottom nav hidden
# - Lighthouse PWA audit (production build): Installable ✓
# - Unauthenticated /dashboard → redirect to /auth/login
```

**All pass = Phase 3 complete.**

---

## 3.5 Common failure modes

**`proxy` export not recognized — routes not protected.**
In Next.js 16, the file must be `proxy.ts` (not `middleware.ts`) at the project root.
The function must be exported as `export function proxy` or `export default function proxy`.
Check the matcher config — the paths must match the actual route segments (no leading `/(user)/`
because that's a route group, not a URL segment).

**`app/sw.ts` causes TypeScript errors (`ServiceWorkerGlobalScope is not defined`).**
The service worker uses globals from `webworker` lib. Exclude it from the main build by
adding `"app/sw.ts"` to the `exclude` array in `tsconfig.json`. Serwist compiles it
separately during `next build`.

**`withSerwist` import fails at build time.**
If `@serwist/next` is a CommonJS module and Next.js uses ESM imports in `next.config.ts`,
you may need to use `const { default: withSerwist } = await import("@serwist/next")` or
check the package's export map. Alternatively, rename `next.config.ts` → `next.config.mjs`
and use `import withSerwist from "@serwist/next"`.

**`ERR_PNPM_IGNORED_BUILDS` on `pnpm add @serwist/next serwist`.**
pnpm 11 blocks build scripts by default. Add `"@serwist/next"` and/or `"serwist"` to
the `"onlyBuiltDependencies"` array in `package.json`'s `"pnpm"` field:
```json
"pnpm": {
  "onlyBuiltDependencies": ["msw", "@serwist/next", "serwist"]
}
```

**BottomNav or UserSidebar causes hydration mismatch.**
Both components are `'use client'` and call `usePathname()`. If you see hydration errors,
check that the layout server component imports them correctly and does not pass server-only
props (like the Supabase user object) into them. The nav components should only receive
static config, not server data.

**`public/sw.js` not emitted after `pnpm build`.**
Serwist is disabled in development (`disable: process.env.NODE_ENV === "development"`).
Run `pnpm build` to generate `public/sw.js`. Check the build output for Serwist-related
messages. If `swSrc: "app/sw.ts"` is not found, verify the file exists and the path is
relative to the project root.

**Lighthouse shows "Service worker does not control page and `start_url`".**
The service worker is served from `/sw.js`. The manifest `start_url` is `/dashboard`.
Make sure the service worker's scope covers `/dashboard`. Serwist registers with a `/`
scope by default — this should cover all paths. Test in Chrome DevTools → Application
→ Service Workers to confirm registration.

**`(user)/layout.tsx` auth check causes redirect loop.**
The proxy.ts already redirects unauthenticated users. The layout's redirect is a
belt-and-suspenders fallback. If you see a redirect loop, check that the proxy.ts matcher
does not include `/auth/*` paths.

---

## 3.6 What's NOT in Phase 3

- ❌ Actual route search or map (Phase 4)
- ❌ Gemini AI chat (Phase 5)
- ❌ Trip tracking or share links (Phase 6)
- ❌ Stripe payments (Phase 7)
- ❌ Admin dashboard (Phase 8)
- ❌ Full profile editing — avatar upload, name change (Phase 9)
- ❌ Dark mode toggle UI in the shell (Phase 10, currently auto via prefers-color-scheme)
- ❌ iOS "Add to Home Screen" UX improvements (Phase 10)
- ❌ Push notifications (not in scope for v1.0)

---

## 3.7 When you're done

Reply with:
1. Confirmation that all acceptance checks passed (or deviations and why).
2. The PR URL.
3. Any changes made vs. the spec and why.
4. A description of the dashboard at 375px and 768px — what the nav looks like
   and whether the install prompt appeared in Chrome.

I'll then write `PHASE-04-maps-routing-search.md`.
