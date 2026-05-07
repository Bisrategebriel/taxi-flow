# Phase 2 — Design System + Landing Page

> **Status:** Ready to execute
> **Estimated time:** 3–4 hours
> **Branch:** `phase-02-design-system-and-landing-page`
> **Prerequisite:** Phase 1 PR merged to `main`, CI green

---

## 2.1 Goal

Wire shadcn/ui design tokens into the Tailwind 4 CSS layer, build five shared UI primitives, and ship the full public landing page for TaxiFlow. At the end of this phase:

- shadcn/ui is initialised with a custom TaxiFlow brand primary colour (`oklch(0.49 0.134 242)` ≈ `#0f6cbd`)
- Five shared primitives exist in `components/ui/` — all token-driven via Tailwind utility classes
- The public landing page at `/` is complete with Nav, Hero, Features, How It Works, About, and Footer sections
- All ten landing page requirements (FR-LP-01..10) are satisfied
- The page renders correctly at 320px and 1920px viewport widths
- Lighthouse accessibility score ≥ 95

**Covers:** SRS §3 (FR-LP-01..10), §12.1 (NFR-US-03 WCAG contrast)

> **Design system choice:** This phase uses **shadcn/ui** (Base UI + CVA + Tailwind 4 CSS variables).
> Fluent UI (`@fluentui/react-components`) has been removed from the project.
> There is no `tailwind.config.ts` — Tailwind 4 uses CSS-first configuration via `app/globals.css`.

---

## 2.2 Pre-flight check

```bash
# 1. Merge phase-01 PR to main first, then:
git checkout main
git pull origin main
git log --oneline -1    # should be the phase-01 merge commit

# 2. Confirm the build is clean on main
pnpm install
pnpm type-check         # must exit 0
pnpm build              # must exit 0

# 3. Local Supabase running (needed only for manual auth testing)
supabase status

# 4. Check .env.local has all required vars
cat .env.local
# Expected: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SITE_URL
```

---

## 2.3 Step-by-step tasks

---

### Task 1 — Create the phase branch

```bash
git checkout -b phase-02-design-system-and-landing-page
```

---

### Task 2 — Claude Code Prompt: Design system + landing page

Copy everything inside the fence and paste into Claude Code:

```
Read PLAN.md and docs/phases/PHASE-02-design-system-and-landing.md in full before doing anything.
Read node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md
and node_modules/next/dist/docs/01-app/01-getting-started/11-css.md before writing any code.

We are on branch phase-02-design-system-and-landing-page.

─────────────────────────────────────────────────────────────────────
IMPORTANT CONTEXT
─────────────────────────────────────────────────────────────────────

Tailwind 4 uses CSS-first configuration — there is no tailwind.config.ts in this project.
All theme extensions (custom tokens) go into app/globals.css via @theme inline blocks.
Do NOT create tailwind.config.ts or tailwind.config.js.

shadcn/ui is already initialised (components.json present, lib/utils.ts present).
Dependencies installed: @base-ui/react, class-variance-authority, clsx, tailwind-merge,
tw-animate-css, lucide-react. Do NOT run shadcn init again.

The root layout (app/layout.tsx) is a Server Component — no FluentProvider needed.
There is no FluentProviderWrapper. Do not create one.

The landing page lives at app/(landing)/page.tsx (route group — still serves URL /).
The current app/page.tsx is a Phase 0 placeholder — it must be deleted.

shadcn component files use lowercase names: button.tsx, card.tsx, input.tsx.
The existing hand-rolled components use uppercase: Container.tsx, Heading.tsx.
Keep uppercase for Container and Heading; shadcn-generated files stay lowercase.

─────────────────────────────────────────────────────────────────────
TASK 1: Set up app/globals.css with shadcn tokens + brand colour
─────────────────────────────────────────────────────────────────────

// NFR-US-03

Replace app/globals.css with:

@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

:root {
  --radius: 0.5rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.49 0.134 242);
  /* TaxiFlow brand — #0f6cbd */
  --primary: oklch(0.49 0.134 242);
  --primary-foreground: oklch(1 0 0);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.65 0.12 242);
  /* TaxiFlow brand dark — #479ef5 */
  --primary: oklch(0.65 0.12 242);
  --primary-foreground: oklch(0.145 0 0);
}

html { scroll-behavior: smooth; }

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-geist-sans, Arial, Helvetica, sans-serif);
}

─────────────────────────────────────────────────────────────────────
TASK 2: Create lib/utils.ts
─────────────────────────────────────────────────────────────────────

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

─────────────────────────────────────────────────────────────────────
TASK 3: Add shadcn components
─────────────────────────────────────────────────────────────────────

Run: pnpm dlx shadcn@latest add button card input --overwrite

This copies button.tsx, card.tsx, input.tsx into components/ui/ using @base-ui/react primitives.

─────────────────────────────────────────────────────────────────────
TASK 4: Build two hand-rolled primitives in components/ui/
─────────────────────────────────────────────────────────────────────

// NFR-US-03

4a. components/ui/Container.tsx — Server Component
  Props: children, className?, maxWidth?: 'sm'|'md'|'lg'|'xl'|'2xl'|'full' (default 'xl')
  Renders a <div> with: mx-auto px-4 sm:px-6 lg:px-8
  maxWidth maps to: sm=max-w-sm, md=max-w-2xl, lg=max-w-4xl, xl=max-w-6xl, 2xl=max-w-7xl, full=max-w-full
  Use cn() from @/lib/utils for class merging.

4b. components/ui/Heading.tsx — Server Component
  Props: level: 1|2|3|4|5|6, children, className?
  Renders <h1>–<h6> with Tailwind font-size utilities and text-foreground.
  Default classes per level:
    h1: text-4xl font-bold leading-tight tracking-tight text-foreground
    h2: text-3xl font-semibold leading-tight text-foreground
    h3: text-2xl font-semibold text-foreground
    h4: text-xl font-medium text-foreground
    h5: text-lg font-medium text-foreground
    h6: text-base font-medium text-foreground
  Use cn() for class merging.

─────────────────────────────────────────────────────────────────────
TASK 5: Build the landing page
─────────────────────────────────────────────────────────────────────

// FR-LP-01..10

Delete app/page.tsx (the Phase 0 placeholder).
Create app/(landing)/page.tsx as a Server Component.
Create app/(landing)/layout.tsx (minimal passthrough).

Imports to use:
  import Link from "next/link"
  import Container from "@/components/ui/Container"
  import Heading from "@/components/ui/Heading"
  import { Card, CardContent } from "@/components/ui/Card"
  import { buttonVariants } from "@/components/ui/Button"
  import { cn } from "@/lib/utils"

For all CTA buttons that navigate to a URL, use:
  <Link href="..." className={buttonVariants({ variant: "default", size: "lg" })}>Label</Link>
  <Link href="..." className={buttonVariants({ variant: "outline", size: "sm" })}>Label</Link>
  Do NOT use <Button href="..."> — @base-ui/react Button does not support href.

Token mapping (old Fluent → shadcn):
  text-foreground          (primary text)
  text-muted-foreground    (secondary text)
  bg-background            (page/card background)
  bg-muted                 (subtle section background)
  border-border            (dividers and card borders)
  text-primary             (brand blue)
  bg-primary               (brand blue fill)
  bg-primary/10            (brand tint)
  text-destructive         (error/danger)

──────────────────────────────────────────────
SECTION 1: Navigation header  (FR-LP-01)
──────────────────────────────────────────────
<header> sticky top-0 z-50 bg-background/95 backdrop-blur border-b border-border shadow-sm

Inside Container:
  Left: TaxiFlow logo — Link href="/" with "Taxi" in text-primary and "Flow" in text-foreground
  Right desktop: nav links to #features, #how-it-works, #about — text-muted-foreground hover:text-foreground
  Right always: Sign In (outline/sm) + Get Started (default/sm) — both as Link+buttonVariants
  Mobile: hide nav, show only the two buttons

──────────────────────────────────────────────
SECTION 2: Hero  (FR-LP-02)
──────────────────────────────────────────────
<section id="hero"> py-24 md:py-36 bg-gradient-to-b from-muted to-background

Left col:
  - Badge: bg-primary/10 text-primary rounded-full px-3 py-1 text-sm font-medium — "Built for Addis Ababa"
  - Heading level=1: "Your city's taxi network, at your fingertips"
  - Subheadline: text-muted-foreground text-lg mt-4 max-w-lg
  - CTAs: "Get Started — It's Free" (default/lg) + "Sign In" (outline/lg)
  - Trust line: text-muted-foreground text-sm

Right col: decorative route preview Card with CardContent showing:
  - Merkato Terminal → Megenagna Terminal
  - 8.5 km · 25 min, 2.50 USD
  - Start dot in text-primary, end dot in green-600

──────────────────────────────────────────────
SECTION 3: Features  (FR-LP-03, FR-LP-04)
──────────────────────────────────────────────
<section id="features"> py-20 bg-background

4 Cards in grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-12
Each: Card > CardContent with inline SVG icon (32×32, text-primary, currentColor stroke-based),
Heading level=3, description text-muted-foreground text-sm.

Icons (inline SVG, no external deps):
  Route Search: map-pin (path + circle)
  Live Tracking: crosshair/target (circle + cross lines)
  AI Assistant: chat bubble (path)
  Easy Payments: credit card (rect + line)

──────────────────────────────────────────────
SECTION 4: How It Works  (FR-LP-05, FR-LP-06)
──────────────────────────────────────────────
<section id="how-it-works"> py-20 bg-muted

3 steps in flex flex-col md:flex-row gap-8 items-start
Each step: numbered circle (bg-primary/10 text-primary w-10 h-10 rounded-full),
Heading level=3, text-muted-foreground description.

──────────────────────────────────────────────
SECTION 5: About  (FR-LP-07, FR-LP-08)
──────────────────────────────────────────────
<section id="about"> py-20 bg-background

Two-column grid md:grid-cols-2 gap-12:
  Left: 3 stat Cards (Card > CardContent): "5 Terminals", "3 Routes", "Real-time GPS"
  Right: Heading level=2, body text, "Join the Beta" CTA (default/lg)

──────────────────────────────────────────────
SECTION 6: Footer  (FR-LP-09, FR-LP-10)
──────────────────────────────────────────────
<footer> py-12 bg-muted border-t border-border

Top row md:flex justify-between:
  Brand: TaxiFlow logo Link + tagline text-muted-foreground
  Nav cols: Product (Route Search, Terminals, Live Tracking, AI Chat → /auth/register)
            Account (Sign In, Register, Reset Password)
Bottom row mt-8 pt-8 border-t border-border:
  "© 2026 TaxiFlow. All rights reserved." + "Addis Ababa, Ethiopia"

─────────────────────────────────────────────────────────────────────
TASK 6: Run verification
─────────────────────────────────────────────────────────────────────

pnpm type-check   # must pass (0 errors)
pnpm lint         # must pass
pnpm test         # must pass
pnpm build        # must pass — / must appear as ○ (Static)

─────────────────────────────────────────────────────────────────────
CONSTRAINTS
─────────────────────────────────────────────────────────────────────

- Do NOT create tailwind.config.ts or tailwind.config.js.
- Do NOT import Fluent UI anywhere.
- Do NOT re-run shadcn init.
- Import casing: shadcn files (button.tsx, card.tsx, input.tsx) are lowercase on disk.
  Use uppercase imports for our custom files (Container.tsx, Heading.tsx).
  To avoid TypeScript forceConsistentCasingInFileNames errors, keep imports consistent
  with the actual disk filename casing.
- Every new file must have // FR-LP-XX or // NFR-US-03 at the top.
- TypeScript strict mode. No `any`.
- Landing page is a Server Component (no 'use client' at top level).
- Do not touch supabase/, types/, lib/supabase/, or any auth pages.
- Stage all changes but do NOT commit.
```

---

### Task 3 — Manual visual QA

```bash
pnpm dev
```

Open http://localhost:3000 and check:

**Desktop (1280px+):**
- [ ] Header: logo, nav links, Sign In + Get Started buttons
- [ ] Hero: headline, subheadline, two CTAs, route preview card
- [ ] Features: 4 cards in a row with icons
- [ ] How It Works: 3 steps side-by-side
- [ ] About: stat cards + text + CTA
- [ ] Footer: brand, nav columns, copyright row
- [ ] Smooth scroll on nav links
- [ ] All CTAs navigate to `/auth/login` or `/auth/register`

**Mobile (375px):**
- [ ] Nav links hidden, only buttons visible
- [ ] Hero single column
- [ ] Features single column
- [ ] How It Works stacked vertically

**Narrow (320px):**
- [ ] No horizontal overflow
- [ ] Buttons don't clip

---

### Task 4 — Lighthouse accessibility check

Run Lighthouse (Accessibility only) against http://localhost:3000. Score must be **≥ 95**.

---

### Task 5 — Commit and open PR

```bash
git add app/globals.css lib/utils.ts components/ui/
git add "app/(landing)/page.tsx" "app/(landing)/layout.tsx"
git rm app/page.tsx
git add package.json pnpm-lock.yaml components.json

git commit -m "phase-2: shadcn/ui design system, UI primitives, landing page"

git push -u origin phase-02-design-system-and-landing-page

gh pr create \
  --title "phase-2: design system (shadcn) + landing page" \
  --body "$(cat <<'EOF'
## Summary
- shadcn/ui initialised with TaxiFlow brand primary (oklch(0.49 0.134 242) ≈ #0f6cbd)
- Fluent UI removed; no FluentProvider wrapper needed
- app/globals.css: shadcn CSS variables + @theme inline for Tailwind 4
- lib/utils.ts: cn() helper (clsx + tailwind-merge)
- components/ui/: button, card, input (shadcn); Container, Heading (hand-rolled)
- Full public landing page at / with 6 sections: Nav, Hero, Features, How It Works, About, Footer
- FR-LP-01..10 implemented; WCAG 2.1 AA contrast via shadcn neutral + brand tokens

## Test plan
- [ ] pnpm type-check passes
- [ ] pnpm lint passes
- [ ] pnpm test passes
- [ ] pnpm build passes — / is ○ (Static)
- [ ] CI green
- [ ] Landing page renders at 320px, 375px, 1280px, 1920px
- [ ] All CTAs route to /auth/login or /auth/register
- [ ] Smooth scroll nav
- [ ] Lighthouse a11y ≥ 95
EOF
)"
```

---

## 2.4 Acceptance script

```bash
pnpm type-check    # 0 errors
pnpm lint          # 0 warnings/errors
pnpm test          # all pass
pnpm build         # / is ○ (Static)
gh run list --limit 1    # "completed success"
# Manual: Lighthouse a11y ≥ 95, all CTAs work, responsive at 320px + 1920px
```

**All pass = Phase 2 complete.**

---

## 2.5 Common failure modes

**TypeScript `TS1261` — casing conflict on button.tsx / Button.tsx.**
shadcn writes lowercase files; our hand-rolled components are uppercase. On Windows
(case-insensitive filesystem) both refer to the same physical file. Fix: use the import
path that matches the actual file name on disk. Check `ls components/ui/` to confirm.

**`pnpm add` fails with `ERR_PNPM_IGNORED_BUILDS`.**
pnpm 11 blocks build scripts by default. The project's `package.json` already has
`"pnpm": { "onlyBuiltDependencies": ["msw"] }` to allow msw's postinstall. If a new
package also needs build scripts, add it to that list.

**Tailwind token classes don't apply.**
Confirm `app/globals.css` starts with `@import "tailwindcss"` and has the `@theme inline`
block that maps `--color-primary` etc. Run `pnpm build` and inspect the output CSS.

**`app/(landing)/layout.tsx` causes hydration mismatch.**
Must be a pure passthrough Server Component:
```tsx
export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

**`app/page.tsx` conflict.**
Both `app/page.tsx` and `app/(landing)/page.tsx` resolve to `/`. Delete `app/page.tsx`.

**Smooth scroll doesn't work.**
`html { scroll-behavior: smooth; }` must be in `app/globals.css`.

---

## 2.6 What's NOT in Phase 2

- ❌ Dark mode toggle UI (auto via `prefers-color-scheme` only; manual toggle is Phase 10)
- ❌ Bottom navigation or mobile app shell (Phase 3)
- ❌ PWA manifest or service worker (Phase 3)
- ❌ Any changes to auth pages (working from Phase 1)
- ❌ Leaflet maps or ORS integration (Phase 4)
- ❌ Gemini AI chat (Phase 5)
- ❌ Stripe (Phase 7)
- ❌ Admin dashboard (Phase 8)
- ❌ Actual route data on the landing page (hero card is decorative HTML)

---

## 2.7 When you're done

Reply with:
1. Confirmation that all acceptance checks passed (or deviations and why).
2. The PR URL.
3. Any changes made vs. the spec and why.
4. A description of the landing page at 375px and 1280px.

I'll then write `PHASE-03-user-pwa-shell.md`.
