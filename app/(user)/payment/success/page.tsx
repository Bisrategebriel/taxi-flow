// FR-PA-11,12
import { redirect } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Navigation2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
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
      `id, fare_amount, started_at, start_terminal_id, end_terminal_id,
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
    try {
      const { stripe } = await import("@/lib/stripe");
      const pi = await stripe.paymentIntents.retrieve(paymentIntentId, {
        expand: ["payment_method"],
      });
      if (pi.status !== "succeeded") redirect("/dashboard");

      const pm = pi.payment_method;
      if (pm && typeof pm === "object" && "card" in pm && pm.card) {
        cardLast4 = pm.card.last4 ?? null;
        cardBrand = pm.card.brand ?? null;
      }
    } catch {
      redirect("/dashboard");
    }
  }

  // Fetch distance/duration for this terminal pair
  const startTerminalId = trip.start_terminal_id;
  const endTerminalId = trip.end_terminal_id;

  const { data: distRow } = startTerminalId && endTerminalId
    ? await supabase
        .from("distances")
        .select("distance_km, duration_minutes")
        .eq("from_terminal_id", startTerminalId)
        .eq("to_terminal_id", endTerminalId)
        .single()
    : { data: null };

  // Computed display values
  const total = Number(trip.fare_amount ?? 0);

  const start = Array.isArray(trip.start)
    ? (trip.start[0] as { name: string } | undefined)
    : (trip.start as { name: string } | null);
  const end = Array.isArray(trip.end)
    ? (trip.end[0] as { name: string } | undefined)
    : (trip.end as { name: string } | null);
  const routeLabel = start && end ? `${start.name} → ${end.name}` : "Your trip";

  // Trip ID: same format as TripInProgress — TFR + 4-digit number from last 4 hex chars
  const startedAt = trip.started_at ? new Date(trip.started_at) : new Date();
  const hex = trip.id.replace(/-/g, "").slice(-4);
  const num = parseInt(hex, 16) % 10000;
  const tripRef = `TFR${num.toString().padStart(4, "0")}`;

  const dateLabel = startedAt.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const durationLabel = distRow?.duration_minutes
    ? distRow.duration_minutes >= 60
      ? `${Math.floor(distRow.duration_minutes / 60)}h ${distRow.duration_minutes % 60}m`
      : `${distRow.duration_minutes} min`
    : "—";

  const distanceLabel = distRow?.distance_km
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
