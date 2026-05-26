// FR-PA-11,12
import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Navigation2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/Card";
import SuccessActions from "./_components/SuccessActions";

interface SearchParams {
  tripId?: string;
  payment_intent?: string;
}

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { tripId, payment_intent: paymentIntentId } = await searchParams;
  if (!tripId) redirect("/dashboard");

  const supabase = await createClient();

  const { data: trip } = await supabase
    .from("trips")
    .select(
      `id, fare_amount, started_at, ended_at, start_terminal_id, end_terminal_id,
       start:terminals!trips_start_terminal_id_fkey(name),
       end:terminals!trips_end_terminal_id_fkey(name)`
    )
    .eq("id", tripId)
    .single();

  if (!trip) redirect("/dashboard");

  // Verify card payment via Stripe server-side
  let cardLast4: string | null = null;
  let cardBrand: string | null = null;

  if (paymentIntentId) {
    let piStatus: string | null = null;
    let piPaymentMethod: unknown = null;
    try {
      const { stripe } = await import("@/lib/stripe");
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ["payment_method"],
      });
      piStatus = pi.status;
      piPaymentMethod = pi.payment_method;
    } catch {
      redirect("/dashboard");
    }

    // Redirect is called outside the try-catch so Next.js can handle it correctly
    if (piStatus !== "succeeded") redirect("/dashboard");

    const pm = piPaymentMethod;
    if (pm && typeof pm === "object" && "card" in pm) {
      const card = (pm as { card?: { last4?: string; brand?: string } }).card;
      if (card) {
        cardLast4 = card.last4 ?? null;
        cardBrand = card.brand ?? null;
      }
    }
  }

  // Use service client to bypass RLS on trip_locations
  const serviceSupabase = createServiceClient();

  // Fetch GPS locations for actual distance computation
  const { data: locations } = await serviceSupabase
    .from("trip_locations")
    .select("lat, lng")
    .eq("trip_id", tripId)
    .order("recorded_at", { ascending: true });

  // Haversine distance between two GPS points (km)
  function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  let actualDistanceKm: number | null = null;
  if (locations && locations.length >= 2) {
    actualDistanceKm = locations.reduce((sum, pt, i) => {
      if (i === 0) return sum;
      const prev = locations[i - 1];
      return sum + haversine(prev.lat, prev.lng, pt.lat, pt.lng);
    }, 0);
  }

  // Fallback: distance from distances table if GPS data insufficient
  const startTerminalId = trip.start_terminal_id;
  const endTerminalId = trip.end_terminal_id;

  let distRow: { distance_km: number } | null = null;
  if (!actualDistanceKm && startTerminalId && endTerminalId) {
    // Try canonical direction first, then reverse
    const { data: d1 } = await serviceSupabase
      .from("distances")
      .select("distance_km")
      .eq("from_terminal_id", startTerminalId)
      .eq("to_terminal_id", endTerminalId)
      .maybeSingle();
    if (d1) {
      distRow = d1;
    } else {
      const { data: d2 } = await serviceSupabase
        .from("distances")
        .select("distance_km")
        .eq("from_terminal_id", endTerminalId)
        .eq("to_terminal_id", startTerminalId)
        .maybeSingle();
      distRow = d2 ?? null;
    }
  }

  // Computed display values
  const total = Number(trip.fare_amount ?? 0);

  const start = Array.isArray(trip.start)
    ? (trip.start[0] as { name: string } | undefined)
    : (trip.start as { name: string } | null);
  const end = Array.isArray(trip.end)
    ? (trip.end[0] as { name: string } | undefined)
    : (trip.end as { name: string } | null);
  const routeLabel = start && end ? `${start.name} → ${end.name}` : "Your trip";

  const startedAt = trip.started_at ? new Date(trip.started_at) : new Date();
  const tripRef = (() => {
    const hex = trip.id.replace(/-/g, "").slice(-6);
    return `TF-${(parseInt(hex, 16) % 100000).toString().padStart(5, "0")}`;
  })();

  const dateLabel = startedAt.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Actual duration from trip timestamps
  let durationLabel = "—";
  if (trip.started_at && trip.ended_at) {
    const mins = Math.round(
      (new Date(trip.ended_at).getTime() - new Date(trip.started_at).getTime()) / 60000
    );
    durationLabel = mins >= 60
      ? `${Math.floor(mins / 60)}h ${mins % 60}m`
      : `${mins} min`;
  }

  const distanceLabel = actualDistanceKm != null
    ? `${actualDistanceKm.toFixed(1)} km`
    : distRow?.distance_km
      ? `${Number(distRow.distance_km).toFixed(1)} km`
      : "—";

  const brandLabel = cardBrand
    ? cardBrand.charAt(0).toUpperCase() + cardBrand.slice(1)
    : null;
  const paymentMethodLabel = paymentIntentId
    ? cardLast4 && brandLabel
      ? `${brandLabel} ····${cardLast4}`
      : "Card"
    : "Cash";

  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-4 py-10 text-foreground">
      <div className="w-full max-w-sm space-y-6">
        {/* Hero */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/15">
            <CheckCircle2 size={48} className="text-emerald-500" />
          </div>
          <h1 className="text-2xl font-bold">Payment Complete!</h1>
          <p className="text-sm text-muted-foreground">
            Your trip has been paid successfully.
          </p>
        </div>

        {/* Receipt card */}
        <Card>
          <CardHeader className="border-b border-border pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                  <Navigation2 size={14} className="text-primary" />
                </div>
                <CardTitle>Trip Receipt</CardTitle>
              </div>
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-500">
                Paid
              </span>
            </div>
          </CardHeader>

          <CardContent className="space-y-3 pt-3">
            {/* Route */}
            <div>
              <p className="text-xs text-muted-foreground">Route</p>
              <p className="mt-0.5 text-sm font-medium">{routeLabel}</p>
            </div>

            <div className="border-t border-border" />

            <ReceiptRow label="Trip ID" value={tripRef} />
            <ReceiptRow label="Date" value={dateLabel} />
            <ReceiptRow label="Duration" value={durationLabel} />
            <ReceiptRow label="Distance" value={distanceLabel} />
            <ReceiptRow label="Payment" value={paymentMethodLabel} />

            <div className="border-t border-border pt-2" />

            <div className="flex items-center justify-between text-base font-bold">
              <span>Total</span>
              <span className="text-emerald-500">ETB {total.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <SuccessActions
          routeLabel={routeLabel}
          tripRef={tripRef}
          total={total.toFixed(2)}
          dateLabel={dateLabel}
          durationLabel={durationLabel}
          distanceLabel={distanceLabel}
          paymentMethodLabel={paymentMethodLabel}
        />

        {/* Back to Home */}
        <Link
          href="/dashboard"
          className="flex h-12 w-full items-center justify-center rounded-lg bg-primary text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Back to Home
        </Link>

        <p className="text-center text-xs text-muted-foreground">
          A receipt has been sent to your email address.
        </p>
      </div>
    </div>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
