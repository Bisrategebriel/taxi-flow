// FR-PA-07..10, NFR-SE-08
// Stripe webhook — uses raw body for signature verification.
// /api/webhooks/ is already marked public in proxy.ts (no auth cookie needed).
import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const sig = request.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  if (event.type === "payment_intent.succeeded") {
    const pi = event.data.object as Stripe.PaymentIntent;
    const { tripId, userId } = pi.metadata;

    const supabase = createServiceClient();

    // payment_method and paid_at columns added by migration 20260522000001_payments_phase7.sql
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("payments") as any).insert({
      trip_id: tripId,
      user_id: userId,
      stripe_payment_intent_id: pi.id,
      amount: pi.amount / 100,
      currency: pi.currency.toUpperCase(),
      status: "succeeded",
      payment_method: "card",
      paid_at: new Date().toISOString(),
    });

    await supabase.from("trips").update({ status: "paid" }).eq("id", tripId);
  }

  return NextResponse.json({ received: true });
}
