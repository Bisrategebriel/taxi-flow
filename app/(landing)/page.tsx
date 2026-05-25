// FR-LP-01..10
import { Suspense } from "react";
import Link from "next/link";
import Container from "@/components/ui/Container";
import { Card, CardContent } from "@/components/ui/Card";
import { buttonVariants } from "@/components/ui/Button";
import ThemeToggle from "@/components/ui/ThemeToggle";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

// ── Settings helper ───────────────────────────────────────────────────────────

async function getLandingSettings() {
  try {
    const service = createServiceClient();
    const { data } = await service
      .from("system_settings")
      .select("key, value")
      .in("key", [
        "landing_hero_headline",
        "landing_hero_subtitle",
        "landing_cta_text",
        "landing_show_features",
        "landing_show_how_it_works",
        "landing_contact_phone",
        "landing_contact_address",
      ]);
    const map: Record<string, unknown> = {};
    for (const row of data ?? []) map[row.key] = row.value;
    return map;
  } catch {
    return {};
  }
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconMapPin() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2C8.686 2 6 4.686 6 8c0 5.25 6 14 6 14s6-8.75 6-14c0-3.314-2.686-6-6-6z" />
      <circle cx="12" cy="8" r="2" />
    </svg>
  );
}

function IconRoute() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="6" cy="19" r="3" /><circle cx="18" cy="5" r="3" />
      <path d="M12 19h4.5a3.5 3.5 0 0 0 0-7h-8a3.5 3.5 0 0 1 0-7H12" />
    </svg>
  );
}

function IconRadar() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 2a10 10 0 1 0 10 10" /><path d="M12 12 4.93 4.93" />
      <path d="M12 12h6" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconSparkles() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  );
}

function IconShield() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconWallet() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" /><path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}

function IconArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

// ── Taxi / terminal photo placeholders ───────────────────────────────────────
// Replace the inner <div> with <Image src="..." fill className="object-cover" alt="..." />
// once you add photos to /public/images/. The overlay and caption stay as-is.

function PhotoCard({
  icon,
  title,
  subtitle,
  accentFrom,
  accentTo,
  filename,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  accentFrom: string;
  accentTo: string;
  filename: string;
}) {
  return (
    <div className="group relative aspect-[16/10] overflow-hidden rounded-2xl border border-border/60 transition-all duration-300 hover:border-primary/40 hover:shadow-[0_0_24px_oklch(0.65_0.12_242/0.16)]">
      {/* ↓ swap this div for <Image> once photos are available */}
      <div
        className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
        style={{ background: `linear-gradient(135deg, ${accentFrom}, ${accentTo})` }}
        aria-hidden="true"
      >
        {/* Subtle inner grid */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.07) 1px, transparent 1px)
            `,
            backgroundSize: "28px 28px",
          }}
        />
        {/* Placeholder icon */}
        <div className="flex h-full items-center justify-center text-white/20">
          <div className="flex flex-col items-center gap-2">
            <div className="scale-[2.5]">{icon}</div>
            <span className="mt-4 text-xs font-mono text-white/30">{filename}</span>
          </div>
        </div>
      </div>

      {/* Caption overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-5">
        <p className="font-semibold text-white">{title}</p>
        <p className="mt-0.5 text-sm text-white/70">{subtitle}</p>
      </div>
    </div>
  );
}

// ── Feature card ──────────────────────────────────────────────────────────────

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <Card className="group relative overflow-hidden border-border/60 bg-card/60 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:bg-card hover:shadow-[0_0_28px_oklch(0.65_0.12_242/0.14)]">
      <CardContent className="p-6">
        <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/60 bg-muted text-primary">
          {icon}
        </div>
        <h3 className="mb-2 font-semibold text-foreground">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const ls = await getLandingSettings();

  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.role === "admin" || profile?.role === "super_admin";
  }

  const str = (key: string, fallback: string) =>
    typeof ls[key] === "string" ? (ls[key] as string) : fallback;
  const bool = (key: string, fallback = true) =>
    typeof ls[key] === "boolean" ? (ls[key] as boolean) : fallback;

  const heroHeadline = str("landing_hero_headline", "Navigate the city with confidence");
  const heroSubtitle = str(
    "landing_hero_subtitle",
    "TaxiFlow maps Addis Ababa's shared taxi network. Search routes, check live fares, share your trip, and pay — all from one app."
  );
  const ctaText = str("landing_cta_text", "Get Started — It's Free");
  const showFeatures = bool("landing_show_features");
  const showHowItWorks = bool("landing_show_how_it_works");

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">

      {/* ── Nav (FR-LP-01) ────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-sm">
        <Container maxWidth="2xl">
          <div className="flex h-14 items-center justify-between">
            <Link href="/" className="flex items-center gap-1.5 font-bold text-lg">
              <span className="text-primary">Taxi</span><span className="text-foreground">Flow</span>
            </Link>

            <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
              {[["#features", "Features"], ["#how-it-works", "How It Works"], ["#about", "About"]].map(([href, label]) => (
                <a key={href} href={href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                  {label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-2">
              <Suspense fallback={null}>
                <ThemeToggle />
              </Suspense>
              {user ? (
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <Link href="/admin/dashboard" className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}>
                      Admin Dashboard <IconArrowRight />
                    </Link>
                  )}
                  <Link href="/dashboard" className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>
                    Dashboard <IconArrowRight />
                  </Link>
                </div>
              ) : (
                <>
                  <Link href="/auth/login" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                    Sign In
                  </Link>
                  <Link href="/auth/register" className={cn(buttonVariants({ size: "sm" }), "gap-1.5")}>
                    Get Started <IconArrowRight />
                  </Link>
                </>
              )}
            </div>
          </div>
        </Container>
      </header>

      {/* ── Hero (FR-LP-02) — two-column, headline left · route card right ── */}
      <section id="hero" className="relative overflow-hidden py-20 md:py-28">

        {/* Grid background */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(var(--grid-line-color) 1px, transparent 1px),
              linear-gradient(90deg, var(--grid-line-color) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
            maskImage: "radial-gradient(ellipse 90% 90% at 50% 50%, black 40%, transparent 100%)",
          }}
          aria-hidden="true"
        />

        {/* Blue glow orb — sits between the two columns */}
        <div
          className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2"
          style={{
            width: "900px",
            height: "500px",
            background: "radial-gradient(ellipse at 50% 10%, oklch(0.65 0.12 242 / 0.18), transparent 65%)",
          }}
          aria-hidden="true"
        />

        {/* Animated grid beams — horizontal */}
        {([
          { left: 40,   top: 80,  dur: "4.2s", delay: "0s"   },
          { left: 280,  top: 200, dur: "3.6s", delay: "1.5s" },
          { left: 560,  top: 120, dur: "5.1s", delay: "2.8s" },
          { left: 920,  top: 320, dur: "3.9s", delay: "0.7s" },
          { left: 1160, top: 400, dur: "4.7s", delay: "3.4s" },
        ] as const).map((b, i) => (
          <div
            key={`bh-${i}`}
            className="pointer-events-none absolute h-px w-20"
            style={{
              left: b.left,
              top: b.top,
              background: "linear-gradient(90deg, transparent, oklch(0.65 0.12 242 / 0.7), transparent)",
              boxShadow: "0 0 6px 2px oklch(0.65 0.12 242 / 0.22)",
              animation: `beam-right ${b.dur} linear ${b.delay} infinite`,
            }}
            aria-hidden="true"
          />
        ))}

        {/* Animated grid beams — vertical */}
        {([
          { left: 160, top: 40,  dur: "3.4s", delay: "0.4s" },
          { left: 320, top: 120, dur: "4.6s", delay: "2.2s" },
          { left: 600, top: 80,  dur: "3.8s", delay: "1.1s" },
          { left: 840, top: 40,  dur: "5.0s", delay: "3.7s" },
        ] as const).map((b, i) => (
          <div
            key={`bv-${i}`}
            className="pointer-events-none absolute w-px h-20"
            style={{
              left: b.left,
              top: b.top,
              background: "linear-gradient(180deg, transparent, oklch(0.65 0.12 242 / 0.7), transparent)",
              boxShadow: "0 0 6px 2px oklch(0.65 0.12 242 / 0.22)",
              animation: `beam-down ${b.dur} linear ${b.delay} infinite`,
            }}
            aria-hidden="true"
          />
        ))}

        <Container maxWidth="2xl" className="relative z-10">
          <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-center lg:justify-between">

            {/* ── Left: headline + CTAs ────────────────────────────────── */}
            <div className="flex-1 max-w-xl">
              {/* Badge */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
                </span>
                Now live in Addis Ababa
              </div>

              <h1 className="text-5xl font-bold leading-tight tracking-tight md:text-6xl">
                {heroHeadline}
              </h1>

              <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
                {heroSubtitle}
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link href="/auth/register" className={cn(buttonVariants({ size: "lg" }), "gap-2 px-8 transition-shadow duration-300 hover:shadow-[0_0_22px_oklch(0.65_0.12_242/0.45)]")}>
                  {ctaText} <IconArrowRight />
                </Link>
                <Link href="/auth/login" className={cn(buttonVariants({ variant: "outline", size: "lg" }), "px-8")}>
                  Sign In
                </Link>
              </div>

              <p className="mt-5 text-sm text-muted-foreground">
                Free for commuters &nbsp;·&nbsp; No credit card required
              </p>
            </div>

            {/* ── Right: route preview card ────────────────────────────── */}
            <div className="w-full max-w-sm flex-shrink-0 lg:max-w-xs xl:max-w-sm">
              <Card className="border-border/60 bg-card/70 backdrop-blur-sm transition-all duration-300 hover:border-primary/50 hover:shadow-[0_0_28px_oklch(0.65_0.12_242/0.2)]" aria-label="Route preview example">
                <CardContent className="p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Live Route</span>
                    <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                      Active
                    </span>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex flex-col items-center">
                      <span className="h-3 w-3 rounded-full border-2 border-primary bg-primary/20" />
                      <span className="my-1 h-10 w-px bg-border" />
                      <span className="h-3 w-3 rounded-full border-2 border-emerald-400 bg-emerald-400/20" />
                    </div>
                    <div className="flex-1 space-y-5">
                      <div>
                        <p className="text-sm font-medium text-foreground">Merkato Terminal</p>
                        <p className="text-xs text-muted-foreground">Starting point</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">Megenagna Terminal</p>
                        <p className="text-xs text-muted-foreground">Destination</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-4">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>10.5 km</span>
                      <span>~ 45 min</span>
                    </div>
                    <span className="font-bold text-primary">60 ETB</span>
                  </div>
                </CardContent>
              </Card>

              {/* Secondary mini-card below */}
              <Card className="mt-3 border-border/60 bg-card/50 backdrop-blur-sm transition-all duration-300 hover:border-primary/40 hover:shadow-[0_0_18px_oklch(0.65_0.12_242/0.15)]">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Next Station</p>
                    <p className="text-sm font-medium text-foreground">In 3 minutes</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Stations Until Destination</p>
                    <p className="text-sm font-medium text-emerald-400">4 Stations</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </Container>
      </section>

      {/* ── Trust strip ──────────────────────────────────────────────────────── */}
      <div className="border-y border-border/40 bg-muted/20 py-6">
        <Container maxWidth="2xl">
          <div className="flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-12">
            {[
              { value: "5+", label: "Terminals mapped" },
              { value: "3+", label: "Active routes" },
              { value: "< 1s", label: "Fare lookup" },
              { value: "Real-time", label: "GPS tracking" },
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </Container>
      </div>

      {/* ── Photo showcase ────────────────────────────────────────────────────── */}
      {/*
          To use real photos:
          1. Add your images to /public/images/ (e.g. taxi.jpg, terminal.jpg)
          2. Replace the inner <div> inside each PhotoCard with:
               <Image src="/images/taxi.jpg" fill className="object-cover" alt="..." />
          3. Add import Image from "next/image" at the top of this file
      */}
      <section className="py-12">
        <Container maxWidth="2xl">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <PhotoCard
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 17H3a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11a2 2 0 0 1 2 2v3" />
                  <rect x="9" y="11" width="14" height="10" rx="2" />
                  <circle cx="12" cy="21" r="1" /><circle cx="20" cy="21" r="1" />
                </svg>
              }
              title="Addis Ababa Minibus Taxis"
              subtitle="The backbone of urban transit for millions of daily commuters"
              accentFrom="oklch(0.18 0.04 242)"
              accentTo="oklch(0.13 0.02 220)"
              filename="/public/images/taxi.jpg"
            />
            <PhotoCard
              icon={
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M16 7V5a2 2 0 0 0-4 0v2M8 21v-5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v5" />
                  <path d="M2 11h20" />
                </svg>
              }
              title="City Transit Terminals"
              subtitle="Key connection points linking every district across the city"
              accentFrom="oklch(0.18 0.03 180)"
              accentTo="oklch(0.13 0.01 240)"
              filename="/public/images/terminal.jpg"
            />
          </div>
        </Container>
      </section>

      {/* ── Features (FR-LP-03, FR-LP-04) ────────────────────────────────── */}
      {showFeatures && <section id="features" className="relative py-24">
        <Container maxWidth="2xl">
          <div className="mb-14 text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-primary">Features</p>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Everything you need in one app</h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Built for daily commuters navigating Addis Ababa&apos;s shared taxi network.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard icon={<IconRoute />} title="Route Search" description="Find the fastest route between any two terminals instantly. Live distance and fare info in ETB included." />
            <FeatureCard icon={<IconRadar />} title="Live Tracking" description="Start a trip and share a tracking link. Friends and family see your real-time position every 5 seconds." />
            <FeatureCard icon={<IconSparkles />} title="AI Assistant" description="Ask about routes, fares, and terminals in plain language. Get answers instantly in Amharic or English." />
            <FeatureCard icon={<IconWallet />} title="Digital Payments" description="Pay after you arrive. Secure checkout in ETB takes under 10 seconds — no cash required." />
            <FeatureCard icon={<IconMapPin />} title="Terminal Map" description="Browse all terminals on an interactive map. See which routes connect them and estimated wait times." />
            <FeatureCard icon={<IconShield />} title="Trip History" description="Every trip is logged automatically. Review your routes, fares, and travel time anytime." />
          </div>
        </Container>
      </section>}

      {/* ── How it works (FR-LP-05, FR-LP-06) ────────────────────────────── */}
      {showHowItWorks && <section id="how-it-works" className="border-y border-border/40 bg-muted/20 py-24">
        <Container maxWidth="2xl">
          <div className="mb-14 text-center">
            <p className="mb-3 text-sm font-medium uppercase tracking-widest text-primary">How It Works</p>
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl">From search to destination</h2>
          </div>

          <div className="relative grid grid-cols-1 gap-8 md:grid-cols-3">
            <div className="pointer-events-none absolute left-0 right-0 top-8 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block" aria-hidden="true" />

            {[
              { step: "01", title: "Search your route", description: "Enter your starting terminal and destination. Get instant route options, live distance, and fare estimates in ETB." },
              { step: "02", title: "Board and go", description: "Tap Start Trip when you board. Share a live-tracking link with anyone who wants to follow your journey." },
              { step: "03", title: "Arrive and pay", description: "End your trip at the destination. Pay digitally in ETB in under 10 seconds and keep your full trip history." },
            ].map(({ step, title, description }) => (
              <div key={step} className="relative flex flex-col items-center text-center md:items-start md:text-left">
                <div className="relative z-10 mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-primary/40 bg-background text-sm font-bold text-primary transition-all duration-300 hover:border-primary/70 hover:shadow-[0_0_18px_oklch(0.65_0.12_242/0.4)]">
                  {step}
                </div>
                <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>}

      {/* ── About / stats (FR-LP-07, FR-LP-08) ───────────────────────────── */}
      <section id="about" className="py-24">
        <Container maxWidth="2xl">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
            <div>
              <p className="mb-3 text-sm font-medium uppercase tracking-widest text-primary">About</p>
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
                Built for Addis Ababa&apos;s{" "}
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: "linear-gradient(135deg, oklch(0.65 0.12 242), oklch(0.75 0.1 200))" }}
                >
                  daily commuters
                </span>
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                TaxiFlow maps the city&apos;s shared minibus taxi network — one of the world&apos;s
                largest informal transit systems. We&apos;re helping commuters find routes, share their
                journey, and pay digitally. Starting with the core terminals and expanding with the community.
              </p>
              <div className="mt-8">
                <Link href="/auth/register" className={cn(buttonVariants({ size: "lg" }), "gap-2")}>
                  Join the Beta <IconArrowRight />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { value: "5", label: "Terminals", sub: "Key districts across Addis Ababa" },
                { value: "3", label: "Routes", sub: "More added as the network grows" },
                { value: "GPS", label: "Real-time", sub: "Accurate to within metres" },
                { value: "Free", label: "For commuters", sub: "No subscription needed" },
              ].map(({ value, label, sub }) => (
                <Card key={label} className="border-border/60 bg-card/60 transition-all duration-300 hover:border-primary/40 hover:shadow-[0_0_22px_oklch(0.65_0.12_242/0.14)]">
                  <CardContent className="p-5">
                    <p className="text-2xl font-bold text-primary">{value}</p>
                    <p className="text-sm font-semibold text-foreground">{label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </Container>
      </section>

      {/* ── CTA banner ───────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden py-24">
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            width: "600px",
            height: "300px",
            background: "radial-gradient(ellipse at center, oklch(0.65 0.12 242 / 0.15), transparent 70%)",
          }}
          aria-hidden="true"
        />
        <Container maxWidth="lg" className="relative z-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">Ready to navigate smarter?</h2>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">
            Join the beta and help us shape the future of urban transit in Addis Ababa.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/auth/register" className={cn(buttonVariants({ size: "lg" }), "gap-2 px-10 transition-shadow duration-300 hover:shadow-[0_0_22px_oklch(0.65_0.12_242/0.45)]")}>
              Get Started Free <IconArrowRight />
            </Link>
            <Link href="/auth/login" className={buttonVariants({ variant: "outline", size: "lg" })}>
              Sign In
            </Link>
          </div>
        </Container>
      </section>

      {/* ── Footer (FR-LP-09, FR-LP-10) ──────────────────────────────────── */}
      <footer className="border-t border-border/60 py-10">
        <Container maxWidth="2xl">
          <div className="flex flex-col gap-8 md:flex-row md:justify-between">
            <div>
              <Link href="/" className="text-lg font-bold">
                <span className="text-primary">Taxi</span>
                <span className="text-foreground">Flow</span>
              </Link>
              <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                Navigate Addis Ababa with confidence.
              </p>
            </div>

            <div className="flex gap-12">
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">Product</p>
                <ul className="space-y-2">
                  {[["Route Search", "/auth/register"], ["Terminals", "/auth/register"], ["Live Tracking", "/auth/register"], ["AI Chat", "/auth/register"]].map(([label, href]) => (
                    <li key={label}>
                      <Link href={href as string} className="text-sm text-muted-foreground transition-colors hover:text-foreground">{label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-foreground">Account</p>
                <ul className="space-y-2">
                  {[["Sign In", "/auth/login"], ["Register", "/auth/register"], ["Reset Password", "/auth/reset-password"]].map(([label, href]) => (
                    <li key={label}>
                      <Link href={href as string} className="text-sm text-muted-foreground transition-colors hover:text-foreground">{label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col items-start justify-between gap-2 border-t border-border/60 pt-8 sm:flex-row sm:items-center">
            <p className="text-sm text-muted-foreground">© 2026 TaxiFlow. All rights reserved.</p>
            <p className="text-sm text-muted-foreground">Addis Ababa, Ethiopia</p>
          </div>
        </Container>
      </footer>
    </div>
  );
}
