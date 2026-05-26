// FR-PA-03..05, NFR-SE-07
"use client";
import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Props {
  tripId: string;
  total: number;
}

export default function StripePaymentForm({ tripId, total }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    // redirect: "if_required" lets us handle navigation via Next.js router,
    // avoiding the "Failed to redirect" error caused by Stripe's window.location.assign
    // conflicting with the App Router. Stripe still handles 3DS redirects when required.
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment/success?tripId=${tripId}`,
      },
      redirect: "if_required",
    });

    if (error) {
      setErrorMessage(error.message ?? "Payment failed. Please try again.");
      setIsSubmitting(false);
    } else if (paymentIntent?.status === "succeeded") {
      router.push(
        `/payment/success?tripId=${tripId}&payment_intent=${paymentIntent.id}`
      );
    } else {
      // Unexpected state — let Stripe's redirect handle it
      setErrorMessage("An unexpected error occurred. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <>
      {/* Full-screen overlay while Stripe processes — disappears when page redirects */}
      {isSubmitting && !errorMessage && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-background/90 backdrop-blur-sm">
          <span className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-sm font-medium text-foreground">Processing payment…</p>
          <p className="text-xs text-muted-foreground">Please don&apos;t close this page</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <PaymentElement options={{ layout: "tabs" }} />

        {errorMessage && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {errorMessage}
          </p>
        )}

        <Button
          type="submit"
          disabled={!stripe || isSubmitting}
          className="h-12 w-full"
        >
          {isSubmitting ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              Processing…
            </>
          ) : (
            <>Pay ETB {total.toFixed(2)} ›</>
          )}
        </Button>

        <p className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
          <Lock size={11} />
          Your payment is secured with 256-bit encryption
        </p>
      </form>
    </>
  );
}
