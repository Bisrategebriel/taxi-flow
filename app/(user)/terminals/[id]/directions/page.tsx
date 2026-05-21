import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Navigation, Clock, MapPin } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getDirections } from "@/lib/ors/client";
import { Card, CardContent } from "@/components/ui/Card";
import DirectionsMap from "@/components/map/DirectionsMap";
import GetLocation from "./_components/GetLocation";

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lat?: string; lng?: string }>;
}

export default async function DirectionsPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { lat: latStr, lng: lngStr } = await searchParams;

  const supabase = await createClient();
  const { data: terminal } = await supabase
    .from("terminals")
    .select("id, name, city, lat, lng")
    .eq("id", id)
    .single();

  if (!terminal) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <p className="text-muted-foreground text-sm">Terminal not found.</p>
        <Link href="/terminals" className="text-sm text-primary mt-2 hover:underline">
          Back to terminals
        </Link>
      </div>
    );
  }

  const userLat = latStr ? parseFloat(latStr) : NaN;
  const userLng = lngStr ? parseFloat(lngStr) : NaN;
  const hasLocation = !isNaN(userLat) && !isNaN(userLng);

  const ors = hasLocation
    ? await getDirections(
        { lat: userLat, lng: userLng },
        { lat: terminal.lat, lng: terminal.lng }
      )
    : null;

  const distanceKm = ors ? (ors.distance_m / 1000).toFixed(1) : null;
  const durationMin = ors ? Math.ceil(ors.duration_s / 60) : null;

  return (
    <div className="pb-8">
      {/* Map with overlaid back button */}
      <div className="relative">
        {hasLocation ? (
          <Suspense fallback={<div className="h-[45vh] bg-muted animate-pulse" />}>
            <DirectionsMap
              userLocation={{ lat: userLat, lng: userLng }}
              terminal={{ lat: terminal.lat, lng: terminal.lng, name: terminal.name }}
              polyline={ors?.polyline}
              className="rounded-none md:rounded-2xl md:mx-4"
            />
          </Suspense>
        ) : (
          <div className="h-[45vh] bg-muted md:rounded-2xl md:mx-4" />
        )}
        <Link
          href="/terminals"
          aria-label="Back to terminals"
          className="absolute top-4 left-4 z-[1000] inline-flex h-9 w-9 items-center justify-center
            rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/50
            md:left-8"
        >
          <ArrowLeft size={18} />
        </Link>
      </div>

      <div className="px-4 mt-4 space-y-4 max-w-lg mx-auto md:max-w-none">
        {/* Destination info card */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Navigation size={18} className="text-primary shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Directions to
                </p>
                <h1 className="text-base font-semibold text-foreground leading-snug">
                  {terminal.name}
                </h1>
                <p className="text-sm text-muted-foreground">{terminal.city}</p>
              </div>
            </div>

            {(distanceKm || durationMin) && (
              <div className="grid grid-cols-2 divide-x divide-border border-t border-border pt-3">
                <div className="flex flex-col items-center gap-1 px-2">
                  <MapPin size={16} className="text-primary" />
                  <span className="text-base font-bold text-foreground leading-none">
                    {distanceKm} km
                  </span>
                  <span className="text-[11px] text-muted-foreground">Distance</span>
                </div>
                <div className="flex flex-col items-center gap-1 px-2">
                  <Clock size={16} className="text-primary" />
                  <span className="text-base font-bold text-foreground leading-none">
                    ~{durationMin} min
                  </span>
                  <span className="text-[11px] text-muted-foreground">Drive time</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Turn-by-turn directions */}
        {ors && ors.steps.length > 0 && (
          <Card>
            <CardContent className="p-4 space-y-3">
              <h2 className="text-sm font-semibold text-foreground">Step-by-step</h2>
              <ol className="space-y-3">
                {ors.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="shrink-0 mt-0.5 flex h-5 w-5 items-center justify-center
                      rounded-full bg-muted text-[11px] font-bold text-muted-foreground">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{step.instruction}</p>
                      {step.name && step.name !== "-" && (
                        <p className="text-xs text-muted-foreground mt-0.5">{step.name}</p>
                      )}
                    </div>
                    <span className="ml-2 shrink-0 text-xs text-muted-foreground whitespace-nowrap">
                      {step.distance < 1000
                        ? `${Math.round(step.distance)} m`
                        : `${(step.distance / 1000).toFixed(1)} km`}
                    </span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}

        {/* Location request (renders only when no coords in URL) */}
        {!hasLocation && <GetLocation terminalId={id} />}
      </div>
    </div>
  );
}
