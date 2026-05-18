// FR-RS-03, FR-RS-04, FR-RS-05, FR-FI-01..03, FR-MP-01..05
import { Suspense } from "react";
import Link from "next/link";
import { MapPinOff, ArrowRight, ArrowLeft, Route, Clock, DollarSign, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDirections } from "@/lib/ors/client";
import { buttonVariants } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import RouteMap from "@/components/map/RouteMap";
import SaveRecentSearch from "@/app/(user)/route-search/result/_components/SaveRecentSearch";
import RouteStops from "@/app/(user)/route-search/result/_components/RouteStops";
import FareBreakdown from "@/app/(user)/route-search/result/_components/FareBreakdown";

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

  // Compute stop order before querying so we can build the segment filter in one pass
  const stopIds = route.intermediate_stops ?? [];
  const orderedStopIds = isReversed ? [...stopIds].reverse() : stopIds;
  const allStopIdsList = [fromId, ...orderedStopIds, toId];

  // OR filter to find direct routes between every consecutive stop pair (both directions)
  const segmentOrFilter =
    allStopIdsList.length > 1
      ? allStopIdsList
          .slice(0, -1)
          .flatMap((id, i) => {
            const next = allStopIdsList[i + 1];
            return [
              `and(start_terminal_id.eq.${id},end_terminal_id.eq.${next})`,
              `and(start_terminal_id.eq.${next},end_terminal_id.eq.${id})`,
            ];
          })
          .join(",")
      : null;

  type SegRoute = {
    id: string;
    start_terminal_id: string;
    end_terminal_id: string;
    fares: { amount: number | string; currency: string; effective_from: string }[];
  };

  // Fetch fare, distance, intermediate terminal names, and per-segment fares in parallel
  const [{ data: fares }, { data: distance }, { data: stopTerminals }, { data: segmentRoutes }] =
    await Promise.all([
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
      stopIds.length > 0
        ? supabase.from("terminals").select("id, name").in("id", stopIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[], error: null }),
      segmentOrFilter
        ? supabase
            .from("routes")
            .select("id, start_terminal_id, end_terminal_id, fares(amount, currency, effective_from)")
            .eq("is_active", true)
            .or(segmentOrFilter)
        : Promise.resolve({ data: [] as SegRoute[], error: null }),
    ]);

  const fare = fares?.[0] ?? null;
  const dist = distance ?? null;

  // Build ordered stops list
  const terminalById = new Map((stopTerminals ?? []).map((t) => [t.id, t]));
  const routeStops = [
    { id: fromId, name: fromTerminal.name },
    ...orderedStopIds.flatMap((id) => {
      const t = terminalById.get(id);
      return t ? [{ id: t.id, name: t.name }] : [];
    }),
    { id: toId, name: toTerminal.name },
  ];

  // Per-segment fares for the breakdown card
  const segRouteList = (segmentRoutes as SegRoute[] | null) ?? [];
  const segmentFares = allStopIdsList.slice(0, -1).map((fromStopId, i) => {
    const toStopId = allStopIdsList[i + 1];
    const match = segRouteList.find(
      (r) =>
        (r.start_terminal_id === fromStopId && r.end_terminal_id === toStopId) ||
        (r.start_terminal_id === toStopId && r.end_terminal_id === fromStopId)
    );
    const latestFare = (match?.fares ?? []).sort(
      (a, b) =>
        new Date(b.effective_from).getTime() - new Date(a.effective_from).getTime()
    )[0] ?? null;
    return {
      fromName: routeStops[i].name,
      toName: routeStops[i + 1].name,
      amount: latestFare?.amount ?? null,
      currency: latestFare?.currency ?? null,
    };
  });

  // Always include the direct start→destination fare; append only when there are intermediate stops
  // (if no intermediates, segmentFares already contains the single direct pair)
  const fareBreakdownSegments =
    orderedStopIds.length > 0
      ? [
          ...segmentFares,
          {
            fromName: fromTerminal.name,
            toName: toTerminal.name,
            amount: fare?.amount ?? null,
            currency: fare?.currency ?? null,
          },
        ]
      : segmentFares;

  // Call ORS for polyline (graceful — returns null if key missing or API fails)
  const ors = await getDirections(
    { lat: fromTerminal.lat, lng: fromTerminal.lng },
    { lat: toTerminal.lat, lng: toTerminal.lng }
  );

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

      {/* Map — 45 vh with back button overlaid */}
      <div className="relative">
        <Suspense fallback={<div className="h-[45vh] bg-muted animate-pulse" />}>
          <RouteMap
            start={{ lat: fromTerminal.lat, lng: fromTerminal.lng, name: fromTerminal.name }}
            end={{ lat: toTerminal.lat, lng: toTerminal.lng, name: toTerminal.name }}
            polyline={ors?.polyline}
            className="rounded-none md:rounded-2xl md:mx-4"
          />
        </Suspense>
        <Link
          href="/route-search"
          aria-label="Back to route search"
          className="absolute top-4 left-4 z-1000 inline-flex h-9 w-9 items-center justify-center
            rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/50
            md:left-8"
        >
          <ArrowLeft size={18} />
        </Link>
      </div>

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

            {/* Distance · Duration · Fare */}
            {(dist || fare) && (
              <div className="grid grid-cols-3 divide-x divide-border border-t border-border pt-3 mt-1">
                <div className="flex flex-col items-center gap-1 px-2">
                  <Route size={16} className="text-primary" />
                  <span className="text-base font-bold text-foreground leading-none">
                    {dist ? `${dist.distance_km} km` : "—"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">Distance</span>
                </div>
                <div className="flex flex-col items-center gap-1 px-2">
                  <Clock size={16} className="text-primary" />
                  <span className="text-base font-bold text-foreground leading-none">
                    {dist?.duration_minutes ? `~${dist.duration_minutes} min` : "—"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">Duration</span>
                </div>
                <div className="flex flex-col items-center gap-1 px-2">
                  <DollarSign size={16} className="text-primary" />
                  <span className="text-base font-bold text-foreground leading-none">
                    {fare ? `${Number(fare.amount).toFixed(2)}` : "—"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">Fare</span>
                </div>
              </div>
            )}

          </CardContent>
        </Card>

        {/* Route stops timeline */}
        <Card>
          <CardContent className="p-4">
            <h2 className="text-sm font-semibold text-foreground mb-4">Journey</h2>
            <RouteStops stops={routeStops} />
          </CardContent>
        </Card>

        {/* Fare breakdown */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h2 className="text-sm font-semibold text-foreground">Fare Breakdown</h2>
            <FareBreakdown segments={fareBreakdownSegments} />
          </CardContent>
        </Card>

        {/* Start Trip */}
        <Link
          href={`/trip?from=${fromId}&to=${toId}`}
          className={cn(buttonVariants({ size: "lg" }), "w-full gap-2 h-12")}
        >
          Start Trip
          <ChevronRight size={18} />
        </Link>

      </div>
    </div>
  );
}
