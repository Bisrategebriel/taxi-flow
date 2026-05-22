// FR-PA-01..06
"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import {
  ArrowLeft,
  Lock,
  Navigation2,
  CreditCard,
  Smartphone,
  Banknote,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/Card";
import StripePaymentForm from "./StripePaymentForm";

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

// Stripe's iframe can't inherit CSS variables — read actual computed values at runtime.
// oklch → approximate hex: dark bg=#1c1c1c, card=#262626, border=#3e3e3e,
// muted-fg=#8c8c8c, fg=#f9f9f9, primary-dark=#479ef5, primary-light=#0f6cbd
function buildStripeAppearance(isDark: boolean) {
  return {
    theme: (isDark ? "night" : "stripe") as "night" | "stripe",
    variables: {
      colorPrimary:          isDark ? "#479ef5" : "#0f6cbd",
      colorBackground:       isDark ? "#262626" : "#ffffff",
      colorText:             isDark ? "#f9f9f9" : "#111827",
      colorTextPlaceholder:  isDark ? "#8c8c8c" : "#9ca3af",
      colorDanger:           isDark ? "#f87171" : "#dc2626",
      colorInputBackground:  isDark ? "#262626" : "#ffffff",
      borderRadius:          "8px",
      fontFamily:            "'Geist', system-ui, -apple-system, sans-serif",
      fontSizeBase:          "14px",
      spacingUnit:           "4px",
    },
    rules: {
      ".Input": {
        border:     isDark ? "1px solid #3e3e3e" : "1px solid #e5e7eb",
        boxShadow:  "none",
        outline:    "none",
        padding:    "10px 12px",
      },
      ".Input:focus": {
        border:    isDark ? "1px solid #479ef5" : "1px solid #0f6cbd",
        boxShadow: isDark
          ? "0 0 0 3px rgba(71,158,245,0.25)"
          : "0 0 0 3px rgba(15,108,189,0.25)",
      },
      ".Label": {
        fontSize:   "13px",
        fontWeight: "500",
        marginBottom: "6px",
      },
      ".Tab": {
        border:     isDark ? "1px solid #3e3e3e" : "1px solid #e5e7eb",
        boxShadow:  "none",
      },
      ".Tab:hover": {
        border: isDark ? "1px solid #8c8c8c" : "1px solid #9ca3af",
      },
      ".Tab--selected": {
        border:    isDark ? "1px solid #479ef5" : "1px solid #0f6cbd",
        boxShadow: isDark
          ? "0 0 0 3px rgba(71,158,245,0.25)"
          : "0 0 0 3px rgba(15,108,189,0.25)",
      },
    },
  } as const;
}

type PaymentMethod = "card" | "mobile_money" | "cash";

interface Breakdown {
  baseFare: number;
  serviceFee: number;
  distSurcharge: number;
  total: number;
}

interface Trip {
  id: string;
  fare_amount: number;
  status: string;
  start: { name: string } | null;
  end: { name: string } | null;
}

interface Props {
  trip: Trip;
  breakdown: Breakdown;
  cancelled?: boolean;
}

export default function PaymentScreen({ trip, breakdown, cancelled }: Props) {
  const router = useRouter();
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  // Read theme once on mount — stable reference for Stripe appearance
  const [stripeAppearance] = useState(() =>
    buildStripeAppearance(
      typeof document !== "undefined"
        ? document.documentElement.classList.contains("dark")
        : true
    )
  );
  const [isInitialising, setIsInitialising] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [cashLoading, setCashLoading] = useState(false);
  const [cashError, setCashError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/stripe/payment-intent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tripId: trip.id }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.clientSecret) setClientSecret(data.clientSecret);
        else setInitError(data.error ?? "Could not initialise payment.");
      })
      .catch(() => setInitError("Network error. Please refresh and try again."))
      .finally(() => setIsInitialising(false));
  }, [trip.id]);

  const handleCashPayment = useCallback(async () => {
    setCashLoading(true);
    setCashError(null);
    try {
      const res = await fetch("/api/payment/cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId: trip.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCashError(data.error ?? "Payment failed. Please try again.");
        return;
      }
      router.push("/payment/success?tripId=" + trip.id);
    } catch {
      setCashError("Network error. Please try again.");
    } finally {
      setCashLoading(false);
    }
  }, [trip.id, router]);

  const routeLabel =
    trip.start && trip.end
      ? `${trip.start.name} → ${trip.end.name}`
      : "Your trip";

  // Same format as TripInProgress — TFR + 4-digit number from last 4 hex chars
  const hex4 = trip.id.replace(/-/g, "").slice(-4);
  const tripRef = `TFR${(parseInt(hex4, 16) % 10000).toString().padStart(4, "0")}`;

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center border-b border-border bg-background px-4 py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </Button>
        <div className="flex-1 text-center">
          <p className="text-base font-semibold">Complete Payment</p>
          <p className="text-xs text-muted-foreground">Secure checkout</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-green-500">
          <Lock size={12} />
          <span>Encrypted</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4 pb-8">
        {cancelled && (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400">
            Payment cancelled — you can try again below.
          </p>
        )}

        {trip.status === "payment_pending" && !cancelled && (
          <p className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
            Your payment is processing. If you came back from checkout, you can try again.
          </p>
        )}

        {/* Trip summary */}
        <Card>
          <CardHeader className="border-b border-border pb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
                <Navigation2 size={14} className="text-primary" />
              </div>
              <CardDescription>Completed Trip</CardDescription>
            </div>
            <CardTitle className="mt-1">{routeLabel}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-3">
            <ReceiptLine label="Base fare" value={`ETB ${breakdown.baseFare.toFixed(2)}`} />
            <ReceiptLine label="Service fee" value={`ETB ${breakdown.serviceFee.toFixed(2)}`} />
            <ReceiptLine label="Distance surcharge" value={`ETB ${breakdown.distSurcharge.toFixed(2)}`} />
            <div className="border-t border-border pt-2" />
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span className="text-primary">ETB {breakdown.total.toFixed(2)}</span>
            </div>
            <p className="text-right text-[10px] text-muted-foreground/60">Trip {tripRef}</p>
          </CardContent>
        </Card>

        {/* Payment method */}
        <div>
          <p className="mb-3 text-sm font-semibold">Payment Method</p>
          <div className="space-y-3">
            <MethodRow
              id="card"
              label="Credit / Debit Card"
              icon={<CreditCard size={16} className="text-primary-foreground" />}
              iconBg="bg-primary"
              selected={method === "card"}
              onSelect={() => setMethod("card")}
            />
            <MethodRow
              id="mobile_money"
              label="Mobile Money"
              icon={<Smartphone size={16} className="text-primary" />}
              iconBg="bg-primary/15"
              selected={method === "mobile_money"}
              onSelect={() => setMethod("mobile_money")}
            />
            <MethodRow
              id="cash"
              label="Pay Cash to Driver"
              icon={<Banknote size={16} className="text-primary" />}
              iconBg="bg-primary/15"
              selected={method === "cash"}
              onSelect={() => setMethod("cash")}
            />
          </div>
        </div>

        {/* Card details */}
        {method === "card" && (
          <Card>
            <CardHeader className="pb-0">
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-primary" />
                <CardTitle className="text-sm">Card Details</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-3">
              {isInitialising && (
                <div className="h-32 animate-pulse rounded-lg bg-muted" />
              )}
              {initError && (
                <p className="rounded-lg bg-destructive/10 px-3 py-3 text-sm text-destructive">
                  {initError}
                </p>
              )}
              {clientSecret && !isInitialising && (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: stripeAppearance,
                    fonts: [
                      {
                        cssSrc:
                          "https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&display=swap",
                      },
                    ],
                  }}
                >
                  <StripePaymentForm tripId={trip.id} total={breakdown.total} />
                </Elements>
              )}
            </CardContent>
          </Card>
        )}

        {/* Mobile Money placeholder */}
        {method === "mobile_money" && (
          <Card>
            <CardContent className="py-6 text-center">
              <p className="text-sm text-muted-foreground">
                Mobile Money integration coming soon.
                <br />
                Select another payment method to continue.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Cash confirmation */}
        {method === "cash" && (
          <Card>
            <CardHeader className="pb-0">
              <div className="flex items-center gap-2">
                <Banknote size={16} className="text-primary" />
                <CardTitle className="text-sm">Pay Driver Directly</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-3">
              <p className="text-sm text-muted-foreground">
                Hand the exact amount to your driver at the end of the trip.
                Your trip will be marked as paid immediately.
              </p>
              {cashError && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {cashError}
                </p>
              )}
              <Button
                onClick={handleCashPayment}
                disabled={cashLoading}
                className="h-12 w-full"
              >
                {cashLoading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Processing…
                  </>
                ) : (
                  <>Complete Payment — ETB {breakdown.total.toFixed(2)} ›</>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function ReceiptLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

function MethodRow({
  id,
  label,
  icon,
  iconBg,
  selected,
  onSelect,
}: {
  id: string;
  label: string;
  icon: React.ReactNode;
  iconBg: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      key={id}
      onClick={onSelect}
      className={`flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors
        ${selected ? "border-primary bg-card" : "border-border bg-card/50 hover:bg-card"}`}
    >
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconBg}`}>
        {icon}
      </div>
      <span className="flex-1 text-sm font-medium">{label}</span>
      <div
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2
          ${selected ? "border-primary" : "border-muted-foreground/40"}`}
      >
        {selected && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
      </div>
    </button>
  );
}
