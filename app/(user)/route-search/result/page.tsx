// FR-RS-03, FR-RS-04, FR-RS-05, FR-FI-01..03, FR-MP-01..05
import { Suspense } from "react";
import Link from "next/link";
import { MapPinOff, ArrowRight, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDirections } from "@/lib/ors/client";
import { buttonVariants } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import RouteMap from "@/components/map/RouteMap";
import SaveRecentSearch from "@/app/(user)/route-search/result/_components/SaveRecentSearch";

interface PageProps {
  searchParams: Promise<{ from?: string; to?: string }>;
}

export default async function RouteResultPage({ searchParams }: PageProps) {
  const { from: fromId, to: toId } = await searchParams;

  // Missing params — redirect back
  if (!fromId || !toId) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <p className="text-muted-foreground text-sm">Invalid search parameters.</p>
        <Link
          href="/route-search"
          className={buttonVariants({ variant: "outline", size: "sm", className: "mt-4" })}
        >
          Back to search
        </Link>
      </div>
    );
  }

  const supabase = await createClient();

  // Fetch both terminals and route in parallel
  const [{ data: fromTerminal }, { data: toTerminal }, { data: routes }] =
    await Promise.all([
      supabase
        .from("terminals")
        .select("id, name, lat, lng")
        .eq("id", fromId)
        .single(),
      supabase
        .from("terminals")
        .select("id, name, lat, lng")
        .eq("id", toId)
        .single(),
      supabase
        .from("routes")
        .select("id, name, start_terminal_id, end_terminal_id, intermediate_stops, is_active")
        .eq("is_active", true)
        .or(
          `and(start_terminal_id.eq.${fromId},end_terminal_id.eq.${toId}),` +
          `and(start_terminal_id.eq.${toId},end_terminal_id.eq.${fromId})`
        ),
    ]);

  // No route found
  if (!fromTerminal || !toTerminal || !routes || routes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <MapPinOff size={48} className="mx-auto text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold text-foreground">No route found</h2>
        <p className="text-muted-foreground text-sm mt-2 max-w-xs">
          No direct route exists between{" "}
          <span className="text-foreground font-medium">
            {fromTerminal?.name ?? "the selected terminals"}
          </span>{" "}
          and{" "}
          <span className="text-foreground font-medium">
            {toTerminal?.name ?? ""}
          </span>
          .
        </p>
        <Link
          href="/route-search"
          className={buttonVariants({ variant: "outline", size: "sm", className: "mt-6" })}
        >
          Try another search
        </Link>
      </div>
    );
  }

  const route = routes[0];
  const isReversed =
    route.start_terminal_id === toId && route.end_terminal_id === fromId;

  // Fetch fare and distance in parallel
  const [{ data: fares }, { data: distance }] = await Promise.all([
    supabase
      .from("fares")
      .select("amount, currency")
      .eq("route_id", route.id)
      .order("effective_from", { ascending: false })
      .limit(1),
    supabase
      .from("distances")
      .select("distance_km, duration_minutes")
      .eq("from_terminal_id", fromId)
      .eq("to_terminal_id", toId)
      .maybeSingle()
      .then((r) =>
        r.data
          ? r
          : supabase
              .from("distances")
              .select("distance_km, duration_minutes")
              .eq("from_terminal_id", toId)
              .eq("to_terminal_id", fromId)
              .maybeSingle()
      ),
  ]);

  const fare = fares?.[0] ?? null;
  const dist = distance ?? null;

  // Call ORS for polyline (graceful — returns null if key missing or API fails)
  const ors = await getDirections(
    { lat: fromTerminal.lat, lng: fromTerminal.lng },
    { lat: toTerminal.lat, lng: toTerminal.lng }
  );

  const hasOrsKey = !!process.env.ORS_API_KEY;

  return (
    <div className="pb-8">
      <Suspense fallback={null}>
        <SaveRecentSearch
          fromId={fromId}
          fromName={fromTerminal.name}
          toId={toId}
          toName={toTerminal.name}
        />
      </Suspense>

      {/* Map */}
      <Suspense fallback={<div className="h-64 md:h-80 bg-muted animate-pulse" />}>
        <RouteMap
          start={{ lat: fromTerminal.lat, lng: fromTerminal.lng, name: fromTerminal.name }}
          end={{ lat: toTerminal.lat, lng: toTerminal.lng, name: toTerminal.name }}
          polyline={ors?.polyline}
          className="rounded-none md:rounded-2xl md:mx-4 md:mt-4"
        />
      </Suspense>

      <div className="px-4 mt-4 space-y-4 max-w-lg mx-auto md:max-w-none">

        {/* Route info card */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h1 className="text-base font-semibold text-foreground leading-tight">
                {route.name}
              </h1>
              {isReversed && (
                <span className="shrink-0 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 text-[11px] font-medium">
                  Reverse
                </span>
              )}
            </div>

            {/* From → To */}
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-primary">{fromTerminal.name}</span>
              <ArrowRight size={14} className="shrink-0 text-muted-foreground" />
              <span className="font-medium text-foreground">{toTerminal.name}</span>
            </div>

            {/* Distance + duration */}
            {dist && (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>{dist.distance_km} km</span>
                {dist.duration_minutes && <span>{dist.duration_minutes} min</span>}
              </div>
            )}

            {/* Fare */}
            {fare && (
              <div className="flex items-center gap-2 pt-1 border-t border-border">
                <span className="text-xs text-muted-foreground">Fare</span>
                <span className="text-lg font-bold text-foreground">
                  ${Number(fare.amount).toFixed(2)}
                </span>
                <span className="text-xs text-muted-foreground">{fare.currency}</span>
              </div>
            )}

            {/* No ORS key notice */}
            {!hasOrsKey && (
              <div className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>Detailed road directions unavailable — ORS_API_KEY not configured.</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Step-by-step directions */}
        {ors && ors.steps.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <h2 className="text-sm font-semibold text-foreground mb-3">
                Directions ({ors.steps.length} steps)
              </h2>
              <ol className="space-y-2">
                {ors.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-foreground leading-snug">{step.instruction}</p>
                      {step.name && step.name !== "-" && (
                        <p className="text-muted-foreground text-xs mt-0.5">{step.name}</p>
                      )}
                      <p className="text-muted-foreground text-xs mt-0.5">
                        {step.distance < 1000
                          ? `${Math.round(step.distance)} m`
                          : `${(step.distance / 1000).toFixed(1)} km`}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}

        {/* Back link */}
        <Link
          href="/route-search"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          ← New search
        </Link>
      </div>
    </div>
  );
}
